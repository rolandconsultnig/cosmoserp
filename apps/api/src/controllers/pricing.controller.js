const prisma = require('../config/prisma');

function now() {
  return new Date();
}

function inWindow(startAt, endAt) {
  const n = now();
  if (startAt && new Date(startAt) > n) return false;
  if (endAt && new Date(endAt) < n) return false;
  return true;
}

function calcRuleDiscount({ ruleType, value, subtotal, maxDiscount }) {
  const v = parseFloat(value || 0);
  const sub = parseFloat(subtotal || 0);
  let discount = 0;
  if (ruleType === 'PERCENT') discount = (sub * v) / 100;
  if (ruleType === 'FIXED') discount = v;
  if (maxDiscount !== null && maxDiscount !== undefined) {
    discount = Math.min(discount, parseFloat(maxDiscount || 0));
  }
  return Math.max(0, Math.min(discount, sub));
}

async function list(req, res) {
  try {
    const [rules, codes] = await Promise.all([
      prisma.pricingRule.findMany({
        where: { tenantId: req.tenantId },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      prisma.promotionCode.findMany({
        where: { tenantId: req.tenantId },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    ]);
    res.json({ data: { rules, codes } });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load pricing rules' });
  }
}

async function createRule(req, res) {
  try {
    const name = String(req.body?.name || '').trim();
    const ruleType = String(req.body?.ruleType || '').toUpperCase();
    const value = parseFloat(req.body?.value || 0);
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!['PERCENT', 'FIXED'].includes(ruleType)) return res.status(400).json({ error: 'ruleType must be PERCENT or FIXED' });
    if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ error: 'value must be > 0' });
    const row = await prisma.pricingRule.create({
      data: {
        tenantId: req.tenantId,
        name,
        description: req.body?.description ? String(req.body.description).trim() : null,
        ruleType,
        value,
        minSubtotal: req.body?.minSubtotal ? parseFloat(req.body.minSubtotal) : null,
        productIds: Array.isArray(req.body?.productIds) ? req.body.productIds.map(String) : [],
        categoryIds: Array.isArray(req.body?.categoryIds) ? req.body.categoryIds.map(String) : [],
        startAt: req.body?.startAt ? new Date(req.body.startAt) : null,
        endAt: req.body?.endAt ? new Date(req.body.endAt) : null,
        isActive: req.body?.isActive !== false,
        stackable: req.body?.stackable === true,
        maxDiscount: req.body?.maxDiscount ? parseFloat(req.body.maxDiscount) : null,
        createdById: req.user.id,
      },
    });
    res.status(201).json({ data: row });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create pricing rule' });
  }
}

async function createCode(req, res) {
  try {
    const code = String(req.body?.code || '').trim().toUpperCase();
    const ruleType = String(req.body?.ruleType || '').toUpperCase();
    const value = parseFloat(req.body?.value || 0);
    if (!code) return res.status(400).json({ error: 'code is required' });
    if (!['PERCENT', 'FIXED'].includes(ruleType)) return res.status(400).json({ error: 'ruleType must be PERCENT or FIXED' });
    if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ error: 'value must be > 0' });
    const row = await prisma.promotionCode.create({
      data: {
        tenantId: req.tenantId,
        code,
        name: req.body?.name ? String(req.body.name).trim() : null,
        description: req.body?.description ? String(req.body.description).trim() : null,
        ruleType,
        value,
        minSubtotal: req.body?.minSubtotal ? parseFloat(req.body.minSubtotal) : null,
        usageLimit: req.body?.usageLimit ? parseInt(req.body.usageLimit, 10) : null,
        startAt: req.body?.startAt ? new Date(req.body.startAt) : null,
        endAt: req.body?.endAt ? new Date(req.body.endAt) : null,
        isActive: req.body?.isActive !== false,
        maxDiscount: req.body?.maxDiscount ? parseFloat(req.body.maxDiscount) : null,
        createdById: req.user.id,
      },
    });
    res.status(201).json({ data: row });
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Promo code already exists' });
    res.status(500).json({ error: 'Failed to create promo code' });
  }
}

async function evaluate(req, res) {
  try {
    const subtotal = parseFloat(req.body?.subtotal || 0);
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const promoCodeInput = req.body?.promoCode ? String(req.body.promoCode).trim().toUpperCase() : null;
    if (!Number.isFinite(subtotal) || subtotal < 0) return res.status(400).json({ error: 'subtotal must be >= 0' });

    const [rules, promo] = await Promise.all([
      prisma.pricingRule.findMany({
        where: { tenantId: req.tenantId, isActive: true },
        orderBy: [{ stackable: 'asc' }, { createdAt: 'desc' }],
      }),
      promoCodeInput
        ? prisma.promotionCode.findFirst({ where: { tenantId: req.tenantId, code: promoCodeInput, isActive: true } })
        : Promise.resolve(null),
    ]);

    const itemProductIds = new Set(items.map((i) => String(i.productId || '')).filter(Boolean));
    const itemCategoryIds = new Set(items.map((i) => String(i.categoryId || '')).filter(Boolean));

    const applicableRules = rules.filter((r) => {
      if (!inWindow(r.startAt, r.endAt)) return false;
      if (r.minSubtotal && subtotal < parseFloat(r.minSubtotal)) return false;
      const hasProductScope = Array.isArray(r.productIds) && r.productIds.length > 0;
      const hasCategoryScope = Array.isArray(r.categoryIds) && r.categoryIds.length > 0;
      if (!hasProductScope && !hasCategoryScope) return true;
      if (hasProductScope && r.productIds.some((id) => itemProductIds.has(String(id)))) return true;
      if (hasCategoryScope && r.categoryIds.some((id) => itemCategoryIds.has(String(id)))) return true;
      return false;
    });

    let applied = [];
    let totalDiscount = 0;
    for (const r of applicableRules) {
      if (!r.stackable && applied.length > 0) continue;
      const d = calcRuleDiscount({ ruleType: r.ruleType, value: r.value, subtotal: subtotal - totalDiscount, maxDiscount: r.maxDiscount });
      if (d <= 0) continue;
      totalDiscount += d;
      applied.push({ kind: 'RULE', id: r.id, name: r.name, discount: d });
    }

    let promoApplied = null;
    if (promo && inWindow(promo.startAt, promo.endAt)) {
      const usageOk = promo.usageLimit == null || promo.usageCount < promo.usageLimit;
      const minOk = promo.minSubtotal == null || subtotal >= parseFloat(promo.minSubtotal);
      if (usageOk && minOk) {
        const pd = calcRuleDiscount({ ruleType: promo.ruleType, value: promo.value, subtotal: subtotal - totalDiscount, maxDiscount: promo.maxDiscount });
        if (pd > 0) {
          totalDiscount += pd;
          promoApplied = { id: promo.id, code: promo.code, discount: pd };
        }
      }
    }

    const totalAfterDiscount = Math.max(0, subtotal - totalDiscount);
    res.json({
      data: {
        subtotal,
        totalDiscount,
        totalAfterDiscount,
        appliedRules: applied,
        promoApplied,
      },
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to evaluate promotion pricing' });
  }
}

module.exports = {
  list,
  createRule,
  createCode,
  evaluate,
};
