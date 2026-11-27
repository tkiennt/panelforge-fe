// src/roles/writer/views/ScriptChapterSelectionView.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { chapterService, ChapterDto, CreateChapterRequest } from '@/services/chapter.service';
import { seriesService, SeriesDetailDto } from '@/services/series.service';
import { ChapterSelectionView } from '../components/script/chapter-selection';
// eslint-disable-next-line no-restricted-imports
import { ScriptReviewView } from '@/roles/editor/views/ScriptReviewView';
import { normalizeWorkspaceRole } from '@/types/auth';
import { useTranslation } from '@/lib/i18n';

interface ScriptChapterSelectionViewProps {
  onShowToast?: (title: string, desc: string) => void;
  workspaceRole?: string | null;
}

export const ScriptChapterSelectionView: React.FC<ScriptChapterSelectionViewProps> = ({
  onShowToast,
  workspaceRole,
}) => {
  const { t } = useTranslation('writer');
  const { workspaceId, seriesId } = useParams<{ workspaceId?: string; seriesId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const chapterIdParam = searchParams.get('chapterId');

  const [seriesDetail, setSeriesDetail] = useState<SeriesDetailDto | null>(null);
  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [loading, setLoading] = useState(true);

  // RBAC: Only Producer can create new chapters
  const normRole = workspaceRole ? normalizeWorkspaceRole(workspaceRole) : null;
  const effectiveRole =
    normRole ||
    (typeof window !== 'undefined'
      ? normalizeWorkspaceRole(localStorage.getItem('workspaceRole'))
      : null);
  const isProducer = effectiveRole === 'PRODUCER';

  const notify = useCallback(
    (title: string, desc: string) => {
      if (onShowToast) {
        onShowToast(title, desc);
      }
    },
    [onShowToast],
  );

  const loadData = useCallback(async () => {
    if (!seriesId) return;
    setLoading(true);
    try {
      const [seriesRes, chaptersRes] = await Promise.all([
        seriesService.getSeriesById(seriesId).catch(() => null),
        chapterService.getChaptersBySeries(seriesId, 1, 100).catch(() => ({ items: [], total: 0 })),
      ]);

      if (seriesRes) {
        setSeriesDetail(seriesRes);
      }
      setChapters(chaptersRes.items || []);
    } catch (err: any) {
      notify(
        t('chapterSelectionView.loadErrorTitle'),
        err.message || t('chapterSelectionView.loadErrorDesc'),
      );
    } finally {
      setLoading(false);
    }
  }, [seriesId, notify, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectChapter = (chapter: ChapterDto) => {
    if (!workspaceId || !seriesId) return;
    if (effectiveRole === 'EDITOR') {
      const next = new URLSearchParams(searchParams);
      next.set('chapterId', chapter.id);
      next.set('view', 'review');
      setSearchParams(next);
      return;
    }
    if (effectiveRole === 'PRODUCER') {
      navigate(`/workspaces/${workspaceId}/series/${seriesId}/chapters?chapterId=${chapter.id}`);
      return;
    }
    // Chuyển sang Focus Workspace (ẩn Sidebar chính của app, mở bàn làm việc toàn màn hình)
    navigate(`/workspaces/${workspaceId}/series/${seriesId}/script/editor?chapterId=${chapter.id}`);
  };

  const handleReadChapter = (chapter: ChapterDto) => {
    if (!workspaceId || !seriesId) return;
    navigate(`/workspaces/${workspaceId}/series/${seriesId}/chapters/${chapter.id}/reader`);
  };

  const handleCreateChapter = async (data: CreateChapterRequest) => {
    if (!seriesId) return;
    await chapterService.createChapter(seriesId, data);
    await loadData();
  };

  if (chapterIdParam) {
    if (effectiveRole === 'EDITOR') {
      return (
        <ScriptReviewView
          chapterIdProp={chapterIdParam}
          workspaceRole={effectiveRole || undefined}
          onShowToast={notify}
          onBackToChapters={() => {
            const next = new URLSearchParams(searchParams);
            next.delete('chapterId');
            next.delete('view');
            setSearchParams(next);
          }}
          chaptersList={chapters}
          onSelectChapter={(id) => {
            const next = new URLSearchParams(searchParams);
            next.set('chapterId', id);
            next.set('view', 'review');
            setSearchParams(next);
          }}
        />
      );
    }

    if (effectiveRole === 'PRODUCER') {
      return (
        <Navigate
          to={`/workspaces/${workspaceId}/series/${seriesId}/chapters?chapterId=${chapterIdParam}`}
          replace
        />
      );
    }

    // Default / Writer: land in the editor
    return (
      <Navigate
        to={`/workspaces/${workspaceId}/series/${seriesId}/script/editor?chapterId=${chapterIdParam}`}
        replace
      />
    );
  }

  return (
    <ChapterSelectionView
      chapters={chapters}
      seriesDetail={seriesDetail}
      canCreateChapter={isProducer}
      loadingChapters={loading}
      onSelectChapter={handleSelectChapter}
      onCreateChapter={isProducer ? handleCreateChapter : undefined}
      onShowToast={notify}
      presentationMode={effectiveRole === 'ARTIST' ? 'reference' : 'editor'}
      onReadChapter={handleReadChapter}
    />
  );
};

export default ScriptChapterSelectionView;
