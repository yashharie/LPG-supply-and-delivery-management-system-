import { Navigate, useLocation } from "react-router-dom";

/**
 * ProtectedRoute — refresh-safe.
 *
 * Reads token + role from localStorage synchronously — survives any page
 * refresh because localStorage is available before React renders anything.
 *
 * Rules:
 *  - No token           → redirect to the correct login page
 *  - Role matches       → render children (the ONLY path on a valid refresh)
 *  - Token but wrong role → send to "/" (RoleRedirect handles it)
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const location = useLocation();

  // Always read fresh from localStorage (synchronous, no async/state)
  const token = localStorage.getItem("token") || "";
  const role  = (localStorage.getItem("role") || "").toLowerCase().trim();

  // ── No token ──────────────────────────────────────────────────────
  if (!token) {
    const loginPath = allowedRoles.includes("client")
      ? "/client/login"
      : "/portal/login";
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
  }

  // ── Correct role → let them through ──────────────────────────────
  if (allowedRoles.map(r => r.toLowerCase()).includes(role)) {
    return children;
  }

  // ── Has token but wrong role → RoleRedirect will sort it out ─────
  return <Navigate to="/" replace />;
};

export default ProtectedRoute;
