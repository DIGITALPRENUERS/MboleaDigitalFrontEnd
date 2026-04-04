import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as authApi from '../services/authApi';
import { getDashboardPath } from '../config/dashboardRoutes';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setUser(authApi.getStoredUser());
    setLoading(false);
  }, []);

  const login = useCallback(
    async (email, password) => {
      try {
        const { user: u } = await authApi.login(email, password);
        setUser(u);
        const from = location.state?.from?.pathname;
        if (from && from !== '/login') {
          navigate(from, { replace: true });
        } else {
          navigate(getDashboardPath(u?.role), { replace: true });
        }
        return { success: true };
      } catch (err) {
        const msg =
          err.response?.data?.message ??
          err.response?.data?.error ??
          err.message ??
          'Invalid email or password';
        return { success: false, message: msg };
      }
    },
    [navigate, location.state]
  );

  const logout = useCallback(() => {
    authApi.logout(); // notify backend (fire-and-forget)
    authApi.setAuthStorage(null, null);
    setUser(null);
    navigate('/login');
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        isAuthenticated: !!user,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
