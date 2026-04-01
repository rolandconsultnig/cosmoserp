import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Loader2, ExternalLink } from 'lucide-react';
import { logisticsJson, absoluteUploadUrl, mapsSearchUrl } from '../lib/logisticsApi';

export default function LogisticsAgentDocumentsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await logisticsJson('/logistics/agent/deliveries?page=1&limit=80&status=DELIVERED');
      setRows(res.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const withPod = rows.filter((r) => r.proofOfDelivery);

  return (
    <div className="p-6 overflow-y-auto h-full space-y-6">
      <div>
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-400" />
          My documents
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Proof of delivery for completed drops. Upload from{' '}
          <Link to="/logistics/deliveries" className="text-blue-400 font-semibold hover:underline">My deliveries</Link>.
        </p>
      </div>

      <div className="flex gap-4 text-sm">
        <span className="text-slate-400">Completed jobs: <strong className="text-white">{rows.length}</strong></span>
        <span className="text-slate-400">With POD: <strong className="text-white">{withPod.length}</strong></span>
      </div>

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 px-4 py-3 text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 py-10">
          <Loader2 className="w-6 h-6 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">No completed deliveries yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border px-4 py-3 flex flex-wrap items-center justify-between gap-2"
              style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}
            >
              <div>
                <span className="font-mono text-sm text-white">{r.trackingNumber}</span>
                <span className="text-xs text-slate-500 ml-2">{r.customerName}</span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                {r.proofOfDelivery ? (
                  <a
                    href={absoluteUploadUrl(r.proofOfDelivery)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-blue-400 inline-flex items-center gap-1 hover:underline"
                  >
                    Proof <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-slate-600">No proof</span>
                )}
                {mapsSearchUrl(r.deliveryAddress) && (
                  <a href={mapsSearchUrl(r.deliveryAddress)} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-400">
                    Map
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
