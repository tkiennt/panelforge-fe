import { describe, expect, it } from 'vitest';
import { calculateRpm } from './rpm';

describe('calculateRpm', () => {
  it('returns 0 when views is 0 to avoid division by zero', () => {
    expect(calculateRpm(100000, 0)).toBe(0);
  });

  it('returns 0 when views is negative or invalid', () => {
    expect(calculateRpm(50000, -1)).toBe(0);
    expect(calculateRpm(50000, -100)).toBe(0);
    expect(calculateRpm(50000, Number.NaN)).toBe(0);
    expect(calculateRpm(50000, Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('returns 0 when revenue is 0 or negative', () => {
    expect(calculateRpm(0, 1000)).toBe(0);
    expect(calculateRpm(-5000, 1000)).toBe(0);
    expect(calculateRpm(Number.NaN, 1000)).toBe(0);
  });

  it('correctly calculates rounded RPM when views and revenue are positive', () => {
    // 50,000 VND / 1,000 views * 1,000 = 50,000 VND RPM
    expect(calculateRpm(50000, 1000)).toBe(50000);

    // 25,000 VND / 500 views * 1,000 = 50,000 VND RPM
    expect(calculateRpm(25000, 500)).toBe(50000);

    // 10 VND / 3 views * 1,000 = 3333.33... -> rounded to 3333
    expect(calculateRpm(10, 3)).toBe(3333);

    // 100 VND / 6 views * 1,000 = 16666.66... -> rounded to 16667
    expect(calculateRpm(100, 6)).toBe(16667);
  });
});
