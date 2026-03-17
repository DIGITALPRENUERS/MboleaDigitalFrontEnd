import api from './api';

/** List all deliveries. */
export async function listDeliveries() {
  const { data } = await api.get('/logistics/deliveries');
  return data;
}

/** Get delivery by ID. */
export async function getById(id) {
  const { data } = await api.get(`/logistics/deliveries/${id}`);
  return data;
}

/** Create delivery (LOGISTIC or SUPPLIER). Body: { orderReference, trackingRef?, status?, bulkOrderId? }. */
export async function createDelivery(body) {
  const { data } = await api.post('/logistics/deliveries', body);
  return data;
}

/** Update delivery status (LOGISTIC). Body: { status }. */
export async function updateStatus(id, body) {
  const { data } = await api.patch(`/logistics/deliveries/${id}/status`, body);
  return data;
}

/** Sales point confirms receipt of delivery. */
export async function confirmDelivery(id) {
  const { data } = await api.post(`/logistics/deliveries/${id}/confirm`);
  return data;
}
