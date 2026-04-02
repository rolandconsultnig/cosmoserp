import { Link, useSearchParams } from 'react-router-dom';
import { Mail } from 'lucide-react';

export default function VerifyEmailSentPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || 'your email';

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="card p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-4">
          <Mail className="w-6 h-6 text-brand-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Check your email</h1>
        <p className="text-gray-600 text-sm mb-4">
          We sent a verification link to <strong>{email}</strong>. Click the link to verify your account, then sign in.
        </p>
        <p className="text-gray-500 text-xs mb-6">
          The link expires in 5 minutes. If you don&apos;t see the email, check your spam folder.
        </p>
        <Link to="/login" className="btn-buy inline-block py-2.5 px-5 rounded-xl font-semibold text-sm">
          Go to sign in
        </Link>
      </div>
    </div>
  );
}
