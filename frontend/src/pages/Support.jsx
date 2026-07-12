import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import logo2 from "../assets/logo2.png";
import "../styles/Support.css";

const API = "http://127.0.0.1:8000/api";

const iStyle = {
  width: "100%", padding: "9px 12px",
  border: "1.5px solid #e2e8f0", borderRadius: 7,
  fontSize: 14, color: "#0f172a", background: "#fff",
  outline: "none", fontFamily: "'Segoe UI', system-ui, sans-serif",
  boxSizing: "border-box", transition: "border-color 0.18s",
};

const labelStyle = {
  display: "block", fontSize: 12, fontWeight: 700,
  color: "#475569", marginBottom: 6,
  textTransform: "uppercase", letterSpacing: 0.4,
};

const TYPES = [
  { key: "feedback",  label: "Submit Feedback",   sub: "Share your experience or suggestions",    color: "#1e40af", bg: "#eff6ff",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
  { key: "complaint", label: "File a Complaint",  sub: "Report a problem with service or staff",  color: "#dc2626", bg: "#fef2f2",
    icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
  { key: "issue",     label: "Report an Issue",   sub: "Report a technical or delivery issue",    color: "#d97706", bg: "#fffbeb",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

const Support = () => {
  const [step,       setStep]       = useState("pick");
  const [chosenType, setChosenType] = useState(null);
  const [form,       setForm]       = useState({ name: "", email: "", subject: "", message: "" });
  const [errors,     setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");

  const token = localStorage.getItem("token");
  const user  = (() => { try { return JSON.parse(localStorage.getItem("user") ?? "null"); } catch { return null; } })();

  const handlePick = (type) => { setChosenType(type); setStep("form"); setError(""); setErrors({}); };

  const validate = () => {
    const e = {};
    if (!user) {
      if (!form.name.trim() || form.name.trim().length < 2) e.name = "Name must be at least 2 characters.";
      else if (!/^[A-Za-z\s]+$/.test(form.name.trim())) e.name = "Name must contain letters only.";
      if (!form.email.trim()) e.email = "Email is required.";
      else if (!/^[^\s@]+@[^\s@]+\.com$/i.test(form.email.trim())) e.email = "Enter a valid .com email address.";
    }
    if (!form.subject.trim()) e.subject = "Subject is required.";
    if (!form.message.trim() || form.message.trim().length < 10) e.message = "Message must be at least 10 characters.";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setError(""); setErrors({}); setSubmitting(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(`${API}/feedback`, {
        type: chosenType.key, subject: form.subject.trim(), message: form.message.trim(),
        name: user?.name ?? form.name.trim(), email: user?.email ?? form.email.trim(),
      }, { headers });
      setStep("done");
    } catch (err) {
      setError(err.response?.data?.message ?? "Submission failed. Please try again.");
    } finally { setSubmitting(false); }
  };

  const T = chosenType;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 5%", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 4px rgba(15,23,42,0.06)" }}>
        <Link to="/"><img src={logo2} alt="GasHub" style={{ height: 38 }} /></Link>
        <Link to="/" style={{ color: "#64748b", fontSize: 13, textDecoration: "none", fontWeight: 500 }}>← Back to Home</Link>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px" }}>

        {/* Step 1: Pick type */}
        {step === "pick" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div style={{ display: "inline-block", background: "#eff6ff", color: "#1e40af", fontSize: 11, fontWeight: 700, padding: "4px 14px", borderRadius: 20, letterSpacing: 1, textTransform: "uppercase", marginBottom: 16 }}>Support Center</div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", margin: "0 0 10px" }}>How can we help you?</h1>
              <p style={{ color: "#64748b", fontSize: 15, margin: 0, lineHeight: 1.6 }}>Choose an option below and we'll route your message to the right team.</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {TYPES.map((t) => (
                <button key={t.key} onClick={() => handlePick(t)} style={{ display: "flex", alignItems: "center", gap: 18, padding: "20px 24px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, cursor: "pointer", textAlign: "left", width: "100%", transition: "all 0.18s", boxShadow: "0 1px 4px rgba(15,23,42,0.05)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.color; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.transform = "translateY(0)"; }}>
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: t.bg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={t.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={t.icon} /></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 3 }}>{t.label}</div>
                    <div style={{ fontSize: 13, color: "#64748b" }}>{t.sub}</div>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 2: Form */}
        {step === "form" && T && (
          <>
            <div style={{ marginBottom: 32 }}>
              <button onClick={() => setStep("pick")} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6, padding: 0, marginBottom: 20 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>Back
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: T.bg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={T.icon} /></svg>
                </div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: "0 0 2px" }}>{T.label}</h2>
                  <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>{T.sub}</p>
                </div>
              </div>
            </div>

            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(15,23,42,0.06)", padding: 28 }}>
              {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13, fontWeight: 600, marginBottom: 20 }}>{error}</div>}
              <form onSubmit={handleSubmit}>
                {!user && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                    <div>
                      <label style={{ ...labelStyle }}>Your Name <span style={{ color: "#dc2626" }}>*</span></label>
                      <input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors(p => ({ ...p, name: "" })); }} placeholder="John Perera" style={{ ...iStyle, borderColor: errors.name ? "#fca5a5" : "#e2e8f0" }} />
                      {errors.name && <p style={{ color: "#dc2626", fontSize: 11, margin: "4px 0 0" }}>{errors.name}</p>}
                    </div>
                    <div>
                      <label style={{ ...labelStyle }}>Email Address <span style={{ color: "#dc2626" }}>*</span></label>
                      <input type="email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors(p => ({ ...p, email: "" })); }} placeholder="you@email.com" style={{ ...iStyle, borderColor: errors.email ? "#fca5a5" : "#e2e8f0" }} />
                      {errors.email && <p style={{ color: "#dc2626", fontSize: 11, margin: "4px 0 0" }}>{errors.email}</p>}
                    </div>
                  </div>
                )}
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Subject <span style={{ color: "#dc2626" }}>*</span></label>
                  <input value={form.subject} onChange={(e) => { setForm({ ...form, subject: e.target.value }); setErrors(p => ({ ...p, subject: "" })); }} placeholder={T.key === "feedback" ? "Your feedback about…" : T.key === "complaint" ? "Issue with…" : "Problem with…"} style={{ ...iStyle, borderColor: errors.subject ? "#fca5a5" : "#e2e8f0" }} />
                  {errors.subject && <p style={{ color: "#dc2626", fontSize: 11, margin: "4px 0 0" }}>{errors.subject}</p>}
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={labelStyle}>Message <span style={{ color: "#dc2626" }}>*</span></label>
                  <textarea value={form.message} onChange={(e) => { setForm({ ...form, message: e.target.value }); setErrors(p => ({ ...p, message: "" })); }} rows={5} placeholder="Please provide as much detail as possible…" style={{ ...iStyle, resize: "vertical", minHeight: 120, borderColor: errors.message ? "#fca5a5" : "#e2e8f0" }} />
                  {errors.message && <p style={{ color: "#dc2626", fontSize: 11, margin: "4px 0 0" }}>{errors.message}</p>}
                </div>
                <button type="submit" disabled={submitting} style={{ width: "100%", padding: "12px 20px", background: submitting ? "#94a3b8" : T.color, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer" }}>
                  {submitting ? "Submitting…" : `Submit ${T.label}`}
                </button>
              </form>
            </div>
          </>
        )}

        {/* Step 3: Done */}
        {step === "done" && T && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: T.bg, margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={T.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 12px" }}>Submission Received</h2>
            <p style={{ color: "#64748b", fontSize: 15, lineHeight: 1.7, maxWidth: 400, margin: "0 auto 32px" }}>
              Thank you for contacting us. Our team will review your {T.key} and respond as soon as possible.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => { setStep("pick"); setForm({ name: "", email: "", subject: "", message: "" }); setChosenType(null); }} style={{ padding: "10px 22px", background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>Submit Another</button>
              <Link to="/" style={{ padding: "10px 22px", background: "#f1f5f9", color: "#475569", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 13, display: "inline-block" }}>Back to Home</Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Support;
