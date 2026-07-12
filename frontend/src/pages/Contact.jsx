import { useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Contact.css";
import { FaPhoneAlt, FaEnvelope, FaMapMarkerAlt } from "react-icons/fa";

const API = "http://127.0.0.1:8000/api";

const Contact = () => {
  const [form,    setForm]    = useState({ name: "", email: "", subject: "", message: "" });
  const [errors,  setErrors]  = useState({});
  const [sent,    setSent]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverErr, setServerErr]   = useState("");

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setErrors((p) => ({ ...p, [e.target.name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      e.name = "Name must be at least 2 characters.";
    else if (!/^[A-Za-z\s]+$/.test(form.name.trim()))
      e.name = "Name must contain letters only.";
    if (!form.email.trim())
      e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.com$/i.test(form.email.trim()))
      e.email = "Enter a valid .com email address.";
    if (!form.subject.trim()) e.subject = "Subject is required.";
    if (!form.message.trim() || form.message.trim().length < 10)
      e.message = "Message must be at least 10 characters.";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setServerErr(""); setSubmitting(true);
    try {
      await axios.post(`${API}/feedback`, {
        type:    "feedback",
        subject: form.subject.trim(),
        message: form.message.trim(),
        name:    form.name.trim(),
        email:   form.email.trim(),
      });
      setSent(true);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      setServerErr(err.response?.data?.message ?? "Submission failed. Please try again.");
    } finally { setSubmitting(false); }
  };

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 5%" }}>

        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <span className="hero-pill-badge">Get In Touch</span>
          <h1 style={{ fontSize: "clamp(2rem,4vw,2.8rem)", fontWeight: 800, margin: "16px 0", color: "#0a1833" }}>
            Contact Us
          </h1>
          <p style={{ color: "#475569", maxWidth: 560, margin: "0 auto" }}>
            Have a question or need support? Reach out and our team will respond within 24 hours.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 50, alignItems: "start", flexWrap: "wrap" }}>

          {/* Info */}
          <div>
            <h2 style={{ color: "#0a1833", marginBottom: 24 }}>Our Details</h2>
            {[
              { icon: <FaPhoneAlt />,      label: "Phone",   value: "+94 70 123 4567" },
              { icon: <FaEnvelope />,      label: "Email",   value: "info@gashub.lk" },
              { icon: <FaMapMarkerAlt />,  label: "Address", value: "No. 42, Galle Road, Colombo 03, Sri Lanka" },
            ].map((item) => (
              <div key={item.label} style={{
                display: "flex", gap: 16, alignItems: "flex-start",
                marginBottom: 24,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: "#eff6ff", color: "#1e62d4",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0,
                }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "#0a1833", marginBottom: 2 }}>{item.label}</div>
                  <div style={{ color: "#64748b" }}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, border: "1px solid #e2e8f0", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            {sent ? (
              <div style={{ textAlign: "center", padding: "30px 0" }}>
                <div style={{ fontSize: 48 }}>✅</div>
                <h3 style={{ color: "#065f46", marginTop: 12 }}>Message Sent!</h3>
                <p style={{ color: "#64748b" }}>We'll get back to you within 24 hours.</p>
                <button onClick={() => setSent(false)} style={{ marginTop: 16, background: "#1e62d4", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
                  Send Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {serverErr && <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, fontWeight: 600 }}>{serverErr}</div>}
                {[
                  { name: "name",    label: "Your Name",     type: "text",  placeholder: "John Perera",     note: "Letters only" },
                  { name: "email",   label: "Email Address", type: "email", placeholder: "john@email.com",  note: "Must end with .com" },
                  { name: "subject", label: "Subject",       type: "text",  placeholder: "Order enquiry…",  note: "" },
                ].map((f) => (
                  <div key={f.name} style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: 14, color: "#334155" }}>
                      {f.label} <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type={f.type} name={f.name} value={form[f.name]} onChange={handleChange}
                      placeholder={f.placeholder}
                      style={{ width: "100%", padding: "10px 12px", border: `1px solid ${errors[f.name] ? "#fca5a5" : "#cbd5e1"}`, borderRadius: 6, boxSizing: "border-box", fontSize: 14 }}
                    />
                    {errors[f.name] && <p style={{ color: "#dc2626", fontSize: 12, margin: "4px 0 0" }}>{errors[f.name]}</p>}
                  </div>
                ))}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: 14, color: "#334155" }}>
                    Message <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <textarea name="message" value={form.message} onChange={handleChange}
                    placeholder="Write your message here…" rows={5}
                    style={{ width: "100%", padding: "10px 12px", border: `1px solid ${errors.message ? "#fca5a5" : "#cbd5e1"}`, borderRadius: 6, boxSizing: "border-box", fontSize: 14, resize: "vertical" }}
                  />
                  {errors.message && <p style={{ color: "#dc2626", fontSize: 12, margin: "4px 0 0" }}>{errors.message}</p>}
                </div>
                <button type="submit" disabled={submitting} style={{ width: "100%", padding: 12, background: submitting ? "#94a3b8" : "#1e62d4", color: "#fff", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 15, cursor: submitting ? "not-allowed" : "pointer" }}>
                  {submitting ? "Sending…" : "Send Message"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Contact;
