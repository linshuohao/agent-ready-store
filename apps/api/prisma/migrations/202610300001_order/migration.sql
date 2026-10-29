ALTER TABLE "Cart" ADD COLUMN "checkoutEpoch" BIGINT NOT NULL DEFAULT 0;
CREATE TABLE "Order" (
 "id" UUID PRIMARY KEY,
 "cartId" UUID NOT NULL UNIQUE REFERENCES "Cart"("id") ON DELETE RESTRICT,
 "createdAt" TIMESTAMPTZ(3) NOT NULL,
 "cartVersion" INTEGER NOT NULL,
 "purchaseHash" TEXT NOT NULL,
 "catalogRevision" TEXT NOT NULL,
 "pricingRuleVersion" TEXT NOT NULL,
 "origin" TEXT NOT NULL,
 "snapshot" JSONB NOT NULL
);
