/**
 * Creates or updates apps/api/.env with strong JWT / encryption secrets
 * and a working local DATABASE_URL (replaces YOUR_POSTGRES_PASSWORD).
 *
 * Usage (from apps/api):
 *   npm run env:init
 *   POSTGRES_PASSWORD=mysecret npm run env:init
 *   POSTGRES_USER=cosmos_user POSTGRES_PASSWORD=x POSTGRES_DB=cosmos_db npm run env:init
 *   npm run env:init -- --force-secrets    # regenerate JWT_* and ENCRYPTION_KEY even if already set
 *   npm run env:init -- --rewrite-db-urls  # set DATABASE_URL / SHADOW_DATABASE_URL from POSTGRES_* (or INIT_*)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const apiRoot = path.join(__dirname, '..');
const envPath = path.join(apiRoot, '.env');
const examplePath = path.join(apiRoot, '.env.example');

const forceSecrets = process.argv.includes('--force-secrets');

function randomHex(bytes) {
  return crypto.randomBytes(bytes).toString('hex');
}

/** Exactly 32 UTF-8 chars for ENCRYPTION_KEY (see helpers.js slice(0, 32)). */
function encryptionKey32() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 32; i += 1) {
    out += alphabet[crypto.randomInt(alphabet.length)];
  }
  return out;
}

function isPlaceholderJwtAccess(v) {
  const s = String(v || '').trim();
  return !s || s === 'your_very_secure_long_random_string_here' || s.length < 48;
}

function isPlaceholderJwtRefresh(v) {
  const s = String(v || '').trim();
  return !s || s === 'another_secure_long_random_string_for_refresh' || s.length < 48;
}

function isPlaceholderEncryptionKey(v) {
  const s = String(v || '').trim();
  return !s || s === 'your-32-char-encryption-key-here!!';
}

function buildDatabaseUrls() {
  const user = process.env.POSTGRES_USER || 'postgres';
  const pass = process.env.POSTGRES_PASSWORD != null ? process.env.POSTGRES_PASSWORD : 'postgres';
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = process.env.POSTGRES_PORT || '5432';
  const db = process.env.POSTGRES_DB || 'cosmos_erp';
  const shadowDb = process.env.POSTGRES_SHADOW_DB || 'cosmos_db_shadow';
  const encPass = encodeURIComponent(pass);
  return {
    databaseUrl:
      process.env.INIT_DATABASE_URL ||
      `postgresql://${user}:${encPass}@${host}:${port}/${db}?schema=public`,
    shadowUrl:
      process.env.INIT_SHADOW_DATABASE_URL ||
      `postgresql://${user}:${encPass}@${host}:${port}/${shadowDb}?schema=public`,
  };
}

function setEnvLine(content, key, newValue) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const line = `${key}=${newValue}`;
  const re = new RegExp(`^${escapedKey}=.*$`, 'm');
  if (re.test(content)) {
    return content.replace(re, line);
  }
  return `${content.trimEnd()}\n${line}\n`;
}

function getEnvValue(content, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = content.match(new RegExp(`^${escapedKey}=(.*)$`, 'm'));
  return m ? m[1].trim() : '';
}

let content;
if (fs.existsSync(envPath)) {
  content = fs.readFileSync(envPath, 'utf8');
} else if (fs.existsSync(examplePath)) {
  content = fs.readFileSync(examplePath, 'utf8');
  console.log('Created .env from .env.example — customize SMTP and third-party keys as needed.');
} else {
  console.error('Missing .env and .env.example under apps/api');
  process.exit(1);
}

const pgPass = process.env.POSTGRES_PASSWORD != null ? process.env.POSTGRES_PASSWORD : 'postgres';
content = content.replace(/YOUR_POSTGRES_PASSWORD/g, encodeURIComponent(pgPass));

const rewriteDbUrls =
  process.env.INIT_DATABASE_URL ||
  process.argv.includes('--rewrite-db-urls');
if (rewriteDbUrls) {
  const { databaseUrl, shadowUrl } = buildDatabaseUrls();
  content = setEnvLine(content, 'DATABASE_URL', databaseUrl);
  content = setEnvLine(content, 'SHADOW_DATABASE_URL', shadowUrl);
}

const jwtNow = getEnvValue(content, 'JWT_SECRET');
const jwtRefNow = getEnvValue(content, 'JWT_REFRESH_SECRET');
const encNow = getEnvValue(content, 'ENCRYPTION_KEY');

if (forceSecrets || isPlaceholderJwtAccess(jwtNow)) {
  content = setEnvLine(content, 'JWT_SECRET', randomHex(32));
}
if (forceSecrets || isPlaceholderJwtRefresh(jwtRefNow)) {
  content = setEnvLine(content, 'JWT_REFRESH_SECRET', randomHex(32));
}
if (forceSecrets || isPlaceholderEncryptionKey(encNow)) {
  content = setEnvLine(content, 'ENCRYPTION_KEY', encryptionKey32());
}

fs.writeFileSync(envPath, content, 'utf8');
console.log(`Wrote ${path.relative(process.cwd(), envPath) || '.env'}`);
console.log(
  'Next: ensure PostgreSQL has the database and user (default: postgres/postgres, DB cosmos_erp + cosmos_db_shadow), then run: npx prisma migrate deploy && npm run db:seed',
);