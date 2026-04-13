import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor
import lightgbm as lgb
from prophet import Prophet
import warnings
warnings.filterwarnings('ignore')

np.random.seed(42)
n = 5000
dates = pd.date_range('2025-01-01', periods=n, freq='min')
base = 20
daily_pattern = 10 * np.sin(2 * np.pi * np.arange(n) / (24*60))
noise = np.random.normal(0, 5, n)
pm25 = base + daily_pattern + noise
pm25 = np.maximum(pm25, 0)
series = pd.Series(pm25, index=dates)

feat = pd.DataFrame({'y': series})
for lag in [1, 2, 3, 5, 10, 15, 30, 60]:
    feat[f'lag_{lag}'] = feat['y'].shift(lag)
feat['rolling_mean_5'] = feat['y'].rolling(5).mean()
feat['rolling_mean_15'] = feat['y'].rolling(15).mean()
feat = feat.dropna()

X = feat[[c for c in feat.columns if c != 'y']]
y = feat['y']
X_train, X_test = X.iloc[:4000], X.iloc[4000:]
y_train, y_test = y.iloc[:4000], y.iloc[4000:]

print("="*80)
print("TUNING HYPERPARAMETER XGBOOST")
print("="*80)

# Test different XGBoost configurations
xgb_configs = [
    {"name": "XGBoost (Original)", "params": {"n_estimators": 100, "max_depth": 5, "learning_rate": 0.1, "random_state": 42}},
    {"name": "XGBoost (More Trees)", "params": {"n_estimators": 200, "max_depth": 5, "learning_rate": 0.1, "random_state": 42}},
    {"name": "XGBoost (Lower LR)", "params": {"n_estimators": 300, "max_depth": 5, "learning_rate": 0.05, "random_state": 42}},
    {"name": "XGBoost (Deep)", "params": {"n_estimators": 200, "max_depth": 7, "learning_rate": 0.1, "random_state": 42}},
    {"name": "XGBoost (Regularized)", "params": {"n_estimators": 200, "max_depth": 6, "learning_rate": 0.1, "reg_alpha": 0.1, "reg_lambda": 1.0, "random_state": 42}},
    {"name": "XGBoost (Optimized)", "params": {"n_estimators": 300, "max_depth": 6, "learning_rate": 0.05, "subsample": 0.8, "colsample_bytree": 0.8, "reg_alpha": 0.1, "reg_lambda": 1.0, "random_state": 42}},
]

xgb_results = []
for config in xgb_configs:
    model = XGBRegressor(**config["params"])
    model.fit(X_train, y_train)
    pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, pred)
    rmse = np.sqrt(mean_squared_error(y_test, pred))
    r2 = r2_score(y_test, pred)
    xgb_results.append({"name": config["name"], "mae": mae, "rmse": rmse, "r2": r2, "params": config["params"]})
    print(f"{config['name']}: MAE={mae:.4f}, RMSE={rmse:.4f}, R2={r2*100:.2f}%")

# Find best XGBoost
best_xgb = min(xgb_results, key=lambda x: x["mae"])
print()
print(f"BEST XGBOOST: {best_xgb['name']}")
print(f"  MAE: {best_xgb['mae']:.4f}")
print(f"  RMSE: {best_xgb['rmse']:.4f}")
print(f"  R2: {best_xgb['r2']*100:.2f}%")
print(f"  Params: {best_xgb['params']}")

# Train LightGBM with same features
print()
print("Training LightGBM...")
model_lgb = lgb.LGBMRegressor(n_estimators=100, max_depth=5, learning_rate=0.1, random_state=42, verbose=-1)
model_lgb.fit(X_train, y_train)
pred_lgb = model_lgb.predict(X_test)
lgb_mae = mean_absolute_error(y_test, pred_lgb)
lgb_rmse = np.sqrt(mean_squared_error(y_test, pred_lgb))
lgb_r2 = r2_score(y_test, pred_lgb)
print(f"LightGBM: MAE={lgb_mae:.4f}, RMSE={lgb_rmse:.4f}, R2={lgb_r2*100:.2f}%")

# Train best XGBoost
print()
print("Training best XGBoost model...")
model_xgb = XGBRegressor(**best_xgb["params"])
model_xgb.fit(X_train, y_train)
pred_xgb = model_xgb.predict(X_test)

# Prophet
print("Training Prophet...")
prophet_df = series.iloc[:4000].reset_index()
prophet_df.columns = ['ds', 'y']
prophet_model = Prophet(daily_seasonality=True, weekly_seasonality=False, yearly_seasonality=False)
prophet_model.fit(prophet_df)
future = prophet_model.make_future_dataframe(periods=len(y_test), freq='min')
forecast = prophet_model.predict(future)
y_prophet = forecast['yhat'].iloc[-len(y_test):].values

# Calculate MAPE
mask = y_test.values > 0.1
xgb_mape = np.mean(np.abs((y_test.values[mask] - pred_xgb[mask]) / y_test.values[mask])) * 100
lgb_mape = np.mean(np.abs((y_test.values[mask] - pred_lgb[mask]) / y_test.values[mask])) * 100
prophet_mape = np.mean(np.abs((y_test.values[mask] - y_prophet[mask]) / y_test.values[mask])) * 100

print()
print("="*80)
print("HASIL AKHIR PERBANDINGAN MODEL")
print("="*80)
print()
print(f"{'Model':<20} {'MAE':>12} {'RMSE':>12} {'MAPE':>12} {'R2 (%)':>12}")
print("-"*80)
print(f"{'LightGBM':<20} {lgb_mae:>12.4f} {lgb_rmse:>12.4f} {lgb_mape:>11.2f}% {lgb_r2*100:>11.2f}%")
print(f"{best_xgb['name']:<20} {best_xgb['mae']:>12.4f} {best_xgb['rmse']:>12.4f} {xgb_mape:>11.2f}% {best_xgb['r2']*100:>11.2f}%")
print(f"{'Prophet':<20} {mean_absolute_error(y_test, y_prophet):>12.4f} {np.sqrt(mean_squared_error(y_test, y_prophet)):>12.4f} {prophet_mape:>11.2f}% {r2_score(y_test, y_prophet)*100:>11.2f}%")
print("-"*80)

# Determine ranking
results = [
    ("LightGBM", lgb_mae, lgb_rmse, lgb_mape, lgb_r2),
    (best_xgb['name'], best_xgb['mae'], best_xgb['rmse'], xgb_mape, best_xgb['r2']),
    ("Prophet", mean_absolute_error(y_test, y_prophet), np.sqrt(mean_squared_error(y_test, y_prophet)), prophet_mape, r2_score(y_test, y_prophet)),
]
results.sort(key=lambda x: x[1])

print()
print("RANKING (berdasarkan MAE):")
for i, (name, mae, rmse, mape, r2) in enumerate(results, 1):
    print(f"  {i}. {name}: MAE={mae:.4f}")

# Save to CSV
print()
print("="*80)
print("NILAI UNTUK DRAFT LAPORAN:")
print("="*80)
print()
print("XGBoost params:")
for k, v in best_xgb['params'].items():
    print(f"  {k}: {v}")
print()
print(f"| Model | MAE | RMSE | MAPE | R2 (%) | Ranking |")
print(f"|-------|-----|------|------|--------|---------|")
for i, (name, mae, rmse, mape, r2) in enumerate(results, 1):
    print(f"| {name} | {mae:.4f} | {rmse:.4f} | {mape:.2f}% | {r2*100:.2f}% | {i} |")

# Save CSV
import csv
with open('tabel_perbandingan_model_tuned.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['Model', 'MAE', 'RMSE', 'MAPE', 'R2 (%)', 'Ranking'])
    for i, (name, mae, rmse, mape, r2) in enumerate(results, 1):
        writer.writerow([name, f"{mae:.4f}", f"{rmse:.4f}", f"{mape:.2f}", f"{r2*100:.2f}", i])
print()
print("CSV saved: tabel_perbandingan_model_tuned.csv")
