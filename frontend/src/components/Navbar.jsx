import { Link } from "react-router-dom";
import logo2 from "../assets/logo2.png";
import "../styles/Home.css";

/**
 * Shared public Navbar — Register + Login only.
 * Used on: ClientLogin, ClientRegister, About, Services, Contact pages.
 */
const Navbar = () => (
  <header className="gashub-navbar">
    <div className="navbar-left-brand">
      <Link to="/">
        <img src={logo2} alt="GasHub" className="brand-logo-img" />
      </Link>
    </div>
    <div className="navbar-right-actions">
      <Link to="/client/register" className="action-btn-register">Register</Link>
      <Link to="/client/login"    className="action-btn-login">Login</Link>
    </div>
  </header>
);

export default Navbar;
