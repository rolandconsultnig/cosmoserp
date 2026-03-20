import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

export function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function getStatusColor(status) {
  const map = {
    PAID: 'bg-green-100 text-green-700',
    APPROVED: 'bg-green-100 text-green-700',
    ACTIVE: 'bg-green-100 text-green-700',
    RECEIVED: 'bg-green-100 text-green-700',
    SENT: 'bg-blue-100 text-blue-700',
    PARTIAL: 'bg-yellow-100 text-yellow-700',
    PROCESSING: 'bg-yellow-100 text-yellow-700',
    UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
    DRAFT: 'bg-slate-100 text-slate-600',
    PENDING: 'bg-slate-100 text-slate-600',
    OVERDUE: 'bg-red-100 text-red-700',
    REJECTED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-red-100 text-red-700',
    FAILED: 'bg-red-100 text-red-700',
    CONVERTED: 'bg-purple-100 text-purple-700',
    TRIAL: 'bg-orange-100 text-orange-700',
    SUSPENDED: 'bg-red-100 text-red-700',
    CONFIRMED: 'bg-blue-100 text-blue-700',
    SHIPPED: 'bg-indigo-100 text-indigo-700',
    DELIVERED: 'bg-green-100 text-green-700',
    DISPUTED: 'bg-orange-100 text-orange-800',
    REFUNDED: 'bg-slate-200 text-slate-700',
    IN_TRANSIT: 'bg-sky-100 text-sky-800',
    OUT_FOR_DELIVERY: 'bg-violet-100 text-violet-800',
    PENDING_PICKUP: 'bg-amber-100 text-amber-800',
    RETURNED: 'bg-rose-100 text-rose-800',
  };
  return map[status] || 'bg-slate-100 text-slate-600';
}

export function truncate(str, n = 40) {
  return str?.length > n ? str.slice(0, n) + '…' : str;
}

export function calcVAT(amount, rate = 0.075) {
  return parseFloat((amount * rate).toFixed(2));
}
