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

module.exports = {
  sendMail,
  sendReceipt,
  sendQuotation,
  sendInvoiceEmail,
  sendVerificationEmail,
  PLATFORM_EMAIL,
};
