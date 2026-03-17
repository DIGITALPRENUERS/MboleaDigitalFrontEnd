/**
 * Format ISO timestamp for activity displays (orders, payments, deliveries, etc.).
 * Use for "when" something happened so users see both date and time.
 */

/**
 * Date and time, e.g. "28 Feb 2026, 15:43"
 */
export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Date only, e.g. "28 Feb 2026"
 */
export function formatDateOnly(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
