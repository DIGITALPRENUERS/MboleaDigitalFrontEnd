import { useEffect, useMemo, useState } from 'react';
import * as logisticsApi from '../../services/logisticsApi';
import { withContext } from '../../utils/errorNotifications';
import { useToast } from '../../components/ui/Toast';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import OrderHistory from '../../components/orders/OrderHistory';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export default function LogisticsDashboard() {
  const toast = useToast();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    logisticsApi
      .listDeliveries()
      .then(setDeliveries)
      .catch((err) => {
        setDeliveries([]);
        toast.error(withContext('Load deliveries', err));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const statsByStatus = useMemo(() => {
    const base = {
      PENDING: 0,
      IN_TRANSIT: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };
    deliveries.forEach((d) => {
      if (d.status && base[d.status] != null) {
        base[d.status] += 1;
      }
    });
    return base;
  }, [deliveries]);

  const chartData = useMemo(
    () => [
      { name: 'Pending', value: statsByStatus.PENDING },
      { name: 'In transit', value: statsByStatus.IN_TRANSIT },
      { name: 'Delivered', value: statsByStatus.DELIVERED },
      { name: 'Cancelled', value: statsByStatus.CANCELLED },
    ],
    [statsByStatus]
  );

  const openClosedChartData = useMemo(() => {
    const open =
      statsByStatus.PENDING +
      statsByStatus.IN_TRANSIT;
    const completed =
      statsByStatus.DELIVERED +
      statsByStatus.CANCELLED;

    const data = [];
    if (open > 0) {
      data.push({ name: 'Open (pending & in transit)', value: open });
    }
    if (completed > 0) {
      data.push({ name: 'Completed (delivered & cancelled)', value: completed });
    }
    return data;
  }, [statsByStatus]);

  const clusterColors = ['#f97316', '#16a34a'];

  const timeSeriesData = useMemo(() => {
    if (!deliveries.length) return [];

    const byDay = new Map();

    deliveries.forEach((d) => {
      if (!d.createdAt) {
        return;
      }
      const date = new Date(d.createdAt);
      if (Number.isNaN(date.getTime())) {
        return;
      }
      const key = date.toISOString().slice(0, 10); // YYYY-MM-DD
      const current = byDay.get(key) ?? { date: key, total: 0, delivered: 0 };
      current.total += 1;
      if (d.status === 'DELIVERED') {
        current.delivered += 1;
      }
      byDay.set(key, current);
    });

    // Sort by date ascending and keep a reasonable window (e.g. last 14 days)
    const sorted = Array.from(byDay.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    const sliceStart = Math.max(0, sorted.length - 14);
    const windowed = sorted.slice(sliceStart);

    // Build cumulative totals and a friendly label for the x-axis
    let runningTotal = 0;
    let runningDelivered = 0;

    return windowed.map((point) => {
      runningTotal += point.total;
      runningDelivered += point.delivered;
      const dateObj = new Date(point.date);
      const label = Number.isNaN(dateObj.getTime())
        ? point.date
        : dateObj.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
          });

      return {
        ...point,
        label,
        cumulativeTotal: runningTotal,
        cumulativeDelivered: runningDelivered,
      };
    });
  }, [deliveries]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-auto p-6 lg:p-8">
      <div className="space-y-6 flex-shrink-0">
        {/* Dashboard header with delivery stats */}
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-sky-50 via-slate-50 to-emerald-50 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                Logistics dashboard
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                Deliveries overview
              </h1>
              <p className="mt-1 max-w-xl text-sm text-slate-600">
                Track delivery creation, status updates and confirmations in one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="min-w-[120px] rounded-xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-sky-100">
                <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
                  Total deliveries
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{deliveries.length}</p>
              </div>
              <div className="min-w-[120px] rounded-xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-emerald-100">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                  Delivered
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {statsByStatus.DELIVERED}
                </p>
              </div>
              <div className="min-w-[120px] rounded-xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-amber-100">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                  In transit
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {statsByStatus.IN_TRANSIT}
                </p>
              </div>
              <div className="min-w-[120px] rounded-xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-slate-200">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-700">
                  Pending
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {statsByStatus.PENDING}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Deliveries by status</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {loading ? (
                <p className="text-slate-500">Loading…</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#0f172a" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Open vs completed deliveries</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {loading ? (
                <p className="text-slate-500">Loading…</p>
              ) : !openClosedChartData.length ? (
                <p className="text-slate-500">No data to cluster yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip />
                    <Pie
                      data={openClosedChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {openClosedChartData.map((entry, index) => (
                        // eslint-disable-next-line react/no-array-index-key
                        <Cell
                          key={`cell-${index}`}
                          fill={clusterColors[index % clusterColors.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Deliveries timeline (cumulative)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {loading ? (
              <p className="text-slate-500">Loading…</p>
            ) : !timeSeriesData.length ? (
              <p className="text-slate-500">No timeline data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="cumulativeTotal"
                    stroke="#0f172a"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Total deliveries (cumulative)"
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulativeDelivered"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Delivered (cumulative)"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <OrderHistory title="Order history" emptyMessage="No orders match the filters." />
      </div>
    </div>
  );
}
