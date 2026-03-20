/**
 * Create an ERP user with role ADMIN (or another role) for an existing tenant.
 *
 * Usage (from apps/api, with .env loaded):
 *   node prisma/create-tenant-admin.js
 *
 * Environment variables:
 *   TENANT_EMAIL   — Tenant.business email (required)
 *   USER_EMAIL     — New user login email (required)
 *   USER_PASSWORD  — Plain password, min 8 chars (required)
 *   FIRST_NAME     — Default: Admin
 *   LAST_NAME      — Default: User
 *   ROLE           — Default: ADMIN (OWNER | ADMIN | ACCOUNTANT | SALES | ...)
 *
 * Example:
 *   TENANT_EMAIL=erp@afrinict.com USER_EMAIL=finance@mybiz.ng USER_PASSWORD=SecurePass1! node prisma/create-tenant-admin.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const ROUNDS = 12;

async function main() {
  const tenantEmail = (process.env.TENANT_EMAIL || '').trim().toLowerCase();
  const userEmail = (process.env.USER_EMAIL || '').trim().toLowerCase();
  const password = process.env.USER_PASSWORD || '';
  const firstName = (process.env.FIRST_NAME || 'Admin').trim() || 'Admin';
  const lastName = (process.env.LAST_NAME || 'User').trim() || 'User';
  const role = (process.env.ROLE || 'ADMIN').trim().toUpperCase();

  if (!tenantEmail || !userEmail || !password) {
    console.error('Missing env: TENANT_EMAIL, USER_EMAIL, and USER_PASSWORD are required.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('USER_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }
  if (role === 'OWNER') {
    console.error('Refusing to create OWNER via this script. Use tenant registration or promote manually.');
    process.exit(1);
  }

  const tenant = await prisma.tenant.findUnique({ where: { email: tenantEmail } });
  if (!tenant) {
    console.error(`Tenant not found for business email: ${tenantEmail}`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, ROUNDS);

  const user = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: userEmail } },
    update: {
      passwordHash,
      firstName,
      lastName,
      role,
      isActive: true,
    },
    create: {
      tenantId: tenant.id,
      email: userEmail,
      passwordHash,
      firstName,
      lastName,
      role,
      isActive: true,
    },
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  });

  console.log('✅ Tenant admin (ERP user) ready:');
  console.log(`   Tenant:  ${tenant.businessName} (${tenant.email})`);
  console.log(`   User:    ${user.email} (${user.role})`);
  console.log('   Sign in at ERP login with this email and password.');
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
