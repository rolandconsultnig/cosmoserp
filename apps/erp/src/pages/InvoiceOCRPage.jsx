import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, FileIcon, Loader2, CheckCircle, AlertTriangle, Eye, X } from 'lucide-react';
import api from '../lib/api';
import { formatDate, cn } from '../lib/utils';
import InvoiceManagementNav from '../components/InvoiceManagementNav';

function OCRDetailModal({ ocrRecord, onClose, onValidate }) {
  const [manualEdits, setManualEdits] = useState({});
  const extracted = ocrRecord.extractedData || {};

  const handleValidate = () => {
    onValidate(ocrRecord.id, manualEdits);
  };

  const validateMutation = useMutation({
    mutationFn: (data) =>
      api.put(`/invoices/ocr/${data.ocrId}/validate`, {
        extractedData: { ...extracted, ...data.edits },
        extractedText: ocrRecord.extractedText,
        confidence: ocrRecord.confidence,
      }),
    onSuccess: () => onClose(),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 sticky top-0 bg-white flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900">OCR Data Review</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Confidence Score */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-slate-900">Data Confidence</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${ocrRecord.confidence}%` }}
              />
            </div>
            <p className="text-sm text-slate-600 mt-2">{ocrRecord.confidence}% confidence in extracted data</p>
          </div>

          {/* Extracted Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vendor Name</label>
              <input
                type="text"
                defaultValue={extracted.vendorName || ''}
                onChange={(e) => setManualEdits({ ...manualEdits, vendorName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Number</label>
              <input
                type="text"
                defaultValue={extracted.invoiceNumber || ''}
                onChange={(e) => setManualEdits({ ...manualEdits, invoiceNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Date</label>
              <input
                type="date"
                defaultValue={extracted.invoiceDate || ''}
                onChange={(e) => setManualEdits({ ...manualEdits, invoiceDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
              <input
                type="number"
                defaultValue={extracted.amount || 0}
                onChange={(e) => setManualEdits({ ...manualEdits, amount: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tax Amount</label>
              <input
                type="number"
                defaultValue={extracted.taxAmount || 0}
                onChange={(e) => setManualEdits({ ...manualEdits, taxAmount: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
              <select
                defaultValue={extracted.currency || 'NGN'}
                onChange={(e) => setManualEdits({ ...manualEdits, currency: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="NGN">NGN (Nigerian Naira)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="GBP">GBP (British Pound)</option>
              </select>
            </div>
          </div>

          {/* Extracted Text */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Extracted Text</label>
            <textarea
              readOnly
              value={ocrRecord.extractedText || 'No text extracted'}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-24 text-slate-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-slate-100">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 text-slate-900 rounded-lg font-medium hover:bg-slate-50 transition">
              Cancel
            </button>
            <button
              onClick={() => validateMutation.mutate({ ocrId: ocrRecord.id, edits: manualEdits })}
              disabled={validateMutation.isPending}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              {validateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Validate & Proceed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadOCRModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('document', file);
      return api.post('/invoices/ocr/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (res) => {
      onSuccess?.(res.data.data);
      onClose();
    },
  });

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(`${f.name} (${(f.size / 1024 / 1024).toFixed(2)} MB)`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900">Upload Document</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <label className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition block">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <div className="text-sm font-medium text-slate-700">Drop invoice document here</div>
            <div className="text-xs text-slate-500 mt-1">PDF, JPG, PNG supported</div>
            <input type="file" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" className="hidden" />
          </label>
          {preview && <div className="text-sm text-green-600 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{preview}</div>}
          <div className="flex gap-2 pt-4">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 text-slate-900 rounded-lg font-medium hover:bg-slate-50 transition">
              Cancel
            </button>
            <button
              onClick={() => file && uploadMutation.mutate(file)}
              disabled={!file || uploadMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              {uploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvoiceOCRPage() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedOCR, setSelectedOCR] = useState(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['ocr-records', page],
    queryFn: () => api.get('/invoices/ocr/list', { params: { page, limit: 20 } }).then((r) => r.data),
    keepPreviousData: true,
  });

  const createFromOCRMutation = useMutation({
    mutationFn: (ocrId) => api.post(`/invoices/ocr/${ocrId}/create-invoice`),
    onSuccess: (res) => {
      alert('Invoice created successfully!');
    },
  });

  const records = data?.data || [];
  const pagination = data?.pagination;

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      PROCESSING: 'bg-blue-50 border-blue-200 text-blue-700',
      COMPLETED: 'bg-green-50 border-green-200 text-green-700',
      FAILED: 'bg-red-50 border-red-200 text-red-700',
      MANUAL_REVIEW: 'bg-orange-50 border-orange-200 text-orange-700',
    };
    return colors[status] || 'bg-slate-50 border-slate-200 text-slate-700';
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <InvoiceManagementNav />
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoice Scanning & OCR</h1>
          <p className="page-subtitle">Extract invoice data from documents using OCR technology</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"
        >
          <Upload className="w-4 h-4" /> Scan Document
        </button>
      </div>

      {/* OCR Records */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Recent Scans</h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-slate-500"><FileIcon className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>No documents scanned yet. Upload an invoice to get started.</p></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {records.map((ocr) => (
              <div key={ocr.id} className="p-4 hover:bg-slate-50 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileIcon className="w-4 h-4 text-slate-500" />
                      <p className="font-semibold text-slate-900">{ocr.fileName}</p>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(ocr.ocrStatus)}`}>
                        {ocr.ocrStatus.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">{formatDate(ocr.createdAt)}</p>
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-600">Confidence:</span>
                        <span className="font-semibold text-slate-900">{ocr.confidence}%</span>
                      </div>
                      {ocr.extractedData?.amount && (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-600">Amount:</span>
                          <span className="font-semibold text-slate-900">{ocr.extractedData.currency} {ocr.extractedData.amount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {ocr.ocrStatus === 'COMPLETED' && !ocr.invoiceId && (
                      <button
                        onClick={() => createFromOCRMutation.mutate(ocr.id)}
                        disabled={createFromOCRMutation.isPending}
                        className="px-3 py-1 text-sm bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition"
                      >
                        Create Invoice
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedOCR(ocr)}
                      className="px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> Review
                    </button>
                  </div>
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
          <span className="text-sm text-slate-600">Page {page} of {Math.ceil(pagination.total / pagination.limit)}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page * pagination.limit >= pagination.total}
            className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 text-sm font-medium"
          >
            Next
          </button>
        </div>
      )}

      {/* Modals */}
      {showUploadModal && <UploadOCRModal onClose={() => setShowUploadModal(false)} />}
      {selectedOCR && <OCRDetailModal ocrRecord={selectedOCR} onClose={() => setSelectedOCR(null)} />}
    </div>
  );
}
