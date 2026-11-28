import { describe, expect, it } from 'vitest';
import { formatQuotaValue, fromQuotaInput, toQuotaInput } from './quotaUnits';

const GB = 1024 * 1024 * 1024;

describe('quotaUnits (OPS-21, OPS-23)', () => {
  it('converts storage between GB input and bytes', () => {
    expect(fromQuotaInput('Storage', '2.5')).toBe(Math.round(2.5 * GB));
    expect(toQuotaInput('Storage', 5 * GB)).toBe('5');
  });

  it('keeps token and image counts as integers', () => {
    expect(fromQuotaInput('AiTokens', '1500000')).toBe(1_500_000);
    expect(toQuotaInput('AiImages', 120)).toBe('120');
  });

  it('rejects empty, negative and non-numeric input', () => {
    expect(fromQuotaInput('Storage', '')).toBeNull();
    expect(fromQuotaInput('AiTokens', '-1')).toBeNull();
    expect(fromQuotaInput('AiImages', 'abc')).toBeNull();
  });

  it('accepts 0 so callers can decide whether unlimited is allowed', () => {
    expect(fromQuotaInput('Storage', '0')).toBe(0);
  });

  it('formats storage in GB', () => {
    expect(formatQuotaValue('Storage', 20 * GB, 'en-US')).toBe('20 GB');
  });
});
