import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Loader2, CheckCircle, AlertCircle, Save } from 'lucide-react';
import api from '../lib/api';
import InvoiceManagementNav from '../components/InvoiceManagementNav';

const FORMAT_EXAMPLES = {
  '{PREFIX}-{NUMBER}-{YEAR}': 'INV-000001-2026',
  '{PREFIX}{MONTH}{YEAR}{NUMBER}': 'INV0426000001',
  '{NUMBER}': '1',
  '{PREFIX}/{NUMBER}': 'INV/1000',
};

export default function InvoiceNumberingPage() {
  const [form, setForm] = useState({
    prefix: 'INV',
    suffix: '',
    formatPattern: '{PREFIX}-{NUMBER}-{YEAR}',
    separator: '-',
    yearFormat: 'YYYY',
    resetFrequency: 'YEARLY',
  });

  const [example, setExample] = useState('INV-000001-2026');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['invoice-numbering'],
    queryFn: () => api.get('/invoices/numbering/config').then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => api.put('/invoices/numbering/config', payload),
    onSuccess: () => {
      qc.invalidateQueries(['invoice-numbering']);
      alert('Invoice numbering configuration updated successfully!');
    },
  });

  useEffect(() => {
    if (data?.data) {
      setForm({
        prefix: data.data.prefix || 'INV',
        suffix: data.data.suffix || '',
        formatPattern: data.data.formatPattern || '{PREFIX}-{NUMBER}-{YEAR}',
        separator: data.data.separator || '-',
        yearFormat: data.data.yearFormat || 'YYYY',
        resetFrequency: data.data.resetFrequency || 'YEARLY',
      });
    }
  }, [data]);

  const updateExample = () => {
    let ex = form.formatPattern;
    ex = ex.replace('{PREFIX}', form.prefix);
    ex = ex.replace('{NUMBER}', '000001');
    ex = ex.replace('{YEAR}', form.yearFormat === 'YYYY' ? '2026' : '26');
    ex = ex.replace('{MONTH}', '04');
    setExample(ex);
  };

  useEffect(updateExample, [form]);

  const setField = (key, value) => {
    setForm({ ...form, [key]: value });
  };

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <InvoiceManagementNav />
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoice Numbering</h1>
          <p className="page-subtitle">Configure your invoice number format and pattern</p>
        </div>
      </div>

      {/* Configuration Card */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-900">Number Format Configuration</h2>
        </div>

        <div className="space-y-6">
          {/* Format Pattern */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Format Pattern</label>
            <select
              value={form.formatPattern}
              onChange={(e) => setField('formatPattern', e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
            >
              {Object.entries(FORMAT_EXAMPLES).map(([pattern, example]) => (
                <option key={pattern} value={pattern}>
                  {pattern} (e.g., {example})
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-2">Available variables: {'{PREFIX}'}, {'{SUFFIX}'}, {'{NUMBER}'}, {'{YEAR}'}, {'{MONTH}'}</p>
          </div>

          {/* Prefix */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Prefix</label>
            <input
              type="text"
              value={form.prefix}
              onChange={(e) => setField('prefix', e.target.value)}
              placeholder="e.g., INV"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
              maxLength="10"
            />
            <p className="text-xs text-slate-500 mt-1">Starting characters for your invoice numbers</p>
          </div>

          {/* Suffix */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Suffix</label>
            <input
              type="text"
              value={form.suffix}
              onChange={(e) => setField('suffix', e.target.value)}
              placeholder="Optional"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
              maxLength="10"
            />
            <p className="text-xs text-slate-500 mt-1">Ending characters for your invoice numbers (optional)</p>
          </div>

          {/* Separator */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Separator Character</label>
            <select
              value={form.separator}
              onChange={(e) => setField('separator', e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="-">Hyphen (-)</option>
              <option value="/">Slash (/)</option>
              <option value=".">Period (.)</option>
              <option value="_">Underscore (_)</option>
              <option value="">None</option>
            </select>
          </div>

          {/* Year Format */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Year Format</label>
            <select
              value={form.yearFormat}
              onChange={(e) => setField('yearFormat', e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="YYYY">Full Year (2026)</option>
              <option value="YY">Short Year (26)</option>
            </select>
          </div>

          {/* Reset Frequency */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Reset Frequency</label>
            <select
              value={form.resetFrequency}
              onChange={(e) => setField('resetFrequency', e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="NONE">Never (Continuous)</option>
              <option value="YEARLY">Yearly (Reset on Jan 1)</option>
              <option value="MONTHLY">Monthly (Reset on 1st)</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">When should the invoice counter reset to 1?</p>
          </div>

          {/* Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-slate-600 mb-2">Preview of next invoice number:</div>
            <div className="bg-white border border-blue-300 rounded px-4 py-3 font-mono text-lg font-semibold text-blue-600">{example}</div>
          </div>

          {/* Current Status */}
          {data?.data?.currentNumber && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Current Number:</span>
                <span className="font-semibold text-slate-900">{data.data.currentNumber}</span>
              </div>
              {data.data.lastResetDate && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Last Reset:</span>
                  <span className="font-semibold text-slate-900">{new Date(data.data.lastResetDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          )}

          {/* Info Box */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Important</p>
              <p>Changes to the format will apply to new invoices only. Existing invoice numbers will not be modified.</p>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
          >
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Configuration
          </button>
        </div>
      </div>

      {/* Quick Reference */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Quick Reference</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-3 rounded-lg">
            <div className="text-xs font-medium text-slate-600 mb-1 uppercase">Variables</div>
            <ul className="text-xs text-slate-700 space-y-1 font-mono">
              <li>{'{PREFIX}'} - Your prefix</li>
              <li>{'{SUFFIX}'} - Your suffix</li>
              <li>{'{NUMBER}'} - Sequential number</li>
              <li>{'{YEAR}'} - Year</li>
              <li>{'{MONTH}'} - Month</li>
            </ul>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg">
            <div className="text-xs font-medium text-slate-600 mb-1 uppercase">Examples</div>
            <ul className="text-xs text-slate-700 space-y-1 font-mono">
              <li>INV-2026-000001</li>
              <li>INV/26/04/0001</li>
              <li>026-0001-ABC</li>
              <li>INV.0001</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
