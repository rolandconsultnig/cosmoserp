import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import {
  FileText,
  Upload,
  Scan,
  Calendar,
  Settings,
  ClipboardCheck,
  AlertTriangle,
} from 'lucide-react';

const INVOICE_MENU_ITEMS = [
  { label: 'All Invoices', path: '/invoices', icon: FileText },
  { label: 'Create Invoice', path: '/invoices/new', icon: FileText },
  { label: 'Bulk Import', path: '/invoices/import', icon: Upload },
  { label: 'OCR Scanning', path: '/invoices/ocr', icon: Scan },
  { label: 'Recurring Setup', path: '/invoices/recurring', icon: Calendar },
  { label: 'Numbering Config', path: '/invoices/numbering', icon: Settings },
  { label: 'Approvals', path: '/invoices/approvals', icon: ClipboardCheck },
  { label: 'Duplicate Check', path: '/invoices/duplicates', icon: AlertTriangle },
];

export default function InvoiceManagementNav() {
  const location = useLocation();
  const isInvoiceRoute = location.pathname.startsWith('/invoices');

  if (!isInvoiceRoute) return null;

  return (
    <div className="bg-white border-b border-slate-100 sticky top-0 z-30 -mx-4 px-4 py-3">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {INVOICE_MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition text-sm font-medium',
                isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
