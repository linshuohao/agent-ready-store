CREATE TABLE "PurchaseReview" (
 "id" UUID PRIMARY KEY, "cartId" UUID NOT NULL REFERENCES "Cart"("id") ON DELETE CASCADE,
 "prepareScope" TEXT NOT NULL, "prepareRequestId" UUID NOT NULL, "requestHash" TEXT NOT NULL,
 "channel" TEXT NOT NULL CHECK ("channel" IN ('apps','webmcp')),
 "actorScope" TEXT NOT NULL, "cartVersion" INTEGER NOT NULL,
 "purchaseHash" TEXT NOT NULL, "checkoutEpoch" BIGINT NOT NULL,
 "summary" JSONB NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL,
 "expiresAt" TIMESTAMPTZ(3) NOT NULL, "cancelled" BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX "PurchaseReview_prepareScope_prepareRequestId_key" ON "PurchaseReview"("prepareScope", "prepareRequestId");
CREATE INDEX "PurchaseReview_cartId_idx" ON "PurchaseReview"("cartId");
