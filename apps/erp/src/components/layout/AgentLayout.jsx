import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Headphones, Phone, LayoutDashboard, LogOut,
  Menu, X, ChevronLeft, ChevronRight, Bell, User,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { cn } from '../../lib/utils';

const navItems = [
  { to: '/agent/dashboard', icon: LayoutDashboard, label: 'My Dashboard' },
  { to: '/agent/tickets', icon: Headphones, label: 'Support Tickets' },
  { to: '/agent/calls', icon: Phone, label: 'Call Logs' },
];

export default function AgentLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, tenant, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/agent-login');
  };

  const Sidebar = ({ mobile = false }) => (
    <aside className={cn(
      'flex flex-col h-full bg-gradient-to-b from-green-900 to-teal-900 transition-all duration-200',
      mobile ? 'w-64' : collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 border-b border-white/10 px-4',
        collapsed && !mobile ? 'justify-center' : 'gap-3'
      )}>
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <Headphones className="w-5 h-5 text-white" />
        </div>
        {(!collapsed || mobile) && (
          <div>
            <div className="font-bold text-white text-sm leading-tight">Agent Portal</div>
            <div className="text-green-200 text-xs truncate max-w-[140px]">
              {tenant?.tradingName || tenant?.businessName}
            </div>
          </div>
        )}
      </div>

      {/* Agent badge */}
      {(!collapsed || mobile) && (
        <div className="mx-3 mt-4 bg-white/10 rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-green-400/30 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <div className="text-white text-xs font-semibold truncate">{user?.firstName} {user?.lastName}</div>
              <div className="text-green-300 text-xs truncate">{user?.role}</div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <div className="mb-2">
          {(!collapsed || mobile) && (
            <div className="text-xs font-semibold text-green-400 uppercase tracking-wider px-3 mb-2">
              Support Center
            </div>
          )}
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-0.5',
                collapsed && !mobile ? 'justify-center px-2' : '',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-green-200 hover:bg-white/10 hover:text-white'
              )}
              onClick={() => mobile && setMobileOpen(false)}
              title={collapsed && !mobile ? label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {(!collapsed || mobile) && <span>{label}</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className={cn('border-t border-white/10 p-3', collapsed && !mobile ? 'flex justify-center' : '')}>
        {(!collapsed || mobile) ? (
          <div className="space-y-1">
            <NavLink
              to="/dashboard"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-green-300 hover:text-white hover:bg-white/10 transition-all"
              title="Switch to full ERP"
            >
              <User className="w-3.5 h-3.5" />
              Switch to Full ERP
            </NavLink>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-green-300 hover:text-red-300 hover:bg-white/10 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="text-green-300 hover:text-red-300 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 flex flex-col w-64 h-full">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white z-10"
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
        <header className="h-16 bg-white border-b border-slate-200 flex items-center gap-4 px-4 flex-shrink-0">
          <button className="lg:hidden text-slate-500" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <button
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:bg-slate-100 transition-colors"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Agent status badge */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Agent Online
          </div>

          <div className="flex-1" />

          <div className="text-xs text-slate-400 hidden sm:block">
            {tenant?.tradingName || tenant?.businessName}
          </div>

          <button className="relative text-slate-500 hover:text-slate-700">
            <Bell className="w-5 h-5" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
