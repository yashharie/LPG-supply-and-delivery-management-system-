import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../../styles/ChangePassword.css";

const API = "http://127.0.0.1:8000/api";

const ChangePassword = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const role  = localStorage.getItem("role");

  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });
  const [msg,     setMsg]     = useState({ text: "", ok: false });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ text: "", ok: false });
    setLoading(true);

    try {
      const res = await axios.post(`${API}/change-password`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMsg({ text: " " + res.data.message, ok: true });

      setTimeout(() => {
        const routes = {
          admin:    "/admin/dashboard",
          manager:  "/manager/dashboard",
          driver:   "/driver/dashboard",
          employee: "/employee/dashboard",
        };
        navigate(routes[role] ?? "/");
      }, 1500);
    } catch (err) {
      setMsg({ text: " " + (err.response?.data?.message ?? "Password update failed."), ok: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 440, margin: "60px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      <div style={{
        background: "#fff", borderRadius: 12, padding: 32,
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
      }}>
        <h2 style={{ marginTop: 0, marginBottom: 6 }}>🔑 Change Password</h2>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>
          Choose a strong password for your account.
        </p>

        {msg.text && (
          <div style={{
            padding: "10px 14px", borderRadius: 8, marginBottom: 20,
            background: msg.ok ? "#d1fae5" : "#fee2e2",
            color:      msg.ok ? "#065f46" : "#dc2626",
            fontWeight: 600, fontSize: 14,
          }}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {[
            { name: "current_password",         label: "Current Password",  placeholder: "Your current password"  },
            { name: "new_password",              label: "New Password",      placeholder: "Min 6 characters"        },
            { name: "new_password_confirmation", label: "Confirm Password",  placeholder: "Repeat new password"    },
          ].map((f) => (
            <div key={f.name} style={{ marginBottom: 18 }}>
              <label style={{
                display: "block", fontWeight: 600,
                marginBottom: 6, fontSize: 14, color: "#334155",
              }}>
                {f.label}
              </label>
              <input
                type="password"
                name={f.name}
                value={form[f.name]}
                onChange={handleChange}
                placeholder={f.placeholder}
                required
                style={{
                  width: "100%", padding: "10px 12px",
                  border: "1px solid #cbd5e1", borderRadius: 6,
                  boxSizing: "border-box", fontSize: 14,
                  outline: "none", fontFamily: "inherit",
                }}
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: 12,
              background: loading ? "#94a3b8" : "#2563eb",
              color: "#fff", border: "none", borderRadius: 6,
              fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer",
              marginTop: 8,
            }}
          >
            {loading ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
