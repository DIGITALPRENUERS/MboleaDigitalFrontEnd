import axios from 'axios';
import { getStoredToken, setAuthStorage } from './authStorage';

// Use relative URL so the app works when opened from other devices on the network
// (e.g. http://192.168.100.45:5173/). Vite proxy forwards /api to the backend.
const api = axios.create({
  baseURL: '/api',
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
