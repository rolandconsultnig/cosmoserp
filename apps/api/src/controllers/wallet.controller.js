const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');

async function _getOrCreateWallet(tx, customerId) {
  let wallet = await tx.customerWallet.findUnique({
    where: { customerId },
    include: {
      transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  });
  if (!wallet) {
    wallet = await tx.customerWallet.create({
      data: {
        customerId,
        balance: 0,
        currency: 'NGN',
      },
      include: { transactions: true },
    });
  }
  return wallet;
}

function _serializeWallet(wallet) {
  return {
    id: wallet.id,
    balance: Number(wallet.balance),
    currency: wallet.currency,
    transactions: (wallet.transactions || []).map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      balanceAfter: t.balanceAfter != null ? Number(t.balanceAfter) : null,
      reference: t.reference,
      status: t.status,
      createdAt: t.createdAt,
    })),
  };
}

async function _applyTransaction(customerId, deltaAmount, type, reference) {
  const amt = Number(deltaAmount);
  if (!amt || !Number.isFinite(amt)) {
    throw Object.assign(new Error('Valid amount is required'), { status: 400 });
  }

  return prisma.$transaction(async (tx) => {
    let wallet = await _getOrCreateWallet(tx, customerId);

    const currentBalance = Number(wallet.balance);
    const nextBalance = currentBalance + amt;
    if (nextBalance < 0) {
      throw Object.assign(new Error('Insufficient wallet balance'), { status: 400 });
    }

    wallet = await tx.customerWallet.update({
      where: { id: wallet.id },
      data: { balance: nextBalance },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 50 } },
    });

    const txRecord = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type,
        amount: amt,
        balanceAfter: nextBalance,
        reference: reference || null,
        status: 'COMPLETED',
      },
    });

    wallet.transactions.unshift(txRecord);
    wallet.transactions = wallet.transactions.slice(0, 50);
    return wallet;
  });
}

async function _recordExternalPayment(customerId, amount, type, reference) {
  const amt = Number(amount);
  if (!amt || !Number.isFinite(amt)) {
    throw Object.assign(new Error('Valid amount is required'), { status: 400 });
  }
  return prisma.$transaction(async (tx) => {
    let wallet = await _getOrCreateWallet(tx, customerId);
    const currentBalance = Number(wallet.balance);
    const txRecord = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type,
        amount: amt,
        balanceAfter: currentBalance,
        reference: reference || null,
        status: 'COMPLETED',
      },
    });
    wallet.transactions.unshift(txRecord);
    wallet.transactions = wallet.transactions.slice(0, 50);
    return wallet;
  });
}

/** Get or create wallet for authenticated marketplace customer; return balance and recent transactions */
async function getMyWallet(req, res) {
  try {
    const customer = req.customer;
    const wallet = await _getOrCreateWallet(prisma, customer.id);
    res.json({ data: _serializeWallet(wallet) });
  } catch (error) {
    logger.error('Wallet getMyWallet error:', error);
    res.status(500).json({ error: 'Failed to load wallet' });
  }
}

/** Deposit (initiate Paystack) - stub: returns message that deposit is coming soon; actual Paystack flow can be added later */
async function initiateDeposit(req, res) {
  try {
    const { amount } = req.body || {};
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    res.status(501).json({
      error: 'Wallet deposit is not yet available. Use card at checkout.',
      comingSoon: true,
    });
  } catch (error) {
    logger.error('Wallet initiateDeposit error:', error);
    res.status(500).json({ error: 'Failed to initiate deposit' });
  }
}

async function requestLoan(req, res) {
  try {
    const customer = req.customer;
    const { amount } = req.body || {};
    const wallet = await _applyTransaction(customer.id, amount, 'LOAN_CREDIT', 'Loan credited to wallet');
    res.json({
      message: 'Loan request simulated and credited to wallet (demo).',
      data: _serializeWallet(wallet),
    });
  } catch (error) {
    logger.error('Wallet requestLoan error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Failed to request loan' });
  }
}

async function payElectricity(req, res) {
  try {
    const customer = req.customer;
    const { amount, meterNumber, disco, source } = req.body || {};
    const parts = [];
    if (disco) parts.push(disco);
    if (meterNumber) parts.push(`meter ${meterNumber}`);
    const ref = parts.length ? `Electricity ${parts.join(' ')}` : 'Electricity payment';
    const wallet = source === 'card'
      ? await _recordExternalPayment(customer.id, amount, 'ELECTRICITY_CARD', ref)
      : await _applyTransaction(customer.id, -Number(amount), 'ELECTRICITY', ref);
    res.json({
      message: 'Electricity payment recorded (demo).',
      data: _serializeWallet(wallet),
    });
  } catch (error) {
    logger.error('Wallet payElectricity error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Failed to pay electricity' });
  }
}

async function buyAirtime(req, res) {
  try {
    const customer = req.customer;
    const { amount, phone, network, source } = req.body || {};
    const parts = [];
    if (network) parts.push(network);
    if (phone) parts.push(`for ${phone}`);
    const ref = parts.length ? `Airtime ${parts.join(' ')}` : 'Airtime purchase';
    const wallet = source === 'card'
      ? await _recordExternalPayment(customer.id, amount, 'AIRTIME_CARD', ref)
      : await _applyTransaction(customer.id, -Number(amount), 'AIRTIME', ref);
    res.json({
      message: 'Airtime purchase recorded (demo).',
      data: _serializeWallet(wallet),
    });
  } catch (error) {
    logger.error('Wallet buyAirtime error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Failed to buy airtime' });
  }
}

async function buyData(req, res) {
  try {
    const customer = req.customer;
    const { amount, phone, network, source } = req.body || {};
    const parts = [];
    if (network) parts.push(network);
    if (phone) parts.push(`for ${phone}`);
    const ref = parts.length ? `Data bundle ${parts.join(' ')}` : 'Data purchase';
    const wallet = source === 'card'
      ? await _recordExternalPayment(customer.id, amount, 'DATA_CARD', ref)
      : await _applyTransaction(customer.id, -Number(amount), 'DATA', ref);
    res.json({
      message: 'Data purchase recorded (demo).',
      data: _serializeWallet(wallet),
    });
  } catch (error) {
    logger.error('Wallet buyData error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Failed to buy data' });
  }
}

async function transferToCosmos(req, res) {
  try {
    const customer = req.customer;
    const { amount, recipientEmail, source } = req.body || {};
    const ref = recipientEmail ? `Transfer to Mixtio: ${recipientEmail}` : 'Transfer to Mixtio account';
    const wallet = source === 'card'
      ? await _recordExternalPayment(customer.id, amount, 'TRANSFER_COSMOS_CARD', ref)
      : await _applyTransaction(customer.id, -Number(amount), 'TRANSFER_COSMOS', ref);
    res.json({
      message: 'Transfer to Mixtio account recorded (demo).',
      data: _serializeWallet(wallet),
    });
  } catch (error) {
    logger.error('Wallet transferToCosmos error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Failed to transfer to Mixtio account' });
  }
}

async function transferToBank(req, res) {
  try {
    const customer = req.customer;
    const { amount, accountNumber, bankName, source } = req.body || {};
    const refParts = [];
    if (accountNumber) refParts.push(`Acct: ${accountNumber}`);
    if (bankName) refParts.push(`Bank: ${bankName}`);
    const ref = `Bank transfer${refParts.length ? ' - ' + refParts.join(' ') : ''}`;
    const wallet = source === 'card'
      ? await _recordExternalPayment(customer.id, amount, 'TRANSFER_BANK_CARD', ref)
      : await _applyTransaction(customer.id, -Number(amount), 'TRANSFER_BANK', ref);
    res.json({
      message: 'Transfer to other bank recorded (demo).',
      data: _serializeWallet(wallet),
    });
  } catch (error) {
    logger.error('Wallet transferToBank error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Failed to transfer to other bank' });
  }
}

module.exports = {
  getMyWallet,
  initiateDeposit,
  requestLoan,
  payElectricity,
  buyAirtime,
  buyData,
  transferToCosmos,
  transferToBank,
};
