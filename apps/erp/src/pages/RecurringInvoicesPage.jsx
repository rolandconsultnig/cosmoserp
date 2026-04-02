import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Zap, Calendar, DollarSign, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import InvoiceManagementNav from '../components/InvoiceManagementNav';

const FREQUENCIES = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'SEMI_ANNUAL', label: 'Semi-Annual' },
  { value: 'ANNUAL', label: 'Annually' },
];

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  label: new Date(0, i).toLocaleString('default', { month: 'long' }),
  value: i + 1,
}));

function RecurringFormModal({ recurring, onClose, onSuccess }) {
  const [form, setForm] = useState(
    recurring || {
      templateName: '',
      customerId: '',
      frequency: 'MONTHLY',
      dayOfMonth: 1,
      currency: 'NGN',
      subtotal: 0,
      vatRate: 7.5,
      description: '',
    }
  );

  const qc = useQueryClient();
  const isEdit = !!recurring;

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEdit
        ? api.put(`/invoices/recurring/${recurring.id}`, payload)
        : api.post('/invoices/recurring/create', payload),
    onSuccess: () => {
      qc.invalidateQueries(['recurring-invoices']);
      onSuccess?.();
      onClose();
    },
  });

  const handleSubmit = () => {
    mutation.mutate(form);
  };

  const setField = (key, value) => setForm({ ...form, [key]: value });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900">{isEdit ? 'Edit' : 'Create'} Recurring Invoice</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Template Name</label>
            <input
              type="text"
              value={form.templateName}
              onChange={(e) => setField('templateName', e.target.value)}
              placeholder="e.g., Monthly Retainer"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Frequency</label>
            <select
              value={form.frequency}
              onChange={(e) => setField('frequency', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              {FREQUENCIES.map((freq) => (
                <option key={freq.value} value={freq.value}>
                  {freq.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Day of Month</label>
            <select
              value={form.dayOfMonth}
              onChange={(e) => setField('dayOfMonth', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              {Array.from({ length: 28 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Day {i + 1}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Subtotal</label>
              <input
                type="number"
                value={form.subtotal}
                onChange={(e) => setField('subtotal', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">VAT Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={form.vatRate}
                onChange={(e) => setField('vatRate', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Currency</label>
            <select
              value={form.currency}
              onChange={(e) => setField('currency', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="NGN">NGN (Nigerian Naira)</option>
              <option value="USD">USD (US Dollar)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="GBP">GBP (British Pound)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Invoice description or notes"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-20"
            />
          </div>

          <div className="flex gap-2 pt-4 border-t border-slate-100">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 text-slate-900 rounded-lg font-medium hover:bg-slate-50 transition">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RecurringInvoicesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRecurring, setSelectedRecurring] = useState(null);
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['recurring-invoices', page],
    queryFn: () => api.get('/invoices/recurring/list', { params: { page, limit: 20 } }).then((r) => r.data),
    keepPreviousData: true,
  });

  const generateMutation = useMutation({
    mutationFn: (id) => api.post(`/invoices/recurring/${id}/generate`),
    onSuccess: () => {
      qc.invalidateQueries(['recurring-invoices']);
      alert('Invoice generated successfully!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/invoices/recurring/${id}`),
    onSuccess: () => qc.invalidateQueries(['recurring-invoices']),
  });

  const recurring = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5 animate-fade-in">
      <InvoiceManagementNav />
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Recurring Invoices</h1>
          <p className="page-subtitle">Set up and manage recurring invoice templates</p>
        </div>
        <button
          onClick={() => {
            setSelectedRecurring(null);
            setShowCreateModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : recurring.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600">No recurring invoices yet</p>
          <button
            onClick={() => {
              setSelectedRecurring(null);
              setShowCreateModal(true);
            }}
            className="text-blue-600 hover:text-blue-700 font-medium mt-2"
          >
            Create your first template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recurring.map((rec) => {
            const totalAmount = parseFloat(rec.subtotal) * (1 + parseFloat(rec.vatRate) / 100);
            return (
              <div key={rec.id} className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{rec.templateName}</h3>
                    <p className="text-sm text-slate-500">Every {FREQUENCIES.find((f) => f.value === rec.frequency)?.label}</p>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      rec.isActive
                        ? 'bg-green-50 border border-green-200 text-green-700'
                        : 'bg-slate-100 border border-slate-200 text-slate-600'
                    )}
                  >
                    {rec.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Amount:</span>
                    <span className="font-semibold text-slate-900">
                      {rec.currency} {formatCurrency(totalAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Next Invoice:</span>
                    <span className="font-semibold text-slate-900">{formatDate(rec.nextInvoiceDate)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Generated:</span>
                    <span className="font-semibold text-slate-900">{rec.invoiceCount || 0}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => generateMutation.mutate(rec.id)}
                    disabled={generateMutation.isPending}
                    className="flex-1 px-3 py-2 text-sm bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" /> Generate
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRecurring(rec);
                      setShowCreateModal(true);
                    }}
                    className="flex-1 px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(rec.id)}
                    disabled={deleteMutation.isPending}
                    className="px-3 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && (
        <div className="flex justify-between items-center">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 text-sm font-medium"
          >
            Previous
          </button>
          <span className="text-sm text-slate-600">Page {page}</span>
          <button onClick={() => setPage(page + 1)} className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium">
            Next
          </button>
        </div>
      )}

      {/* Modal */}
      {showCreateModal && (
        <RecurringFormModal
          recurring={selectedRecurring}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedRecurring(null);
          }}
          onSuccess={() => {
            setSelectedRecurring(null);
          }}
        />
      )}
    </div>
  );
}
