import { Outlet } from "react-router-dom";
import "../styles/AuthLayout.css";

const AuthLayout = () => {
  return (
    <div className="auth-wrapper">
      {/* CENTERED AUTH PAGES */}
      <Outlet />
    </div>
  );
};

export default AuthLayout;