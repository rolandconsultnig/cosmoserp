import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../lib/api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email') || '';
  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState(token ? 'loading' : 'form');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .get('/marketplace/auth/verify-email', { params: { token } })
      .then(({ data }) => {
        setStatus('success');
        setMessage(data.message || 'Email verified. You can now sign in.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification failed or link expired.');
      });
  }, [token]);

  const submitCode = async (e) => {
    e.preventDefault();
    setMessage('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/marketplace/auth/verify-email', {
        email: email.trim().toLowerCase(),
        code: code.trim(),
      });
      setStatus('success');
      setMessage(data.message || 'Email verified. You can now sign in.');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="card p-6 text-center">
        {status === 'loading' && <p className="text-gray-600">Verifying your email…</p>}
        {status === 'form' && (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Verify your email</h1>
            <p className="text-gray-600 text-sm mb-4 text-left">
              Enter the 6-digit code we sent to your inbox.
            </p>
            <form onSubmit={submitCode} className="space-y-4 text-left">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Email</label>
                <input
                  className="input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Code</label>
                <input
                  className="input tracking-widest"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="6-digit code"
                />
              </div>
              {message && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                  {message}
                </div>
              )}
              <button type="submit" disabled={submitting} className="w-full btn-buy py-3 rounded-xl font-bold text-sm disabled:opacity-60">
                {submitting ? 'Verifying…' : 'Verify'}
              </button>
            </form>
          </>
        )}
        {status === 'success' && (
          <>
            <p className="text-green-700 font-medium">{message}</p>
            <Link to="/login" className="btn-buy inline-block mt-4 py-2.5 px-5 rounded-xl font-semibold text-sm">
              Sign in
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <p className="text-red-600">{message}</p>
            <Link to="/login" className="inline-block mt-4 text-brand-600 font-semibold hover:underline">
              Back to sign in
            </Link>
            <span className="mx-2">·</span>
            <Link to="/verify-email" className="inline-block mt-4 text-brand-600 font-semibold hover:underline">
              Try code instead
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
