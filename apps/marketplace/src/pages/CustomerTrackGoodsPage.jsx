import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Truck, Loader2 } from 'lucide-react';
import CustomerAccountLayout from '../components/CustomerAccountLayout';
import api from '../lib/api';

function computeEta(order) {
  const created = new Date(order.createdAt);
  const now = new Date();
  const ageHours = (now - created) / (1000 * 60 * 60);
  let etaHours;

  switch (order.status) {
    case 'PENDING':
    case 'CONFIRMED':
      etaHours = 72 - ageHours;
      break;
    case 'PROCESSING':
      etaHours = 48 - ageHours;
      break;
    case 'SHIPPED':
      etaHours = 24 - ageHours;
      break;
    default:
      etaHours = 0;
  }
  if (etaHours <= 0) return 'Arriving soon';
  const days = Math.floor(etaHours / 24);
  const hours = Math.round(etaHours % 24);
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ${hours}h`;
  return `${hours} hour${hours !== 1 ? 's' : ''}`;
}

export default function CustomerTrackGoodsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['customer-orders-track'],
    queryFn: () =>
      api.get('/marketplace/customer/orders', { params: { page: 1, limit: 50 } }).then((r) => r.data),
  });

  const inTransit = useMemo(() => {
    const orders = data?.data || [];
    return orders.filter((o) =>
      ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(o.status)
    );
  }, [data]);

  return (
    <CustomerAccountLayout active="track">
      <div className="flex items-center gap-2 mb-4">
        <Link to="/account" className="text-gray-500 hover:text-gray-700 text-sm">Account</Link>
        <span className="text-gray-400">/</span>
        <span className="font-semibold text-gray-900">Track goods</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Track goods in transit</h1>
      <p className="text-sm text-gray-500 mb-6">
        See where your orders are in the delivery journey and an estimated time of arrival.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" /> Loading shipments…
        </div>
      ) : inTransit.length === 0 ? (
        <div className="card p-8 text-center">
          <Truck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            You have no goods in transit at the moment.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {inTransit.map((order) => (
            <div key={order.id} className="card p-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{order.orderNumber}</p>
                  <p className="text-xs text-gray-500">
                    Status: <span className="font-medium">{order.status}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Created:{' '}
                    {new Date(order.createdAt).toLocaleString('en-NG', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                  ETA
                </p>
                <p className="text-sm font-bold text-gray-900">{computeEta(order)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </CustomerAccountLayout>
  );
}

