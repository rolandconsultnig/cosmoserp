import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Shield, BarChart3, ClipboardList,
  Store, LogOut, ChevronLeft, ChevronRight, Bell, Activity, Truck,
  CreditCard, Users, DollarSign, Briefcase, ShoppingCart, Headphones, MessageCircle, Settings,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { cn } from '../../lib/utils';

const NAV_SECTIONS = [
  {
    title: 'Platform',
    items: [
      { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/analytics',     icon: BarChart3,       label: 'Analytics' },
      { to: '/tenants',       icon: Building2,       label: 'Tenants & KYC' },
      { to: '/subscriptions', icon: CreditCard,      label: 'Subscriptions' },
    ],
  },
  {
    title: 'Modules',
    items: [
      { to: '/finance',     icon: DollarSign,   label: 'Finance' },
      { to: '/hr-payroll',  icon: Briefcase,    label: 'HR & Payroll' },
      { to: '/pos',         icon: ShoppingCart,  label: 'POS' },
      { to: '/marketplace', icon: Store,         label: 'Marketplace' },
      { to: '/logistics',   icon: Truck,         label: 'Logistics' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/support',         icon: Headphones,    label: 'Support' },
      { to: '/platform-support', icon: MessageCircle, label: 'Platform Support' },
      { to: '/users',      icon: Users,         label: 'Users' },
      { to: '/nrs-monitor', icon: Shield,       label: 'NRS Monitor' },
      { to: '/audit-logs', icon: ClipboardList, label: 'Audit Logs' },
      { to: '/settings',   icon: Settings,      label: 'Settings' },
    ],
  },
];

// Flat list for breadcrumb lookup
const NAV_ITEMS = NAV_SECTIONS.flatMap(s => s.items);

const SIDEBAR_EXPANDED  = 248;
const SIDEBAR_COLLAPSED = 68;

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { admin, logout } = useAuthStore();
  const navigate   = useNavigate();
  const location   = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  const initials     = `${admin?.firstName?.[0] || ''}${admin?.lastName?.[0] || ''}`.toUpperCase();
  const currentLabel = NAV_ITEMS.find((n) => location.pathname.startsWith(n.to))?.label || 'Dashboard';

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#EEF0F8' }}>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className="flex flex-col h-full flex-shrink-0 relative overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          width: collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED,
          background: 'linear-gradient(175deg, #0D0F21 0%, #111430 55%, #0D0F1E 100%)',
        }}
      >
        {/* Decorative glow behind logo */}
        <div
          className="absolute top-0 left-0 w-full pointer-events-none"
          style={{ height: 200, background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(99,102,241,0.18) 0%, transparent 100%)' }}
        />

        {/* ── Logo bar ── */}
        <div
          className={cn(
            'relative flex items-center flex-shrink-0 h-[60px] border-b px-4',
            'border-white/[0.07]',
            collapsed ? 'justify-center' : 'gap-3',
          )}
        >
          <img src="/logo.png" alt="Cosmos Admin" className="h-[21px] md:h-[24px] lg:h-[26px] w-auto object-contain flex-shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-[14px] font-bold text-white leading-tight tracking-tight">
                Cosmos Admin
              </div>
              <div className="text-[11px] font-medium text-white/35 tracking-wide uppercase">
                Roland Consult
              </div>
            </div>
          )}
        </div>

        {/* ── Nav ── */}
        <nav className="sidebar-nav relative flex-1 overflow-y-auto py-3 px-2.5">
          {NAV_SECTIONS.map((section, si) => (
            <div key={section.title} className={cn(si > 0 ? 'mt-4' : '')}>
              {!collapsed && (
                <div className="text-[10px] font-black text-white/20 uppercase tracking-widest px-3 mb-1.5">
                  {section.title}
                </div>
              )}
              {collapsed && si > 0 && (
                <div className="mx-3 mb-2 border-t border-white/[0.06]" />
              )}
              <div className="space-y-0.5">
                {section.items.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) => cn(
                      'group relative flex items-center gap-3 rounded-xl text-[13px] font-medium',
                      'transition-all duration-150 select-none py-2',
                      collapsed ? 'px-2 justify-center' : 'px-3',
                      isActive
                        ? 'text-white'
                        : 'text-white/40 hover:text-white/75',
                    )}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span
                            className="absolute inset-0 rounded-xl"
                            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.30) 0%, rgba(139,92,246,0.18) 100%)' }}
                          />
                        )}
                        {isActive && (
                          <span
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                            style={{ background: 'linear-gradient(180deg, #818cf8, #a78bfa)' }}
                          />
                        )}
                        {!isActive && (
                          <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                            style={{ background: 'rgba(255,255,255,0.04)' }} />
                        )}
                        <Icon
                          className={cn('w-[17px] h-[17px] flex-shrink-0 relative z-10 transition-colors', isActive ? 'text-indigo-300' : '')}
                          strokeWidth={isActive ? 2.5 : 2}
                        />
                        {!collapsed && (
                          <span className="relative z-10 truncate">{label}</span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* ── User footer ── */}
        <div className="relative flex-shrink-0 border-t border-white/[0.07] p-3">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 12px rgba(99,102,241,0.35)' }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-white/90 truncate leading-tight">
                  {admin?.firstName} {admin?.lastName}
                </div>
                <div className="text-[11px] text-white/35 font-medium">Super Admin</div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              title="Sign out"
              className="w-full flex justify-center text-white/30 hover:text-red-400 transition-colors py-0.5"
            >
              <LogOut className="w-[17px] h-[17px]" />
            </button>
          )}
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Topbar ── */}
        <header
          className="h-[60px] bg-white/90 backdrop-blur-md flex items-center gap-3 px-5 flex-shrink-0 border-b border-slate-200/70"
          style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.04)' }}
        >
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4" />
              : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Breadcrumb */}
          <div className="flex-1 flex items-center gap-2 text-[13px] font-medium min-w-0">
            <span className="text-slate-400">Platform</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
            <span className="text-slate-800 font-semibold truncate">{currentLabel}</span>
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-2">
            {/* System status */}
            <div className="hidden sm:flex items-center gap-2 text-[12px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full">
              <Activity className="w-3 h-3" />
              All Systems Operational
            </div>

            {/* Bell */}
            <button className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
              <Bell className="w-4 h-4" />
            </button>

            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs select-none cursor-default"
              title={`${admin?.firstName} ${admin?.lastName}`}
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              {initials}
            </div>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-[1440px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
