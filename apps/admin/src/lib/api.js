import axios from 'axios';

const api = axios.create({
  baseURL: '/api/',
  headers: { 'Content-Type': 'application/json' },
});

function adminLoginUrl() {
  const raw = import.meta.env.BASE_URL || '/';
  const prefix = raw === '/' ? '' : raw.replace(/\/$/, '');
  const loginPath = prefix ? `${prefix}/login` : '/login';
  return `${window.location.origin}${loginPath}`;
}

function isAdminAuthPublicPath(pathname) {
  return (
    pathname.endsWith('/login') ||
    pathname.includes('/forgot-password') ||
    pathname.includes('/reset-password')
  );
}

api.interceptors.request.use((config) => {
  if (typeof config.url === 'string' && config.url.startsWith('/') && !config.url.startsWith('//')) {
    config.url = config.url.slice(1);
  }
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      if (!isAdminAuthPublicPath(window.location.pathname)) {
        window.location.href = adminLoginUrl();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
