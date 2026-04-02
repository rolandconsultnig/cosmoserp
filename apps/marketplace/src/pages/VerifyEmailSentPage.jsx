import { Link, useSearchParams } from 'react-router-dom';
import { Mail } from 'lucide-react';

export default function VerifyEmailSentPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  const verifyHref = email ? `/verify-email?email=${encodeURIComponent(email)}` : '/verify-email';

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="card p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-4">
          <Mail className="w-6 h-6 text-brand-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Check your email</h1>
        <p className="text-gray-600 text-sm mb-4">
          We sent a <strong>6-digit verification code</strong>
          {email ? (
            <> to <strong>{email}</strong>.</>
          ) : (
            '.'
          )}
        </p>
        <p className="text-gray-500 text-xs mb-6">
          Enter the code on the next screen to verify your account. Codes expire in 24 hours. Check spam if needed.
        </p>
        <Link to={verifyHref} className="btn-buy inline-block py-2.5 px-5 rounded-xl font-semibold text-sm mb-3">
          Enter verification code
        </Link>
        <p className="text-sm text-gray-600">
          <Link to="/login" className="text-brand-600 font-semibold hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
