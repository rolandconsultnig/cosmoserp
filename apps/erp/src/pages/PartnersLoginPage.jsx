import { Link } from 'react-router-dom';
import { Truck, Headphones, Users, ArrowRight, Shield } from 'lucide-react';

const PARTNER_OPTIONS = [
  {
    id: 'logistics',
    title: 'Logistics Partners',
    description: 'Delivery companies and delivery agents. Sign in to manage deliveries, track shipments, and view earnings.',
    href: '/logistics-login',
    registerHref: '/logistics-register',
    icon: Truck,
    color: 'from-blue-600 to-indigo-600',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    id: 'agents',
    title: 'Support & On-boarding Agents',
    description: 'Customer care and on-boarding agents. Sign in to manage support tickets, call logs and customer interactions.',
    href: '/agent-login',
    icon: Headphones,
    color: 'from-green-600 to-teal-600',
    bgLight: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  {
    id: 'pos',
    title: 'POS / Store Staff',
    description: 'Point of sale and store staff. Sign in to access the POS terminal and sales history.',
    href: '/pos-login',
    icon: Users,
    color: 'from-amber-600 to-orange-600',
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
];

export default function PartnersLoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-8 py-6 text-white" style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Shield className="w-7 h-7 text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="font-bold text-xl leading-tight">Partners Portal</h1>
                <p className="text-indigo-200 text-xs">Cosmos ERP — Choose your partner type to sign in</p>
              </div>
            </div>
            <p className="text-indigo-100 text-sm">
              On-boarding agents, logistics agents, and other parts of the Cosmos process. Select your portal below.
            </p>
          </div>

          <div className="px-8 py-6 space-y-4">
            {PARTNER_OPTIONS.map(({ id, title, description, href, registerHref, icon: Icon, color, bgLight, borderColor }) => (
              <div
                key={id}
                className={`rounded-xl border-2 ${borderColor} ${bgLight} p-4 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${color}`}>
                    <Icon className="w-6 h-6 text-white" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-slate-900 mb-1">{title}</h2>
                    <p className="text-sm text-slate-600 mb-3">{description}</p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={href}
                        className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                      >
                        Sign in <ArrowRight className="w-4 h-4" />
                      </Link>
                      {registerHref && (
                        <Link
                          to={registerHref}
                          className="inline-flex items-center gap-1.5 border-2 border-slate-300 hover:border-slate-400 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                        >
                          Register
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-center text-slate-400 text-xs mt-4">
          Not a partner? <Link to="/login" className="text-indigo-400 hover:underline">Business / Seller login</Link>
        </p>
      </div>
    </div>
  );
}
