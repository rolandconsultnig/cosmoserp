require('dotenv').config();
const app = require('./app');
const { logger } = require('./utils/logger');
const { connectRedis } = require('./config/redis');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectRedis();

    const smsConfigured =
      process.env.TERMII_API_KEY ||
      (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
    if (!smsConfigured) {
      logger.warn(
        'SMS not configured — delivery notifications will be skipped. ' +
          'Set TERMII_API_KEY or TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER in .env',
      );
    }

    app.listen(PORT, () => {
      logger.info(`🚀 Cosmos ERP API running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
