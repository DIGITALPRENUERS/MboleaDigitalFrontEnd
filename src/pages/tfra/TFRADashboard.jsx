import { useState, useEffect, useMemo, Fragment } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import * as tfraPricesApi from '../../services/tfraPricesApi';
import * as tfraReferencePricesApi from '../../services/tfraReferencePricesApi';
import * as fertilizersApi from '../../services/fertilizersApi';
import * as bulkOrdersApi from '../../services/bulkOrdersApi';
import { withContext } from '../../utils/errorNotifications';
import { formatDateTime } from '../../utils/dateTime';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import OrderHistory from '../../components/orders/OrderHistory';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { Package, Trash2, LayoutGrid, AlignJustify, ChevronDown, ChevronRight } from 'lucide-react';
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

function formatTZS(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-TZ') + ' TZS';
}

export default function TFRADashboard() {
  const toast = useToast();
  const [summary, setSummary] = useState(null);
  const [pricesData, setPricesData] = useState(null);
  const [tfraReferencePrices, setTfraReferencePrices] = useState([]);
  const [fertilizers, setFertilizers] = useState([]);
  const [ordersNeedingApproval, setOrdersNeedingApproval] = useState([]);
  const [loading, setLoading] = useState({ summary: true, prices: true, referencePrices: true, fertilizers: true, orders: true });
  const [fertilizerForm, setFertilizerForm] = useState({ name: '', code: '', unit: 'kg', pricePerUnit: '', packageKilos: '' });
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const [approvingOrderId, setApprovingOrderId] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  /** TFRA reference cap by fertilizerType|packageKilos (same as supplier cap). */
  const tfraCapByKey = useMemo(() => {
    const map = new Map();
    (tfraReferencePrices || []).forEach((r) => {
      const type = (r.fertilizerType || '').toUpperCase();
      const pkg = r.packageKilos != null ? String(r.packageKilos) : '';
      if (type && pkg) map.set(`${type}|${pkg}`, r.averagePriceTzs);
    });
    return map;
  }, [tfraReferencePrices]);

  /** Infer package kg for a line when missing: find reference price for this fertilizer type that equals or is closest to unitPrice. */
  const inferPackageKilos = useMemo(() => {
    const refsByType = new Map();
    (tfraReferencePrices || []).forEach((r) => {
      const type = (r.fertilizerType || '').toUpperCase();
      if (!type) return;
      if (!refsByType.has(type)) refsByType.set(type, []);
      refsByType.get(type).push({ packageKilos: r.packageKilos, averagePriceTzs: r.averagePriceTzs });
    });
    return (fertType, unitPrice) => {
      const list = refsByType.get(fertType);
      if (!list?.length || unitPrice == null) return null;
      const num = Number(unitPrice);
      let best = null;
      let bestDiff = Infinity;
      for (const r of list) {
        const cap = r.averagePriceTzs != null ? Number(r.averagePriceTzs) : null;
        if (cap == null) continue;
        const diff = Math.abs(cap - num);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = r.packageKilos != null ? Number(r.packageKilos) : null;
        }
      }
      return best;
    };
  }, [tfraReferencePrices]);

  useEffect(() => {
    tfraPricesApi.getSummary().then(setSummary).catch((err) => { setSummary(null); toast.error(withContext('Load TFRA summary', err)); }).finally(() => setLoading((l) => ({ ...l, summary: false })));
    tfraPricesApi.getPrices().then(setPricesData).catch((err) => { setPricesData(null); toast.error(withContext('Load TFRA prices', err)); }).finally(() => setLoading((l) => ({ ...l, prices: false })));
    tfraReferencePricesApi.getReferencePrices().then(setTfraReferencePrices).catch(() => setTfraReferencePrices([])).finally(() => setLoading((l) => ({ ...l, referencePrices: false })));
    fertilizersApi.listFertilizers().then(setFertilizers).catch((err) => { setFertilizers([]); toast.error(withContext('Load fertilizers', err)); }).finally(() => setLoading((l) => ({ ...l, fertilizers: false })));
    bulkOrdersApi
      .listForTfra()
      .then(setOrdersNeedingApproval)
      .catch((err) => { setOrdersNeedingApproval([]); toast.error(withContext('Load orders for approval', err)); })
      .finally(() => setLoading((l) => ({ ...l, orders: false })));
  }, []);

  const loadFertilizers = () => {
    fertilizersApi.listFertilizers().then(setFertilizers).catch((err) => { setFertilizers([]); toast.error(withContext('Load fertilizers', err)); });
  };

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

  const handleDeleteFertilizer = (id) => {
    setConfirmingDeleteId(id);
  };

  const handleConfirmDeleteFertilizer = async () => {
    const id = confirmingDeleteId;
    if (id == null) return;
    setConfirmingDeleteId(null);
    try {
      await fertilizersApi.deleteFertilizer(id);
      toast.success('Fertilizer deleted.');
      loadFertilizers();
    } catch (err) {
      toast.error(withContext('Delete fertilizer', err));
    }
  };

  const handleTfraDecision = async (orderId, approved) => {
    setApprovingOrderId(orderId);
    try {
      await bulkOrdersApi.tfraApprove(orderId, { approved, comment: null });
      toast.success(approved ? 'Order approved.' : 'Order rejected.');
      const updated = await bulkOrdersApi.listForTfra();
      setOrdersNeedingApproval(updated);
    } catch (err) {
      toast.error(withContext('TFRA approval', err));
    } finally {
      setApprovingOrderId(null);
    }
  };

  const regionCount = summary?.regionCount ?? 0;

  const { districtsCount, wardsCount, salesPointsCount, salesPointsByRegion, coveragePieData } = useMemo(() => {
    const out = {
      districtsCount: 0,
      wardsCount: 0,
      salesPointsCount: 0,
      salesPointsByRegion: [],
      coveragePieData: [],
    };
    if (!pricesData?.regions?.length) return out;
    const byRegion = [];
    pricesData.regions.forEach((r) => {
      let districts = 0;
      let wards = 0;
      let salesPoints = 0;
      (r.districts ?? []).forEach((d) => {
        districts += 1;
        const wList = d.wards ?? [];
        wards += wList.length;
        wList.forEach((w) => {
          salesPoints += (w.sales_points ?? []).length;
        });
      });
      out.districtsCount += districts;
      out.wardsCount += wards;
      out.salesPointsCount += salesPoints;
      byRegion.push({
        name: r.region_name ?? 'Unknown',
        salesPoints,
        districts,
        wards,
      });
    });
    out.salesPointsByRegion = byRegion.sort((a, b) => b.salesPoints - a.salesPoints);
    const regionCount = out.salesPointsByRegion.length;
    const total =
      regionCount + out.districtsCount + out.wardsCount + out.salesPointsCount;
    const items = [
      { name: 'Regions', value: regionCount, fill: '#0d9488' },
      { name: 'Districts', value: out.districtsCount, fill: '#0284c7' },
      { name: 'Wards', value: out.wardsCount, fill: '#ca8a04' },
      { name: 'Sales points', value: out.salesPointsCount, fill: '#7c3aed' },
    ].filter((d) => d.value > 0);
    out.coveragePieData = items.map((d) => ({
      ...d,
      percent: total > 0 ? ((d.value / total) * 100).toFixed(1) : '0',
    }));
    return out;
  }, [pricesData]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarWidth = sidebarCollapsed ? 72 : 224;

  const location = useLocation();
  const pathname = location.pathname;
  const onFertilizersPage = pathname === '/tfra/fertilizers';
  const onOrdersPage = pathname === '/tfra/orders';

  const getWardPricesForOrder = (order) => {
    if (!order?.salesPointRegion || !order?.salesPointDistrict || !order?.salesPointWard || !pricesData?.regions) return null;
    const region = pricesData.regions.find((r) => r.region_name === order.salesPointRegion);
    if (!region) return null;
    const district = (region.districts || []).find((d) => d.district_name === order.salesPointDistrict);
    if (!district) return null;
    const ward = (district.wards || []).find((w) => w.ward_name === order.salesPointWard);
    return ward || null;
  };

  const SIDEBAR_ITEMS = [
    { path: '/tfra', label: 'Dashboard', icon: LayoutGrid },
    { path: '/tfra/orders', label: 'Orders', icon: Package },
    { path: '/tfra/fertilizers', label: 'Fertilizers', icon: Package },
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full">
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
      {/* Collapsible sidebar – bullet-like (AlignJustify) toggle, icon rotates for open/closed */}
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
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">TFRA sections</p>
          )}
          <nav className="space-y-1 text-sm" aria-label="TFRA sections">
            {SIDEBAR_ITEMS.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/tfra'}
                title={sidebarCollapsed ? label : undefined}
                className={({ isActive }) =>
                  `flex w-full items-center rounded-xl px-3 py-2.5 text-left transition-colors ${sidebarCollapsed ? 'justify-center px-0' : 'gap-2'} ${isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'}`
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
        className={`flex-1 min-w-0 overflow-auto p-6 lg:p-8 space-y-8 transition-[margin-left] duration-300 ease-in-out ${sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[224px]'}`}
      >
        {/* Dashboard */}
        {!onFertilizersPage && !onOrdersPage && (
        <section className="space-y-6">
          <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="border border-slate-200 bg-white">
              <CardContent className="py-4">
                <p className="text-sm text-slate-500">Regions</p>
                <p className="text-xl font-semibold text-slate-900 tabular-nums">{loading.summary ? '—' : regionCount}</p>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 bg-white">
              <CardContent className="py-4">
                <p className="text-sm text-slate-500">Districts</p>
                <p className="text-xl font-semibold text-slate-900 tabular-nums">{loading.prices ? '—' : districtsCount}</p>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 bg-white">
              <CardContent className="py-4">
                <p className="text-sm text-slate-500">Wards</p>
                <p className="text-xl font-semibold text-slate-900 tabular-nums">{loading.prices ? '—' : wardsCount}</p>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 bg-white">
              <CardContent className="py-4">
                <p className="text-sm text-slate-500">Sales points</p>
                <p className="text-xl font-semibold text-slate-900 tabular-nums">{loading.prices ? '—' : salesPointsCount}</p>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 bg-white">
              <CardContent className="py-4">
                <p className="text-sm text-slate-500">Fertilizers</p>
                <p className="text-xl font-semibold text-slate-900 tabular-nums">{loading.fertilizers ? '—' : fertilizers.length}</p>
                <NavLink to="/tfra/fertilizers" className="text-sm text-slate-600 hover:underline mt-1 inline-block">Manage</NavLink>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border border-slate-200 bg-white">
              <CardHeader className="border-b border-slate-100 py-3">
                <CardTitle className="text-sm font-semibold text-slate-800">Sales points by region</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-4">
                {loading.prices ? (
                  <div className="h-[260px] rounded bg-slate-100 animate-pulse" />
                ) : salesPointsByRegion.length === 0 ? (
                  <div className="h-[260px] flex items-center justify-center text-slate-500 text-sm">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={salesPointsByRegion} margin={{ top: 8, right: 8, left: 8, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={48} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                      <Bar dataKey="salesPoints" name="Sales points" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card className="border border-slate-200 bg-white">
              <CardHeader className="border-b border-slate-100 py-3">
                <CardTitle className="text-sm font-semibold text-slate-800">Wards by region</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-4">
                {loading.prices ? (
                  <div className="h-[260px] rounded bg-slate-100 animate-pulse" />
                ) : salesPointsByRegion.length === 0 ? (
                  <div className="h-[260px] flex items-center justify-center text-slate-500 text-sm">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={salesPointsByRegion} margin={{ top: 8, right: 8, left: 8, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={48} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                      <Bar dataKey="wards" name="Wards" fill="#0284c7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card className="border border-slate-200 bg-white">
              <CardHeader className="border-b border-slate-100 py-3">
                <CardTitle className="text-sm font-semibold text-slate-800">Coverage overview</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-4">
                {loading.prices ? (
                  <div className="h-[260px] rounded bg-slate-100 animate-pulse" />
                ) : coveragePieData.length === 0 ? (
                  <div className="h-[260px] flex items-center justify-center text-slate-500 text-sm">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart margin={{ top: 12, right: 12, left: 12, bottom: 12 }}>
                      <Pie
                        data={coveragePieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {coveragePieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} stroke="#fff" strokeWidth={1} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                        formatter={(value, name, props) => [
                          `${value} (${props.payload.percent}%)`,
                          name,
                        ]}
                      />
                      <Legend
                        layout="horizontal"
                        align="center"
                        verticalAlign="bottom"
                        formatter={(value, entry) => (
                          <span className="text-slate-600 text-xs">
                            {value}: {entry.payload.value} ({entry.payload.percent}%)
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

        </section>
        )}

        {/* Orders awaiting TFRA approval – dedicated page */}
        {onOrdersPage && (
          <section className="space-y-6">
            <div className="rounded-2xl bg-gradient-to-r from-indigo-700 to-indigo-800 px-6 py-5 shadow-sm">
              <h1 className="text-2xl font-semibold tracking-tight text-white">Orders awaiting TFRA approval</h1>
              <p className="mt-1 text-sm text-indigo-100">
                Review bulk orders from sales points before suppliers and logistics can dispatch.
              </p>
            </div>
            <Card className="border border-slate-200 bg-white">
              <CardHeader className="border-b border-slate-100 py-3">
                <CardTitle className="text-sm font-semibold text-slate-800">Pending orders</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {loading.orders ? (
                  <p className="text-sm text-slate-500">Loading orders…</p>
                ) : ordersNeedingApproval.length === 0 ? (
                  <p className="text-sm text-slate-500">No orders pending TFRA approval.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-600">
                          <th className="pb-2 font-medium">Order</th>
                          <th className="pb-2 font-medium">Sales point</th>
                          <th className="pb-2 font-medium">Supplier</th>
                          <th className="pb-2 font-medium">Status</th>
                          <th className="pb-2 font-medium">Created</th>
                          <th className="pb-2 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordersNeedingApproval.map((o) => {
                          const ward = getWardPricesForOrder(o);
                          return (
                            <Fragment key={o.id}>
                              <tr
                                className="border-b border-slate-100 cursor-pointer hover:bg-slate-50"
                                onClick={() => setExpandedOrderId(expandedOrderId === o.id ? null : o.id)}
                              >
                                <td className="py-3 font-mono text-slate-700">
                                  {o.orderReference}
                                </td>
                                <td className="py-3 text-slate-600">
                                  {o.salesPointUserCompany || o.salesPointUserName || 'Sales point'}
                                  {o.salesPointRegion && (
                                    <div className="text-xs text-slate-400">
                                      {o.salesPointRegion} / {o.salesPointDistrict} / {o.salesPointWard}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 text-slate-600">
                                  {o.supplierUserCompany || o.supplierUserName || 'Supplier'}
                                </td>
                                <td className="py-3 text-slate-600">{o.status}</td>
                                <td className="py-3 text-slate-500 text-xs">
                                  {o.createdAt ? formatDateTime(o.createdAt) : '—'}
                                </td>
                                <td className="py-3">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTfraDecision(o.id, true);
                                      }}
                                      isLoading={approvingOrderId === o.id}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="danger"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTfraDecision(o.id, false);
                                      }}
                                      isLoading={approvingOrderId === o.id}
                                    >
                                      Reject
                                    </Button>
                                    {expandedOrderId === o.id ? (
                                      <ChevronDown className="size-4 text-slate-400" />
                                    ) : (
                                      <ChevronRight className="size-4 text-slate-400" />
                                    )}
                                  </div>
                                </td>
                              </tr>
                              {expandedOrderId === o.id && (
                                <tr className="border-b border-slate-100 bg-slate-50/60">
                                  <td colSpan={6} className="py-4 px-3">
                                    <div className="space-y-3">
                                      <p className="text-sm font-medium text-slate-700">
                                        Price & subsidy breakdown (location-based)
                                      </p>
                                      {!o.lines?.length || !ward ? (
                                        <p className="text-xs text-slate-500">
                                          No detailed subsidy breakdown available for this order/location.
                                        </p>
                                      ) : (
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="text-left text-slate-500">
                                              <th className="pb-2">Product</th>
                                              <th className="pb-2">Qty</th>
                                              <th className="pb-2">Supplier unit price</th>
                                              <th className="pb-2">TFRA cap (per bag)</th>
                                              <th className="pb-2">TFRA farmer price (per bag)</th>
                                              <th className="pb-2">Farmer contribution (per bag)</th>
                                              <th className="pb-2">Subsidy (per bag)</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {o.lines.map((line, idx) => {
                                              const fertType = (line.fertilizerCode || line.fertilizerName || '').toUpperCase();
                                              const linePkgKg = line.packageKilos != null ? Number(line.packageKilos) : inferPackageKilos(fertType, line.unitPrice);
                                              const tfraCap = linePkgKg != null ? tfraCapByKey.get(`${fertType}|${linePkgKg}`) : null;
                                              // Location-based entry for same package (for subsidy/contribution when available)
                                              let tfraEntry = null;
                                              outer: for (const sp of ward.sales_points || []) {
                                                for (const f of sp.fertilizers || []) {
                                                  if ((f.fertilizer_type || '').toUpperCase().includes(fertType)) {
                                                    const packages = f.packages || [];
                                                    const matchPkg = linePkgKg != null
                                                      ? packages.find((p) => Number(p.package_kilos) === linePkgKg)
                                                      : null;
                                                    const pkg = matchPkg ?? packages[0];
                                                    if (pkg) {
                                                      tfraEntry = pkg;
                                                      break outer;
                                                    }
                                                  }
                                                }
                                              }
                                              // Use TFRA reference cap as "TFRA farmer price (per bag)" so it is not different from supplier cap
                                              const tfraPricePerBag = tfraCap != null ? tfraCap : (tfraEntry?.selling_price_tzs ?? null);
                                              const tfraPriceNum = tfraPricePerBag != null ? Number(tfraPricePerBag) : null;
                                              // Scale farmer contribution and subsidy so they add up to the displayed TFRA price (cap)
                                              let farmerContribution = null;
                                              let subsidyAmount = null;
                                              if (tfraPriceNum != null && tfraEntry?.selling_price_tzs != null && Number(tfraEntry.selling_price_tzs) > 0) {
                                                const locTotal = Number(tfraEntry.selling_price_tzs);
                                                const locContrib = tfraEntry.farmers_contribution != null ? Number(tfraEntry.farmers_contribution) : 0;
                                                const locSubsidy = tfraEntry.subsidy != null ? Number(tfraEntry.subsidy) : 0;
                                                const ratioContrib = locTotal > 0 ? locContrib / locTotal : 0;
                                                const ratioSubsidy = locTotal > 0 ? locSubsidy / locTotal : 0;
                                                subsidyAmount = Math.round(tfraPriceNum * ratioSubsidy);
                                                farmerContribution = tfraPriceNum - subsidyAmount;
                                              } else if (tfraPriceNum != null) {
                                                farmerContribution = tfraPriceNum;
                                                subsidyAmount = 0;
                                              }
                                              return (
                                                <tr key={idx} className="border-t border-slate-100">
                                                  <td className="py-2 text-slate-800">
                                                    {line.fertilizerName} {line.fertilizerCode ? `(${line.fertilizerCode})` : ''}
                                                  </td>
                                                  <td className="py-2 text-slate-600">{line.quantity}</td>
                                                  <td className="py-2 text-slate-600">
                                                    {formatTZS(line.unitPrice)}
                                                  </td>
                                                  <td className="py-2 text-slate-600">
                                                    {formatTZS(tfraCap)}
                                                  </td>
                                                  <td className="py-2 text-slate-600">
                                                    {formatTZS(tfraPricePerBag)}
                                                  </td>
                                                  <td className="py-2 text-slate-600">
                                                    {farmerContribution != null ? formatTZS(farmerContribution) : '—'}
                                                  </td>
                                                  <td className="py-2 text-slate-600">
                                                    {subsidyAmount != null ? formatTZS(subsidyAmount) : '—'}
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
            <OrderHistory title="Order history" emptyMessage="No orders match the filters." />
          </section>
        )}

        {/* Fertilizers page */}
        {onFertilizersPage && (
        <section id="fertilizers" className="space-y-4">
          <Card className="overflow-hidden border-slate-200/80 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Package className="size-5 text-slate-600" />
            Fertilizers
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <form
            onSubmit={handleCreateFertilizer}
            className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-4"
          >
            <p className="text-sm font-medium text-slate-700">Add fertilizer</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Input label="Name" value={fertilizerForm.name} onChange={(e) => setFertilizerForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Yara Java" required />
              <Input label="Code" value={fertilizerForm.code} onChange={(e) => setFertilizerForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. YARA_JAVA" required />
              <Input label="Unit" value={fertilizerForm.unit} onChange={(e) => setFertilizerForm((f) => ({ ...f, unit: e.target.value }))} placeholder="kg" />
              <Input label="Price/unit (TZS)" type="number" step="0.01" value={fertilizerForm.pricePerUnit} onChange={(e) => setFertilizerForm((f) => ({ ...f, pricePerUnit: e.target.value }))} placeholder="Optional" />
              <Input label="Package (kg)" type="number" step="1" value={fertilizerForm.packageKilos} onChange={(e) => setFertilizerForm((f) => ({ ...f, packageKilos: e.target.value }))} placeholder="Optional" />
            </div>
            <Button type="submit" disabled={submitting} isLoading={submitting}>
              Add fertilizer
            </Button>
          </form>

          {loading.fertilizers ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : fertilizers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
              <Package className="mx-auto size-10 text-slate-300" />
              <p className="mt-3 font-medium text-slate-600">No fertilizers yet</p>
              <p className="mt-1 text-sm text-slate-500">Add one using the form above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-4 py-3 font-medium text-slate-600">Name</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Code</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Unit</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Price/unit</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Package (kg)</th>
                    <th className="px-4 py-3 font-medium text-slate-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fertilizers.map((f) => (
                    <tr key={f.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{f.name}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">{f.code ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{f.unit ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{formatTZS(f.pricePerUnit)}</td>
                      <td className="px-4 py-3 text-slate-600">{f.packageKilos != null ? f.packageKilos : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="danger" onClick={() => handleDeleteFertilizer(f.id)} className="gap-1.5">
                          <Trash2 className="size-3.5" /> Delete
                        </Button>
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
