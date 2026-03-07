import { Truck, Headphones, Users, ArrowRight } from 'lucide-react';

const PARTNER_OPTIONS = [
  {
    id: 'logistics',
    title: 'Logistics Partners',
    description: 'Delivery companies and delivery agents. Sign in to manage deliveries, track shipments, and view earnings.',
    href: '/logistics-login',
    registerHref: '/logistics-register',
    icon: Truck,
    iconBg: 'bg-blue-600',
  },
  {
    id: 'agents',
    title: 'Support & On-boarding Agents',
    description: 'Customer care and on-boarding agents. Sign in to manage support tickets, call logs and customer interactions.',
    href: '/agent-login',
    icon: Headphones,
    iconBg: 'bg-green-600',
  },
  {
    id: 'pos',
    title: 'POS / Store Staff',
    description: 'Point of sale and store staff. Sign in to access the POS terminal and sales history.',
    href: '/pos-login',
    icon: Users,
    iconBg: 'bg-amber-600',
  },
];

function getErpBase() {
  if (typeof window === 'undefined') return '/erp';
  const url = import.meta.env.VITE_ERP_URL;
  if (url) return url;
  const p = window.location.port;
  if (p === '5174' || p === '5181' || p === '5173') return 'http://localhost:3060/erp';
  return '/erp';
}

export default function PartnersLoginPage() {
  const erpBase = getErpBase();
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gray-800 px-6 py-5">
            <h1 className="text-lg font-bold text-white">Partners Portal</h1>
            <p className="text-gray-300 text-sm mt-1">
              On-boarding agents, logistics agents, and other parts of the Cosmos process. Choose your portal below.
            </p>
          </div>

          <div className="p-6 space-y-3">
            {PARTNER_OPTIONS.map(({ id, title, description, href, registerHref, icon: Icon, iconBg }) => (
              <div key={id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                    <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
                    <p className="text-gray-600 text-xs mt-0.5 mb-3">{description}</p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={erpBase + href}
                        className="inline-flex items-center gap-1 bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium px-3 py-2 rounded border border-gray-700"
                      >
                        Sign in <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                      {registerHref && (
                        <a
                          href={erpBase + registerHref}
                          className="inline-flex items-center border border-gray-300 text-gray-700 text-xs font-medium px-3 py-2 rounded hover:bg-gray-50"
                        >
                          Register
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-center text-gray-500 text-xs mt-4">
          Not a partner? <a href={erpBase + '/login'} className="text-blue-600 hover:underline">Business / Seller login</a>
        </p>
      </div>
    </div>
  );
}
