import { TrendingDown, Users, DollarSign, AlertTriangle } from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils';

// KPI Card component for all analytics
function KpiCard({ label, value, format, trend, unit }) {
  const formatValue = () => {
    if (format === 'currency') return formatCurrency(value);
    if (format === 'percentage') return `${value}%`;
    if (format === 'number') return value.toLocaleString('en-NG');
    return value;
  };

  return (
    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
      <div className="flex items-start justify-between mb-1">
        <div className="text-xs font-semibold text-slate-600 uppercase">{label}</div>
        {trend && <TrendingDown className="w-3 h-3 text-red-500" />}
      </div>
      <div className="text-lg font-bold text-slate-900">{formatValue()}</div>
      {unit && <div className="text-xs text-slate-500 mt-0.5">{unit}</div>}
    </div>
  );
}

// Simple line trend visualization (text-based)
function TrendChart({ data, dataKey, label }) {
  if (!data || data.length === 0) return null;
  const values = data.map((d) => parseFloat(d[dataKey] || 0));
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">{label}</h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-500">
            <th className="text-left py-1">Month</th>
            <th className="text-right py-1">Value</th>
            <th className="text-left py-1 pl-3">Trend</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const val = parseFloat(row[dataKey] || 0);
            const pct = ((val - min) / range) * 100;
            return (
              <tr key={i} className="border-t border-slate-100">
                <td className="py-2 text-slate-700">{row.month || row.date}</td>
                <td className="py-2 text-right font-semibold text-slate-900">
                  {formatCurrency(val)}
                </td>
                <td className="py-2 pl-3">
                  <div className="flex items-center gap-1">
                    <div
                      className="h-4 bg-blue-300 rounded"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function HRAnalyticsReport({ data, isLoading }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-8 text-slate-400 text-sm">No data available</div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">HR Analytics</h2>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          {(data.metrics || []).map((metric) => (
            <KpiCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              format={metric.format}
              unit={metric.unit}
            />
          ))}
        </div>
      </div>

      {/* Monthly Trend */}
      {data.monthlyTrend && data.monthlyTrend.length > 0 && (
        <TrendChart data={data.monthlyTrend} dataKey="totalGross" label="Monthly Payroll Cost" />
      )}

      {/* Headcount by Department */}
      {data.headcount && data.headcount.length > 0 && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Headcount by Department</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left py-2 font-semibold">Department</th>
                <th className="text-right py-2 font-semibold">Count</th>
                <th className="text-right py-2 font-semibold">Avg Salary</th>
              </tr>
            </thead>
            <tbody>
              {data.headcount.map((row, i) => (
                <tr key={i} className="border-t border-slate-50">
                  <td className="py-2.5 text-slate-700 font-medium">{row.department}</td>
                  <td className="py-2.5 text-right text-slate-900 font-semibold">{row.headcount}</td>
                  <td className="py-2.5 text-right text-slate-700">{formatCurrency(row.avgSalary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Salary Statistics */}
      {data.salaryStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div className="text-xs text-slate-600 font-semibold mb-1">Min Salary</div>
            <div className="text-lg font-bold text-slate-900">{formatCurrency(data.salaryStats.min)}</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div className="text-xs text-slate-600 font-semibold mb-1">Max Salary</div>
            <div className="text-lg font-bold text-slate-900">{formatCurrency(data.salaryStats.max)}</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div className="text-xs text-slate-600 font-semibold mb-1">Avg Salary</div>
            <div className="text-lg font-bold text-slate-900">{formatCurrency(data.salaryStats.avg)}</div>
          </div>
          <div className={cn('bg-slate-50 rounded-xl p-3 border', data.turns.turnoverRate > 10 ? 'border-red-200' : 'border-slate-100')}>
            <div className={cn('text-xs font-semibold mb-1 flex items-center gap-1', data.turns.turnoverRate > 10 ? 'text-red-700' : 'text-slate-600')}>
              {data.turns.turnoverRate > 10 && <AlertTriangle className="w-3 h-3" />}
              Turnover Rate
            </div>
            <div className={cn('text-lg font-bold', data.turns.turnoverRate > 10 ? 'text-red-700' : 'text-slate-900')}>
              {data.turns.turnoverRate}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
