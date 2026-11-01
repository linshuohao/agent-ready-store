export const formatMoney = (amount: string) => {
  const [whole, fraction] = amount.split('.');
  return `NT$ ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction}`;
};

// Validated snapshot values only; discounts and payable totals come from the server.
export function multiplyMoney(amount: string, quantity: number): string {
  const cents = BigInt(amount.replace('.', '')) * BigInt(quantity);
  return `${cents / BigInt(100)}.${String(cents % BigInt(100)).padStart(2, '0')}`;
}
