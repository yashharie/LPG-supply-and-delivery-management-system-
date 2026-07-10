import { useState } from "react";
import ClientBookingPage from "../pages/client/ClientBookingPage.jsx";
import ClientOrderHistory from "../pages/client/ClientOrderHistory.jsx";
import "../styles/ClientDashboard.css";

const ClientLayout = () => {
  const [currentTab, setCurrentTab] = useState("booking");

  return (
    <div className="client-layout-container">
      {/* Top Application Header Bar */}
      <header className="client-navbar">
        <div className="navbar-logo">🔥 GasHub Consumer Portal</div>
        <nav className="navbar-links">
          <button 
            className={`nav-btn ${currentTab === "booking" ? "active" : ""}`}
            onClick={() => setCurrentTab("booking")}
          >
            🛒 Request Cylinder
          </button>
          <button 
            className={`nav-btn ${currentTab === "history" ? "active" : ""}`}
            onClick={() => setCurrentTab("history")}
          >
            👤 Profile & Order History
          </button>
        </nav>
        <button className="nav-logout-btn">Logout</button>
      </header>

      {/* Main Panel Inset Workspace */}
      <main className="client-workspace">
        {currentTab === "booking" && <ClientBookingPage />}
        {currentTab === "history" && <ClientOrderHistory />}
      </main>
    </div>
  );
};

export default ClientLayout;