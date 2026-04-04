import api from './api';

/** List my offerings (supplier). */
export async function listMyOfferings() {
  const { data } = await api.get('/supplier/offerings');
  return data;
}

/**
 * Add offering. Price is set from TFRA regulator automatically.
 * Body: { fertilizerId, packageKilos, availableStock, regionDiscounts?: [{ regionName, discountPercent }] }
 */
export async function createOffering(body) {
  const { data } = await api.post('/supplier/offerings', body);
  return data;
}

/** Update offering. Body: { availableStock?, packageKilos?, regionDiscounts? } */
export async function updateOffering(id, body) {
  const { data } = await api.put(`/supplier/offerings/${id}`, body);
  return data;
}

/** Remove my offering. */
export async function deleteOffering(id) {
  await api.delete(`/supplier/offerings/${id}`);
}
