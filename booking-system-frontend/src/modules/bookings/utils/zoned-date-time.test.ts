import { describe, expect, it } from 'vitest';
import { buildZonedDateTimeToIso } from './zoned-date-time';

describe('buildZonedDateTimeToIso', () => {
  it('uses the employee timezone instead of the browser timezone', () => {
    expect(buildZonedDateTimeToIso('2026-06-21', '10:00', 'America/Caracas')).toBe(
      '2026-06-21T14:00:00.000Z',
    );
    expect(buildZonedDateTimeToIso('2026-06-21', '10:00', 'Europe/Paris')).toBe(
      '2026-06-21T08:00:00.000Z',
    );
  });

  it('rejects malformed local values', () => {
    expect(buildZonedDateTimeToIso('invalid', '10:00', 'UTC')).toBeNull();
  });
});
