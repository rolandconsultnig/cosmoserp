const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');
const { formatCurrency } = require('../utils/helpers');
const { logger } = require('../utils/logger');

const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';

function getInvoiceTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #333; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
  .company-name { font-size: 24px; font-weight: bold; color: #1a56db; }
  .invoice-title { font-size: 20px; font-weight: bold; color: #374151; text-align: right; }
  .invoice-meta { text-align: right; color: #6b7280; margin-top: 5px; }
  .badges { display: flex; gap: 8px; margin-top: 10px; justify-content: flex-end; }
  .badge { padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: bold; }
  .badge-approved { background: #d1fae5; color: #065f46; }
  .badge-pending { background: #fef3c7; color: #92400e; }
  .divider { border-top: 2px solid #1a56db; margin: 20px 0; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 25px; }
  .party-box { width: 48%; }
  .party-label { font-size: 10px; font-weight: bold; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
  .party-name { font-size: 14px; font-weight: bold; color: #111827; }
  .party-detail { color: #6b7280; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead th { background: #1a56db; color: white; padding: 8px 10px; text-align: left; font-size: 11px; }
  tbody tr:nth-child(even) { background: #f9fafb; }
  tbody td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
  .text-right { text-align: right; }
  .totals-box { width: 300px; margin-left: auto; }
  .total-row { display: flex; justify-content: space-between; padding: 4px 0; }
  .total-final { font-weight: bold; font-size: 14px; border-top: 2px solid #1a56db; padding-top: 8px; margin-top: 4px; }
  .nrs-section { margin-top: 25px; padding: 15px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; }
  .nrs-title { font-weight: bold; color: #065f46; margin-bottom: 8px; }
  .nrs-detail { color: #047857; font-size: 11px; margin: 2px 0; }
  .qr-section { display: flex; gap: 15px; align-items: flex-start; }
  .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 10px; text-align: center; }
  .notes-section { margin-top: 20px; padding: 12px; background: #f9fafb; border-radius: 6px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">{{tenantName}}</div>
      <div style="color: #6b7280; margin-top: 4px;">{{tenantAddress}}</div>
      <div style="color: #6b7280;">TIN: {{tenantTin}}</div>
    </div>
    <div>
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-meta"># {{invoiceNumber}}</div>
      <div class="invoice-meta">Issued: {{issueDate}}</div>
      <div class="invoice-meta">Due: {{dueDate}}</div>
      <div class="badges">
        <span class="badge {{#if nrsApproved}}badge-approved{{else}}badge-pending{{/if}}">
          {{#if nrsApproved}}✓ NRS Approved{{else}}⏳ NRS Pending{{/if}}
        </span>
      </div>
    </div>
  </div>

  <div class="divider"></div>

  <div class="parties">
    <div class="party-box">
      <div class="party-label">Bill From</div>
      <div class="party-name">{{tenantName}}</div>
      <div class="party-detail">{{tenantEmail}}</div>
      <div class="party-detail">{{tenantPhone}}</div>
    </div>
    <div class="party-box">
      <div class="party-label">Bill To</div>
      <div class="party-name">{{customerName}}</div>
      <div class="party-detail">{{customerEmail}}</div>
      <div class="party-detail">{{customerAddress}}</div>
      {{#if customerTin}}<div class="party-detail">TIN: {{customerTin}}</div>{{/if}}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Description</th>
        <th class="text-right">Qty</th>
        <th class="text-right">Unit Price</th>
        <th class="text-right">VAT (7.5%)</th>
        <th class="text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      {{#each lines}}
      <tr>
        <td>{{inc @index}}</td>
        <td>{{description}}</td>
        <td class="text-right">{{quantity}}</td>
        <td class="text-right">{{formatAmount unitPrice}}</td>
        <td class="text-right">{{formatAmount vatAmount}}</td>
        <td class="text-right">{{formatAmount lineTotal}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="totals-box">
    <div class="total-row"><span>Subtotal:</span><span>{{subtotal}}</span></div>
    <div class="total-row"><span>VAT (7.5%):</span><span>{{vatAmount}}</span></div>
    {{#if whtAmount}}<div class="total-row"><span>WHT:</span><span>-{{whtAmount}}</span></div>{{/if}}
    {{#if discountAmount}}<div class="total-row"><span>Discount:</span><span>-{{discountAmount}}</span></div>{{/if}}
    <div class="total-row total-final"><span>TOTAL ({{currency}}):</span><span>{{totalAmount}}</span></div>
    {{#if amountPaid}}<div class="total-row" style="color:#065f46"><span>Amount Paid:</span><span>{{amountPaid}}</span></div>{{/if}}
    {{#if amountDue}}<div class="total-row" style="color:#dc2626; font-weight:bold"><span>Balance Due:</span><span>{{amountDue}}</span></div>{{/if}}
  </div>

  {{#if notes}}
  <div class="notes-section">
    <strong>Notes:</strong> {{notes}}
  </div>
  {{/if}}

  {{#if nrsApproved}}
  <div class="nrs-section">
    <div class="nrs-title">✓ NRS E-Invoice Verified</div>
    <div class="nrs-detail">Invoice Reference Number (IRN): <strong>{{nrsIRN}}</strong></div>
    <div class="nrs-detail">Cryptographic Stamp: {{nrsStamp}}</div>
    <div class="nrs-detail">Verified at: {{nrsAcknowledgedAt}}</div>
    <div class="nrs-detail" style="margin-top:8px; font-size:10px;">Scan the QR code or visit https://verify.nrs.gov.ng to verify this invoice.</div>
  </div>
  {{/if}}

  <div class="footer">
    <p>Generated by Cosmos ERP — Powered by Roland Consult | This is a computer-generated invoice.</p>
    {{#if terms}}<p style="margin-top:4px">Terms: {{terms}}</p>{{/if}}
  </div>
</body>
</html>`;
}

handlebars.registerHelper('inc', (val) => parseInt(val) + 1);
handlebars.registerHelper('formatAmount', (val) => {
  const num = parseFloat(val || 0);
  return num.toLocaleString('en-NG', { minimumFractionDigits: 2 });
});

function buildTemplateData(invoice, tenant) {
  const fmt = (v) => parseFloat(v || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });
  return {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: new Date(invoice.issueDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }),
    dueDate: new Date(invoice.dueDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }),
    tenantName: tenant?.businessName || invoice.tenant?.businessName || 'Your Business',
    tenantAddress: tenant?.address || invoice.tenant?.address || '',
    tenantTin: tenant?.tin || invoice.tenant?.tin || 'N/A',
    tenantEmail: tenant?.email || invoice.tenant?.email || '',
    tenantPhone: tenant?.phone || invoice.tenant?.phone || '',
    customerName: invoice.customer?.name,
    customerEmail: invoice.customer?.email || '',
    customerAddress: [invoice.customer?.address, invoice.customer?.city, invoice.customer?.state].filter(Boolean).join(', '),
    customerTin: invoice.customer?.tin,
    currency: invoice.currency,
    lines: invoice.lines,
    subtotal: fmt(invoice.subtotal),
    vatAmount: fmt(invoice.vatAmount),
    whtAmount: parseFloat(invoice.whtAmount || 0) > 0 ? fmt(invoice.whtAmount) : null,
    discountAmount: parseFloat(invoice.discountAmount || 0) > 0 ? fmt(invoice.discountAmount) : null,
    totalAmount: fmt(invoice.totalAmount),
    amountPaid: parseFloat(invoice.amountPaid || 0) > 0 ? fmt(invoice.amountPaid) : null,
    amountDue: parseFloat(invoice.amountDue || 0) > 0 ? fmt(invoice.amountDue) : null,
    notes: invoice.notes,
    terms: invoice.terms,
    nrsApproved: invoice.nrsStatus === 'APPROVED',
    nrsIRN: invoice.nrsIRN,
    nrsStamp: invoice.nrsStamp,
    nrsAcknowledgedAt: invoice.nrsAcknowledgedAt
      ? new Date(invoice.nrsAcknowledgedAt).toLocaleString('en-NG')
      : null,
  };
}

async function generateInvoicePDFBuffer(invoice, tenantId) {
  try {
    const prisma = require('../config/prisma');
    const tenant = invoice.tenant || await prisma.tenant.findUnique({ where: { id: tenantId } });
    const templateData = buildTemplateData(invoice, tenant);
    const template = handlebars.compile(getInvoiceTemplate());
    const html = template(templateData);

    // Try puppeteer for PDF generation
    try {
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'], headless: 'new' });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({ format: 'A4', margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }, printBackground: true });
      await browser.close();
      return pdfBuffer;
    } catch (puppeteerError) {
      logger.warn('Puppeteer unavailable, returning HTML as buffer');
      return Buffer.from(html, 'utf8');
    }
  } catch (error) {
    logger.error('PDF generation error:', error);
    throw error;
  }
}

async function generateInvoicePDF(invoice, tenantId) {
  const buffer = await generateInvoicePDFBuffer(invoice, tenantId);
  const dir = path.join(UPLOAD_PATH, 'invoices');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filename = `invoice-${invoice.invoiceNumber}-${Date.now()}.pdf`;
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, buffer);
  return `/uploads/invoices/${filename}`;
}

module.exports = { generateInvoicePDF, generateInvoicePDFBuffer };
