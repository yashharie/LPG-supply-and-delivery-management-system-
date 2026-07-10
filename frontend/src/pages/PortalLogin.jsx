import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import logo2 from "../assets/logo2.png";

const API = "http://127.0.0.1:8000/api";

const ROLES = [
  {
    value: "admin",
    label: "Admin",
    placeholder: "e.g. ADM001",
    icon: "🛡️",
    desc: "System administrator",
  },
  {
    value: "manager",
    label: "Manager",
    placeholder: "e.g. MGR001",
    icon: "🏭",
    desc: "Warehouse manager",
  },
  {
    value: "driver",
    label: "Driver",
    placeholder: "e.g. DRV001",
    icon: "🚚",
    desc: "Delivery driver",
  },
];

const PortalLogin = () => {
  const navigate = useNavigate();
  const [form,    setForm]    = useState({ role: "admin", user_id: "", password: "" });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post(`${API}/portal/login`, {
        role:    form.role,
        user_id: form.user_id.trim(),
        password: form.password,
      });
      const { token, user } = res.data;
      localStorage.clear();
      localStorage.setItem("token",       token);
      localStorage.setItem("role",        user.role.toLowerCase());
      localStorage.setItem("name",        user.name);
      localStorage.setItem("employee_id", user.employee_id ?? "");

      if (user.must_change_password) {
        const pwRoutes = {
          manager: "/manager/change-password",
          driver:  "/driver/change-password",
        };
        const dest = pwRoutes[user.role.toLowerCase()];
        if (dest) { navigate(dest); return; }
      }

      const dashRoutes = {
        admin:   "/admin/dashboard",
        manager: "/manager/dashboard",
        driver:  "/driver/dashboard",
      };
      navigate(dashRoutes[user.role.toLowerCase()] ?? "/");
    } catch (err) {
      if      (err.response?.status === 404) setError("No account found with that Employee ID.");
      else if (err.response?.status === 401) setError("Incorrect password. Please try again.");
      else if (err.response?.status === 403) setError("Your account is inactive. Contact your administrator.");
      else setError(err.response?.data?.message ?? "Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = ROLES.find((r) => r.value === form.role);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .portal-input {
          width: 100%; padding: 11px 14px;
          border: 1.5px solid #e2e8f0; border-radius: 8px;
          font-size: 14px; color: #0f172a; background: #fff;
          outline: none; transition: border-color 0.15s, box-shadow 0.15s;
          font-family: inherit;
        }
        .portal-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
        }
        .portal-input::placeholder { color: #94a3b8; }
        .role-btn {
          flex: 1; padding: 10px 8px; border-radius: 10px;
          border: 1.5px solid #e2e8f0; background: #fff;
          cursor: pointer; transition: all 0.15s;
          display: flex; flex-direction: column; align-items: center; gap: 3px;
          font-family: inherit;
        }
        .role-btn:hover { border-color: #93c5fd; background: #eff6ff; }
        .role-btn.active {
          border-color: #3b82f6; background: #eff6ff;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
        }
        .submit-btn {
          width: 100%; padding: 13px;
          background: linear-gradient(135deg,#1e40af,#3b82f6);
          color: #fff; border: none; border-radius: 10px;
          font-size: 15px; font-weight: 700; cursor: pointer;
          letter-spacing: 0.2px; transition: all 0.2s;
          font-family: inherit;
        }
        .submit-btn:hover:not(:disabled) {
          background: linear-gradient(135deg,#1e3a8a,#1e40af);
          box-shadow: 0 4px 16px rgba(30,64,175,0.35);
          transform: translateY(-1px);
        }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        @keyframes fadeIn {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        display: "flex",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>

        {/* ── LEFT PANEL: Branding ── */}
        <div style={{
          flex: "0 0 420px",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "56px 48px",
          position: "relative",
          overflow: "hidden",
          borderRight: "1px solid #e8edf5",
        }}>
          {/* Subtle background shapes */}
          <div style={{ position:"absolute", top:-120, right:-120, width:380, height:380, borderRadius:"50%", background:"linear-gradient(135deg,#eff6ff,#dbeafe)", opacity:0.6 }} />
          <div style={{ position:"absolute", bottom:-80, left:-70, width:280, height:280, borderRadius:"50%", background:"linear-gradient(135deg,#f0fdf4,#dcfce7)", opacity:0.5 }} />

          <div style={{ position:"relative", zIndex:1 }}>
            {/* Logo */}
            <div style={{ marginBottom:44 }}>
              <img src={logo2} alt="GasHub" style={{ height:44, width:"auto" }} />
            </div>

            {/* Headline */}
            <div style={{ marginBottom:44 }}>
              <h1 style={{ margin:"0 0 14px", fontSize:34, fontWeight:900, color:"#0f172a", letterSpacing:"-0.8px", lineHeight:1.15 }}>
                Your operations,<br />
                <span style={{ color:"#3b82f6" }}>streamlined.</span>
              </h1>
              <p style={{ margin:0, fontSize:15, color:"#64748b", lineHeight:1.7, maxWidth:300 }}>
                GasHub gives your team everything needed to manage LPG supply and delivery — in one place.
              </p>
            </div>

            {/* Feature list */}
            <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
              {[
                { icon:"📦", label:"Real-time order management",   bg:"#eff6ff", border:"#bfdbfe" },
                { icon:"🚚", label:"Live driver GPS tracking",     bg:"#fff7ed", border:"#fed7aa" },
                { icon:"📊", label:"Smart stock monitoring",       bg:"#f0fdf4", border:"#bbf7d0" },
                { icon:"🔔", label:"Instant push notifications",   bg:"#faf5ff", border:"#e9d5ff" },
              ].map((f) => (
                <div key={f.label} style={{ display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ width:42, height:42, borderRadius:12, flexShrink:0, background:f.bg, border:`1px solid ${f.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
                    {f.icon}
                  </div>
                  <span style={{ fontSize:14, fontWeight:600, color:"#334155" }}>{f.label}</span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ marginTop:52, paddingTop:22, borderTop:"1px solid #f1f5f9", fontSize:12, color:"#94a3b8" }}>
              © 2025 GasHub · LPG Delivery Platform · Sri Lanka
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: Login form ── */}
        <div style={{
          flex:1, background:"#f8fafc",
          display:"flex", alignItems:"center", justifyContent:"center",
          padding:"40px 32px",
        }}>
          <div style={{
            width:"100%", maxWidth:420,
            animation:"fadeIn 0.35s ease",
          }}>

            {/* Form card */}
            <div style={{
              background:"#fff",
              borderRadius:16,
              padding:"40px 36px",
              boxShadow:"0 4px 32px rgba(15,23,42,0.08), 0 1px 4px rgba(15,23,42,0.04)",
              border:"1px solid #f1f5f9",
            }}>
              <div style={{ marginBottom:28 }}>
                <h2 style={{
                  margin:"0 0 6px",
                  fontSize:22, fontWeight:800, color:"#0f172a", letterSpacing:-0.3,
                }}>
                  Sign in
                </h2>
                <p style={{ margin:0, fontSize:13, color:"#64748b" }}>
                  Enter your staff credentials to continue
                </p>
              </div>

              {/* Error alert */}
              {error && (
                <div style={{
                  background:"#fef2f2", border:"1px solid #fecaca",
                  borderLeft:"3px solid #ef4444",
                  borderRadius:8, padding:"10px 14px",
                  color:"#b91c1c", fontSize:13, fontWeight:500,
                  marginBottom:20, display:"flex", alignItems:"center", gap:8,
                }}>
                  <span style={{ fontSize:15 }}>⚠</span>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>

                {/* Role selector */}
                <div style={{ marginBottom:20 }}>
                  <label style={{
                    display:"block", fontSize:12, fontWeight:700,
                    color:"#374151", marginBottom:8, letterSpacing:0.3,
                  }}>
                    Account Type
                  </label>
                  <div style={{ display:"flex", gap:8 }}>
                    {ROLES.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        className={`role-btn${form.role === r.value ? " active" : ""}`}
                        onClick={() => { setForm(p => ({ ...p, role:r.value, user_id:"" })); setError(""); }}
                      >
                        <span style={{ fontSize:18 }}>{r.icon}</span>
                        <span style={{
                          fontSize:12, fontWeight:700,
                          color: form.role === r.value ? "#1e40af" : "#475569",
                        }}>{r.label}</span>
                        <span style={{
                          fontSize:10, color:"#94a3b8", fontWeight:400,
                        }}>{r.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Employee ID */}
                <div style={{ marginBottom:16 }}>
                  <label style={{
                    display:"block", fontSize:12, fontWeight:700,
                    color:"#374151", marginBottom:6, letterSpacing:0.3,
                  }}>
                    Employee ID
                  </label>
                  <div style={{ position:"relative" }}>
                    <span style={{
                      position:"absolute", left:12, top:"50%",
                      transform:"translateY(-50%)",
                      fontSize:14, color:"#94a3b8",
                    }}>👤</span>
                    <input
                      className="portal-input"
                      type="text"
                      name="user_id"
                      value={form.user_id}
                      onChange={handleChange}
                      required
                      autoComplete="username"
                      placeholder={selectedRole?.placeholder ?? "Employee ID"}
                      style={{ paddingLeft:36 }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div style={{ marginBottom:28 }}>
                  <label style={{
                    display:"block", fontSize:12, fontWeight:700,
                    color:"#374151", marginBottom:6, letterSpacing:0.3,
                  }}>
                    Password
                  </label>
                  <div style={{ position:"relative" }}>
                    <span style={{
                      position:"absolute", left:12, top:"50%",
                      transform:"translateY(-50%)",
                      fontSize:14, color:"#94a3b8",
                    }}>🔒</span>
                    <input
                      className="portal-input"
                      type={showPw ? "text" : "password"}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      required
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      style={{ paddingLeft:36, paddingRight:42 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      style={{
                        position:"absolute", right:12, top:"50%",
                        transform:"translateY(-50%)",
                        background:"none", border:"none", cursor:"pointer",
                        color:"#94a3b8", fontSize:15, padding:0,
                        display:"flex", alignItems:"center",
                      }}
                    >
                      {showPw ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? (
                    <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
                        </path>
                      </svg>
                      Signing in…
                    </span>
                  ) : "Sign In →"}
                </button>

              </form>
            </div>

            {/* Footer note */}
            <div style={{
              marginTop:24, textAlign:"center",
              fontSize:13, color:"#94a3b8",
            }}>
              Not a staff member?{" "}
              <Link to="/client/login" style={{
                color:"#3b82f6", fontWeight:600, textDecoration:"none",
              }}
              onMouseEnter={(e) => e.target.style.textDecoration="underline"}
              onMouseLeave={(e) => e.target.style.textDecoration="none"}>
                Client Login →
              </Link>
            </div>

            {/* Security note */}
            <div style={{
              marginTop:16, textAlign:"center",
              display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            }}>
              <span style={{ fontSize:11, color:"#cbd5e1" }}>🔐</span>
              <span style={{ fontSize:11, color:"#cbd5e1" }}>
                Secured connection · GasHub Staff Portal
              </span>
            </div>

          </div>
        </div>

      </div>
    </>
  );
};

export default PortalLogin;
