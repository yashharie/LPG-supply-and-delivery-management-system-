import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { FaBoxes, FaUserCog, FaKey } from "react-icons/fa";

const API = "http://127.0.0.1:8000/api";

const S = {
  card: {
    background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0",
    boxShadow: "0 1px 4px rgba(15,23,42,0.06)", overflow: "hidden",
  },
  cardHeader: {
    padding: "16px 20px", borderBottom: "1px solid #f1f5f9",
    fontSize: 13, fontWeight: 700, color: "#0f172a", display: "flex",
    justifyContent: "space-between", alignItems: "center",
  },
  row: {
    display: "grid", gridTemplateColumns: "140px 1fr",
    padding: "12px 20px", borderBottom: "1px solid #f8fafc",
    fontSize: 13, gap: 12, alignItems: "center",
  },
  key:  { fontWeight: 600, color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 },
  val:  { color: "#0f172a" },
};

const EmployeeDashboard = () => {
  const [employee, setEmployee] = useState(null);
  const [stocks,   setStocks]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const token = localStorage.getItem("token");

  useEffect(() => {
    axios.get(`${API}/employee/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        setEmployee(res.data.employee);
        setStocks(res.data.stock ?? []);
      })
      .catch(() => setError("Failed to load dashboard."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, gap: 10, color: "#94a3b8" }}>
      <div style={{ width: 18, height: 18, border: "2px solid #e2e8f0", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      Loading…
    </div>
  );
  if (error) return <p style={{ padding: 20, color: "#dc2626" }}>{error}</p>;

  const ROWS = [
    ["Employee ID", employee.employee_id],
    ["NIC",         employee.nic],
    ["Role",        employee.role.charAt(0).toUpperCase() + employee.role.slice(1)],
    ["Warehouse",   employee.warehouse?.name ?? "Unassigned"],
    ["Status",      employee.status
      ? <span style={{ background: "#dcfce7", color: "#15803d", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Active</span>
      : <span style={{ background: "#fee2e2", color: "#dc2626", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Inactive</span>],
  ];

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 4px", letterSpacing: -0.3, display: "flex", alignItems: "center", gap: 8 }}>
          <FaUserCog style={{ color: "#1e40af" }} /> Employee Dashboard
        </h1>
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
          Welcome back, <strong>{employee.name}</strong>
        </p>
      </div>

      {/* Profile card */}
      <div style={{ ...S.card, marginBottom: 20 }}>
        <div style={S.cardHeader}>My Details</div>
        {ROWS.map(([k, v]) => (
          <div key={k} style={S.row}>
            <div style={S.key}>{k}</div>
            <div style={S.val}>{v}</div>
          </div>
        ))}
      </div>

      {/* Stock card */}
      {employee.warehouse_id && (
        <div style={{ ...S.card, marginBottom: 20 }}>
          <div style={S.cardHeader}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><FaBoxes /> Warehouse Stock</span>
            <span style={{ background: "#eff6ff", color: "#1e40af", fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 10 }}>
              {employee.warehouse?.name}
            </span>
          </div>
          {stocks.length === 0 ? (
            <p style={{ padding: 20, color: "#94a3b8", fontSize: 13 }}>No stock entries for this warehouse.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Brand", "Cylinder", "Weight", "Qty"].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stocks.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td style={{ padding: "11px 16px" }}>{s.cylinder_type?.brand?.name ?? "—"}</td>
                    <td style={{ padding: "11px 16px" }}>{s.cylinder_type?.name ?? `#${s.cylinder_type_id}`}</td>
                    <td style={{ padding: "11px 16px" }}>{s.cylinder_type?.weight ?? "?"}kg</td>
                    <td style={{ padding: "11px 16px" }}>
                      <strong style={{ color: s.quantity < 10 ? "#dc2626" : "#0f172a" }}>{s.quantity}</strong>
                      {s.quantity < 10 && <span style={{ color: "#dc2626", fontSize: 10, marginLeft: 4, fontWeight: 700 }}>LOW</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Actions */}
      <Link to="/employee/change-password" style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        background: "#1e40af", color: "#fff", padding: "10px 20px",
        borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 13,
      }}>
        <FaKey /> Change Password
      </Link>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default EmployeeDashboard;
