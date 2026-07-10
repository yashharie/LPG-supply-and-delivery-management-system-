import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const API       = "http://127.0.0.1:8000/api";
const NOMINATIM = "https://nominatim.openstreetmap.org";

function MapPanner({ lat, lng }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], map.getZoom(), { animate: true }); }, [lat, lng]);
  return null;
}
function MapClickHandler({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

const ProfileSettingsTab = ({ currentUser, token, setCurrentUser }) => {
  // ── View / Edit mode ──
  const [editing,    setEditing]    = useState(false);
  const [hasActive,  setHasActive]  = useState(false); // has active orders → lock location

  // ── Form fields ──
  const [phone,      setPhone]      = useState("");
  const [address,    setAddress]    = useState("");
  const [lat,        setLat]        = useState(6.9271);
  const [lng,        setLng]        = useState(79.8612);
  const [mapKey,     setMapKey]     = useState(0);

  // ── Geocoding ──
  const [geocoding,  setGeocoding]  = useState(false);
  const [searching,  setSearching]  = useState(false);
  const [searchQ,    setSearchQ]    = useState("");
  const [searchErr,  setSearchErr]  = useState("");

  // ── Save state ──
  const [saving,     setSaving]     = useState(false);
  const [msg,        setMsg]        = useState({ text: "", ok: false });

  const geocodeDebounce = useRef(null);
  const profileComplete = !!(currentUser?.latitude && currentUser?.longitude && currentUser?.phone);

  /* ── Populate from currentUser ── */
  useEffect(() => {
    if (!currentUser) return;
    setPhone(currentUser.phone ?? "");
    setAddress(currentUser.address ?? "");
    const uLat = parseFloat(currentUser.latitude)  || 6.9271;
    const uLng = parseFloat(currentUser.longitude) || 79.8612;
    setLat(uLat); setLng(uLng);
    setMapKey((k) => k + 1);

    // If profile not yet set → open edit mode automatically
    if (!profileComplete) setEditing(true);
  }, [currentUser?.id]);

  /* ── Check for active orders ── */
  useEffect(() => {
    if (!token) return;
    axios.get(`${API}/user/active-orders-check`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setHasActive(r.data.has_active_orders))
      .catch(() => {});
  }, [token]);

  /* ── Reverse geocode ── */
  const reverseGeocode = useCallback(async (newLat, newLng) => {
    setGeocoding(true);
    try {
      const r = await fetch(
        `${NOMINATIM}/reverse?lat=${newLat}&lon=${newLng}&format=json&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const d = await r.json();
      if (d?.display_name) {
        const a = d.address ?? {};
        const parts = [a.house_number, a.road, a.suburb ?? a.neighbourhood,
          a.city ?? a.town ?? a.village ?? a.county, a.state, a.country].filter(Boolean);
        setAddress(parts.length ? parts.join(", ") : d.display_name);
      }
    } catch { /* silent */ } finally { setGeocoding(false); }
  }, []);

  const handleMapClick = (newLat, newLng) => {
    if (hasActive) return; // don't allow location change if active order
    setLat(newLat); setLng(newLng);
    clearTimeout(geocodeDebounce.current);
    geocodeDebounce.current = setTimeout(() => reverseGeocode(newLat, newLng), 400);
  };

  /* ── Address search ── */
  const handleSearch = async (e) => {
    e.preventDefault();
    const q = searchQ.trim();
    if (!q) return;
    setSearchErr(""); setSearching(true);
    try {
      const r = await fetch(
        `${NOMINATIM}/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const res = await r.json();
      if (!res?.length) { setSearchErr("Address not found."); return; }
      const newLat = parseFloat(res[0].lat);
      const newLng = parseFloat(res[0].lon);
      setLat(newLat); setLng(newLng);
      setAddress(res[0].display_name);
      setSearchQ("");
    } catch { setSearchErr("Search failed. Check your connection."); }
    finally { setSearching(false); }
  };

  /* ── GPS ── */
  const handleGPS = () => {
    if (!navigator.geolocation) { setSearchErr("GPS not supported."); return; }
    if (hasActive) { setSearchErr("Cannot change location while an active order is running."); return; }
    setSearching(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        setLat(newLat); setLng(newLng);
        reverseGeocode(newLat, newLng);
        setSearching(false);
      },
      () => { setSearchErr("GPS denied. Allow location in browser settings."); setSearching(false); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  /* ── Save ── */
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg({ text: "", ok: false });
    try {
      const res = await axios.put(
        `${API}/user/profile/update`,
        { phone, address, latitude: lat, longitude: lng },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMsg({ text: " Profile saved successfully.", ok: true });
      setCurrentUser(res.data.user);
      setEditing(false); // go back to view mode on success
    } catch (err) {
      const errors = err.response?.data?.errors;
      const first  = errors ? Object.values(errors)[0]?.[0] : null;
      setMsg({ text: " " + (first ?? err.response?.data?.message ?? "Save failed."), ok: false });
    } finally { setSaving(false); }
  };

  const handleEditClick = () => {
    setMsg({ text: "", ok: false });
    setEditing(true);
  };

  const handleCancelEdit = () => {
    // Reset fields back to saved values
    setPhone(currentUser.phone ?? "");
    setAddress(currentUser.address ?? "");
    setLat(parseFloat(currentUser.latitude) || 6.9271);
    setLng(parseFloat(currentUser.longitude) || 79.8612);
    setMapKey((k) => k + 1);
    setMsg({ text: "", ok: false });
    setSearchErr("");
    setEditing(false);
  };

  /* ─────────────── VIEW MODE ─────────────── */
  if (!editing) {
    return (
      <div className="client-card" style={{ maxWidth: 680 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 className="client-section-title" style={{ margin: 0 }}>👤 My Profile</h2>
          <button
            onClick={handleEditClick}
            style={{
              background: "#1e293b", color: "#fff", border: "none",
              padding: "8px 20px", borderRadius: 6, cursor: "pointer",
              fontWeight: 700, fontSize: 14,
            }}
          >
            ✏️ Edit Profile
          </button>
        </div>

        {/* Profile complete / incomplete banner */}
        {!profileComplete ? (
          <div style={{
            background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8,
            padding: "12px 16px", marginBottom: 20, fontSize: 14, fontWeight: 600, color: "#92400e",
          }}>
            ⚠️ Your profile is incomplete. Click <strong>Edit Profile</strong> to set your phone number and delivery location before placing an order.
          </div>
        ) : (
          <div style={{
            background: "#d1fae5", border: "1px solid #a7f3d0", borderRadius: 8,
            padding: "12px 16px", marginBottom: 20, fontSize: 14, fontWeight: 600, color: "#065f46",
          }}>
            ✅ Profile complete — you can place orders.
          </div>
        )}

        {hasActive && (
          <div style={{
            background: "#dbeafe", border: "1px solid #bfdbfe", borderRadius: 8,
            padding: "10px 14px", marginBottom: 16, fontSize: 13, fontWeight: 600, color: "#1e40af",
          }}>
            🔒 You have an active order in progress. Your delivery location is locked until it's completed or cancelled.
          </div>
        )}

        {/* Profile details */}
        <div style={{ background: "#f8fafc", borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0" }}>
          {[
            { label: "Name",     value: currentUser?.name },
            { label: "Phone",    value: currentUser?.phone ?? <em style={{ color: "#aaa" }}>Not set</em> },
            { label: "Address",  value: currentUser?.address ?? <em style={{ color: "#aaa" }}>Not set</em> },
            { label: "Location", value: currentUser?.latitude
                ? `${parseFloat(currentUser.latitude).toFixed(5)}, ${parseFloat(currentUser.longitude).toFixed(5)}`
                : <em style={{ color: "#aaa" }}>Not set</em> },
          ].map(({ label, value }) => (
            <div key={label} style={{
              display: "grid", gridTemplateColumns: "130px 1fr",
              padding: "14px 18px", borderBottom: "1px solid #e2e8f0",
            }}>
              <div style={{ fontWeight: 700, color: "#64748b", fontSize: 13 }}>{label}</div>
              <div style={{ color: "#0f172a", fontSize: 14 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Mini map showing current location */}
        {currentUser?.latitude && currentUser?.longitude && (
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>
               Delivery Location
            </p>
            <div style={{ height: 200, borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0" }}>
              <MapContainer
                key={`view-${currentUser.latitude}-${currentUser.longitude}`}
                center={[parseFloat(currentUser.latitude), parseFloat(currentUser.longitude)]}
                zoom={14}
                style={{ height: "100%", width: "100%" }}
                zoomControl={false}
                dragging={false}
                scrollWheelZoom={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[parseFloat(currentUser.latitude), parseFloat(currentUser.longitude)]} />
              </MapContainer>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ─────────────── EDIT MODE ─────────────── */
  return (
    <div className="client-card" style={{ maxWidth: 700 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 className="client-section-title" style={{ margin: 0 }}> Edit Profile</h2>
        {profileComplete && (
          <button onClick={handleCancelEdit} style={{
            background: "none", color: "#64748b",
            border: "1px solid #e2e8f0", padding: "6px 16px",
            borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13,
          }}>
            Cancel
          </button>
        )}
      </div>

      {hasActive && (
        <div style={{
          background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8,
          padding: "10px 14px", marginBottom: 16, fontSize: 13, fontWeight: 600, color: "#92400e",
        }}>
          ⚠️ You have an active order. You can update your phone number, but <strong>delivery location is locked</strong> until the order is completed or cancelled.
        </div>
      )}

      <form onSubmit={handleSave}>

        {/* Phone */}
        <div className="admin-form-group">
          <label className="field-label">Phone Number</label>
          <input className="client-input" type="tel" value={phone}
            onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 071 234 5678" required />
        </div>

        {/* Address */}
        <div className="admin-form-group">
          <label className="field-label">
            Delivery Address
            {geocoding && <span style={{ marginLeft: 8, fontSize: 12, color: "#3b82f6", fontWeight: 400 }}> Fetching…</span>}
            {hasActive && <span style={{ marginLeft: 8, fontSize: 12, color: "#dc2626", fontWeight: 400 }}>Locked (active order)</span>}
          </label>
          <textarea className="client-textarea" rows={2} value={address}
            onChange={(e) => !hasActive && setAddress(e.target.value)}
            placeholder="Click the map to auto-fill"
            disabled={hasActive} required
            style={{ opacity: hasActive ? 0.6 : 1 }}
          />
          {!hasActive && (
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
              💡 Clicking the map auto-fills this field.
            </p>
          )}
        </div>

        {/* Search + GPS — only if no active order */}
        {!hasActive && (
          <div className="admin-form-group">
            <label className="field-label">🔍 Search Address / Place</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="client-input" style={{ flex: 1 }} type="text"
                value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch(e)}
                placeholder="e.g. Trincomalee, Sri Lanka" />
              <button type="button" onClick={handleSearch}
                disabled={searching || !searchQ.trim()}
                style={{ background: "#3b82f6", color: "#fff", border: "none", padding: "0 16px",
                  borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13,
                  opacity: searching || !searchQ.trim() ? 0.6 : 1 }}>
                {searching ? "…" : "Search"}
              </button>
              <button type="button" onClick={handleGPS} disabled={searching}
                title="Use my GPS location"
                style={{ background: "#10b981", color: "#fff", border: "none", padding: "0 14px",
                  borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                📡 GPS
              </button>
            </div>
            {searchErr && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 6, fontWeight: 600 }}> {searchErr}</p>}
          </div>
        )}

        {/* Map */}
        <div className="admin-form-group">
          <label className="field-label">
             Delivery Location
            {hasActive && <span style={{ marginLeft: 8, fontSize: 12, color: "#dc2626", fontWeight: 400 }}> Locked</span>}
            {!hasActive && <span style={{ marginLeft: 8, fontSize: 12, color: "#64748b", fontWeight: 400 }}>— click to pin</span>}
          </label>
          <div style={{
            height: 280, borderRadius: 10, overflow: "hidden",
            border: "1.5px solid #cbd5e1", marginTop: 6,
            opacity: hasActive ? 0.65 : 1,
            pointerEvents: hasActive ? "none" : "auto",
          }}>
            <MapContainer key={mapKey} center={[lat, lng]} zoom={13} style={{ height: "100%", width: "100%" }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {!hasActive && <MapClickHandler onPick={handleMapClick} />}
              <MapPanner lat={lat} lng={lng} />
              <Marker position={[lat, lng]} />
            </MapContainer>
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between", marginTop: 6,
            padding: "6px 12px", background: "#f8fafc", borderRadius: 6,
            border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "monospace", color: "#334155",
          }}>
            <span>Lat: <strong>{lat.toFixed(6)}</strong></span>
            <span>Lng: <strong>{lng.toFixed(6)}</strong></span>
          </div>
        </div>

        {/* Feedback */}
        {msg.text && (
          <div style={{
            padding: "10px 14px", borderRadius: 8, marginBottom: 14,
            background: msg.ok ? "#d1fae5" : "#fee2e2",
            color: msg.ok ? "#065f46" : "#991b1b", fontWeight: 600,
          }}>
            {msg.text}
          </div>
        )}

        <button type="submit" className="client-action-btn" disabled={saving}
          style={{ opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </form>
    </div>
  );
};

export default ProfileSettingsTab;
