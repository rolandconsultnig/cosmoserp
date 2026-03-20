import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Search, Package, Plus, Minus, Trash2, User, UserCheck,
  CreditCard, Banknote, Smartphone, CheckCircle, Printer,
  RotateCcw, X, ShoppingCart, Tag, Percent, Hash,
  ChevronDown, Loader2, AlertCircle, Zap, Receipt, FileText, Mail, MessageCircle,
} from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, cn } from '../lib/utils';
import useAuthStore from '../store/authStore';

/* ══════════════════════════════════════════════════════════
   Constants & helpers
══════════════════════════════════════════════════════════ */
const VAT_RATE = 0.075;

const CARD_PALETTES = [
  { bg: '#EFF6FF', border: '#BFDBFE', icon: '#2563EB', iconBg: '#DBEAFE' },
  { bg: '#F0FDF4', border: '#BBF7D0', icon: '#16A34A', iconBg: '#DCFCE7' },
  { bg: '#FFF7ED', border: '#FED7AA', icon: '#EA580C', iconBg: '#FFEDD5' },
  { bg: '#FDF4FF', border: '#E9D5FF', icon: '#9333EA', iconBg: '#F3E8FF' },
  { bg: '#FFF1F2', border: '#FECDD3', icon: '#E11D48', iconBg: '#FFE4E6' },
  { bg: '#F0FDFA', border: '#99F6E4', icon: '#0D9488', iconBg: '#CCFBF1' },
  { bg: '#FFFBEB', border: '#FDE68A', icon: '#D97706', iconBg: '#FEF3C7' },
  { bg: '#F5F3FF', border: '#DDD6FE', icon: '#7C3AED', iconBg: '#EDE9FE' },
];

function getPalette(str = '') {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CARD_PALETTES[h % CARD_PALETTES.length];
}

function genReceiptNo() {
  const d   = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return `POS-${ymd}-${rnd}`;
}

/* ══════════════════════════════════════════════════════════
   Sub-components
══════════════════════════════════════════════════════════ */

/* ── Product card ─────────────────────────────────────── */
function ProductCard({ product, onAdd, justAdded }) {
  const pal   = getPalette(product.name);
  const stock = product.totalStock ?? product.stockQuantity ?? product.stock ?? null;
  const low   = stock !== null && stock > 0 && stock <= (product.reorderPoint || 10);
  const out   = stock !== null && stock <= 0;

  return (
    <button
      onClick={() => !out && onAdd(product)}
      disabled={out}
      className={cn(
        'relative rounded-xl text-left transition-all duration-150 overflow-hidden w-full',
        'border group focus:outline-none focus:ring-2 focus:ring-emerald-500',
        out ? 'opacity-40 cursor-not-allowed' : 'hover:-translate-y-0.5 active:scale-95 cursor-pointer',
        justAdded && 'ring-2 ring-emerald-400',
      )}
      style={{
        background: pal.bg,
        borderColor: justAdded ? '#34D399' : pal.border,
        boxShadow: justAdded
          ? '0 0 0 3px rgba(52,211,153,0.20), 0 4px 12px rgba(0,0,0,0.08)'
          : '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      {/* Added flash overlay */}
      {justAdded && (
        <div className="absolute inset-0 bg-emerald-400/10 flex items-center justify-center z-10 rounded-xl pointer-events-none">
          <CheckCircle className="w-8 h-8 text-emerald-500 drop-shadow-sm" />
        </div>
      )}

      {/* Icon area */}
      <div
        className="h-16 flex items-center justify-center relative overflow-hidden"
        style={{ background: pal.iconBg }}
      >
        <Package
          className="w-7 h-7 transition-transform duration-150 group-hover:scale-110"
          style={{ color: pal.icon }}
          strokeWidth={1.5}
        />
        {/* Hover "+" badge */}
        <div
          className="absolute bottom-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: pal.icon }}
        >
          <Plus className="w-3 h-3 text-white" />
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-[12px] font-bold text-slate-800 leading-tight line-clamp-2 mb-1" title={product.name}>
          {product.name}
        </p>
        <p className="text-[11px] font-black" style={{ color: pal.icon }}>
          {formatCurrency(product.sellingPrice)}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          per {product.unit || 'unit'}
          {product.sku && <span className="ml-1 font-mono opacity-60">{product.sku}</span>}
        </p>

        {/* Stock badge */}
        {stock !== null && (
          <div className={cn(
            'mt-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold',
            out  ? 'bg-red-100 text-red-600'
                 : low ? 'bg-amber-100 text-amber-700'
                       : 'bg-emerald-100 text-emerald-700',
          )}>
            {out ? 'Out of stock' : low ? `Low: ${stock}` : `${stock} in stock`}
          </div>
        )}
      </div>
    </button>
  );
}

/* ── Cart row ─────────────────────────────────────────── */
function CartRow({ item, onQty, onRemove, onPriceEdit }) {
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput]     = useState(String(item.unitPrice));
  const priceRef = useRef();

  const commitPrice = () => {
    const v = parseFloat(priceInput);
    if (!isNaN(v) && v > 0) onPriceEdit(item.cartId, v);
    else setPriceInput(String(item.unitPrice));
    setEditingPrice(false);
  };

  useEffect(() => {
    if (editingPrice) priceRef.current?.select();
  }, [editingPrice]);

  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all"
      style={{ background: 'rgba(255,255,255,0.05)', marginBottom: 4 }}
    >
      {/* Name + price */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-white truncate" title={item.name}>{item.name}</p>
        <div className="flex items-center gap-1 mt-0.5">
          {editingPrice ? (
            <input
              ref={priceRef}
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              onBlur={commitPrice}
              onKeyDown={(e) => e.key === 'Enter' && commitPrice()}
              className="w-24 bg-slate-700 text-white text-[11px] px-1.5 py-0.5 rounded border border-emerald-500 focus:outline-none"
              type="number"
              min="0"
            />
          ) : (
            <button
              onClick={() => { setEditingPrice(true); setPriceInput(String(item.unitPrice)); }}
              className="text-[11px] text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-0.5"
              title="Click to override price"
            >
              {formatCurrency(item.unitPrice)} / {item.unit || 'unit'}
            </button>
          )}
        </div>
      </div>

      {/* Qty controls */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onQty(item.cartId, -1)}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 transition-all"
          style={{ background: 'rgba(255,255,255,0.08)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.16)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="w-7 text-center text-[13px] font-black text-white tabular-nums">
          {item.qty}
        </span>
        <button
          onClick={() => onQty(item.cartId, +1)}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 transition-all"
          style={{ background: 'rgba(255,255,255,0.08)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.16)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Line total */}
      <div className="w-20 text-right flex-shrink-0">
        <p className="text-[13px] font-black text-emerald-400 tabular-nums">
          {formatCurrency(item.unitPrice * item.qty)}
        </p>
      </div>

      {/* Delete */}
      <button
        onClick={() => onRemove(item.cartId)}
        className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all text-slate-600 hover:text-red-400 hover:bg-red-500/10"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ── Receipt Modal ────────────────────────────────────── */
function ReceiptModal({ sale, tenant, user, onNewSale }) {
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceSent, setInvoiceSent] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');
  const [receiptSendLoading, setReceiptSendLoading] = useState(false);
  const [receiptSendDone, setReceiptSendDone] = useState({ email: false, whatsapp: false });

  const handlePrint = () => window.print();

  const handleSendReceipt = async (sendEmail, sendWhatsApp) => {
    if (!sale.saleId) return;
    setInvoiceError('');
    setReceiptSendLoading(true);
    try {
      await api.post(`/pos/sales/${sale.saleId}/send-receipt`, { sendEmail, sendWhatsApp });
      setReceiptSendDone((p) => ({ ...p, ...(sendEmail && { email: true }), ...(sendWhatsApp && { whatsapp: true }) }));
    } catch (err) {
      setInvoiceError(err.response?.data?.error || err.message || 'Failed to send receipt');
    } finally {
      setReceiptSendLoading(false);
    }
  };

  const handleCreateInvoice = async (sendEmail = false, sendWhatsApp = false) => {
    if (!sale.saleId) {
      setInvoiceError('Sale ID not available');
      return;
    }
    setInvoiceError('');
    setInvoiceLoading(true);
    try {
      await api.post(`/pos/sales/${sale.saleId}/create-invoice`, { sendEmail, sendWhatsApp });
      setInvoiceSent(true);
    } catch (err) {
      setInvoiceError(err.response?.data?.error || err.message || 'Failed to create invoice');
    } finally {
      setInvoiceLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
        {/* Success header */}
        <div
          className="px-6 py-5 text-center"
          style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}
        >
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h2 className="text-[18px] font-black text-white">Sale Complete!</h2>
          <p className="text-emerald-100 text-[13px] mt-0.5">{sale.receiptNo}</p>
        </div>

        {/* Receipt body */}
        <div className="pos-receipt" id="pos-receipt-print">
          <div className="px-5 pt-4 pb-2 text-center border-b border-dashed border-slate-200">
            <p className="text-[14px] font-black text-slate-900">
              {tenant?.tradingName || tenant?.businessName}
            </p>
            <p className="text-[11px] text-slate-500">Point of Sale Receipt</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {sale.receiptNo} &nbsp;·&nbsp; {new Date().toLocaleString('en-NG')}
            </p>
            <p className="text-[11px] text-slate-400">
              Cashier: {user?.firstName} {user?.lastName}
            </p>
          </div>

          {sale.customerName && (
            <div className="px-5 py-2 text-[12px] text-slate-600 border-b border-dashed border-slate-200">
              Customer: <span className="font-semibold">{sale.customerName}</span>
            </div>
          )}

          {/* Items */}
          <div className="px-5 py-3 space-y-2 border-b border-dashed border-slate-200">
            {sale.items.map((item, i) => (
              <div key={i} className="flex justify-between text-[12px]">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-semibold text-slate-900 truncate">{item.name}</p>
                  <p className="text-slate-400">{item.qty}× {formatCurrency(item.unitPrice)}</p>
                </div>
                <p className="font-bold text-slate-900 tabular-nums flex-shrink-0">
                  {formatCurrency(item.unitPrice * item.qty)}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="px-5 py-3 space-y-1.5 text-[12px] border-b border-dashed border-slate-200">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discountAmt > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Discount{sale.discountLabel}</span>
                <span className="tabular-nums">− {formatCurrency(sale.discountAmt)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>VAT (7.5%)</span>
              <span className="tabular-nums">{formatCurrency(sale.vat)}</span>
            </div>
            <div className="flex justify-between font-black text-slate-900 text-[14px] pt-1 border-t border-slate-200">
              <span>TOTAL</span>
              <span className="tabular-nums">{formatCurrency(sale.total)}</span>
            </div>
          </div>

          {/* Payment */}
          <div className="px-5 py-3 text-[12px] border-b border-dashed border-slate-200">
            <div className="flex justify-between text-slate-600">
              <span>Payment</span>
              <span className="font-semibold text-slate-900">{sale.payMethod}</span>
            </div>
            {sale.payMethod === 'CASH' && (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>Tendered</span>
                  <span className="tabular-nums">{formatCurrency(sale.amountTendered)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>Change</span>
                  <span className="tabular-nums">{formatCurrency(sale.change)}</span>
                </div>
              </>
            )}
          </div>

          <div className="px-5 py-3 text-center">
            <p className="text-[11px] text-slate-400">Thank you for your patronage!</p>
            <p className="text-[10px] text-slate-300 mt-0.5">Powered by Cosmos ERP</p>
          </div>
        </div>

        {/* Print style injected into head */}
        <style>{`@media print{body *{visibility:hidden}.pos-receipt,.pos-receipt *{visibility:visible}.pos-receipt{position:fixed;top:0;left:0;width:80mm;font-size:12px}}`}</style>

        {/* Success / error messages */}
        {invoiceSent && (
          <div className="mx-5 mb-3 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-[12px] font-medium">
            Invoice created and sent where requested.
          </div>
        )}
        {(receiptSendDone.email || receiptSendDone.whatsapp) && (
          <div className="mx-5 mb-3 px-3 py-2 rounded-xl bg-sky-50 text-sky-800 text-[12px] font-medium">
            Receipt sent {[receiptSendDone.email && 'by email', receiptSendDone.whatsapp && 'via WhatsApp'].filter(Boolean).join(' & ')}.
          </div>
        )}
        {invoiceError && (
          <div className="mx-5 mb-3 px-3 py-2 rounded-xl bg-red-50 text-red-700 text-[12px]">
            {invoiceError}
          </div>
        )}

        {/* Actions: Print, Send receipt, Create/Send invoice */}
        <div className="px-5 pb-5 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            {sale.saleId && (sale.customerEmail || sale.customerWhatsapp) && (
              <div className="flex gap-1 flex-1">
                {sale.customerEmail && (
                  <button
                    onClick={() => handleSendReceipt(true, false)}
                    disabled={receiptSendLoading || receiptSendDone.email}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
                    title="Send receipt by email"
                  >
                    {receiptSendLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                    Receipt → Email
                  </button>
                )}
                {sale.customerWhatsapp && (
                  <button
                    onClick={() => handleSendReceipt(false, true)}
                    disabled={receiptSendLoading || receiptSendDone.whatsapp}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-bold border border-green-200 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-60"
                    title="Send receipt via WhatsApp"
                  >
                    {receiptSendLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
                    Receipt → WhatsApp
                  </button>
                )}
              </div>
            )}
          </div>
          {sale.saleId && (
            <div className="flex gap-2">
              <button
                onClick={() => handleCreateInvoice(false, false)}
                disabled={invoiceLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-colors disabled:opacity-60"
              >
                {invoiceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Create invoice
              </button>
              {sale.customerEmail && (
                <button
                  onClick={() => handleCreateInvoice(true, false)}
                  disabled={invoiceLoading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  title="Create invoice and email it"
                >
                  <Mail className="w-3.5 h-3.5" /> Invoice → Email
                </button>
              )}
              {sale.customerWhatsapp && (
                <button
                  onClick={() => handleCreateInvoice(false, true)}
                  disabled={invoiceLoading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-bold border border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-60"
                  title="Create invoice and send via WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Invoice → WhatsApp
                </button>
              )}
            </div>
          )}
          <button
            onClick={onNewSale}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold text-white transition-colors"
            style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}
          >
            <Zap className="w-4 h-4" /> New Sale
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main PoS Page
══════════════════════════════════════════════════════════ */
export default function POSPage() {
  const { user, tenant } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef(null);

  /* ── Product catalog state ── */
  const [search, setSearch]             = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [justAdded, setJustAdded]       = useState(null); // productId flashed green

  /* ── Cart state ── */
  const [cart, setCart]                 = useState([]);
  const [noteModal, setNoteModal]       = useState(false);

  /* ── Customer ── */
  const [customerQuery, setCustomerQuery]       = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const customerRef = useRef();

  /* ── Discount ── */
  const [discountType, setDiscountType]   = useState('percent'); // 'percent' | 'amount'
  const [discountValue, setDiscountValue] = useState('');

  /* ── Payment ── */
  const [payMethod, setPayMethod]         = useState('CASH');
  const [amountTendered, setAmountTendered] = useState('');
  const [tenderTouched, setTenderTouched] = useState(false);

  /* ── Completed sale / receipt ── */
  const [completedSale, setCompletedSale] = useState(null);

  /* ── Quotation success (after Save as Quotation) ── */
  const [quotationSuccess, setQuotationSuccess] = useState(null);
  const [quotationSendLoading, setQuotationSendLoading] = useState(false);

  /* ── Error ── */
  const [saleError, setSaleError] = useState('');

  /* ── Session stats ── */
  const [sessionSales, setSessionSales] = useState({ count: 0, total: 0 });

  /* ══════════════════════════════════
     Data fetching
  ══════════════════════════════════ */
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['pos-products', search],
    queryFn: () =>
      api.get('/products', { params: { limit: 200, search: search || undefined, isActive: true } })
        .then((r) => r.data),
    staleTime: 60000,
  });

  const { data: customersData } = useQuery({
    queryKey: ['pos-customers', customerQuery],
    queryFn: () =>
      api.get('/customers', { params: { limit: 8, search: customerQuery } })
        .then((r) => r.data),
    enabled: customerQuery.length >= 1,
    staleTime: 30000,
  });

  const saleMutation = useMutation({
    mutationFn: (payload) => api.post('/pos/sale', payload),
  });

  const quotationMutation = useMutation({
    mutationFn: (payload) => api.post('/pos/create-quotation', payload),
  });

  /* ══════════════════════════════════
     Derived data
  ══════════════════════════════════ */
  const allProducts  = productsData?.data || [];
  const categories   = ['ALL', ...new Set(allProducts.map((p) => p.category || p.categoryName).filter(Boolean))];
  const products     = categoryFilter === 'ALL'
    ? allProducts
    : allProducts.filter((p) => (p.category || p.categoryName) === categoryFilter);

  const customers    = customersData?.data || [];

  /* Pre-add product when navigating from dashboard with state.addProductId */
  const pendingAddId = location.state?.addProductId;
  const lastAppliedAddRef = useRef(null);
  useEffect(() => {
    if (!pendingAddId || allProducts.length === 0 || lastAppliedAddRef.current === pendingAddId) return;
    const product = allProducts.find((p) => p.id === pendingAddId);
    if (product) {
      lastAppliedAddRef.current = pendingAddId;
      addToCart(product);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [pendingAddId, allProducts, addToCart, navigate, location.pathname]);

  /* ══════════════════════════════════
     Cart calculations
  ══════════════════════════════════ */
  const subtotal     = cart.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const discountAmt  = discountValue
    ? discountType === 'percent'
      ? subtotal * (parseFloat(discountValue) / 100)
      : parseFloat(discountValue)
    : 0;
  const afterDiscount = Math.max(0, subtotal - discountAmt);
  const vat           = afterDiscount * VAT_RATE;
  const total         = afterDiscount + vat;
  const tendered      = parseFloat(amountTendered) || 0;
  const change        = payMethod === 'CASH' ? tendered - total : 0;
  const canCharge     = cart.length > 0
    && (payMethod !== 'CASH' || tendered >= total);

  const quickTenderOptions = (() => {
    const t = Math.ceil(total);
    if (!isFinite(t) || t <= 0) return [];
    const opts = new Set([t, 100, 200, 500, 1000, 2000, 5000, 10000]);
    // nearest rounding helpers
    const roundTo = (n, step) => Math.ceil(n / step) * step;
    opts.add(roundTo(t, 50));
    opts.add(roundTo(t, 100));
    return Array.from(opts).filter((n) => n >= t).sort((a, b) => a - b).slice(0, 6);
  })();

  /* ══════════════════════════════════
     Cart operations
  ══════════════════════════════════ */
  const addToCart = useCallback((product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [...prev, {
        cartId:    product.id,
        productId: product.id,
        name:      product.name,
        unit:      product.unit || 'unit',
        unitPrice: product.sellingPrice,
        qty:       1,
      }];
    });
    setJustAdded(product.id);
    setTimeout(() => setJustAdded(null), 900);
  }, []);

  const updateQty = useCallback((cartId, delta) => {
    setCart((prev) =>
      prev.map((i) => i.cartId === cartId ? { ...i, qty: Math.max(1, i.qty + delta) } : i),
    );
  }, []);

  const removeFromCart = useCallback((cartId) => {
    setCart((prev) => prev.filter((i) => i.cartId !== cartId));
  }, []);

  const overridePrice = useCallback((cartId, price) => {
    setCart((prev) => prev.map((i) => i.cartId === cartId ? { ...i, unitPrice: price } : i));
  }, []);

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setCustomerQuery('');
    setDiscountValue('');
    setAmountTendered('');
    setTenderTouched(false);
    setPayMethod('CASH');
    setSaleError('');
    setQuotationSuccess(null);
  };

  const handleSaveAsQuotation = async () => {
    if (cart.length === 0) return;
    setSaleError('');
    try {
      const result = await quotationMutation.mutateAsync({
        customerId: selectedCustomer?.id || undefined,
        customerName: selectedCustomer?.name || selectedCustomer?.businessName || undefined,
        items: cart.map((i) => ({
          productId: i.productId || undefined,
          name: i.name,
          qty: i.qty,
          unitPrice: i.unitPrice,
        })),
      });
      const quote = result?.data?.data;
      setQuotationSuccess(quote ? { quoteNumber: quote.quoteNumber, id: quote.id } : { quoteNumber: 'Saved', id: null });
    } catch (err) {
      setSaleError(err.response?.data?.error || err.message || 'Failed to save quotation');
    }
  };

  /* ══════════════════════════════════
     Complete sale
  ══════════════════════════════════ */
  const handleCharge = async () => {
    setSaleError('');
    const receiptNo = genReceiptNo();
    try {
      const result = await saleMutation.mutateAsync({
        customerId:     selectedCustomer?.id || null,
        customerName:   selectedCustomer?.name || selectedCustomer?.businessName || null,
        items:          cart.map((i) => ({ productId: i.productId, name: i.name, qty: i.qty, unitPrice: i.unitPrice })),
        paymentMethod:  payMethod,
        discountAmount: discountAmt,
        discount:       discountAmt,
        discountType,
        amountTendered: payMethod === 'CASH' ? tendered : undefined,
        subtotal,
        vatAmount:      vat,
        total,
        totalAmount:    total,
        receiptNo,
        notes: `POS Sale – ${payMethod}${selectedCustomer ? ` – ${selectedCustomer.name}` : ''}`,
      });

      const saleData = {
        saleId:         result?.data?.data?.id ?? null,
        receiptNo,
        items:          cart.map((i) => ({ ...i })),
        subtotal,
        discountAmt,
        discountLabel:  discountValue
          ? discountType === 'percent' ? ` (${discountValue}%)` : ''
          : '',
        vat,
        total,
        payMethod,
        amountTendered: tendered,
        change:         Math.max(0, change),
        customerName:   selectedCustomer?.name || selectedCustomer?.businessName || null,
        customerEmail:  selectedCustomer?.email || null,
        customerWhatsapp: selectedCustomer?.whatsapp || selectedCustomer?.phone || null,
      };
      setCompletedSale(saleData);
      setSessionSales((s) => ({ count: s.count + 1, total: s.total + total }));
    } catch (err) {
      setSaleError(err.response?.data?.error || err.message || 'Sale failed — check your connection');
    }
  };

  /* ══════════════════════════════════
     Close customer dropdown on outside click
  ══════════════════════════════════ */
  useEffect(() => {
    const handler = (e) => {
      if (customerRef.current && !customerRef.current.contains(e.target)) {
        setShowCustomerDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ══════════════════════════════════
     Auto-fill tendered with total (convenience)
  ══════════════════════════════════ */
  useEffect(() => {
    if (payMethod !== 'CASH') return;
    if (tenderTouched) return;
    if (cart.length === 0) {
      if (amountTendered !== '') setAmountTendered('');
      return;
    }
    if (amountTendered === '' && total > 0) {
      setAmountTendered(String(Math.ceil(total)));
    }
  }, [total, payMethod, cart.length, amountTendered, tenderTouched]);

  /* ══════════════════════════════════
     Keyboard shortcuts
     - F2: focus product search
     - F9: charge
     - Esc: clear search
  ══════════════════════════════════ */
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'F9') {
        e.preventDefault();
        if (canCharge && !saleMutation.isPending) handleCharge();
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        setSearch('');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canCharge, saleMutation.isPending, handleCharge]);

  /* ══════════════════════════════════
     RENDER
  ══════════════════════════════════ */
  return (
    <div className="flex h-full overflow-hidden">

      {/* ╔══════════════════════════════════════════════════╗
          ║  LEFT — Product Catalog                         ║
          ╚══════════════════════════════════════════════════╝ */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden" style={{ background: '#F1F5F9' }}>

        {/* Search + session stats bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white flex-shrink-0">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products or scan barcode…"
              className="w-full pl-9 pr-4 py-2 text-[13px] border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400">
            <Package className="w-3.5 h-3.5" />
            {products.length} products
          </div>

          <div className="flex-1" />

          {/* Session stats */}
          <div className="hidden sm:flex items-center gap-4 text-[12px]">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Receipt className="w-3.5 h-3.5" />
              <span><strong className="text-slate-800">{sessionSales.count}</strong> sales today</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <span>Session: <strong className="text-emerald-700">{formatCurrency(sessionSales.total)}</strong></span>
            </div>
          </div>
        </div>

        {/* Category tabs */}
        {categories.length > 1 && (
          <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-200 bg-white flex-shrink-0 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all',
                  categoryFilter === cat
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100',
                )}
              >
                {cat === 'ALL' ? 'All Products' : cat}
              </button>
            ))}
          </div>
        )}

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {productsLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {[...Array(18)].map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden animate-pulse">
                  <div className="h-16 bg-slate-200" />
                  <div className="p-2.5 bg-white space-y-1.5">
                    <div className="h-3 bg-slate-100 rounded-lg w-3/4" />
                    <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <Package className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-[15px] font-semibold text-slate-500">No products found</p>
              <p className="text-[13px] text-slate-400 mt-1">
                {search ? `No results for "${search}"` : 'Add products in the Products module'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onAdd={addToCart}
                  justAdded={justAdded === p.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ╔══════════════════════════════════════════════════╗
          ║  RIGHT — Cart & Checkout                        ║
          ╚══════════════════════════════════════════════════╝ */}
      <div
        className="w-[380px] xl:w-[420px] flex-shrink-0 flex flex-col overflow-hidden border-l"
        style={{ background: '#0F172A', borderColor: 'rgba(255,255,255,0.06)' }}
      >

        {/* Cart header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-emerald-400" />
            <span className="text-[13px] font-bold text-white">Current Sale</span>
            {cart.length > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-black text-white"
                style={{ background: '#10B981' }}
              >
                {cart.reduce((s, i) => s + i.qty, 0)}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-red-400 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Void
            </button>
          )}
        </div>

        {/* Cart items list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <ShoppingCart className="w-7 h-7 text-slate-600" />
              </div>
              <p className="text-[14px] font-semibold text-slate-500">Cart is empty</p>
              <p className="text-[12px] text-slate-600 mt-1">Click a product to add it</p>
              <p className="text-[11px] text-slate-700 mt-3">Shortcut: Press <span className="font-mono">F2</span> to focus search</p>
            </div>
          ) : (
            <div className="space-y-0.5 py-1">
              {cart.map((item) => (
                <CartRow
                  key={item.cartId}
                  item={item}
                  onQty={updateQty}
                  onRemove={removeFromCart}
                  onPriceEdit={overridePrice}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Bottom checkout panel ── */}
        {cart.length > 0 && (
          <div
            className="flex-shrink-0 border-t px-4 pt-3 pb-4 space-y-3 overflow-y-auto"
            style={{ borderColor: 'rgba(255,255,255,0.07)', maxHeight: '62%', background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(10px)' }}
          >

            {/* Customer selector */}
            <div ref={customerRef} className="relative">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Customer
              </label>
              {selectedCustomer ? (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.30)' }}
                >
                  <UserCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-emerald-300 truncate">
                      {selectedCustomer.name || selectedCustomer.businessName}
                    </p>
                    {selectedCustomer.phone && (
                      <p className="text-[10px] text-emerald-500">{selectedCustomer.phone}</p>
                    )}
                  </div>
                  <button
                    onClick={() => { setSelectedCustomer(null); setCustomerQuery(''); }}
                    className="text-emerald-600 hover:text-emerald-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    value={customerQuery}
                    onChange={(e) => { setCustomerQuery(e.target.value); setShowCustomerDrop(true); }}
                    onFocus={() => setShowCustomerDrop(true)}
                    placeholder="Walk-in customer (or search…)"
                    className="w-full pl-8 pr-3 py-2 text-[12px] rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      color: 'rgba(255,255,255,0.70)',
                    }}
                  />
                  {showCustomerDrop && customers.length > 0 && (
                    <div
                      className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-20 shadow-2xl"
                      style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.10)' }}
                    >
                      {customers.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedCustomer(c); setCustomerQuery(''); setShowCustomerDrop(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[12px] transition-colors hover:bg-white/5"
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}
                          >
                            {(c.name || c.businessName || '?')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate">{c.name || c.businessName}</p>
                            {c.phone && <p className="text-slate-400 text-[10px]">{c.phone}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Discount */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Discount
              </label>
              <div className="flex gap-2">
                {/* Type toggle */}
                <div
                  className="flex rounded-xl overflow-hidden flex-shrink-0"
                  style={{ border: '1px solid rgba(255,255,255,0.10)' }}
                >
                  {[['percent', '%'], ['amount', '₦']].map(([type, label]) => (
                    <button
                      key={type}
                      onClick={() => setDiscountType(type)}
                      className="px-3 py-2 text-[12px] font-bold transition-all"
                      style={discountType === type
                        ? { background: '#6366F1', color: '#fff' }
                        : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.40)' }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="0"
                  max={discountType === 'percent' ? 100 : subtotal}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="0"
                  className="flex-1 px-3 py-2 text-[13px] rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 tabular-nums"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    color: 'rgba(255,255,255,0.85)',
                  }}
                />
              </div>
            </div>

            {/* Totals */}
            <div
              className="rounded-xl p-3 space-y-1.5 text-[12px]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              {discountAmt > 0 && (
                <div className="flex justify-between text-indigo-400">
                  <span>Discount {discountType === 'percent' ? `(${discountValue}%)` : ''}</span>
                  <span className="tabular-nums">− {formatCurrency(discountAmt)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>VAT 7.5%</span>
                <span className="tabular-nums">{formatCurrency(vat)}</span>
              </div>
              <div
                className="flex justify-between font-black text-[16px] pt-1.5 border-t"
                style={{ borderColor: 'rgba(255,255,255,0.10)', color: '#34D399' }}
              >
                <span>TOTAL</span>
                <span className="tabular-nums">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'CASH',     icon: Banknote,    label: 'Cash' },
                  { id: 'CARD',     icon: CreditCard,  label: 'Card / POS' },
                  { id: 'TRANSFER', icon: Smartphone,  label: 'Transfer' },
                ].map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setPayMethod(id)}
                    className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-bold transition-all"
                    style={payMethod === id
                      ? { background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', boxShadow: '0 4px 12px rgba(16,185,129,0.30)' }
                      : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash tendered */}
            {payMethod === 'CASH' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Amount Tendered
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    value={amountTendered}
                    onChange={(e) => { setTenderTouched(true); setAmountTendered(e.target.value); }}
                    placeholder={`Min: ${formatCurrency(total)}`}
                    className="flex-1 px-3 py-2.5 text-[14px] font-bold rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      border: `1px solid ${tendered >= total && tendered > 0 ? 'rgba(52,211,153,0.40)' : 'rgba(255,255,255,0.10)'}`,
                      color: '#fff',
                    }}
                  />
                  {/* Quick amount buttons */}
                  <div className="flex flex-col gap-1">
                    {[Math.ceil(total / 1000) * 1000, Math.ceil(total / 5000) * 5000].filter((n) => isFinite(n) && n > 0).map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => { setTenderTouched(true); setAmountTendered(String(amt)); }}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                        style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.60)', border: '1px solid rgba(255,255,255,0.10)' }}
                      >
                        {(amt / 1000).toFixed(0)}k
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => { setTenderTouched(false); setAmountTendered(''); }}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.50)', border: '1px solid rgba(255,255,255,0.10)' }}
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {quickTenderOptions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {quickTenderOptions.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => { setTenderTouched(true); setAmountTendered(String(amt)); }}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-black border border-white/10 text-slate-200 hover:bg-white/10"
                        title="Set tendered"
                      >
                        {formatCurrency(amt)}
                      </button>
                    ))}
                  </div>
                )}

                {/* Change due */}
                {tendered > 0 && (
                  <div
                    className="mt-2 flex justify-between items-center px-3 py-2 rounded-xl text-[13px] font-black"
                    style={change >= 0
                      ? { background: 'rgba(52,211,153,0.10)', color: '#34D399', border: '1px solid rgba(52,211,153,0.20)' }
                      : { background: 'rgba(248,113,113,0.10)', color: '#F87171', border: '1px solid rgba(248,113,113,0.20)' }}
                  >
                    <span>{change >= 0 ? 'Change Due' : 'Insufficient'}</span>
                    <span className="tabular-nums">{formatCurrency(Math.abs(change))}</span>
                  </div>
                )}
              </div>
            )}

            {/* Quotation success */}
            {quotationSuccess && (
              <div
                className="px-3 py-2.5 rounded-xl text-[12px] space-y-2"
                style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.30)', color: '#34D399' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">Quotation {quotationSuccess.quoteNumber} saved</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { navigate('/quotes'); setQuotationSuccess(null); }}
                      className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white/20 hover:bg-white/30"
                    >
                      View quotes
                    </button>
                    <button
                      onClick={clearCart}
                      className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white/20 hover:bg-white/30"
                    >
                      Clear cart
                    </button>
                  </div>
                </div>
                {quotationSuccess.id && (
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="text-[11px] opacity-90">Send:</span>
                    <button
                      onClick={async () => {
                        setQuotationSendLoading(true);
                        setSaleError('');
                        try {
                          await api.post(`/quotes/${quotationSuccess.id}/send`, { sendEmail: true });
                        } catch (e) {
                          setSaleError(e.response?.data?.error || e.message || 'Failed to send');
                        } finally {
                          setQuotationSendLoading(false);
                        }
                      }}
                      disabled={quotationSendLoading}
                      className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white/20 hover:bg-white/30 flex items-center gap-1 disabled:opacity-60"
                    >
                      {quotationSendLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                      Email
                    </button>
                    <button
                      onClick={async () => {
                        setQuotationSendLoading(true);
                        setSaleError('');
                        try {
                          await api.post(`/quotes/${quotationSuccess.id}/send`, { sendWhatsApp: true });
                        } catch (e) {
                          setSaleError(e.response?.data?.error || e.message || 'Failed to send');
                        } finally {
                          setQuotationSendLoading(false);
                        }
                      }}
                      disabled={quotationSendLoading}
                      className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white/20 hover:bg-white/30 flex items-center gap-1 disabled:opacity-60"
                    >
                      {quotationSendLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />}
                      WhatsApp
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Sale error */}
            {saleError && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-[12px]"
                style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', color: '#FCA5A5' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {saleError}
              </div>
            )}

            {/* Save as Quotation */}
            <button
              type="button"
              onClick={handleSaveAsQuotation}
              disabled={quotationMutation.isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold border transition-colors disabled:opacity-60"
              style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.06)' }}
            >
              {quotationMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              Save as Quotation
            </button>

            {/* Charge button */}
            <button
              onClick={handleCharge}
              disabled={!canCharge || saleMutation.isPending}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-[15px] font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              style={canCharge
                ? { background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)', color: '#fff', boxShadow: '0 4px 20px rgba(16,185,129,0.40)' }
                : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.30)' }}
            >
              {saleMutation.isPending ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Processing…</>
              ) : (
                <><Zap className="w-5 h-5" /> Charge {formatCurrency(total)} <span className="text-[11px] font-black opacity-80">(F9)</span></>
              )}
            </button>

          </div>
        )}
      </div>

      {/* Empty cart panel */}
      {cart.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-[14px] text-slate-400">
          <span className="text-[18px] font-bold mb-2">Your cart is empty</span>
          <span className="text-[12px] opacity-80 mb-4">Press F2 to add items</span>
          <button
            onClick={() => searchRef.current?.focus()}
            className="px-4 py-2 rounded-lg text-[12px] font-bold bg-white/20 hover:bg-white/30"
          >
            Add item
          </button>
        </div>
      )}

      {/* ── Receipt modal ── */}
      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          tenant={tenant}
          user={user}
          onNewSale={() => { setCompletedSale(null); clearCart(); }}
        />
      )}
    </div>
  );
}
