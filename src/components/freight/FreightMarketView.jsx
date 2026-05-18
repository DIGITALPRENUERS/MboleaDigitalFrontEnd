import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as marketApi from '../../services/marketApi';
import { withContext } from '../../utils/errorNotifications';
import { useToast } from '../ui/Toast';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

export default function FreightMarketView() {
  const { user } = useAuth();
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bidForm, setBidForm] = useState({ jobId: '', amount: '', backload: false, notes: '' });
  const [busy, setBusy] = useState(false);

  const isLogistic = user?.role === 'ROLE_LOGISTIC';
  const isSupplier = user?.role === 'ROLE_SUPPLIER';

  const load = () => {
    setLoading(true);
    marketApi
      .listOpenFreightJobs()
      .then(setJobs)
      .catch((e) => {
        toast.error(withContext('Load freight jobs', e));
        setJobs([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const submitBid = async (e) => {
    e.preventDefault();
    const jobId = Number(bidForm.jobId);
    const amount = Number(bidForm.amount);
    if (!(jobId > 0) || !(amount > 0)) {
      toast.error('Select a job and enter a positive bid amount.');
      return;
    }
    setBusy(true);
    try {
      await marketApi.placeFreightBid(jobId, {
        amountTzs: amount,
        backloadSuggested: bidForm.backload,
        notes: bidForm.notes || null,
      });
      toast.success('Bid submitted.');
      setBidForm({ jobId: '', amount: '', backload: false, notes: '' });
      load();
    } catch (err) {
      toast.error(withContext('Place bid', err));
    } finally {
      setBusy(false);
    }
  };

  const accept = async (jobId, bidId) => {
    setBusy(true);
    try {
      await marketApi.acceptFreightBid(jobId, bidId);
      toast.success('Bid awarded.');
      load();
    } catch (err) {
      toast.error(withContext('Award bid', err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Freight marketplace</h1>
        <p className="mt-1 text-sm text-slate-600">
          Logistics partners bid on open delivery legs; suppliers award the best offer (including backload suggestions).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-slate-600">Loading…</p>}
          {!loading && jobs.length === 0 && (
            <p className="text-sm text-slate-600">No open freight jobs right now.</p>
          )}
          <ul className="space-y-4">
            {jobs.map((job) => (
              <li key={job.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Job #{job.id}</p>
                    <p className="text-xs text-slate-500">Order {job.orderReference || '—'} · delivery #{job.deliveryId}</p>
                  </div>
                  <span className="text-xs font-semibold uppercase text-emerald-700">{job.status}</span>
                </div>
                {job.bids?.length > 0 && (
                  <ul className="mt-3 space-y-2 text-sm">
                    {job.bids.map((b) => (
                      <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-card px-3 py-2 border border-slate-200 dark:bg-slate-800">
                        <span>
                          {b.bidderName || `User ${b.bidderUserId}`} — {Number(b.amountTzs).toLocaleString('en-TZ')} TZS
                          {b.backloadSuggested ? ' · backload' : ''}
                        </span>
                        {isSupplier && (
                          <Button type="button" size="sm" disabled={busy} onClick={() => accept(job.id, b.id)}>
                            Award
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {isLogistic && (
        <Card>
          <CardHeader>
            <CardTitle>Place a bid</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitBid} className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Job ID"
                value={bidForm.jobId}
                onChange={(e) => setBidForm((f) => ({ ...f, jobId: e.target.value }))}
                placeholder="From list above"
              />
              <Input
                label="Amount (TZS)"
                type="number"
                min="1"
                step="1"
                value={bidForm.amount}
                onChange={(e) => setBidForm((f) => ({ ...f, amount: e.target.value }))}
              />
              <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={bidForm.backload}
                  onChange={(e) => setBidForm((f) => ({ ...f, backload: e.target.checked }))}
                />
                Suggest backload / return leg
              </label>
              <Input
                className="sm:col-span-2"
                label="Notes (optional)"
                value={bidForm.notes}
                onChange={(e) => setBidForm((f) => ({ ...f, notes: e.target.value }))}
              />
              <div className="sm:col-span-2">
                <Button type="submit" disabled={busy}>
                  Submit bid
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
