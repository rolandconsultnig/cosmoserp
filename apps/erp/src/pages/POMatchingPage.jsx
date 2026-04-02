import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, AlertCircle, X, ArrowRight, Loader } from 'lucide-react';
import api from '../lib/api';

export default function POMatchingPage() {
  const { poId } = useParams();
  const queryClient = useQueryClient();
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchingType, setMatchingType] = useState('TWO_WAY');
  const [formData, setFormData] = useState({
    invoiceId: '',
    grnId: '',
    matchingDetails: [],
  });
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);

  // Fetch matchings
  const { data: matchingData, isLoading: matchingLoading } = useQuery({
    queryKey: ['matchings', poId, page, filterStatus, filterType],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 10 });
      if (filterStatus) params.append('matchStatus', filterStatus);
      if (filterType) params.append('matchingType', filterType);
      const res = await api.get(`/purchase-orders/${poId}/matchings?${params}`);

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

  // Two-way matching mutation
  const twoWayMatchMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.post(`/purchase-orders/${poId}/match-invoice`, data);

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchings'] });
      setShowMatchModal(false);
      setFormData({ invoiceId: '', grnId: '', matchingDetails: [] });
    },
  });

  // Three-way matching mutation
  const threeWayMatchMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.post(`/purchase-orders/${poId}/match-with-grn`, data);

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchings'] });
      setShowMatchModal(false);
      setFormData({ invoiceId: '', grnId: '', matchingDetails: [] });
    },
  });

  // Approve matching mutation
  const approveMutation = useMutation({
    mutationFn: async ({ matchingId, approvalNotes }) => {
      const res = await api.post(`/purchase-orders/${poId}/matchings/${matchingId}/approve`, { approvalNotes });

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchings'] });
    },
  });

  // Reject matching mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ matchingId, reasonForRejection }) => {
      const res = await api.post(`/purchase-orders/${poId}/matchings/${matchingId}/reject`, { reasonForRejection });

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchings'] });
    },
  });

  const handlePerformMatching = async () => {
    if (!formData.invoiceId) {
      alert('Please select an invoice');
      return;
    }
    if (matchingType === 'THREE_WAY' && !formData.grnId) {
      alert('Please select a GRN for three-way matching');
      return;
    }

    const data = {
      invoiceId: formData.invoiceId,
      ...(matchingType === 'THREE_WAY' && { grnId: formData.grnId }),
      matchingDetails: formData.matchingDetails,
    };

    if (matchingType === 'TWO_WAY') {
      twoWayMatchMutation.mutate(data);
    } else {
      threeWayMatchMutation.mutate(data);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      MATCHED: 'bg-green-50 text-green-800 border-green-200',
      PARTIAL_MATCH: 'bg-yellow-50 text-yellow-800 border-yellow-200',
      UNMATCHED: 'bg-red-50 text-red-800 border-red-200',
      VARIANCE: 'bg-orange-50 text-orange-800 border-orange-200',
      REJECTED: 'bg-red-50 text-red-800 border-red-200',
    };
    return colors[status] || colors.UNMATCHED;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'MATCHED':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'VARIANCE':
        return <AlertCircle className="text-orange-600" size={20} />;
      case 'REJECTED':
        return <X className="text-red-600" size={20} />;
      default:
        return null;
    }
  };

  // Calculate statistics
  const stats = {
    total: matchingData?.meta?.total || 0,
    matched: matchingData?.data?.filter((m) => m.matchStatus === 'MATCHED').length || 0,
    variance: matchingData?.data?.filter((m) => m.matchStatus === 'VARIANCE').length || 0,
    unmatched: matchingData?.data?.filter((m) => m.matchStatus === 'UNMATCHED').length || 0,
  };

  if (!poId) {
    return <div className="p-4">Select a purchase order to view matchings</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">PO Matching Dashboard</h2>
        <p className="text-gray-600">Two-way & three-way matching management for {poData?.poNumber}</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 font-medium">Total Matchings</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 font-medium">Matched</p>
          <p className="text-3xl font-bold text-green-600">{stats.matched}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 font-medium">Variance</p>
          <p className="text-3xl font-bold text-orange-600">{stats.variance}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 font-medium">Unmatched</p>
          <p className="text-3xl font-bold text-red-600">{stats.unmatched}</p>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex gap-4 items-center">
        <select
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          <option value="TWO_WAY">Two-Way Matching</option>
          <option value="THREE_WAY">Three-Way Matching</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="MATCHED">Matched</option>
          <option value="PARTIAL_MATCH">Partial Match</option>
          <option value="VARIANCE">Variance</option>
          <option value="UNMATCHED">Unmatched</option>
          <option value="REJECTED">Rejected</option>
        </select>

        <button
          onClick={() => setShowMatchModal(true)}
          className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Perform Matching
        </button>
      </div>

      {/* Matchings List */}
      <div className="space-y-3">
        {matchingLoading ? (
          <div className="p-8 flex justify-center">
            <Loader className="animate-spin text-gray-400" />
          </div>
        ) : matchingData?.data?.length === 0 ? (
          <div className="p-8 bg-white rounded-lg text-center text-gray-500">
            No matchings performed yet
          </div>
        ) : (
          matchingData?.data?.map((matching) => (
            <div key={matching.id} className="bg-white rounded-lg border border-gray-200 p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getStatusIcon(matching.matchStatus)}
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {matching.po?.poNumber} vs {matching.invoice?.invoiceNumber}
                      {matching.grn && ` vs ${matching.grn.grnNumber}`}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {new Date(matching.createdAt).toLocaleDateString()} at{' '}
                      {new Date(matching.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(matching.matchStatus)}`}>
                    {matching.matchStatus.replace(/_/g, ' ')}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-800 border border-gray-200">
                    {matching.matchingType}
                  </span>
                </div>
              </div>

              {/* Matching Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                {matching.matchingType === 'TWO_WAY' ? (
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">PO Amount</p>
                      <p className="font-semibold text-gray-900">{parseFloat(matching.poAmount || 0).toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}</p>
                      <p className="text-xs text-gray-500">Qty: {matching.poQuantity}</p>
                    </div>
                    <div className="flex justify-center">
                      <ArrowRight className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Invoice Amount</p>
                      <p className="font-semibold text-gray-900">{parseFloat(matching.invoiceAmount || 0).toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}</p>
                      <p className="text-xs text-gray-500">Qty: {matching.invoiceQuantity}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 uppercase tracking-wide">PO</p>
                      <p className="font-semibold text-gray-900">{parseFloat(matching.poAmount || 0).toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}</p>
                      <p className="text-xs text-gray-500">Qty: {matching.poQuantity}</p>
                    </div>
                    <ArrowRight className="text-gray-400" size={20} />
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 uppercase tracking-wide">GRN</p>
                      <p className="font-semibold text-gray-900">{parseFloat(matching.grnAmount || 0).toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}</p>
                      <p className="text-xs text-gray-500">Qty: {matching.grnQuantity}</p>
                    </div>
                    <ArrowRight className="text-gray-400" size={20} />
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Invoice</p>
                      <p className="font-semibold text-gray-900">{parseFloat(matching.invoiceAmount || 0).toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}</p>
                      <p className="text-xs text-gray-500">Qty: {matching.invoiceQuantity}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Variance Info */}
              {matching.variancePercentage && matching.variancePercentage !== '0' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                  <p className="text-sm font-medium text-orange-900">
                    Variance: {parseFloat(matching.variancePercentage).toFixed(2)}%
                  </p>
                  {matching.varianceReason && (
                    <p className="text-sm text-orange-800 mt-1">{matching.varianceReason}</p>
                  )}
                </div>
              )}

              {/* Approval Notes (if approved) */}
              {matching.approvalNotes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-blue-600 font-semibold uppercase">Approval Notes</p>
                  <p className="text-sm text-blue-900">{matching.approvalNotes}</p>
                </div>
              )}

              {/* Actions based on status */}
              {matching.matchStatus === 'VARIANCE' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => approveMutation.mutate({ matchingId: matching.id, approvalNotes: 'Variance approved' })}
                    disabled={approveMutation.isPending}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
                  >
                    {approveMutation.isPending ? 'Approving...' : 'Approve Variance'}
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate({ matchingId: matching.id, reasonForRejection: 'Variance exceeds tolerance' })}
                    disabled={rejectMutation.isPending}
                    className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50"
                  >
                    {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                  </button>
                </div>
              )}

              {matching.matchStatus === 'UNMATCHED' && (
                <button
                  onClick={() => rejectMutation.mutate({ matchingId: matching.id, reasonForRejection: 'No match found' })}
                  disabled={rejectMutation.isPending}
                  className="w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50"
                >
                  {rejectMutation.isPending ? 'Rejecting...' : 'Reject Unmatched'}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {matchingData?.meta && (
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
            disabled={page >= matchingData.meta.totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Matching Modal */}
      {showMatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Perform Matching</h3>
              <button onClick={() => setShowMatchModal(false)} className="text-white hover:text-gray-200">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Matching Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Matching Type *</label>
                <select
                  value={matchingType}
                  onChange={(e) => setMatchingType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="TWO_WAY">Two-Way (PO vs Invoice)</option>
                  <option value="THREE_WAY">Three-Way (PO vs GRN vs Invoice)</option>
                </select>
              </div>

              {/* Invoice Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice *</label>
                <select
                  value={formData.invoiceId}
                  onChange={(e) => setFormData({ ...formData, invoiceId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Invoice</option>
                  <option value="inv-1">INV-001</option>
                  <option value="inv-2">INV-002</option>
                </select>
              </div>

              {/* GRN Selection (for three-way) */}
              {matchingType === 'THREE_WAY' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GRN *</label>
                  <select
                    value={formData.grnId}
                    onChange={(e) => setFormData({ ...formData, grnId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select GRN</option>
                    <option value="grn-1">GRN-2026-00001</option>
                    <option value="grn-2">GRN-2026-00002</option>
                  </select>
                </div>
              )}

              {/* Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  The system will automatically compare quantities and amounts, flagging any variances exceeding 5%
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowMatchModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePerformMatching}
                  disabled={twoWayMatchMutation.isPending || threeWayMatchMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {twoWayMatchMutation.isPending || threeWayMatchMutation.isPending ? 'Processing...' : 'Perform'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}