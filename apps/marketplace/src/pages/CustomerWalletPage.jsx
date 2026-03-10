import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, ArrowLeft, ArrowDownCircle } from 'lucide-react';
import api from '../lib/api';

export default function CustomerWalletPage() {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/marketplace/customer/wallet')
      .then((r) => setWallet(r.data.data))
      .catch(() => setWallet(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <p className="text-gray-500">Loading wallet…</p>
      </div>
    );
  }

  const balance = wallet?.balance ?? 0;
  const currency = wallet?.currency ?? 'NGN';
  const transactions = wallet?.transactions ?? [];

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/account" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">My wallet</h1>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Available balance</p>
            <p className="text-2xl font-bold text-gray-900">{currency} {balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">Fund your wallet to pay at checkout. Escrow keeps your payment secure until delivery.</p>
        <button
          type="button"
          disabled
          className="mt-4 py-2.5 px-4 rounded-xl bg-gray-100 text-gray-500 text-sm font-medium cursor-not-allowed"
        >
          Deposit (coming soon)
        </button>
      </div>

      <h2 className="font-semibold text-gray-900 mb-3">Recent activity</h2>
      {transactions.length === 0 ? (
        <p className="text-gray-500 text-sm">No transactions yet.</p>
      ) : (
        <div className="space-y-2">
          {transactions.map((t) => (
            <div key={t.id} className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.type}</p>
                  <p className="text-xs text-gray-500">{t.reference || new Date(t.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <span className={t.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                {t.amount >= 0 ? '+' : ''}{t.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })} {currency}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
