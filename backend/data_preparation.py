import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import os

# Initialize Firebase
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
cred_path = os.path.join(BASE_DIR, "serviceAccountKey.json")

if not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()

# Fetch advisories
docs = db.collection("advisories").stream()
records = [doc.to_dict() for doc in docs]

df = pd.DataFrame(records)

# Flatten nested data (weather_info, market_info)
df["temp"] = df["weather_info"].apply(lambda x: x.get("temp") if isinstance(x, dict) else None)
df["humidity"] = df["weather_info"].apply(lambda x: x.get("humidity") if isinstance(x, dict) else None)
df["market_price"] = df["market_info"].apply(lambda x: x.get("price") if isinstance(x, dict) else None)

# Drop unused columns
df = df[["crop", "soil_type", "manual_location", "temp", "humidity", "market_price", "advisory_text", "created_at"]]

# Cleaning
df["crop"] = df["crop"].astype(str).str.strip().str.lower().str.title()
df["soil_type"] = df["soil_type"].astype(str).str.strip().str.lower().str.title()
df["manual_location"] = df["manual_location"].astype(str).str.strip().str.title()

# Handle missing numeric data
df["temp"].fillna(df["temp"].mean(), inplace=True)
df["humidity"].fillna(df["humidity"].mean(), inplace=True)
df["market_price"].fillna(df["market_price"].mean(), inplace=True)

# Handle missing advisory_text safely
df["advisory_text"] = df["advisory_text"].astype(str).fillna("")

# Feature engineering
df["month"] = pd.to_datetime(df["created_at"]).dt.month
df["temperature_bucket"] = pd.cut(df["temp"], bins=[0, 20, 30, 45], labels=["Low", "Medium", "High"])
df["humidity_bucket"] = pd.cut(df["humidity"], bins=[0, 40, 70, 100], labels=["Dry", "Normal", "Humid"])
df["healthy_crop"] = df["advisory_text"].apply(lambda x: "Healthy" in x if isinstance(x, str) else False)

# Save processed data
df.to_csv("prepared_dataset.csv", index=False)
print("✅ Data preparation complete! Saved to prepared_dataset.csv")
