import os
import joblib
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.linear_model import LinearRegression
from datetime import datetime

from services.feature_store import fetch_advisories_df

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "storage", "models")
MODEL_PATH = os.path.join(MODEL_DIR, "price_forecaster.joblib")

def train_from_firestore() -> dict:
    os.makedirs(MODEL_DIR, exist_ok=True)
    df = fetch_advisories_df()

    if df.empty or "market_price" not in df.columns:
        return {"trained": False, "reason": "No data / market_price missing"}

    # features: crop, region, month, temp, humidity
    X = df[["crop", "region", "month", "temp", "humidity"]].copy()
    y = df["market_price"].copy()

    # basic preprocessing
    cat_cols = ["crop", "region"]
    num_cols = ["month", "temp", "humidity"]

    pre = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols),
            ("num", "passthrough", num_cols),
        ]
    )

    model = Pipeline(steps=[
        ("pre", pre),
        ("reg", LinearRegression())
    ])

    model.fit(X, y)
    joblib.dump(model, MODEL_PATH)

    return {"trained": True, "samples": int(len(df)), "model_path": MODEL_PATH}

def predict_price(crop: str, region: str, month: int, temp: float, humidity: float) -> dict:
    if not os.path.exists(MODEL_PATH):
        return {"ok": False, "reason": "model_not_trained"}

    model = joblib.load(MODEL_PATH)
    X = pd.DataFrame([{
        "crop": (crop or "").title(),
        "region": (region or "").title(),
        "month": int(month or 1),
        "temp": float(temp or 0),
        "humidity": float(humidity or 0),
    }])

    pred = float(model.predict(X)[0])
    low, high = round(pred*0.95), round(pred*1.08)
    return {"ok": True, "expected": round(pred), "low": low, "high": high, "unit": "INR/quintal"}
