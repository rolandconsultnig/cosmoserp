import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';
import api from '../lib/api';

export default function POAmendmentsPage() {
  const { poId } = useParams();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [formData, setFormData] = useState({
    amendmentType: '',
    originalValue: '',
    newValue: '',
    reason: '',
  });

  // Fetch amendments
  const { data: amendmentData, isLoading: amendmentLoading } = useQuery({
    queryKey: ['amendments', poId, page, filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 10 });
      if (filterStatus) params.append('status', filterStatus);
      const res = await api.get(`/purchase-orders/${poId}/amendments?${params}`);

      return res.data;
    },
    enabled: !!poId,
  });

  // Fetch PO details
  const { data: poData } = useQuery({
    queryKey: ['purchaseOrder', poId],
    queryFn: async () => {
      const res = await api.get(`/purchase-orders/${poId}`);

      return res.data?.data;
    },
    enabled: !!poId,
  });

  // Create amendment mutation
  const createAmendmentMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.post(`/purchase-orders/${poId}/amendments`, data);

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['amendments'] });
      setShowCreateModal(false);
      setFormData({ amendmentType: '', originalValue: '', newValue: '', reason: '' });
    },
  });

  // Approve amendment mutation
  const approveMutation = useMutation({
    mutationFn: async (amendmentId) => {
      const res = await api.post(`/purchase-orders/${poId}/amendments/${amendmentId}/approve`);

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['amendments'] });
    },
  });

  // Reject amendment mutation
  const rejectMutation = useMutation({
    mutationFn: async (amendmentId) => {
      const res = await api.post(`/purchase-orders/${poId}/amendments/${amendmentId}/reject`);

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['amendments'] });
    },
  });

  // Implement amendment mutation
  const implementMutation = useMutation({
    mutationFn: async (amendmentId) => {
      const res = await api.post(`/purchase-orders/${poId}/amendments/${amendmentId}/implement`);

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['amendments'] });
    },
  });

  const handleCreateAmendment = async () => {
    if (!formData.amendmentType || !formData.originalValue || !formData.newValue) {
      alert('Please fill in all required fields');
      return;
    }
    createAmendmentMutation.mutate(formData);
  };

  const getTypeColor = (type) => {
    const colors = {
      QUANTITY_CHANGE: 'bg-blue-50 text-blue-800 border-blue-200',
      PRICE_CHANGE: 'bg-green-50 text-green-800 border-green-200',
      DATE_CHANGE: 'bg-purple-50 text-purple-800 border-purple-200',
      CANCELLATION: 'bg-red-50 text-red-800 border-red-200',
      OTHER: 'bg-gray-50 text-gray-800 border-gray-200',
    };
    return colors[type] || colors.OTHER;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'REJECTED':
        return <XCircle className="text-red-600" size={20} />;
      case 'PENDING':
        return <AlertCircle className="text-yellow-600" size={20} />;
      case 'IMPLEMENTED':
        return <CheckCircle className="text-blue-600" size={20} />;
      default:
        return null;
    }
  };

  if (!poId) {
    return <div className="p-4">Select a purchase order to view amendments</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Purchase Order Amendments</h2>
        <p className="text-gray-600">Track and manage changes to {poData?.poNumber}</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="IMPLEMENTED">Implemented</option>
        </select>
        <button
          onClick={() => setShowCreateModal(true)}
          className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={18} /> Request Amendment
        </button>
      </div>

      {/* Amendments List */}
      <div className="space-y-3">
        {amendmentLoading ? (
          <div className="p-8 flex justify-center">
            <Loader className="animate-spin text-gray-400" />
          </div>
        ) : amendmentData?.data?.length === 0 ? (
          <div className="p-8 bg-white rounded-lg text-center text-gray-500">
            No amendments for this purchase order
          </div>
        ) : (
          amendmentData?.data?.map((amendment) => (
            <div key={amendment.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getStatusIcon(amendment.status)}
                  <div>
                    <h3 className="font-semibold text-gray-900">{amendment.amendmentNumber}</h3>
                    <p className="text-sm text-gray-600">
                      Created {new Date(amendment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getTypeColor(amendment.amendmentType)}`}>
                  {amendment.amendmentType.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4 py-3 border-y border-gray-100">
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Original Value</p>
                  <p className="font-semibold text-gray-900">{amendment.originalValue}</p>
                </div>
                <div className="flex items-center justify-center">
                  <span className="text-gray-400">→</span>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">New Value</p>
                  <p className="font-semibold text-gray-900">{amendment.newValue}</p>
                </div>
              </div>

              {amendment.reason && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600">
                    <strong>Reason:</strong> {amendment.reason}
                  </p>
                </div>
              )}

              {amendment.approvedAt && (
                <div className="text-xs text-gray-500 mb-3">
                  Approved on {new Date(amendment.approvedAt).toLocaleDateString()}
                </div>
              )}

              {/* Actions based on status */}
              {amendment.status === 'PENDING' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => approveMutation.mutate(amendment.id)}
                    disabled={approveMutation.isPending}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
                  >
                    {approveMutation.isPending ? 'Approving...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate(amendment.id)}
                    disabled={rejectMutation.isPending}
                    className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50"
                  >
                    {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                  </button>
                </div>
              )}

              {amendment.status === 'APPROVED' && (
                <button
                  onClick={() => implementMutation.mutate(amendment.id)}
                  disabled={implementMutation.isPending}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                >
                  {implementMutation.isPending ? 'Implementing...' : 'Implement Amendment'}
                </button>
              )}

              {amendment.status === 'REJECTED' && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-center text-sm text-red-700 font-medium">
                  Amendment Rejected
                </div>
              )}

              {amendment.status === 'IMPLEMENTED' && (
                <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-center text-sm text-green-700 font-medium">
                  Amendment Implemented
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {amendmentData?.meta && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2">Page {page}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= amendmentData.meta.totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Create Amendment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Request Amendment</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-white hover:text-gray-200">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Amendment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amendment Type *</label>
                <select
                  value={formData.amendmentType}
                  onChange={(e) => setFormData({ ...formData, amendmentType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Type</option>
                  <option value="QUANTITY_CHANGE">Quantity Change</option>
                  <option value="PRICE_CHANGE">Price Change</option>
                  <option value="DATE_CHANGE">Delivery Date Change</option>
                  <option value="CANCELLATION">Cancellation</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Original Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Original Value *</label>
                <input
                  type="text"
                  value={formData.originalValue}
                  onChange={(e) => setFormData({ ...formData, originalValue: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 100 units"
                />
              </div>

              {/* New Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Value *</label>
                <input
                  type="text"
                  value={formData.newValue}
                  onChange={(e) => setFormData({ ...formData, newValue: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 80 units"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Explain why this amendment is needed..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAmendment}
                  disabled={createAmendmentMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {createAmendmentMutation.isPending ? 'Creating...' : 'Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}