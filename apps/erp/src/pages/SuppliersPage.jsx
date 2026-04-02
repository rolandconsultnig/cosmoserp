import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X, Loader2, Star, AlertCircle, TrendingUp, CheckCircle, AlertTriangle, Eye, Calendar } from 'lucide-react';
import api from '../lib/api';

const VENDOR_CATEGORIES = [
  { value: 'SUPPLIER', label: 'Supplier' },
  { value: 'CONTRACTOR', label: 'Contractor' },
  { value: 'UTILITY', label: 'Utility' },
  { value: 'SERVICE_PROVIDER', label: 'Service Provider' },
  { value: 'LOGISTICS', label: 'Logistics' },
  { value: 'OTHER', label: 'Other' },
];

const RATING_OPTIONS = [
  { value: 'EXCELLENT', label: 'Excellent', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  { value: 'GOOD', label: 'Good', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { value: 'AVERAGE', label: 'Average', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { value: 'POOR', label: 'Poor', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
];

// ═════════════════════════════════════════════════════════════════
// SUPPLIER DETAILS MODAL - View & Rate Vendors
// ═════════════════════════════════════════════════════════════════
function SupplierDetailsModal({ supplierId, onClose, onEditClick }) {
  const qc = useQueryClient();
  const [newRating, setNewRating] = useState('');
  const [newFeedback, setNewFeedback] = useState('');
  const [ratingError, setRatingError] = useState('');

  const { data: supplier, isLoading } = useQuery({
    queryKey: ['supplier-details', supplierId],
    queryFn: () => api.get(`/suppliers/${supplierId}`).then(r => r.data.data),
    enabled: !!supplierId,
  });

  const rateMutation = useMutation({
    mutationFn: (data) => api.post(`/suppliers/${supplierId}/rate`, data),
    onSuccess: () => {
      qc.invalidateQueries(['suppliers']);
      qc.invalidateQueries(['supplier-details', supplierId]);
      setNewRating('');
      setNewFeedback('');
    },
    onError: (e) => setRatingError(e.response?.data?.error || 'Failed to save rating'),
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-3xl">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        </div>
      </div>
    );
  }

  if (!supplier) return null;

  const ratings = supplier.ratings || [];
  const rating = RATING_OPTIONS.find(r => r.value === supplier.performanceRating);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">{supplier.name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {/* Category */}
          <div className="border rounded-lg p-3">
            <p className="text-xs font-semibold text-slate-500 uppercase">Category</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">
              {VENDOR_CATEGORIES.find(c => c.value === supplier.category)?.label}
            </p>
          </div>
          {/* Status */}
          <div className="border rounded-lg p-3">
            <p className="text-xs font-semibold text-slate-500 uppercase">Status</p>
            <div className="mt-1">
              {supplier.isBlacklisted ? (
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded inline-flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Blacklisted
                </span>
              ) : !supplier.isActive ? (
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">Inactive</span>
              ) : (
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded inline-flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Active
                </span>
              )}
            </div>
          </div>
          {/* Payment Terms */}
          <div className="border rounded-lg p-3">
            <p className="text-xs font-semibold text-slate-500 uppercase">Payment Terms</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">{supplier.paymentTerms} days</p>
          </div>
          {/* Currency */}
          <div className="border rounded-lg p-3">
            <p className="text-xs font-semibold text-slate-500 uppercase">Currency</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">{supplier.currency}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Vendor Information */}
          <div className="space-y-3 border-r pr-6">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Email</p>
              <p className="text-sm text-slate-700">{supplier.email || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Phone</p>
              <p className="text-sm text-slate-700">{supplier.phone || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">TIN</p>
              <p className="text-sm text-slate-700">{supplier.tin || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Address</p>
              <p className="text-sm text-slate-700">
                {supplier.address} {supplier.city && `, ${supplier.city}`} {supplier.state && `, ${supplier.state}`}
              </p>
            </div>
          </div>

          {/* Bank Details */}
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Bank Name</p>
              <p className="text-sm text-slate-700">{supplier.bankName || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Account Number</p>
              <p className="text-sm text-slate-700 font-mono">{supplier.bankAccountNumber || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Account Holder</p>
              <p className="text-sm text-slate-700">{supplier.accountHolderName || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Bank Code</p>
              <p className="text-sm text-slate-700">{supplier.bankCode || '—'}</p>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="border-t border-b py-6 mb-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Performance Metrics
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {/* Overall Rating */}
            <div className={`rounded-lg p-4 ${rating?.bg || 'bg-slate-50'} border ${rating?.border || 'border-slate-200'}`}>
              <p className="text-xs font-semibold text-slate-500 uppercase">Overall Rating</p>
              <div className={`flex items-center gap-2 mt-2 ${rating?.color || 'text-slate-600'}`}>
                <Star className="w-5 h-5 fill-current" />
                <span className="font-bold text-lg">{rating?.label || supplier.performanceRating}</span>
              </div>
            </div>
            {/* Total Orders */}
            <div className="rounded-lg p-4 bg-blue-50 border border-blue-200">
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Orders</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">{supplier.totalOrders || 0}</p>
            </div>
            {/* On-Time Deliveries */}
            <div className="rounded-lg p-4 bg-green-50 border border-green-200">
              <p className="text-xs font-semibold text-slate-500 uppercase">On-Time Delivery</p>
              <p className="text-2xl font-bold text-green-600 mt-2">{supplier.onTimeDeliveries || 0}</p>
            </div>
            {/* Quality Issues */}
            <div className="rounded-lg p-4 bg-red-50 border border-red-200">
              <p className="text-xs font-semibold text-slate-500 uppercase">Quality Issues</p>
              <p className="text-2xl font-bold text-red-600 mt-2">{supplier.qualityIssues || 0}</p>
            </div>
          </div>
        </div>

        {/* Rating History */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Rating History
          </h3>
          {ratings.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No ratings yet.</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {ratings.map((r) => {
                const ratingOpt = RATING_OPTIONS.find(opt => opt.value === r.rating);
                return (
                  <div key={r.id} className={`p-3 rounded-lg border ${ratingOpt?.border} ${ratingOpt?.bg}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className={`w-4 h-4 fill-current ${ratingOpt?.color}`} />
                        <span className={`text-sm font-semibold ${ratingOpt?.color}`}>{ratingOpt?.label}</span>
                      </div>
                      <span className="text-xs text-slate-500">{new Date(r.ratedAt).toLocaleDateString()}</span>
                    </div>
                    {r.feedback && <p className="text-xs text-slate-600 mt-1">{r.feedback}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add New Rating */}
        {!supplier.isBlacklisted && (
          <div className="border rounded-lg p-4 mb-6 bg-slate-50">
            <h4 className="text-sm font-bold text-slate-900 mb-3">Add Performance Rating</h4>
            {ratingError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm mb-3">{ratingError}</div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Rating *</label>
                <select
                  value={newRating}
                  onChange={(e) => setNewRating(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select rating...</option>
                  {RATING_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Feedback</label>
                <textarea
                  value={newFeedback}
                  onChange={(e) => setNewFeedback(e.target.value)}
                  placeholder="Add feedback about this vendor's performance..."
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => rateMutation.mutate({ rating: newRating, feedback: newFeedback })}
                disabled={!newRating || rateMutation.isPending}
                className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {rateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit Rating
              </button>
            </div>
          </div>
        )}

        {/* Blacklist Note */}
        {supplier.isBlacklisted && supplier.blacklistReason && (
          <div className="border border-red-200 bg-red-50 rounded-lg p-4 mb-6">
            <p className="text-xs font-bold text-red-700 uppercase flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4" /> Blacklist Reason
            </p>
            <p className="text-sm text-red-600">{supplier.blacklistReason}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
            Close
          </button>
          <button
            onClick={() => {
              onEditClick();
              onClose();
            }}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Edit Vendor
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// SUPPLIER FORM MODAL - Create & Edit Vendors
// ═════════════════════════════════════════════════════════════════
function SupplierModal({ supplier, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(supplier || {
    name: '', email: '', phone: '', address: '', city: '', state: '', tin: '',
    currency: 'NGN', paymentTerms: 30, category: 'SUPPLIER',
    bankName: '', bankAccountNumber: '', bankCode: '', accountHolderName: '',
    isActive: true, isBlacklisted: false, blacklistReason: '', notes: '',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (d) => supplier ? api.put(`/suppliers/${supplier.id}`, d) : api.post('/suppliers', d),
    onSuccess: () => { qc.invalidateQueries(['suppliers']); onClose(); },
    onError: (e) => setError(e.response?.data?.error || 'Failed'),
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const toggle = (k) => () => setForm(f => ({ ...f, [k]: !f[k] }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 my-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">{supplier ? 'Edit' : 'Add'} Vendor</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">{error}</div>}

        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Basic Info */}
          <div className="border-b pb-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Vendor Name *</label>
                <input required value={form.name} onChange={set('name')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Category *</label>
                <select value={form.category} onChange={set('category')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {VENDOR_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input type="email" value={form.email} onChange={set('email')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                <input value={form.phone} onChange={set('phone')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">TIN</label>
                <input value={form.tin} onChange={set('tin')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
                <input value={form.address} onChange={set('address')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
                <input value={form.city} onChange={set('city')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">State</label>
                <input value={form.state} onChange={set('state')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Payment & Terms */}
          <div className="border-b pb-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Payment Terms & Currency</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Currency</label>
                <select value={form.currency} onChange={set('currency')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="NGN">NGN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Payment Terms (days)</label>
                <input type="number" value={form.paymentTerms} onChange={set('paymentTerms')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Bank Account Details */}
          <div className="border-b pb-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Bank Account & Payment Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Bank Name</label>
                <input value={form.bankName} onChange={set('bankName')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Bank Code</label>
                <input value={form.bankCode} onChange={set('bankCode')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Account Number</label>
                <input value={form.bankAccountNumber} onChange={set('bankAccountNumber')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Account Holder Name</label>
                <input value={form.accountHolderName} onChange={set('accountHolderName')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Vendor Status */}
          <div className="border-b pb-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Vendor Status & Blacklist</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.isActive} onChange={toggle('isActive')} className="rounded" />
                <label className="text-sm text-slate-700">Active vendor</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.isBlacklisted} onChange={toggle('isBlacklisted')} className="rounded" />
                <label className="text-sm text-slate-700">Blacklist vendor</label>
              </div>
              {form.isBlacklisted && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Blacklist Reason</label>
                  <input value={form.blacklistReason} onChange={set('blacklistReason')} placeholder="Reason for blacklisting" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Additional Notes</label>
            <textarea value={form.notes} onChange={set('notes')} rows={3} placeholder="Add any additional notes about this vendor..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="flex gap-3 mt-5 justify-end border-t pt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={() => mutation.mutate(form)} disabled={mutation.isPending || !form.name} className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
            {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Vendor
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// MAIN SUPPLIERS PAGE
// ═════════════════════════════════════════════════════════════════
export default function SuppliersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [detailsId, setDetailsId] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', page, search, filterCategory, filterStatus],
    queryFn: () => api.get('/suppliers', {
      params: { page, limit: 20, search: search || undefined, category: filterCategory || undefined, status: filterStatus || undefined }
    }).then((r) => r.data),
    keepPreviousData: true,
  });

  const { data: editingSupplier } = useQuery({
    queryKey: ['supplier', editingId],
    queryFn: () => editingId ? api.get(`/suppliers/${editingId}`).then(r => r.data.data) : null,
    enabled: !!editingId,
  });

  const suppliers = data?.data || [];
  const totalPages = Math.ceil((data?.total || 0) / 20);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Modals */}
      {(showCreate || editingId) && (
        <SupplierModal
          supplier={editingSupplier}
          onClose={() => {
            setShowCreate(false);
            setEditingId(null);
          }}
        />
      )}

      {detailsId && (
        <SupplierDetailsModal
          supplierId={detailsId}
          onClose={() => setDetailsId(null)}
          onEditClick={() => {
            setEditingId(detailsId);
            setDetailsId(null);
          }}
        />
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Vendor Management</h1>
          <p className="page-subtitle">Manage vendor profiles, ratings, blacklists, and relationships</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Vendor
        </button>
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white rounded-xl border border-slate-100 p-4">
        <div className="md:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search vendors…"
              className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {VENDOR_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blacklisted">Blacklisted</option>
          </select>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
              <th className="text-left px-5 py-3 font-semibold">Vendor</th>
              <th className="text-left px-5 py-3 font-semibold">Category</th>
              <th className="text-left px-5 py-3 font-semibold">Contact</th>
              <th className="text-left px-5 py-3 font-semibold">Rating</th>
              <th className="text-left px-5 py-3 font-semibold">Status</th>
              <th className="text-center px-5 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && [...Array(5)].map((_, i) => (
              <tr key={i} className="border-b border-slate-50">
                {[...Array(6)].map((_, j) => <td key={j} className="px-5 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}
              </tr>
            ))}
            {!isLoading && suppliers.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400">No vendors found. Create one to get started.</td></tr>
            )}
            {suppliers.map((s) => {
              const ratingColor = RATING_OPTIONS.find(r => r.value === s.performanceRating)?.color || 'text-gray-600';
              return (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-900">{s.name}</div>
                    <div className="text-xs text-slate-500">{s.tin || '—'}</div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {VENDOR_CATEGORIES.find(c => c.value === s.category)?.label || s.category}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-slate-600">{s.email || '—'}</div>
                    <div className="text-xs text-slate-400">{s.phone}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className={`flex items-center gap-1 text-sm font-medium ${ratingColor}`}>
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {RATING_OPTIONS.find(r => r.value === s.performanceRating)?.label || s.performanceRating}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {s.isBlacklisted ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">
                        <AlertCircle className="w-3 h-3" /> Blacklisted
                      </span>
                    ) : !s.isActive ? (
                      <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">Inactive</span>
                    ) : (
                      <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">Active</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 justify-center">
                      <button
                        onClick={() => setDetailsId(s.id)}
                        className="text-slate-600 hover:text-blue-600 font-semibold text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50"
                        title="View details"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      <button
                        onClick={() => setEditingId(s.id)}
                        className="text-blue-600 hover:text-blue-700 font-semibold text-xs"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
          >
            ← Prev
          </button>
          <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-sm border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
