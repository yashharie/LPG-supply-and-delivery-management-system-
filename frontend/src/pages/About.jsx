import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Home.css";
import warehouse from "../assets/warehouse.png";

const About = () => (
  <>
    <Navbar />
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 5%" }}>

      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 60 }}>
        <span className="hero-pill-badge">About GasHub</span>
        <h1 style={{ fontSize: "clamp(2rem,4vw,2.8rem)", fontWeight: 800, margin: "16px 0", color: "#0a1833" }}>
          Modernising LPG Distribution in Sri Lanka
        </h1>
        <p style={{ fontSize: "1.05rem", color: "#475569", maxWidth: 680, margin: "0 auto", lineHeight: 1.7 }}>
          GasHub is a smart logistics platform built to connect clients, warehouses, drivers and
          managers on a single system — reducing delays, improving stock visibility, and ensuring
          safe delivery of LPG cylinders across the country.
        </p>
      </div>

      {/* Image + mission */}
      <div style={{ display: "flex", gap: 50, alignItems: "center", marginBottom: 70, flexWrap: "wrap" }}>
        <img src={warehouse} alt="GasHub Warehouse" style={{ flex: 1, minWidth: 280, borderRadius: 16, maxWidth: 480 }} />
        <div style={{ flex: 1, minWidth: 260 }}>
          <h2 style={{ color: "#0a1833", fontWeight: 700, marginBottom: 16 }}>Our Mission</h2>
          <p style={{ color: "#475569", lineHeight: 1.8 }}>
            We believe every household and business deserves reliable, on-time access to LPG.
            Our platform automates order routing to the nearest stocked warehouse, tracks every
            delivery in real time, and gives administrators full oversight through a clean dashboard.
          </p>
          <ul style={{ marginTop: 20, paddingLeft: 20, color: "#334155", lineHeight: 2 }}>
            <li>Multi-warehouse intelligent routing</li>
            <li>Driver assignment and live status updates</li>
            <li>Secure payment receipt verification</li>
            <li>Role-based access: Admin, Manager, Employee, Driver, Client</li>
          </ul>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 24, marginBottom: 60 }}>
        {[
          { stat: "500+", label: "Registered Clients" },
          { stat: "12",   label: "Active Warehouses" },
          { stat: "50+",  label: "Delivery Drivers" },
          { stat: "99%",  label: "On-Time Delivery Rate" },
        ].map((s) => (
          <div key={s.stat} style={{
            background: "#fff", borderRadius: 12, padding: "28px 20px", textAlign: "center",
            border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#1e62d4" }}>{s.stat}</div>
            <div style={{ color: "#64748b", marginTop: 6, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

    </div>
    <Footer />
  </>
);

export default About;
