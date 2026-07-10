import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { FaTachometerAlt, FaKey, FaSignOutAlt } from "react-icons/fa";
import NotificationBell from "../components/NotificationBell";
import logo2 from "../assets/logo2.png";
import "../styles/DriverLayout.css";

const DriverLayout = () => {
  const navigate = useNavigate();
  const token    = localStorage.getItem("token");
  const name     = localStorage.getItem("name") || "Driver";

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

        {/* Centre: nav */}
        <nav className="drv-layout-nav">
          <NavLink to="/driver/dashboard"       className={({ isActive }) => `drv-nav-link${isActive ? " active" : ""}`}>
            <FaTachometerAlt /> Dashboard
          </NavLink>
          <NavLink to="/driver/change-password" className={({ isActive }) => `drv-nav-link${isActive ? " active" : ""}`}>
            <FaKey /> Password
          </NavLink>
        </nav>

        {/* Right: bell + user pill + logout */}
        <div className="drv-layout-right">
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
      </header>

      <main><Outlet /></main>
    </div>
  );
};

export default DriverLayout;
