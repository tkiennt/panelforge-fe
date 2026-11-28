import { describe, expect, it } from 'vitest';
import type { PublicSeriesDto } from '@/services/catalog.service';
import {
  distinctGenres,
  groupByStudio,
  groupByUpdateDay,
  isRecentlyUpdated,
  pickFeatured,
  rankByViews,
} from './catalogSections';

const now = new Date(2026, 10, 28, 12, 0, 0);

const series = (id: string, overrides: Partial<PublicSeriesDto> = {}): PublicSeriesDto => ({
  id,
  title: id,
  genre: 'Fantasy',
  format: 'Manga',
  readingDirection: 'RightToLeft',
  studioName: 'Studio A',
  publishedChapterCount: 1,
  latestPublishedAt: new Date(2026, 10, 28, 9).toISOString(),
  ...overrides,
});

describe('catalogSections', () => {
  it('marks a series as new only within 48 hours', () => {
    expect(isRecentlyUpdated(series('a'), now)).toBe(true);
    expect(
      isRecentlyUpdated(
        series('b', { latestPublishedAt: new Date(2026, 10, 25).toISOString() }),
        now,
      ),
    ).toBe(false);
    expect(isRecentlyUpdated(series('c', { latestPublishedAt: null }), now)).toBe(false);
  });

  it('groups updates by local day, newest day first', () => {
    const groups = groupByUpdateDay(
      [
        series('yesterday', { latestPublishedAt: new Date(2026, 10, 27, 23).toISOString() }),
        series('today'),
        series('old', { latestPublishedAt: new Date(2026, 10, 20, 8).toISOString() }),
      ],
      now,
    );
    expect(groups.map((g) => [g.daysAgo, g.items.map((s) => s.id)])).toEqual([
      [0, ['today']],
      [1, ['yesterday']],
      [8, ['old']],
    ]);
  });

  it('ranks by views of the chosen period', () => {
    const list = [
      series('a', { viewsLast1Day: 5, viewsLast7Days: 10 }),
      series('b', { viewsLast1Day: 1, viewsLast7Days: 40 }),
    ];
    expect(rankByViews(list, 'day').map((s) => s.id)).toEqual(['a', 'b']);
    expect(rankByViews(list, 'week').map((s) => s.id)).toEqual(['b', 'a']);
  });

  it('features the most read series of the week, else the latest update', () => {
    const latest = series('latest');
    const older = series('older', { latestPublishedAt: new Date(2026, 10, 1).toISOString() });
    expect(pickFeatured([older, latest])?.id).toBe('latest');
    expect(pickFeatured([latest, { ...older, viewsLast7Days: 3 }])?.id).toBe('older');
    expect(pickFeatured([])).toBeNull();
  });

  it('groups by studio with the largest studio first', () => {
    const groups = groupByStudio([
      series('a', { studioName: 'Beta' }),
      series('b', { studioName: 'Alpha' }),
      series('c', { studioName: 'Beta' }),
    ]);
    expect(groups.map((g) => [g.studioName, g.items.length])).toEqual([
      ['Beta', 2],
      ['Alpha', 1],
    ]);
  });

  it('lists distinct genres alphabetically', () => {
    expect(
      distinctGenres([
        series('a', { genre: 'Horror' }),
        series('b'),
        series('c', { genre: 'Horror' }),
      ]),
    ).toEqual(['Fantasy', 'Horror']);
  });
});
