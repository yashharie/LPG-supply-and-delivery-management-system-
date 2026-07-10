import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Auth.css";

const API = "http://127.0.0.1:8000/api";

// Field MUST be defined outside the parent component so React doesn't treat it
// as a new component type on every render — which would cause inputs to lose
// focus after every keystroke.
const Field = ({ name, label, type = "text", placeholder, value, error, onChange }) => (
  <div style={{ marginBottom: 4 }}>
    <input className="auth-input" type={type} name={name}
      placeholder={placeholder ?? label} value={value} onChange={onChange} />
    {error && <p style={{ color: "#dc2626", fontSize: 12, margin: "2px 0" }}>{error}</p>}
  </div>
);

// NIC: old (9 digits + V/v/X/x) or new (12 digits)
const NIC_REGEX   = /^([0-9]{9}[vVxX]|[0-9]{12})$/;
// Phone: Sri Lankan mobile prefixes only, exactly 10 digits
const PHONE_REGEX = /^(070|071|072|074|075|076|077|078)[0-9]{7}$/;
// Email rules: one @, known domain only, ends with .com
// Allowed domains: gmail, yahoo, hotmail, outlook, icloud, live, proton, protonmail
// Blocks: gmailgmail.com, sub.gmail.com, unknown.com
const KNOWN_DOMAINS = ['gmail','yahoo','hotmail','outlook','icloud','live','protonmail','proton'];
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9\-]+\.com$/i;

const ClientRegister = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "", email: "", nic: "", phone: "",
    password: "", password_confirmation: "",
  });
  const [errors,  setErrors]  = useState({});
  const [message, setMessage] = useState({ text: "", ok: false });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.name || form.name.trim().length < 3)
      e.name = "Name must be at least 3 characters";
    else if (!/^[a-zA-Z\s]+$/.test(form.name.trim()))
      e.name = "Name must contain letters only (no numbers or symbols)";

    if (!form.email)
      e.email = "Email is required";
    else if (!EMAIL_REGEX.test(form.email))
      e.email = "Enter a valid email ending in .com (e.g. name@gmail.com, name@yahoo.com)";
    else {
      const domain = form.email.split("@")[1]?.split(".")[0]?.toLowerCase();
      if (!KNOWN_DOMAINS.includes(domain))
        e.email = `Use a known email provider (e.g. gmail, yahoo, hotmail, outlook)`;
    }

    if (!form.nic)
      e.nic = "NIC is required";
    else if (!NIC_REGEX.test(form.nic.trim()))
      e.nic = "Invalid Sri Lankan NIC format (e.g. 199512345V or 200112345678)";

    if (form.phone && !PHONE_REGEX.test(form.phone.trim()))
      e.phone = "Invalid Sri Lankan phone number (e.g. 0771234567)";

    if (!form.password)
      e.password = "Password is required";
    else if (form.password.length < 6)
      e.password = "Password must be at least 6 characters";
    else if (!/[A-Z]/.test(form.password))
      e.password = "Password must contain at least one uppercase letter";
    else if (!/[0-9]/.test(form.password))
      e.password = "Password must contain at least one number";
    else if (!/[^A-Za-z0-9]/.test(form.password))
      e.password = "Password must contain at least one symbol (e.g. @, #, !, $)";

    if (form.password !== form.password_confirmation)
      e.password_confirmation = "Passwords do not match";

    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: "", ok: false });

    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/register`, form);
      setMessage({ text: "Account created! Check your email for the verification code.", ok: true });
      setTimeout(() => navigate("/client/verify", { state: { email: form.email, otp_dev: res.data.otp_dev ?? null } }), 1500);
    } catch (err) {
      if (err.response?.data?.errors) {
        // Map backend errors — flatten array values to first message
        const backendErrors = err.response.data.errors;
        const mapped = {};
        Object.keys(backendErrors).forEach((key) => {
          mapped[key] = Array.isArray(backendErrors[key])
            ? backendErrors[key][0]
            : backendErrors[key];
        });
        setErrors(mapped);
      } else {
        setMessage({ text: err.response?.data?.message ?? "Registration failed.", ok: false });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="auth-container" style={{ alignItems: "flex-start", paddingTop: 40 }}>
        <div className="auth-card" style={{ width: 420 }}>
          <h2 className="auth-title">Create Account</h2>
          <p className="auth-subtitle">Join the GasHub platform</p>

          {message.text && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 12,
              background: message.ok ? "#d1fae5" : "#fee2e2",
              color: message.ok ? "#065f46" : "#991b1b",
              fontWeight: 600, fontSize: 14,
            }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <Field name="name"                  label="Full Name"        placeholder="e.g. Amal Perera" value={form.name} error={errors.name} onChange={handleChange} />
            <Field name="email"   type="email"  label="Email Address"    placeholder="you@email.com" value={form.email} error={errors.email} onChange={handleChange} />
            <Field name="nic"                   label="NIC Number"       placeholder="e.g. 199512345V" value={form.nic} error={errors.nic} onChange={handleChange} />
            <Field name="phone"   type="tel"    label="Phone Number"     placeholder="e.g. 071 234 5678" value={form.phone} error={errors.phone} onChange={handleChange} />
            <Field name="password" type="password" label="Password"      placeholder="Min 6 chars, uppercase, number, symbol" value={form.password} error={errors.password} onChange={handleChange} />
            <Field name="password_confirmation" type="password"
                   label="Confirm Password" placeholder="Repeat password" value={form.password_confirmation} error={errors.password_confirmation} onChange={handleChange} />

            <button className="auth-button" type="submit" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? "Creating account…" : "Register"}
            </button>
          </form>

          <p className="auth-footer-text" style={{ marginTop: 14 }}>
            Already have an account?{" " }
            <Link to="/client/login" className="auth-link">Login</Link>
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ClientRegister;
