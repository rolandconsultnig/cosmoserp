import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarClock, Loader2, CheckCircle2 } from 'lucide-react';
import { logisticsJson } from '../lib/logisticsApi';

const inputCls =
  'w-full py-2.5 px-3 rounded-xl text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-600';

export default function LogisticsCompanySchedulePage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [packageDescription, setPackageDescription] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('1500');
  const [priority, setPriority] = useState('STANDARD');
  const [notes, setNotes] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [orderRef, setOrderRef] = useState('');

  const fieldWrap = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    setDone(null);
    try {
      const res = await logisticsJson('/logistics/company/deliveries', {
        method: 'POST',
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail,
          pickupAddress,
          deliveryAddress,
          city,
          state,
          packageDescription,
          deliveryFee: parseFloat(deliveryFee) || 1500,
          priority,
          notes,
          expectedDeliveryDate: expectedDeliveryDate || undefined,
          orderRef,
        }),
      });
      setDone(res.data);
    } catch (err) {
      setError(err.message || 'Failed to create shipment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 overflow-y-auto h-full max-w-xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(0,82,204,0.15)' }}
          >
            <CalendarClock className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Schedule shipment</h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>
              Create a shipment for your fleet. An available driver is assigned automatically when possible.
            </p>
          </div>
        </div>
        <Link to="/logistics/company/deliveries" className="text-[12px] font-bold text-blue-400 hover:underline">
          View shipments
        </Link>
      </div>

      {done && (
        <div
          className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 flex gap-3"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-white">Shipment created</p>
            <p className="text-xs text-emerald-200/90 mt-1 font-mono">{done.trackingNumber}</p>
            <button
              type="button"
              onClick={() => navigate('/logistics/company/deliveries')}
              className="mt-3 text-[12px] font-bold text-blue-400 hover:underline"
            >
              Open shipments list
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 px-4 py-3 text-sm">{error}</div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Customer name *</label>
            <input required value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={`mt-1 ${inputCls}`} style={fieldWrap} />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Phone</label>
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className={`mt-1 ${inputCls}`} style={fieldWrap} />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email</label>
            <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className={`mt-1 ${inputCls}`} style={fieldWrap} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pickup address</label>
            <input value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} className={`mt-1 ${inputCls}`} style={fieldWrap} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Delivery address *</label>
            <input required value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} className={`mt-1 ${inputCls}`} style={fieldWrap} />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} className={`mt-1 ${inputCls}`} style={fieldWrap} />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">State</label>
            <input value={state} onChange={(e) => setState(e.target.value)} className={`mt-1 ${inputCls}`} style={fieldWrap} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Package / contents</label>
            <input value={packageDescription} onChange={(e) => setPackageDescription(e.target.value)} className={`mt-1 ${inputCls}`} style={fieldWrap} />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Delivery fee (NGN)</label>
            <input type="number" min="0" step="100" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} className={`mt-1 ${inputCls}`} style={fieldWrap} />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={`mt-1 ${inputCls}`} style={fieldWrap}>
              <option value="ECONOMY">Economy</option>
              <option value="STANDARD">Standard</option>
              <option value="EXPRESS">Express</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Order ref</label>
            <input value={orderRef} onChange={(e) => setOrderRef(e.target.value)} className={`mt-1 ${inputCls}`} style={fieldWrap} />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Expected delivery</label>
            <input type="datetime-local" value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} className={`mt-1 ${inputCls}`} style={fieldWrap} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Internal notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`mt-1 ${inputCls} resize-y min-h-[72px]`} style={fieldWrap} />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: '#0052CC' }}
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          Create shipment
        </button>
      </form>
    </div>
  );
}
