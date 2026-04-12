from supabase import create_client
import os

for line in open('.env'):
    if '=' in line:
        k,v = line.split('=', 1)
        os.environ.setdefault(k, v.strip('"'))

sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_ANON_KEY'])

# Get historical data
thirtyMinAgo = "2026-04-12T09:45:00"
hist = sb.table('tb_konsentrasi_gas').select('pm25_ugm3,created_at').gte('created_at', thirtyMinAgo).order('created_at', ascending=True).limit(10).execute()
print("=== HISTORICAL DATA ===")
for r in hist.data:
    print(f"  {r['created_at']}: PM25={r['pm25_ugm3']}")

# Get predictions
pred = sb.table('tb_prediksi_hourly').select('pm25_pred,target_at').order('target_at', ascending=True).limit(10).execute()
print("\n=== PREDICTIONS ===")
for r in pred.data:
    print(f"  {r['target_at']}: PM25={r['pm25_pred']}")