import api from './api';

/** List my payments (sales point). */
export async function listMy() {
  const { data } = await api.get('/payments/my');
  return data;
}

/** Create a payment. Body: { reference, amount, bulkOrderId? }. */
export async function create(body) {
  const { data } = await api.post('/payments', body);
  return data;
}

/** Delete a payment (own only). Removes from history. */
export async function deletePayment(id) {
  await api.delete(`/payments/${id}`);
}
