const prisma = require('../config/prisma');

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const MANAGE_ROLES = new Set(['OWNER', 'ADMIN', 'HR']);

function canManage(req) {
  return MANAGE_ROLES.has(req.user?.role);
}

async function listCategories(req, res) {
  try {
    const rows = await prisma.knowledgeCategory.findMany({
      where: { tenantId: req.tenantId, isActive: true },
      orderBy: { name: 'asc' },
      take: 200,
    });
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load categories' });
  }
}

async function createCategory(req, res) {
  try {
    if (!canManage(req)) return res.status(403).json({ error: 'Forbidden' });
    const name = String(req.body?.name || '').trim();
    const description = req.body?.description ? String(req.body.description).trim() : null;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const slug = slugify(req.body?.slug || name) || null;
    const row = await prisma.knowledgeCategory.create({
      data: { tenantId: req.tenantId, name, slug, description, isActive: true },
    });
    res.status(201).json({ data: row });
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Category name or slug already exists' });
    res.status(500).json({ error: 'Failed to create category' });
  }
}

async function listArticles(req, res) {
  try {
    const q = String(req.query?.q || '').trim();
    const categoryId = req.query?.categoryId ? String(req.query.categoryId) : null;
    const includeDraft = String(req.query?.includeDraft || '').toLowerCase() === 'true' && canManage(req);
    const where = { tenantId: req.tenantId };
    if (!includeDraft) where.status = 'PUBLISHED';
    if (categoryId) where.categoryId = categoryId;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { excerpt: { contains: q, mode: 'insensitive' } },
        { body: { contains: q, mode: 'insensitive' } },
      ];
    }
    const rows = await prisma.knowledgeArticle.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });
    const categories = await prisma.knowledgeCategory.findMany({
      where: { tenantId: req.tenantId },
      select: { id: true, name: true },
    });
    const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
    res.json({ data: rows.map((r) => ({ ...r, category: r.categoryId ? catById[r.categoryId] || null : null })) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load articles' });
  }
}

async function createArticle(req, res) {
  try {
    if (!canManage(req)) return res.status(403).json({ error: 'Forbidden' });
    const title = String(req.body?.title || '').trim();
    const body = String(req.body?.body || '').trim();
    if (!title || !body) return res.status(400).json({ error: 'title and body are required' });
    const slug = slugify(req.body?.slug || title);
    if (!slug) return res.status(400).json({ error: 'Could not generate slug' });
    const status = ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(String(req.body?.status || '').toUpperCase())
      ? String(req.body.status).toUpperCase()
      : 'DRAFT';
    const row = await prisma.knowledgeArticle.create({
      data: {
        tenantId: req.tenantId,
        categoryId: req.body?.categoryId ? String(req.body.categoryId) : null,
        title,
        slug,
        excerpt: req.body?.excerpt ? String(req.body.excerpt).trim() : null,
        body,
        status,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
        createdById: req.user.id,
      },
    });
    res.status(201).json({ data: row });
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Article slug already exists' });
    res.status(500).json({ error: 'Failed to create article' });
  }
}

async function updateArticle(req, res) {
  try {
    if (!canManage(req)) return res.status(403).json({ error: 'Forbidden' });
    const id = String(req.params.id);
    const existing = await prisma.knowledgeArticle.findFirst({
      where: { id, tenantId: req.tenantId },
    });
    if (!existing) return res.status(404).json({ error: 'Article not found' });

    const data = {};
    if (req.body?.title !== undefined) data.title = String(req.body.title || '').trim();
    if (req.body?.excerpt !== undefined) data.excerpt = req.body.excerpt ? String(req.body.excerpt).trim() : null;
    if (req.body?.body !== undefined) data.body = String(req.body.body || '').trim();
    if (req.body?.categoryId !== undefined) data.categoryId = req.body.categoryId ? String(req.body.categoryId) : null;
    if (req.body?.slug !== undefined || req.body?.title !== undefined) {
      data.slug = slugify(req.body?.slug || data.title || existing.title);
    }
    if (req.body?.status !== undefined) {
      const status = String(req.body.status).toUpperCase();
      if (!['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
      data.status = status;
      if (status === 'PUBLISHED' && !existing.publishedAt) data.publishedAt = new Date();
    }
    data.updatedById = req.user.id;

    const row = await prisma.knowledgeArticle.update({ where: { id: existing.id }, data });
    res.json({ data: row });
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Article slug already exists' });
    res.status(500).json({ error: 'Failed to update article' });
  }
}

module.exports = {
  listCategories,
  createCategory,
  listArticles,
  createArticle,
  updateArticle,
};
