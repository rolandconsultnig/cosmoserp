import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../lib/visitAnalytics';

/**
 * Records SPA route changes for the admin visitor dashboard (throttled in visitAnalytics).
 */
export default function VisitTracker() {
  const location = useLocation();
  const prevPath = useRef('');

  useEffect(() => {
    const path = `${location.pathname}${location.search}`;
    if (path.startsWith('/erp')) return;
    if (prevPath.current === path) return;
    prevPath.current = path;

    const title = typeof document !== 'undefined' ? document.title : undefined;
    trackPageView({ path, title });
  }, [location.pathname, location.search]);

  return null;
}
