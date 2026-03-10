const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');

/** Get or create wallet for authenticated marketplace customer; return balance and recent transactions */
async function getMyWallet(req, res) {
  try {
    const customer = req.customer;
    let wallet = await prisma.customerWallet.findUnique({
      where: { customerId: customer.id },
      include: {
        transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!wallet) {
      wallet = await prisma.customerWallet.create({
        data: {
          customerId: customer.id,
          balance: 0,
          currency: 'NGN',
        },
        include: { transactions: true },
      });
    }
    res.json({
      data: {
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
      },
    });
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

module.exports = {
  getMyWallet,
  initiateDeposit,
};
