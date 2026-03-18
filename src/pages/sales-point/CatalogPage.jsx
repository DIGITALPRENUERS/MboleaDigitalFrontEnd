import { useState, useEffect } from 'react';
import * as catalogApi from '../../services/catalogApi';
import { withContext } from '../../utils/errorNotifications';
import { useToast } from '../../components/ui/Toast';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Package } from 'lucide-react';

export default function CatalogPage() {
  const toast = useToast();
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    catalogApi
      .getCatalog()
      .then(setOfferings)
      .catch((err) => {
        const msg = withContext('Load catalog', err);
        setError(msg);
        toast.error(msg);
        setOfferings([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Available fertilizers</h1>
        <p className="text-slate-500">All fertilizers sold by supplier agents, with their prices.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="size-5" />
            Catalog
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-slate-500">Loading…</p>}
          {error && <p className="text-red-600">{error}</p>}
          {!loading && !error && offerings.length === 0 && (
            <p className="text-slate-500">No fertilizers offered yet. Suppliers can add their products and prices.</p>
          )}
          {!loading && !error && offerings.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-2 font-medium text-slate-700">Fertilizer</th>
                    <th className="pb-2 font-medium text-slate-700">Code</th>
                    <th className="pb-2 font-medium text-slate-700">Unit</th>
                    <th className="pb-2 font-medium text-slate-700">Package (kg)</th>
                    <th className="pb-2 font-medium text-slate-700">Unit price (TZS)</th>
                    <th className="pb-2 font-medium text-slate-700">Available stock</th>
                    <th className="pb-2 font-medium text-slate-700">Supplier</th>
                  </tr>
                </thead>
                <tbody>
                  {offerings.map((o) => (
                    <tr key={o.id} className="border-b border-slate-100">
                      <td className="py-3 font-medium text-slate-800">{o.fertilizerName}</td>
                      <td className="py-3 text-slate-600">{o.fertilizerCode ?? '—'}</td>
                      <td className="py-3 text-slate-600">{o.unit ?? '—'}</td>
                      <td className="py-3 text-slate-600">{o.packageKilos != null ? o.packageKilos : '—'}</td>
                      <td className="py-3 font-medium text-slate-800">{o.unitPrice != null ? Number(o.unitPrice).toLocaleString() : '—'}</td>
                      <td className="py-3 text-slate-700">{o.availableStock != null ? Number(o.availableStock).toLocaleString() : '—'}</td>
                      <td className="py-3 text-slate-600">
                        {o.supplierName || o.supplierCompanyName || '—'}
                        {o.supplierCompanyName && o.supplierName && o.supplierCompanyName !== o.supplierName && ` (${o.supplierCompanyName})`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
