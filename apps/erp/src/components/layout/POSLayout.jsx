import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Zap, Clock, WifiIcon, WifiOffIcon, LayoutDashboard, ShoppingCart,
  History, CalendarCheck, LogOut, User, Menu, X,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { cn } from '../../lib/utils';
import { LOGO_URL } from '../../lib/branding';

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="tabular-nums">
      {time.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
}

function OnlineDot() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online
    ? <WifiIcon className="w-3.5 h-3.5 text-emerald-400" />
    : <WifiOffIcon className="w-3.5 h-3.5 text-red-400" />;
}

const navItems = [
  { to: '/pos/dashboard', icon: LayoutDashboard, label: 'Dashboard', hint: 'Stats & product browse' },
  { to: '/pos/terminal',  icon: ShoppingCart,    label: 'New Sale', hint: 'Cart, quick picks, loyalty' },
  { to: '/pos/history',   icon: History,         label: 'Sales History', hint: null },
  { to: '/pos/end-of-day', icon: CalendarCheck,  label: 'End of Day', hint: null },
];

export default function POSLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, tenant, logout } = useAuthStore();
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString('en-NG', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  const handleLogout = async () => {
    await logout();
    navigate('/pos-login');
  };

  const Sidebar = ({ mobile = false }) => (
    <aside
      className={cn(
        'flex flex-col h-full transition-all duration-200',
        mobile ? 'w-60' : collapsed ? 'w-16' : 'w-60'
      )}
      style={{ background: '#0F172A' }}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-14 border-b px-3',
        collapsed && !mobile ? 'justify-center' : 'gap-2.5',
      )}
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <img src={LOGO_URL} alt="Mixtio ERP" className="h-[19px] md:h-[22px] lg:h-[24px] w-auto object-contain flex-shrink-0" />
        {(!collapsed || mobile) && (
          <div>
            <div className="font-black text-white text-sm leading-tight">POS Terminal</div>
            <div className="text-emerald-400 text-[10px] truncate max-w-[140px]">
              {tenant?.tradingName || tenant?.businessName}
            </div>
          </div>
        )}
      </div>

      {/* Cashier badge */}
      {(!collapsed || mobile) && (
        <div className="mx-2.5 mt-3 rounded-xl px-3 py-2.5"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
            >
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <div className="text-white text-xs font-semibold truncate">{user?.firstName} {user?.lastName}</div>
              <div className="text-emerald-400 text-[10px] flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                On Shift
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {(!collapsed || mobile) && (
          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider px-3 mb-2">
            Sales Center
          </div>
        )}
        {navItems.map(({ to, icon: Icon, label, hint }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-0.5',
              collapsed && !mobile ? 'justify-center px-2' : '',
              isActive
                ? 'text-white'
                : 'text-slate-500 hover:text-slate-300',
            )}
            style={({ isActive }) => isActive
              ? { background: 'rgba(16,185,129,0.15)', color: '#34D399' }
              : {}}
            onClick={() => mobile && setMobileOpen(false)}
            title={collapsed && !mobile ? (hint ? `${label} — ${hint}` : label) : undefined}
          >
            {({ isActive }) => (
              <>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {(!collapsed || mobile) && (
                  <span className="flex flex-col items-start min-w-0 leading-tight">
                    <span>{label}</span>
                    {hint && (
                      <span
                        className={cn(
                          'text-[9px] font-normal truncate max-w-[11rem]',
                          isActive ? 'text-emerald-200/75' : 'text-slate-500',
                        )}
                      >
                        {hint}
                      </span>
                    )}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t px-3 py-3" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        {(!collapsed || mobile) ? (
          <div className="space-y-1">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-white hover:bg-white/5 transition-all"
            >
              <User className="w-3.5 h-3.5" />
              Switch to Full ERP
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-red-400 hover:bg-white/5 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              End Shift & Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex justify-center text-slate-500 hover:text-red-400 transition-colors"
            title="End Shift"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0F172A' }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 flex flex-col w-60 h-full">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header
          className="h-12 flex-shrink-0 flex items-center gap-3 px-4 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
        >
          <button className="lg:hidden text-slate-500" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <button
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md text-slate-600 hover:bg-white/5 transition-colors"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Online badge */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Register Open
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-4 text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <LiveClock />
            </div>
            <span className="hidden sm:inline">{today}</span>
            <OnlineDot />
            {/* Sales agent — top-right corner */}
            <div className="flex items-center gap-2.5 pl-3 border-l flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
              <span className="hidden sm:inline font-medium text-right" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {user?.firstName} {user?.lastName}
              </span>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ring-2 ring-emerald-400/60 flex-shrink-0 overflow-hidden bg-slate-600"
                title={`${user?.firstName || ''} ${user?.lastName || ''}`}
              >
                {(user?.avatarUrl || user?.imageUrl) ? (
                  <img src={user.avatarUrl || user.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page body */}
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
