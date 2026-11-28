import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { buildEditorDashboardUrl } from '@/app/routePaths';

/**
 * Chuyển hướng route cũ editor/dashboard/:chapterId sang editor/dashboard?chapter=:chapterId (AG-12).
 */
export const EditorChapterDashboardView: React.FC = () => {
  const { workspaceId = '', seriesId = '', chapterId = '' } = useParams();
  return <Navigate to={buildEditorDashboardUrl(workspaceId, seriesId, chapterId)} replace />;
};

export default EditorChapterDashboardView;
