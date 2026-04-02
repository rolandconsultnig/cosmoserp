import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Send, Clock, CheckCircle, AlertCircle, TrendingDown, Zap, Loader } from 'lucide-react';
import apiClient from '../lib/apiClient';

export default function APPaymentProcessingPage() {
  const queryClient = useQueryClient();
  const [showSinglePayment, setShowSinglePayment] = useState(false);
  const [showBatchRun, setShowBatchRun] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [page, setPage] = useState(1);
  const [singlePaymentForm, setSinglePaymentForm] = useState({
    billId: '',
    amount: '',
    method: 'BANK_TRANSFER',
    reference: '',
    notes: '',
  });
  const [batchForm, setBatchForm] = useState({
    paymentMethod: 'BANK_TRANSFER',
    includeEarlyDiscount: true,
    prioritize: 'DUE_DATE', // DUE_DATE, AMOUNT_DESC, AMOUNT_ASC
    maxPayments: 50,
    notes: '',
  });

  // Fetch pending payments
  const { data: paymentsData } = useQuery({
    queryKey: ['pending-payments', page, filterStatus, filterMethod],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 20 });
      if (filterStatus) params.append('status', filterStatus);
      if (filterMethod) params.append('method', filterMethod);
      const res = await apiClient.get(`/ap/pending-payments?${params}`);
      return res.data;
    },
  });

  // Fetch due alerts
  const { data: dueAlerts } = useQuery({
    queryKey: ['due-payment-alerts'],
    queryFn: async () => {
      const res = await apiClient.get('/ap/payment-schedules/due-alerts');
      return res.data?.data || [];
    },
  });

  // Fetch payment stats
  const { data: paymentStats } = useQuery({
    queryKey: ['payment-processing-stats'],
    queryFn: async () => {
      const res = await apiClient.get('/ap/payment-stats');
      return res.data?.data || {};
    },
  });

  // Single payment mutation
  const singlePaymentMutation = useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.post('/ap/vendor-bills/${data.billId}/payments', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-processing-stats'] });
      setShowSinglePayment(false);
      setSinglePaymentForm({
        billId: '',
        amount: '',
        method: 'BANK_TRANSFER',
        reference: '',
        notes: '',
      });
    },
  });

  // Batch payment run mutation
  const batchRunMutation = useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.post('/ap/payment-runs/execute', data);
      return res.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-processing-stats'] });
      setShowBatchRun(false);
      alert(`Batch payment run completed: ${result.data?.processedCount || 0} payments processed`);
    },
  });

  // Auto-execute mutation
  const autoExecuteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/ap/payment-runs/auto-execute', {});
      return res.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-processing-stats'] });
      alert(`Auto-execution completed: ${result.data?.processedCount || 0} scheduled payments processed`);
    },
  });

  const stats = paymentStats || {};
  const payments = paymentsData?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Payment Processing</h2>
        <p className="text-gray-600">Manage vendor payments, batch runs, and payment approvals</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 font-medium">Pending Payments</p>
          <p className="text-3xl font-bold text-yellow-600">{stats.pendingCount || 0}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.pendingAmount ? `₦ ${parseFloat(stats.pendingAmount).toLocaleString('en-US', { maximumFractionDigits: 2 })}` : 'N/A'}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 font-medium">Due Today</p>
          <p className="text-3xl font-bold text-red-600">{dueAlerts?.filter(a => a.daysUntilDue <= 0).length || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Requires immediate payment</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 font-medium">Early Discounts Available</p>
          <p className="text-3xl font-bold text-green-600">{stats.earlyDiscountCount || 0}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.potentialSavings ? `Save ₦ ${parseFloat(stats.potentialSavings).toLocaleString('en-US', { maximumFractionDigits: 2 })}` : 'N/A'}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 font-medium">Awaiting Approval</p>
          <p className="text-3xl font-bold text-blue-600">{stats.awaitingApprovalCount || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Multi-level authorization pending</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowSinglePayment(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Send size={18} /> Single Payment
        </button>
        <button
          onClick={() => setShowBatchRun(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <Zap size={18} /> Batch Payment Run
        </button>
        <button
          onClick={() => autoExecuteMutation.mutate()}
          disabled={autoExecuteMutation.isPending}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50"
        >
          {autoExecuteMutation.isPending ? <Loader size={18} className="animate-spin" /> : <Clock size={18} />}
          Auto-Execute Scheduled
        </button>
      </div>

      {/* Due Payment Alerts */}
      {dueAlerts && dueAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Payment Due Alerts</h3>
              <p className="text-sm text-red-800 mt-1">
                {dueAlerts.filter(a => a.daysUntilDue <= 0).length} payment(s) are overdue
              </p>
              <div className="mt-2 space-y-1">
                {dueAlerts.slice(0, 3).map((alert) => (
                  <p key={alert.id} className="text-xs text-red-700">
                    • {alert.billNumber} - ₦{parseFloat(alert.amount).toLocaleString('en-US', { maximumFractionDigits: 2 })} 
                    {alert.daysUntilDue <= 0 ? ` (${Math.abs(alert.daysUntilDue)} days overdue)` : ` (due in ${alert.daysUntilDue} day(s))`}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="SUCCESS">Processed</option>
          <option value="FAILED">Failed</option>
        </select>
        <select
          value={filterMethod}
          onChange={(e) => {
            setFilterMethod(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Methods</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="CHEQUE">Cheque</option>
          <option value="MOBILE_MONEY">Mobile Money</option>
        </select>
      </div>

      {/* Pending Payments Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Bill #</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Supplier</th>
              <th className="px-6 py-3 text-right font-semibold text-gray-700">Amount</th>
              <th className="px-6 py-3 text-center font-semibold text-gray-700">Method</th>
              <th className="px-6 py-3 text-center font-semibold text-gray-700">Status</th>
              <th className="px-6 py-3 text-center font-semibold text-gray-700">Days Until Due</th>
              <th className="px-6 py-3 text-center font-semibold text-gray-700">Approval Level</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-medium text-gray-900">{payment.bill?.billNumber}</td>
                <td className="px-6 py-3 text-gray-600">{payment.bill?.supplier?.name}</td>
                <td className="px-6 py-3 text-right font-semibold text-gray-900">
                  ₦{parseFloat(payment.amount || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-3 text-center">
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">
                    {payment.method}
                  </span>
                </td>
                <td className="px-6 py-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    payment.status === 'PENDING' ? 'bg-yellow-50 text-yellow-800' :
                    payment.status === 'SUCCESS' ? 'bg-green-50 text-green-800' :
                    payment.status === 'FAILED' ? 'bg-red-50 text-red-800' :
                    'bg-blue-50 text-blue-800'
                  }`}>
                    {payment.status}
                  </span>
                </td>
                <td className="px-6 py-3 text-center">
                  <span className={`text-xs font-medium ${
                    payment.daysUntilDue <= 0 ? 'text-red-600 font-bold' :
                    payment.daysUntilDue <= 3 ? 'text-orange-600' :
                    'text-gray-600'
                  }`}>
                    {payment.daysUntilDue <= 0 ? `${Math.abs(payment.daysUntilDue)}d overdue` : `${payment.daysUntilDue}d`}
                  </span>
                </td>
                <td className="px-6 py-3 text-center text-xs">
                  {payment.approvalCurrentLevel}/{payment.approvalRequiredLevels}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Single Payment Modal */}
      {showSinglePayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Record Payment</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bill *</label>
                <select
                  value={singlePaymentForm.billId}
                  onChange={(e) => setSinglePaymentForm({ ...singlePaymentForm, billId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Bill</option>
                  {payments.map((p) => (
                    <option key={p.id} value={p.billId}>
                      {p.bill?.billNumber} - ₦{parseFloat(p.bill?.amountDue || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input
                  type="number"
                  value={singlePaymentForm.amount}
                  onChange={(e) => setSinglePaymentForm({ ...singlePaymentForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                <select
                  value={singlePaymentForm.method}
                  onChange={(e) => setSinglePaymentForm({ ...singlePaymentForm, method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                <input
                  type="text"
                  value={singlePaymentForm.reference}
                  onChange={(e) => setSinglePaymentForm({ ...singlePaymentForm, reference: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Transaction reference"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={singlePaymentForm.notes}
                  onChange={(e) => setSinglePaymentForm({ ...singlePaymentForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowSinglePayment(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => singlePaymentMutation.mutate(singlePaymentForm)}
                  disabled={singlePaymentMutation.isPending || !singlePaymentForm.billId || !singlePaymentForm.amount}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {singlePaymentMutation.isPending ? 'Processing...' : 'Record Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Payment Run Modal */}
      {showBatchRun && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Batch Payment Run</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                <select
                  value={batchForm.paymentMethod}
                  onChange={(e) => setBatchForm({ ...batchForm, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prioritize by</label>
                <select
                  value={batchForm.prioritize}
                  onChange={(e) => setBatchForm({ ...batchForm, prioritize: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DUE_DATE">Due Date (Earliest First)</option>
                  <option value="AMOUNT_DESC">Amount (Largest First)</option>
                  <option value="AMOUNT_ASC">Amount (Smallest First)</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="earlyDiscount"
                  checked={batchForm.includeEarlyDiscount}
                  onChange={(e) => setBatchForm({ ...batchForm, includeEarlyDiscount: e.target.checked })}
                  className="w-4 h-4 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="earlyDiscount" className="text-sm font-medium text-gray-700">
                  Apply early payment discounts
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Payments</label>
                <input
                  type="number"
                  value={batchForm.maxPayments}
                  onChange={(e) => setBatchForm({ ...batchForm, maxPayments: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={batchForm.notes}
                  onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowBatchRun(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => batchRunMutation.mutate(batchForm)}
                  disabled={batchRunMutation.isPending}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {batchRunMutation.isPending ? 'Processing...' : 'Execute Batch'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}