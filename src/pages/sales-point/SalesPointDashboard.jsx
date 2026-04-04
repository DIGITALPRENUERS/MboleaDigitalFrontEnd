import { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import * as catalogApi from '../../services/catalogApi';
import * as bulkOrdersApi from '../../services/bulkOrdersApi';
import * as paymentsApi from '../../services/paymentsApi';
import * as logisticsApi from '../../services/logisticsApi';
import * as supplierRatingsApi from '../../services/supplierRatingsApi';
import { withContext } from '../../utils/errorNotifications';
import { formatDateTime } from '../../utils/dateTime';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import OrderHistory from '../../components/orders/OrderHistory';
import { useToast } from '../../components/ui/Toast';
import {
  Package,
  ShoppingCart,
  Truck,
  CreditCard,
  Search,
  Plus,
  Minus,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  MapPin,
  LayoutGrid,
  ClipboardList,
  Banknote,
  AlignJustify,
  Trash2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';

function formatTZS(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-TZ') + ' TZS';
}

function generateControlNumber(orderId) {
  const base = String(orderId || '');
  const suffix = Date.now().toString().slice(-5);
  return `991${base}${suffix}`;
}

const SIDEBAR_SECTIONS = [
  { id: 'dashboard', path: '/sales-point', label: 'Dashboard', icon: LayoutGrid },
  { id: 'catalog', path: '/sales-point/catalog', label: 'Catalog', icon: Package },
  { id: 'orders', path: '/sales-point/orders', label: 'My orders', icon: ClipboardList },
  { id: 'payments', path: '/sales-point/payments', label: 'Payments', icon: Banknote },
  { id: 'deliveries', path: '/sales-point/deliveries', label: 'Deliveries', icon: Truck },
];

/** Professional chart palette: teal, emerald, amber, slate, rose */
const CHART_PALETTE = ['#0d9488', '#059669', '#d97706', '#475569', '#e11d48'];
const CHART_GRID_STROKE = '#f1f5f9';
const CHART_AXIS_FILL = '#64748b';
const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  padding: '12px 16px',
  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.08)',
  fontSize: '13px',
};

export default function SalesPointDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const activeSection = pathname === '/sales-point' ? 'dashboard' : (pathname.replace(/^\/sales-point\/?/, '') || 'dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [offerings, setOfferings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierRatingSummaries, setSupplierRatingSummaries] = useState({});
  const [loading, setLoading] = useState({ catalog: true, orders: true, payments: true, deliveries: true, suppliers: true });
  const [catalogSearch, setCatalogSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [orderSupplierId, setOrderSupplierId] = useState(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ reference: '', amount: '', bulkOrderId: '' });
  const [pendingPayment, setPendingPayment] = useState(null);
  const [confirmingDeliveryId, setConfirmingDeliveryId] = useState(null);
  const [confirmingCancelOrderId, setConfirmingCancelOrderId] = useState(null);
  const [cancellationStats, setCancellationStats] = useState(null);
  const [confirmingDeletePaymentId, setConfirmingDeletePaymentId] = useState(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [catalogQuantity, setCatalogQuantity] = useState({});
  const [filterSupplierId, setFilterSupplierId] = useState('');
  const [filterFertilizerType, setFilterFertilizerType] = useState('');
  const [filterKg, setFilterKg] = useState('');

  const locationLabel = [user?.region, user?.district, user?.ward].filter(Boolean).join(' → ') || null;
  const hasLocation = !!(user?.region && user?.district && user?.ward);

  useEffect(() => {
    const ids = [...new Set(offerings.map((o) => o.supplierUserId).filter(Boolean))];
    ids.forEach((id) => {
      supplierRatingsApi
        .getSupplierRatingSummary(id)
        .then((s) => setSupplierRatingSummaries((prev) => ({ ...prev, [id]: s })))
        .catch(() => {});
    });
  }, [offerings]);

  const loadCatalog = () => {
    setLoading((l) => ({ ...l, catalog: true }));
    catalogApi.getCatalog().then(setOfferings).catch((err) => {
      setOfferings([]);
      toast.error(withContext('Load catalog', err));
    }).finally(() => setLoading((l) => ({ ...l, catalog: false })));
  };
  const loadOrders = () => {
    setLoading((l) => ({ ...l, orders: true }));
    bulkOrdersApi.list().then(setOrders).catch((err) => {
      setOrders([]);
      toast.error(withContext('Load orders', err));
    }).finally(() => setLoading((l) => ({ ...l, orders: false })));
  };
  const loadPayments = () => {
    setLoading((l) => ({ ...l, payments: true }));
    paymentsApi.listMy().then(setPayments).catch((err) => {
      setPayments([]);
      toast.error(withContext('Load payments', err));
    }).finally(() => setLoading((l) => ({ ...l, payments: false })));
  };
  const loadDeliveries = () => {
    setLoading((l) => ({ ...l, deliveries: true }));
    logisticsApi.listDeliveries().then(setDeliveries).catch((err) => {
      setDeliveries([]);
      toast.error(withContext('Load deliveries', err));
    }).finally(() => setLoading((l) => ({ ...l, deliveries: false })));
  };
  const loadSuppliers = () => {
    setLoading((l) => ({ ...l, suppliers: true }));
    bulkOrdersApi.listSuppliers().then(setSuppliers).catch((err) => {
      setSuppliers([]);
      toast.error(withContext('Load suppliers', err));
    }).finally(() => setLoading((l) => ({ ...l, suppliers: false })));
  };

  useEffect(() => {
    loadCatalog();
    loadOrders();
    loadPayments();
    loadDeliveries();
    loadSuppliers();
  }, []);

  // Lightweight polling so stock changes reflect soon after payment confirmations (webhook/simulate-confirm).
  useEffect(() => {
    const id = setInterval(() => {
      loadCatalog();
    }, 15000);
    return () => clearInterval(id);
  }, []);

  /** Unique fertilizer types and KGs from catalog (for filter dropdowns). */
  const catalogFertilizerTypes = useMemo(() => {
    const set = new Set();
    offerings.forEach((o) => {
      const name = (o.fertilizerName || o.fertilizerCode || '').trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [offerings]);
  const catalogKgs = useMemo(() => {
    const set = new Set();
    offerings.forEach((o) => {
      if (o.packageKilos != null) set.add(Number(o.packageKilos));
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [offerings]);

  /** Suppliers list for dropdown: from API, or derived from offerings if API empty. */
  const supplierOptions = useMemo(() => {
    if (Array.isArray(suppliers) && suppliers.length > 0) {
      return suppliers.map((s) => ({
        id: String(s.supplierUserId ?? s.userId ?? s.id ?? ''),
        label: s.supplierName ?? s.userName ?? s.companyName ?? s.name ?? `Supplier ${s.supplierUserId ?? s.userId ?? s.id}`,
      })).filter((s) => s.id);
    }
    const fromOfferings = new Map();
    offerings.forEach((o) => {
      const id = o.supplierUserId ?? o.supplierId;
      if (id != null && !fromOfferings.has(id)) {
        fromOfferings.set(String(id), o.supplierCompanyName || o.supplierName || `Supplier ${id}`);
      }
    });
    return Array.from(fromOfferings.entries()).map(([id, label]) => ({ id, label }));
  }, [suppliers, offerings]);

  const filteredOfferings = useMemo(() => {
    let list = offerings;
    if (catalogSearch.trim()) {
      const q = catalogSearch.trim().toLowerCase();
      list = list.filter(
        (o) =>
          (o.fertilizerName || '').toLowerCase().includes(q) ||
          (o.fertilizerCode || '').toLowerCase().includes(q) ||
          (o.supplierName || '').toLowerCase().includes(q) ||
          (o.supplierCompanyName || '').toLowerCase().includes(q)
      );
    }
    if (filterSupplierId) {
      list = list.filter((o) => String(o.supplierUserId ?? o.supplierId) === String(filterSupplierId));
    }
    if (filterFertilizerType) {
      list = list.filter(
        (o) =>
          (o.fertilizerName || '').trim() === filterFertilizerType ||
          (o.fertilizerCode || '').trim() === filterFertilizerType
      );
    }
    if (filterKg !== '') {
      const kg = Number(filterKg);
      list = list.filter((o) => o.packageKilos != null && Number(o.packageKilos) === kg);
    }
    return list;
  }, [offerings, catalogSearch, filterSupplierId, filterFertilizerType, filterKg]);

  /** First click adds the line; a second click on the same product shows a warning (use +/− to change quantity). */
  const addToCart = (offering, quantity = 1) => {
    const alreadyInCart = cart.some((c) => c.offering.id === offering.id);
    if (alreadyInCart) {
      toast.warning(
        'This item is already in your cart. Use + or − on the product card or in the cart below to change quantity.'
      );
      return;
    }
    const q = Math.max(1, Number(quantity));
    setCart((prev) => [...prev, { offering, quantity: q }]);
    setCatalogQuantity((prev) => ({ ...prev, [offering.id]: q }));
    toast.success(`Added ${offering.fertilizerName} (${offering.packageKilos ?? '?'} kg) to cart`);
  };

  const getCatalogQty = (offeringId) => Math.max(1, catalogQuantity[offeringId] ?? 1);
  const setCatalogQty = (offeringId, value) =>
    setCatalogQuantity((prev) => ({ ...prev, [offeringId]: Math.max(1, value) }));

  /** Change quantity for an item already in cart, or adjust catalog-only quantity before first add. */
  const adjustQuantityForOffering = (offering, delta) => {
    const line = cart.find((c) => c.offering.id === offering.id);
    if (line) {
      const q = line.quantity + delta;
      if (q < 1) {
        setCart((prev) => prev.filter((c) => c.offering.id !== offering.id));
        setCatalogQuantity((prev) => ({ ...prev, [offering.id]: 1 }));
        return;
      }
      setCart((prev) =>
        prev.map((c) => (c.offering.id === offering.id ? { ...c, quantity: q } : c))
      );
      setCatalogQuantity((prev) => ({ ...prev, [offering.id]: q }));
    } else {
      setCatalogQty(offering.id, getCatalogQty(offering.id) + delta);
    }
  };

  const adjustQuantityByOfferingId = (offeringId, delta) => {
    const line = cart.find((c) => c.offering.id === offeringId);
    if (line) adjustQuantityForOffering(line.offering, delta);
  };

  const removeFromCart = (offeringId) => {
    setCart((prev) => prev.filter((c) => c.offering.id !== offeringId));
    setCatalogQuantity((prev) => ({ ...prev, [offeringId]: 1 }));
  };

  const cartBySupplier = useMemo(() => {
    const map = new Map();
    cart.forEach(({ offering, quantity }) => {
      const sid = offering.supplierUserId;
      if (!map.has(sid)) {
        const companyLabel = offering.supplierCompanyName || offering.supplierName || `Supplier ${sid ?? ''}`.trim();
        map.set(sid, { supplierUserId: sid, supplierName: companyLabel, lines: [] });
      }
      const entry = map.get(sid);
      entry.lines.push({
        fertilizerId: offering.fertilizerId,
        quantity,
        unitPrice: offering.unitPrice ?? 0,
        offeringId: offering.id,
        supplierOfferingId: offering.id,
        fertilizerName: offering.fertilizerName,
        packageKilos: offering.packageKilos,
      });
    });
    return Array.from(map.values());
  }, [cart]);

  const handlePlaceOrder = async (supplierIdOverride = null) => {
    if (!cartBySupplier.length) {
      toast.error('Add items to cart first.');
      return;
    }

    const sid = supplierIdOverride ?? orderSupplierId;
    let selected = sid ? cartBySupplier.find((c) => c.supplierUserId === sid) : cartBySupplier[0];

    // Fallback: if the chosen supplier has no lines (or was not found), pick the first supplier that has lines
    if (!selected || !selected.lines?.length) {
      selected = cartBySupplier.find((c) => c.lines && c.lines.length > 0) || null;
    }

    if (!selected) {
      toast.error('Add items to cart first.');
      return;
    }

    setPlacingOrder(true);
    try {
      await bulkOrdersApi.create({
        supplierUserId: selected.supplierUserId,
        lines: selected.lines.map((l) => ({
          fertilizerId: l.fertilizerId,
          quantity: l.quantity,
          supplierOfferingId: l.supplierOfferingId ?? l.offeringId,
          unitPrice: l.unitPrice,
          packageKilos: l.packageKilos != null ? l.packageKilos : undefined,
        })),
      });
      toast.success('Order placed successfully.');
      setCart((prev) => prev.filter((c) => c.offering.supplierUserId !== selected.supplierUserId));
      setOrderSupplierId(null);
      loadOrders();
    } catch (err) {
      toast.error(withContext('Place order', err));
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleCancelOrder = (id) => {
    setConfirmingCancelOrderId(id);
    setCancellationStats(null);
    bulkOrdersApi.getCancellationStats().then(setCancellationStats).catch(() => setCancellationStats({ cancellationsToday: 0, limit: 3 }));
  };

  const handleConfirmCancelOrder = async () => {
    const id = confirmingCancelOrderId;
    if (id == null) return;
    setConfirmingCancelOrderId(null);
    try {
      await bulkOrdersApi.cancel(id);
      toast.success('Order cancelled.');
      loadOrders();
    } catch (err) {
      toast.error(withContext('Cancel order', err));
    }
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.bulkOrderId) {
      toast.error('Select an order first.');
      return;
    }
    const amount = Number(paymentForm.amount);
    if (!(amount > 0)) {
      toast.error('Amount is required. Select an order to fill the amount.');
      return;
    }
    const linkedOrder = orders.find((o) => String(o.id) === String(paymentForm.bulkOrderId));
    setPendingPayment({
      amount,
      orderId: linkedOrder?.id ?? null,
      order: linkedOrder || null,
    });
  };

  const confirmCreatePayment = async () => {
    if (!pendingPayment) return;
    const amount = Number(pendingPayment.amount);
    if (!(amount > 0)) {
      toast.error('Amount is required.');
      return;
    }
    setCreatingPayment(true);
    try {
      const created = await paymentsApi.create({
        reference: null,
        amount,
        bulkOrderId: paymentForm.bulkOrderId ? Number(paymentForm.bulkOrderId) : null,
      });
      const ref = created?.reference ? ` Control number: ${created.reference}.` : '';
      toast.success(`Payment created.${ref} Proceed to bank to pay.`);
      setPaymentForm({ reference: '', amount: '', bulkOrderId: '' });
      setPendingPayment(null);
      loadPayments();
    } catch (err) {
      toast.error(withContext('Create payment', err));
    } finally {
      setCreatingPayment(false);
    }
  };

  const handleConfirmDelivery = async (id) => {
    setConfirmingDeliveryId(id);
    try {
      await logisticsApi.confirmDelivery(id);
      toast.success('Delivery confirmed. Thank you!');
      loadDeliveries();
      loadOrders();
    } catch (err) {
      toast.error(withContext('Confirm delivery', err));
    } finally {
      setConfirmingDeliveryId(null);
    }
  };

  const handleDeletePayment = async (id) => {
    setDeletingPaymentId(id);
    try {
      await paymentsApi.deletePayment(id);
      toast.success('Payment removed from history.');
      setConfirmingDeletePaymentId(null);
      loadPayments();
    } catch (err) {
      toast.error(withContext('Delete payment', err));
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const pendingOrders = orders.filter((o) => o.status === 'PENDING');
  const pendingPayments = payments.filter((p) => p.status === 'PENDING');
  const deliveriesForMe = deliveries.filter((d) => d.status === 'IN_TRANSIT' || d.status === 'PENDING');

  /** Order IDs that have at least one payment (any status) – disable cancel & create payment for these. */
  const orderIdsWithPayment = useMemo(
    () => new Set((payments || []).filter((p) => p.bulkOrderId != null).map((p) => String(p.bulkOrderId))),
    [payments]
  );

  /** Orders that are eligible for payment (TFRA approved, not cancelled/delivered, not yet paid). For Create payment dropdown. */
  const ordersNotYetPaid = useMemo(
    () =>
      orders.filter(
        (o) =>
          !orderIdsWithPayment.has(String(o.id)) &&
          o.tfraStatus === 'APPROVED' &&
          o.status !== 'CANCELLED' &&
          o.status !== 'DELIVERED'
      ),
    [orders, orderIdsWithPayment]
  );

  /** Timeline: merge orders, payments, deliveries by createdAt descending. */
  const timelineItems = useMemo(() => {
    const items = [
      ...orders.map((o) => ({ type: 'order', id: `order-${o.id}`, date: o.createdAt, data: o })),
      ...payments.map((p) => ({ type: 'payment', id: `payment-${p.id}`, date: p.createdAt, data: p })),
      ...deliveries.map((d) => ({ type: 'delivery', id: `delivery-${d.id}`, date: d.createdAt, data: d })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
    return items.slice(0, 30);
  }, [orders, payments, deliveries]);

  const totalOrderValue = useMemo(() => {
    return orders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + (o.lines || []).reduce((s, l) => s + (l.unitPrice || 0) * (l.quantity || 0), 0), 0);
  }, [orders]);

  const totalPaid = useMemo(() => {
    return payments.filter((p) => p.status === 'CONFIRMED' || p.status === 'COMPLETED').reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [payments]);

  /** Chart: orders count per day (last 14 days). */
  const ordersByDayData = useMemo(() => {
    const dayCount = {};
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dayCount[key] = { date: key, label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), orders: 0, value: 0 };
    }
    orders.forEach((o) => {
      const key = (o.createdAt || '').slice(0, 10);
      if (dayCount[key]) {
        dayCount[key].orders += 1;
        const orderVal = (o.lines || []).reduce((s, l) => s + (l.unitPrice || 0) * (l.quantity || 0), 0);
        dayCount[key].value += orderVal;
      }
    });
    return Object.values(dayCount);
  }, [orders]);

  /** Chart: order status breakdown (pie). */
  const orderStatusData = useMemo(() => {
    const statusCount = {};
    orders.forEach((o) => {
      const s = o.status || 'UNKNOWN';
      statusCount[s] = (statusCount[s] || 0) + 1;
    });
    return Object.entries(statusCount).map(([name, value], i) => ({ name, value, color: CHART_PALETTE[i % CHART_PALETTE.length] }));
  }, [orders]);

  /** Chart: payment status breakdown (pie). */
  const paymentStatusData = useMemo(() => {
    const statusCount = {};
    payments.forEach((p) => {
      const s = p.status || 'UNKNOWN';
      statusCount[s] = (statusCount[s] || 0) + 1;
    });
    return Object.entries(statusCount).map(([name, value], i) => ({ name, value, color: CHART_PALETTE[i % CHART_PALETTE.length] }));
  }, [payments]);

  /** Chart: delivery status (bar). */
  const deliveryStatusData = useMemo(() => {
    const statusCount = {};
    deliveries.forEach((d) => {
      const s = d.status || 'UNKNOWN';
      statusCount[s] = (statusCount[s] || 0) + 1;
    });
    return Object.entries(statusCount).map(([name, count]) => ({ name, count }));
  }, [deliveries]);

  const sidebarWidth = sidebarCollapsed ? 72 : 224;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full">
      <Modal
        isOpen={confirmingCancelOrderId != null}
        onClose={() => setConfirmingCancelOrderId(null)}
        title="Cancel order"
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-amber-800 font-medium">This will remove the order from the TFRA queue. It cannot be undone.</p>
          <p className="text-slate-600 text-sm">
            You can cancel at most 3 orders per day (before TFRA approval).
            {cancellationStats != null && (
              <span className="block mt-1 text-slate-700">
                You have cancelled <strong>{cancellationStats.cancellationsToday}</strong> of <strong>{cancellationStats.limit}</strong> orders today.
              </span>
            )}
          </p>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setConfirmingCancelOrderId(null)}>Keep order</Button>
          <Button variant="danger" onClick={handleConfirmCancelOrder}>Cancel order</Button>
        </div>
      </Modal>
      {/* Fixed sidebar - does not scroll */}
      <aside
        style={{ width: sidebarWidth, top: '4rem', height: 'calc(100vh - 4rem)' }}
        className="fixed left-0 z-20 flex flex-col overflow-hidden transition-[width] duration-300 ease-in-out border-r border-slate-200/90 bg-gradient-to-b from-slate-50 to-white shadow-sm"
        aria-expanded={!sidebarCollapsed}
      >
        {/* Stacked-lines (align-justify) icon – rotates to indicate sidebar open/closed */}
        <button
          type="button"
          onClick={() => setSidebarCollapsed((c) => !c)}
          className={`flex items-center justify-center w-full py-4 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/80 transition-colors border-b border-slate-200/80 ${!sidebarCollapsed ? 'text-emerald-600' : ''}`}
          title={sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
          aria-label={sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
          aria-expanded={!sidebarCollapsed}
        >
          <AlignJustify
            className={`size-6 shrink-0 transition-transform duration-300 ease-in-out ${sidebarCollapsed ? '' : '-rotate-90'}`}
            strokeWidth={2}
          />
        </button>
        <div className="flex-1 overflow-y-auto py-5 px-2 min-h-0">
          <nav className="space-y-1" aria-label="Services">
            {SIDEBAR_SECTIONS.map(({ id, path, label, icon: Icon }) => (
              <NavLink
                key={id}
                to={path}
                end={path === '/sales-point'}
                title={sidebarCollapsed ? label : undefined}
                className={({ isActive }) =>
                  `flex w-full items-center rounded-xl py-3 text-sm font-medium transition-all duration-150 ${sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} ${isActive ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`
                }
              >
                <Icon className="size-5 shrink-0" strokeWidth={2} />
                {!sidebarCollapsed && <span className="truncate">{label}</span>}
              </NavLink>
            ))}
          </nav>
          {!sidebarCollapsed && (user?.companyName || locationLabel) && (
            <div className="mt-6 mx-2 px-3 py-2.5 rounded-xl bg-slate-100/80 border border-slate-200/80">
              {user?.companyName && (
                <p className="text-xs font-medium text-slate-700 truncate" title={user.companyName}>{user.companyName}</p>
              )}
              {locationLabel && (
                <>
                  <p className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-1">
                    <MapPin className="size-3.5 shrink-0 text-emerald-600" />
                    Location
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600 truncate leading-snug" title={locationLabel}>{locationLabel}</p>
                </>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main content - margin matches fixed sidebar width */}
      <main style={{ marginLeft: sidebarWidth }} className="flex-1 overflow-auto p-6 lg:p-8 min-w-0 transition-[margin-left] duration-300 ease-in-out">
      <div className="space-y-8">
        {/* Dashboard */}
        {activeSection === 'dashboard' && (
          <section id="dashboard" className="space-y-8">
            <div className="rounded-2xl bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-5 shadow-sm">
              <h1 className="text-2xl font-semibold text-white tracking-tight">Sales point dashboard</h1>
              <p className="mt-1 text-sm text-slate-200">
                {user?.companyName ? `${user.companyName} · ` : ''}Overview, charts and recent activity
              </p>
            </div>

            {/* Stats grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-slate-500">Total orders</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{orders.length}</p>
                  <p className="mt-1 text-xs text-slate-400">{pendingOrders.length} pending</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-slate-500">Pending payments</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{pendingPayments.length}</p>
                  <p className="mt-1 text-xs text-slate-400">{payments.length} total</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-slate-500">Deliveries</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{deliveriesForMe.length}</p>
                  <p className="mt-1 text-xs text-slate-400">in transit / pending</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-slate-500">Order value</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-700">{formatTZS(totalOrderValue)}</p>
                  <p className="mt-1 text-xs text-slate-400">Paid: {formatTZS(totalPaid)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts row */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Order value over time (area chart) */}
              <Card className="overflow-hidden border-slate-200/80 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-slate-800">Order value (last 14 days)</CardTitle>
                  <p className="text-sm text-slate-500">Daily order value in TZS</p>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={ordersByDayData} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                        <defs>
                          <linearGradient id="areaValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0d9488" stopOpacity={0.5} />
                            <stop offset="50%" stopColor="#0d9488" stopOpacity={0.15} />
                            <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_AXIS_FILL }} axisLine={{ stroke: CHART_GRID_STROKE }} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: CHART_AXIS_FILL }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                        <Tooltip formatter={(value) => formatTZS(value)} contentStyle={CHART_TOOLTIP_STYLE} cursor={{ stroke: CHART_GRID_STROKE, strokeWidth: 1 }} />
                        <Area type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={2.5} fill="url(#areaValue)" name="Value" strokeLinecap="round" strokeLinejoin="round" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Orders by status (donut) */}
              <Card className="overflow-hidden border-slate-200/80 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-slate-800">Orders by status</CardTitle>
                  <p className="text-sm text-slate-500">Breakdown of order statuses</p>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-52">
                    {orderStatusData.length === 0 ? (
                      <p className="flex h-full items-center justify-center text-slate-500 text-sm">No orders yet</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={orderStatusData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={64}
                            paddingAngle={2}
                            stroke="white"
                            strokeWidth={2}
                          >
                            {orderStatusData.map((entry, i) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => [value, 'Orders']} />
                          <Legend layout="horizontal" align="center" verticalAlign="bottom" iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 11 }} formatter={(value) => <span className="text-slate-600">{value}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Second charts row: payments pie + deliveries bar */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="overflow-hidden border-slate-200/80 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-slate-800">Payments by status</CardTitle>
                  <p className="text-sm text-slate-500">Payment status breakdown</p>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-52">
                    {paymentStatusData.length === 0 ? (
                      <p className="flex h-full items-center justify-center text-slate-500 text-sm">No payments yet</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={paymentStatusData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={64}
                            paddingAngle={2}
                            stroke="white"
                            strokeWidth={2}
                          >
                            {paymentStatusData.map((entry, i) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => [value, 'Payments']} />
                          <Legend layout="horizontal" align="center" verticalAlign="bottom" iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 11 }} formatter={(value) => <span className="text-slate-600">{value}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-slate-200/80 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-slate-800">Deliveries by status</CardTitle>
                  <p className="text-sm text-slate-500">Delivery status count</p>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-52">
                    {deliveryStatusData.length === 0 ? (
                      <p className="flex h-full items-center justify-center text-slate-500 text-sm">No deliveries yet</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={deliveryStatusData} layout="vertical" margin={{ top: 12, right: 20, left: 4, bottom: 4 }}>
                          <defs>
                            <linearGradient id="barDelivery" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#0d9488" stopOpacity={0.9} />
                              <stop offset="100%" stopColor="#059669" stopOpacity={0.9} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11, fill: CHART_AXIS_FILL }} axisLine={{ stroke: CHART_GRID_STROKE }} tickLine={false} />
                          <YAxis type="category" dataKey="name" width={82} tick={{ fontSize: 11, fill: CHART_AXIS_FILL }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => [value, 'Count']} />
                          <Bar dataKey="count" fill="url(#barDelivery)" radius={[0, 6, 6, 0]} name="Count" maxBarSize={28} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Timeline of purchases and activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Recent activity</CardTitle>
                <p className="text-sm text-slate-500">Orders, payments and deliveries</p>
              </CardHeader>
              <CardContent>
                {timelineItems.length === 0 ? (
                  <p className="py-8 text-center text-slate-500">No activity yet. Place orders from the Catalog.</p>
                ) : (
                  <ul className="relative space-y-0 border-l-2 border-slate-200 pl-6">
                    {timelineItems.map((item) => (
                      <li key={item.id} className="relative pb-6 last:pb-0">
                        <span className="absolute -left-[1.125rem] top-0.5 size-4 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            {item.type === 'order' && (
                              <>
                                <p className="font-medium text-slate-800">Order {item.data.orderReference}</p>
                                <p className="text-sm text-slate-500">→ {item.data.supplierUserCompany || item.data.supplierUserName || 'Unknown company'}</p>
                              </>
                            )}
                            {item.type === 'payment' && (
                              <>
                                <p className="font-medium text-slate-800">Payment {item.data.reference}</p>
                                <p className="text-sm text-slate-600">{formatTZS(item.data.amount)}</p>
                              </>
                            )}
                            {item.type === 'delivery' && (
                              <>
                                <p className="font-medium text-slate-800">Delivery {item.data.orderReference}</p>
                                <p className="text-sm text-slate-500">Tracking: {item.data.trackingRef || '—'}</p>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {item.type === 'order' && <StatusBadge status={item.data.status} />}
                            {item.type === 'payment' && <StatusBadge status={item.data.status} />}
                            {item.type === 'delivery' && <StatusBadge status={item.data.status} />}
                            <span className="text-xs text-slate-400">{formatDateTime(item.date)}</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Catalog */}
        {activeSection === 'catalog' && (
          <section id="catalog" className="space-y-8">
            {/* Header */}
            <div className="rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-800 px-6 py-5 shadow-sm">
              <h1 className="text-2xl font-semibold tracking-tight text-white">Catalog</h1>
              <p className="mt-1 text-sm text-emerald-100">Offers from suppliers. Prices follow the TFRA regulator standard, with optional regional discounts set by each supplier.</p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:w-80 sm:ml-auto">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="search"
                  placeholder="Search product or supplier…"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-shadow focus:shadow-sm"
                />
                {catalogSearch && (
                  <button type="button" onClick={() => setCatalogSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 rounded p-0.5" aria-label="Clear search">
                    <X className="size-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Optional filters */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-slate-500">Filters (optional):</span>
              <select
                value={filterSupplierId}
                onChange={(e) => setFilterSupplierId(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 min-w-[10rem]"
                aria-label="Filter by supplier"
              >
                <option value="">All suppliers</option>
                {supplierOptions.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <select
                value={filterFertilizerType}
                onChange={(e) => setFilterFertilizerType(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 min-w-[10rem]"
                aria-label="Filter by fertilizer type"
              >
                <option value="">All types</option>
                {catalogFertilizerTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={filterKg}
                onChange={(e) => setFilterKg(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 min-w-[8rem]"
                aria-label="Filter by package size (kg)"
              >
                <option value="">All sizes</option>
                {catalogKgs.map((k) => (
                  <option key={k} value={k}>{k} kg</option>
                ))}
              </select>
              {(filterSupplierId || filterFertilizerType || filterKg !== '') && (
                <button
                  type="button"
                  onClick={() => { setFilterSupplierId(''); setFilterFertilizerType(''); setFilterKg(''); }}
                  className="text-sm font-medium text-slate-500 hover:text-emerald-600"
                >
                  Clear filters
                </button>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-sm text-slate-600">
                <span className="font-medium text-slate-700">Pricing:</span> Each product shows the <strong>TFRA regulator</strong> (standard) price and your <strong>effective price</strong> after any supplier discount for your region. You can rate suppliers below each product.
                {hasLocation && (
                  <span className="block mt-1 text-xs text-slate-500">Your region: {locationLabel}</span>
                )}
              </p>
            </div>

            {/* Product grid – from supplier offerings API */}
            {loading.catalog ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 animate-pulse">
                    <div className="h-5 w-3/4 rounded bg-slate-200" />
                    <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
                    <div className="mt-4 h-4 w-1/3 rounded bg-slate-100" />
                    <div className="mt-4 h-10 w-full rounded-xl bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : filteredOfferings.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/30 py-16 text-center">
                <Package className="mx-auto size-12 text-slate-300" />
                <p className="mt-4 font-medium text-slate-600">No supplier offerings match your search</p>
                <p className="mt-1 text-sm text-slate-500">Catalog shows offers from existing suppliers. Try a different filter or check back when suppliers add offerings.</p>
                <button type="button" onClick={() => setCatalogSearch('')} className="mt-4 text-sm font-medium text-emerald-600 hover:text-emerald-700">Clear search</button>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredOfferings.map((o) => {
                  const regulator = o.regulatorPriceTzs != null ? Number(o.regulatorPriceTzs) : null;
                  const effective = o.unitPrice != null ? Number(o.unitPrice) : null;
                  const discountPct = o.discountPercentApplied != null ? Number(o.discountPercentApplied) : 0;
                  const overTfra =
                    regulator != null && effective != null && effective > regulator + 0.5;
                  const cartLine = cart.find((c) => c.offering.id === o.id);
                  const qty = cartLine ? cartLine.quantity : getCatalogQty(o.id);
                  const sum = supplierRatingSummaries[o.supplierUserId];
                  const showSupplierRatingUi =
                    filteredOfferings.findIndex((x) => x.supplierUserId === o.supplierUserId) ===
                    filteredOfferings.findIndex((x) => x.id === o.id);
                  return (
                    <article
                      key={o.id}
                      className={`rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-slate-300/80 ${overTfra ? 'ring-2 ring-amber-300/80 border-amber-200' : 'border-slate-200'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center rounded-lg bg-emerald-100 p-2 text-emerald-700">
                              <Package className="size-4" />
                            </span>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{o.packageKilos != null ? `${o.packageKilos} kg` : '—'}</span>
                          </div>
                          <h3 className="mt-3 font-semibold text-slate-900 truncate">{o.fertilizerName}</h3>
                          <p className="mt-0.5 text-xs text-slate-500">{o.fertilizerCode ?? '—'}</p>
                          <p className="mt-2 text-sm text-slate-600">{o.supplierCompanyName || o.supplierName || 'Unknown company'}</p>
                          {showSupplierRatingUi && sum && sum.ratingCount > 0 && (
                            <p className="mt-1 text-xs text-amber-800">
                              Supplier rating: {Number(sum.averageStars).toFixed(1)} ★ ({sum.ratingCount} reviews)
                            </p>
                          )}
                          {showSupplierRatingUi && (
                            <>
                              <p className="mt-2 text-xs text-slate-500">Rate this supplier</p>
                              <div className="mt-1 flex gap-0.5" role="group" aria-label="Rate supplier">
                                {[1, 2, 3, 4, 5].map((st) => (
                                  <button
                                    key={st}
                                    type="button"
                                    className="rounded px-1 text-lg leading-none text-amber-400 hover:text-amber-600"
                                    title={`${st} star${st > 1 ? 's' : ''}`}
                                    onClick={() => {
                                      supplierRatingsApi
                                        .upsertRating({ supplierUserId: o.supplierUserId, stars: st, comment: null })
                                        .then(() => {
                                          toast.success('Thanks — your rating was saved.');
                                          return supplierRatingsApi.getSupplierRatingSummary(o.supplierUserId);
                                        })
                                        .then((s) =>
                                          setSupplierRatingSummaries((prev) => ({ ...prev, [o.supplierUserId]: s }))
                                        )
                                        .catch((err) => toast.error(withContext('Save rating', err)));
                                    }}
                                  >
                                    ★
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xl font-bold text-emerald-700">{formatTZS(o.unitPrice)}</p>
                          <p className="text-xs mt-0.5 text-slate-500">
                            Regulator (TFRA): {regulator != null ? formatTZS(regulator) : '—'}
                            {discountPct > 0 && (
                              <span className="text-emerald-700 font-medium"> · {discountPct}% off in your region</span>
                            )}
                          </p>
                          {overTfra && (
                            <p className="text-xs mt-0.5 text-amber-600 font-medium">Above TFRA regulator — cannot add</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-1">
                          <button
                            type="button"
                            onClick={() => adjustQuantityForOffering(o, -1)}
                            className="flex size-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="size-4" />
                          </button>
                          <span className="min-w-[2rem] text-center text-sm font-medium text-slate-800">{qty}</span>
                          <button
                            type="button"
                            onClick={() => adjustQuantityForOffering(o, 1)}
                            className="flex size-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                            aria-label="Increase quantity"
                          >
                            <Plus className="size-4" />
                          </button>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="mt-4 w-full rounded-xl"
                        onClick={() => addToCart(o, qty)}
                        disabled={overTfra}
                        title={overTfra ? 'Price exceeds TFRA standard maximum for this package' : undefined}
                      >
                        <ShoppingCart className="size-4" /> Add to cart
                      </Button>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Cart summary */}
            {cart.length > 0 && (
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-emerald-900">
                    <ShoppingCart className="size-5" />
                    Your cart
                    <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-medium text-white">{cart.length} items</span>
                  </h2>
                  <button type="button" onClick={() => setCart([])} className="text-sm font-medium text-slate-600 hover:text-slate-800">Clear all</button>
                </div>
                <div className="mt-4 space-y-4">
                  {cartBySupplier.map(({ supplierUserId, supplierName, lines }) => {
                    const total = lines.reduce((s, l) => s + (l.unitPrice || 0) * (l.quantity || 0), 0);
                    return (
                      <div key={supplierUserId} className="rounded-xl border border-emerald-200/80 bg-white p-4">
                        <p className="font-medium text-slate-800">{supplierName}</p>
                        <ul className="mt-3 space-y-3">
                          {lines.map((l) => (
                            <li
                              key={l.offeringId}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm text-slate-600"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-medium text-slate-800">{l.fertilizerName}</span>
                                {l.packageKilos != null && (
                                  <span className="ml-1 text-slate-500">({l.packageKilos} kg)</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5">
                                  <button
                                    type="button"
                                    onClick={() => adjustQuantityByOfferingId(l.offeringId, -1)}
                                    className="flex size-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
                                    aria-label="Decrease quantity in cart"
                                  >
                                    <Minus className="size-4" />
                                  </button>
                                  <span className="min-w-[1.75rem] text-center text-sm font-semibold text-slate-900">{l.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => adjustQuantityByOfferingId(l.offeringId, 1)}
                                    className="flex size-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
                                    aria-label="Increase quantity in cart"
                                  >
                                    <Plus className="size-4" />
                                  </button>
                                </div>
                                <span className="min-w-[5rem] text-right font-medium text-slate-800">
                                  {formatTZS(l.unitPrice != null && l.quantity ? l.unitPrice * l.quantity : null)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeFromCart(l.offeringId)}
                                  className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                                  aria-label="Remove line"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                          <span className="text-sm font-semibold text-slate-700">Subtotal {formatTZS(total)}</span>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setCart((c) => c.filter((x) => x.offering.supplierUserId !== supplierUserId))}>
                              <X className="size-4" /> Remove
                            </Button>
                            <Button size="sm" onClick={() => { setOrderSupplierId(supplierUserId); navigate('/sales-point/orders'); }} disabled={placingOrder}>
                              Place order
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* My orders */}
        {activeSection === 'orders' && (
          <section id="orders" className="space-y-6">
            <div className="rounded-2xl bg-gradient-to-r from-indigo-700 to-indigo-800 px-6 py-5 shadow-sm">
              <h2 className="text-2xl font-semibold tracking-tight text-white">My orders</h2>
              <p className="mt-1 text-sm text-indigo-100">View and manage your orders from suppliers.</p>
            </div>
            {cartBySupplier.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/50">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-amber-900">You have items in your cart.</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => navigate('/sales-point/catalog')}>Back to catalog</Button>
                    {orderSupplierId && (
                      <Button size="sm" onClick={handlePlaceOrder} disabled={placingOrder} isLoading={placingOrder}>
                        Place order now
                      </Button>
                    )}
                    {!orderSupplierId && cartBySupplier.length === 1 && (
                      <Button size="sm" onClick={() => handlePlaceOrder(cartBySupplier[0].supplierUserId)} disabled={placingOrder} isLoading={placingOrder}>
                        Place order to {cartBySupplier[0].supplierName}
                      </Button>
                    )}
                    {!orderSupplierId && cartBySupplier.length > 1 && (
                      <span className="text-sm text-slate-600">Select a supplier from the Catalog cart to place order.</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            {loading.orders ? (
              <p className="text-slate-500">Loading orders…</p>
            ) : orders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">No orders yet. Add items from the catalog and place an order.</CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders
                  .filter((order) => order.status !== 'DELIVERED' && order.status !== 'CANCELLED')
                  .map((order) => (
                  <Card key={order.id}>
                    <CardContent className="p-0">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50"
                        onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-mono text-sm text-slate-500">{order.orderReference}</span>
                          <StatusBadge status={order.status} />
                          {order.tfraStatus && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                              TFRA: {order.tfraStatus}
                            </span>
                          )}
                          <span className="text-sm font-medium text-slate-700">
                            Supplier: {order.supplierUserCompany || order.supplierUserName || 'Unknown company'}
                          </span>
                          {orderIdsWithPayment.has(String(order.id)) && (
                            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">Payment created</span>
                          )}
                          <span className="text-xs text-slate-400">{formatDateTime(order.createdAt)}</span>
                        </div>
                        {expandedOrderId === order.id ? <ChevronDown className="size-5 text-slate-400" /> : <ChevronRight className="size-5 text-slate-400" />}
                      </button>
                      {expandedOrderId === order.id && (
                        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-4">
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
                              {order.lines?.map((line, i) => (
                                <tr key={i} className="border-t border-slate-100">
                                  <td className="py-2 font-medium text-slate-800">{line.fertilizerName} {line.fertilizerCode ? `(${line.fertilizerCode})` : ''}</td>
                                  <td className="py-2 text-slate-600">{line.quantity}</td>
                                  <td className="py-2 text-slate-600">{formatTZS(line.unitPrice)}</td>
                                  <td className="py-2 font-medium">{formatTZS(line.unitPrice != null && line.quantity ? line.unitPrice * line.quantity : null)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="text-sm text-slate-600">
                              Supplier: <strong>{order.supplierUserCompany || order.supplierUserName || '—'}</strong>
                            </span>
                            {orderIdsWithPayment.has(String(order.id)) ? (
                              <span className="text-sm text-slate-500">Cancel and payment actions are disabled after a payment is created for this order.</span>
                            ) : (
                              <>
                                {order.status === 'PENDING' && (
                                  <Button size="sm" variant="danger" onClick={() => handleCancelOrder(order.id)}>Cancel order</Button>
                                )}
                                {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && order.tfraStatus === 'APPROVED' && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                      const total = (order.lines || []).reduce(
                                        (sum, line) => sum + (Number(line.unitPrice || 0) * Number(line.quantity || 0)),
                                        0
                                      );
setPaymentForm((f) => ({
                                    ...f,
                                    bulkOrderId: String(order.id),
                                    amount: total ? String(total) : f.amount,
                                  }));
                                  navigate('/sales-point/payments');
                                    }}
                                  >
                                    Create payment for this order
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            <OrderHistory title="Order history" emptyMessage="No orders match the filters." />
          </section>
        )}

        {/* Payments */}
        {activeSection === 'payments' && (
          <section id="payments" className="space-y-6">
            <div className="rounded-2xl bg-gradient-to-r from-blue-700 to-sky-800 px-6 py-5 shadow-sm">
              <h2 className="text-2xl font-semibold tracking-tight text-white">Payments</h2>
              <p className="mt-1 text-sm text-blue-100">Create and track your payments.</p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Create payment</CardTitle>
                <p className="text-sm text-slate-500">Select an order not yet paid; amount is filled from the order total. Control number is generated by the system.</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreatePayment} className="flex flex-wrap items-end gap-4">
                  <div className="space-y-1 min-w-[260px]">
                    <label className="block text-sm font-medium text-slate-700">Order (not yet paid)</label>
                    <select
                      value={paymentForm.bulkOrderId}
                      onChange={(e) => {
                        const orderId = e.target.value;
                        if (!orderId) {
                          setPaymentForm((f) => ({ ...f, bulkOrderId: '', amount: '' }));
                          return;
                        }
                        const order = ordersNotYetPaid.find((o) => String(o.id) === String(orderId));
                        let total = 0;
                        if (order?.lines?.length) {
                          total = order.lines.reduce(
                            (sum, line) => sum + (Number(line.unitPrice || 0) * Number(line.quantity || 0)),
                            0
                          );
                        }
                        setPaymentForm((f) => ({
                          ...f,
                          bulkOrderId: orderId,
                          amount: total ? String(total) : '',
                        }));
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      required
                    >
                      <option value="">Select order…</option>
                      {ordersNotYetPaid.map((o) => {
                        const total = (o.lines || []).reduce(
                          (sum, line) => sum + (Number(line.unitPrice || 0) * Number(line.quantity || 0)),
                          0
                        );
                        return (
                          <option key={o.id} value={o.id}>
                            {o.orderReference || `Order #${o.id}`} — {formatTZS(total)}
                          </option>
                        );
                      })}
                    </select>
                    {ordersNotYetPaid.length === 0 && (
                      <p className="mt-1 text-xs text-slate-500">No orders available (select TFRA-approved orders that are not yet paid).</p>
                    )}
                  </div>
                  <div className="space-y-1 min-w-[160px]">
                    <label className="block text-sm font-medium text-slate-700">Amount (TZS)</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                      placeholder="Select order first"
                      readOnly={!paymentForm.bulkOrderId}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-70 read-only:bg-slate-100"
                      required
                    />
                    <p className="mt-0.5 text-xs text-slate-500">Filled when you select an order</p>
                  </div>
                  <Button type="submit" disabled={creatingPayment || !paymentForm.bulkOrderId || !paymentForm.amount} isLoading={creatingPayment}>
                    Create payment
                  </Button>
                </form>
              </CardContent>
            </Card>
            {loading.payments ? (
              <p className="text-slate-500">Loading…</p>
            ) : payments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">No payments yet.</CardContent>
              </Card>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600">
                      <th className="pb-2 font-medium">Reference</th>
                      <th className="pb-2 font-medium">Amount</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Order</th>
                      <th className="pb-2 font-medium">Created</th>
                      <th className="pb-2 font-medium w-20 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b border-slate-100">
                        <td className="py-3 font-mono text-slate-800">{p.reference}</td>
                        <td className="py-3 font-medium">{formatTZS(p.amount)}</td>
                        <td className="py-3"><StatusBadge status={p.status} /></td>
                        <td className="py-3 text-slate-600">{p.orderReference ?? (p.bulkOrderId ? `#${p.bulkOrderId}` : '—')}</td>
                        <td className="py-3 text-slate-500">{formatDateTime(p.createdAt)}</td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setConfirmingDeletePaymentId(p.id)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                            title="Remove from history"
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Payment confirmation modal */}
        {pendingPayment && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Confirm payment</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Review amount and order. Control number will be generated by the system after you confirm.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingPayment(null)}
                  className="text-slate-400 hover:text-slate-600"
                  aria-label="Close"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-semibold text-slate-900">
                    {formatTZS(pendingPayment.amount)}
                  </span>
                </div>
                {pendingPayment.order && (
                  <>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Order</span>
                      <span className="font-mono text-xs text-slate-800">
                        {pendingPayment.order.orderReference || `Order #${pendingPayment.order.id}`}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Supplier</span>
                      <span className="text-sm font-medium text-slate-900">
                        {pendingPayment.order.supplierUserCompany || pendingPayment.order.supplierUserName || '—'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setPendingPayment(null)}
                  disabled={creatingPayment}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={confirmCreatePayment} isLoading={creatingPayment}>
                  Confirm payment
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete payment confirmation */}
        {confirmingDeletePaymentId != null && (
          <Modal
            isOpen
            onClose={() => setConfirmingDeletePaymentId(null)}
            title="Remove payment from history"
          >
            <p className="text-sm text-slate-600">
              This will permanently remove this payment from your history. You cannot undo this.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmingDeletePaymentId(null)} disabled={deletingPaymentId != null}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDeletePayment(confirmingDeletePaymentId)}
                isLoading={deletingPaymentId === confirmingDeletePaymentId}
              >
                Delete
              </Button>
            </div>
          </Modal>
        )}

        {/* Deliveries */}
        {activeSection === 'deliveries' && (
          <section id="deliveries" className="space-y-6">
            <div className="rounded-2xl bg-gradient-to-r from-violet-700 to-purple-800 px-6 py-5 shadow-sm">
              <h2 className="text-2xl font-semibold tracking-tight text-white">Deliveries</h2>
              <p className="mt-1 text-sm text-violet-100">Track and confirm your deliveries.</p>
            </div>
            {loading.deliveries ? (
              <p className="text-slate-500">Loading…</p>
            ) : deliveries.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">No deliveries yet.</CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {deliveries.map((d) => (
                  <Card key={d.id}>
                    <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                      <div className="flex flex-wrap items-center gap-4">
                        <div>
                          <p className="font-mono text-sm text-slate-600">{d.orderReference}</p>
                          <p className="text-xs text-slate-400">Tracking: {d.trackingRef || '—'}</p>
                        </div>
                        <StatusBadge status={d.status} />
                        <span className="text-sm text-slate-500">{formatDateTime(d.createdAt)}</span>
                        {d.confirmedByDisplay && <span className="text-xs text-slate-500">{d.confirmedByDisplay}</span>}
                      </div>
                      {(d.status === 'IN_TRANSIT' || d.status === 'PENDING') && (
                        <Button size="sm" onClick={() => handleConfirmDelivery(d.id)} disabled={confirmingDeliveryId === d.id} isLoading={confirmingDeliveryId === d.id}>
                          <CheckCircle2 className="size-4" /> Confirm receipt
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
      </main>
    </div>
  );
}
