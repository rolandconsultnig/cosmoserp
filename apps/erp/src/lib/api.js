import axios from 'axios';

/**
 * Resolves API base. If VITE_API_URL is an origin only (e.g. http://localhost:5133), append /api
 * so paths like suppliers resolve to /api/suppliers, not /suppliers.
 */
function resolveApiBase() {
  const env = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL).trim().replace(/\/?$/, '')
    : '';
  if (!env) return '/api';
  if (env.startsWith('/')) return env;
  try {
    const u = new URL(env);
    const p = u.pathname.replace(/\/$/, '') || '';
    if (!p || p === '/') {
      return `${u.origin}/api`;
    }
  } catch {
    /* ignore */
  }
  return env;
}

const apiBaseRaw = resolveApiBase();
/** Trailing slash helps axios join relative paths (suppliers) correctly. */
const apiBase = apiBaseRaw.endsWith('/') ? apiBaseRaw : `${apiBaseRaw}/`;

const api = axios.create({
  baseURL: apiBase,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  /**
   * Axios merges baseURL + url. If url starts with `/`, it is treated as path-absolute from the
   * host root, so `/api` + `/suppliers` becomes `/suppliers` — 404. Strip the leading slash.
   */
  if (typeof config.url === 'string' && config.url.startsWith('/') && !config.url.startsWith('//')) {
    config.url = config.url.slice(1);
  }
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const authRefreshBase = apiBaseRaw.replace(/\/?$/, '');

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${authRefreshBase}/auth/refresh`, { refreshToken: refresh });
        localStorage.setItem('accessToken', data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        localStorage.clear();
        const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) ? String(import.meta.env.BASE_URL).replace(/\/?$/, '') : '/erp';
        window.location.href = base + '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
