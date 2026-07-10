import pandas as pd
from sklearn.linear_model import LinearRegression
import joblib

# SAMPLE DATA (we will replace with your DB later)
data = {
    "month": [1, 2, 3, 4, 5, 6],
    "orders": [120, 135, 150, 165, 180, 195]
}

df = pd.DataFrame(data)

# X = input (month)
X = df[["month"]]

# Y = output (orders)
y = df["orders"]

# Create model
model = LinearRegression()

# Train model
model.fit(X, y)

# Predict next month (7)
prediction = model.predict([[7]])

print("Predicted Orders for Month 7:", prediction[0])

# Save model
joblib.dump(model, "gashub_model.pkl")

print("Model saved successfully!")