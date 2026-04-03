import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Loader2, ChevronRight, Check } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, cn, getEscrowBadgeClass } from '../lib/utils';
import CustomerAccountLayout from '../components/CustomerAccountLayout';

const ESCROW_TABS = [
  { value: '', label: 'All' },
  { value: 'HELD', label: 'Held' },
  { value: 'RELEASED', label: 'Released' },
  { value: 'DISPUTED', label: 'Disputed' },
  { value: 'REFUNDED', label: 'Refunded' },
];

export default function CustomerEscrowPage() {
  const [escrowFilter, setEscrowFilter] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['customer-escrow-hub'],
    queryFn: () =>
      api
        .get('/marketplace/customer/orders', {
          params: { page: 1, limit: 100 },
        })
        .then((r) => r.data),
  });

  const allOrders = data?.data || [];

  const summary = useMemo(() => {
    const m = { HELD: 0, RELEASED: 0, DISPUTED: 0, REFUNDED: 0 };
    for (const o of allOrders) {
      if (Object.prototype.hasOwnProperty.call(m, o.escrowStatus)) {
        m[o.escrowStatus] += 1;
      }
    }
    return m;
  }, [allOrders]);

  const orders = useMemo(() => {
    if (!escrowFilter) return allOrders;
    return allOrders.filter((o) => o.escrowStatus === escrowFilter);
  }, [allOrders, escrowFilter]);

  const buyerSteps = [
    { title: 'You pay', text: 'Payment is taken securely when you checkout.' },
    { title: 'Seller fulfills', text: 'The seller prepares and ships your order.' },
    { title: 'Delivery', text: 'Tracking updates as the courier moves. Delivery may sync from logistics.' },
    { title: 'Escrow protection', text: 'Funds are held until delivery and release rules are met. Open a dispute from the order if something is wrong.' },
  ];

  return (
    <CustomerAccountLayout active="escrow">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/account" className="text-gray-500 hover:text-gray-700 text-sm">Account</Link>
        <span className="text-gray-400">/</span>
        <span className="font-semibold text-gray-900">Escrow</span>
      </div>

      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-5 h-5 text-indigo-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Escrow &amp; buyer protection</h1>
          <p className="text-sm text-gray-600 mt-1">
            See how your payments are protected on Mixio Marketplace and track escrow status on every order.
          </p>
        </div>
      </div>

      <div className="card p-5 mb-6">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">How it works</h2>
        <ol className="space-y-4">
          {buyerSteps.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Check className="w-4 h-4" strokeWidth={2.5} />
                </div>
                {i < buyerSteps.length - 1 && <div className="w-0.5 flex-1 min-h-[8px] bg-gray-200 my-1" />}
              </div>
              <div className="pb-2">
                <div className="font-semibold text-gray-900 text-sm">{i + 1}. {step.title}</div>
                <p className="text-xs text-gray-600 mt-0.5">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-100">
          For order-specific actions (disputes, receipts), open the order from the list below or from{' '}
          <Link to="/account/orders" className="text-brand-600 font-semibold hover:underline">My orders</Link>.
        </p>
      </div>

      <h2 className="text-lg font-bold text-gray-900 mb-3">Your orders by escrow</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {(['HELD', 'RELEASED', 'DISPUTED', 'REFUNDED']).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setEscrowFilter(escrowFilter === key ? '' : key)}
            className={cn(
              'rounded-xl border px-3 py-2 text-left text-sm transition',
              escrowFilter === key ? 'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-100' : 'border-gray-200 bg-white hover:border-gray-300',
            )}
          >
            <div className="text-[10px] font-bold text-gray-500 uppercase">{key}</div>
            <div className="text-lg font-black text-gray-900">{summary[key]}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {ESCROW_TABS.map((t) => (
          <button
            key={t.value || 'all'}
            type="button"
            onClick={() => setEscrowFilter(t.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold border transition',
              escrowFilter === t.value
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" /> Loading…
        </div>
      ) : orders.length === 0 ? (
        <div className="card p-8 text-center text-gray-500 text-sm">
          {allOrders.length === 0 ? (
            <>
              You have no orders yet.{' '}
              <Link to="/products" className="text-brand-600 font-semibold hover:underline">Browse products</Link>
            </>
          ) : (
            <>No orders match this escrow filter. <button type="button" className="text-brand-600 font-semibold hover:underline" onClick={() => setEscrowFilter('')}>Show all</button></>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                to={`/account/orders/${order.id}`}
                className="card p-4 flex flex-wrap items-center justify-between gap-3 hover:border-brand-300 transition-colors"
              >
                <div>
                  <div className="font-semibold text-gray-900">{order.orderNumber}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-bold',
                      order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800',
                    )}
                  >
                    {order.status}
                  </span>
                  {order.paymentStatus === 'SUCCESS' && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">
                      Paid
                    </span>
                  )}
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-bold', getEscrowBadgeClass(order.escrowStatus))}>
                    Escrow {order.escrowStatus}
                  </span>
                  <span className="font-bold text-gray-900">{formatCurrency(order.totalAmount)}</span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </CustomerAccountLayout>
  );
}
