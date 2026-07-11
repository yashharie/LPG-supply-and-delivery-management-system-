import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { FaHome, FaKey, FaBars, FaTimes } from "react-icons/fa";

const EmployeeLayout = () => {
  const navigate = useNavigate();
  const name     = localStorage.getItem("name") || "Employee";
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/portal/login");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <style>{`
        .emp-desktop-nav {
          display: flex;
          gap: 4px;
          align-items: center;
        }
        .emp-mobile-toggle {
          display: none;
          background: none;
          border: none;
          color: #fff;
          font-size: 20px;
          cursor: pointer;
          padding: 8px;
          align-items: center;
        }
        .emp-mobile-menu {
          display: none;
        }
        @media (max-width: 768px) {
          .emp-desktop-nav {
            display: none !important;
          }
          .emp-mobile-toggle {
            display: flex;
          }
          .emp-mobile-menu {
            display: flex;
            flex-direction: column;
            gap: 12px;
            background: #0f172a;
            border-top: 1px solid rgba(255,255,255,0.06);
            padding: 16px 24px;
            position: absolute;
            top: 58px;
            left: 0;
            right: 0;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
            z-index: 99;
          }
        }
      `}</style>

      <header style={{
        background: "#0f172a", height: 58, padding: "0 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>
            GasHub
          </span>
          <span style={{
            background: "rgba(59,130,246,0.15)", color: "#93c5fd",
            fontSize: 10, fontWeight: 700, padding: "2px 8px",
            borderRadius: 10, letterSpacing: 1, textTransform: "uppercase",
          }}>Employee</span>
        </div>

        {/* Desktop Navbar Links */}
        <nav className="emp-desktop-nav">
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

        {/* Mobile controls (hamburger menu toggle button) */}
        <button className="emp-mobile-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </header>

      {/* Mobile expanded drawer menu */}
      {menuOpen && (
        <div className="emp-mobile-menu">
          <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              { to: "/employee/dashboard",       label: "Dashboard", icon: <FaHome /> },
              { to: "/employee/change-password", label: "Password",  icon: <FaKey />  },
            ].map((n) => (
              <NavLink key={n.to} to={n.to} onClick={() => setMenuOpen(false)} style={({ isActive }) => ({
                padding: "10px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600,
                textDecoration: "none", display: "flex", alignItems: "center", gap: 8,
                background: isActive ? "rgba(59,130,246,0.2)" : "transparent",
                color: isActive ? "#93c5fd" : "#94a3b8",
              })}>
                {n.icon}
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "8px 0" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px" }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%",
              background: "linear-gradient(135deg,#1e40af,#3b82f6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 800, color: "#fff",
            }}>
              {name.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{name}</span>
              <span style={{ fontSize: 10, color: "#64748b" }}>Staff Employee</span>
            </div>
          </div>
          <button onClick={handleLogout} style={{
            background: "rgba(220,38,38,0.15)", color: "#fca5a5",
            border: "1px solid rgba(220,38,38,0.25)",
            padding: "10px", borderRadius: 6, cursor: "pointer",
            fontSize: 12, fontWeight: 600, width: "100%", textAlign: "center", marginTop: 8,
          }}>
            Logout
          </button>
        </div>
      )}

      <div style={{ padding: "28px 32px", maxWidth: 800, margin: "0 auto" }}>
        <Outlet />
      </div>
    </div>
  );
};

export default EmployeeLayout;
