
import axios from "axios";

export const API_URL = (
  import.meta.env.VITE_API_URL || "https://co-working-zbk6.onrender.com"
).replace(/\/$/, "");

const api = axios.create({
  baseURL: `${API_URL}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
