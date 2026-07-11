import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { FaTachometerAlt, FaKey, FaSignOutAlt, FaBars, FaTimes } from "react-icons/fa";
import NotificationBell from "../components/NotificationBell";
import logo2 from "../assets/logo2.png";
import "../styles/DriverLayout.css";

const DriverLayout = () => {
  const navigate = useNavigate();
  const token    = localStorage.getItem("token");
  const name     = localStorage.getItem("name") || "Driver";
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/portal/login");
  };

  return (
    <div className="drv-layout">
      <header className="drv-layout-header">

        {/* Left: logo + role badge */}
        <div className="drv-layout-left">
          <img src={logo2} alt="GasHub" className="drv-layout-logo" />
          <div className="drv-layout-divider" />
          <div className="drv-role-badge">
            <div className="drv-role-dot" />
            <span className="drv-role-text">DELIVERY DRIVER</span>
          </div>
        </div>

        {/* Centre: nav (desktop only) */}
        <nav className="drv-layout-nav drv-desktop-only">
          <NavLink to="/driver/dashboard"       className={({ isActive }) => `drv-nav-link${isActive ? " active" : ""}`}>
            <FaTachometerAlt /> Dashboard
          </NavLink>
          <NavLink to="/driver/change-password" className={({ isActive }) => `drv-nav-link${isActive ? " active" : ""}`}>
            <FaKey /> Password
          </NavLink>
        </nav>

        {/* Right: bell + user pill + logout (desktop only) */}
        <div className="drv-layout-right drv-desktop-only">
          <NotificationBell token={token} />
          <div className="drv-user-pill">
            <div className="drv-user-avatar">
              {name.charAt(0).toUpperCase()}
            </div>
            <span className="drv-user-name">{name}</span>
          </div>
          <button onClick={handleLogout} className="drv-logout-btn">
            <FaSignOutAlt style={{ fontSize: 12 }} /> Logout
          </button>
        </div>

        {/* Mobile controls (hamburger + bell) */}
        <div className="drv-mobile-only" style={{ display: "none", alignItems: "center", gap: 12 }}>
          <NotificationBell token={token} />
          <button className="drv-hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </header>

      {/* Mobile expanded menu */}
      {menuOpen && (
        <div className="drv-mobile-menu">
          <nav className="drv-mobile-nav">
            <NavLink to="/driver/dashboard" onClick={() => setMenuOpen(false)} className={({ isActive }) => `drv-nav-link${isActive ? " active" : ""}`}>
              <FaTachometerAlt /> Dashboard
            </NavLink>
            <NavLink to="/driver/change-password" onClick={() => setMenuOpen(false)} className={({ isActive }) => `drv-nav-link${isActive ? " active" : ""}`}>
              <FaKey /> Password
            </NavLink>
          </nav>
          <div style={{ height: 1, background: "#e2e8f0", margin: "8px 0" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px" }}>
            <div className="drv-user-avatar" style={{ background: "linear-gradient(135deg, #ea580c, #f97316)" }}>
              {name.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>{name}</span>
              <span style={{ fontSize: 10, color: "#64748b" }}>Delivery Driver</span>
            </div>
          </div>
          <button onClick={handleLogout} className="drv-logout-btn" style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
            <FaSignOutAlt style={{ fontSize: 12 }} /> Logout
          </button>
        </div>
      )}

      <main><Outlet /></main>
    </div>
  );
};

export default DriverLayout;
