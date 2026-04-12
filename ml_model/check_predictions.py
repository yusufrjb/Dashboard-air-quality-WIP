import os
for line in open('.env'):
    if '=' in line:
        k,v = line.strip().split('=', 1)
        os.environ.setdefault(k, v.strip('"'))

from supabase import create_client
from datetime import datetime

sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_ANON_KEY'])

# Check predictions
r = sb.table('tb_prediksi_hourly').select('target_at,pm25_pred').order('target_at', desc=True).limit(3).execute()
print('Latest predictions:')
for x in r.data:
    print(f"  {x['target_at']} -> PM25: {x['pm25_pred']}")

# Current time
print(f"\nCurrent UTC: {datetime.now().isoformat()}")