import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Scale, Clock, Package } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate, cn } from '../lib/utils';

const REPORTS = [
  { id: 'pl', label: 'Profit & Loss', icon: TrendingUp, endpoint: '/reports/profit-loss', color: 'text-green-600', bg: 'bg-green-50' },
  { id: 'bs', label: 'Balance Sheet', icon: Scale, endpoint: '/reports/balance-sheet', color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'ar', label: 'Aged Receivables', icon: Clock, endpoint: '/reports/aged-receivables', color: 'text-orange-600', bg: 'bg-orange-50' },
  { id: 'iv', label: 'Inventory Valuation', icon: Package, endpoint: '/reports/inventory-valuation', color: 'text-purple-600', bg: 'bg-purple-50' },
];

const now = new Date();
const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
const defaultTo = now.toISOString().split('T')[0];

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState('pl');
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const report = REPORTS.find((r) => r.id === selectedReport);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['report', selectedReport, from, to],
    queryFn: () => api.get(report.endpoint, { params: { from, to } }).then((r) => r.data.data),
    enabled: !!selectedReport,
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Financial Reports</h1><p className="page-subtitle">NRS-compliant financial statements</p></div>
      </div>

      {/* Report selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {REPORTS.map(({ id, label, icon: Icon, color, bg }) => (
          <button key={id} onClick={() => setSelectedReport(id)}
            className={cn('p-4 rounded-xl border text-left transition-all', selectedReport === id ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50' : 'border-slate-100 bg-white hover:shadow-md')}>
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', bg)}>
              <Icon className={cn('w-4 h-4', color)} />
            </div>
            <div className="text-sm font-semibold text-slate-900">{label}</div>
          </button>
        ))}
      </div>

      {/* Date filters (not for inventory) */}
      {selectedReport !== 'iv' && (
        <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={() => refetch()} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">Generate</button>
        </div>
      )}

      {/* Report content */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        {isLoading && (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-5 bg-slate-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />)}
          </div>
        )}

        {/* Profit & Loss */}
        {!isLoading && selectedReport === 'pl' && data && (
          <div className="max-w-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Profit & Loss Statement</h2>
            <p className="text-sm text-slate-500 mb-5">{formatDate(from)} — {formatDate(to)}</p>
            <ReportSection title="Revenue" items={data.revenue?.breakdown || []} total={data.revenue?.total} positive />
            <ReportSection title="Cost of Sales" items={data.costOfSales?.breakdown || []} total={data.costOfSales?.total} />
            <ReportDivider label="Gross Profit" value={data.grossProfit} highlight />
            <ReportSection title="Operating Expenses" items={data.expenses?.breakdown || []} total={data.expenses?.total} />
            <ReportDivider label="Net Profit / (Loss)" value={data.netProfit} highlight big />
          </div>
        )}

        {/* Balance Sheet */}
        {!isLoading && selectedReport === 'bs' && data && (
          <div className="max-w-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Balance Sheet</h2>
            <p className="text-sm text-slate-500 mb-5">As at {formatDate(to)}</p>
            <ReportSection title="Assets" items={data.assets?.breakdown || []} total={data.assets?.total} positive />
            <ReportSection title="Liabilities" items={data.liabilities?.breakdown || []} total={data.liabilities?.total} />
            <ReportSection title="Equity" items={data.equity?.breakdown || []} total={data.equity?.total} />
            <ReportDivider label="Total Liabilities + Equity" value={(data.liabilities?.total || 0) + (data.equity?.total || 0)} highlight />
          </div>
        )}

        {/* Aged Receivables */}
        {!isLoading && selectedReport === 'ar' && data && (
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Aged Receivables</h2>
            <p className="text-sm text-slate-500 mb-4">As at {formatDate(to)}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Current (0–30 days)', value: data.current },
                { label: '31–60 days', value: data.days31to60 },
                { label: '61–90 days', value: data.days61to90 },
                { label: '90+ days', value: data.over90 },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs text-slate-500 mb-1">{label}</div>
                  <div className="text-base font-bold text-slate-900">{formatCurrency(value || 0)}</div>
                </div>
              ))}
            </div>
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-slate-500 border-b border-slate-100"><th className="text-left py-2 font-semibold">Customer</th><th className="text-right py-2 font-semibold">Invoice #</th><th className="text-right py-2 font-semibold">Amount Due</th><th className="text-right py-2 font-semibold">Due Date</th><th className="text-right py-2 font-semibold">Days Overdue</th></tr></thead>
              <tbody>
                {(data.invoices || []).map((inv) => {
                  const days = Math.floor((Date.now() - new Date(inv.dueDate)) / 86400000);
                  return (
                    <tr key={inv.id} className="border-b border-slate-50">
                      <td className="py-2.5">{inv.customer?.name}</td>
                      <td className="py-2.5 text-right text-blue-700 font-medium">{inv.invoiceNumber}</td>
                      <td className="py-2.5 text-right font-semibold">{formatCurrency(inv.amountDue)}</td>
                      <td className="py-2.5 text-right text-slate-500">{formatDate(inv.dueDate)}</td>
                      <td className={cn('py-2.5 text-right font-medium', days > 90 ? 'text-red-600' : days > 30 ? 'text-orange-500' : 'text-slate-600')}>{days > 0 ? `${days}d` : 'Current'}</td>
                    </tr>
                  );
                })}
                {(data.invoices || []).length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-400">No outstanding receivables</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Inventory Valuation */}
        {!isLoading && selectedReport === 'iv' && data && (
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Inventory Valuation</h2>
            <p className="text-sm text-slate-500 mb-4">Current stock valued at cost</p>
            <div className="flex gap-4 mb-5">
              <div className="bg-slate-50 rounded-xl p-3"><div className="text-xs text-slate-500">Total Cost Value</div><div className="text-xl font-bold text-slate-900">{formatCurrency(data.totalCostValue || 0)}</div></div>
              <div className="bg-slate-50 rounded-xl p-3"><div className="text-xs text-slate-500">Total Retail Value</div><div className="text-xl font-bold text-green-700">{formatCurrency(data.totalRetailValue || 0)}</div></div>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-slate-500 border-b border-slate-100"><th className="text-left py-2 font-semibold">SKU</th><th className="text-left py-2 font-semibold">Product</th><th className="text-right py-2 font-semibold">Total Qty</th><th className="text-right py-2 font-semibold">Cost Price</th><th className="text-right py-2 font-semibold">Cost Value</th><th className="text-right py-2 font-semibold">Retail Value</th></tr></thead>
              <tbody>
                {(data.products || []).map((p) => (
                  <tr key={p.id} className="border-b border-slate-50">
                    <td className="py-2.5 font-mono text-xs text-slate-500">{p.sku}</td>
                    <td className="py-2.5 font-medium text-slate-900">{p.name}</td>
                    <td className="py-2.5 text-right">{p.totalQuantity} {p.unit}</td>
                    <td className="py-2.5 text-right">{formatCurrency(p.costPrice)}</td>
                    <td className="py-2.5 text-right font-semibold">{formatCurrency(p.costValue)}</td>
                    <td className="py-2.5 text-right text-green-700 font-semibold">{formatCurrency(p.retailValue)}</td>
                  </tr>
                ))}
                {(data.products || []).length === 0 && <tr><td colSpan={6} className="text-center py-8 text-slate-400">No inventory data</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !data && <div className="text-center py-8 text-slate-400">Select a report and click Generate</div>}
      </div>
    </div>
  );
}

function ReportSection({ title, items, total, positive }) {
  return (
    <div className="mb-4">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{title}</div>
      {items.map((item, i) => (
        <div key={i} className="flex justify-between text-sm py-1 text-slate-600">
          <span className="pl-3">{item.name}</span>
          <span>{formatCurrency(item.amount || item.balance || 0)}</span>
        </div>
      ))}
      <div className="flex justify-between text-sm font-semibold text-slate-900 border-t border-slate-100 pt-1.5 mt-1">
        <span>Total {title}</span>
        <span className={positive ? 'text-green-700' : ''}>{formatCurrency(total || 0)}</span>
      </div>
    </div>
  );
}

function ReportDivider({ label, value, highlight, big }) {
  return (
    <div className={cn('flex justify-between py-2 border-t-2 border-slate-300 mt-2 mb-4', big ? 'text-base font-bold' : 'text-sm font-semibold', highlight && (value >= 0 ? 'text-green-700' : 'text-red-600'))}>
      <span className="text-slate-900">{label}</span>
      <span>{formatCurrency(value || 0)}</span>
    </div>
  );
}
