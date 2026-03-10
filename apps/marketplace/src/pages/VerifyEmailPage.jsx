import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../lib/api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }
    api.get('/marketplace/auth/verify-email', { params: { token } })
      .then(({ data }) => {
        setStatus('success');
        setMessage(data.message || 'Email verified. You can now sign in.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification failed or link expired.');
      });
  }, [token]);

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="card p-6 text-center">
        {status === 'loading' && <p className="text-gray-600">Verifying your email…</p>}
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
            <Link to="/register" className="inline-block mt-4 text-brand-600 font-semibold hover:underline">
              Register
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
