import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  }
});

// Automatically sanitize and inject Bearer Token into every outgoing server call
api.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem("token");
    
    if (token) {
      // ✨ Clean up any literal quotes added by storage mishaps
      token = token.replace(/^["']|["']$/g, "");
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;