import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, XCircle, Eye, X, Loader2, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { formatDate, formatCurrency, cn } from '../lib/utils';
import InvoiceManagementNav from '../components/InvoiceManagementNav';

function DuplicateDetailModal({ duplicate, onClose, onApprove, onReject }) {
  const [notes, setNotes] = useState('');

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/invoices/duplicate/${duplicate.id}/approve`),
    onSuccess: () => {
      onApprove?.();
      onClose();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.post(`/invoices/duplicate/${duplicate.id}/reject`, { notes }),
    onSuccess: () => {
      onReject?.();
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 sticky top-0 bg-white flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900">Review Duplicate</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status */}
          <div
            className={cn(
              'border-2 rounded-lg p-4',
              duplicate.isDuplicate
                ? 'bg-red-50 border-red-200'
                : 'bg-green-50 border-green-200'
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              {duplicate.isDuplicate ? (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
              <span className="font-semibold text-slate-900">
                {duplicate.isDuplicate ? 'Duplicate Detected' : 'Not a Duplicate'}
              </span>
            </div>
            {duplicate.matchConfidence && (
              <div className="text-sm text-slate-700">
                Confidence: {duplicate.matchConfidence}%
              </div>
            )}
          </div>

          {/* Invoice Details */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-slate-900">Invoice Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-600">Vendor Invoice #:</span>
                <div className="font-semibold text-slate-900">{duplicate.vendorInvoiceNo}</div>
              </div>
              <div>
                <span className="text-slate-600">Vendor Name:</span>
                <div className="font-semibold text-slate-900">{duplicate.vendorName}</div>
              </div>
              <div>
                <span className="text-slate-600">Amount:</span>
                <div className="font-semibold text-slate-900">
                  {duplicate.currency} {formatCurrency(duplicate.amount)}
                </div>
              </div>
              <div>
                <span className="text-slate-600">Invoice Date:</span>
                <div className="font-semibold text-slate-900">{formatDate(duplicate.invoiceDate)}</div>
              </div>
            </div>
            {duplicate.matchReason && (
              <div>
                <span className="text-slate-600 text-sm">Match Reason:</span>
                <div className="text-sm text-slate-700 mt-1">{duplicate.matchReason}</div>
              </div>
            )}
          </div>

          {/* Matching Invoice */}
          {duplicate.duplicateOf && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span className="font-semibold text-slate-900">Matches Existing Invoice</span>
              </div>
              <p className="text-sm text-slate-600">ID: {duplicate.duplicateOf}</p>
            </div>
          )}

          {/* Decision Section */}
          {duplicate.checkStatus === 'PENDING' && (
            <>
              <div className="border-t border-slate-200 pt-4">
                <h3 className="font-semibold text-slate-900 mb-3">Your Decision</h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this duplicate check..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-20"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 text-slate-900 rounded-lg font-medium hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button
                  onClick={() => rejectMutation.mutate()}
                  disabled={rejectMutation.isPending}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Not a Duplicate
                </button>
                {duplicate.isDuplicate && (
                  <button
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isPending}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                  >
                    {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Confirm Duplicate
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InvoiceDuplicatesPage() {
  const [selectedDuplicate, setSelectedDuplicate] = useState(null);
  const [tab, setTab] = useState('pending');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['duplicate-checks', page, tab],
    queryFn: () =>
      api
        .get('/invoices/duplicate/list', {
          params: {
            page,
            limit: 20,
            isDuplicate: tab === 'duplicates' ? 'true' : undefined,
            status: tab === 'pending' ? 'PENDING' : undefined,
          },
        })
        .then((r) => r.data),
    keepPreviousData: true,
  });

  const duplicates = data?.data || [];
  const pagination = data?.pagination;

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      VERIFIED: 'bg-blue-50 border-blue-200 text-blue-700',
      APPROVED: 'bg-green-50 border-green-200 text-green-700',
      REJECTED: 'bg-orange-50 border-orange-200 text-orange-700',
    };
    return colors[status] || 'bg-slate-50 border-slate-200 text-slate-700';
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <InvoiceManagementNav />
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Duplicate Detection</h1>
          <p className="page-subtitle">Identify and manage duplicate invoices</p>
        </div>
        <button
          onClick={() => refetch()}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-100 flex p-1">
        {['pending', 'verified', 'duplicates'].map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setPage(1);
            }}
            className={cn(
              'flex-1 px-4 py-2 rounded-lg font-medium transition',
              tab === t ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Duplicates List */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : duplicates.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No invoices found in this category.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {duplicates.map((dup, idx) => (
              <div key={idx} className="p-4 hover:bg-slate-50 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {dup.isDuplicate ? (
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                        <p className="font-semibold text-slate-900">{dup.vendorInvoiceNo}</p>
                      </div>
                      <span
                        className={cn(
                          'px-2 py-1 text-xs font-medium rounded-full border inline-flex items-center gap-1',
                          getStatusColor(dup.checkStatus)
                        )}
                      >
                        {dup.checkStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm text-slate-600 mb-2">
                      <div>
                        Vendor: <span className="font-semibold text-slate-900">{dup.vendorName}</span>
                      </div>
                      <div>
                        Amount: <span className="font-semibold text-slate-900">{dup.currency} {formatCurrency(dup.amount)}</span>
                      </div>
                      <div>
                        Date: <span className="font-semibold text-slate-900">{formatDate(dup.invoiceDate)}</span>
                      </div>
                    </div>

                    {dup.matchConfidence && (
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-24 bg-slate-200 rounded-full h-1">
                          <div
                            className={cn(
                              'h-1 rounded-full',
                              dup.matchConfidence >= 80
                                ? 'bg-red-500'
                                : dup.matchConfidence >= 50
                                ? 'bg-orange-500'
                                : 'bg-green-500'
                            )}
                            style={{ width: `${dup.matchConfidence}%` }}
                          />
                        </div>
                        <span className="text-slate-600">Match: {dup.matchConfidence}%</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedDuplicate(dup)}
                    className="px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" /> Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
          <button
            onClick={() => setPage(page + 1)}
            className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium"
          >
            Next
          </button>
        </div>
      )}

      {/* Modal */}
      {selectedDuplicate && (
        <DuplicateDetailModal
          duplicate={selectedDuplicate}
          onClose={() => setSelectedDuplicate(null)}
          onApprove={() => {
            refetch();
            qc.invalidateQueries(['invoices']);
          }}
          onReject={() => {
            refetch();
            qc.invalidateQueries(['invoices']);
          }}
        />
      )}
    </div>
  );
}
