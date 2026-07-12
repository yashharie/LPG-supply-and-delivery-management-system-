import { Routes, Route, Navigate } from "react-router-dom";

/* ── PUBLIC PAGES ──────────────────────────────────────────────── */
import Home           from "./pages/Home";
import About          from "./pages/About";
import Services       from "./pages/Services";
import Contact        from "./pages/Contact";
import Support        from "./pages/Support";
import ClientLogin    from "./pages/ClientLogin";
import ClientRegister from "./pages/ClientRegister";
import VerifyOtp      from "./pages/VerifyOtp";
import ForgotPassword from "./pages/ForgotPassword";
import PortalLogin    from "./pages/PortalLogin";

/* ── CLIENT ────────────────────────────────────────────────────── */
import ClientDashboard from "./pages/Client/ClientDashboard";

/* ── ADMIN ─────────────────────────────────────────────────────── */
import AdminLayout    from "./Layouts/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import EmployeeList   from "./pages/admin/EmployeeList";
import Warehouses     from "./pages/admin/Warehouses";
import Orders         from "./pages/admin/Orders";
import AdminStockPage from "./pages/admin/stock/AdminStockPage";
import Clients        from "./pages/admin/Clients";
import StockHistory   from "./pages/admin/StockHistory";
import CylinderTypes  from "./pages/admin/CylinderTypes";
import FeedbackInbox  from "./pages/admin/FeedbackInbox";
import LiveDriversMap from "./pages/admin/LiveDriversMap";
import Refunds        from "./pages/admin/Refunds";

/* ── MANAGER ────────────────────────────────────────────────────── */
import ManagerLayout         from "./Layouts/ManagerLayout";
import ManagerDashboard      from "./pages/manager/ManagerDashboard";
import ManagerChangePassword from "./pages/manager/ChangePassword";

/* ── DRIVER ─────────────────────────────────────────────────────── */
import DriverLayout         from "./Layouts/DriverLayout";
import DriverDashboard      from "./pages/driver/DriverDashboard";
import DriverChangePassword from "./pages/driver/ChangePassword";

/* ── SECURITY ───────────────────────────────────────────────────── */
import ProtectedRoute from "./components/ProtectedRoute";

/* ── Redirects logged-in users to their dashboard on unknown paths ── */
const RoleRedirect = () => {
  const role = (localStorage.getItem("role") || "").toLowerCase().trim();
  switch (role) {
    case "admin":   return <Navigate to="/admin/dashboard"   replace />;
    case "manager": return <Navigate to="/manager/dashboard" replace />;
    case "driver":  return <Navigate to="/driver/dashboard"  replace />;
    case "client":  return <Navigate to="/client/dashboard"  replace />;
    default:        return <Navigate to="/"                  replace />;
  }
};

function App() {
  return (
    <Routes>

      {/* ── PUBLIC ────────────────────────────────────────────── */}
      <Route path="/"                element={<Home />} />
      <Route path="/about"           element={<About />} />
      <Route path="/services"        element={<Services />} />
      <Route path="/contact"         element={<Contact />} />
      <Route path="/support"         element={<Support />} />
      <Route path="/client/login"    element={<ClientLogin />} />
      <Route path="/client/register" element={<ClientRegister />} />
      <Route path="/client/verify"   element={<VerifyOtp />} />
      <Route path="/client/forgot-password" element={<ForgotPassword />} />
      <Route path="/portal/login"    element={<PortalLogin />} />

      {/* ── CLIENT ────────────────────────────────────────────── */}
      <Route
        path="/client/dashboard"
        element={
          <ProtectedRoute allowedRoles={["client"]}>
            <ClientDashboard />
          </ProtectedRoute>
        }
      />

      {/* ── ADMIN ─────────────────────────────────────────────── */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index                element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"     element={<AdminDashboard />} />
        <Route path="employees"     element={<EmployeeList />} />
        <Route path="clients"       element={<Clients />} />
        <Route path="warehouses"    element={<Warehouses />} />
        <Route path="orders"        element={<Orders />} />
        <Route path="stock"         element={<AdminStockPage />} />
        <Route path="stock-history" element={<StockHistory />} />
        <Route path="cylinder-types" element={<CylinderTypes />} />
        <Route path="feedback"      element={<FeedbackInbox />} />
        <Route path="drivers-map"   element={<LiveDriversMap />} />
        <Route path="refunds"       element={<Refunds />} />
      </Route>

      {/* ── MANAGER ───────────────────────────────────────────── */}
      <Route
        path="/manager"
        element={
          <ProtectedRoute allowedRoles={["manager"]}>
            <ManagerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"       element={<ManagerDashboard />} />
        <Route path="change-password" element={<ManagerChangePassword />} />
      </Route>

      {/* ── DRIVER ────────────────────────────────────────────── */}
      <Route
        path="/driver"
        element={
          <ProtectedRoute allowedRoles={["driver"]}>
            <DriverLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"       element={<DriverDashboard />} />
        <Route path="change-password" element={<DriverChangePassword />} />
      </Route>

      {/* ── CATCH-ALL ─────────────────────────────────────────── */}
      <Route path="*" element={<RoleRedirect />} />

    </Routes>
  );
}

export default App;
