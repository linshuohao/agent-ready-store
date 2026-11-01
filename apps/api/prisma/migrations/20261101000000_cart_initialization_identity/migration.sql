-- Legacy initialization facts remain queryable; new carts are created only by add.
ALTER TABLE "Cart" ADD COLUMN "initializationId" UUID;
ALTER TABLE "Cart" ALTER COLUMN "createRequestId" DROP NOT NULL;
ALTER TABLE "Cart" ALTER COLUMN "createPayloadHash" DROP NOT NULL;
CREATE UNIQUE INDEX "Cart_initializationId_key" ON "Cart"("initializationId");
