import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, AlertTriangle, ShieldAlert, Package, Loader2, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import useAuthStore from '../store/authStore';

/**
 * Lightweight "alerts" hub: KYC, inventory signals, payroll hints.
 * Full warning engine = future roadmap.
 */
export default function AlertsCenterPage() {
  const { tenant } = useAuthStore();

  const { data: inv, isLoading: invLoading, error: invErr } = useQuery({
    queryKey: ['reports', 'inventory-valuation', 'alerts'],
    queryFn: () => api.get('/reports/inventory-valuation').then((r) => r.data.data),
    retry: false,
  });

  const { data: dash } = useQuery({
    queryKey: ['dashboard', 'alerts'],
    queryFn: () => api.get('/dashboard/tenant').then((r) => r.data.data),
  });

  const products = inv?.products || [];
  const outOfStock = products.filter((p) => p.outOfStock).length;
  const lowStock = products.filter((p) => p.lowStock && !p.outOfStock).length;
  const invDenied = invErr?.response?.status === 403;

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Bell className="w-7 h-7 text-amber-500" />
            Alerts &amp; signals
          </h1>
          <p className="page-subtitle">
            Operational reminders. Expand this hub as we add attendance, compliance, and system warnings.
          </p>
        </div>
      </div>

      {/* KYC */}
      {tenant?.kycStatus && tenant.kycStatus !== 'APPROVED' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-900">KYC not approved</p>
            <p className="text-sm text-amber-800/90 mt-0.5">
              Status: <strong>{tenant.kycStatus}</strong>. Complete verification for NRS-compliant invoicing.
            </p>
            <Link to="/kyc" className="inline-flex items-center gap-1 text-sm font-semibold text-amber-900 mt-2 hover:underline">
              Open KYC <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Inventory */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 font-semibold text-slate-900 mb-2">
          <Package className="w-5 h-5 text-indigo-600" />
          Inventory
        </div>
        {invDenied && (
          <p className="text-sm text-slate-500">No access to stock valuation — alerts hidden for your role.</p>
        )}
        {invLoading && !invDenied && (
          <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        )}
        {!invLoading && !invDenied && (
          <ul className="text-sm space-y-2">
            {outOfStock > 0 && (
              <li className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>
                  <strong>{outOfStock}</strong> product{outOfStock !== 1 ? 's' : ''} out of stock
                </span>
              </li>
            )}
            {lowStock > 0 && (
              <li className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>
                  <strong>{lowStock}</strong> at or below reorder point
                </span>
              </li>
            )}
            {outOfStock === 0 && lowStock === 0 && (
              <li className="text-slate-600">No inventory quantity alerts right now.</li>
            )}
            <li>
              <Link to="/stock" className="text-indigo-600 font-semibold text-sm hover:underline inline-flex items-center gap-1">
                Open stock &amp; valuation <ArrowRight className="w-4 h-4" />
              </Link>
            </li>
          </ul>
        )}
      </div>

      {/* Payroll hint from dashboard */}
      {dash?.payroll?.pendingApproval > 0 && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
          <p className="font-semibold text-violet-900">Payroll</p>
          <p className="text-sm text-violet-800 mt-0.5">
            {dash.payroll.pendingApproval} payroll run(s) awaiting approval.
          </p>
          <Link to="/payroll" className="inline-flex items-center gap-1 text-sm font-semibold text-violet-900 mt-2 hover:underline">
            Go to payroll <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
