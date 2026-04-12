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

# Show range
r2 = sb.table('tb_prediksi_hourly').select('target_at').execute()
times = [x['target_at'] for x in r2.data]
if times:
    print(f'First: {times[0]}')
    print(f'Last: {times[-1]}')

# Show last sensor data
r3 = sb.table('tb_konsentrasi_gas').select('created_at').order('created_at', desc=True).limit(1).execute()
print(f'Last sensor: {r3.data[0]["created_at"]}')