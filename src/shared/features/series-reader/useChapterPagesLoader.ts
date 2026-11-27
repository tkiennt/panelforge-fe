import { useCallback, useRef, useState } from 'react';
import { pageService, type PageDto } from '@/services/page.service';
import { assignmentService } from '@/services/assignment.service';
import { artworkService, resolveArtworkUrl } from '@/services/artwork.service';
import type { AssetReferenceDto, TaskGridDto } from '@/types';

export interface LoadedReaderPage {
  page: PageDto;
  imageUrl: string | null;
  assetReferenceId: string | null;
  currentStageName: string | null;
}

export interface LoadedChapterData {
  status: 'idle' | 'loading' | 'loaded' | 'error';
  pages: LoadedReaderPage[];
  taskGrid: TaskGridDto | null;
  error?: string;
}

function pickLatestPageArtwork(artworks: AssetReferenceDto[]): AssetReferenceDto | null {
  if (!artworks || artworks.length === 0) return null;
  const fullPage = artworks.filter((a) => !a.panelId);
  const pool = fullPage.length > 0 ? fullPage : artworks;
  return [...pool].sort((a, b) => {
    const vDiff = (b.versionNumber ?? 0) - (a.versionNumber ?? 0);
    if (vDiff !== 0) return vDiff;
    return Date.parse(b.createdAt || '') - Date.parse(a.createdAt || '');
  })[0];
}

function resolveCurrentStageName(pageId: string, grid: TaskGridDto | null): string | null {
  if (!grid || grid.stages.length === 0) return null;
  const stageOrder = new Map(grid.stages.map((s) => [s.id, s]));
  const pageTasks = grid.tasks
    .filter((t) => t.pageId === pageId && t.status !== 'Cancelled')
    .sort((a, b) => {
      const sa = stageOrder.get(a.pipelineStageId)?.stageOrder ?? 0;
      const sb = stageOrder.get(b.pipelineStageId)?.stageOrder ?? 0;
      return sb - sa;
    });

  const active =
    pageTasks.find((t) =>
      ['InProgress', 'Submitted', 'UnderReview', 'ReworkRequired'].includes(String(t.status)),
    ) ??
    pageTasks.find((t) => String(t.status) === 'Approved') ??
    pageTasks[0];

  if (!active) return null;
  return stageOrder.get(active.pipelineStageId)?.name ?? null;
}

export function useChapterPagesLoader() {
  const [chapterDataMap, setChapterDataMap] = useState<Record<string, LoadedChapterData>>({});
  const inFlightRef = useRef<Set<string>>(new Set());

  const loadChapter = useCallback(async (chapterId: string, force = false) => {
    if (!chapterId) return;
    if (!force && inFlightRef.current.has(chapterId)) return;

    inFlightRef.current.add(chapterId);
    setChapterDataMap((prev) => {
      if (!force && prev[chapterId]?.status === 'loaded') {
        return prev;
      }
      return {
        ...prev,
        [chapterId]: {
          status: 'loading',
          pages: prev[chapterId]?.pages ?? [],
          taskGrid: prev[chapterId]?.taskGrid ?? null,
        },
      };
    });

    try {
      const [pagesRaw, grid] = await Promise.all([
        pageService.getPagesByChapter(chapterId).catch(() => [] as PageDto[]),
        assignmentService.getTaskGrid(chapterId).catch(() => null),
      ]);

      const sortedPages = [...pagesRaw].sort((a, b) => a.pageNumber - b.pageNumber);

      const resolvedPages: LoadedReaderPage[] = await Promise.all(
        sortedPages.map(async (page) => {
          const artworks = await artworkService.getArtworks(chapterId, page.id).catch(() => []);
          const latest = pickLatestPageArtwork(artworks);
          let imageUrl: string | null = null;
          if (latest) {
            const access = await artworkService
              .getArtworkAccessLink(chapterId, latest.id)
              .catch(() => null);
            if (access?.url) {
              imageUrl = resolveArtworkUrl(access.url);
            }
          }
          return {
            page,
            imageUrl,
            assetReferenceId: latest?.id ?? null,
            currentStageName: resolveCurrentStageName(page.id, grid),
          };
        }),
      );

      setChapterDataMap((prev) => ({
        ...prev,
        [chapterId]: {
          status: 'loaded',
          pages: resolvedPages,
          taskGrid: grid,
        },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load chapter pages';
      setChapterDataMap((prev) => ({
        ...prev,
        [chapterId]: {
          status: 'error',
          pages: [],
          taskGrid: null,
          error: message,
        },
      }));
    } finally {
      inFlightRef.current.delete(chapterId);
    }
  }, []);

  const refreshTaskGrid = useCallback(async (chapterId: string) => {
    if (!chapterId) return;
    const grid = await assignmentService.getTaskGrid(chapterId).catch(() => null);
    if (!grid) return;
    setChapterDataMap((prev) => {
      const existing = prev[chapterId];
      if (!existing) return prev;
      return {
        ...prev,
        [chapterId]: {
          ...existing,
          taskGrid: grid,
          pages: existing.pages.map((p) => ({
            ...p,
            currentStageName: resolveCurrentStageName(p.page.id, grid),
          })),
        },
      };
    });
  }, []);

  return {
    chapterDataMap,
    loadChapter,
    refreshTaskGrid,
  };
}
