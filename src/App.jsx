import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import IdleSessionWatcher from './components/IdleSessionWatcher';
import ProtectedRoute from './components/ProtectedRoute';
import PortalLayout from './layouts/PortalLayout';
import LogisticsLayout from './layouts/LogisticsLayout';
import Login from './pages/auth/Login';
import SignUp from './pages/auth/SignUp';
import DashboardHome from './pages/DashboardHome';
import AdminDashboard from './pages/admin/AdminDashboard';
import LogisticsDashboard from './pages/logistics/LogisticsDashboard';
import LogisticsDeliveriesPage from './pages/logistics/LogisticsDeliveriesPage';
import TFRADashboard from './pages/tfra/TFRADashboard';
import SalesPointDashboard from './pages/sales-point/SalesPointDashboard';
import SupplierOfferingsPage from './pages/supplier/SupplierOfferingsPage';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <IdleSessionWatcher />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardHome />} />
            <Route element={<PortalLayout />}>
              <Route path="admin" element={<ProtectedRoute allowedRoles={['ROLE_SYSTEM_ADMIN']} />}>
                <Route index element={<AdminDashboard />} />
              </Route>
              <Route path="logistics" element={<ProtectedRoute allowedRoles={['ROLE_LOGISTIC']} />}>
                <Route element={<LogisticsLayout />}>
                  <Route index element={<LogisticsDashboard />} />
                  <Route path="deliveries" element={<LogisticsDeliveriesPage />} />
                </Route>
              </Route>
              <Route path="tfra" element={<ProtectedRoute allowedRoles={['ROLE_TFRA']} />}>
                <Route index element={<TFRADashboard />} />
                <Route path="orders" element={<TFRADashboard />} />
                <Route path="fertilizers" element={<TFRADashboard />} />
              </Route>
              <Route path="sales-point" element={<ProtectedRoute allowedRoles={['ROLE_SALES_POINT', 'ROLE_SYSTEM_ADMIN']} />}>
                <Route index element={<SalesPointDashboard />} />
                <Route path="catalog" element={<SalesPointDashboard />} />
                <Route path="orders" element={<SalesPointDashboard />} />
                <Route path="payments" element={<SalesPointDashboard />} />
                <Route path="deliveries" element={<SalesPointDashboard />} />
              </Route>
              <Route path="supplier" element={<ProtectedRoute allowedRoles={['ROLE_SUPPLIER', 'ROLE_SYSTEM_ADMIN']} />}>
                <Route index element={<SupplierOfferingsPage />} />
                <Route path="orders" element={<SupplierOfferingsPage />} />
                <Route path="offerings" element={<SupplierOfferingsPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
