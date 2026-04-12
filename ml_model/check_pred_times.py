import os
for line in open('.env'):
    if '=' in line:
        k,v = line.strip().split('=', 1)
        os.environ.setdefault(k, v.strip('"'))
from supabase import create_client
sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_ANON_KEY'])
r = sb.table('tb_prediksi_hourly').select('target_at').order('target_at', desc=True).limit(5).execute()
print('Latest predictions:')
for x in r.data:
    print(' ', x['target_at'])

r2 = sb.table('tb_prediksi_hourly').select('target_at').order('target_at', asc=True).limit(3).execute()
print('First predictions:')
for x in r2.data:
    print(' ', x['target_at'])