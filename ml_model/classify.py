"""
classify.py — ML inference untuk klasifikasi kualitas udara.
Mendukung Random Forest dan XGBoost.
Dipanggil via command line:
    python classify.py <pm25> <pm10> <co> <no2> <o3> [--model xgboost|rf]
Output: JSON ke stdout
"""

import sys
import json
import os
import numpy as np
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

FEATURES = ["PM2.5", "PM10", "CO", "NO2", "O3"]

CATEGORIES = [
    {"min": 0, "max": 50, "label": "Baik", "color": "#10b981"},
    {"min": 51, "max": 100, "label": "Sedang", "color": "#3b82f6"},
    {"min": 101, "max": 200, "label": "Tidak Sehat", "color": "#f59e0b"},
    {"min": 201, "max": 300, "label": "Sangat Tidak Sehat", "color": "#ef4444"},
    {"min": 301, "max": 500, "label": "Berbahaya", "color": "#7c3aed"},
]

MODELS = {
    "rf": "random_forest_air_quality.pkl",
    "xgboost": "xgboost_air_quality.pkl",
}


def to_ispi(val, bp):
    if val <= 0:
        return 0
    for cl, ch, il, ih in bp:
        if val <= ch:
            return il + (val - cl) / (ch - cl) * (ih - il)
    return bp[-1][3]


def get_category(ispu):
    for c in CATEGORIES:
        if ispu >= c["min"] and ispu <= c["max"]:
            return c
    return CATEGORIES[-1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pm25", type=float)
    parser.add_argument("pm10", type=float)
    parser.add_argument("co", type=float)
    parser.add_argument("no2", type=float)
    parser.add_argument("o3", type=float)
    parser.add_argument("--model", "-m", default="xgboost",
                        choices=["rf", "xgboost"],
                        help="Model: rf (Random Forest) atau xgboost (default: xgboost)")
    args = parser.parse_args()

    pm25, pm10, co, no2, o3 = args.pm25, args.pm10, args.co, args.no2, args.o3
    model_name = "XGBoost" if args.model == "xgboost" else "Random Forest"

    pkl_file = MODELS[args.model]
    pkl_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), pkl_file)

    if not os.path.exists(pkl_path):
        print(json.dumps({"error": f"Model not found: {pkl_file}"}))
        sys.exit(1)

    import joblib
    import pandas as pd

    data = joblib.load(pkl_path)

    if args.model == "xgboost":
        model = data["model"]
        le = data["le"]
    else:
        model = data

    X = pd.DataFrame([{"PM2.5": pm25, "PM10": pm10, "CO": co, "NO2": no2, "O3": o3}])

    if args.model == "xgboost":
        pred_enc = model.predict(X)[0]
        category = le.inverse_transform([pred_enc])[0]
        proba = model.predict_proba(X)[0]
        probabilities = {le.classes_[i]: round(float(proba[i]), 4) for i in range(len(le.classes_))}
    else:
        category = model.predict(X)[0]
        proba = model.predict_proba(X)[0]
        probabilities = {}
        for i, cls in enumerate(model.classes_):
            probabilities[cls] = round(float(proba[i]), 4)

    confidence = float(np.max(proba))

    BP_PM25 = [(0,15,0,50),(15,35,50,100),(35,55,100,200),(55,150,200,300),(150,250,300,400),(250,350,400,500)]
    BP_PM10 = [(0,50,0,50),(50,150,50,100),(150,350,100,200),(350,420,200,300),(420,500,300,400),(500,600,400,500)]
    BP_CO   = [(0,5000,0,50),(5000,10000,50,100),(10000,17000,100,200),(17000,34000,200,300),(34000,46000,300,400),(46000,56000,400,500)]
    BP_NO2  = [(0,40,0,50),(40,80,50,100),(80,180,100,200),(180,280,200,300),(280,565,300,400),(565,665,400,500)]
    BP_O3   = [(0,60,0,50),(60,120,50,100),(120,180,100,200),(180,240,200,300),(240,400,300,500)]

    sub_ispu = {
        "pm25": round(to_ispi(pm25, BP_PM25), 1),
        "pm10": round(to_ispi(pm10, BP_PM10), 1),
        "co": round(to_ispi(co, BP_CO), 1),
        "no2": round(to_ispi(no2, BP_NO2), 1),
        "o3": round(to_ispi(o3 / 1.963, BP_O3), 1),
    }

    dominant_entry = max(sub_ispu.items(), key=lambda x: x[1])
    ispu = round(max(sub_ispu.values()), 1)
    cat_info = get_category(ispu)

    result = {
        "category": category,
        "ispu": ispu,
        "color": cat_info["color"],
        "confidence": round(confidence, 4),
        "dominant": dominant_entry[0],
        "subIspu": sub_ispu,
        "probabilities": probabilities,
        "features": {"pm25": pm25, "pm10": pm10, "co": co, "no2": no2, "o3": o3},
        "method": model_name,
    }

    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
