import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { Loader2, ShieldAlert } from 'lucide-react';

function readTokenFromLocation() {
  const hash = window.location.hash?.replace(/^#/, '') || '';
  const hashParams = new URLSearchParams(hash.includes('=') ? hash : '');
  let token = hashParams.get('token') || hashParams.get('access_token');
  if (!token) {
    const q = new URLSearchParams(window.location.search);
    token = q.get('token') || q.get('access_token');
  }
  return token;
}

export default function ImpersonatePage() {
  const navigate = useNavigate();
  const applyImpersonationToken = useAuthStore((s) => s.applyImpersonationToken);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = readTokenFromLocation();
      if (!token) {
        setError('Missing impersonation token. Open the link from the admin console.');
        return;
      }
      try {
        await applyImpersonationToken(token);
        if (cancelled) return;
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
        navigate('/dashboard', { replace: true });
      } catch (e) {
        if (!cancelled) {
          setError(e.response?.data?.error || e.message || 'Could not start impersonation session');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [applyImpersonationToken, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white border border-red-100 rounded-2xl shadow-sm p-8 text-center">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-slate-900 mb-2">Impersonation failed</h1>
          <p className="text-sm text-slate-600 mb-6">{error}</p>
          <Link to="/login" className="text-sm font-semibold text-indigo-600 hover:underline">Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      <p className="text-sm font-medium text-slate-600">Signing you into the tenant account…</p>
    </div>
  );
}
