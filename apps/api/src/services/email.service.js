const nodemailer = require('nodemailer');
const { logger } = require('../utils/logger');
const { formatCurrency } = require('../utils/helpers');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

const PLATFORM_EMAIL = process.env.PLATFORM_EMAIL || 'hello@cosmoserp.afrinict.com';
const FROM = process.env.MAIL_FROM || process.env.SMTP_USER || PLATFORM_EMAIL;

async function sendMail({ to, subject, text, html }) {
  if (!to) {
    logger.warn('Email send skipped: no recipient');
    return { status: 'skipped', reason: 'no_recipient' };
  }
  try {
    const info = await transporter.sendMail({
      from: FROM,
      to,
      subject,
      text: text || (html ? html.replace(/<[^>]+>/g, '') : ''),
      html: html || undefined,
    });
    logger.info(`Email sent to ${to}: ${subject}`);
    return { status: 'sent', messageId: info.messageId };
  } catch (err) {
    logger.error('Email send error:', err.message);
    throw new Error(`Email delivery failed: ${err.message}`);
  }
}

function receiptHtml(sale, tenantName) {
  const items = (sale.items || [])
    .map(
      (i) =>
        `<tr><td>${i.name}</td><td>${i.qty}</td><td>${formatCurrency(i.unitPrice)}</td><td>${formatCurrency((i.unitPrice || 0) * (i.qty || 1))}</td></tr>`
    )
    .join('');
  return `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;font-size:14px;color:#333;">
  <h2>Receipt from ${tenantName}</h2>
  <p><strong>Receipt #:</strong> ${sale.receiptNo || sale.receiptNumber}</p>
  <p><strong>Date:</strong> ${new Date().toLocaleString('en-NG')}</p>
  ${sale.customerName ? `<p><strong>Customer:</strong> ${sale.customerName}</p>` : ''}
  <table style="width:100%;border-collapse:collapse;margin:15px 0;">
    <thead><tr style="background:#f1f5f9;"><th style="text-align:left;padding:8px;">Item</th><th>Qty</th><th>Price</th><th style="text-align:right;">Total</th></tr></thead>
    <tbody>${items}</tbody>
  </table>
  <p><strong>Total:</strong> ${formatCurrency(sale.total)}</p>
  <p style="margin-top:20px;color:#64748b;">Thank you for your patronage. Powered by Cosmos ERP.</p>
</body></html>`;
}

function quotationHtml(quote, tenantName) {
  const lines = (quote.lines || [])
    .map(
      (l) =>
        `<tr><td>${l.description || 'Item'}</td><td>${l.quantity}</td><td>${formatCurrency(l.unitPrice)}</td><td>${formatCurrency(Number(l.lineTotal) || 0)}</td></tr>`
    )
    .join('');
  return `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;font-size:14px;color:#333;">
  <h2>Quotation from ${tenantName}</h2>
  <p><strong>Quote #:</strong> ${quote.quoteNumber}</p>
  <p><strong>Date:</strong> ${new Date(quote.issueDate).toLocaleString('en-NG')}</p>
  <p><strong>Customer:</strong> ${quote.customer?.name || 'Customer'}</p>
  <table style="width:100%;border-collapse:collapse;margin:15px 0;">
    <thead><tr style="background:#f1f5f9;"><th style="text-align:left;padding:8px;">Description</th><th>Qty</th><th>Price</th><th style="text-align:right;">Total</th></tr></thead>
    <tbody>${lines}</tbody>
  </table>
  <p><strong>Total:</strong> ${formatCurrency(quote.totalAmount)}</p>
  <p style="margin-top:20px;color:#64748b;">Valid until ${new Date(quote.expiryDate).toLocaleDateString('en-NG')}. Powered by Cosmos ERP.</p>
</body></html>`;
}

async function sendReceipt(sale, toEmail, tenantName) {
  const subject = `Receipt ${sale.receiptNo || sale.receiptNumber} – ${tenantName}`;
  const html = receiptHtml(sale, tenantName);
  const text = `Receipt ${sale.receiptNo || sale.receiptNumber}\n${tenantName}\nTotal: ${formatCurrency(sale.total)}\nThank you.`;
  return sendMail({ to: toEmail, subject, text, html });
}

async function sendQuotation(quote, toEmail, tenantName) {
  const subject = `Quotation ${quote.quoteNumber} – ${tenantName}`;
  const html = quotationHtml(quote, tenantName);
  const text = `Quotation ${quote.quoteNumber}\n${tenantName}\nTotal: ${formatCurrency(quote.totalAmount)}\nThank you.`;
  return sendMail({ to: toEmail, subject, text, html });
}

async function sendInvoiceEmail(invoice, toEmail, tenantName, pdfUrl) {
  const subject = `Invoice ${invoice.invoiceNumber} – ${tenantName}`;
  const body = `Invoice ${invoice.invoiceNumber}\nAmount: ${formatCurrency(invoice.totalAmount)}\nDue: ${new Date(invoice.dueDate).toLocaleDateString('en-NG')}${pdfUrl ? `\nDownload: ${process.env.API_URL || ''}${pdfUrl}` : ''}`;
  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;"><h2>Invoice ${invoice.invoiceNumber}</h2><p>${tenantName}</p><p>Amount: <strong>${formatCurrency(invoice.totalAmount)}</strong></p><p>Due: ${new Date(invoice.dueDate).toLocaleDateString('en-NG')}</p>${pdfUrl ? `<p><a href="${process.env.API_URL || ''}${pdfUrl}">Download PDF</a></p>` : ''}<p>Thank you.</p></body></html>`;
  return sendMail({ to: toEmail, subject, text: body, html });
}

/** Verification link base URL (e.g. https://yourdomain.com or http://localhost:5174 for marketplace) */
function getVerificationBaseUrl() {
  return process.env.MARKETPLACE_URL || process.env.API_PUBLIC_URL || process.env.API_URL || 'http://localhost:5174';
}

async function sendVerificationEmail(toEmail, fullName, token) {
  const baseUrl = getVerificationBaseUrl();
  const verifyUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const subject = 'Confirm your email – Cosmos ERP';
  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;font-size:14px;color:#333;">
  <h2>Confirm your email</h2>
  <p>Hi ${fullName || 'there'},</p>
  <p>Thanks for signing up. Please confirm your email by clicking the link below:</p>
  <p><a href="${verifyUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;">Verify email</a></p>
  <p>Or copy this link: ${verifyUrl}</p>
  <p>This link expires in 24 hours.</p>
  <p>If you didn't create an account, you can ignore this email.</p>
  <p style="margin-top:24px;color:#64748b;">— Cosmos ERP (${PLATFORM_EMAIL})</p>
  </body></html>`;
  const text = `Confirm your email: ${verifyUrl}\n\nIf you didn't create an account, ignore this email.`;
  return sendMail({ to: toEmail, subject, text, html });
}

/** Password reset email. resetLink should be the full URL to the portal's reset-password page with ?token=... */
function getMarketplacePublicUrl() {
  return (process.env.MARKETPLACE_URL || process.env.MARKET_URL || '').replace(/\/$/, '');
}

function getPublicApiBaseUrl() {
  return (process.env.API_PUBLIC_URL || process.env.API_URL || '').replace(/\/$/, '');
}

/**
 * Email buyer when a logistics delivery reaches a milestone (non-blocking from API).
 * Set LOGISTICS_CUSTOMER_EMAIL_NOTIFICATIONS=false to disable.
 */
async function sendDeliveryStatusUpdateEmail(delivery) {
  if (process.env.LOGISTICS_CUSTOMER_EMAIL_NOTIFICATIONS === 'false') {
    return { status: 'skipped', reason: 'disabled' };
  }
  const to = (delivery.customerEmail || '').trim();
  if (!to) return { status: 'skipped', reason: 'no_email' };

  const milestones = ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'];
  if (!milestones.includes(delivery.status)) {
    return { status: 'skipped', reason: 'not_milestone' };
  }

  const copy = {
    IN_TRANSIT: {
      subject: 'Your shipment is on the way',
      headline: 'In transit',
      body: 'Your package has been picked up and is on the way to the delivery address.',
    },
    OUT_FOR_DELIVERY: {
      subject: 'Out for delivery today',
      headline: 'Almost there',
      body: 'Your package is out for delivery. Please keep your phone available for the courier.',
    },
    DELIVERED: {
      subject: 'Delivered — thank you',
      headline: 'Delivered',
      body: 'Your package has been marked as delivered. If something is wrong, contact the seller or support.',
    },
    FAILED: {
      subject: 'Delivery update — action may be needed',
      headline: 'Delivery issue',
      body: delivery.failureReason
        ? `We could not complete delivery: ${delivery.failureReason}`
        : 'We could not complete this delivery. The sender or support may contact you with next steps.',
    },
  }[delivery.status];

  const mkt = getMarketplacePublicUrl();
  const apiBase = getPublicApiBaseUrl();
  const trackUrl = mkt
    ? `${mkt}/track/${encodeURIComponent(delivery.trackingNumber)}`
    : (apiBase
      ? `${apiBase}/api/logistics/track/${encodeURIComponent(delivery.trackingNumber)}`
      : null);

  const linkBlock = trackUrl
    ? `<p><a href="${trackUrl}" style="color:#2563eb;font-weight:bold;">Track your shipment</a></p>`
    : '';

  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;font-size:14px;color:#333;">
  <h2>${copy.headline}</h2>
  <p>Hi ${delivery.customerName || 'there'},</p>
  <p>${copy.body}</p>
  <p><strong>Tracking:</strong> ${delivery.trackingNumber}</p>
  ${linkBlock}
  <p style="margin-top:24px;color:#64748b;">— Cosmos Logistics (${PLATFORM_EMAIL})</p>
  </body></html>`;

  const text = `${copy.headline}\n\n${copy.body}\n\nTracking: ${delivery.trackingNumber}${trackUrl ? `\n\nTrack: ${trackUrl}` : ''}\n\n— Cosmos Logistics`;

  return sendMail({ to, subject: copy.subject, text, html });
}

function escapeHtmlLite(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Notify tenant email when a payroll run is approved (opt-out: PAYROLL_APPROVAL_EMAIL_NOTIFICATIONS=false). */
async function sendPayrollApprovalNotificationEmail(toEmail, tenantName, run, approvalNote) {
  if (process.env.PAYROLL_APPROVAL_EMAIL_NOTIFICATIONS === 'false') {
    return { status: 'skipped', reason: 'disabled' };
  }
  if (!toEmail?.trim()) return { status: 'skipped', reason: 'no_recipient' };

  const period = run.period || `${run.month}/${run.year}`;
  const net = formatCurrency(run.totalNet);
  const noteBlock = approvalNote
    ? `<p><strong>Approval note:</strong> ${escapeHtmlLite(approvalNote)}</p>`
    : '';

  const subject = `Payroll approved — ${period} (${tenantName || 'Cosmos ERP'})`;
  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;font-size:14px;color:#333;">
  <h2>Payroll run approved</h2>
  <p>A payroll run for <strong>${period}</strong> has been approved in Cosmos ERP.</p>
  <p><strong>Total net pay:</strong> ${net}</p>
  ${noteBlock}
  <p style="margin-top:20px;color:#64748b;">You can download NIBSS / payslips from the Payroll screen. — ${PLATFORM_EMAIL}</p>
  </body></html>`;
  const text = `Payroll approved for ${period}. Total net: ${run.totalNet}.${approvalNote ? `\nNote: ${approvalNote}` : ''}`;
  return sendMail({ to: toEmail.trim(), subject, text, html });
}

async function sendPasswordResetEmail(toEmail, name, resetLink, portalLabel) {
  const subject = `Reset your password – Cosmos ERP${portalLabel ? ` (${portalLabel})` : ''}`;
  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;font-size:14px;color:#333;">
  <h2>Reset your password</h2>
  <p>Hi ${name || 'there'},</p>
  <p>We received a request to reset your password. Click the link below to set a new password:</p>
  <p><a href="${resetLink}" style="background:#2563eb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;">Reset password</a></p>
  <p>Or copy this link: ${resetLink}</p>
  <p>This link expires in 1 hour. If you didn't request a reset, you can ignore this email.</p>
  <p style="margin-top:24px;color:#64748b;">— Cosmos ERP (${PLATFORM_EMAIL})</p>
  </body></html>`;
  const text = `Reset your password: ${resetLink}\n\nThis link expires in 1 hour. If you didn't request a reset, ignore this email.`;
  return sendMail({ to: toEmail, subject, text, html });
}

module.exports = {
  sendMail,
  sendReceipt,
  sendQuotation,
  sendInvoiceEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendDeliveryStatusUpdateEmail,
  sendPayrollApprovalNotificationEmail,
  PLATFORM_EMAIL,
};
