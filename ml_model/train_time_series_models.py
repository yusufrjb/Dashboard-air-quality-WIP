"""
train_time_series_models.py
============================
Latih dan bandingkan model time series (XGBoost, ARIMA, ETS, Naive)
untuk prediksi PM2.5, PM10, CO.
Simpan model XGBoost terbaik.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
from supabase import create_client
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.holtwinters import ExponentialSmoothing
import warnings

warnings.filterwarnings("ignore")

# ============================================================
# KONFIGURASI
# ============================================================
MODEL_DIR = Path(__file__).parent
DATA_DAYS = 14
HORIZONS = [1, 5, 15, 30, 60]
PARAMS = ["pm25", "pm10", "co"]
TABLE = "tb_konsentrasi_gas"

# ============================================================
# LOAD DATA
# ============================================================
def load_env():
    env_paths = [
        MODEL_DIR / ".env",
        MODEL_DIR.parent / ".env.local",
        MODEL_DIR.parent / ".env",
    ]
    for env_path in env_paths:
        if env_path.exists():
            for line in env_path.read_text(encoding="utf-8").splitlines():
                if "=" in line and not line.startswith("#"):
                    k, _, v = line.partition("=")
                    os.environ.setdefault(k.strip(), v.strip().strip('"'))

def fetch_data() -> pd.DataFrame:
    load_env()
    sb_url = os.environ.get("SUPABASE_URL", "")
    sb_key = os.environ.get("SUPABASE_ANON_KEY", "")
    
    if not sb_url or not sb_key:
        print("ERROR: SUPABASE_URL atau SUPABASE_KEY tidak ditemukan")
        sys.exit(1)
    
    sb_url = sb_url.replace("http://", "https://")
    supabase = create_client(sb_url, sb_key)
    
    since = (datetime.now() - timedelta(days=DATA_DAYS)).isoformat()
    
    all_data = []
    offset = 0
    while True:
        resp = supabase.table(TABLE) \
            .select("pm25_ugm3,pm10_corrected_ugm3,co_ugm3,created_at") \
            .gte("created_at", since) \
            .order("created_at", desc=False) \
            .range(offset, offset + 999) \
            .execute()
        batch = resp.data
        if not batch:
            break
        all_data.extend(batch)
        offset += len(batch)
        if len(batch) < 1000:
            break
    
    df = pd.DataFrame(all_data)
    df["pm25_ugm3"] = pd.to_numeric(df["pm25_ugm3"], errors="coerce")
    df["pm10_corrected_ugm3"] = pd.to_numeric(df["pm10_corrected_ugm3"], errors="coerce")
    df["co_ugm3"] = pd.to_numeric(df["co_ugm3"], errors="coerce")
    df["created_at"] = pd.to_datetime(df["created_at"]).dt.tz_localize(None)
    df = df.dropna(subset=["pm25_ugm3", "pm10_corrected_ugm3", "co_ugm3"])
    df = df.set_index("created_at").sort_index()
    df = df[~df.index.duplicated(keep="first")]
    df.rename(columns={"pm25_ugm3": "pm25", "pm10_corrected_ugm3": "pm10", "co_ugm3": "co"}, inplace=True)
    
    print(f"Data loaded: {len(df)} baris")
    return df

# ============================================================
# FEATURE ENGINEERING
# ============================================================
def build_features(series: pd.Series, col: str) -> pd.DataFrame:
    feat = series.to_frame()
    for lag in [1, 3, 5, 10, 15, 30]:
        feat[f"lag_{lag}"] = feat[col].shift(lag)
    feat["rolling_mean_5"] = feat[col].rolling(5).mean()
    feat["rolling_mean_15"] = feat[col].rolling(15).mean()
    feat["rolling_std_5"] = feat[col].rolling(5).std()
    feat["hour"] = feat.index.hour
    feat["hour_sin"] = np.sin(2 * np.pi * feat["hour"] / 24)
    feat["hour_cos"] = np.cos(2 * np.pi * feat["hour"] / 24)
    feat = feat.dropna()
    return feat

# ============================================================
# EVALUASI MULTI-HORIZON
# ============================================================
def evaluate_models(df: pd.DataFrame, col: str):
    print(f"\n{'='*60}")
    print(f"MENGECEK MODEL UNTUK {col.upper()}")
    print(f"{'='*60}")
    
    series = df[col].dropna()
    feat = build_features(series, col)
    feature_cols = [c for c in feat.columns if c != col]
    
    # Split: 80% train, 20% test
    split_idx = int(len(feat) * 0.8)
    X_train = feat.iloc[:split_idx][feature_cols]
    y_train = feat.iloc[:split_idx][col]
    X_test = feat.iloc[split_idx:][feature_cols]
    y_test = feat.iloc[split_idx:][col]
    
    # Train XGBoost
    print("Training XGBoost...")
    xgb_model = XGBRegressor(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        random_state=42,
        verbosity=0
    )
    xgb_model.fit(X_train, y_train)
    
    # Evaluasi multi-horizon
    results = []
    for h in HORIZONS:
        y_actual = y_test.shift(-h).dropna()
        if len(y_actual) == 0:
            continue
            
        # Naive
        y_naive = y_test.loc[y_actual.index]
        mae_naive = mean_absolute_error(y_actual, y_naive)
        
        # XGBoost - recursive prediction (sederhana: gunakan last known features)
        y_xgb = xgb_model.predict(X_test.loc[y_actual.index])
        mae_xgb = mean_absolute_error(y_actual, y_xgb)
        
        # ARIMA
        try:
            train_series = series.iloc[:split_idx].tail(200)
            arima_model = ARIMA(train_series, order=(1, 1, 1))
            arima_fit = arima_model.fit()
            arima_pred = arima_fit.forecast(h)
            y_arima = pd.Series([arima_pred.iloc[-1]] * len(y_actual), index=y_actual.index)
            mae_arima = mean_absolute_error(y_actual, y_arima)
        except:
            mae_arima = mae_naive
            
        # ETS
        try:
            ets_model = ExponentialSmoothing(train_series.tail(100), trend="add", damped_trend=True)
            ets_fit = ets_model.fit()
            ets_pred = ets_fit.forecast(h)
            y_ets = pd.Series([ets_pred.iloc[-1]] * len(y_actual), index=y_actual.index)
            mae_ets = mean_absolute_error(y_actual, y_ets)
        except:
            mae_ets = mae_naive
        
        results.append({
            "horizon": h,
            "Naive": round(mae_naive, 2),
            "XGBoost": round(mae_xgb, 2),
            "ARIMA": round(mae_arima, 2),
            "ETS": round(mae_ets, 2),
        })
        
        print(f"  Horizon {h:2d}min: Naive={mae_naive:.2f}, XGB={mae_xgb:.2f}, ARIMA={mae_arima:.2f}, ETS={mae_ets:.2f}")
    
    # Rata-rata
    avg_naive = np.mean([r["Naive"] for r in results])
    avg_xgb = np.mean([r["XGBoost"] for r in results])
    avg_arima = np.mean([r["ARIMA"] for r in results])
    avg_ets = np.mean([r["ETS"] for r in results])
    
    print(f"\nRata-rata MAE:")
    print(f"  Naive:   {avg_naive:.2f}")
    print(f"  XGBoost: {avg_xgb:.2f} ({((avg_naive-avg_xgb)/avg_naive)*100:.1f}% lebih baik)")
    print(f"  ARIMA:   {avg_arima:.2f}")
    print(f"  ETS:     {avg_ets:.2f}")
    
    return {
        "param": col,
        "results": results,
        "averages": {
            "Naive": round(avg_naive, 2),
            "XGBoost": round(avg_xgb, 2),
            "ARIMA": round(avg_arima, 2),
            "ETS": round(avg_ets, 2),
        },
        "best_model": "XGBoost" if avg_xgb <= min(avg_naive, avg_arima, avg_ets) else "Naive"
    }

# ============================================================
# MAIN
# ============================================================
if __name__ == "__main__":
    print("=" * 60)
    print("TIME SERIES MODEL TRAINING & COMPARISON")
    print("=" * 60)
    
    # Load data
    df = fetch_data()
    
    # Evaluasi setiap parameter
    all_results = []
    for col in PARAMS:
        result = evaluate_models(df, col)
        all_results.append(result)
        
        # Simpan model XGBoost
        # Train full model untuk disimpan
        feat = build_features(df[col].dropna(), col)
        feature_cols = [c for c in feat.columns if c != col]
        X = feat[feature_cols]
        y = feat[col]
        
        full_model = XGBRegressor(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42,
            verbosity=0
        )
        full_model.fit(X, y)
        
        model_path = os.path.join(MODEL_DIR, f"xgb_{col}_timeseries.pkl")
        joblib.dump({
            "model": full_model,
            "features": feature_cols,
            "param": col,
            "trained_at": datetime.now().isoformat(),
        }, model_path)
        print(f"Model disimpan: {model_path}")
    
    # Simpan hasil evaluasi
    eval_path = os.path.join(MODEL_DIR, "time_series_evaluation.json")
    with open(eval_path, "w") as f:
        json.dump(all_results, f, indent=2, default=str)
    print(f"\nHasil evaluasi disimpan: {eval_path}")
    
    print("\n" + "=" * 60)
    print("SELESAI!")
    print("=" * 60)