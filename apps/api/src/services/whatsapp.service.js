const axios = require('axios');
const { logger } = require('../utils/logger');
const { formatCurrency } = require('../utils/helpers');

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

async function sendMessage(to, message) {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    logger.warn('WhatsApp not configured, skipping message');
    return { status: 'skipped', reason: 'not_configured' };
  }
  const phone = to.replace(/\D/g, '').replace(/^0/, '234');
  try {
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message },
      },
      { headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' } }
    );
    logger.info(`WhatsApp message sent to ${phone}`);
    return response.data;
  } catch (error) {
    logger.error('WhatsApp send error:', error.response?.data || error.message);
    throw new Error(`WhatsApp delivery failed: ${error.response?.data?.error?.message || error.message}`);
  }
}

async function sendInvoice(invoice) {
  const amount = formatCurrency(invoice.totalAmount, invoice.currency);
  const due = new Date(invoice.dueDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
  const message = [
    `*Invoice ${invoice.invoiceNumber}* from ${invoice.tenant?.businessName || 'Your Supplier'}`,
    '',
    `Amount Due: *${amount}*`,
    `Due Date: ${due}`,
    '',
    invoice.nrsIRN ? `NRS Reference: ${invoice.nrsIRN}` : '',
    invoice.pdfUrl ? `View/Download: ${process.env.API_URL}${invoice.pdfUrl}` : '',
    '',
    'Reply PAID if you have made payment. Thank you!',
  ].filter(Boolean).join('\n');

  return sendMessage(invoice.customer.whatsapp, message);
}

async function sendPaymentReminder(invoice) {
  const amount = formatCurrency(invoice.amountDue, invoice.currency);
  const daysOverdue = Math.floor((Date.now() - new Date(invoice.dueDate)) / 86400000);
  const message = [
    `*Payment Reminder* - Invoice ${invoice.invoiceNumber}`,
    '',
    `Outstanding Balance: *${amount}*`,
    daysOverdue > 0 ? `⚠️ This invoice is *${daysOverdue} day(s) overdue*.` : `Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-NG')}`,
    '',
    'Please make payment at your earliest convenience.',
    'Contact us if you have any questions.',
  ].join('\n');

  return sendMessage(invoice.customer.whatsapp, message);
}

async function sendLowStockAlert(product, warehouse, currentStock, tenantPhone) {
  const message = [
    `🚨 *Low Stock Alert*`,
    '',
    `Product: *${product.name}* (SKU: ${product.sku})`,
    `Warehouse: ${warehouse.name}`,
    `Current Stock: *${currentStock} units*`,
    `Reorder Point: ${product.reorderPoint} units`,
    '',
    'A draft purchase order has been created automatically.',
    'Please review and confirm in your Cosmos ERP dashboard.',
  ].join('\n');

  return sendMessage(tenantPhone, message);
}

/** POS receipt summary to customer WhatsApp */
async function sendReceipt(sale, tenantName, customerWhatsapp) {
  const total = formatCurrency(sale.total);
  const lines = (sale.items || sale.lines || [])
    .map((i) => `• ${i.productName || i.name} x${i.quantity || i.qty} = ${formatCurrency((i.unitPrice || 0) * (i.quantity || i.qty || 1))}`)
    .join('\n');
  const message = [
    `🧾 *Receipt* from ${tenantName}`,
    '',
    `Receipt #: *${sale.receiptNumber || sale.receiptNo}*`,
    '',
    lines,
    '',
    `*Total: ${total}*`,
    '',
    'Thank you for your patronage!',
  ].join('\n');

  return sendMessage(customerWhatsapp, message);
}

/** Quotation summary to customer WhatsApp */
async function sendQuotation(quote, tenantName, customerWhatsapp) {
  const total = formatCurrency(quote.totalAmount, quote.currency);
  const message = [
    `📋 *Quotation ${quote.quoteNumber}* from ${tenantName}`,
    '',
    `Total: *${total}*`,
    `Valid until: ${new Date(quote.expiryDate).toLocaleDateString('en-NG')}`,
    '',
    'Reply to confirm or contact us for any questions. Thank you!',
  ].join('\n');

  return sendMessage(customerWhatsapp, message);
}

module.exports = { sendMessage, sendInvoice, sendPaymentReminder, sendLowStockAlert, sendReceipt, sendQuotation };
