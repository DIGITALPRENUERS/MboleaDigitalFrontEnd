import { useState, useEffect } from 'react';
import * as fertilizersApi from '../../services/fertilizersApi';
import * as catalogApi from '../../services/catalogApi';
import * as bulkOrdersApi from '../../services/bulkOrdersApi';
import * as logisticsApi from '../../services/logisticsApi';
import { withContext } from '../../utils/errorNotifications';
import { formatDateTime } from '../../utils/dateTime';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import OrderHistory from '../../components/orders/OrderHistory';
import { useToast } from '../../components/ui/Toast';
import { Package, ListOrdered, Truck, ShoppingBag, History } from 'lucide-react';

function formatTZS(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-TZ') + ' TZS';
}

export default function AdminDashboard() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('fertilizers');
  const [fertilizers, setFertilizers] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [orders, setOrders] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState({ fertilizers: true, catalog: true, orders: true, deliveries: true });
  const [fertilizerForm, setFertilizerForm] = useState({ name: '', code: '', unit: 'kg', pricePerUnit: '', packageKilos: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);

  const loadFertilizers = () => {
    fertilizersApi.listFertilizers().then(setFertilizers).catch(() => setFertilizers([]));
  };
  const loadCatalog = () =>
    catalogApi.getCatalog().then(setCatalog).catch(() => setCatalog([]));
  const loadOrders = () =>
    bulkOrdersApi.list().then(setOrders).catch(() => setOrders([]));
  const loadDeliveries = () =>
    logisticsApi.listDeliveries().then(setDeliveries).catch(() => setDeliveries([]));

  useEffect(() => {
    setLoading((l) => ({ ...l, fertilizers: true }));
    fertilizersApi.listFertilizers().then(setFertilizers).catch(() => setFertilizers([])).finally(() => setLoading((l) => ({ ...l, fertilizers: false })));
  }, []);
  useEffect(() => {
    if (activeTab === 'catalog') {
      setLoading((l) => ({ ...l, catalog: true }));
      loadCatalog().finally(() => setLoading((l) => ({ ...l, catalog: false })));
    }
  }, [activeTab]);
  useEffect(() => {
    if (activeTab === 'orders') {
      setLoading((l) => ({ ...l, orders: true }));
      loadOrders().finally(() => setLoading((l) => ({ ...l, orders: false })));
    }
  }, [activeTab]);
  useEffect(() => {
    if (activeTab === 'deliveries') {
      setLoading((l) => ({ ...l, deliveries: true }));
      loadDeliveries().finally(() => setLoading((l) => ({ ...l, deliveries: false })));
    }
  }, [activeTab]);

  const handleCreateFertilizer = async (e) => {
    e.preventDefault();
    const name = fertilizerForm.name.trim();
    const code = fertilizerForm.code.trim();
    if (!name || !code) {
      toast.error(withContext('Create fertilizer', 'Name and code required.'));
      return;
    }
    setSubmitting(true);
    try {
      await fertilizersApi.createFertilizer({
        name,
        code,
        unit: fertilizerForm.unit || null,
        pricePerUnit: fertilizerForm.pricePerUnit ? Number(fertilizerForm.pricePerUnit) : null,
        packageKilos: fertilizerForm.packageKilos ? Number(fertilizerForm.packageKilos) : null,
      });
      toast.success('Fertilizer created.');
      setFertilizerForm({ name: '', code: '', unit: 'kg', pricePerUnit: '', packageKilos: '' });
      loadFertilizers();
    } catch (err) {
      toast.error(withContext('Create fertilizer', err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateFertilizer = async () => {
    if (!editingId || !editForm) return;
    setSubmitting(true);
    try {
      await fertilizersApi.updateFertilizer(editingId, {
        name: editForm.name,
        code: editForm.code,
        unit: editForm.unit || null,
        pricePerUnit: editForm.pricePerUnit != null && editForm.pricePerUnit !== '' ? Number(editForm.pricePerUnit) : null,
        packageKilos: editForm.packageKilos != null && editForm.packageKilos !== '' ? Number(editForm.packageKilos) : null,
      });
      toast.success('Fertilizer updated.');
      setEditingId(null);
      setEditForm(null);
      loadFertilizers();
    } catch (err) {
      toast.error(withContext('Update fertilizer', err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFertilizer = (id) => {
    setConfirmingDeleteId(id);
  };

  const handleConfirmDeleteFertilizer = async () => {
    const id = confirmingDeleteId;
    if (id == null) return;
    setConfirmingDeleteId(null);
    try {
      await fertilizersApi.deleteFertilizer(id);
      toast.success('Deleted.');
      setEditingId(null);
      setEditForm(null);
      loadFertilizers();
    } catch (err) {
      toast.error(withContext('Delete fertilizer', err));
    }
  };

  const tabs = [
    { id: 'fertilizers', label: 'Fertilizers', icon: Package },
    { id: 'catalog', label: 'Catalog', icon: ShoppingBag },
    { id: 'orders', label: 'Bulk orders', icon: ListOrdered },
    { id: 'orderHistory', label: 'Order history', icon: History },
    { id: 'deliveries', label: 'Deliveries', icon: Truck },
  ];

  const totalFertilizers = fertilizers.length;
  const totalCatalogItems = catalog.length;
  const totalOrders = orders.length;
  const totalDeliveries = deliveries.length;

  return (
    <div className="space-y-8">
      <Modal
        isOpen={confirmingDeleteId != null}
        onClose={() => setConfirmingDeleteId(null)}
        title="Delete fertilizer"
        size="sm"
      >
        <p className="text-slate-600 mb-4">Delete this fertilizer? This cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmingDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleConfirmDeleteFertilizer}>Delete</Button>
        </div>
      </Modal>
      {/* Modern dashboard header with quick stats */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-emerald-50 via-slate-50 to-sky-50 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Admin dashboard</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Platform control center</h1>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              Monitor fertilizers, supplier catalog, bulk orders and deliveries in one modern view.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[120px] rounded-xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-emerald-100">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Fertilizers</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{totalFertilizers}</p>
            </div>
            <div className="min-w-[120px] rounded-xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-sky-100">
              <p className="text-xs font-medium uppercase tracking-wide text-sky-700">Catalog items</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{totalCatalogItems}</p>
            </div>
            <div className="min-w-[120px] rounded-xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-amber-100">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Bulk orders</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{totalOrders}</p>
            </div>
            <div className="min-w-[120px] rounded-xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-700">Deliveries</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{totalDeliveries}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modern tab navigation styled as segmented control */}
      <nav className="inline-flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Icon className="size-4" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {activeTab === 'fertilizers' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="size-5" />
              Fertilizers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleCreateFertilizer} className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
              <Input label="Name" value={fertilizerForm.name} onChange={(e) => setFertilizerForm((f) => ({ ...f, name: e.target.value }))} required />
              <Input label="Code" value={fertilizerForm.code} onChange={(e) => setFertilizerForm((f) => ({ ...f, code: e.target.value }))} required />
              <Input label="Unit" value={fertilizerForm.unit} onChange={(e) => setFertilizerForm((f) => ({ ...f, unit: e.target.value }))} />
              <Input label="Price/unit" type="number" step="0.01" value={fertilizerForm.pricePerUnit} onChange={(e) => setFertilizerForm((f) => ({ ...f, pricePerUnit: e.target.value }))} />
              <Input label="Package kg" type="number" value={fertilizerForm.packageKilos} onChange={(e) => setFertilizerForm((f) => ({ ...f, packageKilos: e.target.value }))} />
              <Button type="submit" disabled={submitting} isLoading={submitting}>Add</Button>
            </form>
            {loading.fertilizers ? (
              <p className="text-slate-500">Loading…</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600">
                      <th className="pb-2 font-medium">Name</th>
                      <th className="pb-2 font-medium">Code</th>
                      <th className="pb-2 font-medium">Unit</th>
                      <th className="pb-2 font-medium">Price/unit</th>
                      <th className="pb-2 font-medium">Package</th>
                      <th className="pb-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fertilizers.map((f) => (
                      <tr key={f.id} className="border-b border-slate-100">
                        {editingId === f.id && editForm ? (
                          <>
                            <td><input className="w-full rounded border px-2 py-1" value={editForm.name} onChange={(e) => setEditForm((x) => ({ ...x, name: e.target.value }))} /></td>
                            <td><input className="w-full rounded border px-2 py-1" value={editForm.code} onChange={(e) => setEditForm((x) => ({ ...x, code: e.target.value }))} /></td>
                            <td><input className="w-16 rounded border px-2 py-1" value={editForm.unit} onChange={(e) => setEditForm((x) => ({ ...x, unit: e.target.value }))} /></td>
                            <td><input type="number" className="w-20 rounded border px-2 py-1" value={editForm.pricePerUnit} onChange={(e) => setEditForm((x) => ({ ...x, pricePerUnit: e.target.value }))} /></td>
                            <td><input type="number" className="w-16 rounded border px-2 py-1" value={editForm.packageKilos} onChange={(e) => setEditForm((x) => ({ ...x, packageKilos: e.target.value }))} /></td>
                            <td>
                              <Button size="sm" onClick={handleUpdateFertilizer} disabled={submitting}>Save</Button>
                              <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditForm(null); }}>Cancel</Button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2 font-medium">{f.name}</td>
                            <td className="py-2">{f.code ?? '—'}</td>
                            <td className="py-2">{f.unit ?? '—'}</td>
                            <td className="py-2">{formatTZS(f.pricePerUnit)}</td>
                            <td className="py-2">{f.packageKilos != null ? f.packageKilos : '—'}</td>
                            <td className="py-2">
                              <Button size="sm" variant="ghost" onClick={() => { setEditingId(f.id); setEditForm({ name: f.name, code: f.code, unit: f.unit ?? '', pricePerUnit: f.pricePerUnit ?? '', packageKilos: f.packageKilos ?? '' }); }}>Edit</Button>
                              <Button size="sm" variant="danger" onClick={() => handleDeleteFertilizer(f.id)}>Delete</Button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'catalog' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="size-5" />
              Catalog (supplier offerings)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading.catalog ? (
              <p className="text-slate-500">Loading…</p>
            ) : catalog.length === 0 ? (
              <p className="text-slate-500">No offerings.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600">
                      <th className="pb-2 font-medium">Product</th>
                      <th className="pb-2 font-medium">Code</th>
                      <th className="pb-2 font-medium">Package (kg)</th>
                      <th className="pb-2 font-medium">Price (TZS)</th>
                      <th className="pb-2 font-medium">Supplier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalog.map((o) => (
                      <tr key={o.id} className="border-b border-slate-100">
                        <td className="py-2 font-medium">{o.fertilizerName}</td>
                        <td className="py-2">{o.fertilizerCode ?? '—'}</td>
                        <td className="py-2">{o.packageKilos ?? '—'}</td>
                        <td className="py-2">{formatTZS(o.unitPrice)}</td>
                        <td className="py-2">{o.supplierCompanyName || o.supplierName || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'orders' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListOrdered className="size-5" />
              Bulk orders (all)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading.orders ? (
              <p className="text-slate-500">Loading…</p>
            ) : orders.length === 0 ? (
              <p className="text-slate-500">No orders.</p>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 p-3">
                    <div>
                      <span className="font-mono text-sm">{o.orderReference}</span>
                      <span className="ml-2"><StatusBadge status={o.status} /></span>
                      <span className="ml-2 text-sm text-slate-600">{o.salesPointUserCompany} → {o.supplierUserCompany}</span>
                    </div>
                    <span className="text-xs text-slate-500">{formatDateTime(o.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'orderHistory' && (
        <OrderHistory title="Order history" emptyMessage="No orders match the filters." />
      )}

      {activeTab === 'deliveries' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="size-5" />
              Deliveries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading.deliveries ? (
              <p className="text-slate-500">Loading…</p>
            ) : deliveries.length === 0 ? (
              <p className="text-slate-500">No deliveries.</p>
            ) : (
              <div className="space-y-3">
                {deliveries.map((d) => (
                  <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 p-3">
                    <div>
                      <span className="font-mono text-sm">{d.orderReference}</span>
                      <StatusBadge status={d.status} className="ml-2" />
                      <span className="ml-2 text-xs text-slate-500">{d.trackingRef || '—'}</span>
                    </div>
                    <span className="text-xs text-slate-500">{formatDateTime(d.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
