# Cosmos ERP — Features Roadmap (Platform Email, Verification, Support, MFA, Wallet)

**Platform contact email:** `hello@cosmoserp.afrinict.com`

---

## 1. Platform email

- Use `hello@cosmoserp.afrinict.com` as the default "from" and support contact in:
  - `EMAIL_FROM` / `MAIL_FROM` in `.env`
  - Email service default
  - Footer / contact links in frontends

---

## 2. Email confirmation for every new account

- **Scope:** Marketplace customers, ERP users (tenant), Admin users (optional).
- **Schema:** Add to `MarketplaceCustomer`, `User`, and optionally `AdminUser`:
  - `emailVerified: Boolean @default(false)`
  - `emailVerificationToken: String?`
  - `emailVerificationTokenExpiresAt: DateTime?`
- **Flow:**
  - On register: create account with `emailVerified: false`, generate token (e.g. crypto.randomBytes(32)), set expiry (e.g. 24h), send email with link `{API}/api/marketplace/verify-email?token=...`.
  - Verify endpoint: validate token, set `emailVerified: true`, clear token.
  - Login: allow login but optionally restrict sensitive actions until verified; or block login until verified (configurable).
- **Email template:** “Confirm your email – Cosmos ERP” with link and platform email as sender.

---

## 3. Live support chat (customer profile portal)

- **Place:** Marketplace customer account area (e.g. “Support” or “Live chat” in profile).
- **Behaviour:**
  - Customer starts a conversation → creates a platform-level support ticket with channel `CHAT`.
  - Customer and back-office agents exchange messages (stored as ticket comments or chat messages).
  - UI: list of “my chats” (tickets) and a thread view with messages; optional polling or WebSocket for live updates.
- **Backend:** Reuse or extend platform support tickets and comments (see §4).

---

## 4. Back Office Support Agents Portal + ticketing

- **Purpose:** Central place for support agents (e.g. AdminUser with role SUPPORT) to handle all support across the project (marketplace, ERP tenants, platform).
- **Schema:**
  - **PlatformSupportTicket:** id, customerEmail, marketplaceCustomerId?, tenantId? (optional), subject, description, channel (EMAIL, CHAT, PHONE, etc.), priority, status, assignedToAdminId?, createdAt, etc.
  - **PlatformTicketComment:** id, ticketId, authorType (CUSTOMER | AGENT), authorId? (AdminUser for agent), body, createdAt.
- **Portal (admin app):**
  - Support dashboard: list all platform tickets, filter by status/priority/date, assign to self.
  - Ticket detail: view thread, add reply, change status (open, in progress, resolved, closed).
- **APIs:**
  - For agents: list tickets, get ticket, add comment, update status/assignment.
  - For customers: create ticket (e.g. from chat), list my tickets, get ticket, add message (comment).

---

## 5. MFA for every login

- **Scope:** ERP (User), Admin (AdminUser), Marketplace (MarketplaceCustomer).
- **Schema:** Add to each auth model:
  - `mfaEnabled: Boolean @default(false)`
  - `mfaSecret: String?` (encrypted or hashed TOTP secret)
  - `mfaBackupCodes: String?` (hashed backup codes, JSON array or single hash).
- **Flow:**
  - **Setup:** User enables MFA in settings → backend generates TOTP secret, returns QR/data URL → user scans with app → user submits first TOTP code → backend verifies and sets `mfaEnabled`, stores secret and backup codes.
  - **Login:** After password success, if `mfaEnabled` then require TOTP (or backup code); then issue session/JWT.
- **Tech:** Use `speakeasy` (or similar) for TOTP, `qrcode` for QR. Backup codes: 8–10 one-time codes generated at setup.

---

## 6. Fund Wallet + Escrow (customer profile)

- **Wallet:** Each marketplace customer has a wallet (balance). Actions: deposit (e.g. Paystack), withdraw (to bank), pay with wallet at checkout.
- **Schema:**
  - **CustomerWallet:** id, marketplaceCustomerId, balance (Decimal), currency, updatedAt.
  - **WalletTransaction:** id, walletId, type (DEPOSIT, WITHDRAWAL, PAYMENT, REFUND, ESCROW_HOLD, ESCROW_RELEASE), amount, reference (orderId, escrowId, etc.), status, createdAt.
  - **Escrow:** id, orderId (or reference), buyerId, sellerTenantId?, amount, status (HELD, RELEASED_TO_SELLER, REFUNDED_TO_BUYER), releasedAt?, createdAt.
- **Checkout:** Option to pay with wallet; if partial, remainder via Paystack. On “pay with wallet”: debit wallet, create escrow or link to order. On order completion: release escrow to seller (and platform fee). On refund: release back to buyer wallet.
- **Customer profile:** “My Wallet” page: balance, history (deposits, payments, refunds), deposit (redirect to Paystack), withdraw (request to bank).

---

## Implementation order

| Phase | Item | Status |
|-------|------|--------|
| 1 | Platform email + email verification (marketplace first) | Done |
| 2 | Platform support tickets + Back Office Support Portal (APIs + admin UI) | Done |
| 3 | Live chat in customer profile (create ticket from chat, list threads, messages) | Done |
| 4 | MFA (schema ready; TOTP setup + login step for ERP, Admin, Marketplace) | Pending |
| 5 | Customer Wallet + Escrow (schema + wallet API + My Wallet page; deposit/escrow at checkout) | Schema + API + UI done; deposit/escrow flow pending |
