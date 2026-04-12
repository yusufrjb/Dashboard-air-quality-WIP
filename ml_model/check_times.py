import os
for line in open('.env'):
    if '=' in line:
        k,v = line.strip().split('=', 1)
        os.environ.setdefault(k, v.strip('"'))

from supabase import create_client
sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_ANON_KEY'])

# Delete old predictions
sb.table('tb_prediksi_hourly').delete().neq('id', 0).execute()
print('Old predictions deleted')

# Check current time
from datetime import datetime
print('Current time:', datetime.now().isoformat())