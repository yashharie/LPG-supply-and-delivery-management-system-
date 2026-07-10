from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression

app = Flask(__name__)
CORS(app)


def train_and_predict(monthly_rows, value_key='total_orders'):
    """
    Trains a linear regression on real monthly data and returns the next prediction.

    Rules:
    - If 0 rows  → return 0
    - If 1 row   → return that same value (flat — no fake growth)
    - If 2+ rows → fit linear regression on real data only, predict next month

    monthly_rows: list of dicts with 'month', 'year', value_key
    Returns: (predicted_value, trend_string)
    """
    if not monthly_rows:
        return 0, "flat"

    # Sort by year then month and assign sequential time index t=1,2,3...
    df = pd.DataFrame(monthly_rows)
    df = df.sort_values(['year', 'month']).reset_index(drop=True)
    df['t'] = range(1, len(df) + 1)
    df['val'] = df[value_key].astype(float)

    if len(df) == 1:
        # Only one real data point — predict the same value (flat)
        return int(df['val'].iloc[0]), "flat"

    # 2+ real points — fit linear regression
    X = df['t'].values.reshape(-1, 1)
    y = df['val'].values

    model = LinearRegression()
    model.fit(X, y)

    next_t    = int(df['t'].max()) + 1
    predicted = float(model.predict([[next_t]])[0])
    predicted = max(0, predicted)

    # Trend: compare slope sign
    trend = "up" if model.coef_[0] >= 0 else "down"

    return round(predicted), trend


@app.route('/predict-bulk', methods=['POST'])
def predict_bulk():
    """
    Demand prediction — monthly order counts.
    Expects: { "data": [{"month": 6, "year": 2026, "total_orders": 9}, ...] }
    """
    try:
        payload = request.get_json()
        if not payload or 'data' not in payload:
            return jsonify({"error": "Missing 'data' key"}), 400

        real_rows = payload['data']
        if not real_rows:
            return jsonify({"error": "No data provided"}), 400

        predicted, trend = train_and_predict(real_rows, value_key='total_orders')

        # Next month label
        last  = sorted(real_rows, key=lambda r: (r['year'], r['month']))[-1]
        next_month = (last['month'] % 12) + 1
        next_year  = last['year'] + (1 if last['month'] == 12 else 0)

        return jsonify({
            "status":           True,
            "next_month":       next_month,
            "next_year":        next_year,
            "predicted_orders": predicted,
            "trend":            trend,
            "data_points":      len(real_rows),
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/predict-stock', methods=['POST'])
def predict_stock():
    """
    Per-warehouse stock need prediction.
    Expects: {
      "warehouses": [
        { "id": 1, "name": "...", "current_stock": 450,
          "monthly_out": [{"month": 6, "year": 2026, "qty": 120}, ...] }
      ]
    }
    """
    try:
        payload = request.get_json()
        if not payload or 'warehouses' not in payload:
            return jsonify({"error": "Missing 'warehouses' key"}), 400

        results = []

        for wh in payload['warehouses']:
            monthly_out   = wh.get('monthly_out', [])
            current_stock = int(wh.get('current_stock', 0))

            if not monthly_out:
                predicted_need, trend = 0, "flat"
            else:
                # Rename qty → total_orders for reuse
                rows = [
                    {'month': r['month'], 'year': r['year'], 'total_orders': r['qty']}
                    for r in monthly_out
                ]
                predicted_need, trend = train_and_predict(rows, value_key='total_orders')

            shortage      = max(0, predicted_need - current_stock)
            restock_alert = shortage > 0

            results.append({
                "id":             wh['id'],
                "name":           wh['name'],
                "current_stock":  current_stock,
                "predicted_need": predicted_need,
                "shortage":       shortage,
                "restock_alert":  restock_alert,
                "trend":          trend,
            })

        return jsonify({"status": True, "predictions": results})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})


if __name__ == '__main__':
    app.run(port=5001, debug=True)
