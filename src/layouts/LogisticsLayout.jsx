import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Truck, LayoutGrid, AlignJustify } from 'lucide-react';

const SIDEBAR_ITEMS = [
  { path: '/logistics', label: 'Dashboard', icon: LayoutGrid },
  { path: '/logistics/deliveries', label: 'Deliveries', icon: Truck },
];

export default function LogisticsLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarWidth = sidebarCollapsed ? 72 : 224;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full">
      <aside
        style={{ width: sidebarWidth }}
        className="hidden md:flex fixed left-0 top-16 h-[calc(100vh-4rem)] z-20 flex-col overflow-hidden transition-[width] duration-300 ease-in-out border-r border-slate-200/80 bg-white/95 shadow-sm"
        aria-expanded={!sidebarCollapsed}
      >
        <button
          type="button"
          onClick={() => setSidebarCollapsed((c) => !c)}
          className={`flex items-center justify-center w-full py-4 text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 transition-colors border-b border-slate-200/80 ${
            !sidebarCollapsed ? 'text-slate-700' : ''
          }`}
          title={sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
          aria-label={sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
        >
          <AlignJustify
            className={`size-6 shrink-0 transition-transform duration-300 ease-in-out ${
              sidebarCollapsed ? '' : '-rotate-90'
            }`}
            strokeWidth={2}
          />
        </button>
        <div className="flex-1 overflow-hidden py-4 px-2">
          {!sidebarCollapsed && (
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Logistics
            </p>
          )}
          <nav className="space-y-1 text-sm" aria-label="Logistics sections">
            {SIDEBAR_ITEMS.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                end
                title={sidebarCollapsed ? label : undefined}
                className={({ isActive }) =>
                  `flex w-full items-center rounded-xl px-3 py-2.5 text-left transition-colors ${
                    sidebarCollapsed ? 'justify-center px-0' : 'gap-2'
                  } ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`
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
        className={`flex-1 min-w-0 min-h-[calc(100vh-4rem)] flex flex-col overflow-hidden transition-[margin-left] duration-300 ease-in-out ${
          sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[224px]'
        }`}
      >
        <Outlet />
      </div>
    </div>
  );
}

