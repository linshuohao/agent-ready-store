import { z } from 'zod';
export const cartIdInput = z.uuid();
export const cartTokenInput = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const cartItemInput = z
  .object({
    productId: z.string().min(1).max(64),
    quantity: z.number().int().positive().max(2147483647),
  })
  .strict();
export const cartItemsInput = z
  .array(cartItemInput)
  .max(100)
  .refine(
    (items) =>
      new Set(items.map((item) => item.productId)).size === items.length,
    { message: 'Duplicate product IDs' },
  );
export const cartOperationInput = z.discriminatedUnion('type', [
  cartItemInput.extend({ type: z.literal('add_item') }).strict(),
  cartItemInput.extend({ type: z.literal('set_quantity') }).strict(),
  z
    .object({
      type: z.literal('remove_item'),
      productId: cartItemInput.shape.productId,
    })
    .strict(),
]);
