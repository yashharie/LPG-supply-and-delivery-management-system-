import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { FaTruck, FaMapMarkerAlt, FaSync, FaWarehouse, FaUser, FaPhoneAlt } from "react-icons/fa";
import "../../styles/AdminPages.css";

const API = "http://127.0.0.1:8000/api";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const makeDriverIcon = (active) => L.divIcon({
  className: "",
  html: `
    <div style="
      width:40px;height:40px;border-radius:50%;
      background:${active ? "linear-gradient(135deg,#1e40af,#3b82f6)" : "#94a3b8"};
      border:3px solid #fff;
      box-shadow:0 3px 12px rgba(0,0,0,0.25);
      display:flex;align-items:center;justify-content:center;
      position:relative;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#fff">
        <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
      </svg>
    </div>
    ${active ? `<div style="
      position:absolute;top:-1px;right:-1px;
      width:12px;height:12px;border-radius:50%;
      background:#22c55e;border:2px solid #fff;
    "></div>` : ""}
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -22],
});

const FitBounds = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (!positions.length) return;
    const bounds = L.latLngBounds(positions.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13 });
  }, [positions.length]);
  return null;
};

const ago = (ts) => {
  if (!ts) return "Never";
  const sec = Math.floor((new Date() - new Date(ts)) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
};

const LiveDriversMap = () => {
  const [drivers,    setDrivers]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selected,   setSelected]   = useState(null);
  const [filter,     setFilter]     = useState("all");
  const token       = localStorage.getItem("token");
  const intervalRef = useRef(null);

  const fetchDrivers = useCallback(() => {
    axios.get(`${API}/admin/drivers/live`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => { setDrivers(r.data); setLastUpdate(new Date()); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    fetchDrivers();
    intervalRef.current = setInterval(fetchDrivers, 15000);
    return () => clearInterval(intervalRef.current);
  }, [fetchDrivers]);

  const activeDrivers  = drivers.filter((d) => d.is_active && d.active_order);
  const idleDrivers    = drivers.filter((d) => !d.active_order);
  const offlineDrivers = drivers.filter((d) => !d.is_active);

  const displayed = filter === "all"    ? drivers
                  : filter === "active" ? activeDrivers
                  : idleDrivers;

  const mapPositions = displayed.filter((d) => d.lat && d.lng);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 0px)", fontFamily: "var(--font)" }}>

      {/* ── Top bar ── */}
      <div className="ap-map-topbar" style={{ background: "linear-gradient(120deg,#0f172a 0%,#1e3a8a 60%,#1e40af 100%)", borderBottom: "none" }}>
        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(59,130,246,0.25)", border: "1px solid rgba(59,130,246,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            🚚
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#fff" }}>Live Driver Tracking</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>Real-time GPS · Auto-refreshes every 15s</div>
          </div>
        </div>

        {/* Stats chips */}
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {[
            { label: "All Drivers",   val: drivers.length,        bg: "rgba(59,130,246,0.2)",  border: "rgba(59,130,246,0.4)",  color: "#93c5fd" },
            { label: "🟢 On Trip",    val: activeDrivers.length,  bg: "rgba(34,197,94,0.15)",  border: "rgba(34,197,94,0.4)",   color: "#86efac" },
            { label: "🔴 Offline",    val: offlineDrivers.length, bg: "rgba(239,68,68,0.15)",  border: "rgba(239,68,68,0.35)",  color: "#fca5a5" },
          ].map((s) => (
            <div key={s.label} style={{
              background: s.bg, border: `1px solid ${s.border}`,
              color: s.color, padding: "4px 12px",
              borderRadius: 20, fontSize: 12, fontWeight: 700,
            }}>
              {s.label}: {s.val}
            </div>
          ))}
        </div>

        {/* Filter buttons */}
        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          {[
            { key: "all",    label: "All" },
            { key: "active", label: "On Trip" },
            { key: "idle",   label: "Idle" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                fontWeight: 700, fontSize: 12, fontFamily: "var(--font)",
                background: filter === f.key ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.1)",
                color: filter === f.key ? "#1e40af" : "rgba(255,255,255,0.7)",
                transition: "all 0.15s",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button
          onClick={fetchDrivers}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 15px", borderRadius: 8,
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            cursor: "pointer", fontSize: 12, fontWeight: 600,
            color: "rgba(255,255,255,0.8)", fontFamily: "var(--font)",
          }}
        >
          <FaSync style={{ fontSize: 11 }} />
          {lastUpdate && `· ${ago(lastUpdate)}`}
        </button>
      </div>

      {/* ── Body: sidebar + map ── */}
      <div className="ap-map-body">

        {/* Sidebar */}
        <div className="ap-map-sidebar">
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
              Loading drivers…
            </div>
          ) : displayed.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🚫</div>
              No drivers found.
            </div>
          ) : (
            displayed.map((d) => {
              const isSelected = selected === d.id;
              const hasLoc     = d.lat && d.lng;
              const isOnTrip   = !!d.active_order;
              let borderLeft   = "#e2e8f0";
              let statusBg     = "#f1f5f9";
              let statusColor  = "#94a3b8";
              let statusLabel  = "Offline";
              if (isOnTrip)  { borderLeft = "#1e40af"; statusBg = "#dbeafe"; statusColor = "#1e40af"; statusLabel = "On Trip"; }
              else if (hasLoc){ borderLeft = "#10b981"; statusBg = "#d1fae5"; statusColor = "#065f46"; statusLabel = "Online"; }

              return (
                <div
                  key={d.id}
                  onClick={() => setSelected(isSelected ? null : d.id)}
                  className={`ap-driver-card${isSelected ? " selected" : ""}${isOnTrip ? " on-trip" : hasLoc ? " online" : ""}`}
                  style={{ borderLeft: `3px solid ${borderLeft}` }}
                >
                  {/* Avatar + name row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      background: isOnTrip ? "linear-gradient(135deg,#1e40af,#3b82f6)" : hasLoc ? "#10b981" : "#e2e8f0",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, color: "#fff",
                    }}>🚚</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {d.name}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{d.employee_id}</div>
                    </div>
                    <span style={{ background: statusBg, color: statusColor, padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                      {statusLabel}
                    </span>
                  </div>

                  {/* Warehouse */}
                  {d.warehouse && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                      <FaWarehouse style={{ fontSize: 10 }} /> {d.warehouse}
                    </div>
                  )}

                  {/* GPS time */}
                  {hasLoc && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                      <FaMapMarkerAlt style={{ fontSize: 10, color: "#22c55e" }} />
                      GPS updated {ago(d.updated_at)}
                    </div>
                  )}

                  {/* Active order details */}
                  {isSelected && d.active_order && (
                    <div style={{
                      marginTop: 10, padding: "10px 12px",
                      background: "#eff6ff", borderRadius: 8,
                      border: "1px solid #bfdbfe", fontSize: 12,
                    }}>
                      <div style={{ fontWeight: 800, color: "#1e40af", marginBottom: 6 }}>📦 Current Delivery</div>
                      <div style={{ lineHeight: 1.8, color: "#1e3a8a" }}>
                        <div><strong>Order:</strong> #{d.active_order.order_number}</div>
                        <div><strong>Cylinders:</strong> {d.active_order.total_quantity}</div>
                        {d.active_order.client_name && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <FaUser style={{ fontSize: 10 }} /> {d.active_order.client_name}
                          </div>
                        )}
                        {d.active_order.client_phone && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <FaPhoneAlt style={{ fontSize: 10 }} /> {d.active_order.client_phone}
                          </div>
                        )}
                        {d.active_order.client_address && (
                          <div style={{ color: "#475569", fontSize: 11 }}>📍 {d.active_order.client_address}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Load bar */}
                  {d.max_capacity > 0 && (
                    <div className="ap-load-bar-wrap" style={{ marginTop: 10 }}>
                      <div className="ap-load-bar-labels">
                        <span>Load</span>
                        <span>{d.current_load} / {d.max_capacity}</span>
                      </div>
                      <div className="ap-stock-bar-wrap">
                        <div className="ap-stock-bar" style={{
                          width: `${Math.min(100, (d.current_load / d.max_capacity) * 100)}%`,
                          background: d.current_load > d.max_capacity * 0.8 ? "#ef4444" : "#3b82f6",
                        }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Map */}
        <div className="ap-map-main">
          {mapPositions.length === 0 && !loading && (
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 999, textAlign: "center",
              background: "rgba(255,255,255,0.95)",
              padding: "24px 36px", borderRadius: 16,
              boxShadow: "0 8px 32px rgba(15,23,42,0.12)",
              backdropFilter: "blur(8px)",
            }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🗺️</div>
              <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 15, marginBottom: 4 }}>No GPS data available</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>Drivers will appear once they share their location.</div>
            </div>
          )}

          <MapContainer center={[7.8731, 80.7718]} zoom={8} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {mapPositions.length > 0 && <FitBounds positions={mapPositions} />}

            {mapPositions.map((d) => (
              <Marker
                key={d.id}
                position={[d.lat, d.lng]}
                icon={makeDriverIcon(!!d.active_order)}
                eventHandlers={{ click: () => setSelected(d.id) }}
              >
                <Popup minWidth={230}>
                  <div style={{ fontFamily: "var(--font)", padding: 4 }}>
                    {/* Driver header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: d.active_order ? "linear-gradient(135deg,#1e40af,#3b82f6)" : "#10b981",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 18, flexShrink: 0,
                      }}>🚚</div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>{d.name}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>{d.employee_id} · {d.warehouse}</div>
                      </div>
                    </div>

                    {/* GPS */}
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10, fontFamily: "monospace", background: "#f8fafc", padding: "6px 10px", borderRadius: 6 }}>
                      📍 {parseFloat(d.lat).toFixed(5)}, {parseFloat(d.lng).toFixed(5)}<br />
                      Updated: {ago(d.updated_at)}
                    </div>

                    {/* Active order or idle */}
                    {d.active_order ? (
                      <div style={{ background: "#eff6ff", borderRadius: 8, padding: "10px 12px", border: "1px solid #bfdbfe", fontSize: 12 }}>
                        <div style={{ fontWeight: 800, color: "#1e40af", marginBottom: 5 }}>📦 On Delivery</div>
                        <div style={{ color: "#1e3a8a", lineHeight: 1.7 }}>
                          <strong>#{d.active_order.order_number}</strong><br />
                          {d.active_order.total_quantity} cylinders<br />
                          {d.active_order.client_name && <span>👤 {d.active_order.client_name}<br /></span>}
                          {d.active_order.client_address && <span style={{ fontSize: 11, color: "#475569" }}>📍 {d.active_order.client_address}</span>}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic", padding: "8px 0" }}>
                        ✅ No active delivery
                      </div>
                    )}

                    {/* Load */}
                    {d.max_capacity > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginBottom: 3 }}>
                          <span>Capacity</span>
                          <span>{d.current_load} / {d.max_capacity}</span>
                        </div>
                        <div className="ap-stock-bar-wrap">
                          <div className="ap-stock-bar" style={{
                            width: `${Math.min(100, (d.current_load / d.max_capacity) * 100)}%`,
                            background: d.current_load > d.max_capacity * 0.8 ? "#ef4444" : "#3b82f6",
                          }} />
                        </div>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default LiveDriversMap;
