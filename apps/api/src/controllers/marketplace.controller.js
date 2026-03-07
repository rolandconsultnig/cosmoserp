const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');
const { generateOrderNumber, roundDecimal, slugify, paginate, paginatedResponse } = require('../utils/helpers');
const { createAuditLog } = require('../middleware/audit.middleware');
const axios = require('axios');

function mapSeller(tenant) {
  if (!tenant) return null;
  return {
    id: tenant.id,
    businessName: tenant.businessName,
    tradingName: tenant.tradingName,
    city: tenant.city,
    state: tenant.state,
    isMarketplaceSeller: tenant.isMarketplaceSeller,
  };
}

function mapListingCard(listing) {
  return {
    id: listing.id,
    tenantId: listing.tenantId || listing.product?.tenantId,
    name: listing.title,
    title: listing.title,
    description: listing.description,
    sellingPrice: parseFloat(listing.price),
    price: parseFloat(listing.price),
    comparePrice: listing.comparePrice ? parseFloat(listing.comparePrice) : null,
    currency: listing.currency,
    stock: listing.stock,
    imageUrl: listing.images?.[0] || null,
    images: listing.images || [],
    avgRating: parseFloat(listing.rating || 0),
    rating: parseFloat(listing.rating || 0),
    reviewCount: listing.reviewCount || 0,
    soldCount: listing.soldCount || 0,
    slug: listing.slug,
    unit: listing.product?.unit || 'piece',
    seller: mapSeller(listing.product?.tenant),
  };
}

function mapListingDetail(listing) {
  return {
    ...mapListingCard(listing),
    category: listing.category || null,
    sku: listing.product?.sku || null,
    stockLevels: [],
    reviews: listing.reviews || [],
  };
}

async function listListings(req, res) {
  try {
    const { page, limit, search, categoryId, tenantId, minPrice, maxPrice, sort } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = { isActive: true };
    if (categoryId) where.categoryId = categoryId;
    if (tenantId) where.tenantId = tenantId;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search.toLowerCase() } },
      ];
    }
    const orderBy = sort === 'price_asc' ? { price: 'asc' } : sort === 'price_desc' ? { price: 'desc' } : sort === 'popular' ? { soldCount: 'desc' } : { createdAt: 'desc' };
    const [data, total] = await Promise.all([
      prisma.marketplaceListing.findMany({
        where, take, skip, orderBy,
        include: {
          category: { select: { id: true, name: true } },
          product: {
            select: {
              tenantId: true,
              unit: true,
              tenant: { select: { id: true, businessName: true, tradingName: true, city: true, state: true, isMarketplaceSeller: true } },
            },
          },
        },
      }),
      prisma.marketplaceListing.count({ where }),
    ]);
    res.json(paginatedResponse(data.map(mapListingCard), total, page, limit));
  } catch (error) {
    logger.error('List listings error:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
}

async function getListing(req, res) {
  try {
    const listing = await prisma.marketplaceListing.findFirst({
      where: { OR: [{ id: req.params.idOrSlug }, { slug: req.params.idOrSlug }], isActive: true },
      include: {
        category: true,
        reviews: { orderBy: { createdAt: 'desc' }, take: 10 },
        product: {
          select: {
            id: true,
            sku: true,
            unit: true,
            tenantId: true,
            tenant: { select: { id: true, businessName: true, tradingName: true, city: true, state: true, isMarketplaceSeller: true } },
          },
        },
      },
    });
    if (!listing) return res.status(404).json({ error: 'Product not found' });

    await prisma.marketplaceListing.update({ where: { id: listing.id }, data: { viewCount: { increment: 1 } } });
    res.json({ data: mapListingDetail(listing) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
}

async function getSellerStore(req, res) {
  try {
    const tenant = await prisma.tenant.findFirst({
      where: { id: req.params.tenantId, isMarketplaceSeller: true, isActive: true },
      select: {
        id: true,
        businessName: true,
        tradingName: true,
        city: true,
        state: true,
        industry: true,
        kycStatus: true,
        isMarketplaceSeller: true,
      },
    });
    if (!tenant) return res.status(404).json({ error: 'Seller store not found' });

    const listings = await prisma.marketplaceListing.findMany({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: 60,
      include: {
        product: {
          select: {
            tenantId: true,
            unit: true,
            tenant: { select: { id: true, businessName: true, tradingName: true, city: true, state: true, isMarketplaceSeller: true } },
          },
        },
      },
    });

    res.json({
      data: {
        seller: mapSeller(tenant),
        listings: listings.map(mapListingCard),
      },
    });
  } catch (error) {
    logger.error('Get seller store error:', error);
    res.status(500).json({ error: 'Failed to fetch seller store' });
  }
}

async function createOrder(req, res) {
  try {
    const { items, buyerEmail, buyerPhone, buyerName, deliveryAddress, deliveryMethod, notes } = req.body;
    if (!items?.length || !buyerEmail || !buyerName || !deliveryAddress) {
      return res.status(400).json({ error: 'Items, buyer info, and delivery address are required' });
    }

    const listings = await prisma.marketplaceListing.findMany({
      where: { id: { in: items.map((i) => i.listingId) }, isActive: true },
      include: { product: { select: { tenantId: true } } },
    });

    if (listings.length !== items.length) return res.status(400).json({ error: 'One or more products not found or unavailable' });

    const COMMISSION_RATE = parseFloat(process.env.MARKETPLACE_COMMISSION_RATE || '0.05');
    const orderNumber = generateOrderNumber();
    let subtotal = 0, vatTotal = 0, commissionTotal = 0;

    const orderLines = items.map((item) => {
      const listing = listings.find((l) => l.id === item.listingId);
      if (listing.stock < item.quantity) throw new Error(`Insufficient stock for: ${listing.title}`);
      const lineSubtotal = roundDecimal(parseFloat(listing.price) * item.quantity);
      const vatAmount = roundDecimal(lineSubtotal * 0.075);
      const lineTotal = roundDecimal(lineSubtotal + vatAmount);
      const commission = roundDecimal(lineTotal * COMMISSION_RATE);
      const sellerNet = roundDecimal(lineTotal - commission);
      subtotal += lineSubtotal;
      vatTotal += vatAmount;
      commissionTotal += commission;
      return {
        listingId: listing.id,
        tenantId: listing.product.tenantId,
        productName: listing.title,
        quantity: item.quantity,
        unitPrice: parseFloat(listing.price),
        vatAmount,
        lineTotal,
        commission,
        sellerNet,
      };
    });

    const shippingCost = 1500;
    const totalAmount = roundDecimal(subtotal + vatTotal + shippingCost);
    const sellerAmount = roundDecimal(totalAmount - commissionTotal - shippingCost);

    const order = await prisma.$transaction(async (tx) => {
      const o = await tx.marketplaceOrder.create({
        data: {
          orderNumber,
          buyerEmail: buyerEmail.toLowerCase(),
          buyerPhone,
          buyerName,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          currency: 'NGN',
          subtotal: roundDecimal(subtotal),
          shippingCost,
          vatAmount: roundDecimal(vatTotal),
          totalAmount,
          platformFee: roundDecimal(commissionTotal),
          sellerAmount,
          deliveryAddress: typeof deliveryAddress === 'string' ? { address: deliveryAddress } : deliveryAddress,
          deliveryMethod,
          notes,
          lines: { create: orderLines },
        },
        include: { lines: true },
      });

      // Reserve stock
      for (const item of items) {
        await tx.marketplaceListing.update({
          where: { id: item.listingId },
          data: { stock: { decrement: item.quantity } },
        });
      }
      return o;
    });

    res.status(201).json({
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        currency: order.currency,
      },
      message: 'Order created. Proceed to payment.',
    });
  } catch (error) {
    logger.error('Create order error:', error);
    res.status(error.message?.includes('Insufficient') ? 400 : 500).json({ error: error.message || 'Failed to create order' });
  }
}

async function initiatePayment(req, res) {
  try {
    const order = await prisma.marketplaceOrder.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.paymentStatus === 'SUCCESS') return res.status(400).json({ error: 'Order already paid' });

    const PAYSTACK_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_KEY) {
      return res.json({
        data: {
          reference: `mock-${order.orderNumber}`,
          authorization_url: `${process.env.MARKET_URL || 'http://localhost:5174'}/checkout/verify?reference=mock-${order.orderNumber}&order=${order.id}`,
          access_code: 'mock_access_code',
        },
        message: 'Mock payment (Cosmos Escrow not configured)',
      });
    }

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: order.buyerEmail,
        amount: Math.round(parseFloat(order.totalAmount) * 100),
        reference: `${order.orderNumber}-${Date.now()}`,
        metadata: { orderId: order.id, orderNumber: order.orderNumber, custom_fields: [{ display_name: 'Order', variable_name: 'order_number', value: order.orderNumber }] },
        callback_url: `${process.env.MARKET_URL || 'http://localhost:5174'}/checkout/verify`,
      },
      { headers: { Authorization: `Bearer ${PAYSTACK_KEY}` } }
    );

    await prisma.marketplaceOrder.update({ where: { id: order.id }, data: { paystackRef: response.data.data.reference } });
    res.json({ data: response.data.data });
  } catch (error) {
    logger.error('Payment initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
}

async function verifyPayment(req, res) {
  try {
    const { reference } = req.query;
    if (!reference) return res.status(400).json({ error: 'Payment reference required' });

    const order = await prisma.marketplaceOrder.findFirst({ where: { paystackRef: reference } });
    if (!order) return res.status(404).json({ error: 'Order not found for this reference' });

    let verified = false;
    const PAYSTACK_KEY = process.env.PAYSTACK_SECRET_KEY;

    if (PAYSTACK_KEY && !reference.startsWith('mock-')) {
      const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${PAYSTACK_KEY}` },
      });
      verified = response.data.data.status === 'success';
    } else {
      verified = true; // Mock mode
    }

    if (verified) {
      await prisma.$transaction(async (tx) => {
        await tx.marketplaceOrder.update({
          where: { id: order.id },
          data: { paymentStatus: 'SUCCESS', status: 'CONFIRMED', escrowStatus: 'HELD', paidAt: new Date() },
        });

        // Create invoice for each seller
        const lines = await tx.marketplaceOrderLine.findMany({ where: { orderId: order.id } });
        const sellerGroups = lines.reduce((acc, l) => { acc[l.tenantId] = acc[l.tenantId] || []; acc[l.tenantId].push(l); return acc; }, {});

        for (const [tenantId, sellerLines] of Object.entries(sellerGroups)) {
          const stockUpdates = sellerLines.map((l) =>
            tx.stockLevel.updateMany({ where: { product: { marketplaceListings: { some: { id: l.listingId } } } }, data: { quantity: { decrement: l.quantity } } })
          );
          await Promise.all(stockUpdates);

          await tx.marketplaceListing.updateMany({
            where: { id: { in: sellerLines.map((l) => l.listingId) } },
            data: { soldCount: { increment: 1 } },
          });
        }
      });

      res.json({ data: { status: 'paid', orderId: order.id, orderNumber: order.orderNumber }, message: 'Payment verified. Order confirmed.' });
    } else {
      res.status(400).json({ error: 'Payment verification failed' });
    }
  } catch (error) {
    logger.error('Payment verification error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
}

async function getOrder(req, res) {
  try {
    const order = await prisma.marketplaceOrder.findUnique({
      where: { id: req.params.id },
      include: { lines: { include: { listing: { select: { title: true, images: true, slug: true } } } } },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ data: order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
}

async function getShippingRates(req, res) {
  try {
    const { origin, destination, weight } = req.query;
    const GIG_KEY = process.env.GIG_API_KEY;
    const rates = [
      { provider: 'GIG Logistics', service: 'Standard', price: 1500, estimatedDays: '3-5 business days', logo: 'gig' },
      { provider: 'Kobo360', service: 'Express', price: 2500, estimatedDays: '1-2 business days', logo: 'kobo360' },
      { provider: 'Terminal Africa', service: 'Economy', price: 800, estimatedDays: '5-7 business days', logo: 'terminal' },
    ];
    res.json({ data: rates });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shipping rates' });
  }
}

async function addReview(req, res) {
  try {
    const { rating, title, comment, buyerName, buyerEmail } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });

    const listing = await prisma.marketplaceListing.findUnique({ where: { id: req.params.id } });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const review = await prisma.$transaction(async (tx) => {
      const r = await tx.productReview.create({
        data: { listingId: listing.id, rating: parseInt(rating), title, comment, buyerName: buyerName || 'Anonymous', buyerEmail: buyerEmail || '', isVerified: false },
      });
      const stats = await tx.productReview.aggregate({ where: { listingId: listing.id }, _avg: { rating: true }, _count: true });
      await tx.marketplaceListing.update({
        where: { id: listing.id },
        data: { rating: parseFloat((stats._avg.rating || 0).toFixed(2)), reviewCount: stats._count },
      });
      return r;
    });
    res.status(201).json({ data: review });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add review' });
  }
}

async function listCategories(req, res) {
  try {
    const categories = await prisma.productCategory.findMany({
      where: { isActive: true, parentId: null },
      include: { children: { where: { isActive: true } }, _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ data: categories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
}

module.exports = { listListings, getListing, getSellerStore, createOrder, initiatePayment, verifyPayment, getOrder, getShippingRates, addReview, listCategories };
