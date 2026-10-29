CREATE TABLE "Cart" (
  "id" UUID PRIMARY KEY,
  "origin" TEXT NOT NULL DEFAULT 'HUMAN' CHECK ("origin" IN ('HUMAN', 'AGENT')),
  "items" JSONB NOT NULL CHECK (jsonb_typeof("items") = 'array'),
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "createScope" TEXT NOT NULL,
  "createRequestId" UUID NOT NULL,
  "createPayloadHash" TEXT NOT NULL,
  "encryptedCartToken" TEXT NOT NULL
);
CREATE UNIQUE INDEX "Cart_createScope_createRequestId_key" ON "Cart"("createScope", "createRequestId");
