import api from './api';
import { setAuthStorage } from './authStorage';

export { getStoredToken, getStoredUser, setAuthStorage } from './authStorage';

/** Backend returns role as enum name (AdminRole: SYSTEM_ADMIN; UserRole: SALES_POINT, LOGISTIC, TFRA, SUPPLIER). We store with ROLE_ prefix for consistent checks. */
export function toRole(backendRole) {
  if (!backendRole) return backendRole;
  const r = String(backendRole).toUpperCase();
  return r.startsWith('ROLE_') ? r : `ROLE_${r}`;
}

export async function login(email, password, companyCode) {
  const body = {
    email: String(email).trim().toLowerCase(),
    password,
  };
  if (companyCode != null && String(companyCode).trim() !== '') {
    body.companyCode = String(companyCode).trim();
  }
  const { data } = await api.post('/auth/login', body);
  const u = data.user || {};
  const user = {
    id: u.id,
    email: u.email,
    name: u.name || u.email,
    role: toRole(u.role),
    companyName: u.companyName ?? null,
    region: u.region ?? null,
    district: u.district ?? null,
    ward: u.ward ?? null,
  };
  setAuthStorage(data.accessToken, user);
  return { token: data.accessToken, user };
}

/** Call backend logout (optional; client still must clear token). */
export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch {
    // Ignore (e.g. token expired); client will clear storage anyway
  }
}

export async function register({ name, email, password, role, companyName, companyCode, region, district, ward }) {
  const { data } = await api.post('/auth/register', {
    name: (name || '').trim() || (email || '').split('@')[0],
    email: String(email).trim().toLowerCase(),
    password,
    role,
    companyName: companyName || null,
    companyCode: companyCode || null,
    region: region || null,
    district: district || null,
    ward: ward || null,
  });
  return data;
}
