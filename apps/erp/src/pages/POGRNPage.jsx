import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Plus, Edit2, Eye, Loader } from 'lucide-react';
import api from '../lib/api';

export default function POGRNPage() {
  const { poId } = useParams();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [formData, setFormData] = useState({
    warehouseId: '',
    receivedLines: [{ lineId: '', quantity: '', notes: '' }],
    notes: '',
  });

  // Fetch GRNs
  const { data: grnData, isLoading: grnLoading } = useQuery({
    queryKey: ['grns', poId, page, filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 10 });
      if (filterStatus) params.append('status', filterStatus);
      const res = await api.get(`/purchase-orders/${poId}/grns?${params}`);

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

  // Create GRN mutation
  const createGRNMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.post(`/purchase-orders/${poId}/grn`, data);

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grns'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrder', poId] });
      setShowCreateModal(false);
      setFormData({
        warehouseId: '',
        receivedLines: [{ lineId: '', quantity: '', notes: '' }],
        notes: '',
      });
    },
  });

  // Update GRN status mutation
  const updateGRNMutation = useMutation({
    mutationFn: async ({ grnId, status, notes }) => {
      const res = await api.put(`/purchase-orders/${poId}/grn/${grnId}`, { status, notes });

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grns'] });
      setShowDetailModal(false);
    },
  });

  const handleAddLineItem = () => {
    setFormData({
      ...formData,
      receivedLines: [...formData.receivedLines, { lineId: '', quantity: '', notes: '' }],
    });
  };

  const handleRemoveLineItem = (index) => {
    setFormData({
      ...formData,
      receivedLines: formData.receivedLines.filter((_, i) => i !== index),
    });
  };

  const handleLineChange = (index, field, value) => {
    const updated = [...formData.receivedLines];
    updated[index][field] = value;
    setFormData({ ...formData, receivedLines: updated });
  };

  const handleCreateGRN = async () => {
    if (!formData.warehouseId || formData.receivedLines.some((l) => !l.lineId || !l.quantity)) {
      alert('Please fill in all required fields');
      return;
    }
    createGRNMutation.mutate({
      warehouseId: formData.warehouseId,
      receivedLines: formData.receivedLines.map((l) => ({ lineId: l.lineId, quantity: parseInt(l.quantity), notes: l.notes })),
      notes: formData.notes,
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-50 text-yellow-800 border-yellow-200',
      PARTIAL: 'bg-blue-50 text-blue-800 border-blue-200',
      COMPLETE: 'bg-green-50 text-green-800 border-green-200',
      REJECTED: 'bg-red-50 text-red-800 border-red-200',
    };
    return colors[status] || colors.PENDING;
  };

  if (!poId) {
    return <div className="p-4">Select a purchase order to view GRNs</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Goods Received Notes (GRNs)</h2>
        <p className="text-gray-600">Manage goods receipt documentation for {poData?.poNumber}</p>
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
          <option value="PARTIAL">Partial</option>
          <option value="COMPLETE">Complete</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <button
          onClick={() => setShowCreateModal(true)}
          className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={18} /> Create GRN
        </button>
      </div>

      {/* GRNs Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {grnLoading ? (
          <div className="p-8 flex justify-center">
            <Loader className="animate-spin text-gray-400" />
          </div>
        ) : grnData?.data?.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No GRNs created yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">GRN Number</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Receipt Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Lines</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {grnData?.data?.map((grn) => (
                  <tr key={grn.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{grn.grnNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(grn.receiptDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(grn.status)}`}>
                        {grn.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{grn.lines?.length || 0} items</td>
                    <td className="px-6 py-4 text-sm flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedGRN(grn);
                          setShowDetailModal(true);
                        }}
                        className="p-1 text-gray-600 hover:text-blue-600"
                        title="View details"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedGRN(grn);
                          setShowDetailModal(true);
                        }}
                        className="p-1 text-gray-600 hover:text-blue-600"
                        title="Edit GRN"
                      >
                        <Edit2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {grnData?.meta && (
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
            disabled={page >= grnData.meta.totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Create GRN Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Create Goods Received Note</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-white hover:text-gray-200">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Warehouse Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse *</label>
                <select
                  value={formData.warehouseId}
                  onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Warehouse</option>
                  <option value="wh-1">Main Warehouse</option>
                  <option value="wh-2">Branch Warehouse</option>
                </select>
              </div>

              {/* Received Lines */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">Received Line Items *</label>
                  <button
                    onClick={handleAddLineItem}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus size={16} /> Add Line
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.receivedLines.map((line, idx) => (
                    <div key={idx} className="flex gap-3">
                      <select
                        value={line.lineId}
                        onChange={(e) => handleLineChange(idx, 'lineId', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select PO Line Item</option>
                        {poData?.lines?.map((poLine) => (
                          <option key={poLine.id} value={poLine.id}>
                            {poLine.product?.name} (Ordered: {poLine.quantity})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        placeholder="Qty"
                        value={line.quantity}
                        onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Notes"
                        value={line.notes}
                        onChange={(e) => handleLineChange(idx, 'notes', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      {formData.receivedLines.length > 1 && (
                        <button
                          onClick={() => handleRemoveLineItem(idx)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* GRN Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add any notes about this receipt..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGRN}
                  disabled={createGRNMutation.isPending}
                  className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {createGRNMutation.isPending ? 'Creating...' : 'Create GRN'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GRN Detail Modal */}
      {showDetailModal && selectedGRN && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">{selectedGRN.grnNumber} Details</h3>
              <button onClick={() => setShowDetailModal(false)} className="text-white hover:text-gray-200">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* GRN Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">GRN Number</p>
                  <p className="font-semibold text-gray-900">{selectedGRN.grnNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Receipt Date</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(selectedGRN.receiptDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(selectedGRN.status)}`}>
                    {selectedGRN.status}
                  </span>
                </div>
              </div>

              {/* Received Lines */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Received Items</h4>
                <div className="bg-gray-50 rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left">Product</th>
                        <th className="px-4 py-2 text-center">Ordered</th>
                        <th className="px-4 py-2 text-center">Received</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedGRN.lines?.map((line) => (
                        <tr key={line.id}>
                          <td className="px-4 py-2 text-gray-900">{line.poLine?.product?.name}</td>
                          <td className="px-4 py-2 text-center text-gray-600">{line.quantity}</td>
                          <td className="px-4 py-2 text-center text-gray-600">{line.receivedQty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Status Update */}
              {selectedGRN.status !== 'COMPLETE' && (
                <div className="pt-4 border-t border-gray-200">
                  <select
                    value={selectedGRN.status}
                    onChange={(e) => {
                      updateGRNMutation.mutate({
                        grnId: selectedGRN.id,
                        status: e.target.value,
                        notes: selectedGRN.notes,
                      });
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="PARTIAL">Partial</option>
                    <option value="COMPLETE">Complete</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              )}

              {/* Close Button */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="ml-auto px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}