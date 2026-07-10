import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const ChangePassword = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");

      const res = await axios.post(
        "http://127.0.0.1:8000/api/change-password",
        form,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage(res.data.message);

      // redirect after success
      setTimeout(() => {
        navigate("/portal/login");
      }, 1500);

    } catch (err) {
      setMessage(err.response?.data?.message || "Error changing password");
    }
  };

  return (
    <div className="auth-container">
      <h2>Change Password</h2>

      {message && <p>{message}</p>}

      <form onSubmit={handleSubmit}>
        <input
          type="password"
          name="current_password"
          placeholder="Current Password"
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="new_password"
          placeholder="New Password"
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="new_password_confirmation"
          placeholder="Confirm New Password"
          onChange={handleChange}
          required
        />

        <button type="submit">Update Password</button>
      </form>
    </div>
  );
};

export default ChangePassword;