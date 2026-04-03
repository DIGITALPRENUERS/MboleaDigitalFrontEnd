import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
import { AuthProvider } from '../../context/AuthContext';
import { ToastProvider } from '../../components/ui/Toast';

function renderLogin() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('Login', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders sign in form with email and password fields', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: /^Sign in$/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Sign in$/i })).toBeInTheDocument();
  });

  it('renders link to signup', () => {
    renderLogin();
    expect(screen.getByRole('link', { name: /^Sign up$/i })).toHaveAttribute('href', '/signup');
  });

  it('shows validation when submitting empty form', async () => {
    renderLogin();
    const submit = screen.getByRole('button', { name: /^Sign in$/i });
    await userEvent.click(submit);
    const email = screen.getByPlaceholderText('you@example.com');
    expect(email).toBeRequired();
  });

  it('keeps email and password in form when typing', async () => {
    renderLogin();
    const emailInput = screen.getByPlaceholderText('you@example.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    await userEvent.type(emailInput, 'admin@test.com');
    await userEvent.type(passwordInput, 'password123');
    expect(emailInput).toHaveValue('admin@test.com');
    expect(passwordInput).toHaveValue('password123');
  });
});
