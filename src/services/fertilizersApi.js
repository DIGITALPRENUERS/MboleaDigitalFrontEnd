import api from './api';

/** List all fertilizers. */
export async function listFertilizers() {
  const { data } = await api.get('/fertilizers');
  return data;
}

export async function getFertilizer(id) {
  const { data } = await api.get(`/fertilizers/${id}`);
  return data;
}

/** Create fertilizer (ADMIN, TFRA, SALES_POINT). */
export async function createFertilizer(body) {
  const { data } = await api.post('/fertilizers', body);
  return data;
}

/** Update fertilizer. */
export async function updateFertilizer(id, body) {
  const { data } = await api.put(`/fertilizers/${id}`, body);
  return data;
}

/** Delete fertilizer. */
export async function deleteFertilizer(id) {
  await api.delete(`/fertilizers/${id}`);
}
