import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardPath } from '../config/dashboardRoutes';
import { Leaf, LogOut } from 'lucide-react';

/** Redirects to the current user's role-specific dashboard. */
export default function DashboardHome() {
  const { user, logout } = useAuth();
  const path = getDashboardPath(user?.role);
  if (path === '/') {
    return (
      <div className="min-h-screen bg-slate-100">
        <header className="border-b border-slate-200 bg-white px-4 py-3">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <div className="flex items-center gap-2">
              <Leaf className="size-6 text-emerald-600" />
              <span className="font-semibold text-slate-900">Mbolea</span>
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
        <div className="flex min-h-[50vh] items-center justify-center p-6 text-center text-slate-600">
          <p>No dashboard assigned for your role. Please sign out or contact support.</p>
        </div>
      </div>
    );
  }
  return <Navigate to={path} replace />;
}
