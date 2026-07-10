import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { FaClipboardList, FaKey, FaSignOutAlt } from "react-icons/fa";
import NotificationBell from "../components/NotificationBell";
import logo2 from "../assets/logo2.png";
import "../styles/ManagerLayout.css";

const ManagerLayout = () => {
  const navigate = useNavigate();
  const token    = localStorage.getItem("token");
  const name     = localStorage.getItem("name") || "Manager";

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

        {/* Centre: nav */}
        <nav className="mgr-layout-nav">
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

        {/* Right: bell + user pill + logout */}
        <div className="mgr-layout-right">
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
      </header>

      <main><Outlet /></main>
    </div>
  );
};

export default ManagerLayout;
