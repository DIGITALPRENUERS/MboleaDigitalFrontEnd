import { useState, useEffect, useCallback } from 'react';
import * as bulkOrdersApi from '../../services/bulkOrdersApi';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import StatusBadge from '../common/StatusBadge';
import { formatDateTime } from '../../utils/dateTime';
import { ListOrdered, Filter, X } from 'lucide-react';

const ORDER_STATUSES = ['PENDING', 'CONFIRMED_BY_SUPPLIER', 'IN_LOGISTICS', 'DELIVERED', 'CANCELLED'];
const TFRA_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

export default function OrderHistory({ title = 'Order history', emptyMessage = 'No orders match the filters.' }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [tfraStatusFilter, setTfraStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filtersVisible, setFiltersVisible] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (tfraStatusFilter) params.tfraStatus = tfraStatusFilter;
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    bulkOrdersApi
      .listWithFilters(params)
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [statusFilter, tfraStatusFilter, fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  const clearFilters = () => {
    setStatusFilter('');
    setTfraStatusFilter('');
    setFromDate('');
    setToDate('');
  };

  const hasActiveFilters = statusFilter || tfraStatusFilter || fromDate || toDate;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <ListOrdered className="size-5" />
          {title}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setFiltersVisible((v) => !v)}
          >
            <Filter className="size-4" />
            {filtersVisible ? 'Hide filters' : 'Show filters'}
          </Button>
          {hasActiveFilters && (
            <Button size="sm" variant="ghost" onClick={clearFilters}>
              <X className="size-4" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {filtersVisible && (
          <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <div className="min-w-[140px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="">All</option>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[140px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">TFRA status</label>
              <select
                value={tfraStatusFilter}
                onChange={(e) => setTfraStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="">All</option>
                {TFRA_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[140px]">
              <Input
                label="From date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="min-w-[140px]">
              <Input
                label="To date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="text-sm"
              />
            </div>
            <Button size="sm" onClick={load} disabled={loading}>
              Apply
            </Button>
          </div>
        )}

        {loading ? (
          <p className="text-slate-500">Loading orders…</p>
        ) : orders.length === 0 ? (
          <p className="text-slate-500 py-6 text-center">{emptyMessage}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="pb-2 font-medium">Order</th>
                  <th className="pb-2 font-medium">Sales point</th>
                  <th className="pb-2 font-medium">Supplier</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">TFRA</th>
                  <th className="pb-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-slate-100">
                    <td className="py-3 font-mono text-slate-800">{o.orderReference}</td>
                    <td className="py-3 text-slate-600">
                      {o.salesPointUserCompany || o.salesPointUserName || '—'}
                    </td>
                    <td className="py-3 text-slate-600">
                      {o.supplierUserCompany || o.supplierUserName || '—'}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="py-3 text-slate-600">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                        {o.tfraStatus ?? '—'}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500 text-xs">
                      {formatDateTime(o.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
