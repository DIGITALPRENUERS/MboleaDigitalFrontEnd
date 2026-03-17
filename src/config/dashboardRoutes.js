/** In-app role dashboard paths (no Bank dashboard; bank uses own systems). */
export const ROLE_TO_DASHBOARD_PATH = {
  ROLE_SYSTEM_ADMIN: '/admin',
  ROLE_SALES_POINT: '/sales-point',
  ROLE_SUPPLIER: '/supplier',
  ROLE_LOGISTIC: '/logistics',
  ROLE_TFRA: '/tfra',
};

export function getDashboardPath(role) {
  return ROLE_TO_DASHBOARD_PATH[role] != null ? ROLE_TO_DASHBOARD_PATH[role] : '/';
}

export function getDashboardLabel(role) {
  const labels = {
    ROLE_SYSTEM_ADMIN: 'Admin',
    ROLE_SALES_POINT: 'Sales point',
    ROLE_SUPPLIER: 'Supplier',
    ROLE_LOGISTIC: 'Logistics',
    ROLE_TFRA: 'TFRA',
  };
  return labels[role] != null ? labels[role] : 'Dashboard';
}

/** Role-appropriate nav links for PortalLayout (no Bank). */
export const IN_APP_ROLES = [
  'ROLE_SYSTEM_ADMIN',
  'ROLE_SALES_POINT',
  'ROLE_SUPPLIER',
  'ROLE_LOGISTIC',
  'ROLE_TFRA',
];
