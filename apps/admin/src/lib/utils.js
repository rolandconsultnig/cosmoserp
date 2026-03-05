export function formatCurrency(amount, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount || 0);
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
    APPROVED:     'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    ACTIVE:       'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    SUCCESS:      'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    TRIAL:        'bg-sky-50 text-sky-700 border border-sky-200/80',
    PENDING:      'bg-amber-50 text-amber-700 border border-amber-200/80',
    UNDER_REVIEW: 'bg-violet-50 text-violet-700 border border-violet-200/80',
    SUSPENDED:    'bg-red-50 text-red-700 border border-red-200/80',
    REJECTED:     'bg-red-50 text-red-700 border border-red-200/80',
    FAILED:       'bg-red-50 text-red-700 border border-red-200/80',
    INACTIVE:     'bg-slate-100 text-slate-500 border border-slate-200/80',
  };
  return map[status] || 'bg-slate-100 text-slate-600 border border-slate-200/80';
}

export function getPlanColor(plan) {
  const map = {
    ENTERPRISE:   'bg-violet-50 text-violet-700 border border-violet-200/80',
    PROFESSIONAL: 'bg-cosmos-50 text-cosmos-700 border border-cosmos-200/80',
    STARTER:      'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    TRIAL:        'bg-sky-50 text-sky-700 border border-sky-200/80',
  };
  return map[plan] || 'bg-slate-100 text-slate-600 border border-slate-200/80';
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
