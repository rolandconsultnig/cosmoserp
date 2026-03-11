import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, FileCheck, Package, Users, Truck,
  Warehouse, ShoppingCart, UserSquare, DollarSign, Building2,
  Shield, BarChart3, Settings, LogOut, ChevronLeft, ChevronRight,
  Bell, Search, Menu, X, Receipt, Headphones, Zap, ShieldCheck
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { cn } from '../../lib/utils';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { to: '/pos',      icon: Zap,       label: 'Point of Sale', highlight: true },
      { to: '/invoices', icon: FileText,  label: 'Invoices' },
      { to: '/quotes',   icon: FileCheck, label: 'Quotations' },
      { to: '/customers',icon: Users,     label: 'Customers' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { to: '/products', icon: Package, label: 'Products' },
      { to: '/warehouses', icon: Warehouse, label: 'Warehouses' },
      { to: '/purchase-orders', icon: ShoppingCart, label: 'Purchase Orders' },
      { to: '/suppliers', icon: Truck, label: 'Suppliers' },
    ],
  },
  {
    label: 'HR & Payroll',
    items: [
      { to: '/employees', icon: UserSquare, label: 'Employees' },
      { to: '/payroll', icon: DollarSign, label: 'Payroll' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/finance', icon: Building2, label: 'Chart of Accounts' },
      { to: '/nrs', icon: Shield, label: 'NRS / Tax' },
      { to: '/reports', icon: BarChart3, label: 'Reports' },
    ],
  },
  {
    label: 'Customer Care',
    items: [
      { to: '/support', icon: Headphones, label: 'Support & Calls' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/kyc', icon: ShieldCheck, label: 'KYC Verification' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, tenant, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const Sidebar = ({ mobile = false }) => (
    <aside className={cn(
      'flex flex-col h-full bg-white border-r border-slate-200 transition-all duration-200',
      mobile ? 'w-64' : collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className={cn('flex items-center h-16 border-b border-slate-200 px-4', collapsed && !mobile ? 'justify-center' : 'gap-3')}>
        <img src="/logo.png" alt="Cosmos ERP" className="h-[19px] md:h-[22px] lg:h-[24px] w-auto object-contain flex-shrink-0" />
        {(!collapsed || mobile) && (
          <div>
            <div className="font-bold text-slate-900 text-sm leading-tight">Cosmos ERP</div>
            <div className="text-xs text-slate-500 truncate max-w-[140px]">{tenant?.tradingName || tenant?.businessName}</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            {(!collapsed || mobile) && (
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1">{group.label}</div>
            )}
            {group.items.map(({ to, icon: Icon, label, highlight }) => (
              <NavLink
                key={to} to={to}
                className={({ isActive }) => cn(
                  'sidebar-link',
                  isActive && 'active',
                  collapsed && !mobile && 'justify-center px-2',
                  highlight && !isActive && 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700',
                )}
                onClick={() => mobile && setMobileOpen(false)}
                title={collapsed && !mobile ? label : undefined}
              >
                <Icon className={cn('w-4 h-4 flex-shrink-0', highlight && 'text-emerald-500')} />
                {(!collapsed || mobile) && <span>{label}</span>}
                {(!collapsed || mobile) && highlight && (
                  <span className="ml-auto px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500 text-white">
                    NEW
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className={cn('border-t border-slate-200 p-3', collapsed && !mobile ? 'flex justify-center' : '')}>
        {(!collapsed || mobile) ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">{user?.firstName} {user?.lastName}</div>
              <div className="text-xs text-slate-500 truncate">{user?.role}</div>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors" title="Logout">
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

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 flex flex-col w-64 bg-white h-full">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-slate-400">
              <X className="w-5 h-5" />
            </button>
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main */}
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

          {/* KYC warning banner */}
          {tenant?.kycStatus !== 'APPROVED' && (
            <div className="hidden sm:flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-3 py-1.5 text-xs font-medium">
              <Shield className="w-3.5 h-3.5" />
              KYC {tenant?.kycStatus || 'PENDING'} — Complete verification to issue tax-compliant invoices
            </div>
          )}

          <div className="flex-1" />

          {/* NRS status indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            NRS Connected
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
