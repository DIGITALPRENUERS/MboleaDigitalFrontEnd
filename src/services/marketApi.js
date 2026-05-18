import api from './api';

export async function listOpenFreightJobs() {
  const { data } = await api.get('/logistics/market/jobs/open');
  return data;
}

export async function placeFreightBid(jobId, body) {
  const { data } = await api.post(`/logistics/market/jobs/${jobId}/bids`, body);
  return data;
}

export async function acceptFreightBid(jobId, bidId) {
  const { data } = await api.post(`/logistics/market/jobs/${jobId}/accept/${bidId}`);
  return data;
}
