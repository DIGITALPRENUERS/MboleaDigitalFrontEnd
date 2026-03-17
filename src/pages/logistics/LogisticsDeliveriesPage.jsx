import { useState, useEffect } from 'react';
import * as logisticsApi from '../../services/logisticsApi';
import { withContext } from '../../utils/errorNotifications';
import { formatDateTime } from '../../utils/dateTime';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import StatusBadge from '../../components/common/StatusBadge';
import { useToast } from '../../components/ui/Toast';
import { Truck, Plus } from 'lucide-react';

const DELIVERY_STATUSES = ['PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];

export default function LogisticsDeliveriesPage() {
  const toast = useToast();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ orderReference: '', trackingRef: '', status: 'PENDING' });
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [statusEdit, setStatusEdit] = useState({});

  const load = () => {
    setLoading(true);
    logisticsApi
      .listDeliveries()
      .then(setDeliveries)
      .catch((err) => { setDeliveries([]); toast.error(withContext('Load deliveries', err)); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.orderReference.trim()) {
      toast.error(withContext('Create delivery', 'Order reference is required.'));
      return;
    }
    setSubmitting(true);
    try {
      await logisticsApi.createDelivery({
        orderReference: form.orderReference.trim(),
        trackingRef: form.trackingRef.trim() || null,
        status: form.status,
      });
      toast.success('Delivery created.');
      setForm({ orderReference: '', trackingRef: '', status: 'PENDING' });
      load();
    } catch (err) {
      toast.error(withContext('Create delivery', err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id) => {
    const status = statusEdit[id];
    if (!status) return;
    setUpdatingId(id);
    try {
      await logisticsApi.updateStatus(id, { status });
      toast.success('Status updated.');
      setStatusEdit((prev) => ({ ...prev, [id]: undefined }));
      load();
    } catch (err) {
      toast.error(withContext('Update delivery status', err));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-auto p-6 lg:p-8">
      <div className="space-y-6 flex-shrink-0">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="size-5" />
              Create delivery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-4">
              <Input
                label="Order reference"
                value={form.orderReference}
                onChange={(e) => setForm((f) => ({ ...f, orderReference: e.target.value }))}
                placeholder="e.g. BO-2026-1A2B3C"
                required
              />
              <Input
                label="Tracking ref"
                value={form.trackingRef}
                onChange={(e) => setForm((f) => ({ ...f, trackingRef: e.target.value }))}
                placeholder="Optional"
              />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900"
                >
                  {DELIVERY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" disabled={submitting} isLoading={submitting}>
                Create
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="flex flex-col flex-1 min-h-0 flex-shrink-0 overflow-hidden mt-6">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <Truck className="size-5" />
            Deliveries ({deliveries.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-auto">
          {loading ? (
            <p className="text-slate-500">Loading…</p>
          ) : deliveries.length === 0 ? (
            <p className="text-slate-500">No deliveries yet. Create one above.</p>
          ) : (
            <div className="space-y-4">
              {deliveries.map((d) => (
                <div
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50/50 p-4"
                >
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <p className="font-mono text-sm font-medium text-slate-800">{d.orderReference}</p>
                      <p className="text-xs text-slate-500">Tracking: {d.trackingRef || '—'}</p>
                    </div>
                    <StatusBadge status={d.status} />
                    <span className="text-sm text-slate-500">{formatDateTime(d.createdAt)}</span>
                    {d.confirmedByDisplay && (
                      <span className="text-xs text-slate-500">{d.confirmedByDisplay}</span>
                    )}
                  </div>
                  {(d.status === 'PENDING' || d.status === 'IN_TRANSIT') && (
                    <div className="flex items-center gap-2">
                      <select
                        value={statusEdit[d.id] ?? d.status}
                        onChange={(e) =>
                          setStatusEdit((prev) => ({ ...prev, [d.id]: e.target.value }))
                        }
                        className="rounded border border-slate-200 px-2 py-1.5 text-sm"
                      >
                        {DELIVERY_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(d.id)}
                        disabled={updatingId === d.id}
                        isLoading={updatingId === d.id}
                      >
                        Update
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

