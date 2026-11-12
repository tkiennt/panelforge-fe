// src/roles/writer/views/ScriptChapterSelectionView.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chapterService, ChapterDto, CreateChapterRequest } from '@/services/chapter.service';
import { seriesService, SeriesDetailDto } from '@/services/series.service';
import { ChapterSelectionView } from '../components/script/chapter-selection';
import { normalizeWorkspaceRole } from '@/types/auth';

interface ScriptChapterSelectionViewProps {
  onShowToast?: (title: string, desc: string) => void;
  workspaceRole?: string | null;
}

export const ScriptChapterSelectionView: React.FC<ScriptChapterSelectionViewProps> = ({
  onShowToast,
  workspaceRole,
}) => {
  const { workspaceId, seriesId } = useParams<{ workspaceId?: string; seriesId?: string }>();
  const navigate = useNavigate();

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
      notify('Lỗi tải dữ liệu', err.message || 'Không thể tải danh sách chương');
    } finally {
      setLoading(false);
    }
  }, [seriesId, notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectChapter = (chapter: ChapterDto) => {
    if (!workspaceId || !seriesId) return;
    // Chuyển sang Focus Workspace (ẩn Sidebar chính của app, mở bàn làm việc toàn màn hình)
    navigate(`/workspaces/${workspaceId}/series/${seriesId}/script/editor?chapterId=${chapter.id}`);
  };

  const handleCreateChapter = async (data: CreateChapterRequest) => {
    if (!seriesId) return;
    await chapterService.createChapter(seriesId, data);
    await loadData();
  };

  return (
    <ChapterSelectionView
      chapters={chapters}
      seriesDetail={seriesDetail}
      canCreateChapter={isProducer}
      loadingChapters={loading}
      onSelectChapter={handleSelectChapter}
      onCreateChapter={isProducer ? handleCreateChapter : undefined}
      onShowToast={notify}
    />
  );
};

export default ScriptChapterSelectionView;
