import { useState, useEffect } from "react";
import axios from "axios";
import { FaBoxes, FaChartBar, FaWarehouse, FaClipboardList, FaSync, FaPlus } from "react-icons/fa";
import { confirmDialog, toast, errorAlert } from "../../../utils/swal";
import { useNavigate } from "react-router-dom";
import "../../../styles/AdminPages.css";

const API = "http://127.0.0.1:8000/api";

/* ── SVG Line Chart ── */
const StockLineChart = ({ stockByWarehouse, cylinderTypes }) => {
  const COLORS = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#0891b2","#ec4899","#14b8a6"];
  const activeWh = stockByWarehouse.filter((w) => w.lines.length > 0);
  if (activeWh.length === 0) return (
    <div style={{ padding: "24px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
      No stock data yet.
    </div>
  );

  const usedTypeIds = [...new Set(stockByWarehouse.flatMap((w) => w.lines.map((l) => l.cylinder_type_id)))];
  const typeLabel = (id) => {
    const ct = cylinderTypes.find((c) => c.id === id);
    return ct ? `${ct.brand?.name ?? ""} ${ct.weight}kg` : `#${id}`;
  };

  const PAD_L = 48, PAD_R = 20, PAD_T = 20, PAD_B = 54;
  const W = 520, H = 240;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const maxQty = Math.max(...stockByWarehouse.flatMap((w) => w.lines.map((l) => l.quantity)), 1);
  const xFor = (i) => PAD_L + (activeWh.length === 1 ? plotW / 2 : (i / (activeWh.length - 1)) * plotW);
  const yFor = (qty) => PAD_T + plotH - (qty / maxQty) * plotH;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ val: Math.round(maxQty * f), y: PAD_T + plotH - f * plotH }));

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={W} height={H} style={{ fontFamily: "var(--font)", display: "block" }}>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD_L} y1={t.y} x2={W - PAD_R} y2={t.y} stroke="#f1f5f9" strokeWidth={t.val === 0 ? 1.5 : 1} />
            <text x={PAD_L - 6} y={t.y + 4} fontSize={10} fill="#94a3b8" textAnchor="end">{t.val}</text>
          </g>
        ))}
        {activeWh.map((w, i) => (
          <g key={w.id}>
            <line x1={xFor(i)} y1={PAD_T + plotH} x2={xFor(i)} y2={PAD_T + plotH + 4} stroke="#cbd5e1" strokeWidth={1} />
            <text x={xFor(i)} y={H - PAD_B + 16} fontSize={10} fill="#64748b" textAnchor="middle">
              {w.name.length > 12 ? w.name.slice(0, 11) + "…" : w.name}
            </text>
          </g>
        ))}
        {usedTypeIds.map((typeId, li) => {
          const color = COLORS[li % COLORS.length];
          const points = activeWh.map((w, i) => {
            const line = w.lines.find((l) => l.cylinder_type_id === typeId);
            return { x: xFor(i), y: yFor(line ? line.quantity : 0), qty: line ? line.quantity : 0 };
          });
          const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
          const areaD = `${pathD} L ${points[points.length-1].x} ${PAD_T + plotH} L ${points[0].x} ${PAD_T + plotH} Z`;
          return (
            <g key={typeId}>
              <path d={areaD} fill={color} opacity={0.07} />
              <path d={pathD} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
              {points.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={4.5} fill={color} stroke="#fff" strokeWidth={2} />
                  {p.qty > 0 && <text x={p.x} y={p.y - 9} fontSize={10} fill={color} textAnchor="middle" fontWeight={700}>{p.qty}</text>}
                </g>
              ))}
            </g>
          );
        })}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + plotH} stroke="#e2e8f0" strokeWidth={1.5} />
        <line x1={PAD_L} y1={PAD_T + plotH} x2={W - PAD_R} y2={PAD_T + plotH} stroke="#e2e8f0" strokeWidth={1.5} />
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 10 }}>
        {usedTypeIds.map((id, i) => (
          <div key={id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}>
            <div style={{ width: 26, height: 3, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
            {typeLabel(id)}
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminStockPage = () => {
  const [warehouses,    setWarehouses]    = useState([]);
  const [cylinderTypes, setCylinderTypes] = useState([]);
  const [stocks,        setStocks]        = useState([]);
  const [form, setForm] = useState({ warehouse_id: "", cylinder_type_id: "", quantity: "" });
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const fetchData = () => {
    axios.get(`${API}/warehouses`,      { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setWarehouses(r.data)).catch(console.error);
    axios.get(`${API}/cylinder-types`,  { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setCylinderTypes(r.data)).catch(console.error);
    axios.get(`${API}/warehouse-stock`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setStocks(r.data)).catch(console.error);
  };

  useEffect(() => { fetchData(); }, []);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(
        `${API}/warehouse-stock`,
        {
          warehouse_id:     parseInt(form.warehouse_id),
          cylinder_type_id: parseInt(form.cylinder_type_id),
          quantity:         parseInt(form.quantity),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast(`Stock added — ${form.quantity} cylinders.`);
      setForm({ warehouse_id: form.warehouse_id, cylinder_type_id: "", quantity: "" });
      fetchData();
    } catch (err) {
      errorAlert("Stock Error",
        err.response?.data?.message ||
        Object.values(err.response?.data?.errors ?? {})[0]?.[0] ||
        "Failed to add stock."
      );
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id, label) => {
    const ok = await confirmDialog({ title: `Remove "${label}" stock?`, text: "Removes this stock entry.", confirmText: "Yes, Remove", danger: true });
    if (!ok) return;
    try {
      await axios.delete(`${API}/warehouse-stock/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast("Stock entry removed.", "warning");
      fetchData();
    } catch { errorAlert("Delete Failed"); }
  };

  const selectedWh  = warehouses.find((w) => w.id === parseInt(form.warehouse_id));
  const usedCap     = selectedWh ? stocks.filter((s) => s.warehouse_id === selectedWh.id).reduce((s, x) => s + x.quantity, 0) : 0;
  const availCap    = selectedWh ? selectedWh.capacity - usedCap : 0;
  const wouldExceed = form.quantity !== "" && selectedWh && parseInt(form.quantity) > availCap;

  const stockByWarehouse = warehouses.map((w) => ({
    ...w,
    lines: stocks.filter((s) => s.warehouse_id === w.id),
    total: stocks.filter((s) => s.warehouse_id === w.id).reduce((s, x) => s + x.quantity, 0),
  }));

  const totalStock    = stocks.reduce((s, x) => s + x.quantity, 0);
  const lowStockCount = stocks.filter((s) => s.quantity < 10).length;
  const totalCapacity = warehouses.reduce((s, w) => s + (w.capacity ?? 0), 0);

  return (
    <div className="ap-page">
      {/* ── Hero ── */}
      <div className="ap-hero">
        <div className="ap-hero-ring" />
        <div className="ap-hero-inner">
          <div>
            <div className="ap-hero-eyebrow">Admin · Inventory</div>
            <h1 className="ap-hero-title">Stock Management</h1>
            <p className="ap-hero-sub">Monitor and manage cylinder stock across all warehouses</p>
          </div>
          <div className="ap-hero-actions">
            <span className="ap-hero-badge">
              <FaBoxes style={{ fontSize: 12 }} />
              {totalStock.toLocaleString()} cylinders in stock
            </span>
            <button className="ap-hero-btn" onClick={fetchData}>
              <FaSync style={{ fontSize: 11 }} />
            </button>
          </div>
        </div>
      </div>

      <div className="ap-body">

        {/* ── KPI strip ── */}
        <div className="ap-kpi-strip ap-kpi-strip-4" style={{ marginBottom: 24 }}>
          {[
            { label: "Total Stock",     value: totalStock,          accent: "#3b82f6", bg: "#eff6ff", icon: "📦",  path: "/admin/stock" },
            { label: "Warehouses",      value: warehouses.length,   accent: "#16a34a", bg: "#f0fdf4", icon: "🏭",  path: "/admin/warehouses" },
            { label: "Low Stock Items", value: lowStockCount,       accent: lowStockCount > 0 ? "#dc2626" : "#16a34a", bg: lowStockCount > 0 ? "#fef2f2" : "#f0fdf4", icon: lowStockCount > 0 ? "⚠️" : "✅", path: "/admin/stock" },
            { label: "Total Capacity",  value: `${totalCapacity.toLocaleString()} cyl`, accent: "#8b5cf6", bg: "#faf5ff", icon: "🏗️", small: true, path: "/admin/warehouses" },
          ].map((k, i) => (
            <div key={k.label} className="ap-kpi-card" onClick={() => navigate(k.path)} style={{ borderBottomColor: k.accent, animationDelay: `${i * 0.07}s`, cursor: "pointer" }}>
              <div className="ap-kpi-bg-circle" style={{ background: k.bg }} />
              <div className="ap-kpi-icon" style={{ color: k.accent }}>{k.icon}</div>
              <div className="ap-kpi-label">{k.label}</div>
              <div className="ap-kpi-value" style={{ color: k.accent, fontSize: k.small ? 18 : 32 }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div className="ap-grid-2-wide">

          {/* ── LEFT: Reference + Chart ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Cylinder reference table */}
            <div className="ap-card">
              <div className="ap-card-header">
                <div className="ap-card-title-wrap">
                  <div className="ap-card-icon-box" style={{ background: "#eff6ff" }}>
                    <FaClipboardList style={{ color: "#1e40af", fontSize: 14 }} />
                  </div>
                  <div>
                    <div className="ap-card-title">Cylinder Types Reference</div>
                    <div className="ap-card-sub">{cylinderTypes.length} types configured</div>
                  </div>
                </div>
              </div>
              <div className="ap-card-body-flush">
                <table className="ap-table" style={{ fontSize: 13 }}>
                  <thead>
                    <tr><th>Brand</th><th>Name</th><th>Weight</th><th>Price</th></tr>
                  </thead>
                  <tbody>
                    {cylinderTypes.length === 0 && (
                      <tr><td colSpan={4} style={{ textAlign: "center", color: "#aaa", padding: 20 }}>None configured.</td></tr>
                    )}
                    {cylinderTypes.map((ct) => (
                      <tr key={ct.id}>
                        <td>
                          <span style={{ background: "#eff6ff", color: "#1e40af", padding: "2px 9px", borderRadius: 20, fontSize: 11.5, fontWeight: 700 }}>
                            {ct.brand?.name ?? "—"}
                          </span>
                        </td>
                        <td><strong>{ct.name}</strong></td>
                        <td><span style={{ fontFamily: "monospace", fontWeight: 700 }}>{ct.weight} kg</span></td>
                        <td><span style={{ color: "#059669", fontWeight: 700 }}>LKR {parseFloat(ct.price).toLocaleString()}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Line chart */}
            <div className="ap-card">
              <div className="ap-card-header">
                <div className="ap-card-title-wrap">
                  <div className="ap-card-icon-box" style={{ background: "#faf5ff" }}>
                    <FaChartBar style={{ color: "#8b5cf6", fontSize: 14 }} />
                  </div>
                  <div>
                    <div className="ap-card-title">Stock Distribution Chart</div>
                    <div className="ap-card-sub">Cylinders per type, per warehouse</div>
                  </div>
                </div>
              </div>
              <div className="ap-card-body">
                <StockLineChart stockByWarehouse={stockByWarehouse} cylinderTypes={cylinderTypes} />
              </div>
            </div>

          </div>

          {/* ── RIGHT: Add stock + levels ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Add stock form */}
            <div className="ap-card">
              <div className="ap-card-header">
                <div className="ap-card-title-wrap">
                  <div className="ap-card-icon-box" style={{ background: "#f0fdf4" }}>
                    <FaPlus style={{ color: "#16a34a", fontSize: 14 }} />
                  </div>
                  <div>
                    <div className="ap-card-title">Add Stock</div>
                    <div className="ap-card-sub">Restock a warehouse cylinder type</div>
                  </div>
                </div>
              </div>
              <div className="ap-card-body">
                <form onSubmit={handleSubmit}>
                  <div className="ap-form-group">
                    <label className="ap-label">Warehouse</label>
                    <select name="warehouse_id" className="ap-select" value={form.warehouse_id} onChange={handleChange} required>
                      <option value="">— Select warehouse —</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>

                  {selectedWh && (
                    <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#0369a1", marginBottom: 6 }}>
                        <span>Capacity used</span>
                        <span style={{ fontWeight: 700 }}>{usedCap} / {selectedWh.capacity}</span>
                      </div>
                      <div className="ap-progress-wrap">
                        <div className="ap-progress-bar" style={{ width: `${Math.min(100, (usedCap / selectedWh.capacity) * 100)}%`, background: "#0ea5e9" }} />
                      </div>
                      <div style={{ marginTop: 6, color: "#0369a1", fontWeight: 600 }}>
                        Available: {availCap} cylinders
                      </div>
                    </div>
                  )}

                  <div className="ap-form-group">
                    <label className="ap-label">Cylinder Type</label>
                    <select name="cylinder_type_id" className="ap-select" value={form.cylinder_type_id} onChange={handleChange} required>
                      <option value="">— Select type —</option>
                      {cylinderTypes.map((ct) => (
                        <option key={ct.id} value={ct.id}>
                          {ct.brand?.name ?? "?"} — {ct.name} ({ct.weight}kg) — LKR {parseFloat(ct.price).toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="ap-form-group">
                    <label className="ap-label">Quantity</label>
                    <input
                      name="quantity"
                      type="number"
                      min={1}
                      className="ap-input"
                      value={form.quantity}
                      onChange={handleChange}
                      placeholder="e.g. 100"
                      required
                      style={{ borderColor: wouldExceed ? "#ef4444" : undefined }}
                    />
                    {wouldExceed && (
                      <div style={{ fontSize: 12, color: "#dc2626", marginTop: 5, fontWeight: 600 }}>
                        ⚠ Exceeds available capacity by {parseInt(form.quantity) - availCap} cylinders
                      </div>
                    )}
                  </div>

                  <button type="submit" className="ap-btn ap-btn-success ap-btn-full" disabled={submitting || wouldExceed}>
                    {submitting ? "Adding…" : "✅ Add Stock"}
                  </button>
                </form>
              </div>
            </div>

            {/* Current stock levels */}
            <div className="ap-card">
              <div className="ap-card-header">
                <div className="ap-card-title-wrap">
                  <div className="ap-card-icon-box" style={{ background: "#eff6ff" }}>
                    <FaWarehouse style={{ color: "#1e40af", fontSize: 14 }} />
                  </div>
                  <div>
                    <div className="ap-card-title">Current Stock Levels</div>
                    <div className="ap-card-sub">Per warehouse breakdown</div>
                  </div>
                </div>
              </div>
              <div className="ap-card-body">
                {stockByWarehouse.length === 0 && (
                  <div className="ap-empty">
                    <div className="ap-empty-icon">🏭</div>
                    <div className="ap-empty-text">No warehouses configured.</div>
                  </div>
                )}
                {stockByWarehouse.map((w) => {
                  const pct = w.capacity > 0 ? Math.min(100, (w.total / w.capacity) * 100) : 0;
                  const barColor = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#3b82f6";
                  return (
                    <div key={w.id} style={{ marginBottom: 24, paddingBottom: 22, borderBottom: "1px solid #f1f5f9" }}>
                      {/* Warehouse header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 14, color: "#0f172a" }}>
                          <FaWarehouse style={{ color: "#8b5cf6", fontSize: 13 }} />
                          {w.name}
                        </div>
                        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                          <span className="ap-badge ap-badge-info" style={{ fontSize: 11 }}>
                            {w.total} / {w.capacity}
                          </span>
                          <span className={`ap-badge ${w.status ? "ap-badge-active" : "ap-badge-inactive"}`} style={{ fontSize: 11 }}>
                            {w.status ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>

                      {/* Capacity bar */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                          <span>Capacity used</span>
                          <span style={{ fontWeight: 700, color: barColor }}>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="ap-progress-wrap">
                          <div className="ap-progress-bar" style={{ width: `${pct}%`, background: barColor }} />
                        </div>
                      </div>

                      {/* Stock lines */}
                      {w.lines.length === 0 ? (
                        <p style={{ color: "#aaa", fontSize: 13, margin: 0 }}>No stock entries currently.</p>
                      ) : (
                        <table className="ap-table" style={{ fontSize: 13 }}>
                          <thead>
                            <tr><th>Brand</th><th>Cylinder</th><th>Weight</th><th>Qty</th><th></th></tr>
                          </thead>
                          <tbody>
                            {w.lines.map((s) => {
                              const ct = cylinderTypes.find((c) => c.id === s.cylinder_type_id) ?? s.cylinder_type;
                              return (
                                <tr key={s.id}>
                                  <td>
                                    <span style={{ background: "#eff6ff", color: "#1e40af", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                                      {ct?.brand?.name ?? "—"}
                                    </span>
                                  </td>
                                  <td><strong>{ct?.name ?? `#${s.cylinder_type_id}`}</strong></td>
                                  <td><span style={{ fontFamily: "monospace" }}>{ct?.weight ?? "?"} kg</span></td>
                                  <td>
                                    <span style={{ fontWeight: 800, fontSize: 15, color: s.quantity < 10 ? "#dc2626" : "#0f172a" }}>
                                      {s.quantity}
                                    </span>
                                    {s.quantity < 10 && (
                                      <span style={{ color: "#dc2626", fontSize: 10, marginLeft: 5, fontWeight: 800, background: "#fef2f2", padding: "1px 6px", borderRadius: 10 }}>LOW</span>
                                    )}
                                  </td>
                                  <td>
                                    <button
                                      onClick={() => handleDelete(s.id, `${ct?.brand?.name ?? ""} ${ct?.name ?? ""}`)}
                                      className="ap-btn ap-btn-danger ap-btn-sm"
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStockPage;
