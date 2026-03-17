import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { LogOut, Leaf, FileText } from 'lucide-react';

export default function ApplicationLog() {
  const { user, logout } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If backend adds GET /logs or /audit later, use it here. For now show placeholder.
    setLoading(false);
    setEntries([]);
  }, []);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="size-6 text-emerald-600" />
            <span className="font-semibold text-slate-900">Mbolea</span>
            <span className="text-slate-400">·</span>
            <span className="text-sm text-slate-600">Application log</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{user?.email}</span>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-4xl p-6" role="main">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Application log
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-slate-500">Loading…</p>
            ) : error ? (
              <p className="text-red-600">{error}</p>
            ) : entries.length === 0 ? (
              <p className="text-slate-500">No log entries.</p>
            ) : (
              <ul className="space-y-2 font-mono text-sm">
                {entries.map((entry, i) => (
                  <li key={i} className="rounded border border-slate-100 bg-slate-50 px-3 py-2 text-slate-700">
                    {typeof entry === 'string' ? entry : JSON.stringify(entry)}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
