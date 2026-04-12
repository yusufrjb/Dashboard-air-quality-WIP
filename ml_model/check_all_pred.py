import os
for line in open('.env'):
    if '=' in line:
        k,v = line.strip().split('=', 1)
        os.environ.setdefault(k, v.strip('"'))
from supabase import create_client
sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_ANON_KEY'])

# Get first 3 predictions (ascending)
r = sb.table('tb_prediksi_hourly').select('target_at,pm25_pred').limit(3).execute()
print('First predictions (earliest):')
for x in r.data:
    print(f'  {x["target_at"]} -> PM25: {x["pm25_pred"]}')

# Get last 3 predictions
r2 = sb.table('tb_prediksi_hourly').select('target_at,pm25_pred').order('target_at', desc=True).limit(3).execute()
print('Last predictions (latest):')
for x in r2.data:
    print(f'  {x["target_at"]} -> PM25: {x["pm25_pred"]}')