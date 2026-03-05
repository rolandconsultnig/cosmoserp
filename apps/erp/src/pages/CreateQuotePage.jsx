import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';

const VAT_RATE = 0.075;
const emptyLine = () => ({ description: '', productId: '', quantity: 1, unitPrice: '', vatRate: VAT_RATE, whtRate: 0 });

function calcLine(line) {
  const sub = (parseFloat(line.quantity) || 0) * (parseFloat(line.unitPrice) || 0);
  const vat = sub * (parseFloat(line.vatRate) ?? VAT_RATE);
  return { lineSubtotal: sub, vatAmount: vat, lineTotal: sub + vat };
}

export default function CreateQuotePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ customerId: '', expiryDate: '', currency: 'NGN', notes: '', terms: 'This quotation is valid for 30 days.' });
  const [lines, setLines] = useState([emptyLine()]);
  const [error, setError] = useState('');

  const { data: customers } = useQuery({ queryKey: ['customers-all'], queryFn: () => api.get('/customers', { params: { limit: 100 } }).then((r) => r.data.data) });
  const { data: products } = useQuery({ queryKey: ['products-all'], queryFn: () => api.get('/products', { params: { limit: 200 } }).then((r) => r.data.data) });

  const mutation = useMutation({
    mutationFn: (payload) => api.post('/quotes', payload),
    onSuccess: () => navigate('/quotes'),
    onError: (err) => setError(err.response?.data?.error || 'Failed to create quotation'),
  });

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setLine = (i, k) => (e) => setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, [k]: e.target.value } : l));
  const addLine = () => setLines((ls) => [...ls, emptyLine()]);
  const removeLine = (i) => setLines((ls) => ls.filter((_, idx) => idx !== i));

  const onProductSelect = (i, productId) => {
    const p = products?.find((p) => p.id === productId);
    setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, productId, description: p?.name || l.description, unitPrice: p?.sellingPrice || l.unitPrice, vatRate: p?.vatRate ?? VAT_RATE } : l));
  };

  const totals = lines.reduce((acc, l) => {
    const { lineSubtotal, vatAmount, lineTotal } = calcLine(l);
    return { subtotal: acc.subtotal + lineSubtotal, vat: acc.vat + vatAmount, total: acc.total + lineTotal };
  }, { subtotal: 0, vat: 0, total: 0 });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.customerId) return setError('Please select a customer');
    if (lines.some((l) => !l.description || !l.unitPrice)) return setError('All line items require a description and price');
    mutation.mutate({ ...form, lines: lines.map((l) => ({ ...l, quantity: parseFloat(l.quantity), unitPrice: parseFloat(l.unitPrice), vatRate: parseFloat(l.vatRate), whtRate: parseFloat(l.whtRate) })) });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      <div>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-2"><ArrowLeft className="w-4 h-4" /> Back</button>
        <h1 className="page-title">Create Quotation</h1>
        <p className="page-subtitle">Convert to invoice once customer accepts</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4">Quote Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Customer *</label>
              <select required value={form.customerId} onChange={setF('customerId')} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select customer…</option>
                {(customers || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Expiry Date</label>
              <input type="date" value={form.expiryDate} onChange={setF('expiryDate')} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Currency</label>
              <select value={form.currency} onChange={setF('currency')} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="NGN">NGN — Nigerian Naira (₦)</option>
                <option value="USD">USD — US Dollar ($)</option>
                <option value="GBP">GBP — British Pound (£)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
              <input value={form.notes} onChange={setF('notes')} placeholder="Optional notes" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Line Items</h2>
            <button type="button" onClick={addLine} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"><Plus className="w-4 h-4" /> Add Line</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-100">
                  <th className="text-left py-2 font-semibold w-[35%]">Description</th>
                  <th className="text-left py-2 px-2 font-semibold w-[25%]">Product</th>
                  <th className="text-right py-2 px-2 font-semibold w-[10%]">Qty</th>
                  <th className="text-right py-2 px-2 font-semibold w-[18%]">Unit Price (₦)</th>
                  <th className="text-right py-2 px-2 font-semibold w-[12%]">Line Total</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => {
                  const { lineTotal } = calcLine(line);
                  return (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-2 pr-2"><input value={line.description} onChange={setLine(i, 'description')} placeholder="Description" className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></td>
                      <td className="py-2 px-2">
                        <select value={line.productId} onChange={(e) => onProductSelect(i, e.target.value)} className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">— Select —</option>
                          {(products || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td className="py-2 px-2"><input type="number" min="0.001" step="0.001" value={line.quantity} onChange={setLine(i, 'quantity')} className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" /></td>
                      <td className="py-2 px-2"><input type="number" min="0" step="0.01" value={line.unitPrice} onChange={setLine(i, 'unitPrice')} placeholder="0.00" className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" /></td>
                      <td className="py-2 px-2 text-right font-semibold text-slate-900">{formatCurrency(lineTotal, form.currency)}</td>
                      <td className="py-2 pl-2">{lines.length > 1 && <button type="button" onClick={() => removeLine(i)} className="text-slate-300 hover:text-red-500 transition"><Trash2 className="w-4 h-4" /></button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <div className="w-56 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatCurrency(totals.subtotal, form.currency)}</span></div>
              <div className="flex justify-between text-slate-600"><span>VAT (7.5%)</span><span>{formatCurrency(totals.vat, form.currency)}</span></div>
              <div className="flex justify-between font-bold text-slate-900 text-base border-t border-slate-200 pt-2 mt-2"><span>Total</span><span>{formatCurrency(totals.total, form.currency)}</span></div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)} className="px-5 py-2.5 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="px-6 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg transition flex items-center gap-2">
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {mutation.isPending ? 'Creating…' : 'Create Quotation'}
          </button>
        </div>
      </form>
    </div>
  );
}
