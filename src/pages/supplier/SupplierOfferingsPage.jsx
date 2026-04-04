import { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import * as fertilizersApi from '../../services/fertilizersApi';
import * as supplierOfferingsApi from '../../services/supplierOfferingsApi';
import * as bulkOrdersApi from '../../services/bulkOrdersApi';
import * as logisticsApi from '../../services/logisticsApi';
import * as tfraPricesApi from '../../services/tfraPricesApi';
import { withContext } from '../../utils/errorNotifications';
import { formatDateTime } from '../../utils/dateTime';
import OrderHistory from '../../components/orders/OrderHistory';
import { useToast } from '../../components/ui/Toast';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { ShoppingBag, Plus, LayoutGrid, Package, AlignJustify, ClipboardList, ChevronDown, ChevronRight, MapPin, Mail, Send } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const PACKAGE_KILOS = [5, 10, 25, 50];

function formatTZS(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-TZ') + ' TZS';
}

export default function SupplierOfferingsPage() {
  const toast = useToast();
  const location = useLocation();
  const pathname = location.pathname;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [fertilizers, setFertilizers] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState({ fertilizers: true, offerings: true, orders: true, deliveries: true });
  const [form, setForm] = useState({
    fertilizerId: '',
    packageKilos: '',
    availableStock: '',
    regionDiscounts: [],
  });
  const [locationHierarchy, setLocationHierarchy] = useState({ regions: [] });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editStock, setEditStock] = useState('');
  const [editRegionDiscounts, setEditRegionDiscounts] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [confirmingRemoveId, setConfirmingRemoveId] = useState(null);
  /** When set, we're confirming this order; value is 'own' | 'platform' for which button is loading. */
  const [confirmingOrderId, setConfirmingOrderId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // 'own' | 'platform'
  const [tfraPricesByRegion, setTfraPricesByRegion] = useState({});

  const activeSection = pathname === '/supplier' ? 'dashboard' : pathname === '/supplier/orders' ? 'orders' : 'offerings';
  const sidebarWidth = sidebarCollapsed ? 72 : 224;

  const SIDEBAR_ITEMS = [
    { path: '/supplier', id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { path: '/supplier/orders', id: 'orders', label: 'Orders to me', icon: ClipboardList },
    { path: '/supplier/offerings', id: 'offerings', label: 'My offerings', icon: Package },
  ];

  const load = () => {
    setLoading((l) => ({ ...l, fertilizers: true, offerings: true, orders: true, deliveries: true }));
    fertilizersApi
      .listFertilizers()
      .then(setFertilizers)
      .catch((err) => { setFertilizers([]); toast.error(withContext('Load fertilizers', err)); })
      .finally(() => setLoading((l) => ({ ...l, fertilizers: false })));

    supplierOfferingsApi
      .listMyOfferings()
      .then(setOfferings)
      .catch((err) => { setOfferings([]); toast.error(withContext('Load offerings', err)); })
      .finally(() => setLoading((l) => ({ ...l, offerings: false })));

    bulkOrdersApi
      .list()
      .then(setOrders)
      .catch((err) => { setOrders([]); toast.error(withContext('Load orders', err)); })
      .finally(() => setLoading((l) => ({ ...l, orders: false })));

    logisticsApi
      .listDeliveries()
      .then(setDeliveries)
      .catch((err) => { setDeliveries([]); toast.error(withContext('Load deliveries', err)); })
      .finally(() => setLoading((l) => ({ ...l, deliveries: false })));

    tfraPricesApi.getLocations().then(setLocationHierarchy).catch(() => setLocationHierarchy({ regions: [] }));
  };

  useEffect(() => {
    load();
  }, []);

  const totalOfferings = offerings.length;
  const activeOrders = useMemo(
    () => orders.filter((o) => o.status !== 'CANCELLED' && o.status !== 'DELIVERED'),
    [orders]
  );
  const deliveredOrders = useMemo(
    () => orders.filter((o) => o.status === 'DELIVERED'),
    [orders]
  );

  /** Orders awaiting TFRA approval (PENDING or null). */
  const pendingTfraOrders = useMemo(
    () => orders.filter((o) => o.tfraStatus === 'PENDING' || o.tfraStatus == null),
    [orders]
  );
  /** Orders that have at least one payment (already paid by sales point). */
  const alreadyPaidOrders = useMemo(
    () => orders.filter((o) => o.hasPayment === true),
    [orders]
  );
  /** Orders that are TFRA approved but not yet paid (for "Other" section). */
  const otherOrders = useMemo(
    () => orders.filter((o) => (o.tfraStatus === 'APPROVED' || o.tfraStatus === 'REJECTED') && o.hasPayment !== true),
    [orders]
  );

  /** Load TFRA region prices for a region name (for subsidy display). */
  const loadTfraRegion = (regionName) => {
    if (!regionName || tfraPricesByRegion[regionName]) return;
    tfraPricesApi.getRegion(regionName).then((data) => {
      setTfraPricesByRegion((prev) => ({ ...prev, [regionName]: data }));
    }).catch(() => {});
  };

  /** Get TFRA selling price (after subsidy) for a ward: fertilizer type + optional package_kilos → selling_price_tzs. */
  const getTfraPriceForWard = (regionData, districtName, wardName, fertilizerCodeOrName, packageKilos) => {
    if (!regionData?.districts) return null;
    const district = regionData.districts.find((d) => d.district_name === districtName);
    if (!district?.wards) return null;
    const ward = district.wards.find((w) => w.ward_name === wardName);
    if (!ward?.sales_points?.length) return null;
    const codeUpper = (fertilizerCodeOrName || '').toUpperCase();
    const kg = packageKilos != null && packageKilos !== '' ? Number(packageKilos) : null;
    for (const sp of ward.sales_points) {
      for (const f of sp.fertilizers || []) {
        const typeMatch = f.fertilizer_type && (String(f.fertilizer_type).toUpperCase() === codeUpper || (codeUpper && String(f.fertilizer_type).toUpperCase().includes(codeUpper)));
        if (!typeMatch) continue;
        for (const pkg of f.packages || []) {
          if (kg == null || Number(pkg.package_kilos) === kg) return pkg.selling_price_tzs;
        }
      }
    }
    return null;
  };

  const offeringsByFertilizer = useMemo(() => {
    const map = new Map();
    offerings.forEach((o) => {
      const key = o.fertilizerName || o.fertilizerCode || 'Unknown';
      const current = map.get(key) || 0;
      map.set(key, current + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [offerings]);

  const myOrderIds = useMemo(() => new Set(orders.map((o) => o.id).filter(Boolean)), [orders]);
  const myDeliveries = useMemo(
    () => deliveries.filter((d) => d.bulkOrderId && myOrderIds.has(d.bulkOrderId)),
    [deliveries, myOrderIds]
  );

  const accountCount = useMemo(() => {
    const ids = new Set(orders.map((o) => o.salesPointUserId).filter(Boolean));
    return ids.size;
  }, [orders]);

  const ordersByStatusData = useMemo(() => {
    const map = new Map();
    orders.forEach((o) => {
      const s = o.status || 'Unknown';
      map.set(s, (map.get(s) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [orders]);

  const logisticsByStatusData = useMemo(() => {
    const map = new Map();
    myDeliveries.forEach((d) => {
      const s = d.status || 'Unknown';
      map.set(s, (map.get(s) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [myDeliveries]);

  const deliveriesByOrderId = useMemo(() => {
    const map = new Map();
    myDeliveries.forEach((d) => {
      if (!d.bulkOrderId) return;
      const current = map.get(d.bulkOrderId) || [];
      current.push(d);
      map.set(d.bulkOrderId, current);
    });
    return map;
  }, [myDeliveries]);

  const ordersByAccountData = useMemo(() => {
    const map = new Map();
    orders.forEach((o) => {
      const key = o.salesPointUserCompany || o.salesPointUserName || `Account #${o.salesPointUserId ?? o.id}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name: name.length > 20 ? name.slice(0, 18) + '…' : name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [orders]);

  const regionNameOptions = useMemo(
    () => (locationHierarchy.regions || []).map((r) => r.region_name).filter(Boolean),
    [locationHierarchy]
  );

  const handleAdd = async (e) => {
    e.preventDefault();
    const fertilizerId = Number(form.fertilizerId);
    const packageKilos = form.packageKilos ? Number(form.packageKilos) : null;
    const availableStock = form.availableStock === '' ? null : Number(form.availableStock);
    if (!fertilizerId || !packageKilos || availableStock == null || availableStock < 0) {
      toast.error('Select fertilizer, package size, and available stock (>= 0). Price follows TFRA regulator automatically.');
      return;
    }
    const regionDiscounts = (form.regionDiscounts || [])
      .filter((row) => row.regionName && row.discountPercent !== '' && row.discountPercent != null)
      .map((row) => ({
        regionName: String(row.regionName).trim(),
        discountPercent: Number(row.discountPercent),
      }))
      .filter((row) => !Number.isNaN(row.discountPercent) && row.discountPercent >= 0 && row.discountPercent <= 100);
    setSubmitting(true);
    try {
      await supplierOfferingsApi.createOffering({
        fertilizerId,
        packageKilos,
        availableStock,
        regionDiscounts: regionDiscounts.length ? regionDiscounts : undefined,
      });
      toast.success('Offering added. Unit price is set from the TFRA regulator; regional discounts apply for selected regions.');
      setForm({ fertilizerId: '', packageKilos: '', availableStock: '', regionDiscounts: [] });
      load();
    } catch (err) {
      toast.error(withContext('Add offering', err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id) => {
    const availableStock = editStock === '' ? null : Number(editStock);
    if (availableStock != null && availableStock < 0) return;
    const regionDiscounts = (editRegionDiscounts || [])
      .filter((row) => row.regionName && row.discountPercent !== '' && row.discountPercent != null)
      .map((row) => ({
        regionName: String(row.regionName).trim(),
        discountPercent: Number(row.discountPercent),
      }))
      .filter((row) => !Number.isNaN(row.discountPercent) && row.discountPercent >= 0 && row.discountPercent <= 100);
    setSubmitting(true);
    try {
      await supplierOfferingsApi.updateOffering(id, {
        availableStock,
        regionDiscounts,
      });
      toast.success('Offering updated.');
      setEditingId(null);
      load();
    } catch (err) {
      toast.error(withContext('Update offering', err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    setConfirmingRemoveId(id);
  };

  const handleConfirmRemove = async () => {
    const id = confirmingRemoveId;
    if (id == null) return;
    setConfirmingRemoveId(null);
    try {
      await supplierOfferingsApi.deleteOffering(id);
      toast.success('Offering removed.');
      load();
    } catch (err) {
      toast.error(withContext('Remove offering', err));
    }
  };

  /** Confirm order and use own logistics (supplier delivers themselves). */
  const handleConfirmOwnLogistics = async (order) => {
    if (!order) return;
    setConfirmingOrderId(order.id);
    setConfirmAction('own');
    try {
      await bulkOrdersApi.confirmBySupplier(order.id, { logisticsType: 'OWN' });
      toast.success('Order confirmed. You are handling delivery with your own logistics.');
      load();
    } catch (err) {
      toast.error(withContext('Confirm & use own logistics', err));
    } finally {
      setConfirmingOrderId(null);
      setConfirmAction(null);
    }
  };

  /** Confirm order and request platform logistics (creates delivery for platform to handle). */
  const handleRequestPlatformLogistics = async (order) => {
    if (!order) return;
    setConfirmingOrderId(order.id);
    setConfirmAction('platform');
    try {
      await bulkOrdersApi.confirmBySupplier(order.id, { logisticsType: 'PLATFORM_REQUESTED' });
      toast.success('Order confirmed. Platform logistics request created; a logistic partner can now handle delivery.');
      load();
    } catch (err) {
      toast.error(withContext('Request platform logistics', err));
    } finally {
      setConfirmingOrderId(null);
      setConfirmAction(null);
    }
  };

  const offeredKeys = new Set(offerings.map((o) => `${o.fertilizerId}-${o.packageKilos}`));
  const availableOptions = fertilizers.flatMap((f) =>
    PACKAGE_KILOS.filter((pkg) => !offeredKeys.has(`${f.id}-${pkg}`)).map((pkg) => ({ fertilizer: f, packageKilos: pkg }))
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full">
      <Modal
        isOpen={confirmingRemoveId != null}
        onClose={() => setConfirmingRemoveId(null)}
        title="Remove offering"
        size="sm"
      >
        <p className="text-slate-600 mb-4">Remove this offering from your catalog? Sales points will no longer see it.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmingRemoveId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleConfirmRemove}>Remove</Button>
        </div>
      </Modal>
      {/* Collapsible sidebar */}
      <aside
        style={{ width: sidebarWidth }}
        className="hidden md:flex fixed left-0 top-16 h-[calc(100vh-4rem)] z-20 flex-col overflow-hidden transition-[width] duration-300 ease-in-out border-r border-slate-200/80 bg-white/95 shadow-sm"
        aria-expanded={!sidebarCollapsed}
      >
        <button
          type="button"
          onClick={() => setSidebarCollapsed((c) => !c)}
          className={`flex items-center justify-center w-full py-4 text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 transition-colors border-b border-slate-200/80 ${!sidebarCollapsed ? 'text-slate-700' : ''}`}
          title={sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
          aria-label={sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
        >
          <AlignJustify
            className={`size-6 shrink-0 transition-transform duration-300 ease-in-out ${sidebarCollapsed ? '' : '-rotate-90'}`}
            strokeWidth={2}
          />
        </button>
        <div className="flex-1 overflow-hidden py-4 px-2">
          {!sidebarCollapsed && (
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Supplier sections</p>
          )}
          <nav className="space-y-1 text-sm" aria-label="Supplier sections">
            {SIDEBAR_ITEMS.map(({ path, id, label, icon: Icon }) => (
              <NavLink
                key={id}
                to={path}
                end={path === '/supplier'}
                title={sidebarCollapsed ? label : undefined}
                className={({ isActive }) =>
                  `flex w-full items-center rounded-xl px-3 py-2.5 text-left transition-colors ${
                    sidebarCollapsed ? 'justify-center px-0' : 'gap-2'
                  } ${isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'}`
                }
              >
                <Icon className="size-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{label}</span>}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      <div
        className={`flex-1 min-w-0 min-h-[calc(100vh-4rem)] overflow-auto p-6 lg:p-8 transition-[margin-left] duration-300 ease-in-out ${
          sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[224px]'
        }`}
      >
        {/* Dashboard page: stats + chart only */}
        {activeSection === 'dashboard' && (
          <section className="space-y-6 min-h-full">
            <div className="rounded-2xl bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-5 shadow-sm">
              <h1 className="text-2xl font-semibold tracking-tight text-white">Supplier dashboard</h1>
              <p className="mt-1 text-sm text-slate-200">
                Overview of your fertilizer offerings and orders from sales points.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Card className="overflow-hidden border-slate-200/80 shadow-sm">
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-slate-500">Accounts</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{loading.orders ? '—' : accountCount}</p>
                  <p className="mt-1 text-xs text-slate-400">Unique buyers (sales points)</p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-slate-200/80 shadow-sm">
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-slate-500">Purchases</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{loading.orders ? '—' : orders.length}</p>
                  <p className="mt-1 text-xs text-slate-400">Total orders to you</p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-slate-200/80 shadow-sm">
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-slate-500">Logistics</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{loading.deliveries ? '—' : myDeliveries.length}</p>
                  <p className="mt-1 text-xs text-slate-400">Deliveries (your orders)</p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-slate-200/80 shadow-sm">
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-slate-500">Open orders</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{activeOrders.length}</p>
                  <p className="mt-1 text-xs text-slate-400">Pending or in logistics</p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-slate-200/80 shadow-sm">
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-slate-500">Offerings</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{totalOfferings}</p>
                  <p className="mt-1 text-xs text-slate-400">Products in catalog</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="overflow-hidden border-slate-200/80 shadow-sm">
                <CardHeader className="border-b border-slate-100 py-3">
                  <CardTitle className="text-sm font-semibold text-slate-800">Orders by account</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">Purchases per buyer (top 8)</p>
                </CardHeader>
                <CardContent className="pt-4">
                  {loading.orders ? (
                    <div className="h-56 rounded bg-slate-100 animate-pulse" />
                  ) : ordersByAccountData.length === 0 ? (
                    <div className="h-56 flex items-center justify-center text-sm text-slate-500">No orders yet</div>
                  ) : (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ordersByAccountData} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                          <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} formatter={(v) => [v, 'Orders']} />
                          <Bar dataKey="count" name="Orders" fill="#6366f1" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-slate-200/80 shadow-sm">
                <CardHeader className="border-b border-slate-100 py-3">
                  <CardTitle className="text-sm font-semibold text-slate-800">Purchases by status</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {loading.orders ? (
                    <div className="h-56 rounded bg-slate-100 animate-pulse" />
                  ) : ordersByStatusData.length === 0 ? (
                    <div className="h-56 flex items-center justify-center text-sm text-slate-500">No orders yet</div>
                  ) : (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={ordersByStatusData}
                            dataKey="count"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={36}
                            outerRadius={52}
                            paddingAngle={2}
                          >
                            {ordersByStatusData.map((entry, i) => (
                              <Cell key={entry.name} fill={['#6366f1', '#0d9488', '#ca8a04', '#dc2626', '#64748b'][i % 5]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-slate-200/80 shadow-sm">
                <CardHeader className="border-b border-slate-100 py-3">
                  <CardTitle className="text-sm font-semibold text-slate-800">Logistics by status</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {loading.deliveries ? (
                    <div className="h-56 rounded bg-slate-100 animate-pulse" />
                  ) : logisticsByStatusData.length === 0 ? (
                    <div className="h-56 flex items-center justify-center text-sm text-slate-500">No deliveries yet</div>
                  ) : (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={logisticsByStatusData}
                            dataKey="count"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={36}
                            outerRadius={52}
                            paddingAngle={2}
                            label={({ name, count }) => `${name}: ${count}`}
                          >
                            {logisticsByStatusData.map((entry, i) => (
                              <Cell key={entry.name} fill={['#0284c7', '#0d9488', '#64748b'][i % 3]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="overflow-hidden border-slate-200/80 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Package className="size-5 text-emerald-600" />
                  Offerings by fertilizer
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {offeringsByFertilizer.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-sm text-slate-500">
                    No offerings yet. Add products in My offerings.
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={offeringsByFertilizer} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#f1f5f9' }} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            padding: '12px 16px',
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.08)',
                          }}
                          formatter={(value) => [value, 'Offerings']}
                        />
                        <Bar dataKey="count" name="Offerings" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Orders page: full list of orders to me */}
        {activeSection === 'orders' && (
          <section className="space-y-6 min-h-full">
            <div className="rounded-2xl bg-gradient-to-r from-indigo-700 to-indigo-800 px-6 py-5 shadow-sm">
              <h1 className="text-2xl font-semibold tracking-tight text-white">Orders to me</h1>
              <p className="mt-1 text-sm text-indigo-100">
                Bulk orders from sales points. Confirm and coordinate delivery with logistics.
              </p>
            </div>

            {loading.orders ? (
              <p className="text-slate-500">Loading orders…</p>
            ) : (
              <>
                {/* Section 1: Pending TFRA approval */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-medium text-amber-800">
                      Pending TFRA approval
                    </span>
                    <span className="text-slate-500 font-normal">({pendingTfraOrders.length})</span>
                  </h2>
                  {pendingTfraOrders.length === 0 ? (
                    <p className="text-sm text-slate-500">No orders awaiting TFRA approval.</p>
                  ) : (
                    <div className="space-y-4">
                      {pendingTfraOrders.map((o) => {
                  const orderDeliveries = deliveriesByOrderId.get(o.id) || [];
                  const isPendingTfra = o.tfraStatus === 'PENDING' || o.tfraStatus == null;
                  const destinationLabel = [o.salesPointRegion, o.salesPointDistrict, o.salesPointWard].filter(Boolean).join(' → ') || null;
                  if (expandedOrderId === o.id && o.salesPointRegion) loadTfraRegion(o.salesPointRegion);
                  const regionData = o.salesPointRegion ? tfraPricesByRegion[o.salesPointRegion] : null;
                  return (
                  <Card key={o.id}>
                    <CardContent className="p-0">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50"
                        onClick={() => setExpandedOrderId(expandedOrderId === o.id ? null : o.id)}
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-mono text-sm text-slate-600">{o.orderReference}</span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                            {o.status}
                          </span>
                          {isPendingTfra && (
                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                              Pending TFRA
                            </span>
                          )}
                          <span className="text-sm font-medium text-slate-700">
                            {o.salesPointUserCompany || o.salesPointUserName || 'Sales point'}
                          </span>
                          {destinationLabel && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <MapPin className="size-3.5" /> {destinationLabel}
                            </span>
                          )}
                          {o.distanceKm != null && (
                            <span className="text-xs text-slate-500">{Number(o.distanceKm).toLocaleString()} km</span>
                          )}
                          <span className="text-xs text-slate-400">
                            {o.createdAt ? formatDateTime(o.createdAt) : ''}
                          </span>
                        </div>
                        {expandedOrderId === o.id ? (
                          <ChevronDown className="size-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="size-5 text-slate-400" />
                        )}
                      </button>
                      {expandedOrderId === o.id && (
                        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-4 space-y-4">
                          {/* Destination & contact */}
                          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                            <p className="text-sm font-semibold text-slate-800">Destination (sales point)</p>
                            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                              {o.salesPointRegion && <span><strong>Region:</strong> {o.salesPointRegion}</span>}
                              {o.salesPointDistrict && <span><strong>District:</strong> {o.salesPointDistrict}</span>}
                              {o.salesPointWard && <span><strong>Ward:</strong> {o.salesPointWard}</span>}
                              {o.distanceKm != null && (
                                <span className="text-indigo-700 font-medium">Distance: {Number(o.distanceKm).toLocaleString()} km from your office</span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 pt-1">
                              <Mail className="size-4 text-slate-400" />
                              <span>{o.salesPointUserEmail || '—'}</span>
                              <span>{o.salesPointUserName || ''} {o.salesPointUserCompany ? ` · ${o.salesPointUserCompany}` : ''}</span>
                            </div>
                          </div>

                          {isPendingTfra && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 flex items-start gap-3">
                              <Send className="size-5 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-amber-900">Awaiting TFRA approval</p>
                                <p className="text-xs text-amber-800 mt-1">
                                  This order is with the TFRA regulator for approval. Once approved, you can confirm and choose: use your own logistics or request platform logistics. TFRA reviews orders in the Orders section of their portal.
                                </p>
                              </div>
                            </div>
                          )}

                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-slate-500">
                                <th className="pb-2">Product</th>
                                <th className="pb-2">Qty</th>
                                <th className="pb-2">Unit price (before subsidy)</th>
                                <th className="pb-2">TFRA price (after subsidy)</th>
                                <th className="pb-2">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {o.lines?.map((line, i) => {
                                const tfraVal = regionData && o.salesPointDistrict && o.salesPointWard
                                  ? getTfraPriceForWard(regionData, o.salesPointDistrict, o.salesPointWard, line.fertilizerCode || line.fertilizerName, line.packageKilos ?? null)
                                  : null;
                                return (
                                <tr key={i} className="border-t border-slate-100">
                                  <td className="py-2 font-medium text-slate-800">
                                    {line.fertilizerName} {line.fertilizerCode ? `(${line.fertilizerCode})` : ''}
                                  </td>
                                  <td className="py-2 text-slate-600">{line.quantity}</td>
                                  <td className="py-2 text-slate-600">{formatTZS(line.unitPrice)}</td>
                                  <td className="py-2 text-slate-600">{tfraVal != null ? formatTZS(tfraVal) : '—'}</td>
                                  <td className="py-2 font-medium">
                                    {formatTZS(line.unitPrice != null && line.quantity ? line.unitPrice * line.quantity : null)}
                                  </td>
                                </tr>
                              );})}
                            </tbody>
                          </table>
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-medium text-slate-700">Logistics for this order</p>
                              {o.status === 'PENDING' && !isPendingTfra && (
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleConfirmOwnLogistics(o)}
                                    disabled={confirmingOrderId === o.id}
                                    isLoading={confirmingOrderId === o.id && confirmAction === 'own'}
                                  >
                                    Confirm & use own logistics
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleRequestPlatformLogistics(o)}
                                    disabled={confirmingOrderId === o.id}
                                    isLoading={confirmingOrderId === o.id && confirmAction === 'platform'}
                                  >
                                    Request platform logistics
                                  </Button>
                                </div>
                              )}
                              {o.status !== 'PENDING' && o.logisticsType && (
                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                                  {o.logisticsType === 'OWN' ? 'Own logistics' : 'Platform logistics'}
                                </span>
                              )}
                            </div>
                            {o.status === 'PENDING' && isPendingTfra && orderDeliveries.length === 0 && (
                              <p className="text-xs text-amber-700">Confirm and choose logistics after TFRA approves this order.</p>
                            )}
                            {orderDeliveries.length === 0 && o.status !== 'PENDING' && !isPendingTfra && o.logisticsType === 'OWN' && (
                              <p className="text-xs text-slate-500">You are handling delivery with your own logistics.</p>
                            )}
                            {orderDeliveries.length === 0 && o.status !== 'PENDING' && !isPendingTfra && o.logisticsType === 'PLATFORM_REQUESTED' && (
                              <p className="text-xs text-slate-500">Platform logistics request created; delivery will appear when assigned.</p>
                            )}
                            {orderDeliveries.length > 0 ? (
                              <ul className="space-y-1 text-xs text-slate-600">
                                {orderDeliveries.map((d) => (
                                  <li key={d.id} className="flex items-center justify-between">
                                    <span>
                                      #{d.id} · {d.status}{' '}
                                      {d.trackingRef ? `· Tracking ${d.trackingRef}` : ''}
                                    </span>
                                    {d.confirmedByDisplay && (
                                      <span className="text-slate-400">Confirmed {d.confirmedByDisplay}</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );})}
                    </div>
                  )}
                </div>

                {/* Section 2: Already paid */}
                <div className="space-y-4 pt-6 border-t border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-sm font-medium text-emerald-800">
                      Already paid
                    </span>
                    <span className="text-slate-500 font-normal">({alreadyPaidOrders.length})</span>
                  </h2>
                  {alreadyPaidOrders.length === 0 ? (
                    <p className="text-sm text-slate-500">No orders with payment yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {alreadyPaidOrders.map((o) => {
                  const orderDeliveries = deliveriesByOrderId.get(o.id) || [];
                  const isPendingTfra = o.tfraStatus === 'PENDING' || o.tfraStatus == null;
                  const destinationLabel = [o.salesPointRegion, o.salesPointDistrict, o.salesPointWard].filter(Boolean).join(' → ') || null;
                  if (expandedOrderId === o.id && o.salesPointRegion) loadTfraRegion(o.salesPointRegion);
                  const regionData = o.salesPointRegion ? tfraPricesByRegion[o.salesPointRegion] : null;
                  return (
                  <Card key={o.id}>
                    <CardContent className="p-0">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50"
                        onClick={() => setExpandedOrderId(expandedOrderId === o.id ? null : o.id)}
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-mono text-sm text-slate-600">{o.orderReference}</span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">{o.status}</span>
                          {isPendingTfra && (
                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">Pending TFRA</span>
                          )}
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">Paid</span>
                          <span className="text-sm font-medium text-slate-700">{o.salesPointUserCompany || o.salesPointUserName || 'Sales point'}</span>
                          {destinationLabel && (
                            <span className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="size-3.5" /> {destinationLabel}</span>
                          )}
                          {o.distanceKm != null && <span className="text-xs text-slate-500">{Number(o.distanceKm).toLocaleString()} km</span>}
                          <span className="text-xs text-slate-400">{o.createdAt ? formatDateTime(o.createdAt) : ''}</span>
                        </div>
                        {expandedOrderId === o.id ? <ChevronDown className="size-5 text-slate-400" /> : <ChevronRight className="size-5 text-slate-400" />}
                      </button>
                      {expandedOrderId === o.id && (
                        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-4 space-y-4">
                          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                            <p className="text-sm font-semibold text-slate-800">Destination (sales point)</p>
                            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                              {o.salesPointRegion && <span><strong>Region:</strong> {o.salesPointRegion}</span>}
                              {o.salesPointDistrict && <span><strong>District:</strong> {o.salesPointDistrict}</span>}
                              {o.salesPointWard && <span><strong>Ward:</strong> {o.salesPointWard}</span>}
                              {o.distanceKm != null && <span className="text-indigo-700 font-medium">Distance: {Number(o.distanceKm).toLocaleString()} km</span>}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 pt-1">
                              <Mail className="size-4 text-slate-400" />
                              <span>{o.salesPointUserEmail || '—'}</span>
                              <span>{o.salesPointUserName || ''} {o.salesPointUserCompany ? ` · ${o.salesPointUserCompany}` : ''}</span>
                            </div>
                          </div>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-slate-500">
                                <th className="pb-2">Product</th>
                                <th className="pb-2">Qty</th>
                                <th className="pb-2">Unit price</th>
                                <th className="pb-2">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {o.lines?.map((line, i) => (
                                <tr key={i} className="border-t border-slate-100">
                                  <td className="py-2 font-medium text-slate-800">{line.fertilizerName} {line.fertilizerCode ? `(${line.fertilizerCode})` : ''}</td>
                                  <td className="py-2 text-slate-600">{line.quantity}</td>
                                  <td className="py-2 text-slate-600">{formatTZS(line.unitPrice)}</td>
                                  <td className="py-2 font-medium">{formatTZS(line.unitPrice != null && line.quantity ? line.unitPrice * line.quantity : null)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-medium text-slate-700">Logistics for this order</p>
                              {o.status === 'PENDING' && !isPendingTfra && (
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleConfirmOwnLogistics(o)}
                                    disabled={confirmingOrderId === o.id}
                                    isLoading={confirmingOrderId === o.id && confirmAction === 'own'}
                                  >
                                    Confirm & use own logistics
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleRequestPlatformLogistics(o)}
                                    disabled={confirmingOrderId === o.id}
                                    isLoading={confirmingOrderId === o.id && confirmAction === 'platform'}
                                  >
                                    Request platform logistics
                                  </Button>
                                </div>
                              )}
                              {o.status !== 'PENDING' && o.logisticsType && (
                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                                  {o.logisticsType === 'OWN' ? 'Own logistics' : 'Platform logistics'}
                                </span>
                              )}
                            </div>
                            {orderDeliveries.length === 0 && o.status !== 'PENDING' && o.logisticsType === 'OWN' && (
                              <p className="text-xs text-slate-500">You are handling delivery with your own logistics.</p>
                            )}
                            {orderDeliveries.length === 0 && o.status !== 'PENDING' && o.logisticsType === 'PLATFORM_REQUESTED' && (
                              <p className="text-xs text-slate-500">Platform logistics request created; delivery will appear when assigned.</p>
                            )}
                            {orderDeliveries.length > 0 && (
                              <ul className="space-y-1 text-xs text-slate-600">
                                {orderDeliveries.map((d) => (
                                  <li key={d.id} className="flex items-center justify-between">
                                    <span>#{d.id} · {d.status} {d.trackingRef ? `· ${d.trackingRef}` : ''}</span>
                                    {d.confirmedByDisplay && <span className="text-slate-400">Confirmed {d.confirmedByDisplay}</span>}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  );})}
                    </div>
                  )}
                </div>

                {/* Section 3: Other (TFRA approved, not yet paid) */}
                {otherOrders.length > 0 && (
                  <div className="space-y-4 pt-6 border-t border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <span className="text-slate-600">Other orders (TFRA approved, not yet paid)</span>
                      <span className="text-slate-500 font-normal">({otherOrders.length})</span>
                    </h2>
                    <div className="space-y-4">
                      {otherOrders.map((o) => {
                  const orderDeliveries = deliveriesByOrderId.get(o.id) || [];
                  const isPendingTfra = o.tfraStatus === 'PENDING' || o.tfraStatus == null;
                  const destinationLabel = [o.salesPointRegion, o.salesPointDistrict, o.salesPointWard].filter(Boolean).join(' → ') || null;
                  if (expandedOrderId === o.id && o.salesPointRegion) loadTfraRegion(o.salesPointRegion);
                  const regionData = o.salesPointRegion ? tfraPricesByRegion[o.salesPointRegion] : null;
                  return (
                  <Card key={o.id}>
                    <CardContent className="p-0">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50"
                        onClick={() => setExpandedOrderId(expandedOrderId === o.id ? null : o.id)}
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-mono text-sm text-slate-600">{o.orderReference}</span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">{o.status}</span>
                          {isPendingTfra && (
                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">Pending TFRA</span>
                          )}
                          <span className="text-sm font-medium text-slate-700">{o.salesPointUserCompany || o.salesPointUserName || 'Sales point'}</span>
                          {destinationLabel && (
                            <span className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="size-3.5" /> {destinationLabel}</span>
                          )}
                          {o.distanceKm != null && <span className="text-xs text-slate-500">{Number(o.distanceKm).toLocaleString()} km</span>}
                          <span className="text-xs text-slate-400">{o.createdAt ? formatDateTime(o.createdAt) : ''}</span>
                        </div>
                        {expandedOrderId === o.id ? <ChevronDown className="size-5 text-slate-400" /> : <ChevronRight className="size-5 text-slate-400" />}
                      </button>
                      {expandedOrderId === o.id && (
                        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-4 space-y-4">
                          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                            <p className="text-sm font-semibold text-slate-800">Destination (sales point)</p>
                            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                              {o.salesPointRegion && <span><strong>Region:</strong> {o.salesPointRegion}</span>}
                              {o.salesPointDistrict && <span><strong>District:</strong> {o.salesPointDistrict}</span>}
                              {o.salesPointWard && <span><strong>Ward:</strong> {o.salesPointWard}</span>}
                              {o.distanceKm != null && <span className="text-indigo-700 font-medium">Distance: {Number(o.distanceKm).toLocaleString()} km</span>}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 pt-1">
                              <Mail className="size-4 text-slate-400" />
                              <span>{o.salesPointUserEmail || '—'}</span>
                              <span>{o.salesPointUserName || ''} {o.salesPointUserCompany ? ` · ${o.salesPointUserCompany}` : ''}</span>
                            </div>
                          </div>
                          {isPendingTfra && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 flex items-start gap-3">
                              <Send className="size-5 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-amber-900">Awaiting TFRA approval</p>
                                <p className="text-xs text-amber-800 mt-1">Once approved, you can confirm and choose logistics.</p>
                              </div>
                            </div>
                          )}
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-slate-500">
                                <th className="pb-2">Product</th>
                                <th className="pb-2">Qty</th>
                                <th className="pb-2">Unit price (before subsidy)</th>
                                <th className="pb-2">TFRA price (after subsidy)</th>
                                <th className="pb-2">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {o.lines?.map((line, i) => {
                                const tfraVal = regionData && o.salesPointDistrict && o.salesPointWard
                                  ? getTfraPriceForWard(regionData, o.salesPointDistrict, o.salesPointWard, line.fertilizerCode || line.fertilizerName, line.packageKilos ?? null)
                                  : null;
                                return (
                                <tr key={i} className="border-t border-slate-100">
                                  <td className="py-2 font-medium text-slate-800">{line.fertilizerName} {line.fertilizerCode ? `(${line.fertilizerCode})` : ''}</td>
                                  <td className="py-2 text-slate-600">{line.quantity}</td>
                                  <td className="py-2 text-slate-600">{formatTZS(line.unitPrice)}</td>
                                  <td className="py-2 text-slate-600">{tfraVal != null ? formatTZS(tfraVal) : '—'}</td>
                                  <td className="py-2 font-medium">{formatTZS(line.unitPrice != null && line.quantity ? line.unitPrice * line.quantity : null)}</td>
                                </tr>
                              );})}
                            </tbody>
                          </table>
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-medium text-slate-700">Logistics for this order</p>
                              {o.status === 'PENDING' && !isPendingTfra && (
                                <div className="flex flex-wrap gap-2">
                                  <Button size="sm" variant="secondary" onClick={() => handleConfirmOwnLogistics(o)} disabled={confirmingOrderId === o.id} isLoading={confirmingOrderId === o.id && confirmAction === 'own'}>
                                    Confirm & use own logistics
                                  </Button>
                                  <Button size="sm" onClick={() => handleRequestPlatformLogistics(o)} disabled={confirmingOrderId === o.id} isLoading={confirmingOrderId === o.id && confirmAction === 'platform'}>
                                    Request platform logistics
                                  </Button>
                                </div>
                              )}
                              {o.status !== 'PENDING' && o.logisticsType && (
                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                                  {o.logisticsType === 'OWN' ? 'Own logistics' : 'Platform logistics'}
                                </span>
                              )}
                            </div>
                            {orderDeliveries.length > 0 && (
                              <ul className="space-y-1 text-xs text-slate-600">
                                {orderDeliveries.map((d) => (
                                  <li key={d.id} className="flex items-center justify-between">
                                    <span>#{d.id} · {d.status} {d.trackingRef ? `· Tracking ${d.trackingRef}` : ''}</span>
                                    {d.confirmedByDisplay && <span className="text-slate-400">Confirmed {d.confirmedByDisplay}</span>}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  );})}
                    </div>
                  </div>
                )}
              </>
            )}
            <OrderHistory title="Order history" emptyMessage="No orders match the filters." />
          </section>
        )}

        {/* My offerings page */}
        {activeSection === 'offerings' && (
          <section className="space-y-6 min-h-full">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">My fertilizers</h1>
              <p className="text-slate-500">
                Add fertilizers you sell and set your prices. Sales points will see these in the catalog.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="size-5" />
                  Add fertilizer offering
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-4">
                  Only YARA_JAVA, SA, and CAN. Package sizes: 5, 10, 25, 50 kg. Unit pricing is applied automatically by the platform for each product and package. You may add optional <strong>percentage discounts</strong> for specific regions—sales points in those regions see the reduced price.
                </p>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="min-w-[220px]">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Fertilizer × Package</label>
                      <select
                        value={form.fertilizerId && form.packageKilos ? `${form.fertilizerId}-${form.packageKilos}` : ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (!v) {
                            setForm((f) => ({ ...f, fertilizerId: '', packageKilos: '' }));
                            return;
                          }
                          const [fid, pkg] = v.split('-').map(Number);
                          setForm((f) => ({ ...f, fertilizerId: String(fid), packageKilos: String(pkg) }));
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="">Select…</option>
                        {availableOptions.map(({ fertilizer: f, packageKilos: pkg }) => (
                          <option key={`${f.id}-${pkg}`} value={`${f.id}-${pkg}`}>
                            {f.name} {f.code ? `(${f.code})` : ''} — {pkg} kg
                          </option>
                        ))}
                      </select>
                      {availableOptions.length === 0 && fertilizers.length > 0 && (
                        <p className="mt-1 text-xs text-slate-500">
                          You already offer all fertilizer × package combinations.
                        </p>
                      )}
                    </div>
                    <div className="min-w-[160px]">
                      <Input
                        label="Available stock (bags)"
                        type="number"
                        step="1"
                        min="0"
                        required
                        value={form.availableStock}
                        onChange={(e) => setForm((f) => ({ ...f, availableStock: e.target.value }))}
                        placeholder="e.g. 120"
                        className="min-w-[160px]"
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                    <p className="text-sm font-medium text-slate-800">Optional regional discounts (% for buyers in that region)</p>
                    {(form.regionDiscounts || []).map((row, idx) => (
                      <div key={idx} className="flex flex-wrap items-end gap-2">
                        <div className="min-w-[200px]">
                          <label className="block text-xs text-slate-600 mb-1">Region</label>
                          <select
                            value={row.regionName || ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              setForm((f) => {
                                const next = [...(f.regionDiscounts || [])];
                                next[idx] = { ...next[idx], regionName: v };
                                return { ...f, regionDiscounts: next };
                              });
                            }}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                          >
                            <option value="">Select region…</option>
                            {regionNameOptions.map((rn) => (
                              <option key={rn} value={rn}>{rn}</option>
                            ))}
                          </select>
                        </div>
                        <Input
                          label="Discount %"
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={row.discountPercent}
                          onChange={(e) => {
                            const v = e.target.value;
                            setForm((f) => {
                              const next = [...(f.regionDiscounts || [])];
                              next[idx] = { ...next[idx], discountPercent: v };
                              return { ...f, regionDiscounts: next };
                            });
                          }}
                          className="w-28"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              regionDiscounts: (f.regionDiscounts || []).filter((_, i) => i !== idx),
                            }))
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          regionDiscounts: [...(f.regionDiscounts || []), { regionName: '', discountPercent: '' }],
                        }))
                      }
                    >
                      + Add region discount
                    </Button>
                  </div>
                  <Button
                    type="submit"
                    disabled={!form.fertilizerId || !form.packageKilos || form.availableStock === '' || submitting}
                    isLoading={submitting}
                  >
                    Add offering
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="size-5" />
                  Your offerings ({offerings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading.offerings ? (
                  <p className="text-slate-500">Loading…</p>
                ) : offerings.length === 0 ? (
                  <p className="text-slate-500">
                    You have not added any fertilizers yet. Use the form above to add products.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="pb-2 font-medium text-slate-700">Fertilizer</th>
                          <th className="pb-2 font-medium text-slate-700">Code</th>
                          <th className="pb-2 font-medium text-slate-700">Regulator (TFRA) / bag</th>
                          <th className="pb-2 font-medium text-slate-700">Regional discounts</th>
                          <th className="pb-2 font-medium text-slate-700">Package (kg)</th>
                          <th className="pb-2 font-medium text-slate-700">Stock</th>
                          <th className="pb-2 font-medium text-slate-700">Added</th>
                          <th className="pb-2 font-medium text-slate-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {offerings.map((o) => (
                          <tr key={o.id} className="border-b border-slate-100 align-top">
                            <td className="py-3 font-medium text-slate-800">{o.fertilizerName}</td>
                            <td className="py-3 text-slate-600">{o.fertilizerCode ?? '—'}</td>
                            <td className="py-3 text-slate-800 font-medium">
                              {formatTZS(o.regulatorPriceTzs ?? o.unitPrice)}
                            </td>
                            <td className="py-3 text-slate-600 max-w-[220px]">
                              {editingId === o.id ? (
                                <div className="space-y-2">
                                  {(editRegionDiscounts || []).map((row, idx) => (
                                    <div key={idx} className="flex flex-wrap gap-1 items-center">
                                      <select
                                        value={row.regionName || ''}
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          setEditRegionDiscounts((prev) => {
                                            const next = [...prev];
                                            next[idx] = { ...next[idx], regionName: v };
                                            return next;
                                          });
                                        }}
                                        className="rounded border border-slate-200 px-2 py-1 text-xs max-w-[140px]"
                                      >
                                        <option value="">Region…</option>
                                        {regionNameOptions.map((rn) => (
                                          <option key={rn} value={rn}>{rn}</option>
                                        ))}
                                      </select>
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        value={row.discountPercent}
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          setEditRegionDiscounts((prev) => {
                                            const next = [...prev];
                                            next[idx] = { ...next[idx], discountPercent: v };
                                            return next;
                                          });
                                        }}
                                        className="w-16 rounded border border-slate-200 px-1 py-1 text-xs"
                                      />
                                      <span className="text-xs">%</span>
                                      <button
                                        type="button"
                                        className="text-xs text-rose-600"
                                        onClick={() =>
                                          setEditRegionDiscounts((prev) => prev.filter((_, i) => i !== idx))
                                        }
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    className="text-xs text-emerald-700"
                                    onClick={() =>
                                      setEditRegionDiscounts((prev) => [...prev, { regionName: '', discountPercent: '' }])
                                    }
                                  >
                                    + Add region
                                  </button>
                                </div>
                              ) : o.regionDiscounts?.length ? (
                                <ul className="text-xs space-y-0.5">
                                  {o.regionDiscounts.map((d, i) => (
                                    <li key={i}>{d.regionName}: {d.discountPercent}% off</li>
                                  ))}
                                </ul>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-3 text-slate-600">
                              {o.packageKilos != null ? o.packageKilos : '—'}
                            </td>
                            <td className="py-3 text-slate-700">
                              {editingId === o.id ? (
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  value={editStock}
                                  onChange={(e) => setEditStock(e.target.value)}
                                  className="w-24 rounded border border-slate-200 px-2 py-1 text-sm"
                                />
                              ) : (
                                <span className="font-medium">{o.availableStock != null ? Number(o.availableStock).toLocaleString() : '—'}</span>
                              )}
                            </td>
                            <td className="py-3 text-slate-500 text-xs">
                              {o.createdAt ? formatDateTime(o.createdAt) : '—'}
                            </td>
                            <td className="py-3">
                              {editingId === o.id ? (
                                <div className="flex flex-col gap-1">
                                  <Button size="sm" onClick={() => handleUpdate(o.id)} disabled={submitting}>
                                    Save
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingId(o.id);
                                      setEditStock(String(o.availableStock ?? '0'));
                                      setEditRegionDiscounts(
                                        o.regionDiscounts?.length
                                          ? o.regionDiscounts.map((d) => ({
                                              regionName: d.regionName,
                                              discountPercent: String(d.discountPercent),
                                            }))
                                          : []
                                      );
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => handleDelete(o.id)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}
