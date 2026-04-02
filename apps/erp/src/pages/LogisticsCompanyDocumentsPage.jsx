import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Loader2, ExternalLink, Package } from 'lucide-react';
import { logisticsJson, absoluteUploadUrl, mapsSearchUrl } from '../lib/logisticsApi';

export default function LogisticsCompanyDocumentsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await logisticsJson('/logistics/company/deliveries?page=1&limit=100');
      setRows(res.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const withPod = rows.filter((r) => r.proofOfDelivery);
  const delivered = rows.filter((r) => r.status === 'DELIVERED');

  return (
    <div className="p-6 overflow-y-auto h-full space-y-6">
      <div>
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-400" />
          Documentation
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Proof-of-delivery files uploaded by drivers, tracking references, and quick links to routes. Seller-side tax invoices and BOLs stay in the ERP tenant or marketplace order flows.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { label: 'Jobs on file', value: rows.length },
          { label: 'With proof uploaded', value: withPod.length },
          { label: 'Completed', value: delivered.length },
        ].map((x) => (
          <div key={x.label} className="rounded-xl border px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
            <p className="text-[10px] font-bold uppercase text-slate-500">{x.label}</p>
            <p className="text-xl font-black text-white">{x.value}</p>
          </div>
        ))}
      </div>

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 px-4 py-3 text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 py-10">
          <Loader2 className="w-6 h-6 animate-spin" /> Loading documents…
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <span className="text-sm font-bold text-white">Shipment documents</span>
            <Link to="/logistics/company/deliveries" className="text-[11px] font-bold text-blue-400 hover:underline">
              All shipments →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/10">
                  <th className="px-4 py-2">Tracking</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Customer</th>
                  <th className="px-4 py-2">Proof of delivery</th>
                  <th className="px-4 py-2">Other</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No shipments yet.</td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-2 font-mono text-xs text-white">{r.trackingNumber}</td>
                      <td className="px-4 py-2 text-xs text-slate-300">{r.status.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-2 text-xs text-slate-300 max-w-[140px] truncate">{r.customerName}</td>
                      <td className="px-4 py-2">
                        {r.proofOfDelivery ? (
                          <a
                            href={absoluteUploadUrl(r.proofOfDelivery)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-blue-400 inline-flex items-center gap-1 hover:underline"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {mapsSearchUrl(r.deliveryAddress) ? (
                          <a href={mapsSearchUrl(r.deliveryAddress)} target="_blank" rel="noopener noreferrer" className="text-[11px] text-slate-400 hover:text-blue-400">
                            Route map
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-xl border p-4 text-xs text-slate-400" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <p className="font-bold text-slate-300 mb-1 flex items-center gap-2"><Package className="w-4 h-4" /> Bills of lading &amp; invoices</p>
        <p>Generate tax invoices and BOLs from the seller&apos;s Cosmos ERP tenant or marketplace order flows. This portal focuses on execution documents (POD) and tracking.</p>
      </div>
    </div>
  );
}
