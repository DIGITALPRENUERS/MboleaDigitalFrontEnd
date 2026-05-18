import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLiveOrderStream } from '../hooks/useLiveOrderStream';
import { getDashboardPath, getDashboardLabel, ROLE_TO_DASHBOARD_PATH } from '../config/dashboardRoutes';
import { LogOut, Leaf, LayoutDashboard, Moon, Sun } from 'lucide-react';

const PORTAL_NAV_ROLES = ['ROLE_SYSTEM_ADMIN', 'ROLE_SALES_POINT', 'ROLE_SUPPLIER', 'ROLE_LOGISTIC', 'ROLE_TFRA'];

export default function PortalLayout() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  useLiveOrderStream();
  const location = useLocation();
  const dashboardPath = getDashboardPath(user?.role);
  const dashboardLabel = getDashboardLabel(user?.role);
  const isAdmin = user?.role === 'ROLE_SYSTEM_ADMIN';
  const navItems = isAdmin
    ? PORTAL_NAV_ROLES.map((role) => ({ path: ROLE_TO_DASHBOARD_PATH[role], label: getDashboardLabel(role) }))
    : [{ path: dashboardPath, label: dashboardLabel }];

  return (
    <div className={`min-h-screen transition-colors ${dark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <header className={`sticky top-0 z-30 h-16 shrink-0 border-b px-6 flex items-center backdrop-blur-sm ${
        dark ? 'border-slate-800 bg-slate-950/90' : 'border-slate-200/80 bg-white/95'
      }`}>
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to={dashboardPath} className={`flex items-center gap-2.5 ${dark ? 'text-slate-100' : 'text-slate-800'}`}>
              <Leaf className="size-6 text-emerald-500" />
              <span className={`font-semibold tracking-tight ${dark ? 'text-slate-100' : 'text-slate-800'}`}>Mbolea</span>
            </Link>
            <nav className="flex gap-0.5" aria-label="Main">
              {navItems.map(({ path, label }) => {
                const isActive = path === '/' ? location.pathname === '/' : (location.pathname === path || location.pathname.startsWith(path + '/'));
                return (
                <Link
                  key={path}
                  to={path}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? dark
                        ? 'bg-emerald-900/50 text-emerald-200'
                        : 'bg-emerald-50 text-emerald-700'
                      : dark
                        ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <LayoutDashboard className="size-4" /> {label}
                  </span>
                </Link>
              ); })}
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className={`hidden text-sm sm:inline ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{user?.email}</span>
            <button
              type="button"
              onClick={toggle}
              className={`inline-flex items-center justify-center rounded-xl p-2.5 transition-colors ${
                dark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
              }`}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={dark ? 'Light mode' : 'Dark mode'}
            >
              {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </button>
            <button
              type="button"
              onClick={logout}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                dark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main
        id="main"
        className={`min-h-[calc(100vh-4rem)] ${location.pathname.startsWith('/sales-point') || location.pathname.startsWith('/tfra') || location.pathname.startsWith('/supplier') || location.pathname.startsWith('/logistics') ? 'w-full px-0 py-0' : 'mx-auto max-w-4xl px-6 py-8'}`}
        role="main"
      >
        <Outlet />
      </main>
    </div>
  );
}
