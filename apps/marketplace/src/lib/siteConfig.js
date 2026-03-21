/**
 * Public site URL for canonical / Open Graph (no trailing slash).
 * Set VITE_SITE_URL at build time for production, e.g. https://cosmoserp.com.ng
 */
export function getSiteUrl() {
  const env = import.meta.env.VITE_SITE_URL;
  if (env && String(env).trim()) {
    return String(env).replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  return '';
}

/** Make image URL absolute for og:image / JSON-LD */
export function absoluteUrl(href) {
  if (!href) return '';
  const s = String(href).trim();
  if (/^https?:\/\//i.test(s)) return s;
  const base = getSiteUrl();
  if (!base) return s;
  if (s.startsWith('/')) return `${base}${s}`;
  return `${base}/${s}`;
}
