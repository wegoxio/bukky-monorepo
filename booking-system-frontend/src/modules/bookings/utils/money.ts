export function calculateEstimatedTotal(
  unitPrice: string,
  quantity: number,
  pricingModel: 'FLAT' | 'PER_PERSON',
): string {
  const match = unitPrice.trim().match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return '0.00';
  const hundred = BigInt(100);
  const minor = BigInt(match[1]) * hundred + BigInt((match[2] ?? '').padEnd(2, '0'));
  const total = pricingModel === 'PER_PERSON' ? minor * BigInt(quantity) : minor;
  return `${total / hundred}.${(total % hundred).toString().padStart(2, '0')}`;
}
