/**
 * One-time script: ensure the super admin exists with the seeded credentials.
 * Run from apps/api: node scripts/ensure-super-admin.js
 * Use when admin login returns 401 and you need to reset/fix the super admin.
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const EMAIL = 'sam@afrinict.net';
const PASSWORD = 'Samolan123@';
const ROUNDS = 12;

async function main() {
  const hash = await bcrypt.hash(PASSWORD, ROUNDS);
  await prisma.adminUser.upsert({
    where: { email: EMAIL },
    update: { passwordHash: hash, firstName: 'Sam', lastName: 'Olan', role: 'SUPER_ADMIN', isActive: true },
    create: {
      email: EMAIL,
      passwordHash: hash,
      firstName: 'Sam',
      lastName: 'Olan',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log('Super admin ensured:', EMAIL, '| Password:', PASSWORD);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
