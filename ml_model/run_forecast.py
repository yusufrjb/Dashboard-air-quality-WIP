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

# Create feature engineering FIRST
feat = pd.DataFrame({'y': series})
for lag in [1, 2, 3, 5, 10, 15, 30, 60]:
    feat[f'lag_{lag}'] = feat['y'].shift(lag)
feat['rolling_mean_5'] = feat['y'].rolling(5).mean()
feat['rolling_mean_15'] = feat['y'].rolling(15).mean()
feat = feat.dropna()

# Split AFTER feature engineering
X = feat[[c for c in feat.columns if c != 'y']]
y = feat['y']

# Split: 4000 for train, rest for test
X_train, X_test = X.iloc[:4000], X.iloc[4000:]
y_train, y_test = y.iloc[:4000], y.iloc[4000:]

# For Prophet, use original train/test (without lag)
train_prophet = series.iloc[:4000]
test_prophet = series.iloc[4000:4000+len(y_test)]

print("Training XGBoost (Tuned)...")
model_xgb = XGBRegressor(n_estimators=300, max_depth=5, learning_rate=0.05, random_state=42)
model_xgb.fit(X_train, y_train)
pred_xgb = model_xgb.predict(X_test)

print("Training LightGBM...")
model_lgb = lgb.LGBMRegressor(n_estimators=100, max_depth=5, learning_rate=0.1, random_state=42, verbose=-1)
model_lgb.fit(X_train, y_train)
pred_lgb = model_lgb.predict(X_test)

print("Training Prophet...")
prophet_df = train_prophet.reset_index()
prophet_df.columns = ['ds', 'y']
prophet_model = Prophet(daily_seasonality=True, weekly_seasonality=False, yearly_seasonality=False)
prophet_model.fit(prophet_df)
future = prophet_model.make_future_dataframe(periods=len(test_prophet), freq='min')
forecast = prophet_model.predict(future)
y_prophet = forecast['yhat'].iloc[-len(test_prophet):].values

# Use same test set as y_test for fair comparison
y_test_aligned = y_test.values

results = {}
for name, pred in [('XGBoost', pred_xgb), ('LightGBM', pred_lgb), ('Prophet', y_prophet)]:
    mae = mean_absolute_error(y_test_aligned, pred)
    rmse = np.sqrt(mean_squared_error(y_test_aligned, pred))
    # MAPE dengan threshold untuk menghindari division by zero
    mask = y_test_aligned > 1.0  # Skip values <= 1 untuk MAPE
    mape_values = np.abs((y_test_aligned[mask] - pred[mask]) / y_test_aligned[mask]) * 100
    mape = np.mean(mape_values) if len(mape_values) > 0 else np.nan
    r2 = r2_score(y_test_aligned, pred)
    results[name] = {'MAE': mae, 'RMSE': rmse, 'MAPE': mape, 'R2': r2}

print()
print("="*80)
print("TABEL 4.9 PERBANDINGAN METRIK EVALUASI MODEL PREDIKSI")
print("="*80)
print()
print(f"{'Model':<12} {'MAE':>12} {'RMSE':>12} {'MAPE':>12} {'R2 (%)':>12} {'Ranking':>8}")
print("-"*80)

sorted_results = sorted(results.items(), key=lambda x: x[1]['MAE'])
for rank, (name, metrics) in enumerate(sorted_results, 1):
    mape_str = f"{metrics['MAPE']:.2f}%" if not np.isnan(metrics['MAPE']) else "N/A"
    print(f"{name:<12} {metrics['MAE']:>12.4f} {metrics['RMSE']:>12.4f} {mape_str:>12} {metrics['R2']*100:>11.2f}% {rank:>8}")
print("-"*80)
print()

# Save to CSV
import csv
with open('tabel_perbandingan_model.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['Model', 'MAE', 'RMSE', 'MAPE', 'R2 (%)', 'Ranking'])
    for rank, (name, metrics) in enumerate(sorted_results, 1):
        mape_str = f"{metrics['MAPE']:.2f}" if not np.isnan(metrics['MAPE']) else "N/A"
        writer.writerow([name, f"{metrics['MAE']:.4f}", f"{metrics['RMSE']:.4f}", mape_str, f"{metrics['R2']*100:.2f}", rank])
print("CSV saved: tabel_perbandingan_model.csv")

# Save values for draft
print()
print("="*80)
print("NILAI UNTUK DRAFT LAPORAN:")
print("="*80)
for rank, (name, metrics) in enumerate(sorted_results, 1):
    mape_str = f"{metrics['MAPE']:.2f}%" if not np.isnan(metrics['MAPE']) else "N/A"
    print(f"| {name:<12} | {metrics['MAE']:.4f} | {metrics['RMSE']:.4f} | {mape_str} | {metrics['R2']*100:.2f}% | {rank} |")
print("="*80)
