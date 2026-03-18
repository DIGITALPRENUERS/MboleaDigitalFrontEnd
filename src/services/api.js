import axios from 'axios';
import { getStoredToken, setAuthStorage } from './authStorage';

// Use env-driven API base URL for production (Railway), but keep Vite-dev behavior working.
// Backend is hosted under context-path: /api, so the base should be: https://backend-host/api
// In dev, VITE_API_BASE_URL can be left empty; we default to relative '/api' (Vite proxy handles it).
const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, ''),
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) setAuthStorage(null, null);
    return Promise.reject(err);
  }
);

export default api;
