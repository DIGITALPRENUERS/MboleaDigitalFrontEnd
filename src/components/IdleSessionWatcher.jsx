import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ui/Toast';

/** Sign out after this many milliseconds with no user activity. */
const IDLE_LOGOUT_MS = 30 * 1000;

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'mousemove'];

/**
 * Resets a timer on user activity; logs out when idle (client-side session discipline).
 * Tune IDLE_LOGOUT_MS (e.g. 30 * 60 * 1000 for 30 minutes) for production.
 */
export default function IdleSessionWatcher() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const timerRef = useRef(null);

  useEffect(() => {
    if (!user) return undefined;

    const clear = () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const arm = () => {
      clear();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        toast.info('Signed out after a period of inactivity.');
        logout();
      }, IDLE_LOGOUT_MS);
    };

    const onActivity = () => arm();

    arm();
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));

    return () => {
      clear();
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity));
    };
  }, [user, logout, toast]);

  return null;
}
