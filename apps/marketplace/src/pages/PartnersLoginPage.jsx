import { Truck, Users, ArrowRight, Building2 } from 'lucide-react';

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
              Logistics partners, POS staff, and other parts of the Mixtio process. Choose your portal below.
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
        <div className="flex justify-center mt-6">
          <a
            href={`${erpBase.replace(/\/$/, '')}/login`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold px-8 py-3 shadow-md border border-gray-700 transition-colors"
          >
            <Building2 className="w-4 h-4" aria-hidden />
            ERP login
          </a>
        </div>
      </div>
    </div>
  );
}
