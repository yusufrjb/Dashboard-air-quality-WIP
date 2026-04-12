import os
import sys
sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
load_dotenv('.env')
from supabase import create_client

sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_ANON_KEY'])

# Get all columns in tb_prediksi_hourly
r = sb.table('tb_prediksi_hourly').select('*').limit(1).execute()
if r.data:
    print('Columns:', list(r.data[0].keys()))
    print('Sample:', r.data[0])
else:
    print('No data')

# Count predictions per forecast_at
r2 = sb.table('tb_prediksi_hourly').select('forecast_at').execute()
from collections import Counter
counts = Counter([x['forecast_at'] for x in r2.data])
print('\nPredictions per batch:')
for ft, cnt in counts.most_common(3):
    print(f'  {ft[:19]}: {cnt} predictions')