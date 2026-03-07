const prisma = require('../config/prisma');
const { generateInvoiceNumber, generateQuoteNumber, calculateVAT, calculateWHT, roundDecimal } = require('../utils/helpers');
const { createAuditLog } = require('../middleware/audit.middleware');
const pdfService = require('../services/pdf.service');
const whatsappService = require('../services/whatsapp.service');
const emailService = require('../services/email.service');

// ── Record a POS sale ──────────────────────────────────
exports.createSale = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const cashierId = req.user.id;
    const {
      receiptNumber, receiptNo, customerId, customerName, registerId,
      paymentMethod, items, subtotal, discountAmount, discountType,
      discountValue, vatAmount, totalAmount, amountTendered,
      changeDue, notes, discount,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Sale must have at least one item' });
    }

    const receipt = receiptNumber || receiptNo || `POS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const discountAmt = discountAmount ?? discount ?? 0;

    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.pOSSale.create({
        data: {
          tenantId,
          receiptNumber: receipt,
          customerId: customerId || null,
          customerName: customerName || null,
          cashierId,
          registerId: registerId || null,
          paymentMethod: paymentMethod || 'CASH',
          subtotal: subtotal || 0,
          discountAmount: discountAmt,
          discountType: discountType || null,
          discountValue: discountValue || 0,
          vatAmount: vatAmount || 0,
          totalAmount: totalAmount || 0,
          amountTendered: amountTendered || 0,
          changeDue: changeDue || 0,
          notes: notes || null,
          lines: {
            create: items.map((item) => ({
              productId: item.productId || null,
              productName: item.name || item.productName,
              sku: item.sku || null,
              quantity: item.qty || item.quantity || 1,
              unitPrice: item.unitPrice,
              vatRate: item.vatRate || 0.075,
              vatAmount: item.vatAmount || (item.unitPrice * (item.qty || item.quantity || 1) * 0.075),
              lineTotal: item.lineTotal || (item.unitPrice * (item.qty || item.quantity || 1)),
            })),
          },
        },
        include: { lines: true, cashier: { select: { firstName: true, lastName: true } } },
      });

      const warehouse = await tx.warehouse.findFirst({
        where: { tenantId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      });

      for (const line of created.lines) {
        if (!line.productId) continue;
        const lineQty = Math.floor(Number(line.quantity)) || 0;
        if (lineQty <= 0) continue;

        if (!warehouse) {
          throw new Error(`No warehouse found for tenant; cannot deduct stock for product ${line.productName}`);
        }

        const stockLevel = await tx.stockLevel.findUnique({
          where: { productId_warehouseId: { productId: line.productId, warehouseId: warehouse.id } },
        });
        if (!stockLevel) {
          throw new Error(`Insufficient stock: no stock record for "${line.productName}" in warehouse`);
        }
        const available = stockLevel.quantity - (stockLevel.reservedQty || 0);
        if (available < lineQty) {
          throw new Error(`Insufficient stock for "${line.productName}": available ${available}, required ${lineQty}`);
        }

        await tx.stockLevel.update({
          where: { productId_warehouseId: { productId: line.productId, warehouseId: warehouse.id } },
          data: { quantity: { decrement: lineQty } },
        });
      }

      return created;
    });

    res.status(201).json({ data: sale });
  } catch (err) {
    console.error('POS sale error:', err);
    res.status(500).json({ error: err.message || 'Failed to record sale' });
  }
};

// ── List POS sales ─────────────────────────────────────
exports.listSales = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const {
      page = 1, limit = 50, cashierId, status,
      paymentMethod, dateFrom, dateTo, search,
    } = req.query;

    const where = { tenantId };
    if (cashierId) where.cashierId = cashierId;
    if (status) where.status = status;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z');
    }
    if (search) {
      where.OR = [
        { receiptNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      prisma.pOSSale.findMany({
        where,
        include: {
          lines: true,
          cashier: { select: { firstName: true, lastName: true } },
          customer: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip,
      }),
      prisma.pOSSale.count({ where }),
    ]);

    res.json({ data, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Get single sale ────────────────────────────────────
exports.getSale = async (req, res) => {
  try {
    const sale = await prisma.pOSSale.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      include: {
        lines: { include: { product: { select: { id: true, name: true, sku: true } } } },
        cashier: { select: { firstName: true, lastName: true, email: true } },
        customer: { select: { id: true, name: true, phone: true, email: true } },
      },
    });
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    res.json({ data: sale });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Void a sale ────────────────────────────────────────
exports.voidSale = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const sale = await prisma.pOSSale.findFirst({
      where: { id: req.params.id, tenantId },
      include: { lines: true },
    });
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    if (sale.status === 'VOIDED') return res.status(400).json({ error: 'Sale already voided' });

    const warehouse = await prisma.warehouse.findFirst({
      where: { tenantId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    const updated = await prisma.pOSSale.update({
      where: { id: sale.id },
      data: {
        status: 'VOIDED',
        voidedAt: new Date(),
        voidedById: req.user.id,
        voidReason: req.body.reason || 'Voided by cashier',
      },
    });

    if (warehouse) {
      for (const line of sale.lines) {
        if (!line.productId) continue;
        const lineQty = Math.floor(Number(line.quantity)) || 0;
        if (lineQty <= 0) continue;

        await prisma.stockLevel.upsert({
          where: { productId_warehouseId: { productId: line.productId, warehouseId: warehouse.id } },
          create: {
            tenantId,
            productId: line.productId,
            warehouseId: warehouse.id,
            quantity: lineQty,
          },
          update: { quantity: { increment: lineQty } },
        });
      }
    }

    res.json({ data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── POS Dashboard stats ────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const baseWhere = { tenantId, status: 'COMPLETED' };

    const [
      todaySales, todayRevenue,
      monthSales, monthRevenue,
      todayByCashier, todayByMethod,
      recentSales, topProducts,
    ] = await Promise.all([
      // Today's sales count
      prisma.pOSSale.count({
        where: { ...baseWhere, createdAt: { gte: startOfDay } },
      }),
      // Today's revenue
      prisma.pOSSale.aggregate({
        where: { ...baseWhere, createdAt: { gte: startOfDay } },
        _sum: { totalAmount: true },
      }),
      // Month's sales count
      prisma.pOSSale.count({
        where: { ...baseWhere, createdAt: { gte: startOfMonth } },
      }),
      // Month's revenue
      prisma.pOSSale.aggregate({
        where: { ...baseWhere, createdAt: { gte: startOfMonth } },
        _sum: { totalAmount: true },
      }),
      // Today's sales grouped by cashier
      prisma.pOSSale.groupBy({
        by: ['cashierId'],
        where: { ...baseWhere, createdAt: { gte: startOfDay } },
        _count: true,
        _sum: { totalAmount: true },
      }),
      // Today's sales grouped by payment method
      prisma.pOSSale.groupBy({
        by: ['paymentMethod'],
        where: { ...baseWhere, createdAt: { gte: startOfDay } },
        _count: true,
        _sum: { totalAmount: true },
      }),
      // Recent 5 sales
      prisma.pOSSale.findMany({
        where: { tenantId },
        include: {
          cashier: { select: { firstName: true, lastName: true } },
          lines: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      // Top products today
      prisma.pOSSaleLine.groupBy({
        by: ['productName'],
        where: {
          sale: { ...baseWhere, createdAt: { gte: startOfDay } },
        },
        _sum: { quantity: true, lineTotal: true },
        orderBy: { _sum: { lineTotal: 'desc' } },
        take: 10,
      }),
    ]);

    // Resolve cashier names
    let cashierStats = [];
    if (todayByCashier.length > 0) {
      const cashierIds = todayByCashier.map((c) => c.cashierId);
      const cashiers = await prisma.user.findMany({
        where: { id: { in: cashierIds } },
        select: { id: true, firstName: true, lastName: true },
      });
      const cashierMap = Object.fromEntries(cashiers.map((c) => [c.id, `${c.firstName} ${c.lastName}`]));
      cashierStats = todayByCashier.map((c) => ({
        cashierId: c.cashierId,
        name: cashierMap[c.cashierId] || 'Unknown',
        sales: c._count,
        revenue: c._sum.totalAmount,
      }));
    }

    res.json({
      data: {
        today: {
          sales: todaySales,
          revenue: todayRevenue._sum.totalAmount || 0,
        },
        month: {
          sales: monthSales,
          revenue: monthRevenue._sum.totalAmount || 0,
        },
        cashierStats,
        paymentMethods: todayByMethod.map((m) => ({
          method: m.paymentMethod,
          count: m._count,
          total: m._sum.totalAmount,
        })),
        recentSales,
        topProducts: topProducts.map((p) => ({
          productName: p.productName,
          quantitySold: p._sum.quantity,
          revenue: p._sum.lineTotal,
        })),
      },
    });
  } catch (err) {
    console.error('POS stats error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ── End of Day summary ─────────────────────────────────
exports.endOfDay = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

    const baseWhere = { tenantId, createdAt: { gte: startOfDay, lte: endOfDay } };

    const [completed, voided, byMethod, byHour] = await Promise.all([
      prisma.pOSSale.aggregate({
        where: { ...baseWhere, status: 'COMPLETED' },
        _count: true,
        _sum: { totalAmount: true, discountAmount: true, vatAmount: true },
      }),
      prisma.pOSSale.aggregate({
        where: { ...baseWhere, status: 'VOIDED' },
        _count: true,
        _sum: { totalAmount: true },
      }),
      prisma.pOSSale.groupBy({
        by: ['paymentMethod'],
        where: { ...baseWhere, status: 'COMPLETED' },
        _count: true,
        _sum: { totalAmount: true },
      }),
      prisma.$queryRawUnsafe(`
        SELECT EXTRACT(HOUR FROM "createdAt") as hour, COUNT(*)::int as count,
               COALESCE(SUM("totalAmount"), 0) as revenue
        FROM "POSSale"
        WHERE "tenantId" = $1 AND "status" = 'COMPLETED'
          AND "createdAt" >= $2 AND "createdAt" <= $3
        GROUP BY hour ORDER BY hour
      `, tenantId, startOfDay, endOfDay),
    ]);

    res.json({
      data: {
        date: startOfDay.toISOString().split('T')[0],
        completed: {
          count: completed._count,
          total: completed._sum.totalAmount || 0,
          discounts: completed._sum.discountAmount || 0,
          vat: completed._sum.vatAmount || 0,
        },
        voided: {
          count: voided._count,
          total: voided._sum.totalAmount || 0,
        },
        paymentBreakdown: byMethod.map((m) => ({
          method: m.paymentMethod,
          count: m._count,
          total: m._sum.totalAmount,
        })),
        hourlyBreakdown: byHour,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Create invoice from completed POS sale ──────────────
exports.createInvoiceFromSale = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const sale = await prisma.pOSSale.findFirst({
      where: { id: req.params.id, tenantId },
      include: { lines: true, customer: true },
    });
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    if (sale.status !== 'COMPLETED') return res.status(400).json({ error: 'Only completed sales can be converted to invoice' });

    let customerId = sale.customerId;
    if (!customerId) {
      const firstCustomer = await prisma.customer.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'asc' },
      });
      if (!firstCustomer) return res.status(400).json({ error: 'No customer found. Add a customer or assign one to the sale.' });
      customerId = firstCustomer.id;
    }

    const count = await prisma.invoice.count({ where: { tenantId } });
    const invoiceNumber = generateInvoiceNumber('INV', count + 1);

    let subtotal = 0, vatAmount = 0, whtAmount = 0;
    const processedLines = sale.lines.map((line) => {
      const qty = Number(line.quantity) || 0;
      const unitPrice = Number(line.unitPrice) || 0;
      const lineSubtotal = roundDecimal(qty * unitPrice);
      const vat = calculateVAT(lineSubtotal, Number(line.vatRate) || 0.075);
      const wht = calculateWHT(lineSubtotal, 0);
      subtotal += lineSubtotal;
      vatAmount += vat;
      whtAmount += wht;
      return {
        productId: line.productId || null,
        description: line.productName || 'POS line',
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        vatRate: line.vatRate || 0.075,
        whtRate: 0,
        vatAmount: vat,
        whtAmount: wht,
        lineTotal: roundDecimal(lineSubtotal + vat - wht),
      };
    });

    const discountAmount = roundDecimal(Number(sale.discountAmount) || 0);
    const totalAmount = roundDecimal(subtotal + vatAmount - whtAmount - discountAmount);

    const invoice = await prisma.invoice.create({
      data: {
        tenantId,
        customerId,
        invoiceNumber,
        invoiceType: 'B2C',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        currency: 'NGN',
        exchangeRate: 1,
        subtotal: roundDecimal(subtotal),
        vatAmount: roundDecimal(vatAmount),
        whtAmount: roundDecimal(whtAmount),
        discountAmount,
        totalAmount,
        amountDue: totalAmount,
        notes: sale.notes ? `From POS sale ${sale.receiptNumber}` : null,
        createdById: req.user.id,
        lines: { create: processedLines },
      },
      include: { lines: true, customer: true, tenant: { select: { businessName: true, tradingName: true } } },
    });

    const sendEmail = req.body.sendEmail === true;
    const sendWhatsApp = req.body.sendWhatsApp === true;
    const tenantName = invoice.tenant?.tradingName || invoice.tenant?.businessName || 'Cosmos ERP';

    if (sendEmail || sendWhatsApp) {
      let pdfPath = null;
      try {
        pdfPath = await pdfService.generateInvoicePDF(invoice, tenantId);
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: 'SENT', pdfUrl: pdfPath },
        });
      } catch (e) {
        console.error('POS create-invoice PDF error:', e);
      }
      const invWithPdf = { ...invoice, pdfUrl: pdfPath || invoice.pdfUrl };
      if (sendWhatsApp && invoice.customer?.whatsapp) {
        try {
          await whatsappService.sendInvoice(invWithPdf);
          await prisma.invoice.update({ where: { id: invoice.id }, data: { whatsappSentAt: new Date() } });
        } catch (e) {
          console.error('POS create-invoice WhatsApp error:', e);
        }
      }
      if (sendEmail && invoice.customer?.email) {
        try {
          await emailService.sendInvoiceEmail(invWithPdf, invoice.customer.email, tenantName, invWithPdf.pdfUrl);
        } catch (e) {
          console.error('POS create-invoice email error:', e);
        }
      }
      await createAuditLog({ tenantId, userId: req.user.id, action: 'SEND', resource: 'Invoice', resourceId: invoice.id, req });
    }

    res.status(201).json({ data: invoice });
  } catch (err) {
    console.error('POS create-invoice error:', err);
    res.status(500).json({ error: err.message || 'Failed to create invoice from sale' });
  }
};

// ── Send receipt (email / WhatsApp) for a POS sale ───────
exports.sendReceipt = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const sale = await prisma.pOSSale.findFirst({
      where: { id: req.params.id, tenantId },
      include: { lines: true, customer: true },
    });
    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { businessName: true, tradingName: true },
    });
    const tenantName = tenant?.tradingName || tenant?.businessName || 'Cosmos ERP';

    const receiptPayload = {
      receiptNo: sale.receiptNumber,
      receiptNumber: sale.receiptNumber,
      items: (sale.lines || []).map((l) => ({
        name: l.productName,
        qty: l.quantity,
        unitPrice: l.unitPrice,
      })),
      total: sale.totalAmount,
      customerName: sale.customerName || sale.customer?.name,
    };

    const sendEmail = req.body.sendEmail === true;
    const sendWhatsApp = req.body.sendWhatsApp === true;
    const results = { email: null, whatsapp: null };

    if (sendEmail && sale.customer?.email) {
      try {
        results.email = await emailService.sendReceipt(receiptPayload, sale.customer.email, tenantName);
      } catch (e) {
        console.error('POS send-receipt email error:', e);
        results.email = { status: 'error', message: e.message };
      }
    }
    if (sendWhatsApp && (sale.customer?.whatsapp || sale.customer?.phone)) {
      const wa = sale.customer.whatsapp || sale.customer.phone;
      try {
        results.whatsapp = await whatsappService.sendReceipt(receiptPayload, tenantName, wa);
      } catch (e) {
        console.error('POS send-receipt WhatsApp error:', e);
        results.whatsapp = { status: 'error', message: e.message };
      }
    }

    res.json({ message: 'Receipt send completed', results });
  } catch (err) {
    console.error('POS send-receipt error:', err);
    res.status(500).json({ error: err.message || 'Failed to send receipt' });
  }
};

// ── Create quotation from POS cart (Save as Quotation) ───
exports.createQuotation = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { customerId, customerName, items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    let resolvedCustomerId = customerId;
    if (!resolvedCustomerId) {
      const firstCustomer = await prisma.customer.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'asc' },
      });
      if (!firstCustomer) {
        return res.status(400).json({ error: 'No customer found. Add a customer first or provide customerId/customerName.' });
      }
      resolvedCustomerId = firstCustomer.id;
    } else {
      const exists = await prisma.customer.findFirst({
        where: { id: resolvedCustomerId, tenantId },
      });
      if (!exists) return res.status(404).json({ error: 'Customer not found' });
    }

    const count = await prisma.quote.count({ where: { tenantId } });
    const quoteNumber = generateQuoteNumber('QT', count + 1);

    let subtotal = 0, vatAmount = 0, whtAmount = 0;
    const processedLines = items.map((line) => {
      const qty = Number(line.qty ?? line.quantity) || 1;
      const unitPrice = Number(line.unitPrice) || 0;
      const lineSubtotal = roundDecimal(qty * unitPrice);
      const vat = calculateVAT(lineSubtotal, 0.075);
      const wht = calculateWHT(lineSubtotal, 0);
      subtotal += lineSubtotal;
      vatAmount += vat;
      whtAmount += wht;
      return {
        productId: line.productId || null,
        description: line.name || line.productName || 'Item',
        quantity: qty,
        unitPrice,
        vatRate: 0.075,
        whtRate: 0,
        vatAmount: vat,
        whtAmount: wht,
        lineTotal: roundDecimal(lineSubtotal + vat - wht),
      };
    });

    const discountAmount = 0;
    const totalAmount = roundDecimal(subtotal + vatAmount - whtAmount - discountAmount);

    const quote = await prisma.quote.create({
      data: {
        tenantId,
        customerId: resolvedCustomerId,
        quoteNumber,
        status: 'DRAFT',
        issueDate: new Date(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        currency: 'NGN',
        exchangeRate: 1,
        subtotal: roundDecimal(subtotal),
        vatAmount: roundDecimal(vatAmount),
        discountAmount,
        totalAmount,
        createdById: req.user.id,
        lines: { create: processedLines },
      },
      include: { lines: true, customer: true },
    });

    await createAuditLog({ tenantId, userId: req.user.id, action: 'CREATE', resource: 'Quote', resourceId: quote.id, newValues: { quoteNumber, totalAmount }, req });
    res.status(201).json({ data: quote });
  } catch (err) {
    console.error('POS create-quotation error:', err);
    res.status(500).json({ error: err.message || 'Failed to create quotation' });
  }
};
