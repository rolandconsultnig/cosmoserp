import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Percent, Loader2, Plus, Calculator } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';

export default function PromotionPricingPage() {
  const qc = useQueryClient();
  const [ruleForm, setRuleForm] = useState({ name: '', ruleType: 'PERCENT', value: '', minSubtotal: '' });
  const [codeForm, setCodeForm] = useState({ code: '', name: '', ruleType: 'PERCENT', value: '', minSubtotal: '' });
  const [calc, setCalc] = useState({ subtotal: '', promoCode: '' });
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['pricing-rules-codes'],
    queryFn: () => api.get('/pricing').then((r) => r.data.data),
  });
  const rules = data?.rules || [];
  const codes = data?.codes || [];

  const createRuleMut = useMutation({
    mutationFn: (payload) => api.post('/pricing/rules', payload),
    onSuccess: () => {
      setRuleForm({ name: '', ruleType: 'PERCENT', value: '', minSubtotal: '' });
      qc.invalidateQueries({ queryKey: ['pricing-rules-codes'] });
    },
    onError: (e) => setError(e.response?.data?.error || 'Failed to create rule'),
  });

  const createCodeMut = useMutation({
    mutationFn: (payload) => api.post('/pricing/codes', payload),
    onSuccess: () => {
      setCodeForm({ code: '', name: '', ruleType: 'PERCENT', value: '', minSubtotal: '' });
      qc.invalidateQueries({ queryKey: ['pricing-rules-codes'] });
    },
    onError: (e) => setError(e.response?.data?.error || 'Failed to create code'),
  });

  const evalMut = useMutation({
    mutationFn: (payload) => api.post('/pricing/evaluate', payload).then((r) => r.data.data),
    onError: (e) => setError(e.response?.data?.error || 'Failed to evaluate'),
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Percent className="w-7 h-7 text-rose-600" />
            Promotion &amp; pricing rules
          </h1>
          <p className="page-subtitle">Manage discounts, promo codes, and evaluate final pricing.</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3">
          <div className="font-semibold text-slate-900">New pricing rule</div>
          <input value={ruleForm.name} onChange={(e) => setRuleForm((f) => ({ ...f, name: e.target.value }))} placeholder="Rule name" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          <div className="grid grid-cols-3 gap-2">
            <select value={ruleForm.ruleType} onChange={(e) => setRuleForm((f) => ({ ...f, ruleType: e.target.value }))} className="border border-slate-200 rounded-lg px-2 py-2 text-sm">
              <option value="PERCENT">Percent</option>
              <option value="FIXED">Fixed</option>
            </select>
            <input value={ruleForm.value} onChange={(e) => setRuleForm((f) => ({ ...f, value: e.target.value }))} type="number" min="0" step="0.01" placeholder="Value" className="border border-slate-200 rounded-lg px-2 py-2 text-sm" />
            <input value={ruleForm.minSubtotal} onChange={(e) => setRuleForm((f) => ({ ...f, minSubtotal: e.target.value }))} type="number" min="0" step="0.01" placeholder="Min subtotal" className="border border-slate-200 rounded-lg px-2 py-2 text-sm" />
          </div>
          <button
            type="button"
            onClick={() => createRuleMut.mutate({ ...ruleForm, value: parseFloat(ruleForm.value || 0), minSubtotal: ruleForm.minSubtotal ? parseFloat(ruleForm.minSubtotal) : null })}
            disabled={createRuleMut.isPending || !ruleForm.name.trim() || !ruleForm.value}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {createRuleMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add rule
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3">
          <div className="font-semibold text-slate-900">New promo code</div>
          <div className="grid grid-cols-2 gap-2">
            <input value={codeForm.code} onChange={(e) => setCodeForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="Code (e.g. SAVE10)" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <input value={codeForm.name} onChange={(e) => setCodeForm((f) => ({ ...f, name: e.target.value }))} placeholder="Name" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <select value={codeForm.ruleType} onChange={(e) => setCodeForm((f) => ({ ...f, ruleType: e.target.value }))} className="border border-slate-200 rounded-lg px-2 py-2 text-sm">
              <option value="PERCENT">Percent</option>
              <option value="FIXED">Fixed</option>
            </select>
            <input value={codeForm.value} onChange={(e) => setCodeForm((f) => ({ ...f, value: e.target.value }))} type="number" min="0" step="0.01" placeholder="Value" className="border border-slate-200 rounded-lg px-2 py-2 text-sm" />
            <input value={codeForm.minSubtotal} onChange={(e) => setCodeForm((f) => ({ ...f, minSubtotal: e.target.value }))} type="number" min="0" step="0.01" placeholder="Min subtotal" className="border border-slate-200 rounded-lg px-2 py-2 text-sm" />
          </div>
          <button
            type="button"
            onClick={() => createCodeMut.mutate({ ...codeForm, value: parseFloat(codeForm.value || 0), minSubtotal: codeForm.minSubtotal ? parseFloat(codeForm.minSubtotal) : null })}
            disabled={createCodeMut.isPending || !codeForm.code.trim() || !codeForm.value}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {createCodeMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add code
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="font-semibold text-slate-900 flex items-center gap-2"><Calculator className="w-4 h-4" /> Evaluate pricing</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input value={calc.subtotal} onChange={(e) => setCalc((f) => ({ ...f, subtotal: e.target.value }))} type="number" min="0" step="0.01" placeholder="Subtotal" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          <input value={calc.promoCode} onChange={(e) => setCalc((f) => ({ ...f, promoCode: e.target.value.toUpperCase() }))} placeholder="Promo code (optional)" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          <button
            type="button"
            onClick={() => evalMut.mutate({ subtotal: parseFloat(calc.subtotal || 0), promoCode: calc.promoCode || null, items: [] })}
            disabled={evalMut.isPending || calc.subtotal === ''}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
          >
            {evalMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />} Evaluate
          </button>
        </div>
        {evalMut.data && (
          <div className="text-sm text-slate-700 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">Subtotal: <strong>{formatCurrency(evalMut.data.subtotal)}</strong></div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">Discount: <strong>{formatCurrency(evalMut.data.totalDiscount)}</strong></div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">Final: <strong>{formatCurrency(evalMut.data.totalAfterDiscount)}</strong></div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 font-semibold text-slate-900">Pricing rules</div>
          {isLoading ? <div className="p-6 text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div> : (
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-xs text-slate-500"><th className="text-left px-3 py-2 font-semibold">Name</th><th className="text-left px-3 py-2 font-semibold">Type</th><th className="text-right px-3 py-2 font-semibold">Value</th></tr></thead>
              <tbody>
                {rules.length === 0 && <tr><td colSpan={3} className="text-center py-8 text-slate-400">No pricing rules</td></tr>}
                {rules.map((r) => <tr key={r.id} className="border-t border-slate-100"><td className="px-3 py-2">{r.name}</td><td className="px-3 py-2">{r.ruleType}</td><td className="px-3 py-2 text-right">{r.ruleType === 'PERCENT' ? `${r.value}%` : formatCurrency(r.value)}</td></tr>)}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 font-semibold text-slate-900">Promo codes</div>
          {isLoading ? <div className="p-6 text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div> : (
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-xs text-slate-500"><th className="text-left px-3 py-2 font-semibold">Code</th><th className="text-left px-3 py-2 font-semibold">Type</th><th className="text-right px-3 py-2 font-semibold">Value</th></tr></thead>
              <tbody>
                {codes.length === 0 && <tr><td colSpan={3} className="text-center py-8 text-slate-400">No promo codes</td></tr>}
                {codes.map((c) => <tr key={c.id} className="border-t border-slate-100"><td className="px-3 py-2 font-semibold">{c.code}</td><td className="px-3 py-2">{c.ruleType}</td><td className="px-3 py-2 text-right">{c.ruleType === 'PERCENT' ? `${c.value}%` : formatCurrency(c.value)}</td></tr>)}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
