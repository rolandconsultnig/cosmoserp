const prisma = require('../config/prisma');

function getMonthKey(rawMonth) {
  if (rawMonth && typeof rawMonth === 'string' && rawMonth.trim()) {
    return rawMonth.trim();
  }
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

exports.getMyBudget = async (req, res) => {
  try {
    const customer = req.customer;
    if (!customer) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const month = getMonthKey(req.query.month);

    const plan = await prisma.budgetPlan.findFirst({
      where: {
        customerId: customer.id,
        month,
      },
    });

    if (!plan) {
      return res.json({
        data: {
          month,
          incomes: [],
          expenses: [],
        },
      });
    }

    return res.json({
      data: {
        id: plan.id,
        month: plan.month,
        incomes: plan.incomes || [],
        expenses: plan.expenses || [],
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('getMyBudget error', err);
    return res.status(500).json({ message: 'Failed to load budget' });
  }
};

exports.saveMyBudget = async (req, res) => {
  try {
    const customer = req.customer;
    if (!customer) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const month = getMonthKey(req.body.month);
    const incomes = Array.isArray(req.body.incomes) ? req.body.incomes : [];
    const expenses = Array.isArray(req.body.expenses) ? req.body.expenses : [];

    const existing = await prisma.budgetPlan.findFirst({
      where: {
        customerId: customer.id,
        month,
      },
    });

    let saved;
    if (existing) {
      saved = await prisma.budgetPlan.update({
        where: { id: existing.id },
        data: {
          incomes,
          expenses,
        },
      });
    } else {
      saved = await prisma.budgetPlan.create({
        data: {
          customerId: customer.id,
          month,
          incomes,
          expenses,
        },
      });
    }

    return res.status(200).json({
      data: {
        id: saved.id,
        month: saved.month,
        incomes: saved.incomes || [],
        expenses: saved.expenses || [],
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('saveMyBudget error', err);
    return res.status(500).json({ message: 'Failed to save budget' });
  }
};

