import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, TrendingDown, CheckCircle, Loader, AlertCircle } from 'lucide-react';
import apiClient from '../lib/apiClient';

export default function APPaymentSchedulesPage() {
  const queryClient = useQueryClient();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [scheduleForm, setScheduleForm] = useState({
    billId: '',
    segments: [{ amount: '', dueDate: '' }],
    earlyDiscountRate: 0,
    earlyDiscountDeadline: '',
  });

  // Fetch payment schedules
  const { data: schedulesData } = useQuery({
    queryKey: ['payment-schedules', page, filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 20 });
      if (filterStatus) params.append('status', filterStatus);
      const res = await apiClient.get(`/ap/vendor-bills/schedules?${params}`);
      return res.data;
    },
  });

  // Fetch pending bills (for selection in modal)
  const { data: billsData } = useQuery({
    queryKey: ['pending-bills-for-schedules'],
    queryFn: async () => {
      const res = await apiClient.get('/ap/vendor-bills?status=POSTED&limit=100');
      return res.data?.data || [];
    },
  });

  // Create payment schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.post(`/ap/vendor-bills/${data.billId}/payment-schedules`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-schedules'] });
      setShowScheduleModal(false);
      setScheduleForm({
        billId: '',
        segments: [{ amount: '', dueDate: '' }],
        earlyDiscountRate: 0,
        earlyDiscountDeadline: '',
      });
    },
  });

  // Get early payment discount quote
  const { mutate: getDiscountQuote } = useMutation({
    mutationFn: async (scheduleId) => {
      const res = await apiClient.get(`/ap/payment-schedules/${scheduleId}/early-discount-quote`);
      return res.data?.data;
    },
  });

  const schedules = schedulesData?.data || [];

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-50 text-yellow-800 border-yellow-200',
      PAID: 'bg-green-50 text-green-800 border-green-200',
      CANCELLED: 'bg-red-50 text-red-800 border-red-200',
    };
    return colors[status] || colors.PENDING;
  };

  const handleAddSegment = () => {
    setScheduleForm({
      ...scheduleForm,
      segments: [...scheduleForm.segments, { amount: '', dueDate: '' }],
    });
  };

  const handleRemoveSegment = (index) => {
    setScheduleForm({
      ...scheduleForm,
      segments: scheduleForm.segments.filter((_, i) => i !== index),
    });
  };

  const handleSegmentChange = (index, field, value) => {
    const updated = [...scheduleForm.segments];
    updated[index][field] = value;
    setScheduleForm({ ...scheduleForm, segments: updated });
  };

  const totalScheduled = scheduleForm.segments.reduce((sum, seg) => sum + (parseFloat(seg.amount || 0)), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Payment Schedules & Early Discounts</h2>
        <p className="text-gray-600">Manage payment installments and take advantage of early payment opportunities</p>
      </div>

      {/* Action Button */}
      <button
        onClick={() => setShowScheduleModal(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
      >
        <Plus size={18} /> Create Payment Schedule
      </button>

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
          <option value="">All Schedules</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Schedules List */}
      <div className="space-y-3">
        {schedules.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            No payment schedules created yet
          </div>
        ) : (
          schedules.map((schedule) => (
            <div key={schedule.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{schedule.bill?.billNumber}</h3>
                  <p className="text-sm text-gray-600">{schedule.bill?.supplier?.name}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(schedule.status)}`}>
                  {schedule.status}
                </span>
              </div>

              {/* Schedule Details */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-3 gap-4 mb-3 pb-3 border-b border-gray-200">
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Amount Due</p>
                    <p className="text-lg font-bold text-gray-900">
                      ₦{parseFloat(schedule.amount || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Due Date</p>
                    <p className="text-lg font-bold text-gray-900">
                      {new Date(schedule.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Days Until Due</p>
                    <p className={`text-lg font-bold ${
                      (new Date(schedule.dueDate) - new Date()) / (1000 * 60 * 60 * 24) <= 0
                        ? 'text-red-600'
                        : (new Date(schedule.dueDate) - new Date()) / (1000 * 60 * 60 * 24) <= 3
                        ? 'text-orange-600'
                        : 'text-gray-900'
                    }`}>
                      {Math.ceil((new Date(schedule.dueDate) - new Date()) / (1000 * 60 * 60 * 24))}
                    </p>
                  </div>
                </div>

                {/* Early Discount Info */}
                {schedule.earlyDiscountRate && (
                  <div className="flex items-start gap-2 p-2 rounded bg-green-50 border border-green-200">
                    <TrendingDown className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                    <div className="flex-1 text-sm">
                      <p className="font-semibold text-green-900">Early Payment Discount Available</p>
                      <p className="text-green-800">
                        {(schedule.earlyDiscountRate * 100).toFixed(2)}% discount if paid by {new Date(schedule.earlyDiscountDeadline).toLocaleDateString()}
                      </p>
                      <p className="text-green-700 font-semibold mt-1">
                        Save: ₦{(parseFloat(schedule.amount || 0) * schedule.earlyDiscountRate).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Status-based Actions */}
              {schedule.status === 'PENDING' && (
                <div className="flex gap-2">
                  {schedule.earlyDiscountRate && (
                    <button
                      onClick={() => getDiscountQuote(schedule.id)}
                      className="flex-1 px-3 py-2 bg-green-50 text-green-700 border border-green-300 rounded-lg hover:bg-green-100 text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <TrendingDown size={16} /> Pay Now & Save
                    </button>
                  )}
                  <button
                    onClick={() => {
                      // TODO: Mark as paid
                    }}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={16} /> Mark Paid
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Payment Schedule</h3>

            <div className="space-y-4">
              {/* Bill Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bill *</label>
                <select
                  value={scheduleForm.billId}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, billId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Bill</option>
                  {billsData?.map((bill) => (
                    <option key={bill.id} value={bill.id}>
                      {bill.billNumber} - ₦{parseFloat(bill.amountDue || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} due {new Date(bill.dueDate).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Segments */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Payment Segments *</label>
                  <button
                    onClick={handleAddSegment}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Segment
                  </button>
                </div>

                <div className="space-y-2">
                  {scheduleForm.segments.map((segment, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Amount"
                        value={segment.amount}
                        onChange={(e) => handleSegmentChange(idx, 'amount', e.target.value)}
                        min="0"
                        step="0.01"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="date"
                        value={segment.dueDate}
                        onChange={(e) => handleSegmentChange(idx, 'dueDate', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      {scheduleForm.segments.length > 1 && (
                        <button
                          onClick={() => handleRemoveSegment(idx)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-600 mt-2">
                  Total: ₦{totalScheduled.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </p>
              </div>

              {/* Early Payment Discount */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2 mb-3">
                  <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
                  <p className="text-sm text-blue-900 font-medium">Offer early payment discount (optional)</p>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Discount Rate (%)</label>
                    <input
                      type="number"
                      value={(scheduleForm.earlyDiscountRate * 100).toFixed(2)}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, earlyDiscountRate: parseFloat(e.target.value) / 100 })}
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 2.5"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Early Payment Deadline</label>
                    <input
                      type="date"
                      value={scheduleForm.earlyDiscountDeadline}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, earlyDiscountDeadline: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => createScheduleMutation.mutate(scheduleForm)}
                  disabled={createScheduleMutation.isPending || !scheduleForm.billId || scheduleForm.segments.some(s => !s.amount || !s.dueDate)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {createScheduleMutation.isPending ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Calendar size={18} />
                      Create Schedule
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