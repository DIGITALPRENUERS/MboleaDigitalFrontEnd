import api from './api';

/** List bulk orders (sales point: my orders; supplier: orders to me; admin/TFRA/LOGISTIC: all). */
export async function list(params) {
  const { data } = await api.get('/bulk-orders', { params: params || {} });
  return data;
}

/** Order history filter params: { status, tfraStatus, fromDate, toDate }. */
export async function listWithFilters(filters) {
  const params = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.tfraStatus) params.tfraStatus = filters.tfraStatus;
  if (filters?.fromDate) params.fromDate = filters.fromDate;
  if (filters?.toDate) params.toDate = filters.toDate;
  return list(params);
}

/** List bulk orders for TFRA review (pending TFRA approval). */
export async function listForTfra() {
  const { data } = await api.get('/bulk-orders/tfra');
  return data;
}

/** List suppliers for placing a bulk order. */
export async function listSuppliers() {
  const { data } = await api.get('/bulk-orders/suppliers');
  return data;
}

/** Get bulk order by ID. */
export async function getById(id) {
  const { data } = await api.get(`/bulk-orders/${id}`);
  return data;
}

/** Create bulk order. Body: { supplierUserId, lines: [{ fertilizerId, quantity, unitPrice? }] }. */
export async function create(body) {
  const { data } = await api.post('/bulk-orders', body);
  return data;
}

/** Supplier confirms order with logistics choice: OWN or PLATFORM_REQUESTED. Body: { logisticsType }. */
export async function confirmBySupplier(id, body) {
  const { data } = await api.patch(`/bulk-orders/${id}/confirm`, body);
  return data;
}

/** Get current user's cancellation stats (orders cancelled today before TFRA approval, and daily limit). */
export async function getCancellationStats() {
  const { data } = await api.get('/bulk-orders/cancellation-stats');
  return data;
}

/** Cancel bulk order. */
export async function cancel(id) {
  const { data } = await api.patch(`/bulk-orders/${id}/cancel`);
  return data;
}

/** TFRA approves or rejects an order. Body: { approved, comment? }. */
export async function tfraApprove(id, body) {
  const { data } = await api.patch(`/bulk-orders/${id}/tfra-approval`, body);
  return data;
}
