import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, Loader2, MapPin, Phone } from 'lucide-react';
import { logisticsJson, mapsSearchUrl } from '../lib/logisticsApi';

const inputCls =
  'w-full py-2.5 px-3 rounded-xl text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-600';

const STATUS_STYLES = {
  PENDING_PICKUP: { bg: '#FFF7E6', color: '#FF8B00' },
  IN_TRANSIT: { bg: '#EBF2FF', color: '#0052CC' },
  OUT_FOR_DELIVERY: { bg: '#F3E8FF', color: '#5B21B6' },
  DELIVERED: { bg: '#E3FCEF', color: '#00875A' },
  FAILED: { bg: '#FFEBE6', color: '#DE350B' },
};

function formatCurrency(v) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(Number(v) || 0);
}

export default function LogisticsCompanyReturnsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [originalTrackingNumber, setOriginalTrackingNumber] = useState('');
  const [packageDescription, setPackageDescription] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('1500');
  const [notes, setNotes] = useState('');

  const fieldWrap = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: '1', limit: '50', kind: 'RETURN' });
      const res = await logisticsJson(`/logistics/company/deliveries?${params}`);
      setRows(res.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitReturn = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await logisticsJson('/logistics/company/returns', {
        method: 'POST',
        body: JSON.stringify({
          customerName,
          customerPhone,
          pickupAddress,
          deliveryAddress,
          city,
          state,
          originalTrackingNumber,
          packageDescription,
          deliveryFee: parseFloat(deliveryFee) || 1500,
          notes,
        }),
      });
      setCustomerName('');
      setCustomerPhone('');
      setPickupAddress('');
      setDeliveryAddress('');
      setOriginalTrackingNumber('');
      setPackageDescription('');
      setNotes('');
      await load();
    } catch (err) {
      setFormError(err.message || 'Failed to create return');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 space-y-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-black text-white flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-400" />
            Returns
          </h1>
          <Link to="/logistics/company/deliveries" className="text-[12px] font-bold text-blue-400 hover:underline">
            All shipments
          </Link>
        </div>
        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
          Schedule a reverse pickup: collect from the customer and deliver to your hub or warehouse. Drivers update status from the agent app.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-8 max-w-2xl mx-auto w-full">
        <form onSubmit={submitReturn} className="space-y-3 rounded-xl border p-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <h2 className="text-sm font-bold text-white">New return pickup</h2>
          {formError && <div className="text-sm text-red-300">{formError}</div>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Customer *</label>
              <input required value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={`mt-1 ${inputCls}`} style={fieldWrap} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Phone</label>
              <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className={`mt-1 ${inputCls}`} style={fieldWrap} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Pickup from customer *</label>
              <input required value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} className={`mt-1 ${inputCls}`} style={fieldWrap} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Return to (hub / warehouse) *</label>
              <input required value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} className={`mt-1 ${inputCls}`} style={fieldWrap} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">City</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} className={`mt-1 ${inputCls}`} style={fieldWrap} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">State</label>
              <input value={state} onChange={(e) => setState(e.target.value)} className={`mt-1 ${inputCls}`} style={fieldWrap} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Original tracking #</label>
              <input value={originalTrackingNumber} onChange={(e) => setOriginalTrackingNumber(e.target.value)} className={`mt-1 ${inputCls}`} style={fieldWrap} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Fee (NGN)</label>
              <input type="number" min="0" step="100" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} className={`mt-1 ${inputCls}`} style={fieldWrap} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Package</label>
              <input value={packageDescription} onChange={(e) => setPackageDescription(e.target.value)} className={`mt-1 ${inputCls}`} style={fieldWrap} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`mt-1 ${inputCls}`} style={fieldWrap} />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center gap-2"
            style={{ background: '#B45309' }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Create return job
          </button>
        </form>

        <div>
          <h2 className="text-sm font-bold text-white mb-3">Active return jobs</h2>
          {error && <div className="text-sm text-red-300 mb-2">{error}</div>}
          {loading ? (
            <div className="flex gap-2 text-slate-400 py-6 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>No return shipments yet.</p>
          ) : (
            <ul className="divide-y rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              {rows.map((del) => {
                const st = STATUS_STYLES[del.status] || STATUS_STYLES.PENDING_PICKUP;
                const maps = mapsSearchUrl(del.pickupAddress || del.deliveryAddress);
                return (
                  <li key={del.id} className="px-4 py-3 space-y-1.5 bg-white/[0.02]">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="text-[12px] font-mono font-bold text-white">{del.trackingNumber}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: st.bg, color: st.color }}>
                        {del.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-[12px] text-white font-medium">{del.customerName}</p>
                    {del.customerPhone && (
                      <a href={`tel:${del.customerPhone}`} className="text-[11px] text-blue-400 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {del.customerPhone}
                      </a>
                    )}
                    <p className="text-[11px] flex items-start gap-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      {del.pickupAddress} → {del.deliveryAddress}
                    </p>
                    {maps && (
                      <a href={maps} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-blue-400">
                        Open pickup in Maps
                      </a>
                    )}
                    <p className="text-[10px] text-emerald-400 tabular-nums">{formatCurrency(del.deliveryFee)}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
