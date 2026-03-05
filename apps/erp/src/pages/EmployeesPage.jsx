import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate, cn } from '../lib/utils';

const nigerianStates = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];

function EmployeeModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', jobTitle: '', department: '',
    employmentType: 'FULL_TIME', hireDate: '', grossSalary: '', bankName: '',
    bankAccountNumber: '', bvn: '', tin: '', pencomPin: '', nhfNumber: '',
    state: 'Lagos',
  });
  const [error, setError] = useState('');
  const mutation = useMutation({
    mutationFn: (d) => api.post('/employees', d),
    onSuccess: () => { qc.invalidateQueries(['employees']); onClose(); },
    onError: (e) => setError(e.response?.data?.error || 'Failed to create employee'),
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Add Employee</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">{error}</div>}

        <div className="space-y-4">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Personal Info</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-slate-600 mb-1">First Name *</label><input required value={form.firstName} onChange={set('firstName')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Last Name *</label><input required value={form.lastName} onChange={set('lastName')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Email</label><input type="email" value={form.email} onChange={set('email')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Phone</label><input value={form.phone} onChange={set('phone')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">State of Origin</label>
                <select value={form.state} onChange={set('state')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {nigerianStates.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Employment</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Job Title *</label><input required value={form.jobTitle} onChange={set('jobTitle')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Department</label><input value={form.department} onChange={set('department')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Employment Type</label>
                <select value={form.employmentType} onChange={set('employmentType')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="FULL_TIME">Full-Time</option>
                  <option value="PART_TIME">Part-Time</option>
                  <option value="CONTRACT">Contract</option>
                </select>
              </div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Hire Date</label><input type="date" value={form.hireDate} onChange={set('hireDate')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Gross Monthly Salary (₦) *</label><input type="number" required value={form.grossSalary} onChange={set('grossSalary')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Bank & Statutory IDs</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Bank Name</label><input value={form.bankName} onChange={set('bankName')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. GTBank" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Account Number</label><input value={form.bankAccountNumber} onChange={set('bankAccountNumber')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">BVN</label><input value={form.bvn} onChange={set('bvn')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">TIN</label><input value={form.tin} onChange={set('tin')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">PenCom PIN</label><input value={form.pencomPin} onChange={set('pencomPin')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">NHF Number</label><input value={form.nhfNumber} onChange={set('nhfNumber')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={() => mutation.mutate({ ...form, grossSalary: parseFloat(form.grossSalary) })} disabled={mutation.isPending}
            className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
            {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Add Employee
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['employees', page, search, department],
    queryFn: () => api.get('/employees', { params: { page, limit: 20, search: search || undefined, department: department || undefined } }).then((r) => r.data),
    keepPreviousData: true,
  });

  const employees = data?.data || [];

  return (
    <div className="space-y-5 animate-fade-in">
      {showCreate && <EmployeeModal onClose={() => setShowCreate(false)} />}
      <div className="page-header">
        <div><h1 className="page-title">Employees</h1><p className="page-subtitle">HR records with Nigerian payroll compliance</p></div>
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"><Plus className="w-4 h-4" /> Add Employee</button>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, staff ID…"
            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <input value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }} placeholder="Filter by department"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left px-5 py-3 font-semibold">Employee</th>
                <th className="text-left px-5 py-3 font-semibold">Staff ID</th>
                <th className="text-left px-5 py-3 font-semibold">Role / Dept</th>
                <th className="text-left px-5 py-3 font-semibold">Type</th>
                <th className="text-right px-5 py-3 font-semibold">Gross Salary</th>
                <th className="text-left px-5 py-3 font-semibold">Hire Date</th>
                <th className="text-left px-5 py-3 font-semibold">Bank</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && [...Array(5)].map((_, i) => (<tr key={i} className="border-b border-slate-50">{[...Array(7)].map((_, j) => <td key={j} className="px-5 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}</tr>))}
              {!isLoading && employees.length === 0 && (<tr><td colSpan={7} className="text-center py-12 text-slate-400">No employees yet. <button onClick={() => setShowCreate(true)} className="text-blue-600">Add your first employee</button></td></tr>)}
              {employees.map((emp) => (
                <tr key={emp.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs flex-shrink-0">
                        {emp.firstName[0]}{emp.lastName[0]}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{emp.firstName} {emp.lastName}</div>
                        <div className="text-xs text-slate-400">{emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{emp.staffId}</td>
                  <td className="px-5 py-3"><div className="text-slate-700">{emp.jobTitle}</div><div className="text-xs text-slate-400">{emp.department}</div></td>
                  <td className="px-5 py-3"><span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', emp.employmentType === 'FULL_TIME' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600')}>{emp.employmentType?.replace('_', ' ')}</span></td>
                  <td className="px-5 py-3 text-right font-semibold">{formatCurrency(emp.grossSalary)}</td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(emp.hireDate)}</td>
                  <td className="px-5 py-3"><div className="text-slate-600 text-xs">{emp.bankName}</div><div className="text-xs text-slate-400 font-mono">{emp.bankAccountNumber ? '•••• ' + emp.bankAccountNumber.slice(-4) : '—'}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.pagination?.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm text-slate-600">
            <span>{data.pagination.total} employees</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">← Prev</button>
              <span className="px-3 py-1">Page {page} of {data.pagination.totalPages}</span>
              <button disabled={!data.pagination.hasMore} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
