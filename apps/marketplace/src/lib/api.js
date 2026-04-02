import axios from 'axios';

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
const apiBase = apiBaseRaw.endsWith('/') ? apiBaseRaw : `${apiBaseRaw}/`;

const api = axios.create({
  baseURL: apiBase,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof config.url === 'string' && config.url.startsWith('/') && !config.url.startsWith('//')) {
    config.url = config.url.slice(1);
  }
  const token = localStorage.getItem('mkt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('mkt_token');
    }
    return Promise.reject(error);
  }
);

export default api;
