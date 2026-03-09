"""
regression_antar_parameter.py
------------------------------
Regresi antar-parameter menggunakan XGBoost, LightGBM, dan Random Forest.

Tujuan: Memodelkan hubungan antar parameter kualitas udara.
  - Target: PM2.5
  - Fitur: temperature, humidity, NO2, CO, PM10

Ini BUKAN forecasting time-series, melainkan regresi klasik:
  "Jika suhu = X dan kelembapan = Y, berapa prediksi PM2.5?"

Output:
  - regression_results.json → metrik perbandingan model
  - Digunakan oleh dashboard di tab Statistik
"""

import os
import sys
import json
import warnings
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split, KFold, cross_val_score
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from supabase import create_client

warnings.filterwarnings("ignore")
np.random.seed(42)

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
OUTPUT_DIR = Path(__file__).parent


def fetch_all_data():
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("Mengambil 20.000 data terbaru dari Supabase untuk Continuous Learning...")
    resp = (
        sb.table("tb_konsentrasi_gas")
        .select("pm25_ugm3,pm10_corrected_ugm3,no2_ugm3,co_corrected_ugm3,temperature,humidity,created_at")
        .order("created_at", desc=True)
        .limit(20000)
        .execute()
    )
    all_rows = resp.data
    
    if not all_rows:
        print("  ⚠️ Gagal mengambil data!")
        return pd.DataFrame()

    df = pd.DataFrame(all_rows)
    for col in ["pm25_ugm3", "pm10_corrected_ugm3", "no2_ugm3", "co_corrected_ugm3", "temperature", "humidity"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["created_at"] = pd.to_datetime(df["created_at"])
    df = df.dropna()

    # Filter outliers: remove rows with impossible values
    df = df[(df["temperature"] > -50) & (df["temperature"] < 60)]
    df = df[(df["humidity"] > 0) & (df["humidity"] < 100)]
    df = df[(df["pm25_ugm3"] >= 0) & (df["pm25_ugm3"] < 500)]
    df = df[(df["pm10_corrected_ugm3"] >= 0)]

    print(f"  Total data bersih: {len(df)} observasi")
    return df


def evaluate_regression(df):
    print("\n" + "=" * 60)
    print("REGRESI ANTAR-PARAMETER: Prediksi PM2.5 dari Parameter Lain")
    print("=" * 60)

    if len(df) < 100:
        print(f"  [WARN] Data terlalu sedikit ({len(df)}), melewati training regresi.")
        return None

    # Features dan target
    feature_cols = ["temperature", "humidity", "pm10_corrected_ugm3", "no2_ugm3", "co_corrected_ugm3"]
    target_col = "pm25_ugm3"

    # Hapus baris dengan nilai target konstan jika ada (biasa terjadi pada kegagalan sensor)
    if df[target_col].nunique() <= 1:
        print("  [WARN] Nilai target konstan (semua sama), melewati training.")
        return None

    X = df[feature_cols].values
    y = df[target_col].values

    indices = np.arange(len(X))
    # SHUFFLED split for inter-parameter regression (not forecasting)
    X_train, X_test, y_train, y_test, idx_train, idx_test = train_test_split(
        X, y, indices, test_size=0.2, random_state=42, shuffle=True
    )

    print(f"\n  Fitur: {feature_cols}")
    print(f"  Target: {target_col}")
    print(f"  Train: {len(X_train)} | Test: {len(X_test)} (Shuffled)")

    # Models
    models = {
        "LightGBM": LGBMRegressor(
            n_estimators=500, max_depth=8, learning_rate=0.05,
            num_leaves=31, subsample=0.8, colsample_bytree=0.8, 
            random_state=42, verbose=-1
        ),
        "XGBoost": XGBRegressor(
            n_estimators=500, max_depth=8, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8, random_state=42, verbosity=0
        ),
        "Random Forest": RandomForestRegressor(
            n_estimators=300, max_depth=15, random_state=42, n_jobs=-1
        ),
        "Gradient Boosting": GradientBoostingRegressor(
            n_estimators=300, max_depth=6, learning_rate=0.05, random_state=42
        ),
        "Linear Regression": LinearRegression(),
    }

    results = []
    best_model = None
    best_name = ""
    best_r2 = -999

    for name, model in models.items():
        print(f"\n  Training {name}...")
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)
        mask = y_test != 0
        mape = np.mean(np.abs((y_test[mask] - y_pred[mask]) / y_test[mask])) * 100

        # Setup KFold for robust validation
        kf = KFold(n_splits=5, shuffle=True, random_state=42)

        # Cross-validation R² on full dataset for better trust
        cv_scores = cross_val_score(model, X, y, cv=kf, scoring="r2")
        cv_r2_mean = cv_scores.mean()

        results.append({
            "name": name,
            "type": "regression",
            "MAE": round(mae, 4),
            "RMSE": round(rmse, 4),
            "R2": round(r2 * 100, 2),
            "MAPE": round(mape, 2),
            "CV_R2": round(cv_r2_mean * 100, 2),
        })

        status = "[OK]" if r2 > 0.5 else "[WARN]" if r2 > 0 else "[FAIL]"
        print(f"    {status} R2={r2*100:.2f}% | MAE={mae:.4f} | RMSE={rmse:.4f} | CV-R2={cv_r2_mean*100:.2f}%")

        if r2 > best_r2:
            best_r2 = r2
            best_model = model
            best_name = name

    # Feature importance from best model
    fi = []
    if hasattr(best_model, "feature_importances_"):
        importances = best_model.feature_importances_
        sorted_idx = np.argsort(importances)[::-1]
        print(f"\n  Feature Importance ({best_name}):")
        for i, idx in enumerate(sorted_idx):
            pct = importances[idx] / importances.sum() * 100
            print(f"    {i+1}. {feature_cols[idx]:30s} -> {pct:.1f}%")
            fi.append({
                "feature": feature_cols[idx],
                "importance": round(float(pct), 2),
                "label": {
                    "temperature": "Suhu",
                    "humidity": "Kelembapan",
                    "pm10_corrected_ugm3": "PM10",
                    "no2_ugm3": "NO₂",
                    "co_corrected_ugm3": "CO",
                }.get(feature_cols[idx], feature_cols[idx])
            })

    # Sort results
    results.sort(key=lambda x: x["R2"], reverse=True)

    # Get scatter points for the BEST model for visualization
    print(f"\n  Menyiapkan data visualisasi untuk {best_name}...")
    
    # 1. Sample from Train Data (Blue)
    train_step = max(1, len(y_train) // 250)
    train_y_pred = best_model.predict(X_train[::train_step])
    train_times = df["created_at"].values[idx_train][::train_step]
    
    scatter_points = []
    for i in range(len(train_y_pred)):
        t = pd.to_datetime(train_times[i]).strftime("%H:%M")
        scatter_points.append({
            "actual": round(float(y_train[i*train_step]), 2),
            "predicted": round(float(train_y_pred[i]), 2),
            "time": t,
            "isTrain": True
        })

    # 2. Sample from Test Data (Amber)
    test_step = max(1, len(y_test) // 250)
    test_y_pred = best_model.predict(X_test[::test_step])
    test_times = df["created_at"].values[idx_test][::test_step]
    
    for i in range(len(test_y_pred)):
        t = pd.to_datetime(test_times[i]).strftime("%H:%M")
        scatter_points.append({
            "actual": round(float(y_test[i*test_step]), 2),
            "predicted": round(float(test_y_pred[i]), 2),
            "time": t,
            "isTrain": False
        })

    # Time-series comparison points (use test data for clarity)
    ts_points = []
    for i in range(len(test_y_pred)):
        t = pd.to_datetime(test_times[i]).strftime("%H:%M")
        ts_points.append({
            "time": t,
            "actual": round(float(y_test[i*test_step]), 2),
            "predicted": round(float(test_y_pred[i]), 2)
        })

    print("\n" + "=" * 60)
    print("RINGKASAN REGRESI ANTAR-PARAMETER")
    print("=" * 60)
    print(f"\n  {'Model':<22s} {'R²':>8s} {'CV-R²':>8s} {'MAE':>8s} {'RMSE':>8s}")
    print("  " + "-" * 55)
    for r in results:
        marker = "[BEST]" if r["name"] == best_name else "      "
        print(f"  {marker}{r['name']:<20s} {r['R2']:>7.2f}% {r['CV_R2']:>7.2f}% {r['MAE']:>8.4f} {r['RMSE']:>8.4f}")

    # Save to JSON
    output = {
        "evaluated_at": datetime.now().isoformat(),
        "total_data": len(df),
        "train_size": len(X_train),
        "test_size": len(X_test),
        "target": "PM2.5 (µg/m³)",
        "features": feature_cols,
        "best_model": best_name,
        "best_r2": round(best_r2 * 100, 2),
        "results": results,
        "feature_importance": fi,
        "scatterData": scatter_points,
        "timeSeriesData": ts_points,
    }
    
    out_path = OUTPUT_DIR / "regression_results.json"
    print(f"  [WRITE] Menulis hasil ke: {out_path.absolute()}")
    try:
        out_path.write_text(json.dumps(output, indent=2, default=str), encoding="utf-8")
        print(f"  [DONE] File berhasil diperbarui pada {output['evaluated_at']}")
    except Exception as e:
        print(f"  [ERROR] Gagal menulis file: {e}")
    
    return output


if __name__ == "__main__":
    data = fetch_all_data()
    evaluate_regression(data)
