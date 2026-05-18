import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';

export default function DeliveryProofPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token.trim()) {
      setErr('Missing token. Open the link from your delivery QR.');
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    api
      .get('/public/delivery-proof', { params: { token: token.trim() } })
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((e) => {
        if (!cancelled) setErr(e?.response?.data?.error || e?.message || 'Could not load proof.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 text-slate-800">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-slate-100 p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Delivery proof</h1>
        <p className="mt-1 text-sm text-slate-500">Mbolea Digital — scanner preview</p>
        {loading && <p className="mt-6 text-sm text-slate-600">Loading…</p>}
        {err && <p className="mt-6 text-sm text-amber-800">{err}</p>}
        {!loading && !err && data && (
          <dl className="mt-6 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Order</dt>
              <dd className="font-medium">{data.orderReference}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd className="font-medium">{data.deliveryStatus}</dd>
            </div>
            {(data.region || data.district) && (
              <div>
                <dt className="text-slate-500">Shop area</dt>
                <dd className="font-medium">
                  {[data.region, data.district].filter(Boolean).join(' · ')}
                </dd>
              </div>
            )}
          </dl>
        )}
        <p className="mt-8 text-xs text-slate-500">
          Sign in on your phone to complete confirmation with GPS at the shop counter.
        </p>
        <Link to="/login" className="mt-4 inline-block text-sm font-medium text-emerald-700 hover:underline">
          Go to login
        </Link>
      </div>
    </div>
  );
}
