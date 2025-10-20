import os, uuid, json, requests, math
from datetime import datetime
from fastapi import FastAPI, File, UploadFile, Form, Request
from fastapi.responses import JSONResponse
from dateutil.relativedelta import relativedelta

# ---------------- Firestore + Firebase Setup ----------------
import firebase_admin
from firebase_admin import credentials, firestore
import os, firebase_admin
from firebase_admin import credentials, firestore


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "storage", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

#cred_path = os.path.join(BASE_DIR, "serviceAccountKey.json")

if not firebase_admin._apps:
    cred = credentials.Certificate(os.environ["GOOGLE_APPLICATION_CREDENTIALS"])
    firebase_admin.initialize_app(cred)


firestore_db = firestore.client()

# ---------------- Weather API ----------------
OPENWEATHER_KEY = "858476f27c2e5cc5d4cfa26a3c3e85b6"  # Replace with your key

# ---------------- Import Services (AI + ML + Optimizer) ----------------
from services.feature_store import fetch_advisories_df
from models.price_forecaster import train_from_firestore, predict_price
from optimizer.plan_optimizer import classical_optimize  # swap to quantum later

# ---------------- FastAPI App Setup ----------------
app = FastAPI(title="Q.Farm Prototype – Firestore + AI/ML Integrated")

@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

# ---------------- Helper Functions ----------------
def save_upload(file: UploadFile) -> str:
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    file_id = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR, file_id)
    with open(path, "wb") as f:
        f.write(file.file.read())
    return path

def fetch_weather(lat, lon):
    try:
        if not lat or not lon:
            raise ValueError("Missing coordinates")
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_KEY}&units=metric"
        r = requests.get(url)
        data = r.json()
        if "main" in data and "weather" in data:
            return {
                "temp": data["main"].get("temp"),
                "humidity": data["main"].get("humidity"),
                "description": data["weather"][0]["description"].title(),
            }
        else:
            msg = data.get("message", "Unknown response")
            return {"temp": None, "humidity": None, "description": msg}
    except Exception as e:
        print("❌ Weather API error:", e)
        return {"temp": None, "humidity": None, "description": "Unavailable"}

# 💰 Simulated Market Price API
def fetch_market_price(crop: str, region: str = "Chennai"):
    price_data = {
        "wheat": {"Chennai": 2150, "Coimbatore": 2200, "Madurai": 2100},
        "rice": {"Chennai": 2000, "Coimbatore": 2050, "Madurai": 1980},
        "maize": {"Chennai": 1850, "Coimbatore": 1900, "Madurai": 1870},
        "sugarcane": {"Chennai": 3200, "Coimbatore": 3300, "Madurai": 3100},
    }
    crop = crop.lower()
    if crop in price_data:
        region_prices = price_data[crop]
        if region in region_prices:
            return {"region": region, "price": region_prices[region], "currency": "INR/quintal"}
        else:
            return {"region": "Chennai", "price": region_prices["Chennai"], "currency": "INR/quintal"}
    else:
        return {"region": region, "price": None, "currency": "N/A"}

def mock_ml(image_path: str):
    name = os.path.basename(image_path).lower()
    if "aphid" in name:
        return {"label": "Aphid infestation", "confidence": 0.92}
    if "blight" in name:
        return {"label": "Blight disease", "confidence": 0.89}
    return {"label": "Healthy crop", "confidence": 0.80}

def compose_advisory(crop, soil, ml_result):
    base = f"For {crop} crop on {soil} soil, analysis shows {ml_result['label']}."
    suggestion = " Apply neem-based spray." if "Aphid" in ml_result["label"] else \
                 " Maintain regular irrigation." if "Healthy" in ml_result["label"] else \
                 " Consult local agri officer."
    return base + suggestion

# ---------------- 1️⃣ Advisory Creation (Phase 1) ----------------
@app.post("/api/advisory/request")
async def create_advisory(
    farmer_name: str = Form(...),
    crop: str = Form(...),
    soil_type: str = Form(...),
    land_area: float = Form(...),
    latitude: str = Form(""),
    longitude: str = Form(""),
    manual_location: str = Form(""),
    image: UploadFile = File(...),
):
    image_path = save_upload(image)
    ml_result = mock_ml(image_path)

    # 🌦 Weather Info
    weather_info = {}
    if manual_location:
        try:
            url = f"https://api.openweathermap.org/data/2.5/weather?q={manual_location}&appid={OPENWEATHER_KEY}&units=metric"
            r = requests.get(url)
            data = r.json()
            if "main" in data and "weather" in data:
                weather_info = {
                    "temp": data["main"]["temp"],
                    "humidity": data["main"]["humidity"],
                    "description": data["weather"][0]["description"].title(),
                }
            else:
                weather_info = {"description": "Unavailable", "temp": None, "humidity": None}
        except Exception as e:
            print("Weather API (manual) error:", e)
    elif latitude and longitude:
        weather_info = fetch_weather(latitude, longitude)

    # 💰 Market data
    market_info = fetch_market_price(crop, manual_location or "Chennai")
    advisory_text = compose_advisory(crop, soil_type, ml_result)

    record = {
        "id": uuid.uuid4().hex,
        "farmer_name": farmer_name,
        "crop": crop,
        "soil_type": soil_type,
        "land_area": land_area,
        "latitude": latitude,
        "longitude": longitude,
        "manual_location": manual_location,
        "weather_info": weather_info,
        "market_info": market_info,
        "advisory_text": advisory_text,
        "created_at": datetime.utcnow().isoformat(),
    }

    firestore_db.collection("advisories").add(record)
    return JSONResponse(record)

# ---------------- 2️⃣ View All Advisories ----------------
@app.get("/api/advisory/all")
def get_all_advisories():
    docs = firestore_db.collection("advisories").stream()
    result = [doc.to_dict() for doc in docs]
    return JSONResponse(result)

# ---------------- 3️⃣ Train ML Model (Step 5a) ----------------
@app.post("/api/models/price/train")
def train_price_model():
    result = train_from_firestore()
    return JSONResponse(result)

# ---------------- 4️⃣ Generate AI + ML + Quantum Plan (Step 5b) ----------------
def parse_date(s):
    try:
        return datetime.fromisoformat(s) if s else datetime.utcnow()
    except Exception:
        return datetime.utcnow()

def crop_duration_days(crop: str) -> int:
    c = (crop or "").lower()
    if "rice" in c: return 165
    if "wheat" in c: return 120
    if "maize" in c: return 110
    return 150

def weekly_weather_risk(lat: float, lon: float, weeks: int):
    return [{"week": i+1, "rain_risk": "Med", "heat_risk": "Low", "humidity_risk": "Med"} for i in range(weeks)]

def soil_summary_from_image(img_path: str):
    if not img_path:
        return {"moisture": "unknown", "notes": "No image"}
    name = os.path.basename(img_path).lower()
    if "dry" in name: return {"moisture": "low", "notes": "Add compost/green manure"}
    if "wet" in name: return {"moisture": "high", "notes": "Improve drainage; avoid waterlogging"}
    return {"moisture": "moderate", "notes": "Maintain mulch; add organic matter"}

@app.post("/api/plan/generate")
async def generate_plan(
    farmer_name: str = Form(...),
    crop: str = Form(...),
    area_acres: float = Form(...),
    start_date: str = Form(""),
    latitude: str = Form(""),
    longitude: str = Form(""),
    manual_location: str = Form(""),
    budget: float = Form(None),
    water_limit: float = Form(None),
    soil_image: UploadFile = File(None),
):
    start_dt = parse_date(start_date)
    duration = crop_duration_days(crop)
    harvest_dt = start_dt + relativedelta(days=duration)
    weeks = math.ceil(duration / 7)
    soil_img_path = save_upload(soil_image) if soil_image else None

    # Weather Snapshot
    weather_now = {}
    if manual_location:
        try:
            url = f"https://api.openweathermap.org/data/2.5/weather?q={manual_location}&appid={OPENWEATHER_KEY}&units=metric"
            weather_now = requests.get(url).json()
        except Exception:
            weather_now = {}
    elif latitude and longitude:
        try:
            url = f"https://api.openweathermap.org/data/2.5/weather?lat={latitude}&lon={longitude}&appid={OPENWEATHER_KEY}&units=metric"
            weather_now = requests.get(url).json()
        except Exception:
            weather_now = {}

    # ML Price Prediction
    region = manual_location or "Chennai"
    temp = weather_now.get("main", {}).get("temp", 0)
    humidity = weather_now.get("main", {}).get("humidity", 0)
    price_ml = predict_price(crop, region, harvest_dt.month, temp, humidity)

    if price_ml.get("ok"):
        price_fc = {k: price_ml[k] for k in ["expected", "low", "high"]}
        price_fc["unit"] = price_ml["unit"]
    else:
        base = fetch_market_price(crop, region).get("price") or 2000
        price_fc = {"expected": base, "low": round(base*0.95), "high": round(base*1.08), "unit": "INR/quintal"}

    soil_sum = soil_summary_from_image(soil_img_path)
    risk = weekly_weather_risk(float(latitude or 0), float(longitude or 0), weeks)

    # Default Operations Plan
    ops = []
    for w in range(1, weeks+1):
        if w == 1: ops.append({"week": w, "task": "Land prep + basal NPK"})
        elif w == 2: ops.append({"week": w, "task": "Sowing/Transplant + light irrigation"})
        elif w in [4,8,12]: ops.append({"week": w, "task": "Top-dress Urea + weed control"})
        elif w in [6,10]: ops.append({"week": w, "task": "Pest scouting; neem spray if needed"})
        else: ops.append({"week": w, "task": "Irrigation based on soil moisture"})

    opt = classical_optimize(area_acres, budget, water_limit, weeks)

    plan = {
        "farmer_name": farmer_name,
        "crop": crop,
        "area_acres": area_acres,
        "location": {"city": manual_location or "", "lat": latitude, "lon": longitude},
        "start_date": start_dt.date().isoformat(),
        "harvest_date": harvest_dt.date().isoformat(),
        "weather_now": weather_now,
        "weather_risk": risk,
        "price_forecast": price_fc,
        "soil_summary": soil_sum,
        "operations_schedule": ops,
        "optimization": opt,
        "created_at": datetime.utcnow().isoformat(),
    }

    firestore_db.collection("plans").add(plan)
    return JSONResponse(plan)

# ---------------- Root ----------------
@app.get("/")
def root():
    return {"message": "Q.Farm Backend Running with Firestore + AI/ML Integration ✅"}
