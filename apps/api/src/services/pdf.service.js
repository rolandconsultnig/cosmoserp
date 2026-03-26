const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');
const { formatCurrency } = require('../utils/helpers');
const { logger } = require('../utils/logger');

const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';

function toPublicUrl(url) {
  if (!url) return null;
  const u = String(url);
  if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) return u;
  if (!u.startsWith('/')) return u;
  const base = process.env.PUBLIC_BASE_URL || process.env.APP_URL || process.env.BASE_URL;
  if (!base) return u;
  return `${String(base).replace(/\/$/, '')}${u}`;
}

function getInvoiceTemplateClassic() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #333; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
  .brand { display: flex; gap: 12px; align-items: flex-start; }
  .logo { width: 56px; height: 56px; object-fit: contain; }
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
    <div class="brand">
      {{#if tenantLogoUrl}}<img class="logo" src="{{tenantLogoUrl}}" alt="" />{{/if}}
      <div>
        <div class="company-name">{{tenantName}}</div>
        <div style="color: #6b7280; margin-top: 4px;">{{tenantAddress}}</div>
        <div style="color: #6b7280;">TIN: {{tenantTin}}</div>
      </div>
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

function getInvoiceTemplateModern() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Inter, Arial, sans-serif; font-size: 12px; color: #0f172a; padding: 36px; }
  .top { display:flex; justify-content: space-between; gap: 20px; align-items:flex-start; }
  .brand { display:flex; gap: 12px; align-items:flex-start; }
  .logo { width: 54px; height: 54px; object-fit: contain; }
  .name { font-size: 20px; font-weight: 800; letter-spacing: 0.2px; }
  .muted { color:#64748b; margin-top: 2px; }
  .title { font-size: 26px; font-weight: 900; text-align:right; }
  .meta { text-align:right; color:#64748b; margin-top: 4px; }
  .line { height: 2px; background: #0ea5e9; margin: 18px 0; }
  table { width:100%; border-collapse: collapse; margin-top: 14px; }
  thead th { text-align:left; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color:#334155; padding: 10px 8px; border-bottom: 1px solid #e2e8f0; }
  tbody td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; }
  .text-right { text-align:right; }
  .totals { margin-left:auto; width: 320px; margin-top: 14px; }
  .row { display:flex; justify-content: space-between; padding: 6px 0; }
  .final { font-weight: 900; border-top: 2px solid #0ea5e9; padding-top: 10px; margin-top: 6px; }
  .footer { margin-top: 22px; padding-top: 12px; border-top: 1px solid #e2e8f0; color:#64748b; font-size: 10px; text-align:center; }
</style>
</head>
<body>
  <div class="top">
    <div class="brand">
      {{#if tenantLogoUrl}}<img class="logo" src="{{tenantLogoUrl}}" alt="" />{{/if}}
      <div>
        <div class="name">{{tenantName}}</div>
        <div class="muted">{{tenantAddress}}</div>
        <div class="muted">TIN: {{tenantTin}}</div>
      </div>
    </div>
    <div>
      <div class="title">Invoice</div>
      <div class="meta"># {{invoiceNumber}}</div>
      <div class="meta">Issued: {{issueDate}}</div>
      <div class="meta">Due: {{dueDate}}</div>
    </div>
  </div>
  <div class="line"></div>
  <div style="display:flex; justify-content: space-between; gap: 24px;">
    <div style="width:48%;">
      <div style="font-size:10px; letter-spacing:0.08em; text-transform:uppercase; color:#64748b; font-weight:700;">Bill From</div>
      <div style="font-weight:800; margin-top:6px;">{{tenantName}}</div>
      <div class="muted">{{tenantEmail}}</div>
      <div class="muted">{{tenantPhone}}</div>
    </div>
    <div style="width:48%;">
      <div style="font-size:10px; letter-spacing:0.08em; text-transform:uppercase; color:#64748b; font-weight:700;">Bill To</div>
      <div style="font-weight:800; margin-top:6px;">{{customerName}}</div>
      <div class="muted">{{customerEmail}}</div>
      <div class="muted">{{customerAddress}}</div>
      {{#if customerTin}}<div class="muted">TIN: {{customerTin}}</div>{{/if}}
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:28px;">#</th>
        <th>Description</th>
        <th class="text-right" style="width:70px;">Qty</th>
        <th class="text-right" style="width:110px;">Unit</th>
        <th class="text-right" style="width:110px;">VAT</th>
        <th class="text-right" style="width:120px;">Total</th>
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
  <div class="totals">
    <div class="row"><span>Subtotal</span><span>{{subtotal}}</span></div>
    <div class="row"><span>VAT</span><span>{{vatAmount}}</span></div>
    {{#if whtAmount}}<div class="row"><span>WHT</span><span>-{{whtAmount}}</span></div>{{/if}}
    {{#if discountAmount}}<div class="row"><span>Discount</span><span>-{{discountAmount}}</span></div>{{/if}}
    <div class="row final"><span>Total ({{currency}})</span><span>{{totalAmount}}</span></div>
    {{#if amountPaid}}<div class="row" style="color:#065f46"><span>Amount Paid</span><span>{{amountPaid}}</span></div>{{/if}}
    {{#if amountDue}}<div class="row" style="color:#dc2626; font-weight:800"><span>Balance Due</span><span>{{amountDue}}</span></div>{{/if}}
  </div>
  {{#if notes}}<div style="margin-top:16px; padding: 10px; background:#f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;"><strong>Notes:</strong> {{notes}}</div>{{/if}}
  <div class="footer">
    <p>Generated by Cosmos ERP — Powered by Roland Consult | This is a computer-generated invoice.</p>
    {{#if terms}}<p style="margin-top:4px">Terms: {{terms}}</p>{{/if}}
  </div>
</body>
</html>`;
}

function getInvoiceTemplateCompact() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111827; padding: 26px; }
  .header { display:flex; justify-content: space-between; gap: 14px; align-items:flex-start; }
  .brand { display:flex; gap: 10px; align-items:flex-start; }
  .logo { width: 44px; height: 44px; object-fit: contain; }
  .company { font-weight: 900; font-size: 16px; }
  .muted { color:#6b7280; margin-top:2px; }
  table { width:100%; border-collapse: collapse; margin-top: 14px; }
  thead th { background:#111827; color:#fff; padding: 7px 8px; text-align:left; font-size: 10px; }
  tbody td { padding: 7px 8px; border-bottom: 1px solid #e5e7eb; }
  .text-right { text-align:right; }
  .totals { width: 260px; margin-left:auto; margin-top: 10px; }
  .row { display:flex; justify-content: space-between; padding: 3px 0; }
  .final { font-weight: 900; border-top: 2px solid #111827; padding-top: 6px; margin-top: 4px; }
  .footer { margin-top: 16px; padding-top: 10px; border-top: 1px solid #e5e7eb; color:#6b7280; font-size: 10px; text-align:center; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      {{#if tenantLogoUrl}}<img class="logo" src="{{tenantLogoUrl}}" alt="" />{{/if}}
      <div>
        <div class="company">{{tenantName}}</div>
        <div class="muted">{{tenantAddress}}</div>
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-weight:900; font-size:18px;">INVOICE</div>
      <div class="muted"># {{invoiceNumber}}</div>
      <div class="muted">Issued: {{issueDate}}</div>
      <div class="muted">Due: {{dueDate}}</div>
    </div>
  </div>
  <div style="margin-top:12px; display:flex; justify-content: space-between; gap: 14px;">
    <div style="width:48%;">
      <div style="font-size:10px; font-weight:800; color:#6b7280; text-transform:uppercase;">Bill From</div>
      <div style="font-weight:800; margin-top:4px;">{{tenantName}}</div>
      <div class="muted">{{tenantEmail}}</div>
      <div class="muted">{{tenantPhone}}</div>
    </div>
    <div style="width:48%;">
      <div style="font-size:10px; font-weight:800; color:#6b7280; text-transform:uppercase;">Bill To</div>
      <div style="font-weight:800; margin-top:4px;">{{customerName}}</div>
      <div class="muted">{{customerEmail}}</div>
      <div class="muted">{{customerAddress}}</div>
      {{#if customerTin}}<div class="muted">TIN: {{customerTin}}</div>{{/if}}
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:26px;">#</th>
        <th>Description</th>
        <th class="text-right" style="width:70px;">Qty</th>
        <th class="text-right" style="width:100px;">Unit</th>
        <th class="text-right" style="width:100px;">VAT</th>
        <th class="text-right" style="width:110px;">Total</th>
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
  <div class="totals">
    <div class="row"><span>Subtotal:</span><span>{{subtotal}}</span></div>
    <div class="row"><span>VAT:</span><span>{{vatAmount}}</span></div>
    {{#if whtAmount}}<div class="row"><span>WHT:</span><span>-{{whtAmount}}</span></div>{{/if}}
    {{#if discountAmount}}<div class="row"><span>Discount:</span><span>-{{discountAmount}}</span></div>{{/if}}
    <div class="row final"><span>TOTAL ({{currency}}):</span><span>{{totalAmount}}</span></div>
    {{#if amountPaid}}<div class="row" style="color:#065f46"><span>Paid:</span><span>{{amountPaid}}</span></div>{{/if}}
    {{#if amountDue}}<div class="row" style="color:#dc2626; font-weight:900"><span>Due:</span><span>{{amountDue}}</span></div>{{/if}}
  </div>
  <div class="footer">
    <p>Generated by Cosmos ERP — Powered by Roland Consult | This is a computer-generated invoice.</p>
  </div>
</body>
</html>`;
}

function getInvoiceTemplateBlue() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #0f172a; padding: 40px; }
  .banner { background: #1a56db; color: #fff; border-radius: 14px; padding: 18px 18px; display:flex; justify-content: space-between; gap: 18px; }
  .brand { display:flex; gap: 12px; align-items:flex-start; }
  .logo { width: 56px; height: 56px; object-fit: contain; background: rgba(255,255,255,0.12); border-radius: 12px; padding: 8px; }
  .name { font-size: 18px; font-weight: 900; }
  .muted { opacity: 0.9; margin-top: 3px; }
  .right { text-align:right; }
  .title { font-size: 22px; font-weight: 900; }
  .meta { opacity: 0.9; margin-top: 4px; }
  .content { margin-top: 18px; }
  table { width:100%; border-collapse: collapse; margin-top: 12px; }
  thead th { background:#eff6ff; color:#1e3a8a; padding: 8px 10px; text-align:left; font-size: 11px; border-bottom: 1px solid #bfdbfe; }
  tbody td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
  .text-right { text-align:right; }
  .totals { width: 300px; margin-left:auto; margin-top: 14px; }
  .row { display:flex; justify-content: space-between; padding: 4px 0; }
  .final { font-weight: 900; border-top: 2px solid #1a56db; padding-top: 8px; margin-top: 4px; }
  .footer { margin-top: 26px; padding-top: 14px; border-top: 1px solid #e5e7eb; color:#64748b; font-size: 10px; text-align:center; }
</style>
</head>
<body>
  <div class="banner">
    <div class="brand">
      {{#if tenantLogoUrl}}<img class="logo" src="{{tenantLogoUrl}}" alt="" />{{/if}}
      <div>
        <div class="name">{{tenantName}}</div>
        <div class="muted">{{tenantAddress}}</div>
        <div class="muted">TIN: {{tenantTin}}</div>
      </div>
    </div>
    <div class="right">
      <div class="title">INVOICE</div>
      <div class="meta"># {{invoiceNumber}}</div>
      <div class="meta">Issued: {{issueDate}}</div>
      <div class="meta">Due: {{dueDate}}</div>
    </div>
  </div>
  <div class="content">
    <div style="display:flex; justify-content: space-between; gap: 24px;">
      <div style="width:48%;">
        <div style="font-size:10px; font-weight:900; letter-spacing:0.06em; text-transform:uppercase; color:#64748b;">Bill From</div>
        <div style="font-weight:900; margin-top:6px;">{{tenantName}}</div>
        <div style="color:#64748b; margin-top:2px;">{{tenantEmail}}</div>
        <div style="color:#64748b;">{{tenantPhone}}</div>
      </div>
      <div style="width:48%;">
        <div style="font-size:10px; font-weight:900; letter-spacing:0.06em; text-transform:uppercase; color:#64748b;">Bill To</div>
        <div style="font-weight:900; margin-top:6px;">{{customerName}}</div>
        <div style="color:#64748b; margin-top:2px;">{{customerEmail}}</div>
        <div style="color:#64748b;">{{customerAddress}}</div>
        {{#if customerTin}}<div style="color:#64748b;">TIN: {{customerTin}}</div>{{/if}}
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
    <div class="totals">
      <div class="row"><span>Subtotal:</span><span>{{subtotal}}</span></div>
      <div class="row"><span>VAT (7.5%):</span><span>{{vatAmount}}</span></div>
      {{#if whtAmount}}<div class="row"><span>WHT:</span><span>-{{whtAmount}}</span></div>{{/if}}
      {{#if discountAmount}}<div class="row"><span>Discount:</span><span>-{{discountAmount}}</span></div>{{/if}}
      <div class="row final"><span>TOTAL ({{currency}}):</span><span>{{totalAmount}}</span></div>
      {{#if amountPaid}}<div class="row" style="color:#065f46"><span>Amount Paid:</span><span>{{amountPaid}}</span></div>{{/if}}
      {{#if amountDue}}<div class="row" style="color:#dc2626; font-weight:900"><span>Balance Due:</span><span>{{amountDue}}</span></div>{{/if}}
    </div>
  </div>
  <div class="footer">
    <p>Generated by Cosmos ERP — Powered by Roland Consult | This is a computer-generated invoice.</p>
    {{#if terms}}<p style="margin-top:4px">Terms: {{terms}}</p>{{/if}}
  </div>
</body>
</html>`;
}

function getInvoiceTemplateMinimal() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111827; padding: 44px; }
  .header { display:flex; justify-content: space-between; align-items:flex-start; gap: 18px; }
  .brand { display:flex; gap: 12px; align-items:flex-start; }
  .logo { width: 46px; height: 46px; object-fit: contain; }
  .name { font-size: 18px; font-weight: 900; }
  .meta { text-align:right; color:#6b7280; }
  .title { font-size: 18px; font-weight: 900; text-align:right; color:#111827; }
  .divider { border-top: 1px solid #e5e7eb; margin: 18px 0; }
  table { width:100%; border-collapse: collapse; margin-bottom: 12px; }
  thead th { padding: 8px 10px; text-align:left; font-size: 11px; border-bottom: 1px solid #e5e7eb; color:#374151; }
  tbody td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; }
  .text-right { text-align:right; }
  .totals { width: 320px; margin-left:auto; }
  .row { display:flex; justify-content: space-between; padding: 4px 0; }
  .final { font-weight: 900; border-top: 1px solid #111827; padding-top: 8px; margin-top: 4px; }
  .footer { margin-top: 22px; color:#6b7280; font-size: 10px; text-align:center; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      {{#if tenantLogoUrl}}<img class="logo" src="{{tenantLogoUrl}}" alt="" />{{/if}}
      <div>
        <div class="name">{{tenantName}}</div>
        <div style="color:#6b7280; margin-top:4px;">{{tenantAddress}}</div>
      </div>
    </div>
    <div>
      <div class="title">INVOICE</div>
      <div class="meta"># {{invoiceNumber}}</div>
      <div class="meta">Issued: {{issueDate}}</div>
      <div class="meta">Due: {{dueDate}}</div>
    </div>
  </div>
  <div class="divider"></div>
  <div style="display:flex; justify-content: space-between; gap: 24px;">
    <div style="width:48%;">
      <div style="font-size:10px; font-weight:900; color:#6b7280; text-transform:uppercase;">Bill From</div>
      <div style="font-weight:900; margin-top:6px;">{{tenantName}}</div>
      <div style="color:#6b7280; margin-top:2px;">{{tenantEmail}}</div>
      <div style="color:#6b7280;">{{tenantPhone}}</div>
    </div>
    <div style="width:48%;">
      <div style="font-size:10px; font-weight:900; color:#6b7280; text-transform:uppercase;">Bill To</div>
      <div style="font-weight:900; margin-top:6px;">{{customerName}}</div>
      <div style="color:#6b7280; margin-top:2px;">{{customerEmail}}</div>
      <div style="color:#6b7280;">{{customerAddress}}</div>
      {{#if customerTin}}<div style="color:#6b7280;">TIN: {{customerTin}}</div>{{/if}}
    </div>
  </div>
  <table style="margin-top:14px;">
    <thead>
      <tr>
        <th>#</th>
        <th>Description</th>
        <th class="text-right">Qty</th>
        <th class="text-right">Unit</th>
        <th class="text-right">VAT</th>
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
  <div class="totals">
    <div class="row"><span>Subtotal</span><span>{{subtotal}}</span></div>
    <div class="row"><span>VAT</span><span>{{vatAmount}}</span></div>
    {{#if whtAmount}}<div class="row"><span>WHT</span><span>-{{whtAmount}}</span></div>{{/if}}
    {{#if discountAmount}}<div class="row"><span>Discount</span><span>-{{discountAmount}}</span></div>{{/if}}
    <div class="row final"><span>Total ({{currency}})</span><span>{{totalAmount}}</span></div>
  </div>
  <div class="footer">
    <p>Generated by Cosmos ERP — Powered by Roland Consult</p>
  </div>
</body>
</html>`;
}

function getInvoiceTemplate(templateKey) {
  switch (String(templateKey || '').toUpperCase()) {
    case 'MODERN':
      return getInvoiceTemplateModern();
    case 'COMPACT':
      return getInvoiceTemplateCompact();
    case 'BLUE':
      return getInvoiceTemplateBlue();
    case 'MINIMAL':
      return getInvoiceTemplateMinimal();
    case 'CLASSIC':
    default:
      return getInvoiceTemplateClassic();
  }
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
    tenantLogoUrl: toPublicUrl(tenant?.logoUrl || invoice.tenant?.logoUrl || null),
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
    const template = handlebars.compile(getInvoiceTemplate(tenant?.invoiceTemplate));
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
