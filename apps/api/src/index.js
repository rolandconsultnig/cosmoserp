require('dotenv').config();
const app = require('./app');
const { logger } = require('./utils/logger');
const { connectRedis } = require('./config/redis');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectRedis();
    app.listen(PORT, () => {
      logger.info(`🚀 Cosmos ERP API running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
