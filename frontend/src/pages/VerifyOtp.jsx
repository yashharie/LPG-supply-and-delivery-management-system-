import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Auth.css";

const API = "http://127.0.0.1:8000/api";

// OTP digit input — defined outside to avoid remount
const OtpInput = ({ value, onChange, onKeyDown, inputRef, disabled }) => (
  <input
    ref={inputRef}
    type="text"
    inputMode="numeric"
    maxLength={1}
    value={value}
    onChange={onChange}
    onKeyDown={onKeyDown}
    disabled={disabled}
    style={{
      width: 48, height: 56, textAlign: "center",
      fontSize: 24, fontWeight: 800, fontFamily: "monospace",
      border: "2px solid #e2e8f0", borderRadius: 10,
      outline: "none", background: "#f8fafc",
      color: "#0f172a", transition: "border-color 0.15s",
    }}
    onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
    onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
  />
);

const VerifyOtp = () => {
  const navigate  = useNavigate();
  const location  = useLocation();

  const email   = location.state?.email   ?? "";
  const otpDev  = location.state?.otp_dev ?? null; // only set in dev (log mail driver)

  const [digits,    setDigits]    = useState(["", "", "", "", "", ""]);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60); // resend cooldown
  const [locked,    setLocked]    = useState(false);
  const [attempts,  setAttempts]  = useState(0);

  const inputRefs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  // Redirect if no email in state
  useEffect(() => {
    if (!email) navigate("/client/register");
  }, [email, navigate]);

  const handleDigit = (index, val) => {
    if (!/^\d?$/.test(val)) return; // digits only
    const next = [...digits];
    next[index] = val;
    setDigits(next);
    setError("");
    if (val && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const otp = digits.join("");

  const handleVerify = async () => {
    if (otp.length < 6) { setError("Please enter all 6 digits."); return; }
    setLoading(true); setError("");
    try {
      await axios.post(`${API}/verify-otp`, { email, otp });
      setSuccess("✅ Email verified! Redirecting to login…");
      setTimeout(() => navigate("/client/login"), 2000);
    } catch (err) {
      const data = err.response?.data;
      if (data?.locked)   { setLocked(true); setError("Too many attempts. Request a new OTP."); }
      else if (data?.expired) { setError("OTP expired. Please resend."); }
      else {
        setAttempts((a) => a + 1);
        setError(data?.message ?? "Incorrect OTP. Please try again.");
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setResending(true); setError(""); setLocked(false);
    setDigits(["", "", "", "", "", ""]);
    try {
      const res = await axios.post(`${API}/resend-otp`, { email });
      setCountdown(60);
      setAttempts(0);
      setError("");
      setSuccess("New OTP sent! Check your inbox.");
      setTimeout(() => setSuccess(""), 6000);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message ?? "Could not resend OTP.");
    } finally { setResending(false); }
  };

  return (
    <>
      <Navbar />
      <div className="auth-container">
        <div className="auth-card" style={{ width: 420 }}>

          {/* Icon */}
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <div style={{
              width: 60, height: 60, borderRadius: "50%",
              background: "linear-gradient(135deg,#1e40af,#3b82f6)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 26,
            }}>✉️</div>
          </div>

          <h2 className="auth-title">Verify Your Email</h2>
          <p className="auth-subtitle" style={{ marginBottom: 6 }}>
            We sent a 6-digit code to
          </p>
          <p style={{ textAlign: "center", fontWeight: 700, color: "#1e40af", fontSize: 14, marginBottom: 20 }}>
            {email}
          </p>



          {/* Success */}
          {success && (
            <div style={{ background: "#d1fae5", color: "#065f46", borderRadius: 8,
              padding: "10px 14px", marginBottom: 16, fontSize: 14, fontWeight: 600 }}>
              {success}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8,
              padding: "10px 14px", marginBottom: 16, fontSize: 14, fontWeight: 600 }}>
              {error}
            </div>
          )}

          {/* Attempt counter */}
          {attempts > 0 && !locked && (
            <div style={{ textAlign: "center", fontSize: 12, color: "#f59e0b",
              fontWeight: 600, marginBottom: 12 }}>
              {3 - attempts} attempt{3 - attempts !== 1 ? "s" : ""} remaining
            </div>
          )}

          {/* OTP digits */}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}
            onPaste={handlePaste}>
            {digits.map((d, i) => (
              <OtpInput
                key={i}
                value={d}
                onChange={(e) => handleDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                inputRef={(el) => (inputRefs.current[i] = el)}
                disabled={loading || locked}
              />
            ))}
          </div>

          {/* Verify button */}
          <button
            className="auth-button"
            onClick={handleVerify}
            disabled={loading || locked || otp.length < 6}
            style={{ opacity: loading || locked || otp.length < 6 ? 0.6 : 1 }}>
            {loading ? "Verifying…" : "Verify Email"}
          </button>

          {/* Resend */}
          <div style={{ textAlign: "center", marginTop: 18, fontSize: 13 }}>
            {countdown > 0 ? (
              <span style={{ color: "#64748b" }}>
                Resend OTP in <strong style={{ color: "#1e40af" }}>{countdown}s</strong>
              </span>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                style={{ background: "none", border: "none", cursor: "pointer",
                  color: "#1e62d4", fontWeight: 600, fontSize: 13 }}>
                {resending ? "Sending…" : "Resend OTP"}
              </button>
            )}
          </div>

          <p className="auth-footer-text" style={{ marginTop: 16 }}>
            Wrong email?{" "}
            <Link to="/client/register" className="auth-link">Go back</Link>
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default VerifyOtp;
