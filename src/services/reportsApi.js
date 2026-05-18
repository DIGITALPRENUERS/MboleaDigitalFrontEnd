import api from './api';

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadNmbCreditCsv(year) {
  const y = year ?? new Date().getFullYear();
  const res = await api.get(`/reports/financial/nmb-credit.csv?year=${y}`, { responseType: 'blob' });
  downloadBlob(res.data, `nmb-credit-${y}.csv`);
}

export async function downloadTraSummaryPdf(year) {
  const y = year ?? new Date().getFullYear();
  const res = await api.get(`/reports/financial/tra-summary.pdf?year=${y}`, { responseType: 'blob' });
  downloadBlob(res.data, `tra-summary-${y}.pdf`);
}
