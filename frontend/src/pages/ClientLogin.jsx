import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Auth.css";

const API = "http://127.0.0.1:8000/api";

const ClientLogin = () => {
  const navigate = useNavigate();
  const [form,    setForm]    = useState({ email: "", password: "" });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);

    try {
      const res  = await axios.post(`${API}/login`, form);
      const user = res.data.user;

      if (!user.status) {
        setError("Your account has been deactivated. Please contact support.");
        return;
      }

      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("role",  user.role.toLowerCase());
      localStorage.setItem("user",  JSON.stringify(user));

      // Route by role
      const routes = {
        client:   "/client/dashboard",
        admin:    "/admin/dashboard",
        manager:  "/manager/dashboard",
        driver:   "/driver/dashboard",
        employee: "/employee/dashboard",
      };
      navigate(routes[user.role] ?? "/");

    } catch (err) {
      const data = err.response?.data;
      if (data?.needs_verify) {
        // Redirect to OTP page with email pre-filled
        navigate("/client/verify", { state: { email: form.email } });
        return;
      }
      setError(data?.message ?? "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="auth-container">
        <div className="auth-card">
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle">Login to your GasHub account</p>

          {error && (
            <div style={{
              background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5",
              borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 14,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <input className="auth-input" type="email" name="email"
              placeholder="Email address" onChange={handleChange} required />
            <input className="auth-input" type="password" name="password"
              placeholder="Password" onChange={handleChange} required />
            <div style={{ textAlign: "right", marginTop: -8, marginBottom: 16 }}>
              <Link to="/client/forgot-password" style={{ fontSize: 12, color: "#1e40af", textDecoration: "none", fontWeight: 600 }}>
                Forgot password?
              </Link>
            </div>
            <button className="auth-button" type="submit" disabled={loading}>
              {loading ? "Logging in…" : "Login"}
            </button>
          </form>

          <p className="auth-footer-text" style={{ marginTop: 16 }}>
            Don't have an account?{" "}
            <Link to="/client/register" className="auth-link">Register</Link>
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ClientLogin;
