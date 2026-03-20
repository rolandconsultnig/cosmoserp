const crypto = require('crypto');
const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');
const { finalizePaidMarketplaceOrder } = require('../services/marketplaceOrderPayment.service');

const SECRET = process.env.PAYSTACK_SECRET_KEY;

function verifySignature(rawBuffer, signatureHeader) {
  if (!SECRET || !signatureHeader || !rawBuffer?.length) return false;
  const hash = crypto.createHmac('sha512', SECRET).update(rawBuffer).digest('hex');
  const sig = String(signatureHeader).trim();
  if (hash.length !== sig.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'utf8'), Buffer.from(sig, 'utf8'));
  } catch {
    return false;
  }
}

/** Normalize Paystack transfer webhook `data` (field names vary slightly across API versions). */
function transferIdentifiers(data) {
  if (!data || typeof data !== 'object') return { ref: null, code: null };
  const ref = data.reference || data.transfer_ref || null;
  const code = data.transfer_code || null;
  return { ref: ref ? String(ref) : null, code: code ? String(code) : null };
}

async function processChargeSuccess(data) {
  const reference = data?.reference ? String(data.reference) : null;
  if (!reference) {
    logger.warn('Paystack charge.success: no reference');
    return;
  }
  const st = (data?.status || 'success').toString().toLowerCase();
  if (st !== 'success') return;

  const order = await prisma.marketplaceOrder.findFirst({
    where: { paystackRef: reference },
  });
  if (!order) {
    logger.debug('Paystack charge.success: no marketplace order for reference', { reference });
    return;
  }

  const cur = (data?.currency || 'NGN').toString().toUpperCase();
  if (data?.amount != null && cur === 'NGN') {
    const expectedKobo = Math.round(Number(order.totalAmount) * 100);
    const got = Number(data.amount);
    if (Number.isFinite(got) && got !== expectedKobo) {
      logger.warn('Paystack charge.success: amount mismatch, skipping finalize', {
        reference,
        orderId: order.id,
        expectedKobo,
        got,
      });
      return;
    }
  }

  try {
    await finalizePaidMarketplaceOrder(order.id);
  } catch (e) {
    logger.error('Paystack charge.success finalize:', e);
  }
}

async function updatePayoutFromTransfer(data, status, errorMessage) {
  const { ref, code } = transferIdentifiers(data);
  const or = [];
  if (ref) or.push({ paystackReference: ref });
  if (code) or.push({ paystackTransferCode: code });
  if (!or.length) {
    logger.warn('Paystack transfer webhook: no reference or transfer_code');
    return;
  }

  const payout = await prisma.marketplaceSellerPayout.findFirst({
    where: { OR: or },
  });
  if (!payout) {
    logger.debug('Paystack transfer webhook: no MarketplaceSellerPayout match', { ref, code });
    return;
  }

  await prisma.marketplaceSellerPayout.update({
    where: { id: payout.id },
    data: {
      status,
      errorMessage: errorMessage ? String(errorMessage).slice(0, 500) : null,
      ...(ref && !payout.paystackReference ? { paystackReference: ref } : {}),
      ...(code && !payout.paystackTransferCode ? { paystackTransferCode: code } : {}),
    },
  });
  logger.info(`MarketplaceSellerPayout ${payout.id} → ${status} (Paystack webhook)`);
}

async function processPayload(payload) {
  const event = payload?.event;
  const data = payload?.data;

  switch (event) {
    case 'charge.success':
      await processChargeSuccess(data);
      break;
    case 'transfer.success':
      await updatePayoutFromTransfer(data, 'SUCCESS', null);
      break;
    case 'transfer.failed': {
      const reason =
        data?.failures?.message ||
        data?.failures?.reason ||
        data?.reason ||
        data?.message ||
        'Transfer failed';
      await updatePayoutFromTransfer(data, 'FAILED', reason);
      break;
    }
    case 'transfer.reversed':
      await updatePayoutFromTransfer(data, 'REVERSED', data?.reason || 'Transfer reversed by Paystack');
      break;
    default:
      logger.debug(`Paystack webhook ignored: ${event}`);
  }
}

/**
 * Express: mount with express.raw({ type: 'application/json' }) so body is a Buffer.
 */
async function handleWebhook(req, res) {
  try {
    const raw = req.body;
    const signature = req.headers['x-paystack-signature'];

    if (!Buffer.isBuffer(raw)) {
      logger.warn('Paystack webhook: expected raw buffer body');
      return res.status(400).json({ error: 'Invalid body' });
    }

    if (!verifySignature(raw, signature)) {
      logger.warn('Paystack webhook: bad signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    let payload;
    try {
      payload = JSON.parse(raw.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    res.status(200).json({ received: true });

    setImmediate(() => {
      processPayload(payload).catch((err) => logger.error('Paystack webhook process:', err));
    });
  } catch (e) {
    logger.error('Paystack webhook:', e);
    res.status(500).json({ error: 'Webhook error' });
  }
}

module.exports = { handleWebhook, verifySignature, processPayload, processChargeSuccess, transferIdentifiers };
