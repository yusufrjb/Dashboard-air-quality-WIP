"""
evaluate_models.py
------------------
Evaluasi perbandingan ARIMAX vs Prophet untuk forecasting PM2.5.

Cara kerja:
1. Ambil data 3 jam terakhir dari Supabase
2. Split: 80% train, 20% test
3. Fit ARIMAX(2,1,2) dan Prophet pada data train
4. Prediksi pada data test
5. Hitung MAE, RMSE, R² untuk kedua model
6. Cetak hasil perbandingan

Jalankan manual:
  python evaluate_models.py
"""

import os
import sys
import warnings
import json
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from statsmodels.tsa.statespace.sarimax import SARIMAX
from supabase import create_client

warnings.filterwarnings("ignore")

# ---------------------------------------------------------------------------
# Supabase config
# ---------------------------------------------------------------------------
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")


def fetch_data(minutes=180):
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    since = (datetime.utcnow() - timedelta(minutes=minutes)).isoformat()
    resp = (
        sb.table("tb_konsentrasi_gas")
        .select("pm25_ugm3,temperature,humidity,created_at")
        .gte("created_at", since)
        .order("created_at", desc=False)
        .limit(1000)
        .execute()
    )
    df = pd.DataFrame(resp.data)
    df["pm25_ugm3"] = pd.to_numeric(df["pm25_ugm3"], errors="coerce")
    df["temperature"] = pd.to_numeric(df["temperature"], errors="coerce")
    df["humidity"] = pd.to_numeric(df["humidity"], errors="coerce")
    df["created_at"] = pd.to_datetime(df["created_at"]).dt.tz_localize(None)
    df = df.dropna().set_index("created_at").sort_index()
    df = df[~df.index.duplicated(keep="first")]
    return df


def evaluate_arimax(train, test):
    """Fit ARIMAX(2,1,2) pada train, prediksi sepanjang test."""
    endog_train = train["pm25_ugm3"].values
    exog_train = train[["temperature", "humidity"]].values
    exog_test = test[["temperature", "humidity"]].values

    model = SARIMAX(
        endog_train, exog=exog_train, order=(2, 1, 2),
        enforce_stationarity=False, enforce_invertibility=False
    )
    result = model.fit(disp=False, maxiter=200)
    preds = result.forecast(steps=len(test), exog=exog_test)
    return np.clip(preds, 0, 300)


def evaluate_prophet(train, test):
    """Fit Prophet pada train, prediksi sepanjang test."""
    from prophet import Prophet

    df_train = pd.DataFrame({
        "ds": train.index,
        "y": train["pm25_ugm3"].values,
        "temperature": train["temperature"].values,
        "humidity": train["humidity"].values,
    })

    m = Prophet(
        daily_seasonality=True,
        weekly_seasonality=False,
        yearly_seasonality=False,
        changepoint_prior_scale=0.05,
    )
    m.add_regressor("temperature")
    m.add_regressor("humidity")
    m.fit(df_train)

    df_future = pd.DataFrame({
        "ds": test.index,
        "temperature": test["temperature"].values,
        "humidity": test["humidity"].values,
    })
    forecast = m.predict(df_future)
    preds = forecast["yhat"].values
    return np.clip(preds, 0, 300)


def calc_metrics(y_true, y_pred):
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)
    # MAPE: rata-rata error dalam persen — metrik utama untuk forecasting
    mask = y_true != 0
    mape = np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100
    return {"MAE": round(mae, 4), "RMSE": round(rmse, 4), "R2": round(r2 * 100, 2), "MAPE": round(mape, 2)}


def main():
    print("=" * 60)
    print("Evaluasi Perbandingan Model Forecasting PM2.5")
    print("=" * 60)

    df = fetch_data(minutes=180)
    print(f"Total data: {len(df)} observasi (3 jam terakhir)\n")

    # Split 80/20
    split_idx = int(len(df) * 0.8)
    train = df.iloc[:split_idx]
    test = df.iloc[split_idx:]
    y_true = test["pm25_ugm3"].values

    print(f"Train: {len(train)} | Test: {len(test)}")
    print()

    # --- ARIMAX ---
    print("Fitting ARIMAX(2,1,2)...")
    arimax_preds = evaluate_arimax(train, test)
    arimax_metrics = calc_metrics(y_true, arimax_preds)
    print(f"  MAE:  {arimax_metrics['MAE']}")
    print(f"  RMSE: {arimax_metrics['RMSE']}")
    print(f"  R²:   {arimax_metrics['R2']}%")
    print()

    # --- Prophet ---
    print("Fitting Prophet...")
    prophet_preds = evaluate_prophet(train, test)
    prophet_metrics = calc_metrics(y_true, prophet_preds)
    print(f"  MAE:  {prophet_metrics['MAE']}")
    print(f"  RMSE: {prophet_metrics['RMSE']}")
    print(f"  R²:   {prophet_metrics['R2']}%")
    print()

    # --- Summary ---
    print("=" * 60)
    print(f"{'Model':<12} {'MAE':>8} {'RMSE':>8} {'R² (%)':>10}")
    print("-" * 40)
    print(f"{'ARIMAX':<12} {arimax_metrics['MAE']:>8} {arimax_metrics['RMSE']:>8} {arimax_metrics['R2']:>10}")
    print(f"{'Prophet':<12} {prophet_metrics['MAE']:>8} {prophet_metrics['RMSE']:>8} {prophet_metrics['R2']:>10}")
    print("=" * 60)

    # Save results as JSON for the frontend
    results = {
        "evaluated_at": datetime.utcnow().isoformat(),
        "data_points": len(df),
        "train_size": len(train),
        "test_size": len(test),
        "models": {
            "ARIMAX": arimax_metrics,
            "Prophet": prophet_metrics,
        }
    }
    out_path = Path(__file__).parent / "model_comparison.json"
    out_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"\nHasil disimpan ke: {out_path}")


if __name__ == "__main__":
    main()
