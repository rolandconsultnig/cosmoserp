const axios = require('axios');
const { logger } = require('../utils/logger');

/**
 * Best-effort SMS for logistics / alerts. Configure one provider.
 * TERMII: TERMII_API_KEY, TERMII_SENDER_ID (optional), TERMII_BASE_URL (default api.ng.termii.com)
 * Twilio: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 */
async function sendSms(toPhone, message) {
  const phone = String(toPhone || '').replace(/\s/g, '');
  if (!phone) {
    logger.warn('SMS skipped: no phone');
    return { status: 'skipped', reason: 'no_phone' };
  }
  const text = String(message || '').slice(0, 480);

  if (process.env.TERMII_API_KEY) {
    try {
      const base = process.env.TERMII_BASE_URL || 'https://api.ng.termii.com/api';
      const payload = {
        api_key: process.env.TERMII_API_KEY,
        to: phone.startsWith('+') ? phone : `234${phone.replace(/^0/, '')}`,
        from: process.env.TERMII_SENDER_ID || 'CosmosERP',
        sms: text,
        type: 'plain',
        channel: 'generic',
      };
      const res = await axios.post(`${base}/sms/send`, payload, { timeout: 15000 });
      logger.info(`Termii SMS queued to ${phone}`);
      return { status: 'sent', provider: 'termii', data: res.data };
    } catch (e) {
      logger.error('Termii SMS error:', e.response?.data || e.message);
      return { status: 'failed', provider: 'termii', error: e.message };
    }
  }

  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const auth = Buffer.from(
        `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`,
      ).toString('base64');
      const from = process.env.TWILIO_FROM_NUMBER;
      if (!from) throw new Error('TWILIO_FROM_NUMBER missing');
      const res = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        new URLSearchParams({ To: phone.startsWith('+') ? phone : `+234${phone.replace(/^0/, '')}`, From: from, Body: text }),
        {
          headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 15000,
        },
      );
      logger.info(`Twilio SMS sent to ${phone}`);
      return { status: 'sent', provider: 'twilio', data: res.data?.sid };
    } catch (e) {
      logger.error('Twilio SMS error:', e.response?.data || e.message);
      return { status: 'failed', provider: 'twilio', error: e.message };
    }
  }

  logger.debug('SMS not configured (set TERMII_* or TWILIO_*)');
  return { status: 'skipped', reason: 'no_provider' };
}

module.exports = { sendSms };
