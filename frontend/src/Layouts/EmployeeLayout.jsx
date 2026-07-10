import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { FaHome, FaKey } from "react-icons/fa";

const EmployeeLayout = () => {
  const navigate = useNavigate();
  const name     = localStorage.getItem("name") || "Employee";

  const handleLogout = () => {
    localStorage.clear();
    navigate("/portal/login");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>

      <header style={{
        background: "#0f172a", height: 58, padding: "0 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>
            GasHub
          </span>
          <span style={{
            background: "rgba(59,130,246,0.15)", color: "#93c5fd",
            fontSize: 10, fontWeight: 700, padding: "2px 8px",
            borderRadius: 10, letterSpacing: 1, textTransform: "uppercase",
          }}>Employee</span>
        </div>

        <nav style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {[
            { to: "/employee/dashboard",       label: "Dashboard", icon: <FaHome /> },
            { to: "/employee/change-password", label: "Password",  icon: <FaKey />  },
          ].map((n) => (
            <NavLink key={n.to} to={n.to} style={({ isActive }) => ({
              padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600,
              textDecoration: "none", transition: "all 0.15s",
              display: "inline-flex", alignItems: "center", gap: 6,
              background: isActive ? "rgba(59,130,246,0.2)" : "transparent",
              color: isActive ? "#93c5fd" : "#94a3b8",
            })}>
              {n.icon}
              {n.label}
            </NavLink>
          ))}

          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "linear-gradient(135deg,#1e40af,#3b82f6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 800, color: "#fff", marginLeft: 4,
          }}>
            {name.charAt(0).toUpperCase()}
          </div>

          <span style={{ fontSize: 12, color: "#64748b", marginLeft: 2 }}>{name}</span>

          <button onClick={handleLogout} style={{
            background: "rgba(220,38,38,0.15)", color: "#fca5a5",
            border: "1px solid rgba(220,38,38,0.25)",
            padding: "5px 12px", borderRadius: 6, cursor: "pointer",
            fontSize: 12, fontWeight: 600, marginLeft: 4,
          }}>
            Logout
          </button>
        </nav>
      </header>

      <div style={{ padding: "28px 32px", maxWidth: 800, margin: "0 auto" }}>
        <Outlet />
      </div>
    </div>
  );
};

export default EmployeeLayout;
