-- Optional avatar URL for marketplace customers

ALTER TABLE "MarketplaceCustomer"
ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

