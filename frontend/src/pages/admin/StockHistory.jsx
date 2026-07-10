import { useEffect, useState } from "react";
import axios from "axios";
import DataTable from "../../components/DataTable";
import { errorAlert } from "../../utils/swal";
import { FaHistory, FaSync } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "../../styles/AdminPages.css";

const API = "http://127.0.0.1:8000/api";

const fmt = (n) =>
  n != null ? `LKR ${parseFloat(n).toLocaleString("en-LK", { minimumFractionDigits: 2 })}` : "—";

const StockHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const fetchHistory = () => {
    setLoading(true);
    axios.get(`${API}/stock-history`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setHistory(r.data))
      .catch(() => errorAlert("Load Failed", "Could not load stock history."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchHistory(); }, [token]);

  const totalIn  = history.filter((h) => h.type === "in").reduce((s, h) => s + h.quantity, 0);
  const totalOut = history.filter((h) => h.type === "out").reduce((s, h) => s + h.quantity, 0);
  const totalInValue = history
    .filter((h) => h.type === "in" && h.cylinder_type?.price)
    .reduce((s, h) => s + parseFloat(h.cylinder_type.price) * h.quantity, 0);
  const totalOutValue = history
    .filter((h) => h.type === "out" && h.cylinder_type?.price)
    .reduce((s, h) => s + parseFloat(h.cylinder_type.price) * h.quantity, 0);

  const columns = [
    { title: "#", data: null, render: (_, __, ___, meta) => `<span style="color:#94a3b8;font-size:12px">${meta.row + 1}</span>`, orderable: false, width: "40px" },
    {
      title: "Date / Time", data: "created_at",
      render: (d) => {
        const dt   = new Date(d);
        const date = dt.toLocaleDateString("en-LK", { day: "2-digit", month: "short", year: "numeric" });
        const time = dt.toLocaleTimeString("en-LK", { hour: "2-digit", minute: "2-digit" });
        return `<div style="line-height:1.6">
          <span style="font-weight:700;color:#0f172a;font-size:13px">${date}</span><br/>
          <span style="font-size:11px;color:#94a3b8">${time}</span>
        </div>`;
      },
    },
    {
      title: "Warehouse", data: null,
      render: (_, __, row) =>
        `<span style="font-weight:700;color:#0f172a">${row.warehouse?.name ?? `#${row.warehouse_id}`}</span>`,
    },
    {
      title: "Cylinder Type", data: null,
      render: (_, __, row) => {
        const ct = row.cylinder_type;
        if (!ct) return "—";
        return `<div style="line-height:1.6">
          <span style="font-weight:700;color:#0f172a">${ct.brand?.name ?? ""} ${ct.name}</span><br/>
          <span style="font-size:11px;color:#64748b">${ct.weight} kg</span>
        </div>`;
      },
    },
    {
      title: "Movement", data: "type",
      render: (d) => d === "in"
        ? `<span style="background:#d1fae5;color:#065f46;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:800;display:inline-flex;align-items:center;gap:4px">📥 IN</span>`
        : `<span style="background:#fff7ed;color:#c2410c;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:800;display:inline-flex;align-items:center;gap:4px">📤 OUT</span>`,
    },
    {
      title: "Qty", data: "quantity",
      render: (d) => `<strong style="font-size:15px;color:#0f172a">${d}</strong>`,
    },
    {
      title: "Unit Price", data: null,
      render: (_, __, row) => {
        const p = row.cylinder_type?.price;
        return p != null
          ? `<span style="color:#1d4ed8;font-weight:700;font-size:13px">${fmt(p)}</span>`
          : `<span style="color:#cbd5e1;font-size:12px">—</span>`;
      },
    },
    {
      title: "Total Value", data: null,
      render: (_, __, row) => {
        const p = row.cylinder_type?.price;
        if (p == null) return `<span style="color:#cbd5e1;font-size:12px">—</span>`;
        const total = parseFloat(p) * row.quantity;
        const color = row.type === "in" ? "#065f46" : "#991b1b";
        return `<span style="font-weight:800;font-size:13px;color:${color}">${fmt(total)}</span>`;
      },
    },
    {
      title: "Added By", data: null,
      render: (_, __, row) =>
        `<span style="font-size:13px;color:#475569">${row.user?.name ?? "System"}</span>`,
    },
    {
      title: "Note", data: "note",
      render: (d) => `<span style="font-size:12px;color:#64748b">${d ?? "—"}</span>`,
    },
  ];

  if (loading) return (
    <div className="ap-page">
      <div className="ap-hero"><div className="ap-hero-ring" /><div className="ap-hero-inner"><div><div className="ap-hero-eyebrow">Admin · Inventory</div><h1 className="ap-hero-title">Stock Movement History</h1></div></div></div>
      <div className="ap-body"><div className="ap-card"><div className="ap-empty"><div className="ap-empty-icon">⏳</div><div className="ap-empty-text">Loading history…</div></div></div></div>
    </div>
  );

  return (
    <div className="ap-page">
      {/* ── Hero ── */}
      <div className="ap-hero">
        <div className="ap-hero-ring" />
        <div className="ap-hero-inner">
          <div>
            <div className="ap-hero-eyebrow">Admin · Inventory</div>
            <h1 className="ap-hero-title">Stock Movement History</h1>
            <p className="ap-hero-sub">Complete audit trail of all stock ins and outs</p>
          </div>
          <div className="ap-hero-actions">
            <span className="ap-hero-badge">
              <FaHistory style={{ fontSize: 12 }} />
              {history.length} records
            </span>
            <button className="ap-hero-btn" onClick={fetchHistory}>
              <FaSync style={{ fontSize: 11 }} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="ap-body">

        {/* ── Summary KPI cards ── */}
        <div className="ap-kpi-strip ap-kpi-strip-4" style={{ marginBottom: 24 }}>
          {[
            { label: "Total Movements", value: history.length,    accent: "#3b82f6", bg: "#eff6ff", icon: "📋", small: false, path: "/admin/stock-history" },
            { label: "Stock IN",        value: `${totalIn} cyl`,  accent: "#16a34a", bg: "#f0fdf4", icon: "📥", small: true,  path: "/admin/stock-history" },
            { label: "Stock OUT",       value: `${totalOut} cyl`, accent: "#f59e0b", bg: "#fffbeb", icon: "📤", small: true,  path: "/admin/stock-history" },
            { label: "Total IN Value",  value: fmt(totalInValue), accent: "#8b5cf6", bg: "#faf5ff", icon: "💰", small: true,  path: "/admin/stock-history" },
          ].map((k, i) => (
            <div key={k.label} className="ap-kpi-card" onClick={() => navigate(k.path)} style={{ borderBottomColor: k.accent, animationDelay: `${i * 0.07}s`, cursor: "pointer" }}>
              <div className="ap-kpi-bg-circle" style={{ background: k.bg }} />
              <div className="ap-kpi-icon" style={{ color: k.accent }}>{k.icon}</div>
              <div className="ap-kpi-label">{k.label}</div>
              <div className="ap-kpi-value" style={{ color: k.accent, fontSize: k.small ? 20 : 32 }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* ── Summary accent cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderLeft: "4px solid #16a34a", borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Net Stock Inflow</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#065f46" }}>{totalIn} cylinders</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{fmt(totalInValue)} total value added</div>
          </div>
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderLeft: "4px solid #f59e0b", borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Net Stock Outflow</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#92400e" }}>{totalOut} cylinders</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{fmt(totalOutValue)} total value dispatched</div>
          </div>
        </div>

        {/* ── History table ── */}
        <div className="ap-card">
          <div className="ap-card-header">
            <div className="ap-card-title-wrap">
              <div className="ap-card-icon-box" style={{ background: "#eff6ff" }}>
                <FaHistory style={{ color: "#1e40af", fontSize: 14 }} />
              </div>
              <div>
                <div className="ap-card-title">Movement Log</div>
                <div className="ap-card-sub">{history.length} entries · sorted by most recent</div>
              </div>
            </div>
          </div>
          <div className="ap-card-body">
            <DataTable
              id="stock-history-table"
              columns={columns}
              data={history}
              options={{ order: [[1, "desc"]] }}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default StockHistory;
