import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, FileText, User } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

const apiBase = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
  ? String(import.meta.env.VITE_API_URL).replace(/\/?$/, '')
  : '/api';

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export default function EmployeePortalPage() {
  const [params] = useSearchParams();
  const qToken = params.get('t');
  const [manualToken, setManualToken] = useState('');

  useEffect(() => {
    if (qToken) {
      sessionStorage.setItem('employee_portal_token', qToken);
    }
  }, [qToken]);

  const token = useMemo(() => qToken || manualToken || sessionStorage.getItem('employee_portal_token') || '', [qToken, manualToken]);

  const { data: me, isLoading: meLoading, error: meErr } = useQuery({
    queryKey: ['employee-portal-me', token],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/employee-portal/me`, { headers: authHeaders(token) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      return json.data;
    },
    enabled: Boolean(token?.length > 20),
  });

  const { data: payslips, isLoading: slipLoading } = useQuery({
    queryKey: ['employee-portal-payslips', token],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/employee-portal/payslips`, { headers: authHeaders(token) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      return json.data;
    },
    enabled: Boolean(token?.length > 20 && me),
  });

  if (!token || token.length < 20) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md w-full p-8 space-y-4">
          <h1 className="text-lg font-bold text-slate-900">Employee portal</h1>
          <p className="text-sm text-slate-500">
            Paste the access token HR gave you, or open the link they shared (<code className="text-xs bg-slate-100 px-1 rounded">?t=…</code>).
          </p>
          <input
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value.trim())}
            placeholder="Portal token"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <User className="w-6 h-6 text-blue-600" /> My payslips
          </h1>
          {meLoading && (
            <div className="flex items-center gap-2 text-slate-500 py-8">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading…
            </div>
          )}
          {meErr && <p className="text-sm text-red-600 py-4">{meErr.message}</p>}
          {me && !meLoading && (
            <p className="text-sm text-slate-600 mt-2">
              <span className="font-semibold text-slate-900">{me.firstName} {me.lastName}</span>
              <span className="text-slate-400"> · {me.staffId}</span>
              {me.tenantName && <span className="block text-xs text-slate-400 mt-1">{me.tenantName}</span>}
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" /> History
          </div>
          {slipLoading && (
            <div className="p-8 flex justify-center text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
          {!slipLoading && (!payslips || payslips.length === 0) && (
            <p className="p-8 text-center text-sm text-slate-400">No payslips yet.</p>
          )}
          <ul className="divide-y divide-slate-100">
            {(payslips || []).map((p) => (
              <li key={p.id} className="px-5 py-4 flex justify-between items-start gap-4">
                <div>
                  <div className="font-medium text-slate-900">{p.payrollRun?.period || 'Period'}</div>
                  <div className="text-xs text-slate-400">{p.payrollRun?.status}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-700">{formatCurrency(p.netPay)}</div>
                  <div className="text-[10px] text-slate-400">Net pay</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
