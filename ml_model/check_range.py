import os
for line in open('.env'):
    if '=' in line:
        k,v = line.strip().split('=', 1)
        os.environ.setdefault(k, v.strip('"'))
from supabase import create_client
sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_ANON_KEY'])

# Count predictions
r = sb.table('tb_prediksi_hourly').select('id', count='exact').execute()
print(f'Total predictions: {r.count}')

# Get all predictions sorted
r2 = sb.table('tb_prediksi_hourly').select('target_at').execute()
times = [x['target_at'] for x in r2.data]
print(f'Range: {times[0]} to {times[-1]}')
print(f'Count: {len(times)}')