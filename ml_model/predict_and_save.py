"""
predict_and_save.py
-------------------
Pipeline forecasting PM2.5 (XGBoost), PM10 (XGBoost), O3 (Random Forest).

Feature engineering identik dengan minutes_xgb.ipynb / train_pm10_o3.ipynb:
1. Load 3 PKL model
2. Feature engineering identik notebook (6 kolom, lag, rolling, time)
3. Prediksi hybrid (model 1-5 menit + pola harian 6-30 menit + noise adaptif)
4. Simpan prediksi ke tb_prediksi_pm25, tb_prediksi_pm10, tb_prediksi_o3

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
import joblib
from supabase import create_client, Client

warnings.filterwarnings("ignore")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(Path(__file__).parent / "forecast_log.txt", encoding="utf-8")
    ]
)
log = logging.getLogger(__name__)

TABLE_DATA    = "tb_konsentrasi_gas"
TABLE_PRED_PM25 = "tb_prediksi_pm25"
TABLE_PRED_PM10 = "tb_prediksi_pm10"
TABLE_PRED_O3   = "tb_prediksi_o3"
FORECAST_MINUTES = 30
DATA_WINDOW_MIN  = 1440

PKL_PM25 = Path(__file__).parent / "xgb_pm25.pkl"
PKL_PM10 = Path(__file__).parent / "xgb_pm10.pkl"
PKL_O3   = Path(__file__).parent / "rf_o3.pkl"

RAW_COLS_DB = ["pm25_ugm3", "pm10_ugm3", "co_ugm3", "no2_ugm3", "o3_ugm3", "temperature", "humidity"]
RENAME_MAP  = {"pm25_ugm3": "pm2.5", "pm10_ugm3": "pm10", "o3_ugm3": "o3"}
RAW_COLS    = ["pm2.5", "pm10", "co_ugm3", "no2_ugm3", "temperature", "humidity"]


MODEL_CONFIG = {
    "pm25": {"pkl": PKL_PM25, "table": TABLE_PRED_PM25, "col_pred": "pm25_pred", "raw_col": "pm2.5", "unit": "µg/m³", "max_val": 300},
    "pm10": {"pkl": PKL_PM10, "table": TABLE_PRED_PM10, "col_pred": "pm10_pred", "raw_col": "pm10", "unit": "µg/m³", "max_val": 600},
    "o3":   {"pkl": PKL_O3,   "table": TABLE_PRED_O3,   "col_pred": "o3_pred",   "raw_col": "o3",   "unit": "ppb",   "max_val": 200},
}


def build_features(df: pd.DataFrame, target_col: str) -> pd.DataFrame:
    feat = df.copy()

    for col in RAW_COLS:
        if col not in feat.columns:
            continue
        feat[f"{col}_lag_1min"] = feat[col].shift(1)
        feat[f"{col}_lag_5min"] = feat[col].shift(5)
        feat[f"{col}_lag_15min"] = feat[col].shift(15)
        feat[f"{col}_lag_60min"] = feat[col].shift(60)

        feat[f"{col}_rolling_mean_5min"] = feat[col].rolling(window=5).mean()
        feat[f"{col}_rolling_std_5min"] = feat[col].rolling(window=5).std()
        feat[f"{col}_rolling_mean_15min"] = feat[col].rolling(window=15).mean()

    feat["minute"] = feat.index.minute
    feat["hour"] = feat.index.hour
    feat["dayofweek"] = feat.index.dayofweek
    feat["target"] = feat[target_col]

    feat = feat.dropna()
    return feat


def fetch_recent_data(supabase: Client, minutes: int = DATA_WINDOW_MIN) -> pd.DataFrame:
    since = (datetime.utcnow() - timedelta(minutes=minutes)).isoformat()
    all_rows = []
    page_size = 1000
    offset = 0
    while True:
        resp = (
            supabase.table(TABLE_DATA)
            .select(",".join(RAW_COLS_DB) + ",created_at")
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
    for col in RAW_COLS_DB:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["created_at"] = pd.to_datetime(df["created_at"]).dt.tz_localize(None)
    df = df.dropna(subset=RAW_COLS_DB)
    df = df.set_index("created_at").sort_index()
    df = df[~df.index.duplicated(keep="first")]
    df.rename(columns=RENAME_MAP, inplace=True)

    log.info(f"Data diambil: {len(df)} baris (sejak {since})")
    return df


def build_hourly_pattern(df: pd.DataFrame, col: str) -> pd.Series:
    df_copy = df.copy()
    df_copy["hour"] = df_copy.index.hour
    return df_copy.groupby("hour")[col].mean()


def forecast_param(
    df: pd.DataFrame,
    model,
    feature_cols: list[str],
    hourly_pattern: pd.Series,
    raw_col: str,
    max_val: float,
    n_steps: int = FORECAST_MINUTES,
) -> list[dict]:
    feat = build_features(df, raw_col)
    if feat.empty:
        return []

    cols_missing = [c for c in feature_cols if c not in feat.columns]
    if cols_missing:
        log.warning(f"Fitur hilang ({raw_col}): {cols_missing[:5]}...")
        return []

    last_row = feat.iloc[[-1]]
    current_val = float(last_row["target"].values[0])
    now = datetime.utcnow()

    model_pred = float(model.predict(last_row[feature_cols].values)[0])
    model_delta = model_pred - current_val

    recent_vals = df[raw_col].iloc[-60:].values
    if len(recent_vals) >= 2:
        x = np.arange(len(recent_vals))
        slope = np.polyfit(x, recent_vals, 1)[0]
        recent_std = np.std(recent_vals[-30:]) if len(recent_vals) >= 30 else np.std(recent_vals)
    else:
        slope = 0
        recent_std = 1

    current_hour_f = now.hour + now.minute / 60
    h_low = int(current_hour_f) % 24
    h_high = (h_low + 1) % 24
    frac = current_hour_f - int(current_hour_f)
    current_hourly_avg = hourly_pattern.get(h_low, current_val) * (1 - frac) + hourly_pattern.get(h_high, current_val) * frac

    results = []
    for step in range(1, n_steps + 1):
        target_time = now + timedelta(minutes=step)
        target_hour_f = target_time.hour + target_time.minute / 60

        th_low = int(target_hour_f) % 24
        th_high = (th_low + 1) % 24
        t_frac = target_hour_f - int(target_hour_f)
        target_hourly_avg = hourly_pattern.get(th_low, current_hourly_avg) * (1 - t_frac) + hourly_pattern.get(th_high, current_hourly_avg) * t_frac

        if step <= 5:
            damping = 0.7 ** step
            short_term = current_val + (model_delta * 0.5 + slope * step * 1.5) * damping
            alpha = step / 5
            blended = short_term * (1 - alpha) + target_hourly_avg * alpha
        else:
            blended = target_hourly_avg

        transition = min(1.0, step / 1.5)
        final = current_val * (1 - transition) + blended * transition

        noise_std = recent_std * 0.15 * (step / 30)
        noise = np.random.normal(0, noise_std)
        final = max(0.0, min(max_val, final + noise))

        results.append({
            "target_at": target_time.isoformat(),
            "value": round(final, 2),
        })

    log.info(f"  {raw_col.upper()}: current={current_val:.1f}, model1step={model_pred:.1f} (delta={model_delta:+.2f}), trend={slope:+.3f}/min")
    return results


def save_predictions(supabase: Client, predictions: list[dict], forecast_at: datetime, table: str, col_pred: str):
    rows = [
        {
            "forecast_at": forecast_at.isoformat(),
            "target_at": p["target_at"],
            col_pred: p["value"],
            "is_historical": False,
        }
        for p in predictions
    ]
    if not rows:
        log.warning(f"Tidak ada prediksi untuk {table}.")
        return

    supabase.table(table).insert(rows).execute()
    log.info(f"  {len(rows)} prediksi disimpan ke {table}")


def main():
    log.info("=" * 60)
    log.info("Pipeline Prediksi Multi-Parameter — PM2.5, PM10, O3")
    log.info("=" * 60)

    pkl_files = {k: v["pkl"] for k, v in MODEL_CONFIG.items()}
    missing = [k for k, p in pkl_files.items() if not p.exists()]
    if missing:
        log.error(f"PKL tidak ditemukan: {', '.join(f'{k} ({pkl_files[k].name})' for k in missing)}")
        log.error("Jalankan train_pm10_o3.ipynb (untuk PM10 & O3) dan minutes_xgb.ipynb (untuk PM2.5).")
        sys.exit(1)

    models = {}
    feature_cols_map = {}
    for param_name, cfg in MODEL_CONFIG.items():
        m = joblib.load(cfg["pkl"])
        fc = list(m.feature_names_in_) if hasattr(m, "feature_names_in_") else []
        models[param_name] = m
        feature_cols_map[param_name] = fc
        log.info(f"Loaded {cfg['pkl'].name} — {len(fc)} fitur")

    sb_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL", "")
    sb_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_ANON_KEY", "")

    if not sb_url or not sb_key:
        env_paths = [
            Path(__file__).parent / ".env",
            Path(__file__).parent.parent / ".env.local",
            Path(__file__).parent.parent / ".env",
        ]
        for env_path in env_paths:
            if env_path.exists():
                for line in env_path.read_text(encoding="utf-8").splitlines():
                    if "=" in line and not line.startswith("#"):
                        k, _, v = line.partition("=")
                        k = k.strip()
                        if not os.environ.get(k):
                            os.environ[k] = v.strip().strip('"')
        sb_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL", "")
        sb_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_ANON_KEY", "")

    if not sb_url or not sb_key:
        log.error("SUPABASE_URL atau SUPABASE_ANON_KEY tidak ditemukan.")
        sys.exit(1)

    sb_url = sb_url.replace("http://", "https://")
    log.info(f"Supabase URL: {sb_url}")

    supabase: Client = create_client(sb_url, sb_key)

    df_raw = fetch_recent_data(supabase, minutes=DATA_WINDOW_MIN)

    forecast_at = datetime.utcnow()

    for param_name, cfg in MODEL_CONFIG.items():
        log.info(f"\n--- Prediksi {param_name.upper()} ---")
        hourly_pattern = build_hourly_pattern(df_raw, cfg["raw_col"])
        log.info(f"  Pola harian: {len(hourly_pattern)} jam, range {hourly_pattern.min():.1f}-{hourly_pattern.max():.1f}")

        predictions = forecast_param(
            df_raw,
            models[param_name],
            feature_cols_map[param_name],
            hourly_pattern,
            cfg["raw_col"],
            cfg["max_val"],
            n_steps=FORECAST_MINUTES,
        )

        if predictions:
            save_predictions(supabase, predictions, forecast_at, cfg["table"], cfg["col_pred"])
            for p in predictions[:3]:
                log.info(f"    {p['target_at']} -> {p['value']}")
            if len(predictions) > 3:
                log.info(f"    ...")
                log.info(f"    {predictions[-1]['target_at']} -> {predictions[-1]['value']}")

    log.info("\nSelesai!")


if __name__ == "__main__":
    main()
