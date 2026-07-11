import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { FaClipboardList, FaKey, FaSignOutAlt, FaBars, FaTimes } from "react-icons/fa";
import NotificationBell from "../components/NotificationBell";
import logo2 from "../assets/logo2.png";
import "../styles/ManagerLayout.css";

const ManagerLayout = () => {
  const navigate = useNavigate();
  const token    = localStorage.getItem("token");
  const name     = localStorage.getItem("name") || "Manager";
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/portal/login");
  };

  const nav = [
    { to: "/manager/dashboard",       label: "Dashboard", icon: <FaClipboardList /> },
    { to: "/manager/change-password", label: "Password",  icon: <FaKey /> },
  ];

  return (
    <div className="mgr-layout">
      <header className="mgr-layout-header">

        {/* Left: logo + role badge */}
        <div className="mgr-layout-left">
          <img src={logo2} alt="GasHub" className="mgr-layout-logo" />
          <div className="mgr-layout-divider" />
          <div className="mgr-role-badge">
            <div className="mgr-role-dot" />
            <span className="mgr-role-text">WAREHOUSE MANAGER</span>
          </div>
        </div>

        {/* Centre: nav (desktop only) */}
        <nav className="mgr-layout-nav mgr-desktop-only">
          {nav.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => `mgr-nav-link${isActive ? " active" : ""}`}
            >
              {n.icon} {n.label}
            </NavLink>
          ))}
        </nav>

        {/* Right: bell + user pill + logout (desktop only) */}
        <div className="mgr-layout-right mgr-desktop-only">
          <NotificationBell token={token} />
          <div className="mgr-user-pill">
            <div className="mgr-user-avatar">
              {name.charAt(0).toUpperCase()}
            </div>
            <span className="mgr-user-name">{name}</span>
          </div>
          <button onClick={handleLogout} className="mgr-logout-btn">
            <FaSignOutAlt style={{ fontSize: 12 }} /> Logout
          </button>
        </div>

        {/* Mobile controls (hamburger + bell) */}
        <div className="mgr-mobile-only" style={{ display: "none", alignItems: "center", gap: 12 }}>
          <NotificationBell token={token} />
          <button className="mgr-hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </header>

      {/* Mobile expanded drawer */}
      {menuOpen && (
        <div className="mgr-mobile-menu">
          <nav className="mgr-mobile-nav">
            {nav.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => `mgr-nav-link${isActive ? " active" : ""}`}
              >
                {n.icon} {n.label}
              </NavLink>
            ))}
          </nav>
          <div style={{ height: 1, background: "#e2e8f0", margin: "8px 0" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px" }}>
            <div className="mgr-user-avatar" style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}>
              {name.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>{name}</span>
              <span style={{ fontSize: 10, color: "#64748b" }}>Warehouse Manager</span>
            </div>
          </div>
          <button onClick={handleLogout} className="mgr-logout-btn" style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
            <FaSignOutAlt style={{ fontSize: 12 }} /> Logout
          </button>
        </div>
      )}

      <main><Outlet /></main>
    </div>
  );
};

export default ManagerLayout;
