"""
predict_hourly_multi.py
-----------------------
Multi-parameter forecasting: PM2.5, PM10, CO — 60 menit ke depan.
- Load model .pkl (PM2.5, PM10, CO)
- Enhanced forecast: XGBoost ML (1-5 min) + pola harian (6-60 min) + adaptive noise
- ISPU classification untuk setiap step
- Simpan ke tb_prediksi_hourly di Supabase
- Return dict forecast + classification

Jalankan via live_forecast_watcher.py setiap 5 menit.
"""

import os
import sys
import json
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
        logging.FileHandler(Path(__file__).parent / "forecast_hourly_log.txt", encoding="utf-8", mode="a"),
    ]
)
log = logging.getLogger(__name__)

TABLE_DATA = "tb_konsentrasi_gas"
TABLE_HOURLY = "tb_prediksi_hourly"
FORECAST_MINUTES = 60
DATA_WINDOW_MIN = 1440

MODEL_DIR = Path(__file__).parent
MODEL_FILES = {
    "pm25": MODEL_DIR / "xgb_pm25.pkl",
    "pm10": MODEL_DIR / "xgb_pm10.pkl",
    "co": MODEL_DIR / "xgb_co.pkl",
}

BP_PM25 = [(0,15,0,50),(15,35,50,100),(35,55,100,200),(55,150,200,300),(150,250,300,400),(250,350,400,500)]
BP_PM10 = [(0,50,0,50),(50,150,50,100),(150,350,100,200),(350,420,200,300),(420,500,300,400),(500,600,400,500)]
BP_CO   = [(0,5000,0,50),(5000,10000,50,100),(10000,17000,100,200),(17000,34000,200,300),(34000,46000,300,400),(46000,56000,400,500)]
BP_NO2  = [(0,40,0,50),(40,80,50,100),(80,180,100,200),(180,280,200,300),(280,565,300,400),(565,665,400,500)]
BP_O3   = [(0,60,0,50),(60,120,50,100),(120,180,100,200),(180,240,200,300),(240,400,300,500)]
O3_CONV = 1.963

RAW_COLS_DB = ["pm25_ugm3", "pm10_corrected_ugm3", "co_ugm3", "no2_ugm3", "o3_ugm3", "temperature", "humidity"]

CAT_COLORS = {
    "Baik": "#10b981",
    "Sedang": "#3b82f6",
    "Tidak Sehat": "#f59e0b",
    "Sangat Tidak Sehat": "#ef4444",
    "Berbahaya": "#7c3aed",
}


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
                    k = k.strip()
                    if not os.environ.get(k):
                        os.environ[k] = v.strip().strip('"')


def conc_to_ispi(val, bp):
    if val <= 0: return 0
    for cl, ch, il, ih in bp:
        if val <= ch: return il + (val - cl) / (ch - cl) * (ih - il)
    return bp[-1][3]


def ispi_to_label_cat(ispu):
    if ispu <= 50: return "Baik"
    if ispu <= 100: return "Sedang"
    if ispu <= 200: return "Tidak Sehat"
    if ispu <= 300: return "Sangat Tidak Sehat"
    return "Berbahaya"


def get_ispi(pm25, pm10, co, no2, o3_ugm3):
    o3_ppb = o3_ugm3 / O3_CONV
    ispis = {
        "PM2.5": conc_to_ispi(pm25, BP_PM25),
        "PM10": conc_to_ispi(pm10, BP_PM10),
        "CO": conc_to_ispi(co, BP_CO),
        "NO2": conc_to_ispi(no2, BP_NO2),
        "O3": conc_to_ispi(o3_ppb, BP_O3),
    }
    max_ispu = max(ispis.values())
    dominant = max(ispis, key=ispis.get)
    return round(max_ispu, 1), ispi_to_label_cat(max_ispu), dominant


def fetch_recent_data(supabase: Client, minutes: int = DATA_WINDOW_MIN) -> pd.DataFrame:
    since = (datetime.utcnow() - timedelta(minutes=minutes)).isoformat()
    all_rows, offset = [], 0
    while True:
        resp = (
            supabase.table(TABLE_DATA)
            .select(",".join(RAW_COLS_DB) + ",created_at")
            .gte("created_at", since)
            .order("created_at", desc=False)
            .range(offset, offset + 999)
            .execute()
        )
        batch = resp.data
        if not batch:
            break
        all_rows.extend(batch)
        offset += len(batch)
        if len(batch) < 1000:
            break

    if not all_rows:
        raise ValueError(f"Tidak ada data dalam {minutes} menit terakhir.")

    df = pd.DataFrame(all_rows)
    for col in RAW_COLS_DB:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["created_at"] = pd.to_datetime(df["created_at"]).dt.tz_localize(None)
    df = df.dropna(subset=["pm25_ugm3", "pm10_corrected_ugm3", "co_ugm3"])
    df = df.set_index("created_at").sort_index()
    df = df[~df.index.duplicated(keep="first")]
    df = df.rename(columns={
        "pm25_ugm3": "pm25", "pm10_corrected_ugm3": "pm10",
        "co_ugm3": "co", "no2_ugm3": "no2",
        "o3_ugm3": "o3", "temperature": "temp", "humidity": "humid"
    })
    log.info(f"Data diambil: {len(df)} baris")
    return df


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    feat = df.copy()
    for col in ["pm25", "pm10", "co"]:
        for lag in [1, 3, 5, 10, 15, 30]:
            feat[f"{col}_lag_{lag}"] = feat[col].shift(lag)
        feat[f"{col}_rm_5"] = feat[col].rolling(5).mean()
        feat[f"{col}_rm_15"] = feat[col].rolling(15).mean()
        feat[f"{col}_rm_30"] = feat[col].rolling(30).mean()
    feat["temp_l1"] = feat["temp"].shift(1)
    feat["humid_l1"] = feat["humid"].shift(1)
    feat["temp_roll_mean_15"] = feat["temp"].rolling(15).mean()
    feat["humid_roll_mean_15"] = feat["humid"].rolling(15).mean()
    feat["hour"] = feat.index.hour
    feat["hour_sin"] = np.sin(2 * np.pi * feat["hour"] / 24)
    feat["hour_cos"] = np.cos(2 * np.pi * feat["hour"] / 24)
    feat["pm25_diff1"] = feat["pm25"].diff(1)
    feat["pm10_diff1"] = feat["pm10"].diff(1)
    feat["co_diff1"] = feat["co"].diff(1)
    feat = feat.dropna()
    return feat


def build_hourly_pattern(df: pd.DataFrame, col: str) -> dict:
    df2 = df.copy()
    df2["hour"] = df2.index.hour
    return df2.groupby("hour")[col].mean().to_dict()


def fallback_holt_winters(df: pd.DataFrame, col: str, max_val: float, n_steps: int = FORECAST_MINUTES) -> list[dict]:
    series = df[col].iloc[-60:].values
    if len(series) < 2:
        series = np.full(60, series[0]) if len(series) > 0 else np.zeros(60)
    alpha, beta = 0.3, 0.1
    level, trend = series[0], series[1] - series[0] if len(series) > 1 else 0
    for v in series[1:]:
        new_level = alpha * v + (1 - alpha) * (level + trend)
        trend = beta * (new_level - level) + (1 - beta) * trend
        level = new_level
    fc = []
    now = datetime.utcnow()
    params = ["pm25", "pm10", "co"]
    param_names = {"pm25": "pm25", "pm10": "pm10", "co": "co"}
    for i in range(1, n_steps + 1):
        noise = (np.random.random() - 0.5) * level * 0.05
        fc.append({"target_at": now + timedelta(minutes=i), param_names[col]: round(max(0, min(max_val, level + i * trend + noise)), 2)})
    return fc


def forecast_one_param(
    df: pd.DataFrame,
    model_data: dict,
    raw_col: str,
    max_val: float,
    n_steps: int = FORECAST_MINUTES,
) -> list[dict]:
    feat = build_features(df)
    if feat.empty:
        return []

    scaler = model_data.get("scaler")
    feature_cols = model_data.get("features", []) or list(feat.columns)
    cols_missing = [c for c in feature_cols if c not in feat.columns]
    if cols_missing:
        log.warning(f"Fitur hilang ({raw_col}): {cols_missing[:5]}")
        feature_cols = [c for c in feature_cols if c in feat.columns]

    model = model_data["model"] if isinstance(model_data, dict) else model_data
    last_row = feat.iloc[[-1]]
    current_val = float(last_row[raw_col].values[0])
    now = datetime.utcnow()

    feat_ordered = feat[feature_cols]
    X = feat_ordered.values
    model_name = type(model).__name__
    if scaler is not None and model_name in ("Ridge", "LinearRegression", "Lasso"):
        X = scaler.transform(X)
    try:
        model_pred = float(model.predict(X)[0])
    except Exception:
        model_pred = current_val
    model_delta = model_pred - current_val

    recent_vals = df[raw_col].iloc[-60:].values
    slope = np.polyfit(np.arange(len(recent_vals)), recent_vals, 1)[0] if len(recent_vals) >= 2 else 0
    recent_std = np.std(recent_vals[-30:]) if len(recent_vals) >= 30 else np.std(recent_vals)

    hourly_pattern = build_hourly_pattern(df, raw_col)

    # Build minute-of-hour pattern for better minute-to-minute variation
    df_with_minute = df.copy()
    df_with_minute["minute"] = df_with_minute.index.minute
    minute_pattern = df_with_minute.groupby("minute")[raw_col].mean().to_dict()

    results = []
    prev_pred = current_val
    for step in range(1, n_steps + 1):
        target_time = now + timedelta(minutes=step)
        target_hour = target_time.hour
        target_minute = target_time.minute
        target_hourly_avg = hourly_pattern.get(target_hour, current_val)
        target_minute_avg = minute_pattern.get(target_minute, current_val)

        if step <= 5:
            damping = 0.7 ** step
            short_term = current_val + (model_delta * 0.5 + slope * step * 1.5) * damping
            alpha = step / 5
            blended = short_term * (1 - alpha) + target_hourly_avg * alpha
        else:
            # Blend hourly pattern with minute pattern and trend continuation
            minute_weight = 0.4
            hourly_weight = 0.3
            trend_weight = 0.3
            trend_contribution = slope * step * 0.5 if abs(slope) > 0.01 else 0
            blended = (target_hourly_avg * hourly_weight + 
                      target_minute_avg * minute_weight + 
                      (prev_pred + slope * 0.5) * trend_weight +
                      trend_contribution)

        transition = min(1.0, step / 10)  # Slower transition over 10 steps
        final = current_val * (1 - transition) + blended * transition

        # Enhanced noise that scales with horizon and adds more variation
        noise_scale = recent_std * 0.3 * (0.5 + step / 60)
        noise = np.random.normal(0, noise_scale)
        final = max(0.0, min(max_val, final + noise))

        results.append({
            "target_at": target_time,
            raw_col: round(final, 2),
        })
        
        prev_pred = final

    log.info(f"  {raw_col.upper()}: cur={current_val:.1f}, model1s={model_pred:.1f}, trend={slope:+.3f}/min")
    return results


def classify_forecast(forecast_rows: list, no2_latest: float, o3_latest: float) -> list[dict]:
    result = []
    for row in forecast_rows:
        pm25 = row.get("pm25", 0)
        pm10 = row.get("pm10", 0)
        co = row.get("co", 0)
        ispu, label, dominant = get_ispi(pm25, pm10, co, no2_latest, o3_latest)
        result.append({
            "target_at": row["target_at"],
            "ispu": ispu,
            "category": label,
            "dominant": dominant,
            "color": CAT_COLORS.get(label, "#94a3b8"),
        })
    return result


def save_hourly_predictions(supabase: Client, forecast_rows: list, forecast_at: datetime, classifications: list):
    rows = []
    for f_row, cls in zip(forecast_rows, classifications):
        rows.append({
            "forecast_at": forecast_at.isoformat(),
            "target_at": f_row["target_at"].isoformat(),
            "pm25_pred": round(f_row.get("pm25", 0), 2),
            "pm10_pred": round(f_row.get("pm10", 0), 2),
            "co_pred": round(f_row.get("co", 0), 2),
            "ispu": cls["ispu"],
            "category": cls["category"],
            "is_historical": False,
        })
    if rows:
        # Upsert instead of insert to avoid duplicates
        for row in rows:
            try:
                supabase.table(TABLE_HOURLY).upsert(
                    row,
                    on_conflict='target_at'
                ).execute()
            except Exception as e:
                log.warning(f"  Gagal upsert baris: {e}")
        log.info(f"  {len(rows)} baris diupsert ke {TABLE_HOURLY}")
    return rows


def get_results() -> dict:
    load_env()

    sb_url = os.environ.get("SUPABASE_URL", "")
    sb_key = os.environ.get("SUPABASE_ANON_KEY", "")
    if not sb_url or not sb_key:
        log.error("SUPABASE_URL/SUPABASE_KEY tidak ditemukan")
        return {}

    sb_url = sb_url.replace("http://", "https://")
    supabase: Client = create_client(sb_url, sb_key)

    df = fetch_recent_data(supabase)
    forecast_at = datetime.utcnow()

    no2_latest = float(df["no2"].iloc[-1]) if "no2" in df.columns and len(df) > 0 else 50
    o3_latest = float(df["o3"].iloc[-1]) if "o3" in df.columns and len(df) > 0 else 40

    all_forecasts = {}

    models_loaded = {}
    for param, pkl_path in MODEL_FILES.items():
        if pkl_path.exists():
            try:
                m = joblib.load(pkl_path)
                if isinstance(m, dict):
                    models_loaded[param] = m
                else:
                    models_loaded[param] = {"model": m, "features": []}
                log.info(f"Loaded {pkl_path.name}")
            except Exception as e:
                log.warning(f"Gagal load {pkl_path.name}: {e}")
        else:
            log.warning(f"PKL tidak ditemukan: {pkl_path.name}")

    for param, col, max_val in [("pm25", "pm25", 300), ("pm10", "pm10", 600), ("co", "co", 50000)]:
        model_data = models_loaded.get(param)
        if model_data:
            log.info("--- %s (XGBoost) ---" % param.upper())
            fc = forecast_one_param(df, model_data, col, max_val)
            if fc:
                all_forecasts[param] = fc
                log.info(f"  {param.upper()}: {len(fc)} prediksi")
            else:
                log.warning(f"Gagal forecast {param}, gunakan fallback")
                all_forecasts[param] = fallback_holt_winters(df, col, max_val)
        else:
            log.info("--- %s (Holt-Winters fallback) ---" % param.upper())
            all_forecasts[param] = fallback_holt_winters(df, col, max_val)
            log.info(f"  {param.upper()}: {len(all_forecasts[param])} prediksi")

    if not all_forecasts:
        log.error("Tidak ada forecast yang berhasil dibuat.")
        return {}

    n_steps = FORECAST_MINUTES
    forecast_rows = []
    for i in range(n_steps):
        target_at = forecast_at + timedelta(minutes=i + 1)
        row = {"target_at": target_at}
        for param, forecasts in all_forecasts.items():
            if i < len(forecasts):
                row[param] = forecasts[i].get(param, 0)
        forecast_rows.append(row)

    classifications = classify_forecast(forecast_rows, no2_latest, o3_latest)

    try:
        save_hourly_predictions(supabase, forecast_rows, forecast_at, classifications)
    except Exception as e:
        log.warning(f"  Gagal simpan ke Supabase: {e}")

    return {
        "forecast_at": forecast_at.isoformat(),
        "forecast": [
            {
                "target_at": row["target_at"].isoformat(),
                "pm25": round(row.get("pm25", 0), 2),
                "pm10": round(row.get("pm10", 0), 2),
                "co": round(row.get("co", 0), 2),
            }
            for row in forecast_rows
        ],
        "classification": [
            {
                "target_at": row["target_at"].isoformat(),
                "ispu": cls["ispu"],
                "category": cls["category"],
                "dominant": cls["dominant"],
                "color": cls["color"],
            }
            for row, cls in zip(forecast_rows, classifications)
        ],
    }


if __name__ == "__main__":
    log.info("=" * 60)
    log.info("Hourly Multi-Parameter Forecast — PM2.5, PM10, CO (60 min)")
    log.info("=" * 60)
    result = get_results()
    if result:
        print(json.dumps(result, indent=2, default=str))
        log.info("Selesai!")
    else:
        log.error("Forecast gagal.")
        sys.exit(1)
