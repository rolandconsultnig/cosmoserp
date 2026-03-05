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
