import api from './api';

/** List my offerings (supplier). */
export async function listMyOfferings() {
  const { data } = await api.get('/supplier/offerings');
  return data;
}

/** Add a fertilizer with my price. Body: { fertilizerId, unitPrice, packageKilos? } */
export async function createOffering(body) {
  const { data } = await api.post('/supplier/offerings', body);
  return data;
}

/** Update my offering. Body: { unitPrice?, packageKilos? } */
export async function updateOffering(id, body) {
  const { data } = await api.put(`/supplier/offerings/${id}`, body);
  return data;
}

/** Remove my offering. */
export async function deleteOffering(id) {
  await api.delete(`/supplier/offerings/${id}`);
}
