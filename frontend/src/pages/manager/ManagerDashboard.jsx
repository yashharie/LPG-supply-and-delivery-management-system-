import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import {
  FaTruck, FaPhoneAlt, FaMapMarkerAlt, FaFileInvoice,
  FaPlus, FaTrashAlt, FaHistory, FaBoxes, FaSync,
  FaChevronDown, FaChevronUp,
} from "react-icons/fa";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { confirmDialog, toast, errorAlert } from "../../utils/swal";
import InvoiceButton from "../../components/InvoiceButton";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const API     = "http://127.0.0.1:8000/api";
const STORAGE = "http://127.0.0.1:8000/storage/";

const fmt = (n) => n != null
  ? `LKR ${parseFloat(n).toLocaleString("en-LK", { minimumFractionDigits: 2 })}` : "—";

/* ── Status config ── */
const STATUS = {
  "Pending":            { dot: "#f59e0b", bg: "#fffbeb", text: "#92400e" },
  "Approved":           { dot: "#3b82f6", bg: "#eff6ff", text: "#1e40af" },
  "Out for Delivery":   { dot: "#8b5cf6", bg: "#f5f3ff", text: "#6d28d9" },
  "Delivered":          { dot: "#10b981", bg: "#f0fdf4", text: "#065f46" },
  "Rejected":           { dot: "#ef4444", bg: "#fef2f2", text: "#991b1b" },
  "Cancelled":          { dot: "#94a3b8", bg: "#f8fafc", text: "#475569" },
  "Partially Delivered":{ dot: "#f97316", bg: "#fff7ed", text: "#c2410c" },
};
const sc = (s) => STATUS[s] ?? { dot: "#94a3b8", bg: "#f8fafc", text: "#475569" };

/* ── Driver tracking map ── */
const DriverLocMap = ({ driverId, token }) => {
  const [loc, setLoc] = useState(null);
  const poll = useCallback(() => {
    axios.get(`${API}/driver/${driverId}/location`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setLoc(r.data)).catch(() => {});
  }, [driverId, token]);
  useEffect(() => { poll(); const t = setInterval(poll, 10000); return () => clearInterval(t); }, [poll]);
  if (!loc?.lat || !loc?.lng)
    return <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 8, padding: "8px 0" }}>Waiting for driver GPS…</p>;
  return (
    <div style={{ height: 180, borderRadius: 10, overflow: "hidden", marginTop: 10, border: "1px solid #e0e7ff" }}>
      <MapContainer center={[loc.lat, loc.lng]} zoom={14} style={{ height: "100%", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[loc.lat, loc.lng]}><Popup>🚚 {loc.name}</Popup></Marker>
      </MapContainer>
    </div>
  );
};

/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
const ManagerDashboard = () => {
  const [data,            setData]            = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState("");
  const [expandRow,       setExpandRow]       = useState(null);
  const [activeTab,       setActiveTab]       = useState("orders"); // orders | stock
  const [stockTab,        setStockTab]        = useState("levels");
  const [stockForm,       setStockForm]       = useState({ cylinder_type_id: "", quantity: "" });
  const [stockSubmitting, setStockSubmitting] = useState(false);
  const [stockHistory,    setStockHistory]    = useState([]);
  const [orderFilter,     setOrderFilter]     = useState("all");

  const token = useRef(localStorage.getItem("token") || "").current;

  const fetchData = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/manager/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setData(r.data))
      .catch(() => setError("Failed to load dashboard."))
      .finally(() => setLoading(false));
    axios.get(`${API}/manager/stock-history`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setStockHistory(r.data)).catch(() => {});
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const act = async (url, body = {}, opts = {}) => {
    if (opts.confirm) { const ok = await confirmDialog(opts.confirm); if (!ok) return; }
    try {
      await axios.post(url, body, { headers: { Authorization: `Bearer ${token}` } });
      toast(opts.msg ?? "Done.");
      fetchData();
    } catch (err) {
      errorAlert("Failed", err.response?.data?.message || "Action failed.");
    }
  };

  const handleAssignDriver = async (orderId, driverId) => {
    if (!driverId) return;
    const ok = await confirmDialog({ title: "Assign this driver?", confirmText: "Assign" });
    if (!ok) return;
    try {
      await axios.post(`${API}/manager/orders/${orderId}/assign-driver`, { driver_id: driverId },
        { headers: { Authorization: `Bearer ${token}` } });
      toast("Driver assigned.");
      fetchData();
    } catch (err) {
      errorAlert("Failed", err.response?.data?.message || "Could not assign driver.");
    }
  };

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    if (!data?.warehouse) return;
    setStockSubmitting(true);
    try {
      await axios.post(`${API}/manager/stock`,
        { cylinder_type_id: parseInt(stockForm.cylinder_type_id), quantity: parseInt(stockForm.quantity) },
        { headers: { Authorization: `Bearer ${token}` } });
      toast(`${stockForm.quantity} cylinders added.`);
      setStockForm({ cylinder_type_id: "", quantity: "" });
      fetchData();
    } catch (err) {
      errorAlert("Stock Error", err.response?.data?.message || "Failed.");
    } finally { setStockSubmitting(false); }
  };

  const handleStockDelete = async (id, label) => {
    const ok = await confirmDialog({ title: `Remove "${label}"?`, confirmText: "Remove", danger: true });
    if (!ok) return;
    try {
      await axios.delete(`${API}/manager/stock/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast("Removed.", "warning"); fetchData();
    } catch { errorAlert("Failed", "Could not remove."); }
  };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", gap:12, color:"#94a3b8", fontFamily:"'Segoe UI',sans-serif" }}>
      <div style={{ width:20, height:20, border:"2px solid #e2e8f0", borderTopColor:"#3b82f6", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
      Loading dashboard…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (error) return <div style={{ padding:40, color:"#ef4444", fontFamily:"sans-serif" }}>{error}</div>;

  const { manager, warehouse, stats, recent_orders, drivers, stock = [], cylinder_types = [] } = data;

  const usedCap  = stock.reduce((s, x) => s + x.quantity, 0);
  const availCap = warehouse ? warehouse.capacity - usedCap : 0;
  const pct      = warehouse?.capacity > 0 ? Math.min(100, (usedCap / warehouse.capacity) * 100) : 0;
  const wouldExceed = stockForm.quantity !== "" && parseInt(stockForm.quantity) > availCap;

  const stockIn  = stockHistory.filter(h => h.type === "in");
  const stockOut = stockHistory.filter(h => h.type === "out");

  // Filter orders
  const filteredOrders = orderFilter === "all" ? recent_orders
    : recent_orders.filter(o => o.status.toLowerCase().includes(orderFilter));

  const statCards = [
    { label: "Total Orders",  value: stats.total_orders,     accent: "#3b82f6" },
    { label: "Pending",       value: stats.pending_orders,   accent: "#f59e0b" },
    { label: "Approved",      value: stats.approved_orders,  accent: "#6366f1" },
    { label: "Delivered",     value: stats.delivered_orders, accent: "#10b981" },
    { label: "Stock Units",   value: stats.total_stock,      accent: "#0ea5e9" },
  ];

  const stockValue = stock.reduce((s, st) => {
    const ct = cylinder_types.find(c => c.id === st.cylinder_type_id);
    return s + (ct ? parseFloat(ct.price) * st.quantity : 0);
  }, 0);

  return (
    <div style={{ minHeight:"100vh", background:"#f0f4fa", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .mgr-input { width:100%; padding:9px 12px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:13px; background:#fff; outline:none; box-sizing:border-box; transition:border-color .15s; }
        .mgr-input:focus { border-color:#3b82f6; }
        .mgr-select { width:100%; padding:9px 12px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:13px; background:#fff; outline:none; cursor:pointer; }
      `}</style>

      {/* ══ PAGE HEADER ══ */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e8edf5", padding:"20px 32px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", letterSpacing:1.5, textTransform:"uppercase", marginBottom:4 }}>
            Warehouse Manager
          </div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:"#0f172a", letterSpacing:"-0.4px" }}>
            {manager.name}
          </h1>
          {warehouse && (
            <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4, fontSize:13, color:"#475569" }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:"#10b981" }} />
              {warehouse.name} · {warehouse.address}
            </div>
          )}
        </div>
        <button onClick={fetchData} style={{
          display:"flex", alignItems:"center", gap:7,
          padding:"8px 16px", borderRadius:8, border:"1.5px solid #e2e8f0",
          background:"#fff", color:"#475569", fontSize:13, fontWeight:600, cursor:"pointer",
        }}>
          <FaSync style={{ fontSize:11 }} /> Refresh
        </button>
      </div>

      {/* ══ KPI STRIP ══ */}
      <div style={{ padding:"20px 32px 0", display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:14 }}>
        {statCards.map((c) => (
          <div key={c.label}
            onClick={() => {
              if (c.label === "Total Orders")  { setActiveTab("orders"); setOrderFilter("all"); }
              if (c.label === "Pending")        { setActiveTab("orders"); setOrderFilter("pending"); }
              if (c.label === "Approved")       { setActiveTab("orders"); setOrderFilter("approved"); }
              if (c.label === "Delivered")      { setActiveTab("orders"); setOrderFilter("delivered"); }
              if (c.label === "Stock Units")    { setActiveTab("stock");  setStockTab("levels"); }
            }}
            style={{
              background:"#fff", borderRadius:12, padding:"18px 20px",
              boxShadow:"0 1px 3px rgba(15,23,42,.06)",
              borderTop:`3px solid ${c.accent}`,
              position:"relative", overflow:"hidden",
              cursor:"pointer", transition:"transform .15s, box-shadow .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 4px 14px rgba(15,23,42,.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 1px 3px rgba(15,23,42,.06)"; }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>
              {c.label}
            </div>
            <div style={{ fontSize:30, fontWeight:900, color:"#0f172a", lineHeight:1 }}>
              {c.value.toLocaleString()}
            </div>
            <div style={{
              position:"absolute", right:12, bottom:12,
              width:32, height:32, borderRadius:"50%",
              background:`${c.accent}18`,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <div style={{ width:14, height:14, borderRadius:"50%", background:c.accent, opacity:0.5 }} />
            </div>
          </div>
        ))}
      </div>

      {/* ══ STOCK VALUE BANNER ══ */}
      {warehouse && (
        <div style={{ padding:"14px 32px 0" }}>
          <div style={{
            background:"linear-gradient(135deg,#1e3a8a 0%,#1e40af 60%,#3b82f6 100%)",
            borderRadius:12, padding:"16px 24px",
            display:"flex", justifyContent:"space-between", alignItems:"center",
            boxShadow:"0 4px 20px rgba(30,64,175,.2)",
          }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.6)", letterSpacing:1.5, textTransform:"uppercase", marginBottom:4 }}>
                Warehouse Inventory Value
              </div>
              <div style={{ fontSize:28, fontWeight:900, color:"#fff" }}>{fmt(stockValue)}</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.6)", marginTop:4 }}>
                {usedCap} cylinders · {warehouse.capacity - usedCap} space remaining
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.6)", marginBottom:6 }}>Capacity Used</div>
              <div style={{ fontSize:24, fontWeight:900, color:"#fff" }}>{pct.toFixed(0)}%</div>
              <div style={{ width:120, background:"rgba(255,255,255,.2)", borderRadius:4, height:6, marginTop:8 }}>
                <div style={{ width:`${pct}%`, height:"100%", borderRadius:4, background: pct>85?"#fbbf24":pct>60?"#a5f3fc":"rgba(255,255,255,.8)", transition:"width .4s" }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MAIN TABS ══ */}
      <div style={{ padding:"20px 32px 0", display:"flex", gap:4 }}>
        {[
          { key:"orders", label:"Warehouse Orders", count: recent_orders.length },
          { key:"stock",  label:"Inventory",        count: stock.length },
        ].map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding:"10px 22px", borderRadius:"10px 10px 0 0",
            border:"1.5px solid #e2e8f0", borderBottom: activeTab===t.key ? "none" : "1.5px solid #e2e8f0",
            background: activeTab===t.key ? "#fff" : "transparent",
            color: activeTab===t.key ? "#0f172a" : "#64748b",
            fontSize:13, fontWeight:700, cursor:"pointer", position:"relative",
            marginBottom: activeTab===t.key ? "-1px" : 0,
          }}>
            {t.label}
            <span style={{
              marginLeft:8, padding:"1px 7px", borderRadius:10, fontSize:11,
              background: activeTab===t.key ? "#eff6ff" : "#f1f5f9",
              color: activeTab===t.key ? "#1e40af" : "#94a3b8", fontWeight:700,
            }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ══ TAB CONTENT ══ */}
      <div style={{ padding:"0 32px 32px" }}>
        <div style={{ background:"#fff", borderRadius:"0 12px 12px 12px", border:"1.5px solid #e2e8f0", minHeight:400 }}>

          {/* ── ORDERS TAB ── */}
          {activeTab === "orders" && (
            <div>
              {/* Order filter bar */}
              <div style={{ padding:"16px 24px", borderBottom:"1px solid #f1f5f9", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                <span style={{ fontSize:12, fontWeight:600, color:"#94a3b8", marginRight:4 }}>FILTER:</span>
                {["all","pending","approved","out for delivery","delivered","partially"].map((f) => (
                  <button key={f} onClick={() => setOrderFilter(f)} style={{
                    padding:"4px 12px", borderRadius:20, border:"none", cursor:"pointer",
                    fontSize:12, fontWeight:600,
                    background: orderFilter===f ? "#1e40af" : "#f1f5f9",
                    color:      orderFilter===f ? "#fff"    : "#64748b",
                    transition:"all .15s",
                  }}>
                    {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              {filteredOrders.length === 0 && (
                <div style={{ padding:40, textAlign:"center", color:"#94a3b8", fontSize:14 }}>
                  No orders found.
                </div>
              )}

              {filteredOrders.map((o) => {
                const s      = sc(o.status);
                const isOpen = expandRow === o.id;

                return (
                  <div key={o.id} style={{ borderBottom:"1px solid #f8fafc" }}>
                    {/* ── Row ── */}
                    <div style={{
                      padding:"16px 24px",
                      display:"grid",
                      gridTemplateColumns:"32px 1fr 160px 120px 120px 140px 32px",
                      alignItems:"center", gap:12,
                      cursor:"pointer",
                    }}
                    onClick={() => setExpandRow(isOpen ? null : o.id)}>

                      {/* Status dot */}
                      <div style={{ display:"flex", justifyContent:"center" }}>
                        <div style={{ width:10, height:10, borderRadius:"50%", background:s.dot, boxShadow:`0 0 0 3px ${s.dot}30` }} />
                      </div>

                      {/* Order + client */}
                      <div>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                          <span style={{ fontFamily:"monospace", fontWeight:800, fontSize:13, color:"#0f172a" }}>
                            #{o.order_number}
                          </span>
                          {(o.order_type === "PARTIAL_PENDING") && (
                            <span style={{ fontSize:9, fontWeight:700, background:"#fff7ed", color:"#c2410c", border:"1px solid #fed7aa", padding:"1px 6px", borderRadius:10 }}>
                              PARTIAL
                            </span>
                          )}
                          {(o.order_type === "PRE_ORDER") && (
                            <span style={{ fontSize:9, fontWeight:700, background:"#f5f3ff", color:"#6d28d9", border:"1px solid #ddd6fe", padding:"1px 6px", borderRadius:10 }}>
                              PRE-ORDER
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize:12, color:"#64748b" }}>
                          {o.user?.name ?? "—"}
                          {o.user?.phone && <span style={{ marginLeft:8 }}>· {o.user.phone}</span>}
                        </div>
                      </div>

                      {/* Status badge */}
                      <div>
                        <span style={{
                          display:"inline-flex", alignItems:"center", gap:5,
                          padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                          background:s.bg, color:s.text,
                        }}>
                          {o.status}
                        </span>
                      </div>

                      {/* Quantity */}
                      <div style={{ textAlign:"right" }}>
                        <span style={{ fontWeight:800, fontSize:15, color:"#0f172a" }}>{o.total_quantity}</span>
                        <span style={{ fontSize:11, color:"#94a3b8", marginLeft:3 }}>cyl</span>
                      </div>

                      {/* Amount */}
                      <div style={{ textAlign:"right", fontWeight:700, fontSize:13, color:"#1e40af" }}>
                        {fmt(o.total_amount)}
                      </div>

                      {/* Quick actions */}
                      <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }} onClick={(e) => e.stopPropagation()}>
                        {o.receipt_path && (
                          <a href={STORAGE + o.receipt_path} target="_blank" rel="noreferrer"
                            style={{ fontSize:12, color:"#64748b", display:"inline-flex", alignItems:"center", gap:4 }}>
                            <FaFileInvoice />
                          </a>
                        )}
                        <InvoiceButton orderId={o.id} token={token} mode="invoice" label="" style={{ padding:"4px 8px" }} />
                      </div>

                      {/* Expand chevron */}
                      <div style={{ color:"#94a3b8", fontSize:11 }}>
                        {isOpen ? <FaChevronUp /> : <FaChevronDown />}
                      </div>
                    </div>

                    {/* ── Expanded detail panel ── */}
                    {isOpen && (
                      <div style={{ padding:"0 24px 20px 24px", borderTop:"1px solid #f8fafc" }}>
                        {/* Customer Information Grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 16, marginBottom: 16, background: "#f8fafc", padding: 16, borderRadius: 10, border: "1px solid #e2e8f0" }}>
                          <div>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Customer Name</span>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginTop: 2 }}>{o.user?.name ?? "—"}</div>
                          </div>
                          <div>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Company Name</span>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginTop: 2 }}>{o.user?.company_name || "—"}</div>
                          </div>
                          <div>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Contact Number</span>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginTop: 2 }}>{o.user?.phone ?? "—"}</div>
                          </div>
                          <div>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Order Date</span>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginTop: 2 }}>{new Date(o.created_at).toLocaleDateString()}</div>
                          </div>
                          <div style={{ gridColumn: "span 2" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Delivery Address</span>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginTop: 2 }}>{o.user?.address ?? "—"}</div>
                          </div>
                          <div>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Order Status</span>
                            <div style={{ fontSize: 13, fontWeight: 600, color: s.text, marginTop: 2 }}>{o.status}</div>
                          </div>
                          <div>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Assigned Warehouse</span>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginTop: 2 }}>{o.warehouse?.name ?? "—"}</div>
                          </div>
                        </div>

                        <div style={{ display:"grid", gridTemplateColumns:"1.2fr 0.8fr", gap:16 }}>

                          {/* Left: Ordered Cylinders Table */}
                          <div style={{ background:"#fff", borderRadius:10, padding:"14px 16px", border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", letterSpacing:1.2, textTransform:"uppercase", marginBottom:10 }}>Ordered Cylinders</div>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                              <thead>
                                <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#f1f5f9", textAlign: "left" }}>
                                  <th style={{ padding: "8px 12px", color: "#475569", fontWeight: 700 }}>Cylinder Type</th>
                                  <th style={{ padding: "8px 12px", color: "#475569", fontWeight: 700, textAlign: "right" }}>Ordered</th>
                                  <th style={{ padding: "8px 12px", color: "#475569", fontWeight: 700, textAlign: "right" }}>Delivered</th>
                                  <th style={{ padding: "8px 12px", color: "#475569", fontWeight: 700, textAlign: "right" }}>Remaining</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(typeof o.items_summary === "string" ? JSON.parse(o.items_summary) : (o.items_summary ?? [])).map((item, idx) => {
                                  const name = item.name || `${item.brand} ${item.kgWeight || item.weight}kg`;
                                  const ordered = Number(item.quantity || 0);
                                  const delivered = Number(item.delivered_qty || 0);
                                  const remaining = Math.max(0, ordered - delivered);
                                  return (
                                    <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                      <td style={{ padding: "8px 12px", color: "#334155" }}>{name}</td>
                                      <td style={{ padding: "8px 12px", color: "#334155", textAlign: "right", fontWeight: "600" }}>{ordered}</td>
                                      <td style={{ padding: "8px 12px", color: "#10b981", textAlign: "right", fontWeight: "600" }}>{delivered}</td>
                                      <td style={{ padding: "8px 12px", color: remaining > 0 ? "#1e40af" : "#64748b", textAlign: "right", fontWeight: "600" }}>{remaining}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>

                            {/* Partial notice */}
                            {(o.order_type === "PARTIAL_PENDING" || o.order_type === "PRE_ORDER") && (
                              <div style={{ marginTop:12, padding:"10px 12px", borderRadius:8,
                                background: o.order_type === "PRE_ORDER" ? "#f5f3ff" : "#fff7ed",
                                border:`1px solid ${o.order_type === "PRE_ORDER" ? "#ddd6fe" : "#fed7aa"}`,
                                fontSize:12, lineHeight:1.7,
                                color: o.order_type === "PRE_ORDER" ? "#6d28d9" : "#c2410c" }}>
                                {o.order_type === "PARTIAL_PENDING" ? (
                                  <><strong>Batch size:</strong> {o.remaining_quantity} cyl &nbsp;·&nbsp; <strong>Delivered:</strong> {o.delivered_quantity} &nbsp;·&nbsp; <strong>Pending:</strong> {o.pending_quantity} &nbsp;·&nbsp; <strong>Original:</strong> {o.requested_quantity}</>
                                ) : (
                                  <><strong>Pre-order:</strong> {o.requested_quantity} cyl · pending {o.pending_quantity}</>
                                )}
                              </div>
                            )}
                          </div>
 
                          {/* Right: actions */}
                          <div style={{ background:"#f8fafc", borderRadius:10, padding:"14px 16px", border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", letterSpacing:1.2, textTransform:"uppercase", marginBottom:10 }}>Actions</div>
 
                            {/* Approve / Reject */}
                            {o.status === "Pending" && (
                              <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                                {o.order_type === "PARTIAL_PENDING" && (
                                  <span style={{ fontSize:10, background:"#fff7ed", color:"#c2410c", border:"1px solid #fed7aa", padding:"3px 8px", borderRadius:10, fontWeight:700, alignSelf:"center" }}>
                                    📦 Batch {o.remaining_quantity}
                                  </span>
                                )}
                                <button onClick={() => act(`${API}/manager/orders/${o.id}/approve`, {}, { msg:"Approved.", confirm:{ title:"Approve this order?", confirmText:"Approve" } })}
                                  style={{ background:"#10b981", color:"#fff", border:"none", padding:"7px 16px", borderRadius:7, cursor:"pointer", fontWeight:700, fontSize:12 }}>
                                  {(o.order_type==="PARTIAL_PENDING"||o.order_type==="PRE_ORDER") ? "Approve Batch" : "Approve"}
                                </button>
                                <button onClick={() => act(`${API}/manager/orders/${o.id}/reject`, {}, { msg:"Rejected.", confirm:{ title:"Reject this order?", confirmText:"Reject", danger:true } })}
                                  style={{ background:"#fff", color:"#ef4444", border:"1.5px solid #fecaca", padding:"7px 16px", borderRadius:7, cursor:"pointer", fontWeight:700, fontSize:12 }}>
                                  Reject
                                </button>
                              </div>
                            )}
 
                            {/* Assign driver */}
                            {(o.status === "Approved" || o.status === "Partially Delivered") && !o.trip_id && (
                              <div style={{ marginBottom:10 }}>
                                {o.assigned_driver_id ? (
                                  <div>
                                    <div style={{ fontSize:12, color:"#10b981", fontWeight:600, marginBottom:6 }}>
                                      ✅ {drivers.find(d=>d.id===o.assigned_driver_id)?.name ?? `Driver #${o.assigned_driver_id}`} assigned
                                    </div>
                                    <div style={{ fontSize:11, color:"#94a3b8", marginBottom:6 }}>Waiting for driver to start trip</div>
                                    <select className="mgr-select" style={{ fontSize:12 }} defaultValue="" onChange={(e) => handleAssignDriver(o.id, e.target.value)}>
                                      <option value="" disabled>Reassign driver…</option>
                                      {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                  </div>
                                ) : (
                                  <div>
                                    <div style={{ fontSize:11, color:"#94a3b8", marginBottom:6, fontWeight:600 }}>ASSIGN DRIVER</div>
                                    <select className="mgr-select" defaultValue="" onChange={(e) => handleAssignDriver(o.id, e.target.value)}>
                                      <option value="" disabled>Select driver…</option>
                                      {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                  </div>
                                )}
                              </div>
                            )}
 
                            {/* Track driver */}
                            {o.status === "Out for Delivery" && o.assigned_driver_id && (
                              <DriverLocMap driverId={o.assigned_driver_id} token={token} />
                            )}
 
                            {/* Fulfilled */}
                            {o.order_type === "FULFILLED" && (
                              <div style={{ fontSize:12, color:"#10b981", fontWeight:600 }}>
                                ✅ All deliveries complete
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── INVENTORY TAB ── */}
          {activeTab === "stock" && (
            <div style={{ padding:"0 0" }}>
              {/* Sub-tabs */}
              <div style={{ padding:"14px 24px", borderBottom:"1px solid #f1f5f9", display:"flex", gap:4 }}>
                {[
                  { key:"levels",   label:"Stock Levels"   },
                  { key:"add",      label:"Add Stock"      },
                  { key:"history",  label:"Movement History" },
                ].map((t) => (
                  <button key={t.key} onClick={() => setStockTab(t.key)} style={{
                    padding:"6px 16px", borderRadius:8, border:"none", cursor:"pointer",
                    fontWeight:600, fontSize:12,
                    background: stockTab===t.key ? "#eff6ff" : "transparent",
                    color:      stockTab===t.key ? "#1e40af" : "#64748b",
                    borderBottom: stockTab===t.key ? "2px solid #3b82f6" : "2px solid transparent",
                  }}>{t.label}</button>
                ))}
              </div>

              <div style={{ padding:"20px 24px" }}>

                {/* STOCK LEVELS */}
                {stockTab === "levels" && (
                  <div>
                    {warehouse && (
                      <div style={{ marginBottom:20 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#64748b", marginBottom:6 }}>
                          <span>Capacity: <strong style={{ color:"#0f172a" }}>{usedCap.toLocaleString()}</strong> / {warehouse.capacity.toLocaleString()}</span>
                          <span style={{ fontWeight:700, color: pct>85?"#ef4444":pct>60?"#f59e0b":"#10b981" }}>{pct.toFixed(0)}%</span>
                        </div>
                        <div style={{ background:"#f1f5f9", borderRadius:6, height:8, overflow:"hidden" }}>
                          <div style={{ width:`${pct}%`, height:"100%", borderRadius:6, background: pct>85?"#ef4444":pct>60?"#f59e0b":"#3b82f6", transition:"width .4s" }} />
                        </div>
                      </div>
                    )}
                    {stock.length === 0 ? (
                      <p style={{ color:"#94a3b8", textAlign:"center", padding:24 }}>No stock entries.</p>
                    ) : (
                      <table style={{ width:"100%", borderCollapse:"collapse" }}>
                        <thead>
                          <tr style={{ borderBottom:"2px solid #f1f5f9" }}>
                            {["Cylinder","Brand","Weight","Qty","Unit Price","Stock Value",""].map(h => (
                              <th key={h} style={{ padding:"8px 12px", fontSize:11, fontWeight:700, color:"#94a3b8", textAlign: h===""?"right":"left", letterSpacing:0.8, textTransform:"uppercase" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {stock.map((s) => {
                            const ct  = cylinder_types.find(c => c.id === s.cylinder_type_id) ?? s.cylinder_type;
                            const lbl = `${ct?.brand?.name ?? ""} ${ct?.name ?? ""} (${ct?.weight ?? ""}kg)`;
                            const val = ct?.price ? parseFloat(ct.price)*s.quantity : null;
                            return (
                              <tr key={s.id} style={{ borderBottom:"1px solid #f8fafc" }}>
                                <td style={{ padding:"12px 12px", fontWeight:600, color:"#0f172a", fontSize:13 }}>{ct?.name ?? `#${s.cylinder_type_id}`}</td>
                                <td style={{ padding:"12px 12px", fontSize:12, color:"#64748b" }}>{ct?.brand?.name ?? "—"}</td>
                                <td style={{ padding:"12px 12px", fontSize:12, color:"#64748b" }}>{ct?.weight ?? "—"} kg</td>
                                <td style={{ padding:"12px 12px" }}>
                                  <span style={{ fontWeight:800, fontSize:15, color: s.quantity<10?"#ef4444":"#0f172a" }}>{s.quantity}</span>
                                  {s.quantity < 10 && <span style={{ marginLeft:6, fontSize:9, fontWeight:700, background:"#fef2f2", color:"#ef4444", padding:"1px 5px", borderRadius:8 }}>LOW</span>}
                                </td>
                                <td style={{ padding:"12px 12px", fontSize:13, color:"#3b82f6", fontWeight:600 }}>{ct?.price ? fmt(ct.price) : "—"}</td>
                                <td style={{ padding:"12px 12px", fontSize:13, fontWeight:700, color:"#0f172a" }}>{val ? fmt(val) : "—"}</td>
                                <td style={{ padding:"12px 12px", textAlign:"right" }}>
                                  <button onClick={() => handleStockDelete(s.id, lbl)}
                                    style={{ background:"none", border:"none", color:"#fca5a5", cursor:"pointer", fontSize:13 }}
                                    title="Remove"><FaTrashAlt /></button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* ADD STOCK */}
                {stockTab === "add" && warehouse && (
                  <div style={{ maxWidth:480 }}>
                    <form onSubmit={handleStockSubmit}>
                      <div style={{ marginBottom:16 }}>
                        <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#334155", marginBottom:6 }}>Cylinder Type</label>
                        <select name="cylinder_type_id" value={stockForm.cylinder_type_id}
                          onChange={(e) => setStockForm(p => ({...p, cylinder_type_id:e.target.value}))}
                          required className="mgr-select">
                          <option value="">— Select —</option>
                          {cylinder_types.map((ct) => (
                            <option key={ct.id} value={ct.id}>
                              {ct.brand?.name} — {ct.name} ({ct.weight}kg) · LKR {parseFloat(ct.price??0).toLocaleString()}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ marginBottom:16 }}>
                        <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#334155", marginBottom:6 }}>
                          Quantity
                          {availCap > 0 && <span style={{ float:"right", color:"#94a3b8", fontWeight:400 }}>Space: {availCap}</span>}
                        </label>
                        <input type="number" min={1} max={availCap>0?availCap:undefined} value={stockForm.quantity}
                          onChange={(e) => setStockForm(p => ({...p, quantity:e.target.value}))}
                          placeholder="e.g. 100" required className="mgr-input"
                          style={{ borderColor: wouldExceed?"#ef4444":"#e2e8f0" }} />
                        {wouldExceed && <p style={{ color:"#ef4444", fontSize:11, marginTop:4 }}>Exceeds capacity. Max: {availCap}</p>}
                      </div>

                      {/* Price preview */}
                      {stockForm.cylinder_type_id && parseInt(stockForm.quantity) > 0 && (() => {
                        const ct = cylinder_types.find(c => String(c.id) === String(stockForm.cylinder_type_id));
                        if (!ct?.price) return null;
                        const total = parseFloat(ct.price) * parseInt(stockForm.quantity||0);
                        return (
                          <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:13 }}>
                            <div style={{ display:"flex", justifyContent:"space-between" }}>
                              <span style={{ color:"#64748b" }}>Unit price</span>
                              <strong>{fmt(ct.price)}</strong>
                            </div>
                            <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                              <span style={{ color:"#64748b" }}>Total value</span>
                              <strong style={{ color:"#1e40af" }}>{fmt(total)}</strong>
                            </div>
                          </div>
                        );
                      })()}

                      <button type="submit" disabled={stockSubmitting||wouldExceed||availCap<=0}
                        style={{ display:"flex", alignItems:"center", gap:7, background:"#1e40af", color:"#fff", border:"none",
                          padding:"10px 24px", borderRadius:8, fontWeight:700, fontSize:13, cursor:"pointer", opacity: stockSubmitting?"0.7":1 }}>
                        <FaPlus style={{ fontSize:11 }} />
                        {stockSubmitting ? "Adding…" : "Add Stock"}
                      </button>
                    </form>
                  </div>
                )}

                {/* MOVEMENT HISTORY */}
                {stockTab === "history" && (
                  <div>
                    {/* Summary */}
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
                      {[
                        { label:"Total IN",  value:`${stockIn.reduce((s,h)=>s+h.quantity,0)} cyl`, sub: fmt(stockIn.reduce((s,h)=>s+(h.cylinder_type?.price?parseFloat(h.cylinder_type.price)*h.quantity:0),0)), accent:"#10b981", bg:"#f0fdf4" },
                        { label:"Total OUT", value:`${stockOut.reduce((s,h)=>s+h.quantity,0)} cyl`, sub: fmt(stockOut.reduce((s,h)=>s+(h.cylinder_type?.price?parseFloat(h.cylinder_type.price)*h.quantity:0),0)), accent:"#f59e0b", bg:"#fffbeb" },
                      ].map((c) => (
                        <div key={c.label} style={{ background:c.bg, borderRadius:10, padding:"14px 16px", borderLeft:`3px solid ${c.accent}` }}>
                          <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:0.8 }}>{c.label}</div>
                          <div style={{ fontSize:20, fontWeight:800, color:"#0f172a", marginTop:4 }}>{c.value}</div>
                          <div style={{ fontSize:12, color:"#64748b" }}>{c.sub}</div>
                        </div>
                      ))}
                    </div>

                    {stockHistory.length === 0 ? (
                      <p style={{ color:"#94a3b8", textAlign:"center", padding:24 }}>No movements recorded.</p>
                    ) : (
                      <div style={{ overflowX:"auto" }}>
                        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                          <thead>
                            <tr style={{ borderBottom:"2px solid #f1f5f9" }}>
                              {["Date/Time","Cylinder","Move","Qty","Unit Price","Total","By"].map(h => (
                                <th key={h} style={{ padding:"8px 10px", fontSize:10, fontWeight:700, color:"#94a3b8", letterSpacing:0.8, textTransform:"uppercase", textAlign:"left" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {stockHistory.map((h) => {
                              const ct    = h.cylinder_type;
                              const price = ct?.price!=null ? parseFloat(ct.price) : null;
                              const total = price!=null ? price*h.quantity : null;
                              const dt    = new Date(h.created_at);
                              return (
                                <tr key={h.id} style={{ borderBottom:"1px solid #f8fafc" }}>
                                  <td style={{ padding:"10px 10px" }}>
                                    <div style={{ fontWeight:600, color:"#0f172a" }}>{dt.toLocaleDateString("en-LK",{day:"2-digit",month:"short",year:"numeric"})}</div>
                                    <div style={{ fontSize:10, color:"#94a3b8" }}>{dt.toLocaleTimeString("en-LK",{hour:"2-digit",minute:"2-digit"})}</div>
                                  </td>
                                  <td style={{ padding:"10px 10px" }}>
                                    {ct ? <><div style={{ fontWeight:600 }}>{ct.brand?.name} {ct.name}</div><div style={{ fontSize:10, color:"#94a3b8" }}>{ct.weight}kg</div></> : "—"}
                                  </td>
                                  <td style={{ padding:"10px 10px" }}>
                                    <span style={{ padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700,
                                      background: h.type==="in"?"#d1fae5":"#fff7ed",
                                      color:      h.type==="in"?"#065f46":"#c2410c" }}>
                                      {h.type==="in"?"📥 IN":"📤 OUT"}
                                    </span>
                                  </td>
                                  <td style={{ padding:"10px 10px", fontWeight:800, color:"#0f172a" }}>{h.quantity}</td>
                                  <td style={{ padding:"10px 10px", color:"#3b82f6", fontWeight:600 }}>{price!=null?fmt(price):"—"}</td>
                                  <td style={{ padding:"10px 10px", fontWeight:700, color: h.type==="in"?"#065f46":"#991b1b" }}>{total!=null?fmt(total):"—"}</td>
                                  <td style={{ padding:"10px 10px", color:"#64748b" }}>{h.user?.name ?? "System"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
