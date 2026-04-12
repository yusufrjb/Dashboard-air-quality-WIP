from supabase import create_client
import os

# Load env
for k,v in [line.split('=') for line in open('.env') if '=' in line]:
    os.environ.setdefault(k, v.strip('"'))

sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_ANON_KEY'])

# Delete old predictions
sb.table('tb_prediksi_hourly').delete().neq('id', 0).execute()
print("Old predictions deleted")

# Run new prediction
import sys
sys.path.insert(0, '.')
from predict_time_series import get_results
result = get_results()
print("New predictions generated:", result.get('method'))