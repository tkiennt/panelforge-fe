import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssetReferenceDto, AssignmentDto, PanelDto, SubmissionDto } from '@/types';
import { assignmentService } from '@/services/assignment.service';
import { artworkService, resolveArtworkUrl } from '@/services/artwork.service';
import { panelService } from '@/services/panel.service';
import { elementService } from '@/services/element.service';
import { resolvePageId } from '@/shared/features/collaboration/collaborationRules';
import { loadPreviousStageArtworks } from '@/shared/utils/stageArtworks';
import { buildPageComposite, type CompositePanel } from '@/shared/utils/compositePageRenderer';
import { needsArtworkLink, parseLinkExpiry } from '@/shared/utils/artworkLinks';

export interface OrphanSubmission {
  subId: string;
  attempt: number;
  arts: AssetReferenceDto[];
}

const isPending = (s: SubmissionDto) => s.status === 'Pending' || s.status === 0;
const isDecided = (s: SubmissionDto) =>
  s.status === 'Approved' || s.status === 'Rejected' || s.status === 1 || s.status === 2;

/** Ảnh ghép giả lập một AssetReference để màn duyệt xử lý như mọi phiên bản khác. */
const compositeRef = (
  chapterId: string,
  submission: SubmissionDto,
  pageId: string,
  stageId: string,
  fileName: string,
): AssetReferenceDto => ({
  id: `composite-sub-${submission.id}`,
  assetId: `composite-asset-${submission.id}`,
  chapterId,
  pageId,
  pipelineStageId: stageId,
  versionNumber: submission.attemptNumber,
  fileName,
  contentType: 'image/png',
  sizeBytes: 0,
  sha256: '',
  reused: false,
  uploadedByUserId: submission.submittedByUserId || '',
  createdAt: submission.submittedAt || new Date().toISOString(),
});

/**
 * Các phiên bản ảnh của một việc Page/Panel để Editor duyệt (CF3 bước 2).
 * - Lần nộp chỉ có ảnh Panel: ghép theo bố cục chụp lúc nộp của chính lần nộp đó (BR-01).
 * - Việc Letter không nộp ảnh: ảnh công đoạn trước + lớp chữ dựng lại đúng version canvas lúc nộp.
 * - Bản đang duyệt = ảnh của lần nộp Pending mới nhất; bản so sánh = lần nộp đã quyết gần nhất.
 * Link ảnh chỉ sống ngắn (BR-16) nên được xin lại trước khi hết hạn.
 */
export function useSubmissionArtworks(
  chapterId: string,
  assignment: AssignmentDto | null,
  submissions: SubmissionDto[],
) {
  const [artworks, setArtworks] = useState<AssetReferenceDto[]>([]);
  const [panels, setPanels] = useState<PanelDto[]>([]);
  const [pageId, setPageId] = useState<string | null>(null);
  const [orphans, setOrphans] = useState<OrphanSubmission[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [previousId, setPreviousId] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const linkExpiry = useRef<Record<string, number>>({});
  const linkInFlight = useRef<Set<string>>(new Set());
  const [linkTick, setLinkTick] = useState(0);

  const accessUrl = useCallback(
    async (assetReferenceId: string) =>
      resolveArtworkUrl(
        (await artworkService.getArtworkAccessLink(chapterId, assetReferenceId)).url,
      ),
    [chapterId],
  );

  useEffect(() => {
    if (!assignment) return;
    let alive = true;
    const a = assignment;

    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const progress =
          String(a.entityType) === 'Panel'
            ? await assignmentService.getStageProgress(chapterId)
            : [];
        const pid = resolvePageId(a, progress);
        const [arts, pagePanels] = await Promise.all([
          pid ? artworkService.getArtworks(chapterId, pid, a.pipelineStageId) : [],
          pid ? panelService.getPanelsByPage(pid).catch(() => [] as PanelDto[]) : [],
        ]);
        const sorted = [...submissions].sort((x, y) => x.attemptNumber - y.attemptNumber);
        const pageArts = arts.filter((x) => !x.panelId);
        const composites: AssetReferenceDto[] = [];
        const newUrls: Record<string, string> = {};
        const orphanList: OrphanSubmission[] = [];
        let letteringBase: AssetReferenceDto[] | null = null;

        const layoutFor = (s: SubmissionDto): CompositePanel[] =>
          s.panelLayout && s.panelLayout.length > 0
            ? s.panelLayout.filter((p) => !pid || p.pageId === pid)
            : pagePanels;

        for (const s of sorted) {
          if (pid && (!s.artworkReferenceIds || s.artworkReferenceIds.length === 0)) {
            letteringBase ??= await loadPreviousStageArtworks(
              chapterId,
              a.seriesId,
              pid,
              a.pipelineStageId,
            );
            const version = s.canvasVersions?.[pid];
            const snapshot = await elementService
              .getPageSnapshot(
                pid,
                false,
                version !== undefined && version > 0 ? version : undefined,
              )
              .catch(() => null);
            if (!snapshot) continue;
            const { dataUrl } = await buildPageComposite({
              panels: layoutFor(s),
              artworks: letteringBase,
              elements: snapshot.elements ?? [],
              drawText: true,
              getAccessUrl: accessUrl,
            });
            if (dataUrl) {
              const ref = compositeRef(
                chapterId,
                s,
                pid,
                a.pipelineStageId,
                `Lettering #${s.attemptNumber}`,
              );
              composites.push(ref);
              newUrls[ref.id] = dataUrl;
            }
            continue;
          }
          const hasWholePage = arts.some(
            (x) => !x.panelId && s.artworkReferenceIds?.includes(x.id),
          );
          if (hasWholePage || !s.artworkReferenceIds?.length) continue;

          const panelArts = arts.filter((x) => x.panelId && s.artworkReferenceIds?.includes(x.id));
          if (panelArts.length === 0) continue;
          const layout = layoutFor(s);
          const drawable = panelArts.filter((x) => layout.some((p) => p.id === x.panelId));
          if (drawable.length === 0) {
            orphanList.push({ subId: s.id, attempt: s.attemptNumber, arts: panelArts });
            continue;
          }
          const { dataUrl } = await buildPageComposite({
            panels: layout,
            artworks: drawable,
            getAccessUrl: accessUrl,
          });
          const ref = compositeRef(
            chapterId,
            s,
            panelArts[0]?.pageId || pid || '',
            panelArts[0]?.pipelineStageId || a.pipelineStageId,
            `Composite #${s.attemptNumber}`,
          );
          composites.push(ref);
          if (dataUrl) newUrls[ref.id] = dataUrl;
        }

        for (const o of orphanList) {
          for (const art of o.arts) {
            newUrls[art.id] = await accessUrl(art.id).catch(() => '');
          }
        }

        const all = [...pageArts, ...composites].sort((x, y) =>
          x.versionNumber !== y.versionNumber
            ? x.versionNumber - y.versionNumber
            : new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime(),
        );
        const versionOf = (s?: SubmissionDto) =>
          s
            ? (all.find((x) => s.artworkReferenceIds?.includes(x.id)) ??
              all.find((x) => x.id === `composite-sub-${s.id}`))
            : undefined;
        const pending = [...sorted].reverse().find(isPending);
        const lastDecided = sorted.filter(isDecided).pop();
        const cur =
          versionOf(pending) ?? versionOf(sorted[sorted.length - 1]) ?? all[all.length - 1];
        const prev =
          versionOf(lastDecided) ??
          (cur ? all.filter((x) => x.versionNumber < cur.versionNumber).pop() : undefined);

        if (!alive) return;
        setPageId(pid);
        setPanels(pagePanels);
        setOrphans(orphanList);
        setArtworks(all);
        setUrls((u) => ({ ...u, ...newUrls }));
        setCurrentId(cur?.id ?? null);
        setPreviousId(prev && prev.id !== cur?.id ? prev.id : null);
      } catch (err) {
        if (alive) setLoadError(err);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [chapterId, assignment, submissions, accessUrl]);

  useEffect(() => {
    const timer = window.setInterval(() => setLinkTick((t) => t + 1), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    for (const id of [currentId, previousId]) {
      if (!id || id.startsWith('composite-sub-') || linkInFlight.current.has(id)) continue;
      if (!needsArtworkLink(linkExpiry.current[id], Date.now())) continue;
      linkInFlight.current.add(id);
      artworkService
        .getArtworkAccessLink(chapterId, id)
        .then((link) => {
          linkExpiry.current[id] = parseLinkExpiry(link.expiresAtUtc, Date.now());
          setUrls((u) => ({ ...u, [id]: resolveArtworkUrl(link.url) }));
        })
        .catch(() => undefined)
        .finally(() => linkInFlight.current.delete(id));
    }
  }, [chapterId, currentId, previousId, linkTick]);

  return {
    artworks,
    panels,
    pageId,
    orphans,
    currentId,
    previousId,
    setPreviousId,
    urls,
    loading,
    loadError,
  };
}
