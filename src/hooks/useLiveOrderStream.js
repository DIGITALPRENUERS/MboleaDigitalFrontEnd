import { useEffect, useRef } from 'react';
import { getStoredToken } from '../services/authStorage';

const LIVE_EVENT = 'mbolea:live-order';

/**
 * Subscribes to backend order pushes: native WebSocket first, EventSource fallback.
 * Dispatches {@link LIVE_EVENT} on the window for dashboards to refresh.
 */
export function useLiveOrderStream() {
  const esRef = useRef(null);
  const wsRef = useRef(null);
  const fallbackTimerRef = useRef(null);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return undefined;

    const dispatch = () => {
      window.dispatchEvent(new CustomEvent(LIVE_EVENT));
    };

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/api/ws/orders?access_token=${encodeURIComponent(token)}`;

    let stopped = false;

    const openEs = () => {
      if (stopped || esRef.current) return;
      const url = `${window.location.origin}/api/sse/orders?access_token=${encodeURIComponent(token)}`;
      try {
        const es = new EventSource(url);
        esRef.current = es;
        es.addEventListener('order', dispatch);
        es.onerror = () => {
          /* browser will retry EventSource automatically */
        };
      } catch {
        /* ignore */
      }
    };

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onmessage = () => dispatch();
    ws.onopen = () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
    ws.onerror = () => {
      /* fall back if handshake fails */
    };
    ws.onclose = () => {
      if (!stopped) openEs();
    };

    fallbackTimerRef.current = setTimeout(() => {
      if (stopped) return;
      if (ws.readyState !== WebSocket.OPEN) {
        openEs();
      }
    }, 2000);

    return () => {
      stopped = true;
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      wsRef.current = null;
    };
  }, []);
}
