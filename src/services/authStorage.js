const KEY_TOKEN = 'mbolea_token';
const KEY_USER = 'mbolea_user';

export function getStoredToken() {
  return localStorage.getItem(KEY_TOKEN);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(KEY_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuthStorage(token, user) {
  if (token) localStorage.setItem(KEY_TOKEN, token);
  else localStorage.removeItem(KEY_TOKEN);
  if (user) localStorage.setItem(KEY_USER, JSON.stringify(user));
  else localStorage.removeItem(KEY_USER);
}
