import pandas as pd
from sklearn.linear_model import LinearRegression
import joblib

# Sample data (later we replace with DB data)
data = {
    "month": [1, 2, 3, 4, 5, 6],
    "orders": [120, 135, 150, 165, 180, 195]
}

df = pd.DataFrame(data)

X = df[["month"]]
y = df["orders"]

model = LinearRegression()
model.fit(X, y)

# Save model
joblib.dump(model, "gashub_model.pkl")

print("Model trained and saved successfully!")