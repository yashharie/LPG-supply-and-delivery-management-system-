import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const ForgotPassword = () => {
  const navigate = useNavigate();

  // Steps: "email" | "otp" | "password"
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // OTP page state
  const [countdown, setCountdown] = useState(0);
  const [resending, setResending] = useState(false);
  const [locked, setLocked] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const otpInputRefs = useRef([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Request OTP code
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your registered email address.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await axios.post(`${API}/forgot-password/request`, { email });
      setSuccess(res.data.message || "A verification code has been sent to your email.");
      setStep("otp");
      setCountdown(60);
      setAttempts(0);
      setLocked(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reset code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP code
  const handleResendOtp = async () => {
    setResending(true);
    setError("");
    setSuccess("");
    setLocked(false);
    setOtp(["", "", "", "", "", ""]);

    try {
      const res = await axios.post(`${API}/forgot-password/request`, { email });
      setSuccess("New code sent! Check your inbox.");
      setCountdown(60);
      setAttempts(0);
      setTimeout(() => setSuccess(""), 6000);
      otpInputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  // Digit handlers
  const handleDigit = (index, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[index] = val;
    setOtp(next);
    setError("");
    if (val && index < 5) otpInputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpInputRefs.current[5]?.focus();
    }
  };

  // Verify OTP code
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const enteredOtp = otp.join("");
    if (enteredOtp.length < 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await axios.post(`${API}/forgot-password/verify`, { email, otp: enteredOtp });
      setSuccess(res.data.message || "OTP verified. Please choose a new password.");
      setStep("password");
    } catch (err) {
      const data = err.response?.data;
      if (data?.locked) {
        setLocked(true);
        setError("Too many attempts. Request a new OTP.");
      } else if (data?.expired) {
        setError("OTP expired. Please resend.");
      } else {
        setAttempts(a => a + 1);
        setError(data?.message || "Incorrect code. Please try again.");
        setOtp(["", "", "", "", "", ""]);
        otpInputRefs.current[0]?.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== passwordConfirmation) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await axios.post(`${API}/forgot-password/reset`, {
        email,
        otp: otp.join(""),
        password,
        password_confirmation: passwordConfirmation
      });
      setSuccess(res.data.message || "Password reset successfully! Redirecting to login...");
      setTimeout(() => navigate("/client/login"), 2500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="auth-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "85vh", padding: "20px 0" }}>
        <div className="auth-card" style={{ width: 420, padding: 32, background: "#fff", borderRadius: 12, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)", border: "1px solid #f1f5f9" }}>
          
          {/* Logo / Header */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "linear-gradient(135deg, #1e40af, #3b82f6)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, color: "#fff", marginBottom: 12
            }}>
              🔑
            </div>
            <h2 className="auth-title" style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "0 0 6px 0" }}>
              {step === "email" && "Forgot Password"}
              {step === "otp" && "Verify Reset Code"}
              {step === "password" && "Set New Password"}
            </h2>
            <p className="auth-subtitle" style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
              {step === "email" && "Enter your email address to receive a verification code."}
              {step === "otp" && `We sent a code to ${email}`}
              {step === "password" && "Enter your new password below to reset."}
            </p>
          </div>

          {/* Success Box */}
          {success && (
            <div style={{ background: "#d1fae5", color: "#065f46", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
              {success}
            </div>
          )}

          {/* Error Box */}
          {error && (
            <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
              {error}
            </div>
          )}

          {/* Step 1: Request Email */}
          {step === "email" && (
            <form onSubmit={handleRequestOtp}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Email Address</label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 6, outline: "none", fontSize: 14 }}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ width: "100%", background: "#1e40af", color: "#fff", border: "none", borderRadius: 6, padding: "11px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontSize: 14 }}
              >
                {loading ? "Sending Code..." : "Send Verification Code"}
              </button>
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp}>
              <div style={{ display: "flex", justifyContent: "space-between", margin: "16px 0 20px" }}>
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={el => otpInputRefs.current[i] = el}
                    type="text"
                    maxLength="1"
                    value={d}
                    disabled={locked || loading}
                    onChange={e => handleDigit(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    style={{
                      width: 48, height: 48, textAlign: "center", fontSize: 20, fontWeight: 700,
                      border: "2px solid #cbd5e1", borderRadius: 8, outline: "none", background: "#f8fafc"
                    }}
                  />
                ))}
              </div>

              {/* Attempts strip */}
              {attempts > 0 && !locked && (
                <div style={{ textAlign: "center", fontSize: 12, color: "#d97706", fontWeight: 600, marginBottom: 16 }}>
                  {3 - attempts} attempt{3 - attempts !== 1 ? "s" : ""} remaining
                </div>
              )}

              <button
                type="submit"
                disabled={loading || locked}
                style={{ width: "100%", background: "#10b981", color: "#fff", border: "none", borderRadius: 6, padding: "11px", fontWeight: 700, cursor: loading || locked ? "not-allowed" : "pointer", fontSize: 14, marginBottom: 12 }}
              >
                {loading ? "Verifying..." : "Verify Code"}
              </button>

              <div style={{ textAlign: "center", fontSize: 13 }}>
                <span style={{ color: "#64748b" }}>Didn't receive the code? </span>
                {countdown > 0 ? (
                  <span style={{ color: "#94a3b8", fontWeight: 600 }}>Resend in {countdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending}
                    style={{ background: "none", border: "none", color: "#1e40af", fontWeight: 700, padding: 0, cursor: "pointer", textDecoration: "underline" }}
                  >
                    {resending ? "Sending..." : "Resend Code"}
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Step 3: Set Password */}
          {step === "password" && (
            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>New Password</label>
                <input
                  type="password"
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 6, outline: "none", fontSize: 14 }}
                  required
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Repeat your password"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 6, outline: "none", fontSize: 14 }}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ width: "100%", background: "#1e40af", color: "#fff", border: "none", borderRadius: 6, padding: "11px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontSize: 14 }}
              >
                {loading ? "Resetting Password..." : "Reset Password & Login"}
              </button>
            </form>
          )}

          {/* Footer Back link */}
          <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 20, paddingTop: 16, textAlign: "center" }}>
            <Link to="/client/login" style={{ fontSize: 13, color: "#1e40af", textDecoration: "none", fontWeight: 600 }}>
              ← Back to Login
            </Link>
          </div>

        </div>
      </div>
    </>
  );
};

export default ForgotPassword;
