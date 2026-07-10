import { useState, useEffect } from "react";
import axios from "axios";
import { toast, errorAlert } from "../../utils/swal";

const API = "http://127.0.0.1:8000/api";

const CreateEmployee = () => {
  const [form, setForm] = useState({
    name: "",
    nic: "",
    role: "manager",
    warehouse_id: "",
  });

  const [warehouses, setWarehouses]       = useState([]);
  const [credentials, setCredentials]     = useState(null);
  const [submitting,  setSubmitting]      = useState(false);

  const token = localStorage.getItem("token");

  // Load warehouses for dropdown
  useEffect(() => {
    axios
      .get(`${API}/warehouses`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setWarehouses(res.data))
      .catch(console.error);
  }, [token]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCredentials(null);
    setSubmitting(true);

    try {
      const res = await axios.post(
        `${API}/admin/employees`,
        {
          name:         form.name,
          nic:          form.nic,
          role:         form.role,
          warehouse_id: form.warehouse_id || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCredentials({
        name:             res.data.employee.name,
        employee_id:      res.data.employee_id,
        default_password: res.data.default_password,
        role:             res.data.employee.role,
      });
      toast(`${res.data.employee.name} created successfully.`);

      setForm({ name: "", nic: "", role: "manager", warehouse_id: "" });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        Object.values(err.response?.data?.errors ?? {})[0]?.[0] ||
        "Failed to create employee.";
      errorAlert("Creation Failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-dashboard-view">
      <h2 className="admin-header-title">➕ Add New Employee</h2>

      {credentials && (
        <div className="alert alert-success credential-reveal-box">
          <h3>✅ Account Created!</h3>
          <p>Hand these credentials to <strong>{credentials.name}</strong>:</p>
          <div className="credential-row">
            <span>Employee ID:</span>
            <code className="monospace-highlight">{credentials.employee_id}</code>
          </div>
          <div className="credential-row">
            <span>Login Email:</span>
            <code className="monospace-highlight">{credentials.employee_id}@gashub.local</code>
          </div>
          <div className="credential-row">
            <span>Temp Password:</span>
            <code className="monospace-highlight">{credentials.default_password}</code>
          </div>
          <div className="credential-row">
            <span>Role:</span>
            <code className="monospace-highlight">{credentials.role}</code>
          </div>
          <button
            className="dismiss-alert-btn"
            onClick={() => setCredentials(null)}
          >
            Clear
          </button>
        </div>
      )}

      <div className="admin-card" style={{ maxWidth: 520 }}>
        <form onSubmit={handleSubmit}>
          <div className="admin-form-group">
            <label>Full Name</label>
            <input
              name="name"
              className="admin-input"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. John Perera"
              required
            />
          </div>

          <div className="admin-form-group">
            <label>NIC Number</label>
            <input
              name="nic"
              className="admin-input"
              value={form.nic}
              onChange={handleChange}
              placeholder="e.g. 199512345V"
              required
            />
          </div>

          <div className="admin-form-group">
            <label>Role</label>
            <select
              name="role"
              className="admin-select"
              value={form.role}
              onChange={handleChange}
            >
              <option value="manager">Manager</option>
              <option value="driver">Driver</option>
            </select>
          </div>

          <div className="admin-form-group">
            <label>Assign to Warehouse</label>
            <select
              name="warehouse_id"
              className="admin-select"
              value={form.warehouse_id}
              onChange={handleChange}
            >
              <option value="">— No warehouse assigned —</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.address})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="admin-action-btn btn-blue-submit"
            disabled={submitting}
          >
            {submitting ? "Creating…" : "Create Employee"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateEmployee;
