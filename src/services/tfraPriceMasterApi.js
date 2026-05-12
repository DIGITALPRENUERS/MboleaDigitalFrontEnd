import api from './api';

/** Upload National Price Master Excel (.xlsx). TFRA or system admin. */
export async function uploadPriceMaster(file) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/tfra/price-master/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/** Latest active upload metadata, or null if none. */
export async function getLatestPriceMaster() {
  try {
    const { data } = await api.get('/tfra/price-master/latest');
    return data;
  } catch (e) {
    if (e.response?.status === 404) return null;
    throw e;
  }
}
