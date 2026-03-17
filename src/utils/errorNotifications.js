/**
 * Contextual error messages for all activities.
 * Use with toast.error() so users see what action failed and why.
 */

/**
 * Extract a user-friendly message from an API/axios error.
 * @param {Error} err - Caught error (may have err.response from axios)
 * @returns {string} Message from response body or fallback
 */
export function getErrorMessage(err) {
  if (!err) return 'Something went wrong.';
  const data = err.response?.data;
  if (data) {
    if (typeof data.message === 'string' && data.message.trim()) return data.message.trim();
    if (typeof data.error === 'string' && data.error.trim()) return data.error.trim();
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      const first = data.errors[0];
      return typeof first === 'string' ? first : (first?.message || first?.defaultMessage) || 'Validation failed.';
    }
  }
  const status = err.response?.status;
  if (status === 401) return 'Session expired or invalid. Please sign in again.';
  if (status === 403) return 'You do not have permission for this action.';
  if (status === 404) return 'The requested resource was not found.';
  if (status >= 500) return 'Server error. Please try again later.';
  if (err.message && typeof err.message === 'string') return err.message;
  if (err.code === 'ERR_NETWORK') return 'Network error. Check your connection and try again.';
  return 'Something went wrong. Please try again.';
}

/**
 * Build a contextual error message for notifications.
 * @param {string} activity - Short label for the action (e.g. "Place order", "Create payment")
 * @param {Error|string} errOrMessage - Caught error or custom message
 * @returns {string} "Activity: detail" or just detail if it already contains context
 */
export function withContext(activity, errOrMessage) {
  const message = typeof errOrMessage === 'string' ? errOrMessage : getErrorMessage(errOrMessage);
  if (!activity) return message;
  if (!message) return `${activity} failed.`;
  return `${activity}: ${message}`;
}
