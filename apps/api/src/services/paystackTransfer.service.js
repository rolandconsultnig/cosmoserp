const axios = require('axios');
const { logger } = require('../utils/logger');

const SECRET = process.env.PAYSTACK_SECRET_KEY;
const BASE = 'https://api.paystack.co';

function headers() {
  return {
    Authorization: `Bearer ${SECRET}`,
    'Content-Type': 'application/json',
  };
}

/** Resolve or create Paystack transfer recipient for tenant NGN bank account. */
async function ensureRecipientForTenant(tenant) {
  if (!SECRET) throw new Error('PAYSTACK_SECRET_KEY is not configured');
  if (tenant.paystackRecipientCode) return tenant.paystackRecipientCode;
  const acct = (tenant.bankAccountNumber || '').replace(/\s/g, '');
  const bank = (tenant.bankSortCode || '').replace(/\s/g, '');
  const name = (tenant.bankAccountName || tenant.tradingName || tenant.businessName || 'Seller').slice(0, 100);
  if (!acct || !bank) {
    throw new Error('Tenant missing bank account number or bank sort code (Paystack bank code)');
  }

  const res = await axios.post(
    `${BASE}/transferrecipient`,
    {
      type: 'nuban',
      name,
      account_number: acct,
      bank_code: bank,
      currency: 'NGN',
    },
    { headers: headers() },
  );
  const code = res.data?.data?.recipient_code;
  if (!code) throw new Error(res.data?.message || 'Paystack did not return recipient_code');
  return code;
}

/**
 * Initiate transfer in NGN (amount in major units e.g. naira).
 * Returns { reference, transfer_code, status, raw }.
 */
async function initiateTransfer({ amount, recipientCode, reason, metadata }) {
  if (!SECRET) throw new Error('PAYSTACK_SECRET_KEY is not configured');
  const amountKobo = Math.round(Number(amount) * 100);
  if (!Number.isFinite(amountKobo) || amountKobo < 100) {
    throw new Error('Transfer amount must be at least ₦1');
  }

  const res = await axios.post(
    `${BASE}/transfer`,
    {
      source: 'balance',
      amount: amountKobo,
      recipient: recipientCode,
      reason: (reason || 'Marketplace payout').slice(0, 200),
      currency: 'NGN',
      metadata: metadata || {},
    },
    { headers: headers() },
  );
  const d = res.data?.data;
  return {
    reference: d?.reference,
    transfer_code: d?.transfer_code,
    status: d?.status,
    raw: d,
  };
}

async function transferToTenant(tenant, amount, meta) {
  const prisma = require('../config/prisma');
  let recipient = tenant.paystackRecipientCode;
  if (!recipient) {
    recipient = await ensureRecipientForTenant(tenant);
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { paystackRecipientCode: recipient },
    });
  }
  return initiateTransfer({
    amount,
    recipientCode: recipient,
    reason: `Payout ${meta?.orderNumber || ''}`.trim(),
    metadata: meta || {},
  });
}

module.exports = {
  ensureRecipientForTenant,
  initiateTransfer,
  transferToTenant,
  isConfigured: () => Boolean(SECRET),
};
