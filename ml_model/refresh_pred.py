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

# Run new prediction
import sys
sys.path.insert(0, '.')
from predict_time_series import get_results
result = get_results()
print('New predictions generated')
print('Method:', result.get('method'))