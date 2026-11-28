/**
 * Canonical route builders for PanelForge FE.
 * All workspace/series scoped screens live under /workspaces/:workspaceId/series/:seriesId/...
 */

export const buildWorkspacePath = (workspaceId: string, subPath?: string): string => {
  const base = `/workspaces/${encodeURIComponent(workspaceId)}`;
  if (!subPath) return base;
  const cleanSub = subPath.startsWith('/') ? subPath.slice(1) : subPath;
  return `${base}/${cleanSub}`;
};

export const buildSeriesPath = (
  workspaceId: string,
  seriesId: string,
  subPath?: string,
): string => {
  const base = `/workspaces/${encodeURIComponent(workspaceId)}/series/${encodeURIComponent(seriesId)}`;
  if (!subPath) return base;
  const cleanSub = subPath.startsWith('/') ? subPath.slice(1) : subPath;
  return `${base}/${cleanSub}`;
};

export const buildArtistDeskUrl = (
  workspaceId: string,
  seriesId: string,
  params?: {
    chapterId?: string;
    assignmentId?: string;
    page?: number | string;
    tab?: string;
  },
): string => {
  const query = new URLSearchParams();
  if (params?.chapterId) query.set('chapterId', params.chapterId);
  if (params?.assignmentId) query.set('assignmentId', params.assignmentId);
  if (params?.page !== undefined && params?.page !== null) query.set('page', String(params.page));
  if (params?.tab) query.set('tab', params.tab);
  const qStr = query.toString();
  return buildSeriesPath(workspaceId, seriesId, `artist/desk${qStr ? `?${qStr}` : ''}`);
};

export const buildScriptEditorUrl = (
  workspaceId: string,
  seriesId: string,
  params?: {
    chapterId?: string;
    assignmentId?: string;
  },
): string => {
  const query = new URLSearchParams();
  if (params?.chapterId) query.set('chapterId', params.chapterId);
  if (params?.assignmentId) query.set('assignmentId', params.assignmentId);
  const qStr = query.toString();
  return buildSeriesPath(workspaceId, seriesId, `script/editor${qStr ? `?${qStr}` : ''}`);
};

export const buildEditorDeskUrl = (
  workspaceId: string,
  seriesId: string,
  params?: {
    chapterId?: string;
  },
): string => {
  const query = new URLSearchParams();
  if (params?.chapterId) query.set('chapterId', params.chapterId);
  const qStr = query.toString();
  return buildSeriesPath(workspaceId, seriesId, `editor/desk${qStr ? `?${qStr}` : ''}`);
};

/** Tổng quan duyệt của Editor: cấp Series (không có chapterId) hoặc cấp chương. */
export const buildEditorDashboardUrl = (
  workspaceId: string,
  seriesId: string,
  chapterId?: string,
): string =>
  buildSeriesPath(
    workspaceId,
    seriesId,
    chapterId ? `editor/dashboard/${encodeURIComponent(chapterId)}` : 'editor/dashboard',
  );

export const buildProductionWorkspaceUrl = (
  workspaceId: string,
  seriesId: string,
  params?: {
    chapterId?: string;
    tab?: 'progress' | 'chapters' | 'crew';
  },
): string => {
  const query = new URLSearchParams();
  if (params?.chapterId) query.set('chapterId', params.chapterId);
  if (params?.tab) query.set('tab', params.tab);
  const qStr = query.toString();
  return buildSeriesPath(workspaceId, seriesId, `workspace${qStr ? `?${qStr}` : ''}`);
};

export const buildChapterReaderUrl = (
  workspaceId: string,
  seriesId: string,
  chapterId: string,
): string =>
  buildSeriesPath(workspaceId, seriesId, `chapters/${encodeURIComponent(chapterId)}/reader`);

export type StudioReaderRole = 'writer' | 'editor' | 'producer';

export const buildRoleChapterReaderUrl = (
  role: StudioReaderRole,
  workspaceId: string,
  seriesId: string,
  chapterId: string,
): string =>
  buildSeriesPath(
    workspaceId,
    seriesId,
    `${role}/chapters/${encodeURIComponent(chapterId)}/reader`,
  );

export const buildSeriesReaderUrl = (
  workspaceId: string,
  seriesId: string,
  params?: {
    chapterId?: string;
    pageId?: string;
  },
): string => {
  const query = new URLSearchParams();
  if (params?.chapterId) query.set('chapterId', params.chapterId);
  if (params?.pageId) query.set('pageId', params.pageId);
  const qStr = query.toString();
  return buildSeriesPath(workspaceId, seriesId, `read${qStr ? `?${qStr}` : ''}`);
};

export const buildSeriesExportUrl = (
  workspaceId: string,
  seriesId: string,
  chapterId?: string,
): string => {
  const query = new URLSearchParams();
  if (chapterId) query.set('chapterId', chapterId);
  const qStr = query.toString();
  return buildSeriesPath(workspaceId, seriesId, `export${qStr ? `?${qStr}` : ''}`);
};

export const buildScriptReviewUrl = (
  workspaceId: string,
  seriesId: string,
  chapterId: string,
): string => {
  return buildSeriesPath(
    workspaceId,
    seriesId,
    `chapters/${encodeURIComponent(chapterId)}/script/review`,
  );
};

export const buildTaskReviewUrl = (
  workspaceId: string,
  seriesId: string,
  taskId: string,
  chapterId?: string,
): string => {
  if (chapterId) {
    return buildSeriesPath(
      workspaceId,
      seriesId,
      `chapters/${encodeURIComponent(chapterId)}/review/${encodeURIComponent(taskId)}`,
    );
  }
  return buildSeriesPath(workspaceId, seriesId, `review/${encodeURIComponent(taskId)}`);
};

export const buildAdminUrl = (tab?: string): string => {
  if (!tab || tab === 'dashboard') return '/admin';
  return `/admin?tab=${encodeURIComponent(tab)}`;
};

export const buildChapterManagementUrl = (
  workspaceId: string,
  seriesId: string,
  chapterId?: string,
): string => {
  const query = chapterId ? `?chapterId=${encodeURIComponent(chapterId)}` : '';
  return buildSeriesPath(workspaceId, seriesId, `chapters${query}`);
};

export const buildExportUrl = (workspaceId: string, seriesId: string): string => {
  return buildSeriesPath(workspaceId, seriesId, 'export');
};

export const buildPublishingUrl = (workspaceId: string, seriesId: string): string => {
  return buildSeriesPath(workspaceId, seriesId, 'publishing');
};

export const buildBibleUrl = (workspaceId: string, seriesId: string, search?: string): string => {
  return buildSeriesPath(
    workspaceId,
    seriesId,
    search ? `bible?search=${encodeURIComponent(search)}` : 'bible',
  );
};
