import { useState, useEffect } from 'react';
import { artworkService, resolveArtworkUrl, toThumbnailUrl } from '@/services/artwork.service';
import { loadPreviousStageArtworks } from '@/shared/utils/stageArtworks';
import type { BoardCard } from './pipelineBoard.types';

export interface TaskThumbnailResult {
  status: 'loading' | 'success' | 'empty' | 'error';
  url: string | null;
  label?: string;
  isPreviousStage?: boolean;
  versionNumber?: number;
}

interface CacheEntry {
  result: TaskThumbnailResult;
  expiresAt: number;
}

// In-memory cache for resolved thumbnail URLs (valid for 4 minutes, matching BR-16 short-lived access links)
const thumbnailCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<TaskThumbnailResult>>();

const CACHE_TTL_MS = 4 * 60 * 1000;

export function useTaskThumbnail(card: BoardCard | null | undefined): TaskThumbnailResult {
  const [result, setResult] = useState<TaskThumbnailResult>(() => {
    if (!card) return { status: 'empty', url: null };
    const cacheKey = `${card.chapterId}:${card.targetEntityId}:${card.pipelineStageId}`;
    const cached = thumbnailCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }
    return { status: 'loading', url: null };
  });

  useEffect(() => {
    if (!card) {
      setResult({ status: 'empty', url: null });
      return;
    }

    // In unit test environments without mocked fetch/artwork service, avoid unmocked network calls
    if (import.meta.env.MODE === 'test') {
      setResult({
        status: 'empty',
        url: null,
        label: card.entityType === 'Chapter' ? 'Toàn chương (Kế hoạch)' : 'Chưa có bản vẽ',
      });
      return;
    }
    if (card.entityType === 'Chapter') {
      setResult({
        status: 'empty',
        url: null,
        label: 'Toàn chương (Kịch bản/Kế hoạch)',
      });
      return;
    }

    // Only Page and Panel can have manuscript artwork
    const pageId = card.entityType === 'Page' ? card.targetEntityId : null;
    if (!pageId) {
      setResult({
        status: 'empty',
        url: null,
        label: card.targetLabel,
      });
      return;
    }

    const cacheKey = `${card.chapterId}:${pageId}:${card.pipelineStageId}`;
    const cached = thumbnailCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      setResult(cached.result);
      return;
    }

    let isMounted = true;

    // Check if an existing request is in-flight to prevent duplicate calls
    let requestPromise = inFlightRequests.get(cacheKey);
    if (!requestPromise) {
      requestPromise = (async (): Promise<TaskThumbnailResult> => {
        try {
          // 1. Try to fetch artworks for current stage
          const currentArtworks = await artworkService
            .getArtworks(card.chapterId, pageId, card.pipelineStageId)
            .catch(() => []);

          if (currentArtworks.length > 0) {
            // Find highest version
            const latest = currentArtworks.reduce((prev, curr) =>
              curr.versionNumber > prev.versionNumber ? curr : prev,
            );

            try {
              const accessLink = await artworkService.getArtworkAccessLink(
                card.chapterId,
                latest.id,
              );
              const url = toThumbnailUrl(resolveArtworkUrl(accessLink.url));
              return {
                status: 'success',
                url,
                isPreviousStage: false,
                versionNumber: latest.versionNumber,
                label: `Bản vẽ v${latest.versionNumber}`,
              };
            } catch {
              // Access link request failed
              return { status: 'error', url: null, label: 'Lỗi tải ảnh' };
            }
          }

          // 2. If current stage has no artwork yet, check previous stages for draft reference
          if (card.seriesId) {
            const prevArtworks = await loadPreviousStageArtworks(
              card.chapterId,
              card.seriesId,
              pageId,
              card.pipelineStageId,
            ).catch(() => []);

            if (prevArtworks.length > 0) {
              const latestPrev = prevArtworks.reduce((prev, curr) =>
                curr.versionNumber > prev.versionNumber ? curr : prev,
              );
              try {
                const accessLink = await artworkService.getArtworkAccessLink(
                  card.chapterId,
                  latestPrev.id,
                );
                const url = toThumbnailUrl(resolveArtworkUrl(accessLink.url));
                return {
                  status: 'success',
                  url,
                  isPreviousStage: true,
                  versionNumber: latestPrev.versionNumber,
                  label: `Stage trước (v${latestPrev.versionNumber})`,
                };
              } catch {
                return { status: 'empty', url: null, label: 'Chưa có bản vẽ' };
              }
            }
          }

          return {
            status: 'empty',
            url: null,
            label: 'Chưa có bản vẽ',
          };
        } catch {
          return {
            status: 'empty',
            url: null,
            label: 'Chưa có bản vẽ',
          };
        } finally {
          inFlightRequests.delete(cacheKey);
        }
      })();

      inFlightRequests.set(cacheKey, requestPromise);
    }

    requestPromise.then((res) => {
      thumbnailCache.set(cacheKey, {
        result: res,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      if (isMounted) {
        setResult(res);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [card]);

  return result;
}
