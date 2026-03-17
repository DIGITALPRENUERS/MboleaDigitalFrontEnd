import api from './api';

/** Get all TFRA indicative prices (nested). */
export async function getPrices() {
  const { data } = await api.get('/tfra/prices');
  return data;
}

/** Get summary (region count and names). */
export async function getSummary() {
  const { data } = await api.get('/tfra/prices/summary');
  return data;
}

/** Get indicative prices for one region. */
export async function getRegion(regionName) {
  const { data } = await api.get(`/tfra/prices/regions/${encodeURIComponent(regionName)}`);
  return data;
}

/** Get location hierarchy only (region → district → ward). Public, no auth required. For Sales Point registration dropdowns. */
export async function getLocations() {
  const { data } = await api.get('/tfra/locations');
  return data;
}
