import { useState, useEffect } from 'react';
import {
  User, Phone, MapPin, Truck, Car, Bike, Save, Loader2,
  Shield, Star, Package, CheckCircle, Building2,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).replace(/\/?$/, '') : '';
const apiUrl = (path) => (API_BASE ? `${API_BASE}${path.startsWith('/') ? path : `/${path}`}` : `/api${path.startsWith('/') ? path : `/${path}`}`);

const VEHICLE_ICONS = { BIKE: Bike, MOTORCYCLE: Bike, CAR: Car, VAN: Truck, TRUCK: Truck };

export default function LogisticsProfilePage() {
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Editable fields
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [coverageZone, setCoverageZone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  const token = localStorage.getItem('logistics_token');

  useEffect(() => {
    if (!token) return;
    fetch(apiUrl('/logistics/agent/profile'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((r) => {
        const a = r.data;
        setAgent(a);
        setPhone(a.phone || '');
        setVehicleType(a.vehicleType || '');
        setVehiclePlate(a.vehiclePlate || '');
        setCoverageZone(a.coverageZone || '');
        setCity(a.city || '');
        setState(a.state || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const res = await fetch(apiUrl('/logistics/agent/profile'), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, vehicleType: vehicleType || undefined, vehiclePlate, coverageZone, city, state }),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      const data = await res.json();
      setAgent(data.data);
      localStorage.setItem('logistics_agent', JSON.stringify(data.data));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const nigerianStates = [
    'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
    'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo',
    'Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa',
    'Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba',
    'Yobe','Zamfara',
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 rounded-lg w-48" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="h-48 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }} />
        <div className="h-64 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }} />
      </div>
    );
  }

  const initials = `${agent?.firstName?.[0] || ''}${agent?.lastName?.[0] || ''}`.toUpperCase();
  const VIcon = VEHICLE_ICONS[agent?.vehicleType] || Truck;
  const statusColor = agent?.status === 'ACTIVE' ? '#00875A' : agent?.status === 'PENDING' ? '#FF8B00' : '#DE350B';
  const statusLabel = agent?.status || 'Unknown';

  return (
    <div className="p-6 overflow-y-auto h-full space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <User className="w-5 h-5 text-blue-400" />
          Agent Profile
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Manage your delivery profile and vehicle information
        </p>
      </div>

      {/* Profile card */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #0052CC, #6366F1, #8B5CF6)' }} />
        <div className="p-6">
          <div className="flex items-start gap-5">
            <div className="relative">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-xl"
                style={{ background: 'linear-gradient(135deg, #0052CC, #6366F1)' }}
              >
                {initials}
              </div>
              <span
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                style={{ borderColor: '#0F172A', background: statusColor }}
              >
                {agent?.status === 'ACTIVE' && <CheckCircle className="w-3 h-3 text-white" />}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-black text-white">{agent?.firstName} {agent?.lastName}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[12px] font-mono text-blue-400">{agent?.agentCode}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${statusColor}18`, color: statusColor }}>
                  {statusLabel}
                </span>
              </div>
              <p className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{agent?.email}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: 'Deliveries', value: agent?.totalDeliveries || 0, icon: Package, color: '#0052CC' },
              { label: 'Success Rate', value: `${agent?.successRate || 0}%`, icon: CheckCircle, color: '#00875A' },
              { label: 'Rating', value: agent?.rating ? parseFloat(agent.rating).toFixed(1) : '—', icon: Star, color: '#FF8B00' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-xl p-3 text-center" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
                <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
                <p className="text-[16px] font-black text-white">{value}</p>
                <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.30)' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Company */}
          {agent?.company && (
            <div className="flex items-center gap-2 mt-4 px-3 py-2 rounded-xl" style={{ background: 'rgba(0,82,204,0.08)', border: '1px solid rgba(0,82,204,0.15)' }}>
              <Building2 className="w-4 h-4 text-blue-400" />
              <span className="text-[12px] font-bold text-blue-400">{agent.company.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Edit form */}
      <div className="rounded-xl border p-6 space-y-5" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <h3 className="text-sm font-bold text-white">Edit Profile</h3>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Profile updated successfully!
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.40)' }}>Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.25)' }} />
              <input value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full py-2.5 pl-10 pr-3 rounded-xl text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }} />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.40)' }}>Vehicle Type</label>
            <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
              <option value="">Select</option>
              <option value="BIKE">Bike</option>
              <option value="MOTORCYCLE">Motorcycle</option>
              <option value="CAR">Car</option>
              <option value="VAN">Van</option>
              <option value="TRUCK">Truck</option>
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.40)' }}>Vehicle Plate</label>
            <input value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)}
              placeholder="e.g. LAG-234-XY"
              className="w-full py-2.5 px-3 rounded-xl text-[13px] text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }} />
          </div>

          <div>
            <label className="block text-[12px] font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.40)' }}>Coverage Zone</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.25)' }} />
              <input value={coverageZone} onChange={(e) => setCoverageZone(e.target.value)}
                placeholder="e.g. Lagos Island, Victoria Island"
                className="w-full py-2.5 pl-10 pr-3 rounded-xl text-[13px] text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }} />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.40)' }}>City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }} />
          </div>

          <div>
            <label className="block text-[12px] font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.40)' }}>State</label>
            <select value={state} onChange={(e) => setState(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
              <option value="">Select state</option>
              {nigerianStates.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #0052CC, #6366F1)' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
