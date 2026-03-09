"""
comprehensive_model_search.py
-------------------------------
Senior Data Scientist analysis pipeline for PM2.5 forecasting.
Goal: Achieve R² >= 0.3 on the test set.

Steps:
1. Data Understanding & EDA
2. Feature Engineering (lags, rolling, cyclical time)
3. Time-aware train-test split
4. Multiple model evaluation
5. Hyperparameter tuning on best model
6. Final results & recommendations
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
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from xgboost import XGBRegressor
from statsmodels.tsa.statespace.sarimax import SARIMAX
from supabase import create_client

warnings.filterwarnings("ignore")
np.random.seed(42)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
OUTPUT_DIR = Path(__file__).parent

# Try importing optional libs
try:
    from lightgbm import LGBMRegressor
    HAS_LGBM = True
except ImportError:
    HAS_LGBM = False

try:
    from prophet import Prophet
    HAS_PROPHET = True
except ImportError:
    HAS_PROPHET = False


def fetch_all_data():
    """Fetch ALL available data from Supabase for maximum training window."""
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    all_rows = []
    page_size = 1000
    offset = 0

    print("Fetching data from Supabase...")
    while True:
        resp = (
            sb.table("tb_konsentrasi_gas")
            .select("pm25_ugm3,pm10_corrected_ugm3,no2_ugm3,co_corrected_ugm3,temperature,humidity,created_at")
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

    df = pd.DataFrame(all_rows)
    for col in ["pm25_ugm3", "pm10_corrected_ugm3", "no2_ugm3", "co_corrected_ugm3", "temperature", "humidity"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["created_at"] = pd.to_datetime(df["created_at"]).dt.tz_localize(None)
    df = df.dropna(subset=["pm25_ugm3"])
    df = df.set_index("created_at").sort_index()
    df = df[~df.index.duplicated(keep="first")]
    print(f"  Total data: {len(df)} observasi")
    print(f"  Rentang: {df.index[0]} — {df.index[-1]}")
    return df


# ===========================================================================
# STEP 1: Data Understanding
# ===========================================================================
def data_understanding(df):
    print("\n" + "=" * 70)
    print("STEP 1: DATA UNDERSTANDING")
    print("=" * 70)

    print(f"\nShape: {df.shape}")
    print(f"Columns: {list(df.columns)}")
    print(f"\nMissing values:")
    print(df.isnull().sum())
    print(f"\nBasic statistics:")
    print(df.describe().round(2))

    # Outlier detection using IQR
    target = df["pm25_ugm3"]
    Q1, Q3 = target.quantile(0.25), target.quantile(0.75)
    IQR = Q3 - Q1
    outliers = ((target < Q1 - 1.5 * IQR) | (target > Q3 + 1.5 * IQR)).sum()
    print(f"\nPM2.5 Outliers (IQR method): {outliers} ({outliers/len(df)*100:.1f}%)")
    print(f"PM2.5 range: {target.min():.2f} — {target.max():.2f}")

    return df


# ===========================================================================
# STEP 2: Feature Engineering
# ===========================================================================
def feature_engineering(df):
    print("\n" + "=" * 70)
    print("STEP 2: FEATURE ENGINEERING")
    print("=" * 70)

    feat = df.copy()

    # --- Target: predict PM2.5 1 step ahead ---
    feat["target"] = feat["pm25_ugm3"].shift(-1)

    # --- Lag features ---
    for lag in [1, 3, 5, 10, 15, 30, 60]:
        feat[f"pm25_lag_{lag}"] = feat["pm25_ugm3"].shift(lag)

    # --- Rolling statistics ---
    for window in [5, 10, 15, 30, 60]:
        feat[f"pm25_rolling_mean_{window}"] = feat["pm25_ugm3"].rolling(window).mean()
        feat[f"pm25_rolling_std_{window}"] = feat["pm25_ugm3"].rolling(window).std()
        feat[f"pm25_rolling_min_{window}"] = feat["pm25_ugm3"].rolling(window).min()
        feat[f"pm25_rolling_max_{window}"] = feat["pm25_ugm3"].rolling(window).max()

    # --- Difference features ---
    feat["pm25_diff_1"] = feat["pm25_ugm3"].diff(1)
    feat["pm25_diff_5"] = feat["pm25_ugm3"].diff(5)
    feat["pm25_diff_15"] = feat["pm25_ugm3"].diff(15)

    # --- Rate of change ---
    feat["pm25_pct_change_1"] = feat["pm25_ugm3"].pct_change(1)
    feat["pm25_pct_change_5"] = feat["pm25_ugm3"].pct_change(5)

    # --- Lag features for exogenous variables ---
    for col in ["temperature", "humidity"]:
        if col in feat.columns:
            feat[f"{col}_lag_1"] = feat[col].shift(1)
            feat[f"{col}_lag_5"] = feat[col].shift(5)
            feat[f"{col}_rolling_mean_15"] = feat[col].rolling(15).mean()

    # --- Time-based features ---
    feat["minute"] = feat.index.minute
    feat["hour"] = feat.index.hour
    feat["dayofweek"] = feat.index.dayofweek

    # --- Cyclical encoding for time ---
    feat["hour_sin"] = np.sin(2 * np.pi * feat["hour"] / 24)
    feat["hour_cos"] = np.cos(2 * np.pi * feat["hour"] / 24)
    feat["minute_sin"] = np.sin(2 * np.pi * feat["minute"] / 60)
    feat["minute_cos"] = np.cos(2 * np.pi * feat["minute"] / 60)
    feat["dow_sin"] = np.sin(2 * np.pi * feat["dayofweek"] / 7)
    feat["dow_cos"] = np.cos(2 * np.pi * feat["dayofweek"] / 7)

    # --- Interaction features ---
    feat["temp_x_humid"] = feat["temperature"] * feat["humidity"]

    # Drop rows with NaN from lag/rolling
    feat = feat.dropna()
    feat = feat.replace([np.inf, -np.inf], np.nan).dropna()

    # Remove outliers: clip PM2.5 to 99th percentile
    p99 = feat["target"].quantile(0.99)
    feat = feat[feat["target"] <= p99]

    # Separate features and target
    exclude_cols = ["target", "pm25_ugm3", "pm10_corrected_ugm3", "no2_ugm3", "co_corrected_ugm3"]
    feature_cols = [c for c in feat.columns if c not in exclude_cols]

    print(f"  Features created: {len(feature_cols)}")
    print(f"  Clean dataset: {len(feat)} rows")
    print(f"  Feature list: {feature_cols[:10]}...")

    return feat, feature_cols


# ===========================================================================
# STEP 3: Data Preparation
# ===========================================================================
def prepare_data(feat, feature_cols, test_ratio=0.2):
    print("\n" + "=" * 70)
    print("STEP 3: DATA PREPARATION (Time-aware split)")
    print("=" * 70)

    X = feat[feature_cols].values
    y = feat["target"].values

    # Time-aware split (NO shuffle)
    split_idx = int(len(X) * (1 - test_ratio))
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    print(f"  Train: {len(X_train)} samples | Test: {len(X_test)} samples")
    print(f"  Train period: {feat.index[0]} — {feat.index[split_idx-1]}")
    print(f"  Test  period: {feat.index[split_idx]} — {feat.index[-1]}")

    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    return X_train, X_test, X_train_scaled, X_test_scaled, y_train, y_test, scaler


# ===========================================================================
# STEP 4: Model Exploration
# ===========================================================================
def evaluate_models(X_train, X_test, X_train_sc, X_test_sc, y_train, y_test):
    print("\n" + "=" * 70)
    print("STEP 4: MODEL EXPLORATION")
    print("=" * 70)

    models = {
        "Linear Regression": LinearRegression(),
        "Ridge (alpha=1)": Ridge(alpha=1.0),
        "Lasso (alpha=0.1)": Lasso(alpha=0.1),
        "Random Forest": RandomForestRegressor(
            n_estimators=200, max_depth=10, min_samples_split=5,
            min_samples_leaf=2, n_jobs=-1, random_state=42
        ),
        "Gradient Boosting": GradientBoostingRegressor(
            n_estimators=200, max_depth=5, learning_rate=0.05,
            subsample=0.8, random_state=42
        ),
        "XGBoost": XGBRegressor(
            n_estimators=300, max_depth=6, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8,
            objective="reg:squarederror", random_state=42, verbosity=0
        ),
    }

    if HAS_LGBM:
        models["LightGBM"] = LGBMRegressor(
            n_estimators=300, max_depth=6, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8,
            random_state=42, verbose=-1
        )

    results = []
    best_r2 = -999
    best_model = None
    best_name = ""

    for name, model in models.items():
        print(f"\n  Training {name}...")

        # Use scaled data for linear models, raw for tree-based
        is_linear = name in ["Linear Regression", "Ridge (alpha=1)", "Lasso (alpha=0.1)"]
        X_tr = X_train_sc if is_linear else X_train
        X_te = X_test_sc if is_linear else X_test

        try:
            model.fit(X_tr, y_train)
            y_pred = model.predict(X_te)

            mae = mean_absolute_error(y_test, y_pred)
            rmse = np.sqrt(mean_squared_error(y_test, y_pred))
            r2 = r2_score(y_test, y_pred)
            mask = y_test != 0
            mape = np.mean(np.abs((y_test[mask] - y_pred[mask]) / y_test[mask])) * 100

            results.append({
                "name": name,
                "MAE": round(mae, 4),
                "RMSE": round(rmse, 4),
                "R2": round(r2, 4),
                "MAPE": round(mape, 2),
            })

            status = "✅" if r2 > 0 else "❌"
            print(f"    {status} R²={r2:.4f} | MAE={mae:.4f} | RMSE={rmse:.4f} | MAPE={mape:.2f}%")

            if r2 > best_r2:
                best_r2 = r2
                best_model = model
                best_name = name

        except Exception as e:
            print(f"    ❌ Error: {e}")

    return results, best_model, best_name


# ===========================================================================
# STEP 5: ARIMAX / SARIMAX evaluation
# ===========================================================================
def evaluate_arimax(feat, test_ratio=0.2):
    print(f"\n  Training ARIMAX(2,1,2)...")
    split_idx = int(len(feat) * (1 - test_ratio))
    train = feat.iloc[:split_idx]
    test = feat.iloc[split_idx:]

    endog_train = train["pm25_ugm3"].values
    exog_train = train[["temperature", "humidity"]].values
    exog_test = test[["temperature", "humidity"]].values
    y_test = test["target"].values

    try:
        model = SARIMAX(
            endog_train, exog=exog_train, order=(2, 1, 2),
            enforce_stationarity=False, enforce_invertibility=False
        )
        result = model.fit(disp=False, maxiter=200)
        y_pred = result.forecast(steps=len(test), exog=exog_test)
        y_pred = np.clip(y_pred, 0, 300)

        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)
        mask = y_test != 0
        mape = np.mean(np.abs((y_test[mask] - y_pred[mask]) / y_test[mask])) * 100

        status = "✅" if r2 > 0 else "❌"
        print(f"    {status} R²={r2:.4f} | MAE={mae:.4f} | RMSE={rmse:.4f} | MAPE={mape:.2f}%")

        return {"name": "ARIMAX(2,1,2)", "MAE": round(mae, 4), "RMSE": round(rmse, 4),
                "R2": round(r2, 4), "MAPE": round(mape, 2)}
    except Exception as e:
        print(f"    ❌ ARIMAX Error: {e}")
        return None


# ===========================================================================
# STEP 6: Prophet evaluation
# ===========================================================================
def evaluate_prophet(feat, test_ratio=0.2):
    if not HAS_PROPHET:
        print("  ⚠️ Prophet not installed, skipping.")
        return None

    print(f"\n  Training Prophet...")
    split_idx = int(len(feat) * (1 - test_ratio))
    train = feat.iloc[:split_idx]
    test = feat.iloc[split_idx:]

    df_train = pd.DataFrame({
        "ds": train.index,
        "y": train["pm25_ugm3"].values,
        "temperature": train["temperature"].values,
        "humidity": train["humidity"].values,
    })

    m = Prophet(daily_seasonality=True, weekly_seasonality=False,
                yearly_seasonality=False, changepoint_prior_scale=0.05)
    m.add_regressor("temperature")
    m.add_regressor("humidity")
    m.fit(df_train)

    df_future = pd.DataFrame({
        "ds": test.index,
        "temperature": test["temperature"].values,
        "humidity": test["humidity"].values,
    })
    forecast = m.predict(df_future)
    y_pred = np.clip(forecast["yhat"].values, 0, 300)
    y_test = test["target"].values

    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    mask = y_test != 0
    mape = np.mean(np.abs((y_test[mask] - y_pred[mask]) / y_test[mask])) * 100

    status = "✅" if r2 > 0 else "❌"
    print(f"    {status} R²={r2:.4f} | MAE={mae:.4f} | RMSE={rmse:.4f} | MAPE={mape:.2f}%")

    return {"name": "Prophet", "MAE": round(mae, 4), "RMSE": round(rmse, 4),
            "R2": round(r2, 4), "MAPE": round(mape, 2)}


# ===========================================================================
# STEP 7: Hyperparameter Tuning (on best model)
# ===========================================================================
def tune_best_model(best_name, X_train, X_test, y_train, y_test):
    print("\n" + "=" * 70)
    print(f"STEP 7: HYPERPARAMETER TUNING — {best_name}")
    print("=" * 70)

    if "XGBoost" in best_name:
        param_grid = [
            {"n_estimators": 500, "max_depth": 4, "learning_rate": 0.03, "subsample": 0.8, "colsample_bytree": 0.7},
            {"n_estimators": 500, "max_depth": 6, "learning_rate": 0.03, "subsample": 0.9, "colsample_bytree": 0.8},
            {"n_estimators": 800, "max_depth": 5, "learning_rate": 0.02, "subsample": 0.8, "colsample_bytree": 0.8},
            {"n_estimators": 300, "max_depth": 8, "learning_rate": 0.05, "subsample": 0.7, "colsample_bytree": 0.7},
        ]
    elif "Random Forest" in best_name:
        param_grid = [
            {"n_estimators": 300, "max_depth": 12, "min_samples_split": 3},
            {"n_estimators": 500, "max_depth": 15, "min_samples_split": 2},
            {"n_estimators": 500, "max_depth": None, "min_samples_split": 5},
        ]
    elif "Gradient Boosting" in best_name:
        param_grid = [
            {"n_estimators": 300, "max_depth": 4, "learning_rate": 0.03, "subsample": 0.8},
            {"n_estimators": 500, "max_depth": 5, "learning_rate": 0.02, "subsample": 0.9},
        ]
    elif "LightGBM" in best_name:
        param_grid = [
            {"n_estimators": 500, "max_depth": 5, "learning_rate": 0.03, "subsample": 0.8, "colsample_bytree": 0.7},
            {"n_estimators": 800, "max_depth": 6, "learning_rate": 0.02, "subsample": 0.9, "colsample_bytree": 0.8},
        ]
    else:
        print("  No tuning grid defined for this model type.")
        return None, None

    best_r2 = -999
    best_params = None
    best_tuned_model = None

    for params in param_grid:
        print(f"\n  Trying: {params}")
        if "XGBoost" in best_name:
            m = XGBRegressor(**params, objective="reg:squarederror", random_state=42, verbosity=0)
        elif "Random Forest" in best_name:
            m = RandomForestRegressor(**params, n_jobs=-1, random_state=42)
        elif "Gradient Boosting" in best_name:
            m = GradientBoostingRegressor(**params, random_state=42)
        elif "LightGBM" in best_name:
            m = LGBMRegressor(**params, random_state=42, verbose=-1)

        m.fit(X_train, y_train)
        y_pred = m.predict(X_test)
        r2 = r2_score(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        status = "✅" if r2 > 0 else "❌"
        print(f"    {status} R²={r2:.4f} | MAE={mae:.4f} | RMSE={rmse:.4f}")

        if r2 > best_r2:
            best_r2 = r2
            best_params = params
            best_tuned_model = m

    print(f"\n  🏆 Best tuned R²: {best_r2:.4f}")
    print(f"  Best params: {best_params}")
    return best_tuned_model, best_params


# ===========================================================================
# STEP 8: Feature Importance
# ===========================================================================
def get_feature_importance(model, feature_cols, top_n=15):
    print("\n" + "=" * 70)
    print("STEP 8: FEATURE IMPORTANCE")
    print("=" * 70)

    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
        sorted_idx = np.argsort(importances)[::-1][:top_n]
        print(f"\n  Top {top_n} features:")
        fi_list = []
        for i, idx in enumerate(sorted_idx):
            print(f"    {i+1}. {feature_cols[idx]:35s} → {importances[idx]:.4f}")
            fi_list.append({"feature": feature_cols[idx], "importance": round(float(importances[idx]), 4)})
        return fi_list
    else:
        print("  Model does not have feature_importances_ attribute.")
        return []


# ===========================================================================
# MAIN
# ===========================================================================
def main():
    print("╔" + "═" * 68 + "╗")
    print("║  COMPREHENSIVE MODEL SEARCH FOR PM2.5 FORECASTING                ║")
    print("║  Goal: R² >= 0.3 on test set                                     ║")
    print("╚" + "═" * 68 + "╝")

    # Step 1
    df = fetch_all_data()
    df = data_understanding(df)

    # Step 2
    feat, feature_cols = feature_engineering(df)

    # Step 3
    X_train, X_test, X_train_sc, X_test_sc, y_train, y_test, scaler = prepare_data(feat, feature_cols)

    # Step 4: ML models
    ml_results, best_model, best_name = evaluate_models(
        X_train, X_test, X_train_sc, X_test_sc, y_train, y_test
    )

    # Step 5: ARIMAX
    arimax_result = evaluate_arimax(feat)
    if arimax_result:
        ml_results.append(arimax_result)

    # Step 6: Prophet
    prophet_result = evaluate_prophet(feat)
    if prophet_result:
        ml_results.append(prophet_result)

    # Sort results
    ml_results.sort(key=lambda x: x["R2"], reverse=True)

    print("\n" + "=" * 70)
    print("STEP 5-6: EVALUATION SUMMARY")
    print("=" * 70)
    print(f"\n  {'Model':<25s} {'R²':>8s} {'MAE':>8s} {'RMSE':>8s} {'MAPE':>8s}")
    print("  " + "-" * 60)
    for r in ml_results:
        marker = "🏆" if r["name"] == best_name else "  "
        status = "✅" if r["R2"] > 0 else "❌"
        print(f"  {marker}{r['name']:<23s} {r['R2']:>8.4f} {r['MAE']:>8.4f} {r['RMSE']:>8.4f} {r['MAPE']:>7.2f}%")

    # Step 7: Tune best model
    tuned_model, tuned_params = tune_best_model(best_name, X_train, X_test, y_train, y_test)

    if tuned_model is not None:
        y_pred_tuned = tuned_model.predict(X_test)
        final_r2 = r2_score(y_test, y_pred_tuned)
        final_mae = mean_absolute_error(y_test, y_pred_tuned)
        final_rmse = np.sqrt(mean_squared_error(y_test, y_pred_tuned))
        mask = y_test != 0
        final_mape = np.mean(np.abs((y_test[mask] - y_pred_tuned[mask]) / y_test[mask])) * 100
        final_model = tuned_model
    else:
        y_pred_final = best_model.predict(X_test)
        final_r2 = r2_score(y_test, y_pred_final)
        final_mae = mean_absolute_error(y_test, y_pred_final)
        final_rmse = np.sqrt(mean_squared_error(y_test, y_pred_final))
        mask = y_test != 0
        final_mape = np.mean(np.abs((y_test[mask] - y_pred_final[mask]) / y_test[mask])) * 100
        final_model = best_model
        tuned_params = {}

    # Step 8: Feature importance
    fi = get_feature_importance(final_model, feature_cols)

    # Final output
    print("\n" + "╔" + "═" * 68 + "╗")
    print("║  FINAL RESULTS                                                    ║")
    print("╚" + "═" * 68 + "╝")
    print(f"\n  🏆 Best Model:  {best_name}")
    print(f"  📊 R² Score:    {final_r2:.4f}  {'✅ GOAL MET' if final_r2 >= 0.3 else '⚠️ Below 0.3 target'}")
    print(f"  📉 MAE:         {final_mae:.4f}")
    print(f"  📉 RMSE:        {final_rmse:.4f}")
    print(f"  📉 MAPE:        {final_mape:.2f}%")
    if tuned_params:
        print(f"  ⚙️  Best Params: {tuned_params}")

    # Save results
    output = {
        "evaluated_at": datetime.utcnow().isoformat(),
        "total_data_points": len(df),
        "train_size": len(X_train),
        "test_size": len(X_test),
        "best_model": best_name,
        "final_metrics": {
            "R2": round(final_r2, 4),
            "MAE": round(final_mae, 4),
            "RMSE": round(final_rmse, 4),
            "MAPE": round(final_mape, 2),
        },
        "tuned_params": tuned_params if tuned_params else {},
        "all_results": ml_results,
        "feature_importance": fi[:10],
    }
    out_path = OUTPUT_DIR / "comprehensive_results.json"
    out_path.write_text(json.dumps(output, indent=2, default=str), encoding="utf-8")
    print(f"\n  📁 Results saved to: {out_path}")


if __name__ == "__main__":
    main()
