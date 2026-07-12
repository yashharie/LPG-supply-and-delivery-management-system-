import logo from "../assets/logo.png";
import { FaFacebookF, FaLinkedinIn, FaEnvelope, FaPhoneAlt } from "react-icons/fa";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="gashub-footer">
    <div className="footer-main-content">

      <div className="footer-brand-column">
        <img src={logo} alt="GasHub" className="footer-logo-img" />
        <p className="footer-brand-pitch">
          Streamlining safe, efficient LPG distribution across the region.
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
          <div className="contact-row-item"><FaPhoneAlt /><span>+94 70 123 4567</span></div>
          <div className="contact-row-item"><FaEnvelope /><span>info@gashub.lk</span></div>
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
);

export default Footer;
