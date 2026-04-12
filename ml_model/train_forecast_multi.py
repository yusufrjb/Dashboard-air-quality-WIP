"""
train_forecast_multi.py — Quick version
Training: 7 hari data, no hyperparameter tuning, no ARIMAX
"""

import os
import json
import time
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from xgboost import XGBRegressor
from supabase import create_client

np.random.seed(42)

OUTPUT_DIR = Path(__file__).parent
DATA_DAYS = 7

try:
    from lightgbm import LGBMRegressor
    HAS_LGBM = True
except ImportError:
    HAS_LGBM = False


def load_env():
    for env_path in [
        OUTPUT_DIR / ".env",
        OUTPUT_DIR.parent / ".env.local",
        OUTPUT_DIR.parent / ".env",
    ]:
        if env_path.exists():
            for line in env_path.read_text(encoding="utf-8").splitlines():
                if "=" in line and not line.startswith("#"):
                    k, _, v = line.partition("=")
                    k = k.strip()
                    if not os.environ.get(k):
                        os.environ[k] = v.strip().strip('"')


def fetch_data():
    sb = create_client(os.environ["SUPABASE_URL"].replace("http://", "https://"),
                       os.environ["SUPABASE_KEY"])
    since = (datetime.utcnow() - timedelta(days=DATA_DAYS)).isoformat()
    all_rows, offset = [], 0
    while True:
        resp = sb.table("tb_konsentrasi_gas") \
            .select("pm25_ugm3,pm10_corrected_ugm3,co_ugm3,temperature,humidity,created_at") \
            .gte("created_at", since) \
            .order("created_at", desc=False) \
            .range(offset, offset + 999).execute()
        batch = resp.data
        if not batch:
            break
        all_rows.extend(batch)
        offset += len(batch)
        if len(batch) < 1000:
            break

    df = pd.DataFrame(all_rows)
    for col in ["pm25_ugm3", "pm10_corrected_ugm3", "co_ugm3", "temperature", "humidity"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["created_at"] = pd.to_datetime(df["created_at"]).dt.tz_localize(None)
    df = df.dropna(subset=["pm25_ugm3", "pm10_corrected_ugm3", "co_ugm3"])
    df = df.set_index("created_at").sort_index()
    df = df[~df.index.duplicated(keep="first")]
    df.columns = ["pm25", "pm10", "co", "temp", "humid"]
    print("  Data: %d obs (%s)" % (len(df), df.index[0].strftime("%Y-%m-%d %H:%M") + " - " + df.index[-1].strftime("%Y-%m-%d %H:%M")))
    return df


def build_features(df, target_col):
    feat = df.copy()
    feat["target"] = feat[target_col].shift(-1)

    for lag in [1, 3, 5, 10, 15, 30]:
        feat["pm25_lag_%d" % lag] = feat["pm25"].shift(lag)
        feat["pm10_lag_%d" % lag] = feat["pm10"].shift(lag)
        feat["co_lag_%d" % lag] = feat["co"].shift(lag)

    for w in [5, 15, 30]:
        feat["pm25_rm_%d" % w] = feat["pm25"].rolling(w).mean()
        feat["pm10_rm_%d" % w] = feat["pm10"].rolling(w).mean()
        feat["co_rm_%d" % w] = feat["co"].rolling(w).mean()

    feat["pm25_diff1"] = feat["pm25"].diff(1)
    feat["pm10_diff1"] = feat["pm10"].diff(1)
    feat["co_diff1"] = feat["co"].diff(1)
    feat["temp"] = feat["temp"].fillna(feat["temp"].mean())
    feat["humid"] = feat["humid"].fillna(feat["humid"].mean())
    feat["temp_l1"] = feat["temp"].shift(1)
    feat["humid_l1"] = feat["humid"].shift(1)
    feat["hour"] = feat.index.hour
    feat["hour_sin"] = np.sin(2 * np.pi * feat["hour"] / 24)
    feat["hour_cos"] = np.cos(2 * np.pi * feat["hour"] / 24)

    feat = feat.dropna()
    feat = feat.replace([np.inf, -np.inf], np.nan).dropna()

    exclude = ["target", "pm25", "pm10", "co", "temp", "humid", "hour"]
    feature_cols = [c for c in feat.columns if c not in exclude]
    return feat, feature_cols


def eval_metrics(y_true, y_pred):
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)
    mask = y_true != 0
    mape = np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100
    return {"MAE": round(mae, 4), "RMSE": round(rmse, 4), "R2": round(r2, 4), "MAPE": round(mape, 2)}


def train_target(df, target_col, display_name):
    print("\n  === %s ===" % display_name)
    feat, feature_cols = build_features(df, target_col)
    print("  Dataset: %d rows | Features: %d" % (len(feat), len(feature_cols)))

    split = int(len(feat) * 0.8)
    X_train = feat[feature_cols].values[:split]
    X_test = feat[feature_cols].values[split:]
    y_train = feat["target"].values[:split]
    y_test = feat["target"].values[split:]
    print("  Train: %d | Test: %d" % (len(X_train), len(X_test)))

    scaler = StandardScaler()
    X_train_sc = scaler.fit_transform(X_train)
    X_test_sc = scaler.transform(X_test)

    models = {
        "XGBoost": XGBRegressor(n_estimators=100, max_depth=6, learning_rate=0.1,
                                 random_state=42, verbosity=0),
        "Random Forest": RandomForestRegressor(n_estimators=100, max_depth=10,
                                                 n_jobs=-1, random_state=42),
        "Gradient Boosting": GradientBoostingRegressor(n_estimators=100, max_depth=5,
                                                         learning_rate=0.1, random_state=42),
    }
    if HAS_LGBM:
        models["LightGBM"] = LGBMRegressor(n_estimators=100, max_depth=6,
                                             learning_rate=0.1, random_state=42, verbose=-1)

    results = []
    trained = {}
    for name, model in models.items():
        t0 = time.time()
        model.fit(X_train_sc if "XGB" not in name and "LGB" not in name else X_train,
                  y_train)
        y_pred = model.predict(X_test_sc if "XGB" not in name and "LGB" not in name else X_test)
        m = eval_metrics(y_test, y_pred)
        m["name"] = name
        m["train_time"] = round(time.time() - t0, 2)
        results.append(m)
        trained[name] = model
        print("    %s: R2=%.4f MAE=%.4f RMSE=%.4f MAPE=%.2f%% (%.1fs)"
              % (name, m["R2"], m["MAE"], m["RMSE"], m["MAPE"], m["train_time"]))

    results.sort(key=lambda x: x["R2"], reverse=True)
    best = results[0]

    import joblib
    model_file = OUTPUT_DIR / ("xgb_%s.pkl" % target_col.replace(".", "").lower())
    joblib.dump({"model": trained[best["name"]], "features": feature_cols,
                  "scaler": scaler, "target": target_col}, model_file)
    print("  Saved: %s" % model_file.name)
    return {"best_model": best["name"], "metrics": best, "all_results": results,
            "train_size": len(X_train), "test_size": len(X_test), "total_data": len(feat)}


def main():
    load_env()
    print("=" * 60)
    print("  MULTI-PARAMETER FORECASTING TRAINING")
    print("  Data: %d hari | Models: XGBoost, RF, GB, LightGBM" % DATA_DAYS)
    print("=" * 60)

    t0 = time.time()
    df = fetch_data()
    print("  Fetch done in %.1fs" % (time.time() - t0))

    results_all = {}
    for target_col, display_name in [("pm10", "PM10"), ("co", "CO")]:
        t1 = time.time()
        results_all[target_col] = train_target(df, target_col, display_name)
        print("  Done in %.1fs" % (time.time() - t1))

    out_path = OUTPUT_DIR / "forecast_multi_results.json"
    out_path.write_text(json.dumps({
        "evaluated_at": datetime.utcnow().isoformat(),
        "data_days": DATA_DAYS,
        "targets": results_all,
    }, indent=2, default=str), encoding="utf-8")
    print("\n  Saved: %s" % out_path.name)
    print("  Total time: %.1fs" % (time.time() - t0))


if __name__ == "__main__":
    main()
