import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FaWarehouse, FaMapMarkerAlt, FaBoxes, FaPlus, FaSync } from "react-icons/fa";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { confirmDialog, toast, errorAlert } from "../../utils/swal";
import { useNavigate } from "react-router-dom";
import "../../styles/AdminPages.css";

const API = "http://127.0.0.1:8000/api";

const Warehouses = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState({
    name: "", address: "", capacity: "", latitude: 6.9271, longitude: 79.8612,
  });
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const mapRef      = useRef(null);
  const mapInstance = useRef(null);
  const markerRef   = useRef(null);

  const fetchWarehouses = () => {
    axios.get(`${API}/warehouses`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setWarehouses(r.data))
      .catch(console.error);
  };

  useEffect(() => { fetchWarehouses(); }, []);

  /* Init Leaflet map */
  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return;

    mapInstance.current = L.map(mapRef.current).setView([form.latitude, form.longitude], 8);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(mapInstance.current);

    markerRef.current = L.marker([form.latitude, form.longitude], { draggable: true })
      .addTo(mapInstance.current);

    markerRef.current.on("dragend", () => {
      const { lat, lng } = markerRef.current.getLatLng();
      setForm((p) => ({ ...p, latitude: parseFloat(lat.toFixed(6)), longitude: parseFloat(lng.toFixed(6)) }));
    });

    mapInstance.current.on("click", (e) => {
      markerRef.current.setLatLng(e.latlng);
      setForm((p) => ({ ...p, latitude: parseFloat(e.latlng.lat.toFixed(6)), longitude: parseFloat(e.latlng.lng.toFixed(6)) }));
    });

    return () => { mapInstance.current?.remove(); mapInstance.current = null; };
  }, []);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(
        `${API}/warehouses`,
        { name: form.name, address: form.address, capacity: parseInt(form.capacity), latitude: form.latitude, longitude: form.longitude, current_stock: 0, status: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast("Warehouse created successfully.");
      setForm({ name: "", address: "", capacity: "", latitude: 6.9271, longitude: 79.8612 });
      fetchWarehouses();
    } catch (err) {
      errorAlert("Create Failed",
        err.response?.data?.message ||
        Object.values(err.response?.data?.errors ?? {})[0]?.[0] ||
        "Failed to create warehouse."
      );
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    const ok = await confirmDialog({ title: "Delete Warehouse?", text: "Permanently removes warehouse and all stock.", confirmText: "Yes, Delete", danger: true });
    if (!ok) return;
    try {
      await axios.delete(`${API}/warehouses/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setWarehouses((p) => p.filter((w) => w.id !== id));
      toast("Warehouse deleted.");
    } catch { errorAlert("Delete Failed", "Could not delete this warehouse."); }
  };

  const handleToggle = async (w) => {
    const ok = await confirmDialog({
      title: `${w.status ? "Deactivate" : "Activate"} ${w.name}?`,
      text:  w.status ? "Clients won't be assigned here." : "Warehouse will accept orders.",
      icon: "question",
      confirmText: w.status ? "Deactivate" : "Activate",
      danger: w.status,
    });
    if (!ok) return;
    try {
      await axios.put(`${API}/warehouses/${w.id}`, { status: !w.status }, { headers: { Authorization: `Bearer ${token}` } });
      fetchWarehouses();
      toast(`Warehouse ${w.status ? "deactivated" : "activated"}.`, w.status ? "warning" : "success");
    } catch { errorAlert("Update Failed"); }
  };

  const activeCount   = warehouses.filter((w) => w.status).length;
  const inactiveCount = warehouses.filter((w) => !w.status).length;
  const totalCapacity = warehouses.reduce((s, w) => s + (w.capacity ?? 0), 0);

  return (
    <div className="ap-page">
      {/* ── Hero ── */}
      <div className="ap-hero">
        <div className="ap-hero-ring" />
        <div className="ap-hero-inner">
          <div>
            <div className="ap-hero-eyebrow">Admin · Infrastructure</div>
            <h1 className="ap-hero-title">Warehouse Management</h1>
            <p className="ap-hero-sub">Deploy, configure and monitor distribution centers</p>
          </div>
          <div className="ap-hero-actions">
            <span className="ap-hero-badge">
              <FaWarehouse style={{ fontSize: 12 }} />
              {warehouses.length} warehouses
            </span>
            <button className="ap-hero-btn" onClick={fetchWarehouses}>
              <FaSync style={{ fontSize: 11 }} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="ap-body">

        {/* ── KPI strip ── */}
        <div className="ap-kpi-strip ap-kpi-strip-3" style={{ marginBottom: 24 }}>
          {[
            { label: "Total Warehouses", value: warehouses.length, accent: "#3b82f6", bg: "#eff6ff", icon: "🏭", path: "/admin/warehouses" },
            { label: "Active",           value: activeCount,       accent: "#16a34a", bg: "#f0fdf4", icon: "✅", path: "/admin/warehouses" },
            { label: "Total Capacity",   value: `${totalCapacity.toLocaleString()} cyl`, accent: "#8b5cf6", bg: "#faf5ff", icon: "📦", small: true, path: "/admin/stock" },
          ].map((k, i) => (
            <div key={k.label} className="ap-kpi-card" onClick={() => navigate(k.path)} style={{ borderBottomColor: k.accent, animationDelay: `${i * 0.08}s`, cursor: "pointer" }}>
              <div className="ap-kpi-bg-circle" style={{ background: k.bg }} />
              <div className="ap-kpi-icon" style={{ color: k.accent }}>{k.icon}</div>
              <div className="ap-kpi-label">{k.label}</div>
              <div className="ap-kpi-value" style={{ color: k.accent, fontSize: k.small ? 22 : 32 }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div className="ap-grid-2">

          {/* ── Create form ── */}
          <div className="ap-card">
            <div className="ap-card-header">
              <div className="ap-card-title-wrap">
                <div className="ap-card-icon-box" style={{ background: "#eff6ff" }}>
                  <FaPlus style={{ color: "#1e40af", fontSize: 14 }} />
                </div>
                <div>
                  <div className="ap-card-title">Deploy New Warehouse</div>
                  <div className="ap-card-sub">Click the map or drag the pin to set location</div>
                </div>
              </div>
            </div>
            <div className="ap-card-body">
              <form onSubmit={handleSubmit}>
                <div className="ap-form-group">
                  <label className="ap-label">Warehouse Name</label>
                  <input name="name" className="ap-input" value={form.name} onChange={handleChange} placeholder="e.g. Colombo Central Depot" required />
                </div>
                <div className="ap-form-group">
                  <label className="ap-label">Address</label>
                  <input name="address" className="ap-input" value={form.address} onChange={handleChange} placeholder="e.g. 100 Galle Road, Colombo 03" required />
                </div>
                <div className="ap-form-group">
                  <label className="ap-label">Max Capacity (cylinders)</label>
                  <input name="capacity" type="number" min={1} className="ap-input" value={form.capacity} onChange={handleChange} placeholder="e.g. 1000" required />
                </div>

                <div className="ap-form-group">
                  <label className="ap-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <FaMapMarkerAlt style={{ color: "#1e40af" }} /> Map Location (Click or drag pin)
                  </label>
                  <div ref={mapRef} style={{ height: 250, borderRadius: 10, overflow: "hidden", border: "1.5px solid #e2e8f0" }} />
                  <div className="ap-coord-bar">
                    <span>Lat: <strong>{form.latitude}</strong></span>
                    <span>Lng: <strong>{form.longitude}</strong></span>
                  </div>
                </div>

                <button type="submit" className="ap-btn ap-btn-success ap-btn-full" disabled={submitting}>
                  {submitting ? "Saving…" : "✅ Save Warehouse"}
                </button>
              </form>
            </div>
          </div>

          {/* ── Warehouse list ── */}
          <div className="ap-card">
            <div className="ap-card-header">
              <div className="ap-card-title-wrap">
                <div className="ap-card-icon-box" style={{ background: "#f0fdf4" }}>
                  <FaWarehouse style={{ color: "#16a34a", fontSize: 14 }} />
                </div>
                <div>
                  <div className="ap-card-title">Active Warehouses</div>
                  <div className="ap-card-sub">{warehouses.length} total · {activeCount} active · {inactiveCount} inactive</div>
                </div>
              </div>
            </div>

            {warehouses.length === 0 ? (
              <div className="ap-card-body">
                <div className="ap-empty">
                  <div className="ap-empty-icon">🏭</div>
                  <div className="ap-empty-text">No warehouses yet.</div>
                  <div className="ap-empty-sub">Create your first one using the form.</div>
                </div>
              </div>
            ) : (
              <div style={{ maxHeight: 600, overflowY: "auto" }}>
                {warehouses.map((w) => {
                  const pct = w.capacity > 0 ? Math.min(100, ((w.current_stock ?? 0) / w.capacity) * 100) : 0;
                  const barColor = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#3b82f6";
                  return (
                    <div key={w.id} className="ap-warehouse-item">
                      {/* Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a", display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                            <FaWarehouse style={{ color: "#8b5cf6", fontSize: 14 }} />
                            {w.name}
                          </div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>{w.address}</div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <span className={`ap-badge ${w.status ? "ap-badge-active" : "ap-badge-inactive"}`}>
                            {w.status ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>

                      {/* Capacity bar */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                          <span>Capacity used</span>
                          <span style={{ fontWeight: 700, color: barColor }}>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="ap-progress-wrap">
                          <div className="ap-progress-bar" style={{ width: `${pct}%`, background: barColor }} />
                        </div>
                      </div>

                      {/* Meta row */}
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10, fontSize: 12, color: "#64748b" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <FaMapMarkerAlt style={{ fontSize: 10 }} />{parseFloat(w.latitude).toFixed(4)}, {parseFloat(w.longitude).toFixed(4)}
                        </span>
                        <span>|</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <FaBoxes style={{ fontSize: 10 }} /> Capacity: <strong>{w.capacity}</strong>
                        </span>
                        {w.latitude && w.longitude && (
                          <a
                            href={`https://www.google.com/maps?q=${w.latitude},${w.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ap-maps-link"
                          >
                            <FaMapMarkerAlt style={{ fontSize: 10 }} /> Maps
                          </a>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => handleToggle(w)}
                          className={`ap-btn ap-btn-sm ${w.status ? "ap-btn-ghost" : "ap-btn-success"}`}
                        >
                          {w.status ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDelete(w.id)}
                          className="ap-btn ap-btn-danger ap-btn-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Warehouses;
