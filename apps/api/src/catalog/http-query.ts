export function decodeQuery(query: Record<string, unknown>) {
  const decoded = { ...query };
  for (const key of ['offset', 'limit', 'minPrice', 'maxPrice']) {
    const value = decoded[key];
    if (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value))
      decoded[key] = Number(value);
  }
  if (decoded.purchasableOnly === 'true') decoded.purchasableOnly = true;
  if (decoded.purchasableOnly === 'false') decoded.purchasableOnly = false;
  return decoded;
}
