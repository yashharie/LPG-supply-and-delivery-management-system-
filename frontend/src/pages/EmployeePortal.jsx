import { Link } from "react-router-dom";
import logo2 from "../assets/logo2.png";
import "../styles/EmployeePortal.css";

const ROLES = [
  { icon: "", label: "Admin",    desc: "Full system control, warehouses, employees, reports." },
  { icon: "", label: "Manager",  desc: "Manage your warehouse orders and assign drivers." },
  { icon: "", label: "Driver",   desc: "View assigned deliveries and update delivery status." },
];

const EmployeePortal = () => (
  <div style={{
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)",
    display: "flex", flexDirection: "column",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  }}>

    {/* ── Top bar ── */}
    <header style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "18px 5%", borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      <Link to="/">
        <img src={logo2} alt="GasHub" style={{ height: 44 }} />
      </Link>
      <Link to="/client/login" style={{
        color: "#94a3b8", fontSize: 13, textDecoration: "none", fontWeight: 500,
      }}>
        ← Client Portal
      </Link>
    </header>

    {/* ── Hero ── */}
    <main style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "60px 5%", textAlign: "center",
    }}>

      <div style={{
        background: "rgba(30,98,212,0.15)", border: "1px solid rgba(30,98,212,0.3)",
        borderRadius: 40, padding: "6px 18px", fontSize: 12,
        color: "#60a5fa", fontWeight: 700, letterSpacing: 1,
        textTransform: "uppercase", marginBottom: 24,
      }}>
        Staff Access
      </div>

      <h1 style={{
        color: "#f1f5f9", fontSize: "clamp(2rem,4vw,2.8rem)",
        fontWeight: 800, margin: "0 0 16px",
        letterSpacing: "-0.5px",
      }}>
        GasHub Employee Portal
      </h1>

      <p style={{
        color: "#94a3b8", fontSize: "1.05rem",
        maxWidth: 520, lineHeight: 1.7, margin: "0 0 48px",
      }}>
        Secure access for GasHub operations staff. Login with your
        Employee ID and temporary password issued by your administrator.
      </p>

      {/* ── Role cards ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 16, maxWidth: 860, width: "100%", marginBottom: 48,
      }}>
        {ROLES.map((r) => (
          <div key={r.label} style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, padding: "22px 20px", textAlign: "left",
            transition: "border-color 0.2s",
          }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(30,98,212,0.5)"}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
          >
            <div style={{ fontSize: 28, marginBottom: 10 }}>{r.icon}</div>
            <div style={{ color: "#f1f5f9", fontWeight: 700, marginBottom: 6 }}>{r.label}</div>
            <div style={{ color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>{r.desc}</div>
          </div>
        ))}
      </div>

      {/* ── Login button ── */}
      <Link to="/portal/login" style={{
        display: "inline-flex", alignItems: "center", gap: 10,
        background: "#1e62d4", color: "#fff",
        padding: "14px 36px", borderRadius: 8,
        fontWeight: 700, fontSize: 16, textDecoration: "none",
        boxShadow: "0 4px 20px rgba(30,98,212,0.35)",
        transition: "all 0.2s",
      }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#154cb3"; e.currentTarget.style.transform = "translateY(-2px)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#1e62d4"; e.currentTarget.style.transform = "translateY(0)"; }}
      >
        🔐 Login to Staff Portal
      </Link>

      <p style={{ color: "#475569", fontSize: 13, marginTop: 20 }}>
        Don't have credentials? Contact your system administrator.
      </p>
    </main>

    {/* ── Footer ── */}
    <footer style={{
      textAlign: "center", padding: "20px 5%",
      borderTop: "1px solid rgba(255,255,255,0.06)",
      color: "#475569", fontSize: 12,
    }}>
      © {new Date().getFullYear()} GasHub · Staff Portal &nbsp;|&nbsp;
      <Link to="/" style={{ color: "#475569", textDecoration: "none" }}>Back to Home</Link>
    </footer>
  </div>
);

export default EmployeePortal;
