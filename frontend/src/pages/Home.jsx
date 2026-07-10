import "../styles/Home.css";
import logo2 from "../assets/logo2.png";
import logo  from "../assets/logo.png";
import truck from "../assets/truck.png";
import { FaUser, FaArrowRight, FaBox, FaTruck, FaShieldAlt, FaWarehouse, FaMoneyBillWave, FaMapMarkedAlt, FaFacebookF, FaLinkedinIn, FaEnvelope, FaPhoneAlt, FaSignInAlt, FaUserPlus } from "react-icons/fa";
import { Link } from "react-router-dom";

const Home = () => (
  <div className="gashub-landing-root">

    {/* ── HEADER: only Register + Login ── */}
    <header className="gashub-navbar">
      <div className="navbar-left-brand">
        <Link to="/"><img src={logo2} alt="GasHub" className="brand-logo-img" /></Link>
      </div>
      <div className="navbar-right-actions">
        <Link to="/client/register" className="action-btn-register"><FaUserPlus /> Register</Link>
        <Link to="/client/login"    className="action-btn-login"><FaSignInAlt /> Login</Link>
      </div>
    </header>

    {/* ── HERO ── */}
    <section className="gashub-hero">
      <div className="hero-content-col">
        <span className="hero-pill-badge">Reliable LPG Distribution</span>
        <h1 className="hero-main-title">Smart LPG Supply &amp;<br />Distribution Management</h1>
        <p className="hero-description-text">
          GasHub simplifies LPG ordering, warehouse stock control, smart delivery allocation,
          payment verification, and live tracking.
        </p>
        <div className="hero-action-group">
        </div>
      </div>
      <div className="hero-media-col">
        <img src={truck} alt="GasHub Delivery Truck" className="hero-showcase-img" />
      </div>
    </section>

    {/* ── FEATURES ── */}
    <section className="gashub-features">
      <div className="section-header-block">
        <h2 className="section-title">Core Operations</h2>
        <div className="title-underline-accent"></div>
        <p className="section-subtitle-text">A modern, integrated ecosystem for LPG enterprise logistics.</p>
      </div>
      <div className="features-grid-layout">
        {[
          { num: "01", title: "Bulk Ordering",        desc: "Streamlined order placement supporting multiple cylinder configurations." },
          { num: "02", title: "Warehouse Control",    desc: "Intelligent inventory allocation based on geographic proximity and capacity." },
          { num: "03", title: "Automated Dispatch",   desc: "Dynamic driver routing and cargo optimization for high-volume supply chains." },
          { num: "04", title: "Payment Settlement",   desc: "Secure document uploads with manager verification and automated approvals." },
          { num: "05", title: "Fleet Tracking",       desc: "Live GPS location updates for drivers with real-time customer visibility." },
          { num: "06", title: "Compliance & Safety", desc: "Rigorous standards tracking for safe LPG logistics and risk mitigation." },
        ].map((f) => (
          <div key={f.title} className="feature-grid-card">
            <div className="feature-number">{f.num}</div>
            <h3 className="feature-card-title">{f.title}</h3>
            <p className="feature-card-desc">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>

    {/* ── WORKFLOW ── */}
    <section className="gashub-workflow">
      <div className="section-header-block">
        <h2 className="section-title">Process Flow</h2>
        <div className="title-underline-accent"></div>
      </div>
      <div className="workflow-track-timeline">
        {[
          { step: "01", name: "Order Placement" },
          { step: "02", name: "Warehouse Selection" },
          { step: "03", name: "Verification" },
          { step: "04", name: "Driver Dispatch" },
          { step: "05", name: "Transit Tracking" },
          { step: "06", name: "Completion" }
        ].map((s, idx, arr) => (
          <div key={s.step} className="timeline-node">
            <div className="node-step">{s.step}</div>
            <div className="node-name">{s.name}</div>
            {idx < arr.length - 1 && <span className="node-separator"></span>}
          </div>
        ))}
      </div>
    </section>

    {/* ── CTA ── */}
    <section className="gashub-cta-banner">
      <div className="cta-content-wrapper">
        <h2 className="cta-title">Enterprise Logistics Platform</h2>
        <p className="cta-subtitle">Initialize your account to streamline distribution and tracking workflows.</p>
        <div className="cta-actions">
        </div>
      </div>
    </section>

    {/* ── FOOTER ── */}
    <footer className="gashub-footer">
      <div className="footer-main-content">
        <div className="footer-brand-column">
          <img src={logo} alt="GasHub" className="footer-logo-img" />
          <p className="footer-brand-pitch">
            Enterprise LPG Supply Chain and Distribution Management.
          </p>
          <div className="footer-social-tray">
            <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"><FaFacebookF /></a>
            <a href="https://linkedin.com"  target="_blank" rel="noreferrer" aria-label="LinkedIn"><FaLinkedinIn /></a>
            <a href="mailto:info@gashub.lk" aria-label="Email"><FaEnvelope /></a>
          </div>
        </div>

        <div className="footer-nav-column">
          <h4 className="footer-column-heading">Portals</h4>
          <ul className="footer-navigation-list">
            <li><Link to="/client/login">Client Login</Link></li>
            <li><Link to="/client/register">Register</Link></li>
          </ul>
        </div>

        <div className="footer-nav-column">
          <h4 className="footer-column-heading">Support</h4>
          <ul className="footer-navigation-list">
            <li><Link to="/support">Submit Feedback</Link></li>
            <li><Link to="/support">File Complaint</Link></li>
            <li><Link to="/support">Report Issue</Link></li>
          </ul>
        </div>

        <div className="footer-nav-column">
          <h4 className="footer-column-heading">Company</h4>
          <ul className="footer-navigation-list">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About GasHub</Link></li>
            <li><Link to="/contact">Contact Us</Link></li>
          </ul>
        </div>

        <div className="footer-nav-column">
          <h4 className="footer-column-heading">Contact</h4>
          <div className="footer-contact-block">
            <div className="contact-row-item">
              <FaPhoneAlt />
              <span>+94 70 123 4567</span>
            </div>
            <div className="contact-row-item">
              <FaEnvelope />
              <span>info@gashub.lk</span>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-copyright-subbar">
        <p>&copy; {new Date().getFullYear()} GasHub. All rights reserved.</p>
        <div className="subbar-legal-links">
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms of Use</a>
        </div>
      </div>
    </footer>

  </div>
);

export default Home;

