import { useEffect, useState } from "react";
import axios from "axios";
import { confirmDialog, toast, errorAlert } from "../../utils/swal";
import { FaFire, FaTag, FaSync } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "../../styles/AdminPages.css";

const API = "http://127.0.0.1:8000/api";

const CylinderTypes = () => {
  const [brands,        setBrands]        = useState([]);
  const [cylinderTypes, setCylinderTypes] = useState([]);
  const [ctForm,  setCtForm]  = useState({ brand_id: "", name: "", weight: "", price: "" });
  const [bForm,   setBForm]   = useState({ name: "" });
  const [ctSub,   setCtSub]   = useState(false);
  const [bSub,    setBSub]    = useState(false);

  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const fetchAll = () => {
    axios.get(`${API}/brands`,         { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setBrands(r.data)).catch(console.error);
    axios.get(`${API}/cylinder-types`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setCylinderTypes(r.data)).catch(console.error);
  };

  useEffect(fetchAll, []);

  const handleCtChange = (e) => setCtForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleBChange  = (e) => setBForm((p)  => ({ ...p, [e.target.name]: e.target.value }));

  const handleCtSubmit = async (e) => {
    e.preventDefault();
    setCtSub(true);
    try {
      await axios.post(
        `${API}/admin/cylinder-types`,
        { ...ctForm, weight: parseFloat(ctForm.weight), price: parseFloat(ctForm.price) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast("Cylinder type created successfully.");
      setCtForm({ brand_id: "", name: "", weight: "", price: "" });
      fetchAll();
    } catch (err) { errorAlert("Failed", err.response?.data?.message ?? "Could not create cylinder type."); }
    finally { setCtSub(false); }
  };

  const deleteCt = async (id) => {
    const ok = await confirmDialog({ title: "Delete Cylinder Type?", text: "Orders using it won't be affected.", confirmText: "Yes, Delete", danger: true });
    if (!ok) return;
    try {
      await axios.delete(`${API}/admin/cylinder-types/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setCylinderTypes((p) => p.filter((c) => c.id !== id));
      toast("Cylinder type deleted.");
    } catch { errorAlert("Delete Failed"); }
  };

  const handleBSubmit = async (e) => {
    e.preventDefault();
    setBSub(true);
    try {
      await axios.post(`${API}/admin/brands`, { name: bForm.name }, { headers: { Authorization: `Bearer ${token}` } });
      toast("Brand created successfully.");
      setBForm({ name: "" });
      fetchAll();
    } catch (err) { errorAlert("Failed", err.response?.data?.message ?? "Could not create brand."); }
    finally { setBSub(false); }
  };

  const deleteBrand = async (id) => {
    const ok = await confirmDialog({ title: "Delete Brand?", text: "Also deletes all linked cylinder types.", confirmText: "Yes, Delete", danger: true });
    if (!ok) return;
    try {
      await axios.delete(`${API}/admin/brands/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast("Brand deleted.");
      fetchAll();
    } catch { errorAlert("Delete Failed"); }
  };

  return (
    <div className="ap-page">
      {/* ── Hero ── */}
      <div className="ap-hero">
        <div className="ap-hero-ring" />
        <div className="ap-hero-inner">
          <div>
            <div className="ap-hero-eyebrow">Admin · Product Catalog</div>
            <h1 className="ap-hero-title">Cylinder Types & Brands</h1>
            <p className="ap-hero-sub">Configure gas cylinder product catalog and pricing</p>
          </div>
          <div className="ap-hero-actions">
            <span className="ap-hero-badge">
              <FaFire style={{ fontSize: 12 }} />
              {cylinderTypes.length} types · {brands.length} brands
            </span>
            <button className="ap-hero-btn" onClick={fetchAll}>
              <FaSync style={{ fontSize: 11 }} />
            </button>
          </div>
        </div>
      </div>

      <div className="ap-body">

        {/* ── KPI strip ── */}
        <div className="ap-kpi-strip ap-kpi-strip-4" style={{ marginBottom: 24 }}>
          {[
            { label: "Total Types",  value: cylinderTypes.length, accent: "#3b82f6", bg: "#eff6ff", icon: "🔵", path: "/admin/cylinder-types" },
            { label: "Brands",       value: brands.length,        accent: "#16a34a", bg: "#f0fdf4", icon: "🏷️", path: "/admin/cylinder-types" },
            {
              label: "Avg Price",
              value: cylinderTypes.length
                ? `LKR ${Math.round(cylinderTypes.reduce((s, c) => s + parseFloat(c.price ?? 0), 0) / cylinderTypes.length).toLocaleString()}`
                : "—",
              accent: "#8b5cf6", bg: "#faf5ff", icon: "💰", small: true, path: "/admin/cylinder-types",
            },
            {
              label: "Weight Range",
              value: cylinderTypes.length
                ? `${Math.min(...cylinderTypes.map((c) => c.weight))}–${Math.max(...cylinderTypes.map((c) => c.weight))} kg`
                : "—",
              accent: "#f59e0b", bg: "#fffbeb", icon: "⚖️", small: true, path: "/admin/cylinder-types",
            },
          ].map((k, i) => (
            <div key={k.label} className="ap-kpi-card" onClick={() => navigate(k.path)} style={{ borderBottomColor: k.accent, animationDelay: `${i * 0.07}s`, cursor: "pointer" }}>
              <div className="ap-kpi-bg-circle" style={{ background: k.bg }} />
              <div className="ap-kpi-icon" style={{ color: k.accent }}>{k.icon}</div>
              <div className="ap-kpi-label">{k.label}</div>
              <div className="ap-kpi-value" style={{ color: k.accent, fontSize: k.small ? 18 : 32 }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div className="ap-grid-2">

          {/* ── LEFT: Cylinder types ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Add cylinder type form */}
            <div className="ap-card">
              <div className="ap-card-header">
                <div className="ap-card-title-wrap">
                  <div className="ap-card-icon-box" style={{ background: "#eff6ff" }}>
                    <FaFire style={{ color: "#1e40af", fontSize: 14 }} />
                  </div>
                  <div>
                    <div className="ap-card-title">Add Cylinder Type</div>
                    <div className="ap-card-sub">Define weight, brand and pricing</div>
                  </div>
                </div>
              </div>
              <div className="ap-card-body">
                <form onSubmit={handleCtSubmit}>
                  <div className="ap-form-group">
                    <label className="ap-label">Brand</label>
                    <select name="brand_id" className="ap-select" value={ctForm.brand_id} onChange={handleCtChange} required>
                      <option value="">— Select brand —</option>
                      {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="ap-form-group">
                    <label className="ap-label">Name</label>
                    <input name="name" className="ap-input" value={ctForm.name} onChange={handleCtChange} placeholder="e.g. Medium Cylinder" required />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div className="ap-form-group">
                      <label className="ap-label">Weight (kg)</label>
                      <input name="weight" type="number" step="0.1" className="ap-input" value={ctForm.weight} onChange={handleCtChange} placeholder="e.g. 12.5" required />
                    </div>
                    <div className="ap-form-group">
                      <label className="ap-label">Price (LKR)</label>
                      <input name="price" type="number" className="ap-input" value={ctForm.price} onChange={handleCtChange} placeholder="e.g. 3500" required />
                    </div>
                  </div>
                  <button type="submit" className="ap-btn ap-btn-primary ap-btn-full" disabled={ctSub}>
                    {ctSub ? "Saving…" : "✅ Add Cylinder Type"}
                  </button>
                </form>
              </div>
            </div>

            {/* Cylinder types list */}
            <div className="ap-card">
              <div className="ap-card-header">
                <div className="ap-card-title-wrap">
                  <div className="ap-card-icon-box" style={{ background: "#eff6ff" }}>
                    <span style={{ fontSize: 14 }}>🔵</span>
                  </div>
                  <div>
                    <div className="ap-card-title">All Cylinder Types</div>
                    <div className="ap-card-sub">{cylinderTypes.length} configured</div>
                  </div>
                </div>
              </div>
              <div className="ap-card-body-flush">
                {cylinderTypes.length === 0 ? (
                  <div className="ap-empty" style={{ padding: "32px 24px" }}>
                    <div className="ap-empty-icon">🔵</div>
                    <div className="ap-empty-text">No cylinder types yet.</div>
                  </div>
                ) : (
                  <table className="ap-table">
                    <thead>
                      <tr>
                        <th>Brand</th>
                        <th>Name</th>
                        <th>Weight</th>
                        <th>Price</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cylinderTypes.map((ct) => (
                        <tr key={ct.id}>
                          <td>
                            <span style={{ background: "#eff6ff", color: "#1e40af", padding: "2px 9px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                              {ct.brand?.name ?? "—"}
                            </span>
                          </td>
                          <td><strong style={{ color: "#0f172a" }}>{ct.name}</strong></td>
                          <td><span style={{ fontFamily: "monospace", fontWeight: 700 }}>{ct.weight} kg</span></td>
                          <td><span style={{ color: "#059669", fontWeight: 700 }}>LKR {parseFloat(ct.price).toLocaleString()}</span></td>
                          <td>
                            <button
                              onClick={() => deleteCt(ct.id)}
                              className="ap-btn ap-btn-danger ap-btn-sm"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>

          {/* ── RIGHT: Brands ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Add brand form */}
            <div className="ap-card">
              <div className="ap-card-header">
                <div className="ap-card-title-wrap">
                  <div className="ap-card-icon-box" style={{ background: "#f0fdf4" }}>
                    <FaTag style={{ color: "#16a34a", fontSize: 14 }} />
                  </div>
                  <div>
                    <div className="ap-card-title">Add Brand</div>
                    <div className="ap-card-sub">Register a new gas brand</div>
                  </div>
                </div>
              </div>
              <div className="ap-card-body">
                <form onSubmit={handleBSubmit}>
                  <div className="ap-form-group">
                    <label className="ap-label">Brand Name</label>
                    <input name="name" className="ap-input" value={bForm.name} onChange={handleBChange} placeholder="e.g. Litro Gas" required />
                  </div>
                  <button type="submit" className="ap-btn ap-btn-success ap-btn-full" disabled={bSub}>
                    {bSub ? "Saving…" : "✅ Add Brand"}
                  </button>
                </form>
              </div>
            </div>

            {/* Brands list */}
            <div className="ap-card">
              <div className="ap-card-header">
                <div className="ap-card-title-wrap">
                  <div className="ap-card-icon-box" style={{ background: "#f0fdf4" }}>
                    <FaTag style={{ color: "#16a34a", fontSize: 14 }} />
                  </div>
                  <div>
                    <div className="ap-card-title">All Brands</div>
                    <div className="ap-card-sub">{brands.length} registered brands</div>
                  </div>
                </div>
              </div>
              <div className="ap-card-body-flush">
                {brands.length === 0 ? (
                  <div className="ap-empty" style={{ padding: "32px 24px" }}>
                    <div className="ap-empty-icon">🏷️</div>
                    <div className="ap-empty-text">No brands yet.</div>
                  </div>
                ) : (
                  <table className="ap-table">
                    <thead>
                      <tr>
                        <th>Brand Name</th>
                        <th>Types</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {brands.map((b) => {
                        const typeCount = cylinderTypes.filter((ct) => ct.brand_id === b.id).length;
                        return (
                          <tr key={b.id}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 30, height: 30, borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                                  🏷️
                                </div>
                                <strong style={{ color: "#0f172a" }}>{b.name}</strong>
                              </div>
                            </td>
                            <td>
                              <span style={{ background: "#eff6ff", color: "#1e40af", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                                {typeCount} type{typeCount !== 1 ? "s" : ""}
                              </span>
                            </td>
                            <td>
                              <button onClick={() => deleteBrand(b.id)} className="ap-btn ap-btn-danger ap-btn-sm">
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default CylinderTypes;
