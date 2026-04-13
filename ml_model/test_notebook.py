"""
Script untuk test semua cell di forecast_comparison.ipynb
"""
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

print("="*80)
print("TESTING FORECAST COMPARISON NOTEBOOK")
print("="*80)

# 1. Generate data
print("\n[1] Generate data...")
np.random.seed(42)
n = 5000
dates = pd.date_range('2025-01-01', periods=n, freq='min')
base = 20
daily_pattern = 10 * np.sin(2 * np.pi * np.arange(n) / (24*60))
noise = np.random.normal(0, 5, n)
pm25 = base + daily_pattern + noise
pm25 = np.maximum(pm25, 0)
series = pd.Series(pm25, index=dates)
print(f"   Data generated: {len(series)} samples")

# 2. Split data
print("\n[2] Split data...")
train = series.iloc[:4000]
test = series.iloc[4000:]
print(f"   Train: {len(train)} samples")
print(f"   Test: {len(test)} samples")

# 3. Feature engineering
print("\n[3] Feature engineering...")
feat = pd.DataFrame({'y': series})
for lag in [1, 2, 3, 5, 10, 15, 30, 60]:
    feat[f'lag_{lag}'] = feat['y'].shift(lag)
feat['rolling_mean_5'] = feat['y'].rolling(5).mean()
feat['rolling_mean_15'] = feat['y'].rolling(15).mean()
feat = feat.dropna()
print(f"   Features created: {len(feat.columns)} columns")

X = feat[[c for c in feat.columns if c != 'y']]
y = feat['y']
X_train, X_test = X.iloc[:4000], X.iloc[4000:]
y_train, y_test = y.iloc[:4000], y.iloc[4000:]
print(f"   X_train: {X_train.shape}, X_test: {X_test.shape}")
print(f"   y_train: {y_train.shape}, y_test: {y_test.shape}")

# 4. Train XGBoost (Tuned)
print("\n[4] Train XGBoost (Tuned)...")
model_xgb = XGBRegressor(
    n_estimators=300, 
    max_depth=5, 
    learning_rate=0.05, 
    random_state=42
)
model_xgb.fit(X_train, y_train)
pred_xgb = model_xgb.predict(X_test)
print(f"   XGBoost predictions: {len(pred_xgb)} samples")

# 5. Train LightGBM
print("\n[5] Train LightGBM...")
model_lgb = lgb.LGBMRegressor(
    n_estimators=100,
    max_depth=5,
    learning_rate=0.1,
    random_state=42,
    verbose=-1
)
model_lgb.fit(X_train, y_train)
pred_lgb = model_lgb.predict(X_test)
print(f"   LightGBM predictions: {len(pred_lgb)} samples")

# 6. Train Prophet
print("\n[6] Train Prophet...")
prophet_df = train.reset_index()
prophet_df.columns = ['ds', 'y']
prophet_model = Prophet(
    daily_seasonality=True, 
    weekly_seasonality=False, 
    yearly_seasonality=False
)
prophet_model.fit(prophet_df)
future = prophet_model.make_future_dataframe(periods=len(y_test), freq='min')
forecast = prophet_model.predict(future)
y_prophet = forecast['yhat'].iloc[-len(y_test):].values
print(f"   Prophet predictions: {len(y_prophet)} samples")

# 7. Calculate metrics
print("\n[7] Calculate metrics...")
def calc_metrics(y_true, y_pred):
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    # MAPE with threshold
    mask = y_true.values > 1.0
    mape = np.mean(np.abs((y_true.values[mask] - y_pred[mask]) / y_true.values[mask])) * 100 if mask.sum() > 0 else np.nan
    r2 = r2_score(y_true, y_pred)
    return mae, rmse, mape, r2

xgb_mae, xgb_rmse, xgb_mape, xgb_r2 = calc_metrics(y_test, pred_xgb)
lgb_mae, lgb_rmse, lgb_mape, lgb_r2 = calc_metrics(y_test, pred_lgb)
prophet_mae, prophet_rmse, prophet_mape, prophet_r2 = calc_metrics(y_test, y_prophet)

print(f"   XGBoost - MAE: {xgb_mae:.4f}, RMSE: {xgb_rmse:.4f}, MAPE: {xgb_mape:.2f}%, R2: {xgb_r2*100:.2f}%")
print(f"   LightGBM - MAE: {lgb_mae:.4f}, RMSE: {lgb_rmse:.4f}, MAPE: {lgb_mape:.2f}%, R2: {lgb_r2*100:.2f}%")
print(f"   Prophet - MAE: {prophet_mae:.4f}, RMSE: {prophet_rmse:.4f}, MAPE: {prophet_mape:.2f}%, R2: {prophet_r2*100:.2f}%")

# 8. Create visualization
print("\n[8] Create visualization...")
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# Bar chart
results = [('XGBoost', xgb_mae), ('LightGBM', lgb_mae), ('Prophet', prophet_mae)]
results.sort(key=lambda x: x[1])
colors = ['#10b981', '#f59e0b', '#6366f1']
axes[0].bar([r[0] for r in results], [r[1] for r in results], color=colors)
axes[0].set_title('Perbandingan MAE Model Forecasting')
axes[0].set_ylabel('MAE')

# Line chart
sample_size = 300
axes[1].plot(y_test.iloc[:sample_size].values, label='Actual', color='black', linewidth=2)
axes[1].plot(pred_xgb[:sample_size], label='XGBoost', color='#10b981')
axes[1].plot(pred_lgb[:sample_size], label='LightGBM', color='#f59e0b', linestyle='--')
axes[1].plot(y_prophet[:sample_size], label='Prophet', color='#6366f1', linestyle=':')
axes[1].set_title('Prediksi vs Actual')
axes[1].legend()

plt.tight_layout()
plt.savefig('perbandingan_model_forecasting.png', dpi=300)
print("   Saved: perbandingan_model_forecasting.png")

# 9. Save CSV
print("\n[9] Save CSV...")
summary_df = pd.DataFrame({
    'Model': ['XGBoost', 'LightGBM', 'Prophet'],
    'MAE': [xgb_mae, lgb_mae, prophet_mae],
    'RMSE': [xgb_rmse, lgb_rmse, prophet_rmse],
    'MAPE': [xgb_mape, lgb_mape, prophet_mape],
    'R2': [xgb_r2*100, lgb_r2*100, prophet_r2*100]
})
summary_df = summary_df.sort_values('MAE')
summary_df['Ranking'] = range(1, 4)
summary_df.to_csv('tabel_perbandingan_model.csv', index=False)
print("   Saved: tabel_perbandingan_model.csv")

# 10. Print final table
print("\n" + "="*80)
print("TABEL 4.9 PERBANDINGAN METRIK EVALUASI MODEL PREDIKSI")
print("="*80)
print(f"{'Model':<12} {'MAE':>12} {'RMSE':>12} {'MAPE':>12} {'R2 (%)':>12} {'Ranking':>8}")
print("-"*80)
for _, row in summary_df.iterrows():
    mape_str = f"{row['MAPE']:.2f}%" if not np.isnan(row['MAPE']) else "N/A"
    print(f"{row['Model']:<12} {row['MAE']:>12.4f} {row['RMSE']:>12.4f} {mape_str:>12} {row['R2']:>11.2f}% {int(row['Ranking']):>8}")
print("-"*80)

print("\n" + "="*80)
print("SEMUA TEST BERHASIL!")
print("="*80)
