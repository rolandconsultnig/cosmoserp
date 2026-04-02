import { Navigate } from 'react-router-dom';

export default function LogisticsPortalHome() {
  if (typeof localStorage === 'undefined' || !localStorage.getItem('logistics_token')) {
    return <Navigate to="/logistics-login" replace />;
  }
  const type = localStorage.getItem('logistics_type');
  if (type === 'company') return <Navigate to="/logistics/company" replace />;
  return <Navigate to="/logistics/dashboard" replace />;
}
