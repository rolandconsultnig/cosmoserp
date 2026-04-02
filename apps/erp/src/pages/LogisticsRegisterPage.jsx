import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Truck, Eye, EyeOff, Loader2, CheckCircle, Building2, User } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).replace(/\/?$/, '') : '';
const apiUrl = (path) => (API_BASE ? `${API_BASE}${path.startsWith('/') ? path : `/${path}`}` : `/api${path.startsWith('/') ? path : `/${path}`}`);

export default function LogisticsRegisterPage() {
  const [mode, setMode] = useState('company'); // 'company' | 'agent'
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  // Company fields
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyPassword, setCompanyPassword] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [cacNumber, setCacNumber] = useState('');

  // Agent fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentPassword, setAgentPassword] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [coverageZone, setCoverageZone] = useState('');
  const [agentCity, setAgentCity] = useState('');
  const [agentState, setAgentState] = useState('');

  const nigerianStates = [
    'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
    'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo',
    'Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa',
    'Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba',
    'Yobe','Zamfara',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'company' ? '/logistics/companies/register' : '/logistics/agents/register';
      const body = mode === 'company'
        ? { name: companyName, email: companyEmail, phone: companyPhone, password: companyPassword, contactPerson, address, city, state, cacNumber }
        : { firstName, lastName, email: agentEmail, phone: agentPhone, password: agentPassword, vehicleType: vehicleType || undefined, vehiclePlate: vehiclePlate || undefined, coverageZone, city: agentCity, state: agentState };

      const res = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(6,182,212,0.28),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(251,146,60,0.22),transparent_30%),linear-gradient(135deg,#020617_0%,#0f172a_55%,#111827_100%)]" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'linear-gradient(rgba(148,163,184,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.2) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10 min-h-screen max-w-6xl mx-auto px-4 py-8 md:py-12 flex items-center justify-center">
          <div className="bg-white rounded-3xl border border-slate-200/20 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.9)] p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Registration Successful!</h2>
            <p className="text-sm text-slate-500 mb-6">
              {mode === 'company'
                ? 'Your logistics company has been registered and is pending admin approval. You\'ll be notified once approved.'
                : 'Your agent account has been created and is pending approval. You\'ll be able to login once activated.'}
            </p>
            <Link
              to="/logistics-login"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700 hover:brightness-110"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(6,182,212,0.28),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(251,146,60,0.22),transparent_30%),linear-gradient(135deg,#020617_0%,#0f172a_55%,#111827_100%)]" />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'linear-gradient(rgba(148,163,184,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.2) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative z-10 min-h-screen max-w-6xl mx-auto px-4 py-8 md:py-12 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          <section className="hidden lg:flex rounded-3xl border border-cyan-300/25 bg-white/5 backdrop-blur-xl p-8 xl:p-10 flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/15 text-cyan-100 text-xs font-semibold tracking-wide border border-cyan-300/25">
                <Truck className="w-3.5 h-3.5" />
                Logistics Partner Onboarding
              </div>
              <h1 className="mt-5 text-4xl xl:text-5xl font-black leading-tight text-white">
                Build your
                <br />
                delivery network.
              </h1>
              <p className="mt-4 text-sm xl:text-base text-slate-200/90 max-w-md leading-relaxed">
                Register a logistics company or join as a delivery agent to manage dispatches, operations, and customer service from one portal.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 mt-8">
              <div className="rounded-2xl bg-slate-900/55 border border-slate-700/60 px-4 py-3">
                <div className="text-xs text-cyan-200/80">Fast Onboarding</div>
                <div className="text-2xl font-black text-white mt-1">Under 10 min</div>
              </div>
              <div className="rounded-2xl bg-slate-900/55 border border-slate-700/60 px-4 py-3">
                <div className="text-xs text-amber-200/80">Coverage Growth</div>
                <div className="text-2xl font-black text-white mt-1">37 States</div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200/20 bg-white shadow-[0_20px_60px_-25px_rgba(15,23,42,0.9)] overflow-hidden">
            <div className="px-6 md:px-8 pt-7 pb-6 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-cyan-900 to-slate-900">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-white" strokeWidth={2.6} />
                </div>
                <div>
                  <div className="text-xl font-black leading-tight text-white">Logistics Onboarding</div>
                  <div className="text-xs text-cyan-100 mt-1">Create your partner account in minutes</div>
                </div>
              </div>
            </div>

            <div className="px-6 md:px-8 py-6 md:py-7">
              <div className="flex gap-2 mb-6 bg-slate-100 rounded-xl p-1">
                {[
                  { id: 'company', label: 'Logistics Company', icon: Building2 },
                  { id: 'agent', label: 'Delivery Agent', icon: User },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setMode(id); setStep(1); setError(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                      mode === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm mb-5">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'company' ? (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Company Name *</label>
                    <input required value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-300" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Email *</label>
                      <input type="email" required value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-300" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Phone</label>
                      <input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-300" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Contact Person</label>
                    <input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">CAC Number</label>
                    <input value={cacNumber} onChange={(e) => setCacNumber(e.target.value)} placeholder="RC-XXXXXXX"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Address</label>
                    <input value={address} onChange={(e) => setAddress(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-300" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">City</label>
                      <input value={city} onChange={(e) => setCity(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-300" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">State</label>
                      <select value={state} onChange={(e) => setState(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-300">
                        <option value="">Select state</option>
                        {nigerianStates.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Password *</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} required value={companyPassword}
                        onChange={(e) => setCompanyPassword(e.target.value)} minLength={6}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-300 pr-10" />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">First Name *</label>
                      <input required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-300" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Last Name *</label>
                      <input required value={lastName} onChange={(e) => setLastName(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-300" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Email *</label>
                      <input type="email" required value={agentEmail} onChange={(e) => setAgentEmail(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-300" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Phone *</label>
                      <input required value={agentPhone} onChange={(e) => setAgentPhone(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-300" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Vehicle Type</label>
                      <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-300">
                        <option value="">Select</option>
                        <option value="BIKE">Bike</option>
                        <option value="MOTORCYCLE">Motorcycle</option>
                        <option value="CAR">Car</option>
                        <option value="VAN">Van</option>
                        <option value="TRUCK">Truck</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Plate Number</label>
                      <input value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-300" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Coverage Zone</label>
                    <input value={coverageZone} onChange={(e) => setCoverageZone(e.target.value)} placeholder="e.g. Lagos Island, Victoria Island"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-300" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">City</label>
                      <input value={agentCity} onChange={(e) => setAgentCity(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-300" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">State</label>
                      <select value={agentState} onChange={(e) => setAgentState(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-300">
                        <option value="">Select state</option>
                        {nigerianStates.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Password *</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} required value={agentPassword}
                        onChange={(e) => setAgentPassword(e.target.value)} minLength={6}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-300 pr-10" />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <button type="submit" disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 mt-2 text-white disabled:opacity-60 bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700 hover:brightness-110">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Registering…' : mode === 'company' ? 'Register Company' : 'Register as Agent'}
              </button>
            </form>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-slate-600">
                Already registered? <Link to="/logistics-login" className="text-sky-700 font-semibold hover:underline">Sign in</Link>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-slate-600">
                Need ERP access? <Link to="/login" className="text-sky-700 font-semibold hover:underline">ERP login</Link>
              </div>
            </div>
            </div>
          </section>
        </div>

        <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] text-slate-300/70 text-center">
          © {new Date().getFullYear()} Roland Consult · Cosmos ERP Logistics
        </p>
      </div>
    </div>
  );
}
