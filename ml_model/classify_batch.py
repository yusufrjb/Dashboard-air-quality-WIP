"""
classify_batch.py - Batch classification using Random Forest
Takes 60 predictions and returns classifications for all at once.
Input: JSON with pm25, pm10, co arrays
Output: JSON with category array
"""

import sys
import json
import os
import numpy as np
import pandas as pd
from pathlib import Path

# Import from classify.py
CURRENT_DIR = Path(__file__).parent
sys.path.insert(0, str(CURRENT_DIR))

# Load Random Forest model
MODEL_FILE = CURRENT_DIR / "random_forest_air_quality.pkl"

# Categories
CAT_COLORS = {
    "Baik": "#10b981",
    "Sedang": "#3b82f6",
    "Tidak Sehat": "#f59e0b",
    "Sangat Tidak Sehat": "#ef4444",
    "Berbahaya": "#7c3aed",
}

BP_PM25 = [(0,15,0,50),(15,35,50,100),(35,55,100,200),(55,150,200,300),(150,250,300,400),(250,350,400,500)]
BP_PM10 = [(0,50,0,50),(50,150,50,100),(150,350,100,200),(350,420,200,300),(420,500,300,400),(500,600,400,500)]
BP_CO   = [(0,5000,0,50),(5000,10000,50,100),(10000,17000,100,200),(17000,34000,200,300),(34000,46000,300,400),(46000,56000,400,500)]

def to_ispi(val, bp):
    if val <= 0:
        return 0
    for cl, ch, il, ih in bp:
        if val <= ch:
            return il + (val - cl) / (ch - cl) * (ih - il)
    return bp[-1][3]

def get_dominant(pm25, pm10, co):
    # Dominant hanya dari PM2.5, PM10, CO - bukan NO2/O3 yang tidak diprediksi
    ispis = {
        "PM2.5": to_ispi(pm25, BP_PM25),
        "PM10": to_ispi(pm10, BP_PM10),
        "CO": to_ispi(co, BP_CO),
    }
    return max(ispis, key=ispis.get)

def main():
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
        pm25_list = input_data.get('pm25', [])
        pm10_list = input_data.get('pm10', [])
        co_list = input_data.get('co', [])
        
        # NO2 and O3 from latest sensor reading (for RF model features)
        no2 = input_data.get('no2', 50)
        o3 = input_data.get('o3', 40)
        
        if len(pm25_list) == 0:
            print(json.dumps({"error": "No data provided"}))
            sys.exit(1)
        
        # Load RF model
        import joblib
        model = joblib.load(MODEL_FILE)
        
        # Create DataFrame for batch prediction
        df = pd.DataFrame({
            "PM2.5": pm25_list,
            "PM10": pm10_list,
            "CO": co_list,
            "NO2": [no2] * len(pm25_list),
            "O3": [o3] * len(pm25_list),
        })
        
        # Batch predict
        categories = model.predict(df)
        proba = model.predict_proba(df)
        
        # Build results
        results = []
        for i, (pm25, pm10, co, cat, prob) in enumerate(zip(pm25_list, pm10_list, co_list, categories, proba)):
            ispu = max(
                to_ispi(pm25, BP_PM25),
                to_ispi(pm10, BP_PM10),
                to_ispi(co, BP_CO),
            )
            
            # Get probabilities for all classes
            class_probs = {}
            for j, cls_name in enumerate(model.classes_):
                class_probs[cls_name] = float(prob[j])
            
            dominant = get_dominant(pm25, pm10, co)
            confidence = float(np.max(prob))
            
            results.append({
                "index": i,
                "category": str(cat),
                "ispu": round(ispu, 1),
                "dominant": dominant,
                "color": CAT_COLORS.get(str(cat), "#94a3b8"),
                "confidence": round(confidence, 4),
                "probabilities": class_probs,
            })
        
        print(json.dumps({"success": True, "results": results}))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
