import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  FaChartBar, FaListAlt, FaWarehouse, FaBoxes, FaHistory,
  FaUsers, FaUser, FaCogs, FaEnvelopeOpen, FaSignOutAlt, FaTruck,
  FaBars, FaTimes,
} from "react-icons/fa";
import NotificationBell from "../components/NotificationBell";
import logo2 from "../assets/logo2.png";
import "../styles/AdminLayout.css";

const AdminLayout = () => {
  const navigate = useNavigate();
  const token    = localStorage.getItem("token");
  const name     = localStorage.getItem("name") || "Admin";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/portal/login");
  };

  const navGroups = [
    {
      label: "Overview",
      items: [
        { to: "/admin/dashboard",   icon: <FaChartBar />, label: "Dashboard"    },
        { to: "/admin/orders",      icon: <FaListAlt />,  label: "Orders"       },
        { to: "/admin/drivers-map", icon: <FaTruck />,    label: "Live Drivers" },
      ],
    },
    {
      label: "Inventory",
      items: [
        { to: "/admin/warehouses",     icon: <FaWarehouse />, label: "Warehouses"    },
        { to: "/admin/stock",          icon: <FaBoxes />,     label: "Stock"         },
        { to: "/admin/stock-history",  icon: <FaHistory />,   label: "Stock History" },
        { to: "/admin/cylinder-types", icon: <FaCogs />,      label: "Cylinders"     },
      ],
    },
    {
      label: "People",
      items: [
        { to: "/admin/employees", icon: <FaUsers />,        label: "Employees" },
        { to: "/admin/clients",   icon: <FaUser />,         label: "Clients"   },
        { to: "/admin/feedback",  icon: <FaEnvelopeOpen />, label: "Support"   },
      ],
    },
  ];

  return (
    <div className="adm-layout">
      {/* Mobile Top Header Bar */}
      <header className="adm-mobile-header">
        <button className="adm-menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Toggle Navigation Menu">
          <FaBars />
        </button>
        <img src={logo2} alt="GasHub" className="adm-mobile-logo-img" />
        <div style={{ width: 34 }} />
      </header>

      {/* Sidebar Overlay Backdrop */}
      {sidebarOpen && (
        <div className="adm-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`adm-sidebar ${sidebarOpen ? "mobile-open" : ""}`}>
        {/* Mobile close button */}
        <button className="adm-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close Menu">
          <FaTimes />
        </button>

        {/* Logo */}
        <div className="adm-sidebar-logo">
          <img src={logo2} alt="GasHub" className="adm-sidebar-logo-img" />
          <div className="adm-portal-badge">
            <div className="adm-portal-dot" />
            <span className="adm-portal-text">ADMIN PORTAL</span>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="adm-nav">
          {navGroups.map(group => (
            <div key={group.label} className="adm-nav-group">
              <div className="adm-nav-group-label">{group.label}</div>
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `adm-nav-link${isActive ? " active" : ""}`}
                >
                  <span className="adm-nav-icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom: user + bell + sign out */}
        <div className="adm-sidebar-bottom">
          <div className="adm-user-row">
            <div className="adm-user-avatar">{name.charAt(0).toUpperCase()}</div>
            <div>
              <div className="adm-user-name">{name}</div>
              <div className="adm-user-role">Administrator</div>
            </div>
            <div className="adm-bell-wrap">
              <NotificationBell token={token} />
            </div>
          </div>
          <button onClick={handleLogout} className="adm-signout-btn">
            <FaSignOutAlt style={{ fontSize: 11 }} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="adm-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
