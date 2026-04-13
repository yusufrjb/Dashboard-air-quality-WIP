import json
with open('forecast_comparison.ipynb', 'r') as f:
    nb = json.load(f)

# Fix Prophet slicing - use the last len(y_test) rows
for cell in nb['cells']:
    if 'source' in cell:
        for i, line in enumerate(cell['source']):
            if '.iloc[4000:].values' in line:
                cell['source'][i] = 'y_prophet = forecast["yhat"].iloc[-len(y_test):].values'

with open('forecast_comparison.ipynb', 'w') as f:
    json.dump(nb, f, indent=1)

print('Fixed Prophet slicing!')
