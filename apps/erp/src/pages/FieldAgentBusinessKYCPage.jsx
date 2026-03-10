import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Upload,
  Trash2,
  Loader2,
  Building2,
  CreditCard,
  User,
  FileCheck,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import api from '../lib/api';
import { getStatusColor } from '../lib/utils';

const DOCUMENT_TYPES = [
  { value: 'CAC_CERTIFICATE', label: 'CAC Certificate of Incorporation' },
  { value: 'CAC_PARTICULARS', label: 'CAC Particulars of Directors' },
  { value: 'CAC_FORM', label: 'CAC Form (e.g. CAC2, CAC7)' },
  { value: 'DIRECTOR_ID', label: 'Director/Owner ID (Govt-issued)' },
  { value: 'DIRECTOR_PHOTO', label: 'Director/Owner Passport Photo' },
  { value: 'PROOF_OF_ADDRESS', label: 'Proof of Address' },
  { value: 'UTILITY_BILL', label: 'Utility Bill' },
  { value: 'BANK_STATEMENT', label: 'Bank Statement' },
  { value: 'TAX_CLEARANCE', label: 'Tax Clearance Certificate' },
  { value: 'OTHER', label: 'Other Document' },
];

const ACCEPT_FILES = '.pdf,.jpg,.jpeg,.png,.webp';

export default function FieldAgentBusinessKYCPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');

  const { data: kyc, isLoading } = useQuery({
    queryKey: ['agent-business-kyc', id],
    queryFn: () => api.get(`/agents/businesses/${id}/kyc`).then((r) => r.data.data),
    enabled: !!id,
  });

  const [form, setForm] = useState({
    tin: '',
    rcNumber: '',
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: '',
    bankSortCode: '',
    kycFormData: {},
  });

  useEffect(() => {
    if (!kyc) return;
    setForm((f) => ({
      ...f,
      tin: kyc.tin || '',
      rcNumber: kyc.rcNumber || '',
      bankName: kyc.bankName || '',
      bankAccountNumber: kyc.bankAccountNumber || '',
      bankAccountName: kyc.bankAccountName || '',
      bankSortCode: kyc.bankSortCode || '',
      kycFormData: kyc.kycFormData || {},
    }));
  }, [kyc?.id]);

  const updateFormMutation = useMutation({
    mutationFn: (data) => api.put(`/agents/businesses/${id}/kyc`, data),
    onSuccess: () => qc.invalidateQueries(['agent-business-kyc', id]),
  });

  const submitMutation = useMutation({
    mutationFn: (data) => api.post(`/agents/businesses/${id}/kyc/submit`, data),
    onSuccess: () => {
      qc.invalidateQueries(['agent-business-kyc', id]);
      setSubmitSuccess('KYC submitted for review.');
      setTimeout(() => setSubmitSuccess(''), 5000);
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId) => api.delete(`/agents/businesses/${id}/kyc/documents/${docId}`),
    onSuccess: () => qc.invalidateQueries(['agent-business-kyc', id]),
  });

  const handleSaveForm = (e) => {
    e.preventDefault();
    updateFormMutation.mutate({
      tin: form.tin,
      rcNumber: form.rcNumber,
      bankName: form.bankName,
      bankAccountNumber: form.bankAccountNumber,
      bankAccountName: form.bankAccountName,
      bankSortCode: form.bankSortCode,
      kycFormData: form.kycFormData,
    });
  };

  const handleSubmitKyc = (e) => {
    e.preventDefault();
    submitMutation.mutate({
      tin: form.tin,
      rcNumber: form.rcNumber,
      kycFormData: form.kycFormData,
    });
  };

  const handleFileSelect = async (documentType, file) => {
    if (!file) return;
    setUploadError('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('documentType', documentType);
    try {
      await api.post(`/agents/businesses/${id}/kyc/documents`, fd, {
        headers: { 'Content-Type': undefined },
      });
      qc.invalidateQueries(['agent-business-kyc', id]);
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Upload failed');
    }
  };

  const documents = kyc?.documents || [];
  const canSubmit = kyc?.kycStatus === 'PENDING' || kyc?.kycStatus === 'REJECTED';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link
          to={`/field-agent/businesses/${id}`}
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to business
        </Link>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">KYC for {kyc?.businessName}</h1>
          <p className="text-sm text-slate-500 mt-0.5">Complete verification with CAC documents, IDs, and supporting files.</p>
        </div>
        <span className={`text-sm font-medium px-3 py-1.5 rounded-full ${getStatusColor(kyc?.kycStatus)}`}>
          {kyc?.kycStatus || 'PENDING'}
        </span>
      </div>

      {kyc?.kycRejectionReason && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-amber-800">Previous submission was rejected</div>
            <p className="text-sm text-amber-700 mt-1">{kyc.kycRejectionReason}</p>
          </div>
        </div>
      )}

      {submitSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm">
          {submitSuccess}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-slate-600" />
          <h2 className="font-semibold text-slate-900">Company Information</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div><span className="text-slate-500">Business name</span><div className="font-medium text-slate-900">{kyc?.businessName}</div></div>
          <div><span className="text-slate-500">Email</span><div className="font-medium text-slate-900">{kyc?.email}</div></div>
          <div><span className="text-slate-500">Phone</span><div className="font-medium text-slate-900">{kyc?.phone}</div></div>
          <div className="sm:col-span-2"><span className="text-slate-500">Address</span><div className="font-medium text-slate-900">{[kyc?.address, kyc?.city, kyc?.state].filter(Boolean).join(', ')}</div></div>
        </div>
      </div>

      <form onSubmit={handleSaveForm} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-slate-600" />
          <h2 className="font-semibold text-slate-900">Registration & Bank Details</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">TIN</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={form.tin}
              onChange={(e) => setForm((f) => ({ ...f, tin: e.target.value }))}
              placeholder="Tax Identification Number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">RC Number</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={form.rcNumber}
              onChange={(e) => setForm((f) => ({ ...f, rcNumber: e.target.value }))}
              placeholder="CAC Registration Number"
            />
          </div>
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2 mt-4 mb-2">
              <CreditCard className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Bank Account</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={form.bankName}
              onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={form.bankAccountNumber}
              onChange={(e) => setForm((f) => ({ ...f, bankAccountNumber: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Account Name</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={form.bankAccountName}
              onChange={(e) => setForm((f) => ({ ...f, bankAccountName: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sort Code</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={form.bankSortCode}
              onChange={(e) => setForm((f) => ({ ...f, bankSortCode: e.target.value }))}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={updateFormMutation.isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg disabled:opacity-60"
        >
          {updateFormMutation.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save details
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5 text-slate-600" />
          <h2 className="font-semibold text-slate-900">Documents</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">Upload CAC documents, director IDs, photos, proof of address. PDF or image, max 10MB per file.</p>
        {uploadError && <p className="text-sm text-red-600 mb-3">{uploadError}</p>}

        <div className="space-y-6">
          {DOCUMENT_TYPES.map(({ value, label }) => {
            const docsForType = documents.filter((d) => d.documentType === value);
            return (
              <div key={value} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-slate-500" />
                  <span className="font-medium text-slate-800 text-sm">{label}</span>
                </div>
                <div className="flex flex-wrap gap-3 items-start">
                  {docsForType.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 text-sm"
                    >
                      <FileCheck className="w-4 h-4 text-green-600" />
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-[180px]">
                        {doc.fileName}
                      </a>
                      <button
                        type="button"
                        onClick={() => deleteDocMutation.mutate(doc.id)}
                        disabled={deleteDocMutation.isLoading}
                        className="text-slate-400 hover:text-red-600 p-0.5"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <label className="inline-flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    Add file
                    <input
                      type="file"
                      accept={ACCEPT_FILES}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(value, file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {canSubmit && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <p className="text-sm text-slate-600 mb-4">When ready, submit for CRM verification.</p>
          <form onSubmit={handleSubmitKyc}>
            <button
              type="submit"
              disabled={submitMutation.isLoading}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2.5 rounded-lg disabled:opacity-60"
            >
              {submitMutation.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Submit for KYC review
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
