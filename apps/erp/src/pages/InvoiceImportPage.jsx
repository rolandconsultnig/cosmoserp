import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, FileType, Loader2, CheckCircle, AlertTriangle, RefreshCw, DownloadCloud, X } from 'lucide-react';
import api from '../lib/api';
import { formatDate, cn } from '../lib/utils';
import InvoiceManagementNav from '../components/InvoiceManagementNav';

const IMPORT_TYPES = [
  { value: 'CSV', label: 'CSV File', icon: '📄' },
  { value: 'EXCEL', label: 'Excel Spreadsheet', icon: '📊' },
  { value: 'JSON', label: 'JSON Format', icon: '{}' },
];

function ImportProgressModal({ importRecord, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900">Import Progress</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            {importRecord.status === 'PROCESSING' && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
            {importRecord.status === 'COMPLETED' && <CheckCircle className="w-5 h-5 text-green-600" />}
            {importRecord.status === 'FAILED' && <AlertTriangle className="w-5 h-5 text-red-600" />}
            <div>
              <p className="font-semibold text-slate-900">{importRecord.fileName}</p>
              <p className="text-sm text-slate-500">{(importRecord.fileSize / 1024).toFixed(2)} KB</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Total Records:</span>
              <span className="font-semibold text-slate-900">{importRecord.totalRecords || 0}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Successful:</span>
              <span className="font-semibold text-green-600">{importRecord.successCount || 0}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Failed:</span>
              <span className="font-semibold text-red-600">{importRecord.failureCount || 0}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Duplicates Found:</span>
              <span className="font-semibold text-orange-600">{importRecord.duplicatesFound || 0}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg font-medium transition">
              Close
            </button>
            {importRecord.status === 'FAILED' && (
              <button className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ importType: 'CSV', file: null });
  const [filePreview, setFilePreview] = useState(null);
  const qc = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (payload) => {
      const formData = new FormData();
      formData.append('file', payload.file);
      formData.append('importType', payload.importType);
      return api.post('/invoices/import/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (res) => {
      qc.invalidateQueries(['imports']);
      onSuccess?.(res.data.data);
      onClose();
    },
  });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm({ ...form, file });
      setFilePreview(`${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
    }
  };

  const handleUpload = async () => {
    if (!form.file) return;
    uploadMutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900">Upload Invoices</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* File Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">File Format</label>
            <div className="grid grid-cols-3 gap-2">
              {IMPORT_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setForm({ ...form, importType: type.value })}
                  className={cn(
                    'p-3 border-2 rounded-lg text-center transition',
                    form.importType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <div className="text-lg mb-1">{type.icon}</div>
                  <div className="text-xs font-medium text-slate-900">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* File Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Select File</label>
            <label className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition block">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="text-sm font-medium text-slate-700">Click to upload or drag and drop</div>
              <div className="text-xs text-slate-500 mt-1">Support {form.importType} format</div>
              <input
                type="file"
                onChange={handleFileChange}
                accept={form.importType === 'CSV' ? '.csv' : form.importType === 'EXCEL' ? '.xlsx,.xls' : '.json'}
                className="hidden"
              />
            </label>
            {filePreview && <div className="text-sm text-green-600 mt-2 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{filePreview}</div>}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 text-slate-900 rounded-lg font-medium hover:bg-slate-50 transition">
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!form.file || uploadMutation.isPending}
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

export default function InvoiceImportPage() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedImport, setSelectedImport] = useState(null);
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['imports', page],
    queryFn: () => api.get('/invoices/import/list', { params: { page, limit: 20 } }).then((r) => r.data),
    keepPreviousData: true,
  });

  const retryMutation = useMutation({
    mutationFn: (importId) => api.post(`/invoices/import/${importId}/retry`),
    onSuccess: () => qc.invalidateQueries(['imports']),
  });

  const imports = data?.data || [];
  const pagination = data?.pagination;

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      PROCESSING: 'bg-blue-50 border-blue-200 text-blue-700',
      COMPLETED: 'bg-green-50 border-green-200 text-green-700',
      FAILED: 'bg-red-50 border-red-200 text-red-700',
    };
    return colors[status] || 'bg-slate-50 border-slate-200 text-slate-700';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PROCESSING':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4" />;
      case 'FAILED':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <FileType className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <InvoiceManagementNav />
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoice Import</h1>
          <p className="page-subtitle">Bulk upload invoices from CSV, Excel, or JSON files</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"
        >
          <Upload className="w-4 h-4" /> Upload File
        </button>
      </div>

      {/* Import History */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Import History</h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : imports.length === 0 ? (
          <div className="p-8 text-center text-slate-500"><DownloadCloud className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>No imports yet. Upload your first file to get started.</p></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {imports.map((imp) => (
              <div key={imp.id} className="p-4 hover:bg-slate-50 transition space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg border ${getStatusColor(imp.status)}`}>
                      {getStatusIcon(imp.status)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{imp.fileName}</p>
                      <p className="text-sm text-slate-500">{formatDate(imp.uploadedAt)} • Type: {imp.importType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">{imp.successCount}/{imp.totalRecords}</p>
                      <p className="text-xs text-slate-500">Imported</p>
                    </div>
                  </div>
                </div>
                {imp.duplicatesFound > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-xs text-orange-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> {imp.duplicatesFound} duplicate(s) found
                  </div>
                )}
                {imp.failureCount > 0 && imp.status === 'FAILED' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => retryMutation.mutate(imp.id)}
                      disabled={retryMutation.isPending}
                      className="text-sm px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Retry Import
                    </button>
                  </div>
                )}
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
            className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            Previous
          </button>
          <span className="text-sm text-slate-600">Page {page} of {Math.ceil(pagination.total / pagination.limit)}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page * pagination.limit >= pagination.total}
            className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            Next
          </button>
        </div>
      )}

      {/* Modals */}
      {showUploadModal && <UploadModal onClose={() => setShowUploadModal(false)} onSuccess={(imp) => setSelectedImport(imp)} />}
      {selectedImport && <ImportProgressModal importRecord={selectedImport} onClose={() => setSelectedImport(null)} />}
    </div>
  );
}
