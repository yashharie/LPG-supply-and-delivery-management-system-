import joblib

# Load trained model
model = joblib.load("gashub_model.pkl")

# Predict next month (example: month 7)
prediction = model.predict([[7]])

print("Predicted Orders:", prediction[0])