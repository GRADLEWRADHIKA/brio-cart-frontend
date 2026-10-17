import { describe, expect, it } from 'vitest';
import { discountPercent, nowInIST, timeToCutoff } from '@/utils';
import { safeNext } from '@/pages/LoginPage';

describe('utils', () => {
  it('computes time left before the midnight IST ordering cutoff', () => {
    // 20:30 IST = 15:00 UTC
    expect(timeToCutoff(new Date('2026-10-14T15:00:00Z'))).toEqual({ hours: 3, minutes: 30 });
    expect(nowInIST(new Date('2026-10-14T18:29:00Z')).getHours()).toBe(23);
  });

  it('rounds discount percentages and ignores missing old prices', () => {
    expect(discountPercent(24900, 34900)).toBe(29);
    expect(discountPercent(100, null)).toBe(0);
    expect(discountPercent(100, 90)).toBe(0);
  });

  it('only allows same-app relative redirects after login', () => {
    expect(safeNext('/checkout')).toBe('/checkout');
    expect(safeNext('//evil.example')).toBe('/account');
    expect(safeNext('https://evil.example')).toBe('/account');
    expect(safeNext(null)).toBe('/account');
  });
});
