import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ui/Toast';
import Button from './ui/Button';
import { AlertTriangle } from 'lucide-react';

/** No activity for this long → show warning and start logout countdown. */
const IDLE_TO_WARNING_MS = 30 * 1000;

/** Countdown duration when warning appears (ms). */
const COUNTDOWN_INITIAL_MS = 60 * 1000;

/** Wait this long after the dialog opens before hover can dismiss (avoids instant dismiss if pointer is already over the box). */
const HOVER_DISMISS_GRACE_MS = 500;

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'wheel'];

/** Throttle mousemove so the idle clock is not reset every frame. */
const MOUSEMOVE_THROTTLE_MS = 1000;

function formatCountdown(ms) {
  if (ms <= 0) return '0:00';
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * After 30s idle: show modal with countdown. Hovering the dialog dismisses the warning (same as confirming).
 * "Yes, I'm still active" closes the modal and resets idle (fresh 30s before warning).
 * At 0: sign out.
 *
 * Uses refs for logout/toast so React re-renders never reset the idle timer (fixes modal never appearing).
 */
export default function IdleSessionWatcher() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [remainingMs, setRemainingMs] = useState(COUNTDOWN_INITIAL_MS);

  const lastActivityRef = useRef(Date.now());
  const warningOpenRef = useRef(false);
  const idleCheckRef = useRef(null);
  const countdownRef = useRef(null);
  const lastMouseMoveRef = useRef(0);
  const hoverDismissReadyRef = useRef(false);
  const logoutRef = useRef(logout);
  const toastRef = useRef(toast);
  const armIdleMonitoringRef = useRef(() => {});
  const onStillActiveRef = useRef(() => {});

  logoutRef.current = logout;
  toastRef.current = toast;

  const clearIdleCheck = () => {
    if (idleCheckRef.current != null) {
      clearInterval(idleCheckRef.current);
      idleCheckRef.current = null;
    }
  };

  const clearCountdown = () => {
    if (countdownRef.current != null) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  useEffect(() => {
    if (!user) {
      clearIdleCheck();
      clearCountdown();
      warningOpenRef.current = false;
      setOpen(false);
      armIdleMonitoringRef.current = () => {};
      return undefined;
    }

    const markActivity = () => {
      if (warningOpenRef.current) return;
      lastActivityRef.current = Date.now();
    };

    const onMouseMoveThrottled = () => {
      if (warningOpenRef.current) return;
      const now = Date.now();
      if (now - lastMouseMoveRef.current < MOUSEMOVE_THROTTLE_MS) return;
      lastMouseMoveRef.current = now;
      lastActivityRef.current = now;
    };

    const startCountdownInner = () => {
      clearCountdown();
      setRemainingMs(COUNTDOWN_INITIAL_MS);
      countdownRef.current = window.setInterval(() => {
        setRemainingMs((prev) => {
          const next = prev - 1000;
          if (next <= 0) {
            clearCountdown();
            warningOpenRef.current = false;
            setOpen(false);
            toastRef.current?.info?.('Signed out after inactivity.');
            logoutRef.current?.();
            return 0;
          }
          return next;
        });
      }, 1000);
    };

    const tryShowWarning = () => {
      if (warningOpenRef.current) return;
      if (Date.now() - lastActivityRef.current < IDLE_TO_WARNING_MS) return;
      clearIdleCheck();
      warningOpenRef.current = true;
      setOpen(true);
      startCountdownInner();
    };

    const armIdleMonitoring = () => {
      clearIdleCheck();
      lastActivityRef.current = Date.now();
      idleCheckRef.current = window.setInterval(tryShowWarning, 500);
    };

    armIdleMonitoringRef.current = armIdleMonitoring;
    armIdleMonitoring();

    ACTIVITY_EVENTS.forEach((ev) => {
      const handler = ev === 'mousemove' ? onMouseMoveThrottled : markActivity;
      window.addEventListener(ev, handler, { passive: true });
    });

    return () => {
      clearIdleCheck();
      clearCountdown();
      armIdleMonitoringRef.current = () => {};
      ACTIVITY_EVENTS.forEach((ev) => {
        const handler = ev === 'mousemove' ? onMouseMoveThrottled : markActivity;
        window.removeEventListener(ev, handler);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-arm when user identity changes; avoids timer reset on context updates
  }, [user]);

  const onStillActive = () => {
    onStillActiveRef.current();
  };

  onStillActiveRef.current = () => {
    clearCountdown();
    warningOpenRef.current = false;
    hoverDismissReadyRef.current = false;
    setOpen(false);
    setRemainingMs(COUNTDOWN_INITIAL_MS);
    armIdleMonitoringRef.current?.();
  };

  useEffect(() => {
    if (!open) {
      hoverDismissReadyRef.current = false;
      return undefined;
    }
    hoverDismissReadyRef.current = false;
    const t = window.setTimeout(() => {
      hoverDismissReadyRef.current = true;
    }, HOVER_DISMISS_GRACE_MS);
    return () => window.clearTimeout(t);
  }, [open]);

  const onModalPointerEnter = () => {
    if (!hoverDismissReadyRef.current) return;
    onStillActiveRef.current();
  };

  useEffect(() => {
    if (!user || !open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onStillActiveRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [user, open]);

  if (!user || !open) return null;

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" aria-hidden />
      <div
        className="relative w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl shadow-amber-900/10"
        onPointerEnter={onModalPointerEnter}
        role="alertdialog"
        aria-labelledby="idle-session-title"
        aria-describedby="idle-session-desc"
      >
        <div className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <AlertTriangle className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="idle-session-title" className="text-lg font-semibold text-slate-900">
              Still active?
            </h2>
            <p id="idle-session-desc" className="mt-1 text-sm text-slate-600">
              No activity for 30 seconds. You will be signed out when the timer reaches zero.
            </p>
            <p className="mt-4 text-center font-mono text-3xl font-bold tabular-nums text-amber-800">
              {formatCountdown(remainingMs)}
            </p>
            <p className="mt-2 text-center text-xs text-slate-500">
              Move the pointer over this dialog to stay signed in, or use the button below.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onStillActive}>
                Yes, I&apos;m still active
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
