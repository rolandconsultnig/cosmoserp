import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  PlusCircle,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { LOGO_URL } from '../../lib/branding';
import useAuthStore from '../../store/authStore';

const navItems = [
  { to: '/field-agent', end: true, icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/field-agent/businesses', end: false, icon: Building2, label: 'My Businesses' },
  { to: '/field-agent/businesses/new', end: true, icon: PlusCircle, label: 'New Business' },
];

export default function FieldAgentLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, tenant, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== 'FIELD_AGENT') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Agent';
  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || user.email?.[0]?.toUpperCase() || 'A'
    : 'A';

  const Sidebar = ({ mobile = false }) => (
    <aside
      className={cn(
        'flex flex-col h-full transition-all duration-200 bg-emerald-900',
        mobile ? 'w-60' : collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className={cn('flex items-center h-14 border-b border-emerald-800 px-3', collapsed && !mobile ? 'justify-center' : 'gap-2.5')}>
        <img src={LOGO_URL} alt="Mixtio ERP" className="h-8 w-auto object-contain flex-shrink-0" />
        {(!collapsed || mobile) && (
          <div>
            <div className="font-bold text-white text-sm">Field Agent</div>
            <div className="text-emerald-300 text-[10px]">Portal</div>
          </div>
        )}
      </div>

      {(!collapsed || mobile) && (
        <div className="mx-2.5 mt-3 rounded-xl px-3 py-2.5 bg-emerald-800/50 border border-emerald-700/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-white text-xs font-medium truncate">{displayName}</div>
              {tenant && (
                <div className="text-emerald-300 text-[10px] truncate">{tenant.tradingName || tenant.businessName}</div>
              )}
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {navItems.map(({ to, end, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-0.5',
                collapsed && !mobile ? 'justify-center px-2' : '',
                isActive ? 'bg-emerald-700 text-white' : 'text-emerald-200 hover:bg-emerald-800/50 hover:text-white'
              )
            }
            onClick={() => mobile && setMobileOpen(false)}
            title={collapsed && !mobile ? label : undefined}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {(!collapsed || mobile) && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-emerald-800 px-3 py-3">
        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-2 rounded-lg text-xs text-emerald-200 hover:text-white hover:bg-emerald-800/50 transition-all py-2',
            collapsed && !mobile ? 'justify-center px-2' : 'px-3'
          )}
        >
          <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
          {(!collapsed || mobile) && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <div className="hidden lg:flex flex-col">
        <Sidebar />
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 flex flex-col w-60 h-full">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-white hover:text-emerald-200 z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <Sidebar mobile />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-12 flex-shrink-0 flex items-center gap-3 px-4 border-b border-slate-200 bg-white">
          <button className="lg:hidden text-slate-600" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <button
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-md text-slate-500 hover:bg-slate-100 transition-colors"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <div className="flex-1" />
          <div className="text-sm text-slate-600">{user?.email}</div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
