const UAParser = require('ua-parser-js');

const BOT_RE = /bot|crawler|spider|prerender|headless|lighthouse|pingdom|uptime|monitoring|facebookexternalhit|slackbot|whatsapp/i;

/** ISO 3166-1 alpha-2 → common display name (subset; unknown codes stay null) */
const COUNTRY_NAMES = {
  NG: 'Nigeria', US: 'United States', GB: 'United Kingdom', DE: 'Germany', FR: 'France',
  IN: 'India', CN: 'China', BR: 'Brazil', ZA: 'South Africa', GH: 'Ghana', KE: 'Kenya',
  CA: 'Canada', AU: 'Australia', AE: 'United Arab Emirates', NL: 'Netherlands', IE: 'Ireland',
};

function getClientIp(req) {
  const cf = req.headers['cf-connecting-ip'];
  if (cf) return String(cf).trim().split(',')[0].trim();
  const trueClient = req.headers['true-client-ip'];
  if (trueClient) return String(trueClient).trim().split(',')[0].trim();
  const xf = req.headers['x-forwarded-for'];
  if (xf) return String(xf).split(',')[0].trim();
  const ip = req.socket?.remoteAddress || req.ip || '';
  return String(ip).replace(/^::ffff:/i, '').trim() || '0.0.0.0';
}

function isPrivateIp(ip) {
  if (!ip || ip === '0.0.0.0') return true;
  if (ip === '::1' || ip.startsWith('127.')) return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  const m = /^172\.(\d+)\./.exec(ip);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 16 && n <= 31) return true;
  }
  if (ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd')) return true;
  return false;
}

function cloudflareGeo(req) {
  const code = req.headers['cf-ipcountry'];
  if (!code || typeof code !== 'string') return {};
  const cc = code.trim().toUpperCase();
  if (cc.length !== 2 || cc === 'XX' || cc === 'T1') return {};
  return {
    countryCode: cc,
    countryName: COUNTRY_NAMES[cc] || null,
  };
}

/**
 * Optional server-side geo lookup (off by default). Set ENABLE_VISIT_GEO_LOOKUP=true
 * and respect provider terms / rate limits (not for high-volume without a paid GeoIP DB).
 */
async function optionalGeoLookup(ip) {
  if (process.env.ENABLE_VISIT_GEO_LOOKUP !== 'true') return {};
  if (isPrivateIp(ip)) return {};
  try {
    const axios = require('axios');
    const { data } = await axios.get(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      timeout: 2500,
      validateStatus: (s) => s === 200,
    });
    if (!data || data.success === false) return {};
    return {
      countryCode: data.country_code || null,
      countryName: data.country || null,
      region: data.region || null,
      city: data.city || null,
      latitude: typeof data.latitude === 'number' ? data.latitude : null,
      longitude: typeof data.longitude === 'number' ? data.longitude : null,
    };
  } catch {
    return {};
  }
}

function parseUserAgent(ua) {
  const raw = ua && String(ua).slice(0, 2000);
  if (!raw) {
    return {
      browserName: null,
      browserVersion: null,
      osName: null,
      osVersion: null,
      deviceType: 'unknown',
      deviceVendor: null,
      deviceModel: null,
    };
  }
  if (BOT_RE.test(raw)) {
    return {
      browserName: 'Bot',
      browserVersion: null,
      osName: null,
      osVersion: null,
      deviceType: 'bot',
      deviceVendor: null,
      deviceModel: null,
    };
  }
  const r = new UAParser(raw).getResult();
  let deviceType = r.device?.type || 'desktop';
  if (!r.device?.type && (r.os?.name || '').toLowerCase().includes('android')) {
    deviceType = 'mobile';
  }
  return {
    browserName: r.browser?.name || null,
    browserVersion: r.browser?.version?.split('.').slice(0, 3).join('.') || null,
    osName: r.os?.name || null,
    osVersion: r.os?.version?.split('.').slice(0, 3).join('.') || null,
    deviceType,
    deviceVendor: r.device?.vendor || null,
    deviceModel: r.device?.model || null,
  };
}

function sanitizePath(path) {
  if (path == null) return null;
  let s = String(path).replace(/\0/g, '').trim();
  if (!s.startsWith('/')) s = `/${s}`;
  if (s.length > 2048) s = s.slice(0, 2048);
  return s;
}

function sanitizeOptionalString(val, max) {
  if (val == null) return null;
  const s = String(val).replace(/\0/g, '').trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

module.exports = {
  COUNTRY_NAMES,
  getClientIp,
  cloudflareGeo,
  optionalGeoLookup,
  parseUserAgent,
  sanitizePath,
  sanitizeOptionalString,
  isPrivateIp,
};
