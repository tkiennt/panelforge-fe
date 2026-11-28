import { describe, expect, it } from 'vitest';
import { hasAnyValue, rankWithOther } from './chartData';

const d = (key: string, value: number) => ({ key, label: key.toUpperCase(), value });

describe('rankWithOther', () => {
  it('sorts descending and keeps everything when under the limit', () => {
    expect(rankWithOther([d('a', 1), d('b', 5), d('c', 3)], 5, 'Other').map((x) => x.key)).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  it('folds the tail into a single Other bar with the summed value', () => {
    const out = rankWithOther([d('a', 10), d('b', 2), d('c', 7), d('e', 1)], 2, 'Other');
    expect(out).toEqual([d('a', 10), d('c', 7), { key: '__other__', label: 'Other', value: 3 }]);
  });

  it('does not mutate the input', () => {
    const input = [d('a', 1), d('b', 2)];
    rankWithOther(input, 1, 'Other');
    expect(input.map((x) => x.key)).toEqual(['a', 'b']);
  });
});

describe('hasAnyValue', () => {
  it('is false for empty or all-zero data', () => {
    expect(hasAnyValue([])).toBe(false);
    expect(hasAnyValue([d('a', 0)])).toBe(false);
    expect(hasAnyValue([d('a', 0), d('b', 4)])).toBe(true);
  });
});
