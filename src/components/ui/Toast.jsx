import { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    if (duration > 0) setTimeout(() => remove(id), duration);
    return id;
  }, []);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((msg, d) => add(msg, 'success', d), [add]);

  const info = useCallback((msg, d) => add(msg, 'info', d), [add]);

  const error = useCallback((msg, duration = 5000) => {
    const id = Date.now() + Math.random();
    const durationMs = duration ?? 5000;
    setToasts((prev) => {
      const existing = prev.find((t) => t.type === 'error' && t.message === msg);
      if (existing) {
        return prev.map((t) =>
          t.id === existing.id ? { ...t, shakeAt: Date.now() } : t
        );
      }
      return [...prev, { id, message: msg, type: 'error' }];
    });
    if (durationMs > 0) setTimeout(() => remove(id), durationMs);
  }, [remove]);

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      {createPortal(
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm" aria-label="Notifications">
          {toasts.map((t) => (
            <div
              key={t.shakeAt ? `${t.id}-${t.shakeAt}` : t.id}
              role="alert"
              className={`flex items-start gap-3 rounded-lg border p-4 shadow-lg ${
                t.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : t.type === 'info'
                    ? 'border-slate-200 bg-slate-50 text-slate-800'
                    : 'border-red-200 bg-red-50 text-red-800'
              } ${t.shakeAt ? 'animate-toast-shake' : ''}`}
            >
              {t.type === 'success' ? (
                <CheckCircle2 className="size-5 shrink-0" />
              ) : t.type === 'info' ? (
                <AlertCircle className="size-5 shrink-0 text-slate-600" />
              ) : (
                <AlertCircle className="size-5 shrink-0" />
              )}
              <p className="flex-1 text-sm font-medium">{t.message}</p>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="shrink-0 rounded p-1 opacity-70 hover:opacity-100"
                aria-label="Dismiss"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
