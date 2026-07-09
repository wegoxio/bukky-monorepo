import { describe, expect, it } from 'vitest';
import { calculateEstimatedTotal } from './money';

describe('calculateEstimatedTotal', () => {
  it('keeps FLAT pricing fixed for groups', () => {
    expect(calculateEstimatedTotal('75.00', 1, 'FLAT')).toBe('75.00');
    expect(calculateEstimatedTotal('75.00', 4, 'FLAT')).toBe('75.00');
  });

  it('multiplies PER_PERSON using exact minor units', () => {
    expect(calculateEstimatedTotal('18.50', 4, 'PER_PERSON')).toBe('74.00');
    expect(calculateEstimatedTotal('0.10', 3, 'PER_PERSON')).toBe('0.30');
  });
});
