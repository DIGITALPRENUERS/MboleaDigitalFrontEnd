import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { withContext } from '../../utils/errorNotifications';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Leaf } from 'lucide-react';

const LOGIN_ROLES = [
  { value: 'SALES_POINT', label: 'Sales point' },
  { value: 'SUPPLIER', label: 'Supplier' },
  { value: 'LOGISTIC', label: 'Logistic' },
  { value: 'TFRA', label: 'TFRA' },
  { value: 'SYSTEM_ADMIN', label: 'Admin' },
];

export default function Login() {
  const [loginRole, setLoginRole] = useState('SALES_POINT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login, logout } = useAuth();
  const toast = useToast();

  const needsCompanyCode = loginRole !== 'SALES_POINT';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password, needsCompanyCode ? companyCode : undefined);
      if (result.success) {
        toast.success('Welcome back');
      } else {
        const msg = result.message || 'Sign in failed.';
        setError(msg);
        toast.error(withContext('Sign in', msg));
      }
    } finally {
      setLoading(false);
    }
  }

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm rounded-2xl bg-white p-10 shadow-sm ring-1 ring-slate-200/60 text-center">
          <Link to="/" className="mb-8 flex items-center justify-center gap-2 text-slate-800">
            <Leaf className="size-9 text-emerald-600" />
            <span className="text-xl font-semibold tracking-tight">Mbolea Digital</span>
          </Link>
          <p className="text-slate-600">You are signed in as <strong className="text-slate-800">{user.email}</strong>.</p>
          <div className="mt-8 flex flex-col gap-3">
            <Link to="/" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors">
              Go to portal
            </Link>
            <button type="button" onClick={logout} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-10 shadow-sm ring-1 ring-slate-200/60">
        <Link to="/" className="mb-8 flex items-center gap-2.5 text-slate-800">
          <Leaf className="size-9 text-emerald-600" />
          <span className="text-xl font-semibold tracking-tight">Mbolea Digital</span>
        </Link>
        <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-slate-500">Select your role and use your email and password to continue.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && (
            <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">I am signing in as</label>
            <select
              value={loginRole}
              onChange={(e) => setLoginRole(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            >
              {LOGIN_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <Input
            label="Email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {needsCompanyCode && (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Company code</label>
              <p className="text-xs text-slate-500">Enter the company code you received during registration.</p>
              <input
                type="text"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                placeholder="Paste or type your company code"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          )}
          <Button type="submit" className="w-full rounded-xl py-3" disabled={loading} isLoading={loading}>
            Sign in
          </Button>
        </form>
        <p className="mt-8 text-center text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
