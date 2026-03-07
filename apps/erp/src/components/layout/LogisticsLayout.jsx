import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Truck, LayoutDashboard, Package, User, LogOut, Menu, X,
  ChevronLeft, ChevronRight, MapPin, Clock, Wifi, WifiOff,
} from 'lucide-react';
import { cn } from '../../lib/utils';

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
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online
    ? <Wifi className="w-3.5 h-3.5 text-blue-400" />
    : <WifiOff className="w-3.5 h-3.5 text-red-400" />;
}

const navItems = [
  { to: '/logistics/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/logistics/deliveries', icon: Package,         label: 'My Deliveries' },
  { to: '/logistics/profile',    icon: User,            label: 'Profile' },
];

function useLogisticsAuth() {
  const token = localStorage.getItem('logistics_token');
  const type = localStorage.getItem('logistics_type');
  const agent = (() => { try { return JSON.parse(localStorage.getItem('logistics_agent')); } catch { return null; } })();
  const company = (() => { try { return JSON.parse(localStorage.getItem('logistics_company')); } catch { return null; } })();
  return { token, type, agent, company, isAuthenticated: !!token };
}

export default function LogisticsLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { agent, company, type } = useLogisticsAuth();
  const navigate = useNavigate();

  const today = new Date().toLocaleDateString('en-NG', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  const displayName = type === 'agent'
    ? `${agent?.firstName || ''} ${agent?.lastName || ''}`
    : company?.name || 'Logistics';
  const initials = type === 'agent'
    ? `${agent?.firstName?.[0] || ''}${agent?.lastName?.[0] || ''}`
    : (company?.name || 'L')[0];
  const subtitle = type === 'agent' ? (agent?.agentCode || 'Agent') : 'Company Admin';
  const companyName = type === 'agent' ? agent?.company?.name : company?.name;

  const handleLogout = () => {
    localStorage.removeItem('logistics_token');
    localStorage.removeItem('logistics_type');
    localStorage.removeItem('logistics_agent');
    localStorage.removeItem('logistics_company');
    navigate('/logistics-login');
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!localStorage.getItem('logistics_token')) {
      navigate('/logistics-login');
    }
  }, [navigate]);

  const Sidebar = ({ mobile = false }) => (
    <aside
      className={cn(
        'flex flex-col h-full transition-all duration-200',
        mobile ? 'w-60' : collapsed ? 'w-16' : 'w-60'
      )}
      style={{ background: '#091E42' }}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center h-14 border-b px-3',
          collapsed && !mobile ? 'justify-center' : 'gap-2.5',
        )}
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <img src="/logo.png" alt="Cosmos" className="h-8 w-auto object-contain flex-shrink-0" />
        {(!collapsed || mobile) && (
          <div>
            <div className="font-black text-white text-sm leading-tight">Logistics Hub</div>
            <div className="text-blue-400 text-[10px] truncate max-w-[140px]">
              {companyName || 'Cosmos Delivery'}
            </div>
          </div>
        )}
      </div>

      {/* Agent badge */}
      {(!collapsed || mobile) && (
        <div
          className="mx-2.5 mt-3 rounded-xl px-3 py-2.5"
          style={{ background: 'rgba(0,82,204,0.12)', border: '1px solid rgba(0,82,204,0.20)' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #0052CC, #6366F1)' }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-white text-xs font-semibold truncate">{displayName}</div>
              <div className="text-blue-400 text-[10px] flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                {subtitle}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {(!collapsed || mobile) && (
          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider px-3 mb-2">
            Delivery Center
          </div>
        )}
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-0.5',
              collapsed && !mobile ? 'justify-center px-2' : '',
              isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300',
            )}
            style={({ isActive }) => isActive
              ? { background: 'rgba(0,82,204,0.20)', color: '#60A5FA' }
              : {}}
            onClick={() => mobile && setMobileOpen(false)}
            title={collapsed && !mobile ? label : undefined}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {(!collapsed || mobile) && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t px-3 py-3" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        {(!collapsed || mobile) ? (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-red-400 hover:bg-white/5 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex justify-center text-slate-500 hover:text-red-400 transition-colors"
            title="Sign Out"
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

          {/* Active badge */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1">
            <MapPin className="w-3 h-3" />
            {type === 'agent' ? (agent?.coverageZone || agent?.city || 'On Duty') : 'Fleet Manager'}
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-4 text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <LiveClock />
            </div>
            <span className="hidden sm:inline">{today}</span>
            <OnlineDot />
            <div className="hidden sm:flex items-center gap-1.5">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white"
                style={{ background: 'linear-gradient(135deg, #0052CC, #6366F1)' }}
              >
                {initials}
              </div>
              <span style={{ color: 'rgba(255,255,255,0.55)' }}>
                {type === 'agent' ? agent?.firstName : company?.name}
              </span>
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
