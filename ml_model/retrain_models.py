"""
Retrain Time Series Models - Enhanced Version
==============================================
Improvements:
1. ACF analysis to find strongest lag
2. External features (temperature, humidity)
3. TimeSeriesSplit cross-validation
4. Compare with baseline models
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
from supabase import create_client, Client
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import TimeSeriesSplit
from statsmodels.tsa.stattools import acf
import warnings
warnings.filterwarnings("ignore")

MODEL_DIR = Path(__file__).parent
DATA_DAYS = 14
PARAMS = ["pm25", "pm10", "co"]
TABLE = "tb_konsentrasi_gas"

def load_env():
    for line in open(MODEL_DIR / ".env"):
        if "=" in line:
            k, v = line.strip().split("=", 1)
            os.environ.setdefault(k, v.strip('"'))

def fetch_data() -> pd.DataFrame:
    load_env()
    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_ANON_KEY"])
    since = (datetime.now() - timedelta(days=DATA_DAYS)).isoformat()
    
    all_data = []
    offset = 0
    while True:
        resp = sb.table(TABLE).select("pm25_ugm3,pm10_corrected_ugm3,co_ugm3,temperature,humidity,created_at").gte("created_at", since).order("created_at", desc=False).range(offset, offset + 999).execute()
        batch = resp.data
        if not batch: break
        all_data.extend(batch)
        offset += len(batch)
        if len(batch) < 1000: break
    
    df = pd.DataFrame(all_data)
    for col in ["pm25_ugm3", "pm10_corrected_ugm3", "co_ugm3", "temperature", "humidity"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["created_at"] = pd.to_datetime(df["created_at"]).dt.tz_localize(None)
    df = df.dropna(subset=["pm25_ugm3", "pm10_corrected_ugm3", "co_ugm3"])
    df = df.set_index("created_at").sort_index()
    df = df[~df.index.duplicated(keep="first")]
    df.rename(columns={"pm25_ugm3": "pm25", "pm10_corrected_ugm3": "pm10", "co_ugm3": "co"}, inplace=True)
    print(f"Data loaded: {len(df)} baris, columns: {list(df.columns)}")
    return df

def analyze_acf(series, max_lag=60):
    """Analyze autocorrelation to find strongest lags"""
    clean_series = series.dropna()
    if len(clean_series) < 100:
        return [1, 3, 5, 10, 15, 30]
    
    acf_values = acf(clean_series, nlags=max_lag, fft=True)
    
    # Find top 5 strongest lags (excluding lag 0)
    acf_abs = np.abs(acf_values[1:])
    top_lag_indices = np.argsort(acf_abs)[-5:][::-1] + 1
    top_lags = sorted(top_lag_indices.tolist())
    
    print(f"  ACF analysis - Top lags: {top_lags[:5]}")
    return top_lags[:6]  # Return top 6 lags

def build_features(series, df, all_lags):
    """Build features with ACF-based lags and external features"""
    col = series.name
    feat = pd.DataFrame(index=series.index)
    feat[col] = series
    
    # ACF-based lag features
    for lag in all_lags:
        feat[f"lag_{lag}"] = feat[col].shift(lag)
    
    # Rolling features with multiple windows
    for window in [3, 5, 10, 15, 30]:
        feat[f"rolling_mean_{window}"] = feat[col].rolling(window).mean()
        feat[f"rolling_std_{window}"] = feat[col].rolling(window).std()
        if window <= 15:
            feat[f"rolling_min_{window}"] = feat[col].rolling(window).min()
            feat[f"rolling_max_{window}"] = feat[col].rolling(window).max()
    
    # Time features
    feat["hour"] = feat.index.hour
    feat["hour_sin"] = np.sin(2 * np.pi * feat["hour"] / 24)
    feat["hour_cos"] = np.cos(2 * np.pi * feat["hour"] / 24)
    feat["day_of_week"] = feat.index.dayofweek
    feat["is_weekend"] = (feat.index.dayofweek >= 5).astype(int)
    
    # Difference features
    feat["diff_1"] = feat[col].diff(1)
    feat["diff_5"] = feat[col].diff(5)
    feat["diff_15"] = feat[col].diff(15)
    
    # External features (temperature, humidity) - lag 1
    if "temperature" in df.columns:
        feat["temperature"] = df["temperature"].shift(1)
        feat["temperature_lag_5"] = df["temperature"].shift(5)
    if "humidity" in df.columns:
        feat["humidity"] = df["humidity"].shift(1)
        feat["humidity_lag_5"] = df["humidity"].shift(5)
    
    feat = feat.dropna()
    return feat

def evaluate_with_timeseries_split(X, y, n_splits=5):
    """TimeSeriesSplit cross-validation"""
    tscv = TimeSeriesSplit(n_splits=n_splits)
    cv_scores = []
    
    for train_idx, val_idx in tscv.split(X):
        X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]
        
        model = XGBRegressor(n_estimators=100, max_depth=5, learning_rate=0.1, random_state=42, verbosity=0)
        model.fit(X_train, y_train)
        y_pred = model.predict(X_val)
        
        mae = mean_absolute_error(y_val, y_pred)
        cv_scores.append(mae)
    
    return cv_scores

def train_naive_baseline(y_test, horizon):
    """Naive baseline - persistence"""
    return y_test.values

def train_seasonal_baseline(series, horizon):
    """Seasonal naive - use value from same hour yesterday"""
    result = []
    for idx in range(len(series)):
        target_idx = idx - 24 * 60 // horizon  # 24 hours ago in terms of horizon
        if target_idx >= 0:
            result.append(series.iloc[target_idx])
        else:
            result.append(series.mean())
    return np.array(result)

def evaluate_models(df: pd.DataFrame, col: str):
    print(f"\n=== Training {col.upper()} ===")
    series = df[col].dropna()
    
    # ACF analysis
    acf_lags = analyze_acf(series)
    
    # Build features with ACF-based lags
    feat = build_features(series, df, acf_lags)
    feature_cols = [c for c in feat.columns if c != col]
    
    print(f"  Features: {len(feature_cols)} columns")
    
    # TimeSeriesSplit cross-validation
    X = feat[feature_cols]
    y = feat[col]
    
    cv_scores = evaluate_with_timeseries_split(X, y)
    print(f"  CV scores (TimeSeriesSplit): {np.mean(cv_scores):.2f} ± {np.std(cv_scores):.2f}")
    
    # Train/validation split (time-based)
    split_idx = int(len(feat) * 0.8)
    X_train = feat.iloc[:split_idx][feature_cols]
    y_train = feat.iloc[:split_idx][col]
    X_test = feat.iloc[split_idx:][feature_cols]
    y_test = feat.iloc[split_idx:][col]
    
    # Train XGBoost
    model = XGBRegressor(n_estimators=150, max_depth=6, learning_rate=0.1, 
                         subsample=0.8, colsample_bytree=0.8, random_state=42, verbosity=0)
    model.fit(X_train, y_train)
    
    # Multi-horizon test
    horizons = [1, 5, 15, 30, 60]
    results = []
    for h in horizons:
        shift = h
        y_actual = y_test.shift(-shift).dropna()
        if len(y_actual) == 0:
            continue
        
        # XGBoost prediction
        valid_idx = y_actual.index
        X_valid = X_test.loc[valid_idx]
        y_xgb_pred = model.predict(X_valid)
        
        # Naive baseline
        y_naive = y_test.loc[valid_idx].values
        
        # Seasonal naive (same hour yesterday)
        y_seasonal = train_seasonal_baseline(y_test.iloc[:len(valid_idx)], h)[:len(valid_idx)]
        
        mae_xgb = mean_absolute_error(y_actual, y_xgb_pred)
        mae_naive = mean_absolute_error(y_actual, y_naive)
        mae_seasonal = mean_absolute_error(y_actual, y_seasonal)
        
        results.append({
            "horizon": h, 
            "xgb_mae": mae_xgb, 
            "naive_mae": mae_naive,
            "seasonal_mae": mae_seasonal
        })
        print(f"  Horizon {h:2d}: Naive={mae_naive:.2f}, Seasonal={mae_seasonal:.2f}, XGB={mae_xgb:.2f}")
    
    avg_xgb = np.mean([r["xgb_mae"] for r in results])
    avg_naive = np.mean([r["naive_mae"] for r in results])
    print(f"  Rata-rata: Naive={avg_naive:.2f}, XGB={avg_xgb:.2f} ({(avg_naive-avg_xgb)/avg_naive*100:.1f}% lebih baik)")
    
    # Train full model
    full_model = XGBRegressor(n_estimators=150, max_depth=6, learning_rate=0.1,
                               subsample=0.8, colsample_bytree=0.8, random_state=42, verbosity=0)
    full_model.fit(X, y)
    
    model_path = MODEL_DIR / f"xgb_{col}_timeseries.pkl"
    joblib.dump({
        "model": full_model, 
        "features": feature_cols, 
        "acf_lags": acf_lags,
        "param": col, 
        "trained_at": datetime.now().isoformat()
    }, model_path)
    print(f"  Model disimpan: {model_path.name}")
    return results

if __name__ == "__main__":
    print("=" * 60)
    print("RETRAIN TIME SERIES MODELS - ENHANCED")
    print("=" * 60)
    df = fetch_data()
    
    all_results = []
    for col in PARAMS:
        results = evaluate_models(df, col)
        all_results.append({"param": col, "results": results})
    
    eval_path = MODEL_DIR / "time_series_evaluation.json"
    with open(eval_path, "w") as f:
        json.dump(all_results, f, indent=2, default=str)
    print(f"\nHasil disimpan: {eval_path}")
    print("\n=== SELESAI ===")