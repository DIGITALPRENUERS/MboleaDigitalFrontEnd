import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as authApi from '../../services/authApi';
import * as tfraPricesApi from '../../services/tfraPricesApi';
import { useToast } from '../../components/ui/Toast';
import { withContext } from '../../utils/errorNotifications';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Leaf, MapPin, ChevronLeft, Copy, CheckCircle2, RefreshCw } from 'lucide-react';

function generateSixCharCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const REGISTERABLE_ROLES = [
  { value: 'SALES_POINT', label: 'Sales point / Warehouse' },
  { value: 'SUPPLIER', label: 'Supplier' },
  { value: 'LOGISTIC', label: 'Logistic' },
  { value: 'TFRA', label: 'TFRA' },
];

const STEP_ACCOUNT = 1;
const STEP_LOCATION = 2;
const STEP_COPY_CODE = 3;

export default function SignUp() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(STEP_ACCOUNT);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'SALES_POINT',
    companyName: '',
    companyCode: '',
    region: '',
    district: '',
    ward: '',
    salesPointName: '',
  });
  const [locations, setLocations] = useState({ regions: [] });
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registeredCompanyCode, setRegisteredCompanyCode] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const isSalesPoint = form.role === 'SALES_POINT';

  useEffect(() => {
    if (step === STEP_LOCATION && isSalesPoint) {
      setLocationsLoading(true);
      tfraPricesApi.getLocations().then((data) => setLocations(data)).catch((err) => {
      setLocations({ regions: [] });
      toast.error(withContext('Load locations for registration', err));
    }).finally(() => setLocationsLoading(false));
    }
  }, [step, isSalesPoint]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'region') setForm((prev) => ({ ...prev, district: '', ward: '' }));
    if (name === 'district') setForm((prev) => ({ ...prev, ward: '' }));
  };

  const selectedRegion = locations.regions?.find((r) => r.region_name === form.region);
  const districts = selectedRegion?.districts ?? [];
  const selectedDistrict = districts.find((d) => d.district_name === form.district);
  const wards = selectedDistrict?.wards ?? [];
  const selectedWard = wards.find((w) => w.ward_name === form.ward);
  const salesPoints = selectedWard?.sales_points ?? [];

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (step === STEP_ACCOUNT && isSalesPoint) {
      setStep(STEP_LOCATION);
      return;
    }
    if (step === STEP_LOCATION && isSalesPoint && (!form.region || !form.district || !form.ward || !form.salesPointName)) {
      setError('Please select Region, District, Ward and Sales point.');
      return;
    }
    setLoading(true);
    try {
      // Sales point does not use company code. Other roles get an auto-generated code if they left it blank.
      const companyCodeValue = isSalesPoint
        ? null
        : (form.companyCode.trim() || generateSixCharCode());
      await authApi.register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        companyName: isSalesPoint ? form.salesPointName : form.companyName.trim() || null,
        companyCode: companyCodeValue,
        region: isSalesPoint ? (form.region || null) : null,
        district: isSalesPoint ? (form.district || null) : null,
        ward: isSalesPoint ? (form.ward || null) : null,
      });
      if (companyCodeValue) {
        setRegisteredCompanyCode(companyCodeValue);
        setStep(STEP_COPY_CODE);
        toast.success('Account created. Copy your company code below before signing in.');
      } else {
        toast.success('Account created. Sign in with your email and password.');
        navigate('/login', { replace: true, state: { message: 'Account created. Sign in.' } });
      }
    } catch (err) {
      const msg =
        err.response?.data?.error ??
        err.response?.data?.message ??
        err.message ??
        'Registration failed';
      setError(msg);
      toast.error(withContext('Registration', msg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-sm ring-1 ring-slate-200/60">
        <Link to="/" className="mb-8 flex items-center gap-2.5 text-slate-800">
          <Leaf className="size-9 text-emerald-600" />
          <span className="text-xl font-semibold tracking-tight">Mbolea Digital</span>
        </Link>

        {step === STEP_ACCOUNT && (
          <>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Create account</h1>
            <p className="mt-2 text-sm text-slate-500">Register as a sales point, supplier, logistic, or TFRA user.</p>
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {error && (
                <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <Input label="Full name" name="name" type="text" required autoComplete="name" placeholder="Your name" value={form.name} onChange={handleChange} />
              <Input label="Email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" value={form.email} onChange={handleChange} />
              <Input label="Password (min 8 characters)" name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="••••••••" value={form.password} onChange={handleChange} />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Role</label>
                <select name="role" value={form.role} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20">
                  {REGISTERABLE_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              {!isSalesPoint && (
                <>
                  <Input label="Company (optional)" name="companyName" type="text" autoComplete="organization" placeholder="Organization name" value={form.companyName} onChange={handleChange} />
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">Company code</label>
                    <p className="text-xs text-slate-500">Leave blank to auto-generate a 6-character code, or use Generate.</p>
                    <div className="flex gap-2">
                      <input
                        name="companyCode"
                        type="text"
                        placeholder="e.g. ABC123 or generate"
                        value={form.companyCode}
                        onChange={(e) => handleChange({ target: { name: 'companyCode', value: e.target.value } })}
                        className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="shrink-0"
                        onClick={() => setForm((prev) => ({ ...prev, companyCode: generateSixCharCode() }))}
                        title="Generate 6-character code"
                      >
                        <RefreshCw className="size-4" />
                        Generate
                      </Button>
                    </div>
                  </div>
                </>
              )}
              <Button type="submit" className="w-full rounded-xl py-3" disabled={loading} isLoading={loading}>
                {isSalesPoint ? 'Continue' : 'Sign up'}
              </Button>
            </form>
          </>
        )}

        {step === STEP_LOCATION && isSalesPoint && (
          <>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Sales point location</h1>
            <p className="mt-2 text-sm text-slate-500">
              Select your location from the TFRA reference data (region, district, ward, sales point). Prices will be based on this location.
            </p>
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {error && (
                <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <button type="button" onClick={() => setStep(STEP_ACCOUNT)} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
                <ChevronLeft className="size-4" /> Back
              </button>
              {locationsLoading ? (
                <p className="text-slate-500">Loading locations…</p>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <MapPin className="size-4 text-emerald-600" /> Region
                    </label>
                    <select name="region" value={form.region} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20">
                      <option value="">Select region</option>
                      {locations.regions?.map((r) => (
                        <option key={r.region_name} value={r.region_name}>{r.region_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">District</label>
                    <select name="district" value={form.district} onChange={handleChange} required disabled={!form.region} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60">
                      <option value="">Select district</option>
                      {districts.map((d) => (
                        <option key={d.district_name} value={d.district_name}>{d.district_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">Ward</label>
                    <select name="ward" value={form.ward} onChange={handleChange} required disabled={!form.district} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60">
                      <option value="">Select ward</option>
                      {wards.map((w) => (
                        <option key={w.ward_name} value={w.ward_name}>{w.ward_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">Sales point</label>
                    <select
                      name="salesPointName"
                      value={form.salesPointName}
                      onChange={handleChange}
                      required
                      disabled={!form.ward}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
                    >
                      <option value="">Select sales point</option>
                      {salesPoints.map((sp) => (
                        <option key={sp.sales_point_name} value={sp.sales_point_name}>
                          {sp.sales_point_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" className="w-full rounded-xl py-3" disabled={loading} isLoading={loading}>
                    Sign up
                  </Button>
                </>
              )}
            </form>
          </>
        )}

        {step === STEP_COPY_CODE && registeredCompanyCode && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="size-8 shrink-0" />
              <div>
                <h1 className="text-xl font-semibold text-slate-800">Account created</h1>
                <p className="mt-0.5 text-sm text-slate-600">Copy your company code before proceeding to sign in.</p>
              </div>
            </div>
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50/80 p-4">
              <p className="mb-2 text-sm font-semibold text-amber-900">Copy this code and store it safely</p>
              <p className="mb-3 text-xs text-amber-800">You will need this company code when signing in. Copy it now before continuing.</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="flex-1 min-w-0 rounded-lg border border-amber-300 bg-white px-3 py-2.5 text-sm font-mono text-slate-800 break-all select-all">
                  {registeredCompanyCode}
                </code>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    const copy = (text) => {
                      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                        return navigator.clipboard.writeText(text);
                      }
                      const el = document.createElement('textarea');
                      el.value = text;
                      el.setAttribute('readonly', '');
                      el.style.position = 'absolute';
                      el.style.left = '-9999px';
                      document.body.appendChild(el);
                      el.select();
                      try {
                        document.execCommand('copy');
                        return Promise.resolve();
                      } finally {
                        document.body.removeChild(el);
                      }
                    };
                    copy(registeredCompanyCode).then(() => {
                      setCopiedCode(true);
                      toast.success('Company code copied to clipboard');
                      setTimeout(() => setCopiedCode(false), 2000);
                    }).catch(() => toast.error(withContext('Copy company code', 'Could not copy to clipboard')));
                  }}
                >
                  {copiedCode ? <CheckCircle2 className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                  {copiedCode ? ' Copied' : ' Copy code'}
                </Button>
              </div>
            </div>
            <Button
              type="button"
              className="w-full rounded-xl py-3"
              onClick={() => navigate('/login', { replace: true, state: { message: 'Account created. Sign in with your email and company code if required.' } })}
            >
              Continue to sign in
            </Button>
          </div>
        )}

        {step !== STEP_COPY_CODE && (
          <p className="mt-8 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
