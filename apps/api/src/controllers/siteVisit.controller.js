const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');
const { paginate, paginatedResponse } = require('../utils/helpers');
const {
  COUNTRY_NAMES,
  getClientIp,
  cloudflareGeo,
  optionalGeoLookup,
  parseUserAgent,
  sanitizePath,
  sanitizeOptionalString,
} = require('../services/siteVisit.service');

async function collectVisit(req, res) {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const path = sanitizePath(body.path);
    if (!path) {
      return res.status(400).json({ error: 'path is required and must start with /' });
    }

    const ip = getClientIp(req);
    const uaHeader = req.headers['user-agent'];
    const uaParsed = parseUserAgent(uaHeader);

    let geo = cloudflareGeo(req);
    if (!geo.countryCode && process.env.ENABLE_VISIT_GEO_LOOKUP === 'true') {
      const extra = await optionalGeoLookup(ip);
      geo = { ...geo, ...extra };
    }

    const row = await prisma.siteVisit.create({
      data: {
        path,
        referrer: sanitizeOptionalString(body.referrer, 2048),
        pageTitle: sanitizeOptionalString(body.title || body.pageTitle, 500),
        sessionId: sanitizeOptionalString(body.sessionId, 64),
        ip: ip.slice(0, 45),
        userAgent: uaHeader ? String(uaHeader).slice(0, 4000) : null,
        browserName: uaParsed.browserName,
        browserVersion: uaParsed.browserVersion,
        osName: uaParsed.osName,
        osVersion: uaParsed.osVersion,
        deviceType: uaParsed.deviceType,
        deviceVendor: uaParsed.deviceVendor,
        deviceModel: uaParsed.deviceModel,
        countryCode: geo.countryCode || null,
        countryName: geo.countryName || null,
        region: geo.region || null,
        city: geo.city || null,
        latitude: geo.latitude ?? null,
        longitude: geo.longitude ?? null,
      },
    });

    return res.status(201).json({ ok: true, id: row.id });
  } catch (e) {
    logger.error('collectVisit error:', e);
    return res.status(500).json({ error: 'Failed to record visit' });
  }
}

function periodToFrom(period) {
  const days = period === '7d' ? 7 : period === '90d' ? 90 : period === '1y' ? 365 : 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function getSiteVisitStats(req, res) {
  try {
    const { period = '30d' } = req.query;
    const from = periodToFrom(String(period));

    const [
      totalVisits,
      uniqueSessionsRow,
      byDay,
      byBrowser,
      byOs,
      byDevice,
      byCountry,
      topPaths,
    ] = await Promise.all([
      prisma.siteVisit.count({ where: { createdAt: { gte: from } } }),
      prisma.$queryRaw`
        SELECT COUNT(DISTINCT "sessionId")::int AS c
        FROM "SiteVisit"
        WHERE "createdAt" >= ${from} AND "sessionId" IS NOT NULL AND "sessionId" != ''
      `,
      prisma.$queryRaw`
        SELECT DATE("createdAt") AS date, COUNT(*)::int AS visits
        FROM "SiteVisit"
        WHERE "createdAt" >= ${from}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      prisma.siteVisit.groupBy({
        by: ['browserName'],
        where: { createdAt: { gte: from } },
        _count: true,
        orderBy: { _count: { browserName: 'desc' } },
        take: 12,
      }),
      prisma.siteVisit.groupBy({
        by: ['osName'],
        where: { createdAt: { gte: from } },
        _count: true,
        orderBy: { _count: { osName: 'desc' } },
        take: 12,
      }),
      prisma.siteVisit.groupBy({
        by: ['deviceType'],
        where: { createdAt: { gte: from } },
        _count: true,
        orderBy: { _count: { deviceType: 'desc' } },
        take: 10,
      }),
      prisma.siteVisit.groupBy({
        by: ['countryCode'],
        where: { createdAt: { gte: from } },
        _count: true,
        orderBy: { _count: { countryCode: 'desc' } },
        take: 15,
      }),
      prisma.siteVisit.groupBy({
        by: ['path'],
        where: { createdAt: { gte: from } },
        _count: true,
        orderBy: { _count: { path: 'desc' } },
        take: 20,
      }),
    ]);

    const uniqueSessions = Number(uniqueSessionsRow?.[0]?.c ?? 0);

    const mapDay = (r) => ({
      date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10),
      visits: Number(r.visits),
    });

    const label = (v) => v || 'Unknown';

    res.json({
      data: {
        period,
        from: from.toISOString(),
        totalVisits,
        uniqueSessions,
        visitsByDay: (byDay || []).map(mapDay),
        byBrowser: (byBrowser || []).map((b) => ({
          name: label(b.browserName),
          count: b._count,
        })),
        byOs: (byOs || []).map((b) => ({
          name: label(b.osName),
          count: b._count,
        })),
        byDevice: (byDevice || []).map((b) => ({
          name: label(b.deviceType),
          count: b._count,
        })),
        byCountry: (byCountry || []).map((b) => {
          const code = b.countryCode;
          return {
            code: code || '—',
            name: (code && COUNTRY_NAMES[code]) || code || 'Unknown',
            count: b._count,
          };
        }),
        topPaths: (topPaths || []).map((p) => ({
          path: p.path,
          count: p._count,
        })),
      },
    });
  } catch (e) {
    logger.error('getSiteVisitStats error:', e);
    res.status(500).json({ error: 'Failed to load visit stats' });
  }
}

async function listSiteVisits(req, res) {
  try {
    const {
      page, limit, from, to, path: pathQ, countryCode, deviceType, browserName, search,
    } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = {};

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    if (pathQ) where.path = { contains: String(pathQ), mode: 'insensitive' };
    if (countryCode) where.countryCode = String(countryCode).toUpperCase().slice(0, 2);
    if (deviceType) where.deviceType = String(deviceType);
    if (browserName) where.browserName = { contains: String(browserName), mode: 'insensitive' };
    if (search) {
      const s = String(search).trim();
      where.OR = [
        { path: { contains: s, mode: 'insensitive' } },
        { ip: { contains: s } },
        { city: { contains: s, mode: 'insensitive' } },
        { region: { contains: s, mode: 'insensitive' } },
        { userAgent: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.siteVisit.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          path: true,
          referrer: true,
          pageTitle: true,
          sessionId: true,
          ip: true,
          browserName: true,
          browserVersion: true,
          osName: true,
          osVersion: true,
          deviceType: true,
          deviceVendor: true,
          deviceModel: true,
          countryCode: true,
          countryName: true,
          region: true,
          city: true,
          latitude: true,
          longitude: true,
        },
      }),
      prisma.siteVisit.count({ where }),
    ]);

    res.json(paginatedResponse(data, total, page, limit));
  } catch (e) {
    logger.error('listSiteVisits error:', e);
    res.status(500).json({ error: 'Failed to list visits' });
  }
}

module.exports = {
  collectVisit,
  getSiteVisitStats,
  listSiteVisits,
};
