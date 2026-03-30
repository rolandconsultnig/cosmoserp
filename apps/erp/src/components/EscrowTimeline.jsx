import {
  CheckCircle2, Lock, Truck, Package, AlertCircle, Clock,
} from 'lucide-react';
import { formatDate, formatCurrency, cn } from '../lib/utils';

const STAGE_CONFIG = {
  CONFIRMED: {
    icon: Package,
    label: 'Order Confirmed',
    color: 'blue',
    getTimestamp: (order) => order.createdAt,
  },
  PAID: {
    icon: CheckCircle2,
    label: 'Payment Received',
    color: 'green',
    getTimestamp: (order) => order.paidAt,
  },
  DELIVERED: {
    icon: Truck,
    label: 'Delivered',
    color: 'green',
    getTimestamp: (order) => order.deliveredAt,
  },
  ESCROW: {
    icon: Lock,
    label: 'Escrow Held',
    color: 'amber',
    getTimestamp: () => null,
  },
};

function getStageColor(color, isActive, isComplete) {
  if (isActive) {
    return {
      bg: `bg-${color}-100 border-${color}-300`,
      text: `text-${color}-700`,
      icon: `text-${color}-600`,
    };
  }
  if (isComplete) {
    return {
      bg: 'bg-green-100 border-green-300',
      text: 'text-green-700',
      icon: 'text-green-600',
    };
  }
  return {
    bg: 'bg-slate-100 border-slate-200',
    text: 'text-slate-500',
    icon: 'text-slate-400',
  };
}

function getPayoutStatusBadge(status) {
  const statusMap = {
    PENDING: { label: 'Pending', color: 'bg-slate-100 text-slate-700' },
    SUBMITTED: { label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
    SUCCESS: { label: 'Paid', color: 'bg-green-100 text-green-700' },
    FAILED: { label: 'Failed', color: 'bg-red-100 text-red-700' },
    REVERSED: { label: 'Reversed', color: 'bg-orange-100 text-orange-700' },
  };
  return statusMap[status] || statusMap.PENDING;
}

export default function EscrowTimeline({ order, sellerPayout }) {
  if (!order) return null;

  const isDelivered = order.status === 'DELIVERED';
  const escrowHeld = order.escrowStatus === 'HELD';
  const isDisputed = order.escrowStatus === 'DISPUTED';
  const isReleased = order.escrowStatus === 'RELEASED';

  const stages = [
    { key: 'CONFIRMED', complete: true },
    { key: 'PAID', complete: order.paymentStatus === 'SUCCESS' },
    { key: 'DELIVERED', complete: isDelivered },
    { key: 'ESCROW', complete: isReleased },
  ];

  const currentStageIdx = isReleased ? 3 : isDelivered ? 3 : order.paymentStatus === 'SUCCESS' ? 1 : 0;
  const payoutStatus = getPayoutStatusBadge(sellerPayout?.status || 'PENDING');

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {stages.map((stage, idx) => {
          const config = STAGE_CONFIG[stage.key];
          const Icon = config.icon;
          const isActive = idx === currentStageIdx && !isReleased;
          const isComplete = stage.complete;
          const timestamp = config.getTimestamp(order);
          const colors = getStageColor(config.color, isActive, isComplete);

          return (
            <div key={stage.key} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full border-2 flex items-center justify-center transition',
                    colors.bg,
                  )}
                >
                  <Icon className={cn('w-5 h-5', colors.icon)} />
                </div>
                {idx < stages.length - 1 && (
                  <div
                    className={cn(
                      'w-0.5 h-12 my-1',
                      isComplete ? 'bg-green-300' : 'bg-slate-200',
                    )}
                  />
                )}
              </div>

              <div className="pt-1.5 pb-3">
                <div className="font-semibold text-sm">{config.label}</div>
                {timestamp && (
                  <div className="text-xs text-slate-500 mt-0.5">
                    {formatDate(timestamp)}
                  </div>
                )}
                {isActive && (
                  <div className="mt-2 text-xs font-semibold text-amber-700 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {isDisputed ? 'Disputed — awaiting support review' : 'Current stage'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isDelivered && (
        <div className="border-t border-slate-200 pt-3">
          <div className="text-xs font-bold text-slate-600 uppercase mb-2">
            Escrow & Payout Status
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-700">Escrow:</span>
              <span
                className={cn(
                  'text-xs px-2 py-1 rounded font-semibold',
                  isDisputed ? 'bg-orange-100 text-orange-700' : isReleased ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800',
                )}
              >
                {order.escrowStatus}
              </span>
            </div>

            {sellerPayout && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-700">Payout:</span>
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs px-2 py-1 rounded font-semibold', payoutStatus.color)}>
                    {payoutStatus.label}
                  </span>
                  {sellerPayout.status === 'SUCCESS' && (
                    <span className="text-sm font-semibold text-green-700">
                      {formatCurrency(sellerPayout.amount)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {sellerPayout?.status === 'FAILED' && sellerPayout?.errorMessage && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                <div className="flex gap-2 items-start">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Payout failed</div>
                    <div className="mt-0.5 text-red-600">{sellerPayout.errorMessage}</div>
                  </div>
                </div>
              </div>
            )}

            {!sellerPayout && order.escrowStatus === 'HELD' && (
              <p className="text-xs text-slate-500 italic">
                Waiting for platform admin to release & process payout
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
