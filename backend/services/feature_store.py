import pandas as pd
#from . import feature_utils  # optional (not used yet)

from firebase_client import db

def fetch_advisories_df() -> pd.DataFrame:
    docs = db.collection("advisories").stream()
    rows = [d.to_dict() for d in docs]
    if not rows:
        return pd.DataFrame([])

    df = pd.DataFrame(rows)

    # flatten nested dicts safely
    def _get(d, key):
        return d.get(key) if isinstance(d, dict) else None

    df["temp"] = df["weather_info"].apply(lambda x: _get(x, "temp"))
    df["humidity"] = df["weather_info"].apply(lambda x: _get(x, "humidity"))
    df["market_price"] = df["market_info"].apply(lambda x: _get(x, "price"))
    df["region"] = df["market_info"].apply(lambda x: _get(x, "region"))

    keep = ["crop", "soil_type", "manual_location", "temp", "humidity",
            "market_price", "region", "advisory_text", "created_at"]
    df = df[[c for c in keep if c in df.columns]]

    # basic cleaning
    for col in ["crop", "soil_type", "manual_location", "region", "advisory_text"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip().str.lower().str.title()

    # numeric fills
    for col in ["temp", "humidity", "market_price"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
            if df[col].notna().any():
                df[col] = df[col].fillna(df[col].mean())
            else:
                df[col] = 0.0

    # dates
    if "created_at" in df.columns:
        df["created_at"] = pd.to_datetime(df["created_at"], errors="coerce")
        df["month"] = df["created_at"].dt.month.fillna(1).astype(int)
    else:
        df["month"] = 1

    return df
