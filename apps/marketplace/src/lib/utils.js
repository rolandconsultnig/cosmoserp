export function formatCurrency(amount, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

export function truncate(str, n = 60) {
  return str?.length > n ? str.slice(0, n) + '…' : str;
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function getEscrowBadgeClass(escrowStatus) {
  if (escrowStatus === 'HELD') return 'bg-amber-100 text-amber-800';
  if (escrowStatus === 'RELEASED') return 'bg-emerald-100 text-emerald-800';
  if (escrowStatus === 'DISPUTED') return 'bg-red-100 text-red-800';
  if (escrowStatus === 'REFUNDED') return 'bg-slate-200 text-slate-700';
  return 'bg-slate-100 text-slate-600';
}
