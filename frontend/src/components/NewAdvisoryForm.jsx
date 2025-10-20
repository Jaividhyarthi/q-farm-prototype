import React, { useState, useEffect } from "react";

const NewAdvisoryForm = () => {
  const [farmerName, setFarmerName] = useState("");
  const [crop, setCrop] = useState("");
  const [soilType, setSoilType] = useState("");
  const [landArea, setLandArea] = useState("");
  const [image, setImage] = useState(null);
  const [advisory, setAdvisory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState({ lat: null, lon: null });
  const [manualLocation, setManualLocation] = useState("");

  // Detect browser location (optional)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude.toFixed(4),
            lon: pos.coords.longitude.toFixed(4),
          });
        },
        (err) => console.warn("Location access denied:", err)
      );
    }
  }, []);

  const backendURL = "https://psychic-memory-wr7g94jxx7gr25g75-8000.app.github.dev/api/advisory/request";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append("farmer_name", farmerName);
    formData.append("crop", crop);
    formData.append("soil_type", soilType);
    formData.append("land_area", landArea);
    formData.append("image", image);
    formData.append("latitude", location.lat || "");
    formData.append("longitude", location.lon || "");
    formData.append("manual_location", manualLocation || "");

    try {
      const res = await fetch(backendURL, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setAdvisory(data);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "520px", margin: "40px auto", fontFamily: "sans-serif" }}>
      <h2>🌾 Q.Farm Advisory Request</h2>

      <form onSubmit={handleSubmit}>
        <label>Farmer Name:</label>
        <input value={farmerName} onChange={(e) => setFarmerName(e.target.value)} required />

        <label>Crop:</label>
        <input value={crop} onChange={(e) => setCrop(e.target.value)} required />

        <label>Soil Type:</label>
        <input value={soilType} onChange={(e) => setSoilType(e.target.value)} required />

        <label>Land Area (acres):</label>
        <input type="number" value={landArea} onChange={(e) => setLandArea(e.target.value)} required />

        <label>Upload Image:</label>
        <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} required />

        <label>📍 Manual Location (optional):</label>
        <input
          placeholder="Enter city or village name"
          value={manualLocation}
          onChange={(e) => setManualLocation(e.target.value)}
        />

        <div style={{ margin: "10px 0", fontSize: "0.9em", color: "#555" }}>
          Auto-detected:{" "}
          {location.lat && location.lon
            ? `${location.lat}, ${location.lon}`
            : "Awaiting permission... or enter manually above"}
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Processing..." : "Get Advisory"}
        </button>
      </form>

      {advisory && (
        <div style={{ marginTop: "30px", padding: "10px", border: "1px solid #ccc" }}>
          <h3>Advisory Result:</h3>
          <p><b>Crop:</b> {advisory.crop}</p>
          <p><b>Soil:</b> {advisory.soil_type}</p>
          <p><b>Weather:</b> {advisory.weather_info?.description || "N/A"}</p>
          <p><b>Temperature:</b> {advisory.weather_info?.temp || "N/A"} °C</p>
          <p><b>💰 Market Price:</b> {advisory.market_info?.price
            ? `₹${advisory.market_info.price} ${advisory.market_info.currency} (${advisory.market_info.region})`
            : "Unavailable"}
          </p>
          <p><b>Advice:</b> {advisory.advisory_text}</p>
        </div>
      )}
    </div>
  );
};

export default NewAdvisoryForm;
