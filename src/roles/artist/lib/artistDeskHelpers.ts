import type { PageDto } from '@/services/page.service';
import type { BibleEntryDto } from '@/services/bible.service';
import type { PipelineStageDto } from '@/services/pipeline.service';
import type { FocusStageItem } from '@/app/FocusWorkspaceLayout';
import { stageKindOf } from '@/shared/features/pipeline-board/productionBoard.utils';
import { getArtistStageKind } from '../utils/artistStage';
import type { PageStage } from '../components/desk/ArtistPageSidebar';

const CHARACTER_COLORS = [
  '#F97316',
  '#06B6D4',
  '#8B5CF6',
  '#10B981',
  '#E11D48',
  '#D97706',
  '#2563EB',
];

export const DEFAULT_ARTIST_STAGES: FocusStageItem[] = [
  { id: 'stage-pencil', label: 'Pencil', key: 'pencil' },
  { id: 'stage-ink', label: 'Ink', key: 'ink' },
  { id: 'stage-letter', label: 'Letter', key: 'lettering' },
];

// Placeholder sheets shown before a chapter's real pages load (B5 at 600 dpi).
export const DEFAULT_INITIAL_PAGES: PageDto[] = Array.from({ length: 6 }, (_, i) => ({
  id: `page-default-${i + 1}`,
  chapterId: 'chap-1',
  pageNumber: i + 1,
  layoutFormat: 'B5',
  widthPx: 1200,
  heightPx: 1800,
  dpi: 600,
  elementsCount: 0,
}));

export function localizeArtistStageLabel(stage: Pick<PipelineStageDto, 'name' | 'slug'>): string {
  const kind = getArtistStageKind(stage);
  if (kind === 'pencil') return 'Pencil';
  if (kind === 'ink') return 'Ink';
  if (kind === 'lettering') return 'Letter';

  const lower = `${stage.slug || ''} ${stage.name || ''}`.toLowerCase();
  if (lower.includes('letter') || lower.includes('dialogue') || lower.includes('thoại'))
    return 'Letter';
  if (lower.includes('ink') || lower.includes('mực') || lower.includes('nét')) return 'Ink';
  if (['pencil', 'chì', 'layout', 'bố cục', 'thumbnail'].some((k) => lower.includes(k)))
    return 'Pencil';

  const boardKind = stageKindOf(stage.name || '');
  if (boardKind === 'letter') return 'Letter';
  if (boardKind === 'ink') return 'Ink';
  if (boardKind === 'pencil' || boardKind === 'thumbnail') return 'Pencil';

  const cleaned = (stage.name || '').replace(/\s*\([A-Za-z0-9\s/-]+\)\s*/g, '').trim();
  return cleaned || 'Pencil';
}

export function resolveStageKey(stage: Pick<PipelineStageDto, 'name' | 'slug'>): PageStage {
  const kind = getArtistStageKind(stage);
  if (kind === 'ink') return 'ink';
  if (kind === 'lettering') return 'lettering';
  const boardKind = stageKindOf(stage.name || '');
  if (boardKind === 'letter') return 'lettering';
  if (boardKind === 'color') return 'completed';
  return 'pencil';
}

export function getDeterministicColor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return CHARACTER_COLORS[Math.abs(hash) % CHARACTER_COLORS.length];
}

// Backend serialises BibleCategory either as its name or its numeric enum value.
export function mapBibleCategory(cat: string | number): 'character' | 'location' | 'lore' {
  if (typeof cat === 'string') {
    const s = cat.toLowerCase();
    if (s.includes('char')) return 'character';
    if (s.includes('loc')) return 'location';
    return 'lore';
  }
  if (cat === 0 || cat === 1) return 'character';
  if (cat === 2) return 'location';
  return 'lore';
}

export function getBibleCategoryTag(cat: string | number, subtitle?: string | null): string {
  if (subtitle?.trim()) return subtitle.trim();
  const s = String(cat).toLowerCase();
  if (s.includes('char') || s === '0' || s === '1') return 'Nhân vật';
  if (s.includes('loc') || s === '2') return 'Bối cảnh';
  if (s.includes('style') || s === '4') return 'Quy tắc mỹ thuật';
  if (s.includes('prop') || s === '3') return 'Đạo cụ & Thuật ngữ';
  return 'Thiết lập thế giới';
}

const ATTRIBUTE_LABELS: Record<string, string> = {
  appearance: 'Ngoại hình',
  costume: 'Trang phục',
  hair: 'Kiểu tóc',
  eyes: 'Màu mắt',
  height: 'Chiều cao',
  weapon: 'Vũ khí / Đạo cụ',
  distinguishingMarks: 'Dấu ấn đặc trưng',
  personality: 'Tính cách',
  role: 'Vai trò',
  atmosphere: 'Không khí / Ánh sáng',
  architecture: 'Kiến trúc',
};

const parseJsonObject = (raw?: string | null): Record<string, any> | null => {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

export function extractBibleVisualDetails(entry: BibleEntryDto): {
  visualNotes: string[];
  gallery?: Array<{ url: string; label?: string }>;
} {
  const notes: string[] = [];
  let gallery: Array<{ url: string; label?: string }> | undefined;

  // Unlocked entries keep details on the entry; locked ones only on the effective revision snapshot.
  let details = parseJsonObject(entry.detailsJson);
  if (!details && entry.effectiveRevision?.snapshotJson) {
    const snap = parseJsonObject(entry.effectiveRevision.snapshotJson);
    details = parseJsonObject(snap?.DetailsJson || snap?.detailsJson) || snap;
  }
  if (!details) return { visualNotes: notes };

  if (Array.isArray(details.visualNotes)) {
    details.visualNotes.forEach((n: unknown) => {
      if (typeof n === 'string' && n.trim()) notes.push(n.trim());
    });
  }

  if (details.attributes && typeof details.attributes === 'object') {
    Object.entries(details.attributes).forEach(([k, v]) => {
      if (typeof v === 'string' && v.trim()) {
        notes.push(`${ATTRIBUTE_LABELS[k] || k}: ${v.trim()}`);
      } else if (Array.isArray(v)) {
        v.forEach((item) => {
          if (typeof item === 'string' && item.trim()) notes.push(item.trim());
        });
      }
    });
  }

  if (Array.isArray(details.turnaroundGallery)) {
    const mapped = details.turnaroundGallery
      .filter((g: any) => g && typeof g.url === 'string' && g.url.trim())
      .map((g: any) => ({ url: g.url, label: g.label || g.angle || undefined }));
    if (mapped.length > 0) gallery = mapped;
  }

  return { visualNotes: notes, gallery };
}
