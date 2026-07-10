import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  FaBoxes, FaWarehouse, FaMap, FaFileInvoice,
  FaClipboardList, FaTruck,
} from "react-icons/fa";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { confirmDialog, toast, errorAlert } from "../../../utils/swal";
import InvoiceButton from "../../../components/InvoiceButton";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const API = "http://127.0.0.1:8000/api";

const fmt = (n) =>
  n != null
    ? `LKR ${parseFloat(n).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`
    : "—";

const STATUS_COLOR = {
  Pending:            { bg: "#fef9c3", color: "#92400e" },
  Approved:           { bg: "#d1fae5", color: "#065f46" },
  "Out for Delivery": { bg: "#dbeafe", color: "#1e40af" },
  Delivered:          { bg: "#d1fae5", color: "#065f46" },
  Rejected:           { bg: "#fee2e2", color: "#991b1b" },
  Cancelled:          { bg: "#f1f5f9", color: "#64748b" },
  PARTIAL_PENDING:    { bg: "#fff7ed", color: "#c2410c" },
  PRE_ORDER:          { bg: "#f5f3ff", color: "#6d28d9" },
  FULFILLED:          { bg: "#d1fae5", color: "#065f46" },
};

const ORDER_TYPE_BADGE = {
  PARTIAL_PENDING: { label: "Partial Delivery", bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  PRE_ORDER:       { label: "Pre-Order",        bg: "#f5f3ff", color: "#6d28d9", border: "#ddd6fe" },
  FULFILLED:       { label: "Fulfilled",        bg: "#d1fae5", color: "#065f46", border: "#a7f3d0" },
};

/* ── Driver tracking mini-map ── */
const DriverMap = ({ driverId, token }) => {
  const [loc, setLoc] = useState(null);
  const [err, setErr] = useState("");

  const poll = useCallback(() => {
    axios
      .get(`${API}/driver/${driverId}/location`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setLoc(r.data))
      .catch(() => setErr("Location unavailable."));
  }, [driverId, token]);

  useEffect(() => {
    poll();
    const t = setInterval(poll, 10000);
    return () => clearInterval(t);
  }, [poll]);

  if (err) return <p style={{ fontSize: 12, color: "#dc2626" }}>{err}</p>;
  if (!loc?.lat || !loc?.lng)
    return <p style={{ fontSize: 12, color: "#64748b" }}>Waiting for driver location…</p>;

  const updated = loc.updated_at ? new Date(loc.updated_at).toLocaleTimeString() : "";
  return (
    <div style={{ marginTop: 10 }}>
      <p style={{ fontSize: 12, color: "#1e40af", marginBottom: 6, fontWeight: 600 }}>
        Driver Live Location {updated && `(updated ${updated})`}
      </p>
      <div style={{ height: 200, borderRadius: 8, overflow: "hidden", border: "1px solid #bfdbfe" }}>
        <MapContainer center={[loc.lat, loc.lng]} zoom={14} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[loc.lat, loc.lng]}>
            <Popup>{loc.name}</Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════
   ORDER HISTORY
══════════════════════════════════════════════════ */
const OrderHistory = ({ token, refreshKey }) => {
  const [orders,       setOrders]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [trackingId,   setTrackingId]   = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const fetchOrders = useCallback(() => {
    if (!token) return;
    axios
      .get(`${API}/orders/history`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setOrders(Array.isArray(r.data) ? r.data : r.data.orders ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { fetchOrders(); }, [fetchOrders, refreshKey]);

  const cancelOrder = async (id) => {
    const ok = await confirmDialog({
      title:       "Cancel this order?",
      text:        "This action cannot be undone.",
      confirmText: "Yes, Cancel Order",
      icon:        "warning",
      danger:      true,
    });
    if (!ok) return;
    setCancellingId(id);
    try {
      await axios.post(`${API}/orders/${id}/cancel`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast("Order cancelled successfully.", "warning");
      fetchOrders();
    } catch (err) {
      errorAlert("Cancel Failed", err.response?.data?.message ?? "Could not cancel this order.");
    } finally { setCancellingId(null); }
  };

  if (loading) return <div className="loading-state">Loading orders…</div>;
  if (orders.length === 0)
    return <p style={{ textAlign: "center", padding: 40, color: "#64748b" }}>No orders yet.</p>;

  return (
    <>
      {orders.map((o) => {
        const items = (() => {
          try {
            const p = typeof o.items_summary === "string" ? JSON.parse(o.items_summary) : o.items_summary;
            return Array.isArray(p) ? p : [];
          } catch { return []; }
        })();
        const sc         = STATUS_COLOR[o.status] ?? { bg: "#f1f5f9", color: "#334155" };
        const typeBadge  = ORDER_TYPE_BADGE[o.order_type] ?? null;
        const isTracking = trackingId === o.id;

        return (
          <div key={o.id} style={{
            border: "1px solid #e2e8f0", borderRadius: 10, marginBottom: 14,
            padding: 16, background: "#fff",
          }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 15 }}>
                  #{o.order_number ?? o.id}
                </span>
                <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: sc.bg, color: sc.color }}>
                  {o.status}
                </span>
                {typeBadge && (
                  <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: typeBadge.bg, color: typeBadge.color, border: `1px solid ${typeBadge.border}` }}>
                    {typeBadge.label}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
                <FaWarehouse /> {o.warehouse?.name ?? `Warehouse #${o.warehouse_id}`}
              </div>
            </div>

            {/* Items */}
            {items.length > 0 && (
              <div style={{ fontSize: 13, color: "#334155", marginBottom: 8 }}>
                {items.map((i, idx) => (
                  <span key={idx} style={{ marginRight: 12 }}>{i.brand} {i.kgWeight} × {i.quantity}</span>
                ))}
              </div>
            )}

            {/* Summary */}
            <div style={{ display: "flex", gap: 20, fontSize: 13, color: "#475569", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><FaBoxes /> {o.total_quantity} cylinders</span>
              <span style={{ fontWeight: 700, color: "#0f172a" }}>
                {fmt(o.total_amount)}
              </span>
              {o.receipt_path && (
                <a href={`http://127.0.0.1:8000/storage/${o.receipt_path}`}
                  target="_blank" rel="noreferrer"
                  style={{ color: "#1e62d4", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  <FaFileInvoice /> View Receipt
                </a>
              )}
            </div>

            {/* Partial / pre-order info */}
            {(o.order_type === "PARTIAL_PENDING" || o.order_type === "PRE_ORDER" || o.order_type === "FULFILLED") && (
              <div style={{
                marginTop: 10, padding: "10px 14px", borderRadius: 8, fontSize: 13,
                background: o.order_type === "PRE_ORDER" ? "#f5f3ff" : o.order_type === "FULFILLED" ? "#d1fae5" : "#fff7ed",
                border: `1px solid ${o.order_type === "PRE_ORDER" ? "#ddd6fe" : o.order_type === "FULFILLED" ? "#a7f3d0" : "#fed7aa"}`,
              }}>
                {o.order_type === "PARTIAL_PENDING" && (
                  <><div style={{ fontWeight: 700, color: "#c2410c", marginBottom: 4 }}>📦 Partial Delivery — Multiple Trips</div>
                  <div style={{ color: "#92400e", fontSize: 12, lineHeight: 1.7 }}>
                    <strong>This trip:</strong> {o.total_quantity} cylinders
                    {o.remaining_quantity > 0 && <><br /><strong>Still pending:</strong> {o.remaining_quantity} cylinders</>}
                  </div></>
                )}
                {o.order_type === "PRE_ORDER" && (
                  <><div style={{ fontWeight: 700, color: "#6d28d9", marginBottom: 4 }}>⏳ Pre-Order — Waiting for Stock</div>
                  <div style={{ color: "#5b21b6", fontSize: 12, lineHeight: 1.7 }}>
                    <strong>Reserved:</strong> {o.requested_quantity ?? o.total_quantity} cylinders
                  </div></>
                )}
                {o.order_type === "FULFILLED" && (
                  <><div style={{ fontWeight: 700, color: "#065f46", marginBottom: 4 }}>🎉 All Deliveries Complete</div>
                  <div style={{ color: "#064e3b", fontSize: 12 }}>
                    Your full order of {o.requested_quantity ?? o.total_quantity} cylinders has been delivered.
                  </div></>
                )}
              </div>
            )}

            {/* ── Delivery OTP — shown when driver has triggered OTP ── */}
            {o.status === "Out for Delivery" && o.delivery_otp && !o.delivery_otp_verified && (
              <div style={{
                marginTop:12, padding:"14px 18px", borderRadius:12,
                background:"linear-gradient(135deg,#f0fdf4,#dcfce7)",
                border:"1.5px solid #86efac",
                display:"flex", justifyContent:"space-between", alignItems:"center",
                flexWrap:"wrap", gap:12,
              }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:800, color:"#15803d", fontSize:14, marginBottom:4, display:"flex", alignItems:"center", gap:6 }}>
                    🚚 Driver is at your door!
                  </div>
                  <div style={{ fontSize:12, color:"#166534", lineHeight:1.6 }}>
                    Your delivery OTP is below. Give this code to the driver <strong>only after</strong> counting and confirming your cylinders.
                  </div>
                </div>
                <div style={{
                  background:"#fff", border:"2px solid #16a34a",
                  borderRadius:12, padding:"12px 24px", textAlign:"center",
                  boxShadow:"0 4px 14px rgba(22,163,74,0.2)",
                  minWidth:160, flexShrink:0,
                }}>
                  <div style={{ fontSize:10, fontWeight:800, color:"#16a34a", letterSpacing:1.5, textTransform:"uppercase", marginBottom:6 }}>
                    Your Delivery OTP
                  </div>
                  <div style={{ fontSize:32, fontWeight:900, color:"#15803d", letterSpacing:8, fontFamily:"monospace" }}>
                    {o.delivery_otp}
                  </div>
                  <div style={{ fontSize:10, color:"#94a3b8", marginTop:4 }}>Expires in 10 minutes</div>
                </div>
              </div>
            )}

            {/* OTP already used — delivery confirmed */}
            {o.delivery_otp_verified && (
              <div style={{ marginTop:10, padding:"10px 14px", borderRadius:8, background:"#d1fae5", border:"1px solid #a7f3d0", fontSize:12, color:"#065f46", fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
                ✅ Delivery OTP verified — cylinders confirmed and handed over.
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              {/* Invoice — available for every order */}
              <InvoiceButton orderId={o.id} token={token} mode="invoice" label="Order Invoice" />

              {/* Cancel — only Pending */}
              {o.status === "Pending" && (
                <button onClick={() => cancelOrder(o.id)} disabled={cancellingId === o.id}
                  style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5",
                    padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                  {cancellingId === o.id ? "Cancelling…" : "Cancel Order"}
                </button>
              )}

              {/* Track driver — only Out for Delivery */}
              {o.status === "Out for Delivery" && o.assigned_driver_id && (
                <button onClick={() => setTrackingId(isTracking ? null : o.id)}
                  style={{ background: isTracking ? "#dbeafe" : "#eff6ff", color: "#1e40af",
                    border: "1px solid #bfdbfe", padding: "6px 14px", borderRadius: 6,
                    cursor: "pointer", fontWeight: 600, fontSize: 13,
                    display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <FaMap /> {isTracking ? "Hide Map" : "Track Driver"}
                </button>
              )}

              {/* Print Receipt — only after Delivered */}
              {o.status === "Delivered" && (
                <InvoiceButton orderId={o.id} token={token} mode="receipt" />
              )}
            </div>

            {isTracking && o.assigned_driver_id && (
              <DriverMap driverId={o.assigned_driver_id} token={token} />
            )}
          </div>
        );
      })}
    </>
  );
};

/* ══════════════════════════════════════════════════
   DELIVERY / STOCK HISTORY
══════════════════════════════════════════════════ */
const DeliveryHistory = ({ token }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    axios
      .get(`${API}/client/delivery-history`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setHistory(Array.isArray(r.data) ? r.data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="loading-state">Loading delivery history…</div>;

  if (history.length === 0)
    return (
      <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
        <FaTruck style={{ fontSize: 32, color: "#cbd5e1", marginBottom: 10 }} />
        <p style={{ margin: 0, fontSize: 14 }}>No deliveries recorded yet.</p>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#94a3b8" }}>
          Delivery records appear here after cylinders are dispatched.
        </p>
      </div>
    );

  // Summary totals
  const totalCylinders = history.reduce((s, h) => s + h.quantity, 0);
  const totalValue     = history.reduce((s, h) => s + (h.total_value ?? 0), 0);

  return (
    <>
      {/* Summary bar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
        {[
          { label: "Total Cylinders Received", value: `${totalCylinders} cylinders`, accent: "#10b981", bg: "#f0fdf4" },
          { label: "Total Value",              value: fmt(totalValue),               accent: "#3b82f6", bg: "#eff6ff" },
        ].map((c) => (
          <div key={c.label} style={{
            background: c.bg, border: `1px solid ${c.accent}33`,
            borderLeft: `4px solid ${c.accent}`,
            borderRadius: 10, padding: "12px 16px",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
              {c.label}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
              {c.value}
            </div>
          </div>
        ))}
      </div>

      {/* History rows */}
      {history.map((h) => {
        const dt       = new Date(h.date);
        const dateStr  = dt.toLocaleDateString("en-LK", { day: "2-digit", month: "short", year: "numeric" });
        const timeStr  = dt.toLocaleTimeString("en-LK", { hour: "2-digit", minute: "2-digit" });

        return (
          <div key={h.id} style={{
            border: "1px solid #e2e8f0", borderRadius: 10, marginBottom: 10,
            padding: "14px 16px", background: "#fff",
            display: "flex", justifyContent: "space-between",
            flexWrap: "wrap", gap: 12, alignItems: "center",
          }}>
            {/* Left: date + order ref */}
            <div style={{ minWidth: 110 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{dateStr}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{timeStr}</div>
              {h.order_number && (
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 3, fontFamily: "monospace" }}>
                  Order #{h.order_number}
                </div>
              )}
            </div>

            {/* Centre: cylinder info */}
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>
                {h.cylinder_name || "—"}
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                {h.weight ? `${h.weight} kg` : ""}{h.warehouse ? ` · ${h.warehouse}` : ""}
              </div>
            </div>

            {/* Right: quantity + value */}
            <div style={{ textAlign: "right", minWidth: 120 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "#d1fae5", color: "#065f46",
                padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                marginBottom: 4,
              }}>
                <FaBoxes style={{ fontSize: 11 }} /> {h.quantity} cylinders
              </div>
              <div style={{ fontSize: 13, color: "#475569" }}>
                {h.unit_price ? (
                  <span style={{ fontSize: 11, color: "#64748b" }}>
                    {fmt(h.unit_price)} × {h.quantity}
                  </span>
                ) : null}
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
                {fmt(h.total_value)}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};

/* ══════════════════════════════════════════════════
   MAIN TAB COMPONENT
══════════════════════════════════════════════════ */
const OrderHistoryTab = ({ token, refreshKey }) => {
  const [activeTab, setActiveTab] = useState("orders"); // "orders" | "deliveries"

  const TAB_BTN = (key, label, icon) => (
    <button
      key={key}
      onClick={() => setActiveTab(key)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "8px 18px", borderRadius: 8, cursor: "pointer",
        fontWeight: 600, fontSize: 13, border: "none",
        transition: "all 0.15s",
        background: activeTab === key ? "#1e40af" : "#f1f5f9",
        color:      activeTab === key ? "#fff"    : "#475569",
        boxShadow:  activeTab === key ? "0 2px 8px rgba(30,64,175,0.25)" : "none",
      }}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="client-card full-width">
      {/* ── Tab toggle header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <h3 className="client-section-title" style={{ margin: 0 }}>History</h3>
        <div style={{ display: "flex", gap: 8 }}>
          {TAB_BTN("orders",     "Order History",    <FaClipboardList />)}
          {TAB_BTN("deliveries", "Delivery History", <FaTruck />)}
        </div>
      </div>

      {/* ── Tab content ── */}
      {activeTab === "orders"     && <OrderHistory    token={token} refreshKey={refreshKey} />}
      {activeTab === "deliveries" && <DeliveryHistory token={token} />}
    </div>
  );
};

export default OrderHistoryTab;
