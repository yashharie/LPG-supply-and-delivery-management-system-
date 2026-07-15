import { useEffect, useState } from "react";
import axios from "axios";
import DataTable from "../../components/DataTable";
import { confirmDialog, toast, errorAlert } from "../../utils/swal";
import { FaUserPlus, FaTimes, FaUsers, FaSync } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "../../styles/AdminPages.css";

const API = "http://127.0.0.1:8000/api";

const ROLE_BADGE = {
  manager:  { bg: "#d1fae5", c: "#065f46" },
  driver:   { bg: "#fff7ed", c: "#c2410c" },
  employee: { bg: "#eff6ff", c: "#1d4ed8" },
};
const EMPTY_FORM = { name: "", nic: "", role: "manager", warehouse_id: "" };

const EmployeeList = () => {
  const [employees,   setEmployees]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [warehouses,  setWarehouses]  = useState([]);
  const [submitting,  setSubmitting]  = useState(false);
  const [credentials, setCredentials] = useState(null);

  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const fetchEmployees = () => {
    setLoading(true);
    axios.get(`${API}/admin/employees`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setEmployees(r.data))
      .catch(() => errorAlert("Load Failed", "Could not load employees."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEmployees();
    axios.get(`${API}/warehouses`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setWarehouses(r.data)).catch(console.error);
  }, []);

  const handleDelete = async (id, name) => {
    const ok = await confirmDialog({ title: `Delete ${name}?`, text: "Permanently removed.", confirmText: "Yes, Delete", danger: true });
    if (!ok) return;
    try {
      await axios.delete(`${API}/admin/employees/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setEmployees((p) => p.filter((e) => e.id !== id));
      toast("Employee deleted successfully.");
    } catch { errorAlert("Delete Failed", "Could not delete this employee."); }
  };

  const handleToggleStatus = async (id, name, current) => {
    const action = current ? "deactivate" : "activate";
    const ok = await confirmDialog({
      title: `${current ? "Deactivate" : "Activate"} ${name}?`,
      text: `This will ${action} their portal access.`,
      icon: "question",
      confirmText: `Yes, ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      danger: current,
    });
    if (!ok) return;
    try {
      await axios.put(`${API}/admin/employees/${id}`, { status: !current }, { headers: { Authorization: `Bearer ${token}` } });
      fetchEmployees();
      toast(`Employee ${current ? "deactivated" : "activated"}.`, current ? "warning" : "success");
    } catch { errorAlert("Update Failed"); }
  };

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Frontend name validation — letters only
    if (!/^[a-zA-Z\s]+$/.test(form.name.trim())) {
      errorAlert("Invalid Name", "Name must contain letters only (no numbers or symbols).");
      return;
    }
    setSubmitting(true);
    setCredentials(null);
    try {
      const res = await axios.post(
        `${API}/admin/employees`,
        { name: form.name, nic: form.nic, role: form.role, warehouse_id: form.warehouse_id || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCredentials({
        name:             res.data.employee.name,
        employee_id:      res.data.employee_id,
        default_password: res.data.default_password,
        role:             res.data.employee.role,
      });
      toast(`${res.data.employee.name} created successfully.`);
      setForm(EMPTY_FORM);
      fetchEmployees();
    } catch (err) {
      errorAlert("Creation Failed",
        err.response?.data?.message ||
        Object.values(err.response?.data?.errors ?? {})[0]?.[0] ||
        "Failed to create employee."
      );
    } finally { setSubmitting(false); }
  };

  const columns = [
    { title: "Emp ID",    data: "employee_id",
      render: (d) => `<span style="font-family:monospace;font-weight:700;color:#1e40af">${d}</span>` },
    { title: "Name",      data: "name",
      render: (d) => `<strong style="color:#0f172a">${d}</strong>` },
    { title: "NIC",       data: "nic",
      render: (d) => `<span style="font-family:monospace;font-size:12px">${d}</span>` },
    { title: "Role",      data: "role",
      render: (d) => {
        const s = ROLE_BADGE[d] ?? { bg: "#f1f5f9", c: "#334155" };
        return `<span style="background:${s.bg};color:${s.c};padding:3px 11px;border-radius:20px;font-size:11.5px;font-weight:700">${d}</span>`;
      }},
    { title: "Warehouse", data: "warehouse",
      render: (d) => d?.name ?? `<em style="color:#aaa;font-size:12px">Unassigned</em>` },
    { title: "Status",    data: "status",
      render: (d) => d
        ? `<span style="background:#d1fae5;color:#065f46;padding:3px 11px;border-radius:20px;font-size:11.5px;font-weight:700">Active</span>`
        : `<span style="background:#fee2e2;color:#991b1b;padding:3px 11px;border-radius:20px;font-size:11.5px;font-weight:700">Inactive</span>` },
    { title: "Actions",   data: null, orderable: false,
      render: (_, __, row) =>
        `<div style="display:flex;gap:6px">
          <button class="dt-btn-toggle" data-id="${row.id}" data-name="${row.name}" data-status="${row.status ? 1 : 0}"
            style="background:${row.status ? "#fef9c3" : "#d1fae5"};color:${row.status ? "#92400e" : "#065f46"};
            border:none;padding:5px 11px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit">
            ${row.status ? "Deactivate" : "Activate"}
          </button>
          <button class="dt-btn-delete" data-id="${row.id}" data-name="${row.name}"
            style="background:#fee2e2;color:#dc2626;border:none;padding:5px 11px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit">
            Delete
          </button>
        </div>` },
  ];

  const handleTableClick = (e) => {
    const toggleBtn = e.target.closest(".dt-btn-toggle");
    const deleteBtn = e.target.closest(".dt-btn-delete");
    if (toggleBtn) { const { id, name, status } = toggleBtn.dataset; handleToggleStatus(Number(id), name, status === "1"); }
    if (deleteBtn) { const { id, name } = deleteBtn.dataset; handleDelete(Number(id), name); }
  };

  const managerCount = employees.filter((e) => e.role === "manager").length;
  const driverCount  = employees.filter((e) => e.role === "driver").length;
  const activeCount  = employees.filter((e) => e.status).length;

  if (loading) return (
    <div className="ap-page">
      <div className="ap-hero"><div className="ap-hero-ring" /><div className="ap-hero-inner"><div><div className="ap-hero-eyebrow">Admin · Staff</div><h1 className="ap-hero-title">Employee Registry</h1></div></div></div>
      <div className="ap-body"><div className="ap-card"><div className="ap-empty"><div className="ap-empty-icon">⏳</div><div className="ap-empty-text">Loading employees…</div></div></div></div>
    </div>
  );

  return (
    <div className="ap-page" onClick={handleTableClick}>

      {/* ── Hero ── */}
      <div className="ap-hero">
        <div className="ap-hero-ring" />
        <div className="ap-hero-inner">
          <div>
            <div className="ap-hero-eyebrow">Admin · Human Resources</div>
            <h1 className="ap-hero-title">Employee Registry</h1>
            <p className="ap-hero-sub">Manage managers, drivers and staff accounts</p>
          </div>
          <div className="ap-hero-actions">
            <span className="ap-hero-badge">
              <FaUsers style={{ fontSize: 12 }} />
              {employees.length} staff members
            </span>
            <button className="ap-hero-btn" onClick={fetchEmployees}>
              <FaSync style={{ fontSize: 11 }} />
            </button>
            <button
              className="ap-hero-btn"
              onClick={() => { setShowForm((v) => !v); setCredentials(null); }}
              style={{ background: showForm ? "rgba(255,255,255,0.2)" : "rgba(59,130,246,0.8)", border: "1px solid rgba(255,255,255,0.3)" }}
            >
              {showForm ? <><FaTimes style={{ fontSize: 11 }} /> Cancel</> : <><FaUserPlus style={{ fontSize: 11 }} /> Add Employee</>}
            </button>
          </div>
        </div>
      </div>

      <div className="ap-body">

        {/* ── KPI strip ── */}
        <div className="ap-kpi-strip ap-kpi-strip-4" style={{ marginBottom: 24 }}>
          {[
            { label: "Total Staff",     value: employees.length, accent: "#3b82f6", bg: "#eff6ff", icon: "👥", path: "/admin/employees" },
            { label: "Managers",        value: managerCount,     accent: "#16a34a", bg: "#f0fdf4", icon: "👔", path: "/admin/employees" },
            { label: "Drivers",         value: driverCount,      accent: "#f59e0b", bg: "#fffbeb", icon: "🚚", path: "/admin/drivers-map" },
            { label: "Active Accounts", value: activeCount,      accent: "#8b5cf6", bg: "#faf5ff", icon: "✅", path: "/admin/employees" },
          ].map((k, i) => (
            <div key={k.label} className="ap-kpi-card" onClick={() => navigate(k.path)} style={{ borderBottomColor: k.accent, animationDelay: `${i * 0.07}s`, cursor: "pointer" }}>
              <div className="ap-kpi-bg-circle" style={{ background: k.bg }} />
              <div className="ap-kpi-icon" style={{ color: k.accent }}>{k.icon}</div>
              <div className="ap-kpi-label">{k.label}</div>
              <div className="ap-kpi-value" style={{ color: k.accent }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* ── Add Employee form ── */}
        {showForm && (
          <div className="ap-card" style={{ marginBottom: 24 }}>
            <div className="ap-card-header">
              <div className="ap-card-title-wrap">
                <div className="ap-card-icon-box" style={{ background: "#eff6ff" }}>
                  <FaUserPlus style={{ color: "#1e40af", fontSize: 14 }} />
                </div>
                <div>
                  <div className="ap-card-title">New Employee Account</div>
                  <div className="ap-card-sub">Auto-generated employee ID and temporary password</div>
                </div>
              </div>
            </div>

            <div className="ap-card-body">
              {/* Credentials box */}
              {credentials && (
                <div className="ap-credentials-box" style={{ marginBottom: 20 }}>
                  <div className="ap-credentials-title">
                    ✅ Account Created — Hand these to <strong>{credentials.name}</strong>
                  </div>
                  {[
                    ["Employee ID",   credentials.employee_id],
                    ["Login Email",   `${credentials.employee_id}@gashub.local`],
                    ["Temp Password", credentials.default_password],
                    ["Role",          credentials.role],
                  ].map(([label, value]) => (
                    <div key={label} className="ap-credentials-row">
                      <span className="ap-credentials-label">{label}:</span>
                      <span className="ap-credentials-val">{value}</span>
                    </div>
                  ))}
                  <button onClick={() => setCredentials(null)} className="ap-btn ap-btn-ghost ap-btn-sm" style={{ marginTop: 10 }}>
                    Dismiss
                  </button>
                </div>
              )}

              {/* Form grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} onClick={(e) => e.stopPropagation()}>
                <div className="ap-form-group" style={{ margin: 0 }}>
                  <label className="ap-label">Full Name *</label>
                  <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. John Perera" required className="ap-input"
                    pattern="[A-Za-z\s]+" title="Letters only — no numbers or symbols" />
                </div>
                <div className="ap-form-group" style={{ margin: 0 }}>
                  <label className="ap-label">NIC Number *</label>
                  <input name="nic" value={form.nic} onChange={handleChange} placeholder="e.g. 199512345V" required className="ap-input" />
                </div>
                <div className="ap-form-group" style={{ margin: 0 }}>
                  <label className="ap-label">Role *</label>
                  <select name="role" value={form.role} onChange={handleChange} className="ap-select">
                    <option value="manager">Manager</option>
                    <option value="driver">Driver</option>
                  </select>
                </div>
                <div className="ap-form-group" style={{ margin: 0 }}>
                  <label className="ap-label">Warehouse</label>
                  <select name="warehouse_id" value={form.warehouse_id} onChange={handleChange} className="ap-select">
                    <option value="">— No warehouse —</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 20, display: "flex", gap: 10 }} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !form.name || !form.nic}
                  className="ap-btn ap-btn-primary"
                  style={{ minWidth: 160 }}
                >
                  {submitting ? "Creating…" : "Create Employee"}
                </button>
                <button
                  onClick={() => { setForm(EMPTY_FORM); setCredentials(null); setShowForm(false); }}
                  className="ap-btn ap-btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Employee table ── */}
        <div className="ap-card">
          <div className="ap-card-header">
            <div className="ap-card-title-wrap">
              <div className="ap-card-icon-box" style={{ background: "#f0fdf4" }}>
                <FaUsers style={{ color: "#16a34a", fontSize: 14 }} />
              </div>
              <div>
                <div className="ap-card-title">All Employees</div>
                <div className="ap-card-sub">{employees.length} records</div>
              </div>
            </div>
          </div>
          <div className="ap-card-body">
            <DataTable id="employees-table" columns={columns} data={employees} />
          </div>
        </div>

      </div>
    </div>
  );
};

export default EmployeeList;
