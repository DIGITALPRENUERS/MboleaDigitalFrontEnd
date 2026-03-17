import api from './api';

/** List all fertilizer offerings from all suppliers (sales point catalog). */
export async function getCatalog() {
  const { data } = await api.get('/catalog/offerings');
  return data;
}
