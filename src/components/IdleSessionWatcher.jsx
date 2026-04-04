import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ui/Toast';
import Button from './ui/Button';
import { AlertTriangle } from 'lucide-react';

/** No activity for this long → show warning and start logout countdown. */
const IDLE_TO_WARNING_MS = 30 * 1000;

/** Countdown duration when warning appears (ms). */
const COUNTDOWN_INITIAL_MS = 60 * 1000;

/** Hovering the dialog adds this much time (throttled). */
const EXTEND_MS = 60 * 1000;

/** Minimum gap between hover extensions. */
const HOVER_EXTEND_THROTTLE_MS = 2500;

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

function formatCountdown(ms) {
  if (ms <= 0) return '0:00';
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * After 30s idle: show modal with countdown. Hovering the dialog adds +1 min (throttled).
 * "Yes, I'm still active" closes the modal and resets idle (fresh 30s before warning).
 * At 0: sign out.
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
  const lastHoverExtendRef = useRef(0);

  const clearIdleCheck = useCallback(() => {
    if (idleCheckRef.current != null) {
      clearInterval(idleCheckRef.current);
      idleCheckRef.current = null;
    }
  }, []);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current != null) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(() => {
    clearCountdown();
    setRemainingMs(COUNTDOWN_INITIAL_MS);
    countdownRef.current = window.setInterval(() => {
      setRemainingMs((prev) => {
        const next = prev - 1000;
        if (next <= 0) {
          clearCountdown();
          warningOpenRef.current = false;
          setOpen(false);
          toast.info('Signed out after inactivity.');
          logout();
          return 0;
        }
        return next;
      });
    }, 1000);
  }, [clearCountdown, logout, toast]);

  const armIdleMonitor = useCallback(() => {
    clearIdleCheck();
    lastActivityRef.current = Date.now();
    idleCheckRef.current = window.setInterval(() => {
      if (warningOpenRef.current) return;
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor >= IDLE_TO_WARNING_MS) {
        clearIdleCheck();
        warningOpenRef.current = true;
        setOpen(true);
        startCountdown();
      }
    }, 500);
  }, [clearIdleCheck, startCountdown]);

  const onStillActive = useCallback(() => {
    clearCountdown();
    warningOpenRef.current = false;
    setOpen(false);
    setRemainingMs(COUNTDOWN_INITIAL_MS);
    lastActivityRef.current = Date.now();
    armIdleMonitor();
  }, [armIdleMonitor, clearCountdown]);

  const onModalHoverExtend = useCallback(() => {
    const now = Date.now();
    if (now - lastHoverExtendRef.current < HOVER_EXTEND_THROTTLE_MS) return;
    lastHoverExtendRef.current = now;
    setRemainingMs((prev) => prev + EXTEND_MS);
  }, []);

  useEffect(() => {
    if (!user) {
      clearIdleCheck();
      clearCountdown();
      warningOpenRef.current = false;
      setOpen(false);
      return undefined;
    }

    const markActivity = () => {
      if (warningOpenRef.current) return;
      lastActivityRef.current = Date.now();
    };

    armIdleMonitor();
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, markActivity, { passive: true }));

    return () => {
      clearIdleCheck();
      clearCountdown();
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, markActivity));
    };
  }, [user, armIdleMonitor, clearIdleCheck, clearCountdown]);

  useEffect(() => {
    if (!user || !open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onStillActive();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [user, open, onStillActive]);

  if (!user || !open) return null;

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" aria-hidden />
      <div
        className="relative w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl shadow-amber-900/10"
        onMouseEnter={onModalHoverExtend}
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
              Move the pointer over this dialog to add 1 minute (throttled). Or confirm below.
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
