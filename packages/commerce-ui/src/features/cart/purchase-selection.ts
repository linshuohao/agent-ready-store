export type PurchaseEntry = {
  productId: string;
  quantity: string;
  selectionRevision: string;
};
export type PurchaseSelection = Record<string, PurchaseEntry>;
/** Clear only the particular selection that this attempt consumed, never a later choice. */
export function consumeSelection(
  current: PurchaseSelection,
  submitted: PurchaseSelection,
): PurchaseSelection {
  return Object.fromEntries(
    Object.entries(current).filter(
      ([id, item]) =>
        item.selectionRevision !== submitted[id]?.selectionRevision,
    ),
  );
}
export function purchaseItems(selection: PurchaseSelection) {
  const items = Object.values(selection).map((item) => ({
    productId: item.productId,
    quantity: Number(item.quantity),
  }));
  return items.length &&
    items.every(
      (item) =>
        Number.isSafeInteger(item.quantity) &&
        item.quantity > 0 &&
        item.quantity <= 2147483647,
    )
    ? items
    : null;
}
