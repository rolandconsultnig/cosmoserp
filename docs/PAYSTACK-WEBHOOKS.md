# Paystack webhooks (CosmosERP)

Single endpoint for the Paystack dashboard:

`POST https://<API_HOST>/api/webhooks/paystack`

## Requirements

- **`PAYSTACK_SECRET_KEY`** — same secret used for API calls; HMAC is `sha512` over the **raw** JSON body (`x-paystack-signature`).
- Route is mounted **before** `express.json()` and uses `express.raw()` so signatures stay valid.
- Global API rate limiting **does not** apply to this path.

## Enable these events (Paystack Dashboard → Settings → API / Webhooks)

| Event | App behavior |
|--------|----------------|
| **charge.success** | If `data.reference` matches `MarketplaceOrder.paystackRef`, finalizes payment (idempotent; same logic as `GET /api/marketplace/orders/verify`). NGN amount in kobo is checked when present. |
| **transfer.success** | `MarketplaceSellerPayout` → `SUCCESS` (match `reference` / `transfer_code`). |
| **transfer.failed** | Payout → `FAILED` + message. |
| **transfer.reversed** | Payout → `REVERSED`. |

Other events are ignored (no error).

## Smoke test

1. Use Paystack **test** keys on staging.
2. Complete a marketplace checkout; confirm order moves to paid via **either** redirect verify **or** webhook alone.
3. Run an admin **payout**; confirm payout row updates when Paystack sends **transfer.success**.

## Ops note

Optional hardening: allow only Paystack webhook IPs at the reverse proxy (see [Paystack webhooks](https://paystack.com/docs/payments/webhooks/)); signature verification is still required.
