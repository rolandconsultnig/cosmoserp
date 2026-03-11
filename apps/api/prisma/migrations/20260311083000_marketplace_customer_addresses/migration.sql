-- MarketplaceCustomerAddress: saved shipping addresses for marketplace customers

CREATE TABLE IF NOT EXISTS "MarketplaceCustomerAddress" (
    "id"         TEXT         NOT NULL,
    "customerId" TEXT         NOT NULL,
    "label"      TEXT         NOT NULL DEFAULT 'Address',
    "name"       TEXT         NOT NULL,
    "phone"      TEXT,
    "address"    TEXT         NOT NULL,
    "city"       TEXT,
    "state"      TEXT,
    "isDefault"  BOOLEAN      NOT NULL DEFAULT false,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceCustomerAddress_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MarketplaceCustomerAddress_customerId_idx"
  ON "MarketplaceCustomerAddress"("customerId");

DO $$ BEGIN
  ALTER TABLE "MarketplaceCustomerAddress"
    ADD CONSTRAINT "MarketplaceCustomerAddress_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "MarketplaceCustomer"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

