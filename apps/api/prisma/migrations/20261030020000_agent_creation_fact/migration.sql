-- Run before enabling mutable WebMCP source. Historical origin is immutable here.
ALTER TABLE "Cart" ADD COLUMN "agentCreated" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Cart" SET "agentCreated" = true WHERE origin = 'AGENT';
