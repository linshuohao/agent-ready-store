-- No historical conversion or implicit cleanup. Tasks 8 performs authorized cleanup first.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM "Cart") OR EXISTS (SELECT 1 FROM "Order") OR EXISTS (SELECT 1 FROM "PurchaseReview") THEN
  RAISE EXCEPTION 'CHECKOUT_CUTOVER_REQUIRES_EMPTY_TRANSACTIONS: stop old writers and run approved cleanup first';
 END IF;
END $$;
DROP TABLE "PurchaseReview";
DROP TABLE "Order";
ALTER TABLE "Cart" DROP COLUMN "handoffIssuedAt", DROP COLUMN "checkoutEpoch", DROP COLUMN "origin", DROP COLUMN "createScope", DROP COLUMN "encryptedCartToken";
CREATE UNIQUE INDEX "Cart_createRequestId_key" ON "Cart"("createRequestId");
ALTER TABLE "Inventory" ADD COLUMN "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
 ADD CONSTRAINT "Inventory_reservation_check" CHECK ("reservedQuantity" >= 0 AND ((quantity >= 0 AND "reservedQuantity" <= quantity) OR (quantity < 0 AND "reservedQuantity" = 0)));
CREATE TYPE "OrderStatus" AS ENUM ('CHECKOUT','PAID');
CREATE TYPE "OrderCloseReason" AS ENUM ('CANCELLED','EXPIRED');
CREATE TABLE "CartOperation" (
 "cartId" UUID NOT NULL REFERENCES "Cart"(id) ON DELETE RESTRICT,
 "requestId" UUID NOT NULL, "payloadHash" TEXT NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL,
 PRIMARY KEY ("cartId","requestId")
);
CREATE TABLE "Order" (
 id UUID PRIMARY KEY, "cartId" UUID NOT NULL REFERENCES "Cart"(id) ON DELETE RESTRICT,
 "sourceCartVersion" INTEGER NOT NULL CHECK ("sourceCartVersion">0),
 "createRequestId" UUID NOT NULL, "requestHash" TEXT NOT NULL,
 status "OrderStatus" NOT NULL DEFAULT 'CHECKOUT',
 "createdAt" TIMESTAMPTZ(3) NOT NULL, "reservationExpiresAt" TIMESTAMPTZ(3) NOT NULL,
 "paidAt" TIMESTAMPTZ(3), "closedAt" TIMESTAMPTZ(3), "closeReason" "OrderCloseReason",
 "createdByChannel" TEXT NOT NULL CHECK ("createdByChannel" IN ('WEB','MCP','WEBMCP','APPS')),
 "aiEligible" BOOLEAN NOT NULL, "pricingRuleVersion" TEXT NOT NULL,
 currency TEXT NOT NULL CHECK (currency='TWD'),
 subtotal DECIMAL(20,2) NOT NULL CHECK (subtotal>=0), "thresholdDiscount" DECIMAL(20,2) NOT NULL CHECK ("thresholdDiscount">=0),
 "aiDiscount" DECIMAL(20,2) NOT NULL CHECK ("aiDiscount">=0), shipping DECIMAL(20,2) NOT NULL CHECK (shipping>=0), total DECIMAL(20,2) NOT NULL CHECK (total>=0),
 CONSTRAINT "Order_lifecycle_check" CHECK ((status='PAID')=("paidAt" IS NOT NULL) AND (status!='PAID' OR "closedAt" IS NULL) AND ("closedAt" IS NULL)=("closeReason" IS NULL)),
 CONSTRAINT "Order_amount_check" CHECK (total=subtotal-"thresholdDiscount"-"aiDiscount"+shipping),
 CONSTRAINT "Order_channel_check" CHECK ("aiEligible"=("createdByChannel"!='WEB')),
 UNIQUE("cartId","createRequestId")
);
CREATE INDEX "Order_cartId_createdAt_id_idx" ON "Order"("cartId","createdAt",id);
CREATE INDEX "Order_status_closedAt_reservationExpiresAt_idx" ON "Order"(status,"closedAt","reservationExpiresAt");
CREATE TABLE "OrderLine" (
 "orderId" UUID NOT NULL REFERENCES "Order"(id) ON DELETE RESTRICT,
 "productId" TEXT NOT NULL, name TEXT NOT NULL, brand TEXT NOT NULL, specs JSONB NOT NULL,
 quantity INTEGER NOT NULL CHECK (quantity>0), "unitPrice" DECIMAL(20,2) NOT NULL CHECK ("unitPrice">0),
 "lineSubtotal" DECIMAL(20,2) NOT NULL CHECK ("lineSubtotal"="unitPrice"*quantity),
 PRIMARY KEY("orderId","productId")
);
