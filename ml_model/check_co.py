from supabase import create_client
import os

for k,v in [line.split('=') for line in open('.env') if '=' in line]:
    os.environ.setdefault(k, v.strip('"'))

sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_ANON_KEY'])

# Check raw CO in database
r1 = sb.table('tb_konsentrasi_gas').select('co_ugm3').order('created_at', ascending=False).limit(3).execute()
print("=== Raw CO from tb_konsentrasi_gas ===")
print(r1.data)

# Check predicted CO
r2 = sb.table('tb_prediksi_hourly').select('co_pred').order('target_at', ascending=False).limit(3).execute()
print("\n=== CO prediksi dari tb_prediksi_hourly ===")
print(r2.data)

if r1.data:
    co_val = r1.data[0]['co_ugm3']
    print(f"\n=> CO: {co_val} ppb = {co_val/1.163:.2f} ug/m3")