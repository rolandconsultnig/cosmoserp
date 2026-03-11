const prisma = require('../config/prisma');

function getMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

exports.createBooking = async (req, res) => {
  try {
    const customer = req.customer;
    if (!customer) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { mode, from, to, provider, price, eta } = req.body || {};

    if (!mode || !from || !to || !provider || price == null) {
      return res.status(400).json({ message: 'mode, from, to, provider and price are required' });
    }

    const created = await prisma.transportBooking.create({
      data: {
        customerId: customer.id,
        mode: String(mode).toUpperCase(),
        from,
        to,
        provider,
        price,
        eta: eta || null,
      },
    });

    return res.status(201).json({ data: created });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('createBooking error', err);
    return res.status(500).json({ message: 'Failed to create booking' });
  }
};

exports.listMyBookings = async (req, res) => {
  try {
    const customer = req.customer;
    if (!customer) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { mode } = req.query || {};

    const bookings = await prisma.transportBooking.findMany({
      where: {
        customerId: customer.id,
        ...(mode
          ? {
              mode: String(mode).toUpperCase(),
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ data: bookings });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('listMyBookings error', err);
    return res.status(500).json({ message: 'Failed to load bookings' });
  }
};

