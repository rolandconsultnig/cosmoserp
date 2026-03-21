/**
 * Sends anonymous page-view events to the API for admin visitor analytics.
 * Disable with VITE_ENABLE_VISIT_ANALYTICS=false
 */

function getApiBase() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return String(import.meta.env.VITE_API_URL).replace(/\/?$/, '');
  }
  return '/api';
}

function getSessionId() {
  try {
    const k = 'cosmos_visit_sid';
    let id = sessionStorage.getItem(k);
    if (!id && typeof crypto !== 'undefined' && crypto.randomUUID) {
      id = crypto.randomUUID();
      sessionStorage.setItem(k, id);
    }
    return id || null;
  } catch {
    return null;
  }
}

const THROTTLE_MS = 12000;
const lastSentRef = { key: '', at: 0 };

export function trackPageView({ path, title, referrer } = {}) {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ENABLE_VISIT_ANALYTICS === 'false') {
    return;
  }
  if (!path || typeof path !== 'string') return;

  const now = Date.now();
  const key = path;
  if (lastSentRef.key === key && now - lastSentRef.at < THROTTLE_MS) return;
  lastSentRef.key = key;
  lastSentRef.at = now;

  const base = getApiBase();
  const url = `${base}/public/visits`;
  const body = JSON.stringify({
    path: path.length > 2048 ? path.slice(0, 2048) : path,
    title: title ? String(title).slice(0, 500) : undefined,
    referrer: referrer != null ? String(referrer).slice(0, 2048) : typeof document !== 'undefined' ? document.referrer?.slice(0, 2048) : undefined,
    sessionId: getSessionId(),
  });

  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      const ok = navigator.sendBeacon(url, blob);
      if (ok) return;
    }
  } catch {
    /* fall through */
  }

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    credentials: 'omit',
    keepalive: true,
  }).catch(() => {});
}
