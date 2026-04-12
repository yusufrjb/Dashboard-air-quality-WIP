import os
for line in open('.env'):
    if '=' in line:
        k,v = line.strip().split('=', 1)
        os.environ.setdefault(k, v.strip('"'))
from supabase import create_client
sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_ANON_KEY'])

# Delete all predictions
sb.table('tb_prediksi_hourly').delete().neq('id', 0).execute()
print('Deleted all predictions')
print('Ready for fresh predictions')