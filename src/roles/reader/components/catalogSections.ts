import type { PublicSeriesDto } from '@/services/catalog.service';

export type RankingPeriod = 'day' | 'week' | 'month';

/** Truyện có chương mới trong 48 giờ gần nhất được gắn nhãn "Mới". */
export const RECENT_UPDATE_HOURS = 48;

const DAY_MS = 24 * 60 * 60 * 1000;

export function isRecentlyUpdated(series: PublicSeriesDto, now: Date = new Date()): boolean {
  if (!series.latestPublishedAt) return false;
  const diff = now.getTime() - new Date(series.latestPublishedAt).getTime();
  return diff >= 0 && diff <= RECENT_UPDATE_HOURS * 60 * 60 * 1000;
}

export function sortByLatestUpdate(list: PublicSeriesDto[]): PublicSeriesDto[] {
  const time = (s: PublicSeriesDto) => (s.latestPublishedAt ? Date.parse(s.latestPublishedAt) : 0);
  return [...list].sort((a, b) => time(b) - time(a));
}

export function viewsInPeriod(series: PublicSeriesDto, period: RankingPeriod): number {
  if (period === 'day') return series.viewsLast1Day ?? 0;
  if (period === 'week') return series.viewsLast7Days ?? 0;
  return series.viewsLast30Days ?? 0;
}

/** Xếp hạng theo lượt đọc thật trong kỳ; hòa thì truyện cập nhật gần hơn đứng trước. */
export function rankByViews(list: PublicSeriesDto[], period: RankingPeriod): PublicSeriesDto[] {
  const latest = (s: PublicSeriesDto) =>
    s.latestPublishedAt ? Date.parse(s.latestPublishedAt) : 0;
  return [...list].sort(
    (a, b) => viewsInPeriod(b, period) - viewsInPeriod(a, period) || latest(b) - latest(a),
  );
}

export interface DayGroup {
  /** Số ngày trước hôm nay (0 = hôm nay, 1 = hôm qua). */
  daysAgo: number;
  date: Date;
  items: PublicSeriesDto[];
}

/** Nhóm truyện theo ngày ra chương mới nhất (giờ địa phương), ngày gần nhất trước. */
export function groupByUpdateDay(list: PublicSeriesDto[], now: Date = new Date()): DayGroup[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const groups = new Map<number, DayGroup>();
  for (const series of sortByLatestUpdate(list)) {
    if (!series.latestPublishedAt) continue;
    const published = new Date(series.latestPublishedAt);
    const startOfDay = new Date(
      published.getFullYear(),
      published.getMonth(),
      published.getDate(),
    ).getTime();
    const daysAgo = Math.max(0, Math.round((startOfToday - startOfDay) / DAY_MS));
    const group = groups.get(daysAgo) ?? { daysAgo, date: new Date(startOfDay), items: [] };
    group.items.push(series);
    groups.set(daysAgo, group);
  }
  return [...groups.values()].sort((a, b) => a.daysAgo - b.daysAgo);
}

export interface StudioGroup {
  studioName: string;
  items: PublicSeriesDto[];
}

/** Nhóm truyện theo Studio; Studio có nhiều truyện hơn đứng trước, trong Studio xếp theo chương mới nhất. */
export function groupByStudio(list: PublicSeriesDto[]): StudioGroup[] {
  const groups = new Map<string, PublicSeriesDto[]>();
  for (const series of sortByLatestUpdate(list)) {
    const key = series.studioName?.trim() || '';
    groups.set(key, [...(groups.get(key) ?? []), series]);
  }
  return [...groups.entries()]
    .map(([studioName, items]) => ({ studioName, items }))
    .sort((a, b) => b.items.length - a.items.length || a.studioName.localeCompare(b.studioName));
}

/** Truyện nổi bật: nhiều lượt đọc nhất 7 ngày; chưa có lượt đọc thì lấy truyện vừa cập nhật. */
export function pickFeatured(list: PublicSeriesDto[]): PublicSeriesDto | null {
  if (list.length === 0) return null;
  const top = rankByViews(list, 'week')[0];
  return viewsInPeriod(top, 'week') > 0 ? top : sortByLatestUpdate(list)[0];
}

export function distinctGenres(list: PublicSeriesDto[]): string[] {
  return [...new Set(list.map((s) => s.genre?.trim()).filter((g): g is string => !!g))].sort(
    (a, b) => a.localeCompare(b),
  );
}
