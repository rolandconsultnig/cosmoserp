import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Clock, AlertCircle, Loader } from 'lucide-react';
import apiClient from '../lib/apiClient';

export default function APPaymentApprovalsPage() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('PENDING');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [page, setPage] = useState(1);

  // Fetch payments awaiting approval
  const { data: paymentsData } = useQuery({
    queryKey: ['approval-payments', page, filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 20 });
      if (filterStatus) params.append('status', filterStatus);
      const res = await apiClient.get(`/ap/payments-awaiting-approval?${params}`);
      return res.data;
    },
  });

  // Approve payment mutation
  const approveMutation = useMutation({
    mutationFn: async ({ paymentId, note }) => {
      const res = await apiClient.post(`/ap/vendor-bills/payments/${paymentId}/approve`, { note });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-payments'] });
      setSelectedPayment(null);
      setApprovalNotes('');
    },
  });

  // Reject payment mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ paymentId, reason }) => {
      const res = await apiClient.post(`/ap/vendor-bills/payments/${paymentId}/reject`, { reason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-payments'] });
      setSelectedPayment(null);
      setRejectionReason('');
    },
  });

  const payments = paymentsData?.data || [];

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-yellow-50 text-yellow-800 border-yellow-200',
      APPROVED: 'bg-green-50 text-green-800 border-green-200',
      FAILED: 'bg-red-50 text-red-800 border-red-200',
    };
    return styles[status] || styles.PENDING;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Payment Approvals</h2>
        <p className="text-gray-600">Review and authorize pending vendor payments with multi-level approval workflow</p>
      </div>

      {/* Filter */}
      <div className="flex gap-4">
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="PENDING">Pending Approval</option>
          <option value="APPROVED">Approved</option>
          <option value="FAILED">Rejected</option>
          <option value="">All Statuses</option>
        </select>
      </div>

      {/* Approvals List */}
      <div className="space-y-3">
        {payments.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            No {filterStatus === 'PENDING' ? 'pending' : filterStatus.toLowerCase()} payments to display
          </div>
        ) : (
          payments.map((payment) => (
            <div key={payment.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{payment.bill?.billNumber}</h3>
                  <p className="text-sm text-gray-600">{payment.bill?.supplier?.name}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(payment.status)}`}>
                  {payment.status}
                </span>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-4 gap-4 mb-4 pb-4 border-b border-gray-100">
                <div>
                  <p className="text-xs text-gray-600 font-medium">Amount</p>
                  <p className="text-lg font-bold text-gray-900">
                    ₦{parseFloat(payment.amount || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Method</p>
                  <p className="text-lg font-bold text-gray-900">{payment.method}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Currency</p>
                  <p className="text-lg font-bold text-gray-900">{payment.currency || 'NGN'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Due Date</p>
                  <p className="text-lg font-bold text-gray-900">
                    {payment.bill?.dueDate ? new Date(payment.bill.dueDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Approval Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">Approval Progress</p>
                  <span className="text-xs font-semibold text-gray-600">
                    Level {payment.approvalCurrentLevel} of {payment.approvalRequiredLevels}
                  </span>
                </div>
                <div className="flex gap-2">
                  {[...Array(payment.approvalRequiredLevels)].map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-2 rounded-full ${
                        i < payment.approvalCurrentLevel ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Approvals History */}
              {payment.approvals && payment.approvals.length > 0 && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Approval History</p>
                  <div className="space-y-2">
                    {payment.approvals.map((approval, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <p className="font-medium text-gray-900">Level {approval.level} approved</p>
                          <p className="text-gray-600">{approval.approverRole} • {new Date(approval.approvedAt).toLocaleDateString()}</p>
                          {approval.note && <p className="text-gray-700 italic mt-1">"{approval.note}"</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {payment.status === 'PENDING' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedPayment(payment)}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} /> Approve
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPayment(payment);
                      setRejectionReason('');
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                  >
                    <XCircle size={18} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Approval Modal */}
      {selectedPayment && selectedPayment.status === 'PENDING' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {rejectionReason ? 'Reject Payment' : 'Approve Payment'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {selectedPayment.bill?.billNumber} • ₦{parseFloat(selectedPayment.amount || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {rejectionReason ? 'Reason for Rejection' : 'Approval Notes (Optional)'}
                </label>
                <textarea
                  value={rejectionReason || approvalNotes}
                  onChange={(e) => {
                    if (rejectionReason !== null) {
                      setRejectionReason(e.target.value);
                    } else {
                      setApprovalNotes(e.target.value);
                    }
                  }}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={rejectionReason ? 'Explain why this payment is being rejected' : 'Add any notes...'}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedPayment(null);
                    setApprovalNotes('');
                    setRejectionReason('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (rejectionReason) {
                      rejectMutation.mutate({ paymentId: selectedPayment.id, reason: rejectionReason });
                    } else {
                      approveMutation.mutate({ paymentId: selectedPayment.id, note: approvalNotes });
                    }
                  }}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 ${
                    rejectionReason ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {approveMutation.isPending || rejectMutation.isPending ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Processing...
                    </>
                  ) : rejectionReason ? (
                    <>
                      <XCircle size={18} />
                      Reject Payment
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      Approve Payment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}