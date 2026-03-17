import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import * as AuthContext from '../context/AuthContext';

const MockOutlet = () => <div data-testid="protected-content">Protected content</div>;

function renderProtectedRoute(authState = {}) {
  return render(
    <MemoryRouter initialEntries={['/app']}>
      <Routes>
        <Route element={<ProtectedRoute {...authState} />}>
          <Route path="/app" element={<MockOutlet />} />
        </Route>
        <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        <Route path="/unauthorized" element={<div data-testid="unauthorized">Unauthorized</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('shows loading when loading is true', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: true,
    });
    renderProtectedRoute();
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: false,
    });
    renderProtectedRoute();
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders outlet when authenticated and no allowedRoles', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 1, role: 'ROLE_ADMIN' },
      isAuthenticated: true,
      loading: false,
    });
    renderProtectedRoute();
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('renders outlet when user role is in allowedRoles', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 1, role: 'ROLE_ADMIN' },
      isAuthenticated: true,
      loading: false,
    });
    renderProtectedRoute({ allowedRoles: ['ROLE_ADMIN'] });
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('redirects to /unauthorized when user role not in allowedRoles', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 1, role: 'ROLE_SALES_POINT' },
      isAuthenticated: true,
      loading: false,
    });
    renderProtectedRoute({ allowedRoles: ['ROLE_ADMIN'] });
    expect(screen.getByTestId('unauthorized')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });
});
