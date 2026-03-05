const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

function generateReference(prefix = 'REF') {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

function generateInvoiceNumber(prefix = 'INV', sequence) {
  const year = new Date().getFullYear();
  const padded = String(sequence).padStart(5, '0');
  return `${prefix}-${year}-${padded}`;
}

function generatePONumber(prefix = 'PO', sequence) {
  const year = new Date().getFullYear();
  const padded = String(sequence).padStart(5, '0');
  return `${prefix}-${year}-${padded}`;
}

function generateQuoteNumber(prefix = 'QT', sequence) {
  const year = new Date().getFullYear();
  const padded = String(sequence).padStart(5, '0');
  return `${prefix}-${year}-${padded}`;
}

function generateStaffId(prefix = 'EMP', sequence) {
  const padded = String(sequence).padStart(4, '0');
  return `${prefix}-${padded}`;
}

function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${timestamp}${random}`;
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function formatCurrency(amount, currency = 'NGN') {
  const formatter = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  });
  return formatter.format(amount);
}

function calculateVAT(amount, rate = 0.075) {
  return parseFloat((amount * rate).toFixed(2));
}

function calculateWHT(amount, rate = 0) {
  return parseFloat((amount * rate).toFixed(2));
}

function roundDecimal(value, places = 2) {
  return parseFloat(Number(value).toFixed(places));
}

function encrypt(text) {
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-32-char-key-for-dev-only!', 'utf8').slice(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(text) {
  const [ivHex, encryptedHex] = text.split(':');
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-32-char-key-for-dev-only!', 'utf8').slice(0, 32);
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

function paginate(page = 1, limit = 20) {
  const take = Math.min(parseInt(limit) || 20, 100);
  const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;
  return { take, skip };
}

function paginatedResponse(data, total, page, limit) {
  const currentPage = Math.max(parseInt(page) || 1, 1);
  const perPage = Math.min(parseInt(limit) || 20, 100);
  return {
    data,
    pagination: {
      total,
      page: currentPage,
      limit: perPage,
      totalPages: Math.ceil(total / perPage),
      hasMore: currentPage * perPage < total,
    },
  };
}

module.exports = {
  generateReference,
  generateInvoiceNumber,
  generatePONumber,
  generateQuoteNumber,
  generateStaffId,
  generateOrderNumber,
  slugify,
  formatCurrency,
  calculateVAT,
  calculateWHT,
  roundDecimal,
  encrypt,
  decrypt,
  paginate,
  paginatedResponse,
};
