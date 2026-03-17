import api from './api';

/** List TFRA reference prices (max allowed price TZS per fertilizer type and package size). */
export async function getReferencePrices() {
  const { data } = await api.get('/tfra/reference-prices');
  return data;
}
