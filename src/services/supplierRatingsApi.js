import api from './api';

/** Create or update my rating for a supplier (sales point). */
export async function upsertRating(body) {
  const { data } = await api.post('/supplier-ratings', body);
  return data;
}

/** { averageStars, ratingCount } */
export async function getSupplierRatingSummary(supplierUserId) {
  const { data } = await api.get(`/supplier-ratings/suppliers/${supplierUserId}/summary`);
  return data;
}

/** My rating for this supplier, or null if none / 204 */
export async function getMyRatingForSupplier(supplierUserId) {
  const { data, status } = await api.get(`/supplier-ratings/suppliers/${supplierUserId}/mine`, {
    validateStatus: (s) => (s >= 200 && s < 300) || s === 204,
  });
  if (status === 204) return null;
  return data;
}
