"""
predict_and_save.py
-------------------
Pipeline LightGBM untuk forecasting PM2.5.

Cara kerja:
1. Ambil data 3 jam terakhir dari Supabase
2. Feature engineering (55+ fitur: lag, rolling, diff, cyclical time)
3. Fit LightGBM secara online (atau load model yang sudah disimpan)
4. Prediksi 30 menit ke depan secara rekursif
5. Simpan prediksi ke tabel tb_prediksi_pm25 di Supabase

Model: LightGBM — R²=64.44%, MAE=0.81, RMSE=1.18
(Mengungguli ARIMAX, Prophet, XGBoost, Random Forest)

Jalankan secara berkala dengan Windows Task Scheduler.
"""

import os
import sys
import logging
import warnings
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
import numpy as np
from lightgbm import LGBMRegressor
from supabase import create_client, Client

warnings.filterwarnings("ignore")

# ---------------------------------------------------------------------------
# Konfigurasi
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(Path(__file__).parent / "forecast_log.txt", encoding="utf-8")
    ]
)
log = logging.getLogger(__name__)

SUPABASE_URL  = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY  = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
TABLE_DATA    = "tb_konsentrasi_gas"
TABLE_PRED    = "tb_prediksi_pm25"
FORECAST_MINUTES = 30
DATA_WINDOW_MIN  = 1440  # 24 jam data untuk menangkap pola harian

# LightGBM hyperparameters (tuned dari comprehensive_model_search.py)
LGBM_PARAMS = {
    "n_estimators": 500,
    "max_depth": 5,
    "learning_rate": 0.03,
    "subsample": 0.8,
    "colsample_bytree": 0.7,
    "random_state": 42,
    "verbose": -1,
}


# ---------------------------------------------------------------------------
# Feature Engineering — identik dengan comprehensive_model_search.py
# ---------------------------------------------------------------------------
def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Buat 55+ fitur dari data PM2.5 mentah."""
    feat = df.copy()

    # Lag features
    for lag in [1, 3, 5, 10, 15, 30, 60]:
        feat[f"pm25_lag_{lag}"] = feat["pm25"].shift(lag)

    # Rolling statistics
    for window in [5, 10, 15, 30, 60]:
        feat[f"pm25_rolling_mean_{window}"] = feat["pm25"].rolling(window).mean()
        feat[f"pm25_rolling_std_{window}"] = feat["pm25"].rolling(window).std()
        feat[f"pm25_rolling_min_{window}"] = feat["pm25"].rolling(window).min()
        feat[f"pm25_rolling_max_{window}"] = feat["pm25"].rolling(window).max()

    # Difference features
    feat["pm25_diff_1"] = feat["pm25"].diff(1)
    feat["pm25_diff_5"] = feat["pm25"].diff(5)
    feat["pm25_diff_15"] = feat["pm25"].diff(15)

    # Rate of change
    feat["pm25_pct_change_1"] = feat["pm25"].pct_change(1)
    feat["pm25_pct_change_5"] = feat["pm25"].pct_change(5)

    # Exogenous lag features
    for col in ["temperature", "humidity"]:
        if col in feat.columns:
            feat[f"{col}_lag_1"] = feat[col].shift(1)
            feat[f"{col}_lag_5"] = feat[col].shift(5)
            feat[f"{col}_rolling_mean_15"] = feat[col].rolling(15).mean()

    # Cyclical time encoding
    feat["minute"] = feat.index.minute
    feat["hour"] = feat.index.hour
    feat["dayofweek"] = feat.index.dayofweek
    feat["hour_sin"] = np.sin(2 * np.pi * feat["hour"] / 24)
    feat["hour_cos"] = np.cos(2 * np.pi * feat["hour"] / 24)
    feat["minute_sin"] = np.sin(2 * np.pi * feat["minute"] / 60)
    feat["minute_cos"] = np.cos(2 * np.pi * feat["minute"] / 60)
    feat["dow_sin"] = np.sin(2 * np.pi * feat["dayofweek"] / 7)
    feat["dow_cos"] = np.cos(2 * np.pi * feat["dayofweek"] / 7)

    # Interaction feature
    feat["temp_x_humid"] = feat["temperature"] * feat["humidity"]

    # Clean
    feat = feat.replace([np.inf, -np.inf], np.nan).dropna()
    return feat


def get_feature_cols(df: pd.DataFrame) -> list:
    """Dapatkan kolom fitur (exclude target dan raw values)."""
    exclude = ["pm25", "pm10", "no2", "co"]
    return [c for c in df.columns if c not in exclude]


# ---------------------------------------------------------------------------
# Data fetching
# ---------------------------------------------------------------------------
def fetch_recent_data(supabase: Client, minutes: int = DATA_WINDOW_MIN) -> pd.DataFrame:
    since = (datetime.utcnow() - timedelta(minutes=minutes)).isoformat()
    all_rows = []
    page_size = 1000
    offset = 0
    while True:
        resp = (
            supabase.table(TABLE_DATA)
            .select("pm25_ugm3,temperature,humidity,created_at")
            .gte("created_at", since)
            .order("created_at", desc=False)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = resp.data
        if not batch:
            break
        all_rows.extend(batch)
        offset += len(batch)
        if len(batch) < page_size:
            break

    if not all_rows:
        raise ValueError(f"Tidak ada data dalam {minutes} menit terakhir.")

    df = pd.DataFrame(all_rows)
    for col in ["pm25_ugm3", "temperature", "humidity"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["created_at"] = pd.to_datetime(df["created_at"]).dt.tz_localize(None)
    df = df.dropna(subset=["pm25_ugm3", "temperature", "humidity"])
    df = df.set_index("created_at").sort_index()
    df = df[~df.index.duplicated(keep="first")]
    df.rename(columns={"pm25_ugm3": "pm25"}, inplace=True)

    log.info(f"Data diambil: {len(df)} baris (sejak {since})")
    return df


# ---------------------------------------------------------------------------
# Forecasting
# ---------------------------------------------------------------------------
def lightgbm_recursive_forecast(df: pd.DataFrame, n_steps: int = FORECAST_MINUTES) -> list[dict]:
    """
    Train LightGBM on available data, then predict recursively n steps ahead.
    Each step uses its own prediction as input for the next step.
    """
    # Build features with target (next step PM2.5)
    feat = build_features(df)
    feat["target"] = feat["pm25"].shift(-1)
    feat = feat.dropna()

    # Exclude raw columns and target from feature set
    exclude = {"pm25", "target", "temperature", "humidity"}
    feature_cols = [c for c in feat.columns if c not in exclude]

    X = feat[feature_cols].values
    y = feat["target"].values

    log.info(f"Training LightGBM pada {len(X)} sampel dengan {len(feature_cols)} fitur...")

    model = LGBMRegressor(**LGBM_PARAMS)
    model.fit(X, y)

    # Recursive forecasting
    df_work = df.copy()
    last_time = df_work.index[-1]
    results = []

    for step in range(1, n_steps + 1):
        # Build features from current data
        feat_step = build_features(df_work)
        if feat_step.empty:
            log.warning("Feature engineering menghasilkan 0 baris, berhenti.")
            break

        # Get last row features
        row = feat_step.iloc[[-1]]
        X_pred = row[feature_cols].values

        # Predict
        predicted_pm25 = float(model.predict(X_pred)[0])
        predicted_pm25 = max(0.0, min(300.0, predicted_pm25))

        target_time = last_time + timedelta(minutes=step)
        results.append({
            "target_at": target_time.isoformat(),
            "pm25_pred": round(predicted_pm25, 2),
        })

        # Append prediction as new row for next step
        new_row = df_work.iloc[[-1]].copy()
        new_row.index = [target_time]
        new_row["pm25"] = predicted_pm25
        df_work = pd.concat([df_work, new_row])

    return results


# ---------------------------------------------------------------------------
# Save to Supabase
# ---------------------------------------------------------------------------
def save_predictions(supabase: Client, predictions: list[dict], forecast_at: datetime):
    rows = [
        {
            "forecast_at": forecast_at.isoformat(),
            "target_at":   p["target_at"],
            "pm25_pred":   p["pm25_pred"],
            "is_historical": False,
        }
        for p in predictions
    ]
    if not rows:
        log.warning("Tidak ada prediksi untuk disimpan.")
        return

    supabase.table(TABLE_PRED).insert(rows).execute()
    log.info(f"{len(rows)} prediksi berhasil disimpan ke {TABLE_PRED}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    log.info("=" * 60)
    log.info("Pipeline Prediksi PM2.5 — LightGBM (R²=64.44%)")
    log.info("=" * 60)

    # Koneksi Supabase
    sb_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL)
    sb_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", SUPABASE_KEY)

    if not sb_url or not sb_key:
        env_path = Path(__file__).parent.parent / ".env.local"
        if env_path.exists():
            for line in env_path.read_text(encoding="utf-8").splitlines():
                if "=" in line and not line.startswith("#"):
                    k, _, v = line.partition("=")
                    os.environ[k.strip()] = v.strip().strip('"')
            sb_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
            sb_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")

    if not sb_url or not sb_key:
        log.error("NEXT_PUBLIC_SUPABASE_URL atau NEXT_PUBLIC_SUPABASE_ANON_KEY tidak ditemukan.")
        sys.exit(1)

    supabase: Client = create_client(sb_url, sb_key)

    # Ambil data
    df_raw = fetch_recent_data(supabase, minutes=DATA_WINDOW_MIN)

    # Prediksi
    forecast_at = datetime.utcnow()
    predictions = lightgbm_recursive_forecast(df_raw, n_steps=FORECAST_MINUTES)
    log.info(f"Menghasilkan {len(predictions)} prediksi LightGBM")
    for p in predictions[:5]:
        log.info(f"  {p['target_at']} → PM2.5 = {p['pm25_pred']} µg/m³")

    # Simpan
    save_predictions(supabase, predictions, forecast_at)
    log.info("Selesai!")


if __name__ == "__main__":
    main()
