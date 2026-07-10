import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaSync } from "react-icons/fa";

import GasBookingTab      from "./tabs/GasBookingTab";
import OrderHistoryTab    from "./tabs/OrderHistoryTab";
import ProfileSettingsTab from "./tabs/ProfileSettingsTab";
import NotificationBell   from "../../components/NotificationBell";
import ChatBot            from "../../components/ChatBot";
import logo2              from "../../assets/logo2.png";
import "../../styles/ClientDashboard.css";

const API = "http://127.0.0.1:8000/api";

const TABS = [
  { key: "booking", label: "Book Gas",  icon: "🔥" },
  { key: "history", label: "My Orders", icon: "📋" },
  { key: "profile", label: "Profile",   icon: "👤" },
];

const buildFallbackUser = () => {
  try {
    const c = JSON.parse(localStorage.getItem("user") || "null");
    if (c?.name) return c;
  } catch { /* */ }
  return { name: localStorage.getItem("name") || "User", role: "client" };
};

const ClientDashboard = () => {
  const navigate    = useNavigate();
  const tokenRef    = useRef(localStorage.getItem("token"));
  const token       = tokenRef.current;

  const [currentUser, setCurrentUser] = useState(buildFallbackUser);
  const [currentTab,  setCurrentTab]  = useState("booking");
  const [refreshKey,  setRefreshKey]  = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
    axios.get(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { setCurrentUser(res.data); localStorage.setItem("user", JSON.stringify(res.data)); })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) return;
    axios.get(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { setCurrentUser(res.data); localStorage.setItem("user", JSON.stringify(res.data)); })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    axios.post(`${API}/logout`, {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    localStorage.clear();
    navigate("/client/login");
  };

  const firstName = currentUser.name?.split(" ")[0] ?? "there";

  return (
    <div style={{ minHeight:"100vh", background:"#f0f4fa", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        .cl-nav-btn {
          display:inline-flex; align-items:center; gap:6px;
          padding:8px 18px; border-radius:9px; border:none;
          background:transparent; cursor:pointer;
          font-size:13px; font-weight:600; color:#64748b;
          transition:all .15s; letter-spacing:.1px;
          border:1.5px solid transparent;
        }
        .cl-nav-btn:hover { color:#1e40af; background:#eff6ff; border-color:#e0e7ff; }
        .cl-nav-btn.active { color:#1e40af; background:#eff6ff; border-color:#bfdbfe; }
        .cl-logout {
          display:inline-flex; align-items:center; gap:6px;
          padding:7px 14px; border-radius:8px; cursor:pointer;
          font-size:13px; font-weight:600;
          background:#fff; color:#ef4444;
          border:1.5px solid #fecaca; transition:all .15s;
        }
        .cl-logout:hover { background:#fef2f2; border-color:#fca5a5; }
      `}</style>

      {/* ══ HEADER ══ */}
      <header style={{
        background:"#fff", borderBottom:"1px solid #e8edf5",
        height:64, padding:"0 32px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        position:"sticky", top:0, zIndex:100,
        boxShadow:"0 1px 4px rgba(15,23,42,0.05)",
      }}>
        {/* Left: logo */}
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <img src={logo2} alt="GasHub" style={{ height:36, width:"auto" }} />
          <div style={{ width:1, height:22, background:"#e2e8f0" }} />
          <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:20, background:"#eff6ff", border:"1px solid #bfdbfe" }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:"#3b82f6" }} />
            <span style={{ fontSize:11, fontWeight:700, color:"#1e40af", letterSpacing:.5 }}>CLIENT</span>
          </div>
        </div>

        {/* Centre: tabs */}
        <nav style={{ display:"flex", gap:4 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              className={`cl-nav-btn${currentTab === t.key ? " active" : ""}`}
              onClick={() => setCurrentTab(t.key)}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </nav>

        {/* Right: notification + refresh + user + logout */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <NotificationBell token={token} />
          <button onClick={refresh} title="Refresh" style={{
            display:"flex", alignItems:"center", gap:6,
            padding:"7px 14px", borderRadius:8,
            border:"1.5px solid #e2e8f0", background:"#fff",
            color:"#475569", fontSize:13, fontWeight:600, cursor:"pointer",
            transition:"all .15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor="#3b82f6"; e.currentTarget.style.color="#1e40af"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor="#e2e8f0"; e.currentTarget.style.color="#475569"; }}>
            <FaSync style={{ fontSize:11 }} /> Refresh
          </button>
          <div style={{
            display:"flex", alignItems:"center", gap:8,
            padding:"5px 12px 5px 6px", background:"#f8fafc",
            borderRadius:30, border:"1px solid #e2e8f0",
          }}>
            <div style={{
              width:28, height:28, borderRadius:"50%",
              background:"linear-gradient(135deg,#1e40af,#3b82f6)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:12, fontWeight:800, color:"#fff", flexShrink:0,
            }}>
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize:13, fontWeight:600, color:"#334155", maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {currentUser.name}
            </span>
          </div>
          <button onClick={handleLogout} className="cl-logout">Logout</button>
        </div>
      </header>

      {/* ══ WELCOME BANNER (only on booking tab) ══ */}
      {currentTab === "booking" && (
        <div style={{
          background:"linear-gradient(135deg,#1e3a8a 0%,#1e40af 60%,#3b82f6 100%)",
          padding:"22px 32px",
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.55)", letterSpacing:1.5, textTransform:"uppercase", marginBottom:4 }}>
              Welcome back
            </div>
            <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:"#fff", letterSpacing:"-0.3px" }}>
              Hello, {firstName}! 👋
            </h2>
            <p style={{ margin:"6px 0 0", fontSize:13, color:"rgba(255,255,255,.65)" }}>
              Order LPG cylinders delivered to your doorstep.
            </p>
          </div>
          {/* Quick action buttons */}
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => setCurrentTab("history")} style={{
              display:"flex", alignItems:"center", gap:6,
              padding:"9px 18px", borderRadius:9,
              background:"rgba(255,255,255,.15)", color:"#fff",
              border:"1.5px solid rgba(255,255,255,.3)",
              fontSize:13, fontWeight:600, cursor:"pointer",
              transition:"all .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,.22)"}
            onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,.15)"}>
              📋 My Orders
            </button>
            <button onClick={() => setCurrentTab("profile")} style={{
              display:"flex", alignItems:"center", gap:6,
              padding:"9px 18px", borderRadius:9,
              background:"rgba(255,255,255,.15)", color:"#fff",
              border:"1.5px solid rgba(255,255,255,.3)",
              fontSize:13, fontWeight:600, cursor:"pointer",
              transition:"all .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,.22)"}
            onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,.15)"}>
              👤 Profile
            </button>
          </div>
        </div>
      )}

      {/* ══ CONTENT ══ */}
      <main style={{ padding:"28px 32px", maxWidth:900, margin:"0 auto" }}>
        {currentTab === "booking" && (
          <GasBookingTab currentUser={currentUser} token={token} setCurrentTab={setCurrentTab} refreshKey={refreshKey} />
        )}
        {currentTab === "history" && (
          <OrderHistoryTab token={token} currentUser={currentUser} refreshKey={refreshKey} />
        )}
        {currentTab === "profile" && (
          <ProfileSettingsTab
            currentUser={currentUser}
            setCurrentUser={(user) => { setCurrentUser(user); localStorage.setItem("user", JSON.stringify(user)); }}
            token={token}
            refreshKey={refreshKey}
          />
        )}
      </main>

      <ChatBot token={token} currentUser={currentUser} />
    </div>
  );
};

export default ClientDashboard;
