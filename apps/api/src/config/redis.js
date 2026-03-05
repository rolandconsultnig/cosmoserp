const Redis = require('ioredis');
const { logger } = require('../utils/logger');

let redis;

async function connectRedis() {
  try {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryStrategy: (times) => {
        if (times > 3) {
          logger.warn('Redis unavailable — running without cache');
          return null; // stop retrying
        }
        return Math.min(times * 200, 1000);
      },
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    redis.on('connect', () => logger.info('Redis connected'));
    redis.on('error', () => {}); // silently handle — retryStrategy handles logging
    await redis.connect().catch(() => {
      logger.warn('Redis not available — running without cache');
      redis = null;
    });
  } catch (error) {
    logger.warn('Redis not available — running without cache');
    redis = null;
  }
}

function getRedis() {
  return redis;
}

async function setCache(key, value, ttlSeconds = 300) {
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (e) {
    logger.debug('Cache set error:', e.message);
  }
}

async function getCache(key) {
  if (!redis) return null;
  try {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  } catch (e) {
    return null;
  }
}

async function delCache(key) {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (e) {
    logger.debug('Cache del error:', e.message);
  }
}

async function delCachePattern(pattern) {
  if (!redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length) await redis.del(...keys);
  } catch (e) {
    logger.debug('Cache pattern del error:', e.message);
  }
}

module.exports = { connectRedis, getRedis, setCache, getCache, delCache, delCachePattern };
