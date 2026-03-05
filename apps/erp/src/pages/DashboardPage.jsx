import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, FileText, Package, Users, AlertTriangle, ShieldCheck, ShieldX, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { formatCurrency, formatDate, getStatusColor, cn } from '../lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import useAuthStore from '../store/authStore';

function StatCard({ title, value, sub, icon: Icon, iconBg, trend, trendValue }) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconBg)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      {trendValue !== undefined && (
        <div className={cn('flex items-center gap-1 mt-3 text-xs font-medium', trend >= 0 ? 'text-green-600' : 'text-red-500')}>
          {trend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {Math.abs(trendValue)}% vs last month
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { tenant } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/tenant').then((r) => r.data.data),
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-slate-200 rounded w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-200 rounded-xl" />)}
        </div>
        <div className="h-72 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  const d = data || {};

  const nrsBadge = d.nrs?.approved > 0
    ? { icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-50', label: `${d.nrs.approved} NRS Approved` }
    : { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'No NRS submissions yet' };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {tenant?.tradingName || tenant?.businessName}</p>
        </div>
        <Link to="/invoices/new" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2">
          <FileText className="w-4 h-4" /> New Invoice
        </Link>
      </div>

      {/* KYC / NRS alert */}
      {tenant?.kycStatus !== 'APPROVED' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">KYC Verification Required</p>
            <p className="text-amber-700 text-xs mt-0.5">Complete your KYC/TIN verification to issue NRS tax-compliant invoices. Status: <strong>{tenant?.kycStatus}</strong></p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Revenue This Month"
          value={formatCurrency(d.revenue?.thisMonth)}
          icon={TrendingUp} iconBg="bg-blue-600"
          trend={d.revenue?.growth} trendValue={d.revenue?.growth}
        />
        <StatCard
          title="Outstanding Receivables"
          value={formatCurrency(d.receivables?.amount)}
          sub={`${d.receivables?.count || 0} unpaid · ${d.receivables?.overdueCount || 0} overdue`}
          icon={FileText} iconBg="bg-orange-500"
        />
        <StatCard
          title="Total Products"
          value={d.inventory?.totalProducts || 0}
          sub={`${d.inventory?.lowStockCount || 0} low/out of stock`}
          icon={Package} iconBg="bg-purple-600"
        />
        <StatCard
          title="Employees"
          value={d.employees || 0}
          sub={`${d.customers || 0} customers`}
          icon={Users} iconBg="bg-green-600"
        />
      </div>

      {/* NRS + Pending POs row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={cn('rounded-xl border p-4 flex items-center gap-3', nrsBadge.bg)}>
          <nrsBadge.icon className={cn('w-6 h-6', nrsBadge.color)} />
          <div>
            <div className={cn('text-sm font-semibold', nrsBadge.color)}>{nrsBadge.label}</div>
            {d.nrs?.failed > 0 && <div className="text-xs text-red-600 mt-0.5">{d.nrs.failed} failed submission(s)</div>}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3">
          <ShieldX className="w-6 h-6 text-slate-400" />
          <div>
            <div className="text-sm font-semibold text-slate-700">{d.pendingPOs || 0} Draft Purchase Orders</div>
            <div className="text-xs text-slate-500">Low stock auto-generated</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-orange-400" />
          <div>
            <div className="text-sm font-semibold text-slate-700">{d.receivables?.overdueCount || 0} Overdue Invoices</div>
            <div className="text-xs text-slate-500">Require immediate attention</div>
          </div>
        </div>
      </div>

      {/* Recent invoices table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Recent Invoices</h2>
          <Link to="/invoices" className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:underline">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left px-5 py-3 font-semibold">Invoice #</th>
                <th className="text-left px-5 py-3 font-semibold">Customer</th>
                <th className="text-left px-5 py-3 font-semibold">Amount</th>
                <th className="text-left px-5 py-3 font-semibold">Due Date</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-left px-5 py-3 font-semibold">NRS</th>
              </tr>
            </thead>
            <tbody>
              {(d.recentInvoices || []).length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">No invoices yet — <Link to="/invoices/new" className="text-blue-600">create your first</Link></td></tr>
              )}
              {(d.recentInvoices || []).map((inv) => (
                <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-blue-600">
                    <Link to={`/invoices`}>{inv.invoiceNumber}</Link>
                  </td>
                  <td className="px-5 py-3 text-slate-700">{inv.customer?.name}</td>
                  <td className="px-5 py-3 font-semibold">{formatCurrency(inv.totalAmount, inv.currency)}</td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(inv.dueDate)}</td>
                  <td className="px-5 py-3">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(inv.status))}>{inv.status}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(inv.nrsStatus))}>
                      {inv.nrsStatus === 'APPROVED' ? '✓ IRN' : inv.nrsStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
