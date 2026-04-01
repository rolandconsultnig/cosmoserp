import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Scale, Clock, Package, Download, HandCoins, Banknote, Percent, Target } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate, cn } from '../lib/utils';

const REPORTS = [
  { id: 'pl', label: 'Profit & Loss', icon: TrendingUp, endpoint: '/reports/profit-loss', color: 'text-green-600', bg: 'bg-green-50' },
  { id: 'bs', label: 'Balance Sheet', icon: Scale, endpoint: '/reports/balance-sheet', color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'cf', label: 'Cash Flow', icon: Banknote, endpoint: '/reports/cash-flow', color: 'text-teal-600', bg: 'bg-teal-50' },
  { id: 'bva', label: 'Budget vs Actual', icon: Target, endpoint: '/reports/budget-vs-actual', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { id: 'vat', label: 'VAT Schedule', icon: Percent, endpoint: '/reports/vat-schedule', color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: 'ar', label: 'Aged Receivables', icon: Clock, endpoint: '/reports/aged-receivables', color: 'text-orange-600', bg: 'bg-orange-50' },
  { id: 'ap', label: 'Aged Payables', icon: HandCoins, endpoint: '/reports/aged-payables', color: 'text-rose-600', bg: 'bg-rose-50' },
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
  const [budgetId, setBudgetId] = useState('');

  const report = REPORTS.find((r) => r.id === selectedReport);

  const reportQueryParams = useMemo(() => {
    if (!report) return null;
    if (report.id === 'iv' || report.id === 'bva') return {};
    if (report.id === 'bs') return { asOf: to, basis: 'gl' };
    if (report.id === 'cf') return { from, to };
    if (report.id === 'pl') return { from, to, basis: 'gl' };
    if (report.id === 'vat') return { from, to };
    return { from, to };
  }, [report, from, to]);

  const { data: budgetsPayload, isLoading: budgetsListLoading } = useQuery({
    queryKey: ['reports-budgets-list'],
    queryFn: () => api.get('/budgets', { params: { limit: 100 } }).then((r) => r.data),
    enabled: selectedReport === 'bva',
  });
  const budgetsList = budgetsPayload?.data || [];

  useEffect(() => {
    if (selectedReport !== 'bva') return;
    if (budgetId) return;
    if (budgetsList.length) setBudgetId(budgetsList[0].id);
  }, [selectedReport, budgetId, budgetsList]);

  const mainReportQuery = useQuery({
    queryKey: ['report', selectedReport, from, to],
    queryFn: () => api.get(report.endpoint, { params: reportQueryParams || {} }).then((r) => r.data.data),
    enabled: !!selectedReport && !!reportQueryParams && selectedReport !== 'bva',
  });

  const bvaReportQuery = useQuery({
    queryKey: ['report', 'bva', budgetId],
    queryFn: () => api.get('/reports/budget-vs-actual', { params: { budgetId } }).then((r) => r.data.data),
    enabled: selectedReport === 'bva' && !!budgetId,
  });

  const data = selectedReport === 'bva' ? bvaReportQuery.data : mainReportQuery.data;
  const isLoading = selectedReport === 'bva' ? bvaReportQuery.isLoading : mainReportQuery.isLoading;
  const isError = selectedReport === 'bva' ? bvaReportQuery.isError : mainReportQuery.isError;
  const error = selectedReport === 'bva' ? bvaReportQuery.error : mainReportQuery.error;
  const refetch = selectedReport === 'bva' ? bvaReportQuery.refetch : mainReportQuery.refetch;
  const reportContentReady = !isLoading && !(selectedReport === 'bva' && budgetsListLoading);

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
    if (selectedReport === 'ap') {
      const rows = [['Supplier', 'Bill #', 'Amount Due', 'Due Date', 'Days Overdue']];
      (data.bills || []).forEach((b) => {
        const days = Math.floor((Date.now() - new Date(b.dueDate)) / 86400000);
        rows.push([
          b.supplier?.name || '',
          b.billNumber,
          b.amountDue,
          formatDate(b.dueDate),
          days > 0 ? String(days) : '0',
        ]);
      });
      downloadCsv(`aged-payables-${stamp}.csv`, rows);
    }
    if (selectedReport === 'iv') {
      const rows = [['SKU', 'Product', 'Qty', 'Unit', 'Cost Price', 'Cost Value', 'Retail Value']];
      (data.products || []).forEach((p) => {
        rows.push([p.sku, p.name, p.totalQuantity, p.unit, p.costPrice, p.costValue, p.retailValue]);
      });
      rows.push(['', '', '', '', 'Totals', data.totalCostValue ?? 0, data.totalRetailValue ?? 0]);
      downloadCsv(`inventory-valuation-${stamp}.csv`, rows);
    }
    if (selectedReport === 'cf') {
      const rows = [['Account', 'Code', 'Opening', 'Period change', 'Closing']];
      (data.cashAccounts || []).forEach((c) => {
        rows.push([c.name, c.code, c.openingBalance, c.periodNetChange, c.closingBalance]);
      });
      rows.push(['', '', '', 'Total net change', data.totalNetCashChange ?? 0]);
      downloadCsv(`cash-flow-${stamp}.csv`, rows);
    }
    if (selectedReport === 'vat') {
      const rows = [
        ['Section', 'Field', 'Amount'],
        ['Output VAT', 'Total', data.output?.vat ?? 0],
        ['Output VAT', 'Taxable base', data.output?.taxableBase ?? 0],
        ['Input VAT', 'Vendor bills', data.input?.fromVendorBills ?? 0],
        ['Input VAT', 'Received POs (reference)', data.input?.fromReceivedPurchaseOrders ?? 0],
        ['', 'Net (output − vendor bills)', data.netVatBeforeCaps ?? 0],
      ];
      downloadCsv(`vat-schedule-${stamp}.csv`, rows);
    }
    if (selectedReport === 'bva' && data?.rows) {
      const rows = [['Month', 'Account', 'Budgeted', 'Actual', 'Variance', 'Util %', 'Alert']];
      data.rows.forEach((r) => {
        rows.push([
          r.month,
          r.account ? `${r.account.code} — ${r.account.name}` : '',
          r.budgeted,
          r.actual,
          r.variance,
          r.utilizationPct,
          r.alertLevel,
        ]);
      });
      rows.push(['', 'Totals', data.totals?.budgeted ?? 0, data.totals?.actual ?? 0, data.totals?.variance ?? 0, '', '']);
      downloadCsv(`budget-vs-actual-${stamp}.csv`, rows);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Financial Reports</h1><p className="page-subtitle">Operational summaries & exports</p></div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
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

      {selectedReport === 'bva' && (
        <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Budget</label>
            <select
              value={budgetId}
              onChange={(e) => setBudgetId(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm min-w-[220px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {!budgetsList.length && <option value="">No budgets</option>}
              {budgetsList.map((b) => (
                <option key={b.id} value={b.id}>{b.name} (FY {b.fiscalYear})</option>
              ))}
            </select>
          </div>
          <button type="button" onClick={() => refetch()} disabled={!budgetId || budgetsListLoading} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50">Generate</button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!data?.rows || isLoading || budgetsListLoading}
            className="inline-flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-800 text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <p className="text-xs text-slate-500 w-full">Actual amounts use posted journal lines by budget period and line month.</p>
        </div>
      )}

      {selectedReport !== 'iv' && selectedReport !== 'bva' && (
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
        {(isLoading || (selectedReport === 'bva' && budgetsListLoading)) && (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-5 bg-slate-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />)}
          </div>
        )}

        {isError && (
          <div className="text-center py-8 text-red-600 text-sm">
            {error?.response?.data?.error || error?.message || 'Failed to load report'}
          </div>
        )}

        {reportContentReady && selectedReport === 'pl' && data && (
          <div className="max-w-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Profit & Loss Statement</h2>
            <div className="mb-5">
              <p className="text-sm text-slate-500">{formatDate(from)} — {formatDate(to)}</p>
              {data.basis && (
                <p className="text-xs text-slate-400 mt-1">
                  Basis: {data.basis === 'gl' ? 'General ledger (posted journals)' : 'Operational (invoices, POs, payroll)'}
                </p>
              )}
            </div>
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

        {reportContentReady && selectedReport === 'bs' && data && (
          <div className="max-w-xl">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Balance Sheet</h2>
            <div className="mb-5">
              <p className="text-sm text-slate-500">As at {formatDate(data.asOf || to)}</p>
              {data.basis && (
                <p className="text-xs text-slate-400 mt-1">
                  {data.basis === 'gl' ? 'From posted journals' : 'Stored account balances'}
                  {data.check && data.basis === 'gl' ? ` · ${data.check === 'balanced' ? 'Assets = Liabilities + Equity' : 'Review journal mapping (assets vs liabilities + equity)'}` : ''}
                </p>
              )}
            </div>
            <ReportSection title="Assets" items={data.assets?.breakdown || []} total={data.assets?.total} positive />
            <ReportSection title="Liabilities" items={data.liabilities?.breakdown || []} total={data.liabilities?.total} />
            <ReportSection title="Equity" items={data.equity?.breakdown || []} total={data.equity?.total} />
            <ReportDivider label="Total Liabilities + Equity" value={(data.liabilities?.total || 0) + (data.equity?.total || 0)} highlight />
          </div>
        )}

        {reportContentReady && selectedReport === 'vat' && data && (
          <div className="max-w-5xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">VAT schedule</h2>
              <p className="text-sm text-slate-500 mb-1">{formatDate(from)} — {formatDate(to)}</p>
              {data.input?.note && <p className="text-xs text-slate-400">{data.input.note}</p>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-xs text-slate-500">Output VAT</div>
                <div className="text-lg font-bold text-slate-900">{formatCurrency(data.output?.vat || 0)}</div>
                <div className="text-[11px] text-slate-500">{data.output?.documentCount ?? 0} invoices</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-xs text-slate-500">Taxable base (invoices)</div>
                <div className="text-lg font-bold text-slate-900">{formatCurrency(data.output?.taxableBase || 0)}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-xs text-slate-500">Input VAT (vendor bills)</div>
                <div className="text-lg font-bold text-slate-900">{formatCurrency(data.input?.fromVendorBills || 0)}</div>
                <div className="text-[11px] text-slate-500">{data.input?.billCount ?? 0} bills</div>
              </div>
              <div className="bg-amber-50 rounded-xl p-3">
                <div className="text-xs text-amber-800">Net VAT (bills)</div>
                <div className="text-lg font-bold text-amber-900">{formatCurrency(data.netVatBeforeCaps ?? 0)}</div>
                <div className="text-[11px] text-amber-800">Non-negative: {formatCurrency(data.netVatPayable ?? 0)}</div>
              </div>
            </div>
            <div className="text-xs text-slate-500">Received PO VAT (reference): {formatCurrency(data.input?.fromReceivedPurchaseOrders || 0)}</div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Output documents (sample)</div>
                <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-72 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-slate-50 text-xs text-slate-500"><th className="text-left py-2 px-3">Invoice</th><th className="text-left py-2 px-3">Customer</th><th className="text-right py-2 px-3">VAT</th></tr></thead>
                    <tbody>
                      {(data.output?.documents || []).length === 0 && <tr><td colSpan={3} className="py-6 text-center text-slate-400">No invoices in range</td></tr>}
                      {(data.output?.documents || []).map((inv) => (
                        <tr key={inv.id} className="border-t border-slate-50">
                          <td className="py-2 px-3 font-mono text-xs">{inv.invoiceNumber}</td>
                          <td className="py-2 px-3">{inv.customer?.name || '—'}</td>
                          <td className="py-2 px-3 text-right">{formatCurrency(inv.vatAmount || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Input bills (sample)</div>
                <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-72 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-slate-50 text-xs text-slate-500"><th className="text-left py-2 px-3">Bill</th><th className="text-left py-2 px-3">Supplier</th><th className="text-right py-2 px-3">VAT</th></tr></thead>
                    <tbody>
                      {(data.input?.vendorBills || []).length === 0 && <tr><td colSpan={3} className="py-6 text-center text-slate-400">No posted bills in range</td></tr>}
                      {(data.input?.vendorBills || []).map((b) => (
                        <tr key={b.id} className="border-t border-slate-50">
                          <td className="py-2 px-3 font-mono text-xs">{b.billNumber}</td>
                          <td className="py-2 px-3">{b.supplier?.name || '—'}</td>
                          <td className="py-2 px-3 text-right">{formatCurrency(b.vatAmount || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {reportContentReady && selectedReport === 'bva' && !budgetsList.length && (
          <div className="text-center py-10 text-slate-500 text-sm">Create a budget under Finance → Budgets, then return here.</div>
        )}

        {reportContentReady && selectedReport === 'bva' && budgetsList.length > 0 && data && (
          <div className="max-w-5xl space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Budget vs actual</h2>
              <p className="text-sm text-slate-500">
                {data.budget?.name} · {data.budget?.startDate ? formatDate(data.budget.startDate) : ''} — {data.budget?.endDate ? formatDate(data.budget.endDate) : ''}
              </p>
            </div>
            {data.alertSummary && (
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="px-2 py-1 rounded-full bg-red-50 text-red-700 font-semibold">Exceeded: {data.alertSummary.exceeded ?? 0}</span>
                <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-800 font-semibold">Near limit: {data.alertSummary.nearLimit ?? 0}</span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3 max-w-xl">
              <div className="bg-slate-50 rounded-xl p-3"><div className="text-xs text-slate-500">Budgeted</div><div className="text-lg font-bold">{formatCurrency(data.totals?.budgeted || 0)}</div></div>
              <div className="bg-slate-50 rounded-xl p-3"><div className="text-xs text-slate-500">Actual</div><div className="text-lg font-bold">{formatCurrency(data.totals?.actual || 0)}</div></div>
              <div className="bg-slate-50 rounded-xl p-3"><div className="text-xs text-slate-500">Variance</div><div className={cn('text-lg font-bold', (data.totals?.variance || 0) > 0 ? 'text-red-600' : 'text-emerald-700')}>{formatCurrency(data.totals?.variance || 0)}</div></div>
            </div>
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500">
                    <th className="text-left py-2 px-3">Mo</th>
                    <th className="text-left py-2 px-3">Account</th>
                    <th className="text-right py-2 px-3">Budget</th>
                    <th className="text-right py-2 px-3">Actual</th>
                    <th className="text-right py-2 px-3">Var</th>
                    <th className="text-right py-2 px-3">%</th>
                    <th className="text-left py-2 px-3">Alert</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.rows || []).length === 0 && <tr><td colSpan={7} className="py-8 text-center text-slate-400">No budget lines</td></tr>}
                  {(data.rows || []).map((r) => (
                    <tr key={r.id} className="border-t border-slate-50">
                      <td className="py-2 px-3 text-slate-600">{r.month}</td>
                      <td className="py-2 px-3">{r.account?.code} — {r.account?.name}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(r.budgeted)}</td>
                      <td className="py-2 px-3 text-right font-medium">{formatCurrency(r.actual)}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(r.variance)}</td>
                      <td className="py-2 px-3 text-right text-slate-500">{r.utilizationPct ?? 0}%</td>
                      <td className="py-2 px-3">
                        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', r.alertLevel === 'EXCEEDED' ? 'bg-red-50 text-red-700' : r.alertLevel === 'NEAR_LIMIT' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600')}>{r.alertLevel}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportContentReady && selectedReport === 'cf' && data && (
          <div className="max-w-3xl">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Cash Flow (direct)</h2>
            <div className="mb-5">
              <p className="text-sm text-slate-500">{formatDate(from)} — {formatDate(to)}</p>
              {data.note && <p className="text-xs text-slate-400 mt-1">{data.note}</p>}
            </div>
            <div className="flex flex-wrap gap-4 mb-5">
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-xs text-slate-500">Net change (cash / bank)</div>
                <div className="text-xl font-bold text-slate-900">{formatCurrency(data.totalNetCashChange || 0)}</div>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-100">
                  <th className="text-left py-2 font-semibold">Code</th>
                  <th className="text-left py-2 font-semibold">Account</th>
                  <th className="text-right py-2 font-semibold">Opening</th>
                  <th className="text-right py-2 font-semibold">Period</th>
                  <th className="text-right py-2 font-semibold">Closing</th>
                </tr>
              </thead>
              <tbody>
                {(data.cashAccounts || []).length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-400">No cash/bank account movement in range. Add ASSET accounts with subType CASH or BANK (or name containing cash/bank).</td></tr>
                )}
                {(data.cashAccounts || []).map((c) => (
                  <tr key={c.code} className="border-b border-slate-50">
                    <td className="py-2.5 font-mono text-xs text-slate-600">{c.code}</td>
                    <td className="py-2.5 font-medium text-slate-900">{c.name}</td>
                    <td className="py-2.5 text-right">{formatCurrency(c.openingBalance || 0)}</td>
                    <td className="py-2.5 text-right font-semibold">{formatCurrency(c.periodNetChange || 0)}</td>
                    <td className="py-2.5 text-right">{formatCurrency(c.closingBalance || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportContentReady && selectedReport === 'ar' && data && (
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

        {reportContentReady && selectedReport === 'ap' && data && (
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Aged Payables</h2>
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
              <thead><tr className="text-xs text-slate-500 border-b border-slate-100"><th className="text-left py-2 font-semibold">Supplier</th><th className="text-right py-2 font-semibold">Bill #</th><th className="text-right py-2 font-semibold">Amount Due</th><th className="text-right py-2 font-semibold">Due Date</th><th className="text-right py-2 font-semibold">Days Overdue</th></tr></thead>
              <tbody>
                {(data.bills || []).map((b) => {
                  const days = Math.floor((Date.now() - new Date(b.dueDate)) / 86400000);
                  return (
                    <tr key={b.id} className="border-b border-slate-50">
                      <td className="py-2.5">{b.supplier?.name}</td>
                      <td className="py-2.5 text-right text-blue-700 font-medium">{b.billNumber}</td>
                      <td className="py-2.5 text-right font-semibold">{formatCurrency(b.amountDue)}</td>
                      <td className="py-2.5 text-right text-slate-500">{formatDate(b.dueDate)}</td>
                      <td className="py-2.5 text-right text-slate-500">{days > 0 ? String(days) : '0'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {reportContentReady && selectedReport === 'iv' && data && (
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

        {reportContentReady && !isError && !data && selectedReport !== 'bva' && <div className="text-center py-8 text-slate-400">Select a report and click Generate</div>}
        {reportContentReady && !isError && selectedReport === 'bva' && budgetsList.length > 0 && budgetId && !data && (
          <div className="text-center py-8 text-slate-400 text-sm">Variance could not be loaded.</div>
        )}
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
