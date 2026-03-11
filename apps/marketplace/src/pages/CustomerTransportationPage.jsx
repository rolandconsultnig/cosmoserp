import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plane, TrainFront, BusFront } from 'lucide-react';
import CustomerAccountLayout from '../components/CustomerAccountLayout';
import api from '../lib/api';

const MODES = [
  { key: 'air', label: 'Air ticket', icon: Plane },
  { key: 'rail', label: 'Rail ticket', icon: TrainFront },
  { key: 'bus', label: 'Bus ticket', icon: BusFront },
];

export default function CustomerTransportationPage() {
  const [mode, setMode] = useState('air');
  const [form, setForm] = useState({ from: '', to: '' });
  const [fares, setFares] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookingBusyId, setBookingBusyId] = useState(null);

  const fetchFares = (e) => {
    e.preventDefault();
    if (!form.from.trim() || !form.to.trim()) return;
    setLoading(true);
    // Mock different providers/fare sources
    const base = 5000;
    const mult = mode === 'air' ? 10 : mode === 'rail' ? 4 : 2;
    const options = [
      { id: 'prov1', provider: mode === 'air' ? 'Cosmos Air' : mode === 'rail' ? 'Cosmos Rail' : 'Cosmos Bus', price: base * mult, eta: 'Today' },
      { id: 'prov2', provider: 'Partner Express', price: base * mult * 1.1, eta: 'Tomorrow' },
      { id: 'prov3', provider: 'Saver Line', price: base * mult * 0.9, eta: 'Flexible' },
    ];
    setTimeout(() => {
      setFares(options);
      setLoading(false);
    }, 600);
  };

  const book = async (fare) => {
    if (!form.from.trim() || !form.to.trim()) return;
    const ref = `${mode.toUpperCase()}-${Date.now().toString(16)}`;

    try {
      setBookingBusyId(fare.id);
      await api.post('/marketplace/transport/bookings', {
        mode: mode,
        from: form.from,
        to: form.to,
        provider: fare.provider,
        price: fare.price,
        eta: fare.eta,
        clientRef: ref,
      });
      window.alert(
        `Ticket booked!\n\nProvider: ${fare.provider}\nFrom: ${form.from}\nTo: ${form.to}\nFare: ₦${fare.price.toLocaleString('en-NG')}\nReference: ${ref}\n\nUse your browser's print option to print this page.`
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      window.alert('Unable to book ticket right now. Please try again.');
    } finally {
      setBookingBusyId(null);
    }
  };

  return (
    <CustomerAccountLayout active="transport">
      <div className="flex items-center gap-2 mb-4">
        <Link to="/account" className="text-gray-500 hover:text-gray-700 text-sm">Account</Link>
        <span className="text-gray-400">/</span>
        <span className="font-semibold text-gray-900">Transportation</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Transportation</h1>
      <p className="text-sm text-gray-500 mb-6">
        Compare fares for air, rail, and bus tickets. Select your route and choose a provider to book.
      </p>

      <div className="flex gap-2 mb-4">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = mode === m.key;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => { setMode(m.key); setFares([]); }}
              className={
                'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ' +
                (active ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
              }
            >
              <Icon className="w-4 h-4" />
              {m.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={fetchFares} className="card p-5 mb-6 grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Present location</label>
          <input
            className="input"
            value={form.from}
            onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))}
            placeholder="e.g. Lagos"
            required
          />
        </div>
        <div className="sm:col-span-1">
          <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Destination</label>
          <input
            className="input"
            value={form.to}
            onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
            placeholder="e.g. Abuja"
            required
          />
        </div>
        <div className="sm:col-span-1 flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="btn-buy w-full py-2.5 rounded-xl font-semibold text-sm disabled:opacity-60"
          >
            {loading ? 'Fetching fares…' : 'Fetch fares'}
          </button>
        </div>
      </form>

      {fares.length > 0 && (
        <div className="space-y-3">
          {fares.map((fare) => (
            <div key={fare.id} className="card p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{fare.provider}</p>
                <p className="text-xs text-gray-500">
                  {form.from} → {form.to} · {fare.eta}
                </p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-gray-900">
                  ₦{fare.price.toLocaleString('en-NG', { minimumFractionDigits: 0 })}
                </p>
                <button
                  type="button"
                  onClick={() => book(fare)}
                  disabled={bookingBusyId === fare.id}
                  className="btn-outline mt-2 py-1.5 px-3 rounded-xl text-xs font-semibold disabled:opacity-60"
                >
                  {bookingBusyId === fare.id ? 'Booking…' : 'Pay & print ticket'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </CustomerAccountLayout>
  );
}

