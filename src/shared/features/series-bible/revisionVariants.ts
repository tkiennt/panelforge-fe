import type { BibleEntryRevisionDto } from '@/services/bible.service';
import { translate } from '@/lib/i18n';

export interface CharacterVariant {
  variantKey: string;
  variantLabel: string;
  latestRevision: BibleEntryRevisionDto;
  revisions: BibleEntryRevisionDto[];
  isLocked: boolean;
}

export function getRevisionVariantLabel(
  rev?: { variantLabel?: string | null; stageName?: string | null } | null,
): string {
  const raw = rev?.variantLabel ?? rev?.stageName ?? '';
  return typeof raw === 'string' && raw.trim()
    ? raw.trim()
    : translate('bible.detailModal.defaultVariant');
}

export function groupRevisionsIntoVariants(
  revisions: BibleEntryRevisionDto[],
  fallbackRevision?: BibleEntryRevisionDto | null,
): CharacterVariant[] {
  const all: BibleEntryRevisionDto[] = [];
  const seenIds = new Set<string>();

  const addRev = (rev: BibleEntryRevisionDto | null | undefined) => {
    if (!rev) return;
    const label = getRevisionVariantLabel(rev);
    const normalizedRev: BibleEntryRevisionDto = { ...rev, stageName: rev.stageName ?? null };
    const idKey = normalizedRev.id
      ? String(normalizedRev.id)
      : `v${normalizedRev.versionNumber}-${label}`;
    if (!seenIds.has(idKey)) {
      seenIds.add(idKey);
      all.push(normalizedRev);
    }
  };

  if (Array.isArray(revisions)) {
    for (const r of revisions) addRev(r);
  }
  if (fallbackRevision) {
    addRev(fallbackRevision);
  }

  if (all.length === 0) {
    return [];
  }

  const groupMap = new Map<string, BibleEntryRevisionDto[]>();
  for (const rev of all) {
    const label = getRevisionVariantLabel(rev);
    const groupKey = label.toLocaleLowerCase();
    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, []);
    }
    groupMap.get(groupKey)!.push(rev);
  }

  const variants: CharacterVariant[] = [];
  const isDefaultVariantLabel = (lbl: string) => {
    const l = lbl.toLowerCase();
    return l.includes('mặc định') || l.includes('chuẩn') || l.includes('default');
  };

  const sortedGroupKeys = Array.from(groupMap.keys()).sort((a, b) => {
    const revsA = groupMap.get(a)!;
    const revsB = groupMap.get(b)!;
    const labelA = getRevisionVariantLabel(revsA[0]);
    const labelB = getRevisionVariantLabel(revsB[0]);
    if (isDefaultVariantLabel(labelA) && !isDefaultVariantLabel(labelB)) return -1;
    if (!isDefaultVariantLabel(labelA) && isDefaultVariantLabel(labelB)) return 1;

    const earliestA = Math.min(...revsA.map((r) => new Date(r.createdAt || 0).getTime()));
    const earliestB = Math.min(...revsB.map((r) => new Date(r.createdAt || 0).getTime()));
    if (earliestA !== earliestB) return earliestA - earliestB;

    const minVerA = Math.min(...revsA.map((r) => r.versionNumber || 0));
    const minVerB = Math.min(...revsB.map((r) => r.versionNumber || 0));
    if (minVerA !== minVerB) return minVerA - minVerB;

    return a.localeCompare(b);
  });

  for (const groupKey of sortedGroupKeys) {
    const revList = groupMap.get(groupKey)!;
    const sortedRevs = [...revList].sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0));
    const latest = sortedRevs[0];
    const isLocked = sortedRevs.some((r) => r.reviewStatus === 'CanonLocked');
    const latestLabel = getRevisionVariantLabel(latest);
    variants.push({
      variantKey: `variant-${groupKey.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      variantLabel: latestLabel,
      latestRevision: { ...latest, stageName: latest.stageName ?? null },
      revisions: sortedRevs,
      isLocked,
    });
  }

  return variants;
}
