/**
 * HTTP client for the logistics partner portal (agents + companies).
 * Uses `logistics_token` from localStorage; 401 clears session and sends user to login.
 */

const API_BASE = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).replace(/\/?$/, '') : '';

export function logisticsApiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${p}` : `/api${p}`;
}

export function clearLogisticsSession() {
  localStorage.removeItem('logistics_token');
  localStorage.removeItem('logistics_type');
  localStorage.removeItem('logistics_agent');
  localStorage.removeItem('logistics_company');
}

export async function logisticsFetch(path, options = {}) {
  const token = localStorage.getItem('logistics_token');
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(logisticsApiUrl(path), { ...options, headers });

  if (res.status === 401) {
    clearLogisticsSession();
    if (typeof window !== 'undefined') window.location.assign('/logistics-login');
    const err = new Error('Session expired. Sign in again.');
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  return res;
}

export async function logisticsJson(path, options = {}) {
  const res = await logisticsFetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText || 'Request failed');
  return data;
}

/** Google Maps search for a free-text address (pickup / dropoff). */
export function mapsSearchUrl(address) {
  if (!address || !String(address).trim()) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(address).trim())}`;
}

/** API JSON tracking endpoint (shareable technical URL). */
export function publicTrackingApiUrl(trackingNumber) {
  if (!trackingNumber) return '';
  return logisticsApiUrl(`/logistics/track/${encodeURIComponent(trackingNumber)}`);
}

/** Optional marketplace public track page when VITE_MARKETPLACE_URL is set. */
export function publicTrackingCustomerUrl(trackingNumber) {
  const base = typeof import.meta !== 'undefined' && import.meta.env?.VITE_MARKETPLACE_URL
    ? String(import.meta.env.VITE_MARKETPLACE_URL).replace(/\/?$/, '')
    : '';
  if (!base || !trackingNumber) return '';
  return `${base}/track/${encodeURIComponent(trackingNumber)}`;
}

export function absoluteUploadUrl(relativePath) {
  if (!relativePath) return '';
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  const raw = API_BASE || '';
  const origin = raw.replace(/\/?api\/?$/i, '');
  const p = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  if (origin) return `${origin}${p}`;
  if (typeof window !== 'undefined') return `${window.location.origin}${p}`;
  return p;
}
