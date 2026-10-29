import { Decimal } from 'decimal.js';
import { createHash } from 'node:crypto';
import type { CartOrigin, PriceLine, Quote } from '@store/contracts';
import { AppError } from '../shared/app-error.js';

const Money = Decimal.clone({ precision: 50, rounding: Decimal.ROUND_HALF_UP });
const maximum = new Money('999999999999999999.99');
export function priceCart(
  lines: PriceLine[],
  origin: CartOrigin,
): { quote: Quote | null; quoteHash: string | null } {
  if (!lines.length) return { quote: null, quoteHash: null };
  const items = [...lines]
    .sort((a, b) =>
      a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0,
    )
    .map((item) => ({
      ...item,
      lineSubtotal: new Money(item.unitPrice).mul(item.quantity).toFixed(2),
    }));
  const subtotal = items.reduce(
    (sum, item) => sum.add(item.lineSubtotal),
    new Money(0),
  );
  const discount = subtotal.gte(1000) ? new Money(100) : new Money(0);
  const afterDiscount = subtotal.sub(discount);
  const merchandise = (
    origin === 'AGENT' ? afterDiscount.mul('0.95') : afterDiscount
  ).toDecimalPlaces(2);
  const shipping = subtotal.gte(990) ? new Money(0) : new Money(100);
  const total = merchandise.add(shipping);
  if (subtotal.gt(maximum) || total.gt(maximum))
    throw new AppError('AMOUNT_OUT_OF_RANGE', 400);
  const quote: Quote = {
    currency: 'TWD',
    items,
    subtotal: subtotal.toFixed(2),
    thresholdDiscount: discount.toFixed(2),
    aiDiscount: afterDiscount.sub(merchandise).toFixed(2),
    shipping: shipping.toFixed(2),
    total: total.toFixed(2),
  };
  const quoteHash = createHash('sha256')
    .update(JSON.stringify({ origin, quote }))
    .digest('hex');
  return { quote, quoteHash };
}
