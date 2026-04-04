import api from './api';

/** List all users (system admin only). */
export async function listUsers() {
  const { data } = await api.get('/users');
  return data;
}

/** Create user with any role, including TFRA (system admin only). */
export async function createUser(body) {
  const { data } = await api.post('/users', body);
  return data;
}

/** Patch user by id (system admin only). */
export async function updateUser(id, body) {
  const { data } = await api.patch(`/users/${id}`, body);
  return data;
}
