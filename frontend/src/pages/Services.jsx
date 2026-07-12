import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Services.css";
import { FaBox, FaWarehouse, FaTruck, FaMoneyBillWave, FaMapMarkedAlt, FaShieldAlt, FaUsersCog, FaChartBar } from "react-icons/fa";

const SERVICES = [
  {
    icon: <FaBox />,
    title: "Bulk LPG Ordering",
    desc: "Clients can place multi-item orders for different cylinder sizes and brands (Litro, Laugfs) with a minimum of 21 cylinders per order.",
  },
  {
    icon: <FaWarehouse />,
    title: "Smart Warehouse Routing",
    desc: "Our Haversine-based algorithm automatically selects the nearest warehouse with sufficient stock to fulfil your order.",
  },
  {
    icon: <FaTruck />,
    title: "Driver Assignment & Tracking",
    desc: "Managers assign drivers to approved orders. Drivers update delivery status in real time — from 'Out for Delivery' to 'Delivered'.",
  },
  {
    icon: <FaMoneyBillWave />,
    title: "Payment Verification",
    desc: "Clients upload bank slips or payment screenshots. Admin and managers verify payments before approving orders.",
  },
  {
    icon: <FaMapMarkedAlt />,
    title: "Location-Based Delivery",
    desc: "Clients pin their exact location using an interactive map. The system uses this to calculate optimal warehouse routing.",
  },
  {
    icon: <FaShieldAlt />,
    title: "Secure Role-Based Access",
    desc: "Separate portals for Admin, Manager, Employee, Driver and Client with strict access controls and Sanctum token auth.",
  },
  {
    icon: <FaUsersCog />,
    title: "Employee Management",
    desc: "Admins can create, assign and manage employees across warehouses. Temporary passwords are generated for first login.",
  },
  {
    icon: <FaChartBar />,
    title: "Stock & Inventory Control",
    desc: "Full stock management per warehouse with movement history — every addition and deduction is logged automatically.",
  },
];

const Services = () => (
  <>
    <Navbar />
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 5%" }}>
      <div style={{ textAlign: "center", marginBottom: 60 }}>
        <span className="hero-pill-badge">What We Offer</span>
        <h1 style={{ fontSize: "clamp(2rem,4vw,2.8rem)", fontWeight: 800, margin: "16px 0", color: "#0a1833" }}>
          GasHub Services
        </h1>
        <p style={{ color: "#475569", maxWidth: 600, margin: "0 auto", lineHeight: 1.7 }}>
          A complete end-to-end LPG distribution management system designed for reliability, speed, and transparency.
        </p>
      </div>

      <div className="features-grid-layout">
        {SERVICES.map((s) => (
          <div key={s.title} className="feature-grid-card">
            <div className="icon-wrapper">{s.icon}</div>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
    <Footer />
  </>
);

export default Services;
