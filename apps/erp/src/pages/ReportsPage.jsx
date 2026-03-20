import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Scale, Clock, Package, Download } from 'lucide-react';
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

function csvEscape(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename, rows) {
  const lines = rows.map((row) => row.map(csvEscape).join(','));
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState('pl');
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const report = REPORTS.find((r) => r.id === selectedReport);

  const { data, isLoading, refetch, isError, error } = useQuery({
    queryKey: ['report', selectedReport, from, to],
    queryFn: () => api.get(report.endpoint, { params: { from, to } }).then((r) => r.data.data),
    enabled: !!selectedReport,
  });

  const exportCsv = () => {
    if (!data) return;
    const stamp = new Date().toISOString().slice(0, 10);
    if (selectedReport === 'pl') {
      const rows = [
        ['Section', 'Line', 'Amount'],
        ...((data.revenue?.breakdown || []).map((item) => ['Revenue', item.name, item.amount])),
        ['Revenue', 'Total', data.revenue?.total ?? 0],
        ...((data.costOfSales?.breakdown || []).map((item) => ['Cost of Sales', item.name, item.amount])),
        ['Cost of Sales', 'Total', data.costOfSales?.total ?? 0],
        ['', 'Gross Profit', data.grossProfit ?? 0],
        ...((data.expenses?.breakdown || []).map((item) => ['Operating Expenses', item.name, item.amount])),
        ['Operating Expenses', 'Total', data.expenses?.total ?? 0],
        ['', 'Net Profit / (Loss)', data.netProfit ?? 0],
      ];
      downloadCsv(`profit-loss-${stamp}.csv`, rows);
    }
    if (selectedReport === 'bs') {
      const rows = [['Section', 'Account', 'Amount']];
      (data.assets?.breakdown || []).forEach((item) => rows.push(['Assets', item.name, item.amount ?? item.balance]));
      rows.push(['Assets', 'Total', data.assets?.total ?? 0]);
      (data.liabilities?.breakdown || []).forEach((item) => rows.push(['Liabilities', item.name, item.amount ?? item.balance]));
      rows.push(['Liabilities', 'Total', data.liabilities?.total ?? 0]);
      (data.equity?.breakdown || []).forEach((item) => rows.push(['Equity', item.name, item.amount ?? item.balance]));
      rows.push(['Equity', 'Total', data.equity?.total ?? 0]);
      downloadCsv(`balance-sheet-${stamp}.csv`, rows);
    }
    if (selectedReport === 'ar') {
      const rows = [['Customer', 'Invoice #', 'Amount Due', 'Due Date', 'Days Overdue']];
      (data.invoices || []).forEach((inv) => {
        const days = Math.floor((Date.now() - new Date(inv.dueDate)) / 86400000);
        rows.push([
          inv.customer?.name || '',
          inv.invoiceNumber,
          inv.amountDue,
          formatDate(inv.dueDate),
          days > 0 ? String(days) : '0',
        ]);
      });
      downloadCsv(`aged-receivables-${stamp}.csv`, rows);
    }
    if (selectedReport === 'iv') {
      const rows = [['SKU', 'Product', 'Qty', 'Unit', 'Cost Price', 'Cost Value', 'Retail Value']];
      (data.products || []).forEach((p) => {
        rows.push([p.sku, p.name, p.totalQuantity, p.unit, p.costPrice, p.costValue, p.retailValue]);
      });
      rows.push(['', '', '', '', 'Totals', data.totalCostValue ?? 0, data.totalRetailValue ?? 0]);
      downloadCsv(`inventory-valuation-${stamp}.csv`, rows);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Financial Reports</h1><p className="page-subtitle">Operational summaries & exports</p></div>
      </div>

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
          <button type="button" onClick={() => refetch()} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">Generate</button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!data || isLoading}
            className="inline-flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-800 text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      )}

      {selectedReport === 'iv' && (
        <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-wrap gap-3 items-center">
          <button type="button" onClick={() => refetch()} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">Refresh</button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!data || isLoading}
            className="inline-flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-800 text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        {isLoading && (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-5 bg-slate-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />)}
          </div>
        )}

        {isError && (
          <div className="text-center py-8 text-red-600 text-sm">
            {error?.response?.data?.error || error?.message || 'Failed to load report'}
          </div>
        )}

        {!isLoading && selectedReport === 'pl' && data && (
          <div className="max-w-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Profit & Loss Statement</h2>
            <p className="text-sm text-slate-500 mb-5">{formatDate(from)} — {formatDate(to)}</p>
            <ReportSection title="Revenue" items={data.revenue?.breakdown || []} total={data.revenue?.total} positive />
            <ReportSection title="Cost of Sales" items={data.costOfSales?.breakdown || []} total={data.costOfSales?.total} />
            <ReportDivider label="Gross Profit" value={data.grossProfit} highlight />
            <ReportSection title="Operating Expenses" items={data.expenses?.breakdown || []} total={data.expenses?.total} />
            {typeof data.grossMargin === 'number' && (
              <p className="text-xs text-slate-500 mb-2">Gross margin: {data.grossMargin}%</p>
            )}
            <ReportDivider label="Net Profit / (Loss)" value={data.netProfit} highlight big />
          </div>
        )}

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

        {!isLoading && selectedReport === 'ar' && data && (
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Aged Receivables</h2>
            <p className="text-sm text-slate-500 mb-4">As at {formatDate(to)} · amounts by days past due date</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
              {[
                { label: 'Not yet due', value: data.current },
                { label: '1–30 days', value: data.days1_30 },
                { label: '31–60 days', value: data.days31_60 },
                { label: '61–90 days', value: data.days61_90 },
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
                      <td className={cn('py-2.5 text-right font-medium', days > 90 ? 'text-red-600' : days > 30 ? 'text-orange-500' : 'text-slate-600')}>{days > 0 ? `${days}d` : '—'}</td>
                    </tr>
                  );
                })}
                {(data.invoices || []).length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-400">No outstanding receivables</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && selectedReport === 'iv' && data && (
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Inventory Valuation</h2>
            <p className="text-sm text-slate-500 mb-4">Current stock valued at cost and at selling price</p>
            <div className="flex flex-wrap gap-4 mb-5">
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
                    <td className="py-2.5 text-right">{p.totalQuantity} {p.unit || ''}</td>
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

        {!isLoading && !isError && !data && <div className="text-center py-8 text-slate-400">Select a report and click Generate</div>}
      </div>
    </div>
  );
}

function ReportSection({ title, items, total, positive }) {
  const list = items || [];
  return (
    <div className="mb-4">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{title}</div>
      {list.map((item, i) => (
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
