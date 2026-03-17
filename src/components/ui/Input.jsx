import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

const Input = forwardRef(function Input(
  { label, error, type: typeProp = 'text', className, ...props },
  ref
) {
  const isPassword = typeProp === 'password';
  const [show, setShow] = useState(false);
  const type = isPassword && show ? 'text' : typeProp;

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-700">{label}</label>
      )}
      <div className="relative">
        <input
          ref={ref}
          type={type}
          className={twMerge(
            'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none',
            error ? 'border-red-500' : 'border-slate-200',
            isPassword ? 'pr-10' : '',
            className
          )}
          aria-invalid={error ? 'true' : undefined}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
});

export default Input;
