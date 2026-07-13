import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { confirmDialog, toast, errorAlert } from "../../utils/swal";
import InvoiceButton from "../../components/InvoiceButton";
import { FaBoxes, FaSync, FaMapMarkerAlt } from "react-icons/fa";
import "../../styles/AdminPages.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const API     = "http://127.0.0.1:8000/api";
const STORAGE = "http://127.0.0.1:8000/storage/";

const STATUS_BADGE = {
  Pending:            "ap-badge ap-badge-pending",
  Approved:           "ap-badge ap-badge-approved",
  "Out for Delivery": "ap-badge ap-badge-delivery",
  Delivered:          "ap-badge ap-badge-delivered",
  Rejected:           "ap-badge ap-badge-rejected",
  Cancelled:          "ap-badge ap-badge-cancelled",
};

const STATUS_FILTERS = ["All", "Pending", "Approved", "Out for Delivery", "Delivered", "Rejected", "Cancelled"];

const KPI_DEFS = [
  { key: "All",              label: "Total",       accent: "#3b82f6", bg: "#eff6ff", icon: "📦" },
  { key: "Pending",          label: "Pending",     accent: "#f59e0b", bg: "#fffbeb", icon: "⏳" },
  { key: "Approved",         label: "Approved",    accent: "#10b981", bg: "#f0fdf4", icon: "✅" },
  { key: "Out for Delivery", label: "Delivering",  accent: "#8b5cf6", bg: "#faf5ff", icon: "🚚" },
  { key: "Delivered",        label: "Delivered",   accent: "#16a34a", bg: "#f0fdf4", icon: "🎉" },
];

/* ── Mini driver map ── */
const DriverLocMap = ({ driverId, token }) => {
  const [loc, setLoc] = useState(null);
  const poll = useCallback(() => {
    axios.get(`${API}/driver/${driverId}/location`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setLoc(r.data)).catch(console.error);
  }, [driverId, token]);
  useEffect(() => { poll(); const t = setInterval(poll, 10000); return () => clearInterval(t); }, [poll]);

  if (!loc?.lat || !loc?.lng) return (
    <div style={{ padding: "12px 0", fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", animation: "pulse 1.5s infinite" }} />
      Waiting for driver GPS…
    </div>
  );
  return (
    <div style={{ height: 200, borderRadius: 10, overflow: "hidden", marginTop: 12, border: "1.5px solid #bfdbfe" }}>
      <MapContainer center={[loc.lat, loc.lng]} zoom={14} style={{ height: "100%", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[loc.lat, loc.lng]}>
          <Popup>🚚 {loc.name}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

const Orders = () => {
  const [orders,    setOrders]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [expandRow, setExpandRow] = useState(null);
  const [filter,    setFilter]    = useState("All");
  const token = localStorage.getItem("token");

  const fetchOrders = () => {
    setLoading(true);
    axios.get(`${API}/orders`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setOrders(r.data))
      .catch(() => errorAlert("Load Failed", "Could not load orders."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, []);

  const filtered = filter === "All" ? orders : orders.filter((o) => o.status === filter);

  const kpiCount = (key) => key === "All" ? orders.length : orders.filter((o) => o.status === key).length;

  if (loading) return (
    <div className="ap-page">
      <div className="ap-hero">
        <div className="ap-hero-ring" />
        <div className="ap-hero-inner">
          <div>
            <div className="ap-hero-eyebrow">Admin · Orders</div>
            <h1 className="ap-hero-title">Master Orders Panel</h1>
          </div>
        </div>
      </div>
      <div className="ap-body">
        <div className="ap-card">
          <div className="ap-empty"><div className="ap-empty-icon">⏳</div><div className="ap-empty-text">Loading orders…</div></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="ap-page">
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      {/* ── Hero ── */}
      <div className="ap-hero">
        <div className="ap-hero-ring" />
        <div className="ap-hero-inner">
          <div>
            <div className="ap-hero-eyebrow">Admin · Read-Only View</div>
            <h1 className="ap-hero-title">Master Orders Panel</h1>
            <p className="ap-hero-sub">Complete order history across all warehouses</p>
          </div>
          <div className="ap-hero-actions">
            <span className="ap-hero-badge">
              <FaBoxes style={{ fontSize: 12 }} />
              {orders.length} total orders
            </span>
            <button className="ap-hero-btn" onClick={fetchOrders}>
              <FaSync style={{ fontSize: 11 }} />
            </button>
          </div>
        </div>
      </div>

      <div className="ap-body">

        {/* ── KPI strip ── */}
        <div className="ap-kpi-strip ap-kpi-strip-5" style={{ marginBottom: 24 }}>
          {KPI_DEFS.map((k, i) => (
            <div
              key={k.key}
              className="ap-kpi-card"
              onClick={() => setFilter(k.key)}
              style={{
                borderBottomColor: k.accent,
                cursor: "pointer",
                outline: filter === k.key ? `2px solid ${k.accent}` : "none",
                animationDelay: `${i * 0.06}s`,
              }}
            >
              <div className="ap-kpi-bg-circle" style={{ background: k.bg }} />
              <div className="ap-kpi-icon" style={{ color: k.accent }}>{k.icon}</div>
              <div className="ap-kpi-label">{k.label}</div>
              <div className="ap-kpi-value" style={{ color: k.accent }}>{kpiCount(k.key)}</div>
            </div>
          ))}
        </div>

        {/* ── Filter pill bar ── */}
        <div className="ap-pill-bar">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              className={`ap-pill${filter === s ? " active" : ""}`}
              onClick={() => setFilter(s)}
            >
              {s}
              <span className="ap-pill-count">({kpiCount(s)})</span>
            </button>
          ))}
        </div>

        {/* ── Order list ── */}
        {filtered.length === 0 ? (
          <div className="ap-card">
            <div className="ap-empty">
              <div className="ap-empty-icon">🔍</div>
              <div className="ap-empty-text">No orders found for this filter.</div>
              <div className="ap-empty-sub">Try selecting a different status above.</div>
            </div>
          </div>
        ) : (
          filtered.map((o) => {
            const badgeClass = STATUS_BADGE[o.status] ?? "ap-badge ap-badge-cancelled";
            const isOpen     = expandRow === o.id;

            return (
              <div key={o.id} className="ap-row-card">
                {/* Header row */}
                <div className="ap-row-card-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 15, color: "#1e40af" }}>
                      #{o.order_number}
                    </span>
                    <span className={badgeClass}>{o.status}</span>
                    {o.type === "partial" && (
                      <span className="ap-badge" style={{ background: "#fffbeb", color: "#d97706" }}>Partial</span>
                    )}
                    {o.type === "pre-order" && (
                      <span className="ap-badge" style={{ background: "#faf5ff", color: "#7c3aed" }}>Pre-Order</span>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    🏭 {o.warehouse?.name ?? `#${o.warehouse_id}`}
                  </span>
                </div>

                {/* Info grid */}
                <div className="ap-info-grid">
                  <div className="ap-info-cell">
                    <div className="ap-info-cell-label">Client</div>
                    <div className="ap-info-cell-value">{o.user?.name ?? "—"}</div>
                    {o.user?.phone && <div className="ap-info-cell-sub">📞 {o.user.phone}</div>}
                    {o.user?.address && <div className="ap-info-cell-sub" style={{ fontSize: 11 }}>📍 {o.user.address}</div>}
                    {o.user?.latitude && o.user?.longitude && (
                      <a
                        className="ap-maps-link"
                        href={`https://www.google.com/maps?q=${o.user.latitude},${o.user.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ marginTop: 6, display: "inline-flex" }}
                      >
                        <FaMapMarkerAlt style={{ fontSize: 10 }} /> Google Maps
                      </a>
                    )}
                  </div>

                  <div className="ap-info-cell">
                    <div className="ap-info-cell-label">Order Details</div>
                    <div className="ap-info-cell-value">{o.total_quantity} cylinders</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "#059669", marginTop: 4 }}>
                      LKR {parseFloat(o.total_amount ?? 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="ap-info-cell">
                    <div className="ap-info-cell-label">Payment Receipt</div>
                    {o.receipt_path ? (
                      <a
                        href={STORAGE + o.receipt_path}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#1e62d4", fontWeight: 700, fontSize: 13 }}
                      >
                        View Receipt ↗
                      </a>
                    ) : (
                      <span style={{ color: "#aaa", fontSize: 12 }}>No receipt uploaded</span>
                    )}
                  </div>
                </div>

                {/* Actions (read-only) */}
                <div className="ap-action-row">
                  <InvoiceButton orderId={o.id} token={token} mode="invoice" />

                  {o.status === "Pending" && (
                    <span style={{ fontSize: 13, color: "#92400e", fontWeight: 600, background: "#fffbeb", padding: "6px 14px", borderRadius: 8, border: "1px solid #fde68a" }}>
                      ⏳ Awaiting payment verification by Warehouse Manager
                    </span>
                  )}
                  {o.status === "Approved" && (
                    <span style={{ fontSize: 13, color: "#065f46", fontWeight: 600, background: "#f0fdf4", padding: "6px 14px", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                      ✅ Approved — Awaiting driver assignment by Manager
                    </span>
                  )}
                  {o.status === "Out for Delivery" && o.assigned_driver_id && (
                    <button
                      onClick={() => setExpandRow(isOpen ? null : o.id)}
                      className={`ap-btn ${isOpen ? "ap-btn-ghost" : "ap-btn-primary"} ap-btn-sm`}
                    >
                      🗺️ {isOpen ? "Hide Map" : "Track Driver"}
                    </button>
                  )}
                  {o.assigned_driver_id && !["Pending", "Approved"].includes(o.status) && (
                    <span style={{ fontSize: 12, color: "#64748b", padding: "5px 0" }}>
                      Driver: #{o.assigned_driver_id}
                    </span>
                  )}
                </div>

                {/* Driver tracking map */}
                {isOpen && o.assigned_driver_id && (
                  <DriverLocMap driverId={o.assigned_driver_id} token={token} />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Orders;
