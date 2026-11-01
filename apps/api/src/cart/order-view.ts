import { orderViewOutput, type OrderView } from '@store/contracts';
import type { Prisma } from '../infrastructure/database/generated/prisma/client.js';
type SavedOrder = Prisma.OrderGetPayload<{ include: { lines: true } }>;

// Project the immutable order snapshot without reading current prices or stock.
export function orderView(row: SavedOrder, now: Date): OrderView {
  const effectiveStatus =
    row.status === 'PAID'
      ? 'PAID'
      : (row.closeReason ??
        (row.reservationExpiresAt <= now ? 'EXPIRED' : 'CHECKOUT'));
  const orderUrl = new URL(
    `/orders/${row.id}`,
    process.env.WEB_ORIGIN ?? 'http://localhost:3000',
  ).href;
  return orderViewOutput.parse({
    orderId: row.id,
    cartId: row.cartId,
    sourceCartVersion: row.sourceCartVersion,
    status: row.status,
    effectiveStatus,
    createdAt: row.createdAt.toISOString(),
    reservationExpiresAt: row.reservationExpiresAt.toISOString(),
    paidAt: row.paidAt?.toISOString() ?? null,
    closedAt: row.closedAt?.toISOString() ?? null,
    closeReason: row.closeReason,
    createdByChannel: row.createdByChannel,
    aiEligible: row.aiEligible,
    summary: {
      currency: row.currency,
      pricingRuleVersion: row.pricingRuleVersion,
      items: row.lines.map((l) => ({
        productId: l.productId,
        name: l.name,
        brand: l.brand,
        specs: l.specs,
        quantity: l.quantity,
        unitPrice: l.unitPrice.toFixed(2),
        lineSubtotal: l.lineSubtotal.toFixed(2),
      })),
      subtotal: row.subtotal.toFixed(2),
      thresholdDiscount: row.thresholdDiscount.toFixed(2),
      aiDiscount: row.aiDiscount.toFixed(2),
      shipping: row.shipping.toFixed(2),
      total: row.total.toFixed(2),
    },
    allowedActions: {
      canPay: effectiveStatus === 'CHECKOUT',
      canCancel: effectiveStatus === 'CHECKOUT',
    },
    navigation: { orderUrl, shareUrl: orderUrl + '?view=share' },
  });
}
