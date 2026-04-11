import pandas as pd
import numpy as np
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score
from xgboost import XGBClassifier
import joblib
from supabase import create_client
from datetime import datetime, timedelta

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    env_path = ".env"
    if os.path.exists(env_path):
        for line in open(env_path):
            if "=" in line and not line.startswith("#"):
                k, _, v = line.partition("=")
                os.environ[k.strip()] = v.strip().strip('"')
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

SUPABASE_URL = SUPABASE_URL.replace("http://", "https://")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

KLHK_DIR = "../klhk/"
FILES = [
    "Filedata Indeks Standar Pencemaran Udara (ISPU) Tahun 2011.csv",
    "Filedata Indeks Standar Pencemaran Udara (ISPU) Tahun 2012.csv",
    "Filedata Indeks Standar Pencemaran Udara (ISPU) Tahun 2013.csv",
    "Filedata Indeks Standar Pencemaran Udara (ISPU) Tahun 2015.csv",
    "Filedata Data Indeks Standar Pencemaran Udara DKI Jakarta Tahun 2017.csv",
    "Filedata Indeks Standar Pencemaran Udara (ISPU) Tahun 2019.csv",
    "Filedata Indeks Standar Pencemaran Udara (ISPU) Tahun 2020.csv",
    "Filedata Indeks Standar Pencemaran Udara (ISPU) Tahun 2022.csv",
]

all_dfs = []
for f in FILES:
    path = os.path.join(KLHK_DIR, f)
    if not os.path.exists(path):
        print(f"SKIP: {f}")
        continue
    all_dfs.append(pd.read_csv(path))

raw = pd.concat(all_dfs, ignore_index=True)
print(f"KLHK raw: {len(raw)} baris")

LABEL_MAP = {
    "BAIK": "Baik", "SEDANG": "Sedang", "TIDAK SEHAT": "Tidak Sehat",
    "SANGAT TIDAK SEHAT": "Sangat Tidak Sehat", "BERBAHAYA": "Berbahaya",
}

def ispi_to_conc(ispi, bp):
    if ispi <= 0: return 0
    for cl, ch, il, ih in bp:
        if ispi <= ih: return cl + (ispi - il) / (ih - il) * (ch - cl)
    return bp[-1][1]

BP_PM25 = [(0,15,0,50),(15,35,50,100),(35,55,100,200),(55,150,200,300),(150,250,300,400),(250,350,400,500)]
BP_PM10 = [(0,50,0,50),(50,150,50,100),(150,350,100,200),(350,420,200,300),(420,500,300,400),(500,600,400,500)]
BP_CO   = [(0,5000,0,50),(5000,10000,50,100),(10000,17000,100,200),(17000,34000,200,300),(34000,46000,300,400),(46000,56000,400,500)]
BP_NO2  = [(0,40,0,50),(40,80,50,100),(80,180,100,200),(180,280,200,300),(280,565,300,400),(565,665,400,500)]
BP_O3   = [(0,60,0,50),(60,120,50,100),(120,180,100,200),(180,240,200,300),(240,400,300,500)]
O3_CONV = 1.963

klhk_rows = []
for _, r in raw.iterrows():
    cat_col = "kategori" if "kategori" in raw.columns and "categori" not in raw.columns else "categori"
    if cat_col not in r or pd.isna(r.get(cat_col)): continue
    label = LABEL_MAP.get(str(r[cat_col]).strip().upper())
    if not label: continue
    pm10_ispi = pd.to_numeric(r.get("pm10", r.get("pm_10", 0)), errors="coerce")
    co_ispi   = pd.to_numeric(r.get("co", 0), errors="coerce")
    o3_ispi   = pd.to_numeric(r.get("o3", 0), errors="coerce")
    no2_ispi  = pd.to_numeric(r.get("no2", 0), errors="coerce")
    pm25_ispi = pd.to_numeric(r.get("pm_duakomalima"), errors="coerce") if pd.notna(r.get("pm_duakomalima")) else pm10_ispi * 0.7
    pm25 = ispi_to_conc(pm25_ispi if pd.notna(pm25_ispi) else 0, BP_PM25)
    pm10 = ispi_to_conc(pm10_ispi if pd.notna(pm10_ispi) else 0, BP_PM10)
    co   = ispi_to_conc(co_ispi if pd.notna(co_ispi) else 0, BP_CO)
    no2  = ispi_to_conc(no2_ispi if pd.notna(no2_ispi) else 0, BP_NO2)
    o3_ppb = ispi_to_conc(o3_ispi if pd.notna(o3_ispi) else 0, BP_O3)
    o3 = o3_ppb * O3_CONV
    if pm25 > 0 and pm10 > 0:
        klhk_rows.append({"PM2.5": pm25, "PM10": pm10, "CO": co, "NO2": no2, "O3": o3, "Label": label})

df_klhk = pd.DataFrame(klhk_rows)
print(f"KLHK clean: {len(df_klhk)} baris")

TABLE = "tb_konsentrasi_gas"
since = (datetime.utcnow() - timedelta(days=90)).isoformat()
all_data, offset = [], 0
while True:
    resp = supabase.table(TABLE) \
        .select("pm25_ugm3,pm10_ugm3,co_ugm3,no2_ugm3,o3_ugm3") \
        .gte("created_at", since).order("created_at", desc=False).range(offset, offset+999).execute()
    if not resp.data: break
    all_data.extend(resp.data)
    offset += len(resp.data)

df_sensor = pd.DataFrame(all_data)
for c in ["pm25_ugm3","pm10_ugm3","co_ugm3","no2_ugm3","o3_ugm3"]:
    df_sensor[c] = pd.to_numeric(df_sensor[c], errors="coerce")
df_sensor = df_sensor.dropna(subset=["pm25_ugm3","pm10_ugm3","o3_ugm3"])

def conc_to_ispi(val, bp):
    if val <= 0: return 0
    for cl, ch, il, ih in bp:
        if val <= ch: return il + (val - cl) / (ch - cl) * (ih - il)
    return bp[-1][3]

def ispi_to_label(ispi):
    if ispi <= 50: return "Baik"
    if ispi <= 100: return "Sedang"
    if ispi <= 200: return "Tidak Sehat"
    if ispi <= 300: return "Sangat Tidak Sehat"
    return "Berbahaya"

sensor_rows = []
for _, r in df_sensor.iterrows():
    pm25, pm10, co, no2 = r["pm25_ugm3"], r["pm10_ugm3"], r["co_ugm3"], r["no2_ugm3"]
    o3_ugm3 = r["o3_ugm3"]
    o3_ppb = o3_ugm3 / O3_CONV
    ispis = [conc_to_ispi(pm25,BP_PM25), conc_to_ispi(pm10,BP_PM10), conc_to_ispi(co,BP_CO), conc_to_ispi(no2,BP_NO2), conc_to_ispi(o3_ppb,BP_O3)]
    label = ispi_to_label(max(ispis))
    sensor_rows.append({"PM2.5": pm25, "PM10": pm10, "CO": co, "NO2": no2, "O3": o3_ugm3, "Label": label})

df_sensor_clean = pd.DataFrame(sensor_rows)
print(f"Sensor clean: {len(df_sensor_clean)} baris")

np.random.seed(42)
SYNTH = {
    "Baik": {"PM2.5": (1,14), "PM10": (5,48), "CO": (200,4800), "NO2": (1,38), "O3": (2,55*O3_CONV)},
    "Sedang": {"PM2.5": (16,34), "PM10": (51,148), "CO": (5100,9800), "NO2": (41,78), "O3": (61*O3_CONV,119*O3_CONV)},
    "Tidak Sehat": {"PM2.5": (36,54), "PM10": (151,348), "CO": (10100,16800), "NO2": (81,178), "O3": (121*O3_CONV,179*O3_CONV)},
    "Sangat Tidak Sehat": {"PM2.5": (56,149), "PM10": (351,419), "CO": (17100,33800), "NO2": (181,279), "O3": (181*O3_CONV,239*O3_CONV)},
    "Berbahaya": {"PM2.5": (151,350), "PM10": (421,550), "CO": (34100,50000), "NO2": (281,500), "O3": (241*O3_CONV,380*O3_CONV)},
}

synth_rows = []
for label, ranges in SYNTH.items():
    n = 800 if label in ("Baik", "Berbahaya", "Sangat Tidak Sehat") else 300
    for _ in range(n):
        synth_rows.append({
            "PM2.5": np.random.uniform(*ranges["PM2.5"]),
            "PM10": np.random.uniform(*ranges["PM10"]),
            "CO": np.random.uniform(*ranges["CO"]),
            "NO2": np.random.uniform(*ranges["NO2"]),
            "O3": np.random.uniform(*ranges["O3"]),
            "Label": label,
        })

df_synth = pd.DataFrame(synth_rows)
print(f"Sintetis: {len(df_synth)} baris")

df_all = pd.concat([df_klhk, df_sensor_clean, df_synth], ignore_index=True)
FEATURES = ["PM2.5", "PM10", "CO", "NO2", "O3"]
LABELS = ["Baik", "Sedang", "Tidak Sehat", "Sangat Tidak Sehat", "Berbahaya"]

X = df_all[FEATURES]
y = df_all["Label"]

le = LabelEncoder()
le.fit(LABELS)
y_enc = le.transform(y)

X_train, X_test, y_train, y_test = train_test_split(X, y_enc, test_size=0.25, random_state=42, stratify=y_enc)

print(f"\nDataset: {len(df_all)} baris | Train: {len(X_train)} | Test: {len(X_test)}")

print("\nTraining XGBoost...")
model = XGBClassifier(
    n_estimators=100,
    max_depth=6,
    learning_rate=0.1,
    random_state=42,
    eval_metric="mlogloss",
    verbosity=1
)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
y_pred_labels = le.inverse_transform(y_pred)

acc = accuracy_score(y_test, y_pred)
print(f"\nAccuracy: {acc*100:.2f}%")
print(classification_report(le.inverse_transform(y_test), y_pred_labels, target_names=LABELS))

model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "xgboost_air_quality.pkl")
joblib.dump({"model": model, "le": le, "features": FEATURES, "labels": LABELS}, model_path)
print(f"\nModel saved: {model_path}")
