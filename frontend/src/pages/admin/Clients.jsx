import { useEffect, useState } from "react";
import axios from "axios";
import DataTable from "../../components/DataTable";
import { errorAlert } from "../../utils/swal";
import { FaUsers, FaSync } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "../../styles/AdminPages.css";

const API = "http://127.0.0.1:8000/api";

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const fetchClients = () => {
    setLoading(true);
    axios.get(`${API}/clients`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setClients(r.data))
      .catch(() => errorAlert("Load Failed", "Could not load clients."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchClients(); }, [token]);

  const activeCount   = clients.filter((c) => c.status).length;
  const withLocCount  = clients.filter((c) => c.latitude && c.longitude).length;
  const inactiveCount = clients.filter((c) => !c.status).length;

  const columns = [
    { title: "#", data: null, render: (_, __, ___, meta) => `<span style="color:#94a3b8;font-size:12px">${meta.row + 1}</span>`, orderable: false, width: "40px" },
    { title: "Name",  data: "name",
      render: (d) => `<strong style="color:#0f172a;font-size:13.5px">${d}</strong>` },
    { title: "Email", data: "email",
      render: (d) => d ? `<span style="color:#475569;font-size:13px">${d}</span>` : `<span style="color:#cbd5e1">—</span>` },
    { title: "NIC",   data: "nic",
      render: (d) => `<span style="font-family:monospace;font-size:12px;color:#475569">${d}</span>` },
    { title: "Phone", data: "phone",
      render: (d) => d ? `<span style="color:#475569">${d}</span>` : `<span style="color:#cbd5e1">—</span>` },
    { title: "Location", data: null,
      render: (_, __, row) => {
        if (!row.latitude || !row.longitude) {
          return `<span style="color:#f59e0b;font-size:12px;background:#fffbeb;padding:2px 8px;border-radius:10px;font-weight:600">⚠ Not set</span>`;
        }
        const lat = parseFloat(row.latitude).toFixed(4);
        const lng = parseFloat(row.longitude).toFixed(4);
        const url = `https://www.google.com/maps?q=${row.latitude},${row.longitude}`;
        return `
          <div>
            <span style="font-family:monospace;color:#475569;font-size:11px;display:block;margin-bottom:4px">${lat}, ${lng}</span>
            <a href="${url}" target="_blank" rel="noopener noreferrer"
              style="display:inline-flex;align-items:center;gap:4px;background:#eff6ff;color:#1d4ed8;
                     border:1px solid #bfdbfe;padding:3px 9px;border-radius:7px;font-size:11px;
                     font-weight:700;text-decoration:none;">
              📍 View on Maps
            </a>
          </div>`;
      }},
    { title: "Status", data: "status",
      render: (d) => d
        ? `<span style="background:#d1fae5;color:#065f46;padding:3px 11px;border-radius:20px;font-size:11.5px;font-weight:700">Active</span>`
        : `<span style="background:#fee2e2;color:#991b1b;padding:3px 11px;border-radius:20px;font-size:11.5px;font-weight:700">Inactive</span>` },
  ];

  if (loading) return (
    <div className="ap-page">
      <div className="ap-hero"><div className="ap-hero-ring" /><div className="ap-hero-inner"><div><div className="ap-hero-eyebrow">Admin · Clients</div><h1 className="ap-hero-title">Registered Clients</h1></div></div></div>
      <div className="ap-body"><div className="ap-card"><div className="ap-empty"><div className="ap-empty-icon">⏳</div><div className="ap-empty-text">Loading clients…</div></div></div></div>
    </div>
  );

  return (
    <div className="ap-page">
      {/* ── Hero ── */}
      <div className="ap-hero">
        <div className="ap-hero-ring" />
        <div className="ap-hero-inner">
          <div>
            <div className="ap-hero-eyebrow">Admin · Customers</div>
            <h1 className="ap-hero-title">Registered Clients</h1>
            <p className="ap-hero-sub">All verified customer accounts across the platform</p>
          </div>
          <div className="ap-hero-actions">
            <span className="ap-hero-badge">
              <FaUsers style={{ fontSize: 12 }} />
              {clients.length} clients
            </span>
            <button className="ap-hero-btn" onClick={fetchClients}>
              <FaSync style={{ fontSize: 11 }} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="ap-body">

        {/* ── KPI strip ── */}
        <div className="ap-kpi-strip ap-kpi-strip-4" style={{ marginBottom: 24 }}>
          {[
            { label: "Total Clients",    value: clients.length, accent: "#3b82f6", bg: "#eff6ff", icon: "👤", path: "/admin/clients" },
            { label: "Active",           value: activeCount,    accent: "#16a34a", bg: "#f0fdf4", icon: "✅", path: "/admin/clients" },
            { label: "Inactive",         value: inactiveCount,  accent: "#dc2626", bg: "#fef2f2", icon: "🚫", path: "/admin/clients" },
            { label: "With GPS",         value: withLocCount,   accent: "#8b5cf6", bg: "#faf5ff", icon: "📍", path: "/admin/clients" },
          ].map((k, i) => (
            <div key={k.label} className="ap-kpi-card" onClick={() => navigate(k.path)} style={{ borderBottomColor: k.accent, animationDelay: `${i * 0.07}s`, cursor: "pointer" }}>
              <div className="ap-kpi-bg-circle" style={{ background: k.bg }} />
              <div className="ap-kpi-icon" style={{ color: k.accent }}>{k.icon}</div>
              <div className="ap-kpi-label">{k.label}</div>
              <div className="ap-kpi-value" style={{ color: k.accent }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* ── Clients table ── */}
        <div className="ap-card">
          <div className="ap-card-header">
            <div className="ap-card-title-wrap">
              <div className="ap-card-icon-box" style={{ background: "#eff6ff" }}>
                <FaUsers style={{ color: "#1e40af", fontSize: 14 }} />
              </div>
              <div>
                <div className="ap-card-title">Client Directory</div>
                <div className="ap-card-sub">{clients.length} registered accounts · read-only view</div>
              </div>
            </div>
          </div>
          <div className="ap-card-body">
            <DataTable id="clients-table" columns={columns} data={clients} />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Clients;
