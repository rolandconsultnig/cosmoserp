import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  Wrench, ExternalLink, HeartPulse, FileText, Loader2, CheckCircle2, XCircle,
} from 'lucide-react';
import api from '../lib/api';

const LINKS = [
  { to: '/reports', label: 'Reports & exports', desc: 'P&amp;L, balance sheet, aged receivables, CSV' },
  { to: '/finance', label: 'Chart of accounts', desc: 'GL, journals' },
  { to: '/nrs', label: 'NRS / Tax', desc: 'Compliance & filings' },
  { to: '/settings', label: 'Settings', desc: 'Users, company, integrations' },
  { to: '/support', label: 'Support', desc: 'Tickets & call logs' },
  { to: '/staff-portal', label: 'Staff portal', desc: 'Self-service (linked staff)' },
];

export default function UtilitiesPage() {
  const [ping, setPing] = useState(null);
  const [loading, setLoading] = useState(false);

  const runPing = async () => {
    setLoading(true);
    setPing(null);
    try {
      const { data } = await api.get('/health');
      setPing({ ok: true, data });
    } catch (e) {
      setPing({ ok: false, error: e.response?.data?.error || e.message || 'Failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Wrench className="w-7 h-7 text-slate-600" />
            Utilities
          </h1>
          <p className="page-subtitle">
            Shortcuts, diagnostics, and links to documentation. (Roadmap: exports &amp; bulk tools.)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-indigo-300 hover:shadow transition"
          >
            <div className="font-semibold text-slate-900 flex items-center gap-2">
              {l.label}
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500 mt-1" dangerouslySetInnerHTML={{ __html: l.desc }} />
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
          <HeartPulse className="w-4 h-4 text-emerald-600" />
          API connectivity
        </h2>
        <p className="text-xs text-slate-500 mb-3">
          Checks that the ERP can reach the backend through the dev proxy (<code className="bg-slate-100 px-1 rounded">/api/health</code>).
        </p>
        <button
          type="button"
          onClick={runPing}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Ping API
        </button>
        {ping && (
          <div className="mt-3 flex items-start gap-2 text-sm">
            {ping.ok ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <span className="text-green-800 font-medium">OK</span>
                  <pre className="mt-1 text-xs bg-slate-50 p-2 rounded border border-slate-100 overflow-x-auto">
                    {JSON.stringify(ping.data, null, 2)}
                  </pre>
                </div>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <span className="text-red-700">{ping.error}</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4" />
          Documentation
        </h2>
        <p className="text-xs text-slate-600 mb-3">
          Deployment and feature notes live in the repo <code className="bg-white px-1 rounded border">docs/</code>.
        </p>
        <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
          <li>DEPLOYMENT-UBUNTU-PRODUCTION.md — server setup</li>
          <li>COSMOS-ERP-ROADMAP.md — module roadmap</li>
          <li>STAFF-PORTAL.md — HR / staff portal</li>
        </ul>
      </div>
    </div>
  );
}
