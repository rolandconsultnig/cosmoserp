import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Clock, AlertCircle, Loader2, Eye, X, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { formatDate, cn } from '../lib/utils';
import InvoiceManagementNav from '../components/InvoiceManagementNav';

function ApprovalDetailModal({ approval, invoice, onClose, onApprove, onReject }) {
  const [action, setAction] = useState(null);
  const [notes, setNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const approveMutation = useMutation({
    mutationFn: (payload) => api.post(`/invoices/${invoice.id}/approval/approve`, payload),
    onSuccess: () => {
      onApprove?.();
      onClose();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (payload) => api.post(`/invoices/${invoice.id}/approval/reject`, payload),
    onSuccess: () => {
      onReject?.();
      onClose();
    },
  });

  const history = Array.isArray(approval.approvalHistory) ? approval.approvalHistory : [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 sticky top-0 bg-white flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900">Approve Invoice</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Invoice Details */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-3">Invoice Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-600">Invoice #:</span>
                <div className="font-semibold text-slate-900">{invoice.invoiceNumber}</div>
              </div>
              <div>
                <span className="text-slate-600">Amount:</span>
                <div className="font-semibold text-slate-900">{invoice.currency} {invoice.totalAmount}</div>
              </div>
              <div>
                <span className="text-slate-600">Customer:</span>
                <div className="font-semibold text-slate-900">{invoice.customer?.name || '-'}</div>
              </div>
              <div>
                <span className="text-slate-600">Issue Date:</span>
                <div className="font-semibold text-slate-900">{formatDate(invoice.issueDate)}</div>
              </div>
            </div>
          </div>

          {/* Approval Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-slate-900">Approval Status</span>
            </div>
            <div className="text-sm text-slate-700">
              Level {approval.approverLevel}/{approval.maxApprovalLevels} of {approval.maxApprovalLevels}
            </div>
          </div>

          {/* Approval History */}
          {history.length > 0 && (
            <div className="border-t border-slate-200 pt-4">
              <h3 className="font-semibold text-slate-900 mb-3">Approval History</h3>
              <div className="space-y-3">
                {history.map((entry, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      {entry.action === 'APPROVED' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="font-medium text-slate-900">{entry.action}</span>
                      <span className="text-xs text-slate-500">{formatDate(entry.timestamp)}</span>
                    </div>
                    {entry.notes && <p className="text-sm text-slate-600">{entry.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions - Show only if approval is PENDING */}
          {approval.workflowStatus === 'PENDING' || approval.workflowStatus === 'IN_REVIEW' ? (
            <>
              {/* Approve Section */}
              <div className="border-t border-slate-200 pt-4">
                <h3 className="font-semibold text-slate-900 mb-3">Approve Invoice</h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add approval notes or comments..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-20"
                  />
                </div>
              </div>

              {/* Reject Section */}
              <div className="border-t border-slate-200 pt-4">
                <h3 className="font-semibold text-slate-900 mb-3">Reject Invoice</h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Rejection Reason (Required)</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Why are you rejecting this invoice?"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-20"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 text-slate-900 rounded-lg font-medium hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button
                  onClick={() => approveMutation.mutate({ notes })}
                  disabled={approveMutation.isPending}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Approve
                </button>
                <button
                  onClick={() => rejectMutation.mutate({ rejectionReason: rejectReason })}
                  disabled={!rejectReason || rejectMutation.isPending}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Reject
                </button>
              </div>
            </>
          ) : (
            <div className="flex gap-2 pt-4 border-t border-slate-100">
              <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 text-slate-900 rounded-lg font-medium hover:bg-slate-50 transition">
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InvoiceApprovalsPage() {
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [tab, setTab] = useState('pending');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pending-approvals', page],
    queryFn: () =>
      api
        .get(tab === 'pending' ? '/invoices/approvals/pending' : '/invoices', {
          params: {
            page,
            limit: 20,
            status: tab === 'approved' ? 'SENT' : 'SENDING',
          },
        })
        .then((r) => r.data),
    keepPreviousData: true,
  });

  const approvals = data?.data || [];
  const pagination = data?.pagination;

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      IN_REVIEW: 'bg-blue-50 border-blue-200 text-blue-700',
      APPROVED: 'bg-green-50 border-green-200 text-green-700',
      REJECTED: 'bg-red-50 border-red-200 text-red-700',
    };
    return colors[status] || 'bg-slate-50 border-slate-200 text-slate-700';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4" />;
      case 'REJECTED':
        return <XCircle className="w-4 h-4" />;
      case 'IN_REVIEW':
        return <RefreshCw className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <InvoiceManagementNav />
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoice Approvals</h1>
          <p className="page-subtitle">Manage and review invoices awaiting approval</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-100 flex p-1">
        {['pending', 'approved', 'rejected'].map((t) => (
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

      {/* Approvals List */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : approvals.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No invoices found in this category.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {approvals.map((approval, idx) => {
              const invoice = approval.invoiceId ? { ...approval, id: approval.invoiceId } : approval;
              return (
                <div key={idx} className="p-4 hover:bg-slate-50 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold text-slate-900">{invoice.invoiceNumber || 'Invoice'}</p>
                        <span
                          className={cn(
                            'px-2 py-1 text-xs font-medium rounded-full border inline-flex items-center gap-1',
                            getStatusColor(approval.workflowStatus)
                          )}
                        >
                          {getStatusIcon(approval.workflowStatus)}
                          {approval.workflowStatus.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 mb-2">
                        <div>Customer: <span className="font-semibold text-slate-900">{invoice.customer?.name || '-'}</span></div>
                        <div>Amount: <span className="font-semibold text-slate-900">{invoice.currency} {invoice.totalAmount}</span></div>
                      </div>
                      {approval.approverLevel && (
                        <div className="text-xs text-slate-500">
                          Approval Level: {approval.approverLevel}/{approval.maxApprovalLevels}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedApproval(approval);
                        setSelectedInvoice(invoice);
                      }}
                      className="px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> Review
                    </button>
                  </div>
                </div>
              );
            })}
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
      {selectedApproval && selectedInvoice && (
        <ApprovalDetailModal
          approval={selectedApproval}
          invoice={selectedInvoice}
          onClose={() => {
            setSelectedApproval(null);
            setSelectedInvoice(null);
          }}
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
