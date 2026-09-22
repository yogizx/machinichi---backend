import axios from "axios";

function normalizeBaseUrl(url) {
  if (!url) return url;
  return url.trim().replace(/\/+$/, "");
}
const DEFAULT_API_BASE_URL = import.meta.env.PROD
  ? "https://machinichi-backend.onrender.com/api"
  : "http://localhost:3000/api";

const rawBase = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
const API_BASE_URL = normalizeBaseUrl(rawBase);

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
});

function getGuestId() {
  let gid = localStorage.getItem("guestId");
  if (!gid) {
    gid = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("guestId", gid);
  }
  return gid;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (!config.headers["x-guest-id"]) {
    config.headers["x-guest-id"] = getGuestId();
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        const isAdmin = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
        const refreshPath = isAdmin ? "/admin/auth/refresh" : "/auth/refresh";
        const refreshToken = localStorage.getItem("refreshToken");
        const refreshConfig = { withCredentials: true };
        if (refreshToken) {
          refreshConfig.headers = { Authorization: `Bearer ${refreshToken}` };
        }
        const refreshRes = await axios.post(
          `${API_BASE_URL}${refreshPath}`,
          {},
          refreshConfig
        );
        if (refreshRes.data?.accessToken) {
          localStorage.setItem("accessToken", refreshRes.data.accessToken);
        }
        if (refreshRes.data?.refreshToken) {
          localStorage.setItem("refreshToken", refreshRes.data.refreshToken);
        }
        return api(error.config);
      } catch (refreshError) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.dispatchEvent(new Event("unauthorized"));
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
