// src/services/series.service.ts
import axiosClient from '../api/axiosClient';

// axiosClient mặc định Content-Type JSON → axios 1.x đổi FormData thành JSON (415). Upload file phải ghi rõ multipart (axios tự thêm boundary).
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

export type SeriesImageKind = 'avatar' | 'banner';

export interface SeriesDto {
  id: string;
  workspaceId: string;
  title: string;
  synopsis?: string | null;
  storyArc?: string | null;
  readingDirection: number | string;
  pipelineDefinitionId?: string | null;
  genre: string;
  format: string;
  releaseScheduleJson?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  createdBy?: string | null;
  chaptersCount: number;
  /** `/api/series/{id}/cover?v=…` (cần Bearer → hiển thị qua AuthenticatedImage); null = chưa có bìa. */
  coverUrl?: string | null;
  /** Avatar vuông của Series (GET cần Bearer, dùng AuthenticatedImage); null = dùng fallback. */
  avatarUrl?: string | null;
  /** Banner ngang ~3:1 đầu Series Dashboard; null = dùng fallback. */
  bannerUrl?: string | null;
}

export interface SeriesDetailDto extends SeriesDto {
  bibleId?: string | null;
  chapters: Array<{
    id: string;
    chapterNumber: number;
    title?: string | null;
    targetReleaseDate?: string | null;
    versionVector: number;
    createdAt: string;
  }>;
}

export interface CreateSeriesRequest {
  title: string;
  format?: string;
  readingDirection?: number | string;
  synopsis?: string;
  genre?: string;
  storyArc?: string;
  pipelineTemplateId?: string;
}

export interface UpdateSeriesRequest {
  title: string;
  synopsis?: string;
  storyArc?: string;
  readingDirection: number | string;
  pipelineDefinitionId?: string;
  pipelineTemplateId?: string;
  genre?: string;
  format?: string;
  releaseScheduleJson?: string;
}

// Series Progress (UC-16)
export interface StageBreakdownDto {
  stageId: string;
  name: string;
  stageOrder: number;
  notStarted: number;
  inProgress: number;
  submitted: number;
  inReview: number;
  changesRequested: number;
  approved: number;
}

export interface ChapterProgressDto {
  chapterId: string;
  chapterNumber: number;
  title: string | null;
  status: 'InProduction' | 'Approved' | 'Locked' | 'Published' | string;
  targetReleaseDate: string | null;
  pageCount: number;
  panelCount: number;
  percentComplete: number;
  stages: StageBreakdownDto[];
  assignmentsByStatus: Record<string, number>;
  overdueAssignments: number;
  overdueChangeRequests?: number;
}

export interface WorkloadDto {
  userId: string;
  fullName: string;
  role: string;
  open: number;
  overdue: number;
  waitingReview: number;
  done: number;
}

export interface OverdueAssignmentDto {
  assignmentId: string;
  chapterId: string;
  assigneeUserId: string;
  assigneeName: string;
  status: string;
  dueDate: string;
  brief: string;
}

export interface OverdueChangeRequestDto {
  changeRequestId: string;
  assignmentId: string;
  chapterId: string;
  responsibleUserId: string;
  responsibleUserName: string;
  status: string;
  dueDate: string;
  description: string;
}

export interface BurndownPointDto {
  date: string;
  remaining: number;
}

export interface SeriesProgressDto {
  seriesId: string;
  generatedAt: string;
  chapters: ChapterProgressDto[];
  workload: WorkloadDto[];
  overdue: OverdueAssignmentDto[];
  overdueChangeRequests?: OverdueChangeRequestDto[];
  burndown: BurndownPointDto[];
}

// Typography Presets (NFR-08)
export interface TypographyPresetDto {
  id: string;
  seriesId: string;
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: string;
  lineHeight: number;
  letterSpacing: number;
  textAlign: string;
  usageType: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CreateTypographyPresetRequest {
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight?: number;
  fontStyle?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: string;
  usageType?: string;
  isDefault?: boolean;
}

export interface UpdateTypographyPresetRequest {
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight?: number;
  fontStyle?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: string;
  usageType?: string;
  isDefault?: boolean;
}

// Consistency Rules (NFR-08)
export interface ConsistencyRuleDto {
  id: string;
  seriesId: string;
  name: string;
  ruleType: string;
  description?: string | null;
  isEnabled: boolean;
  pattern?: string | null;
  severity: string;
  configurationJson?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CreateConsistencyRuleRequest {
  name: string;
  ruleType: string;
  description?: string;
  isEnabled?: boolean;
  pattern?: string;
  severity?: string;
  configurationJson?: string;
}

export interface UpdateConsistencyRuleRequest {
  name: string;
  ruleType: string;
  description?: string;
  isEnabled?: boolean;
  pattern?: string;
  severity?: string;
  configurationJson?: string;
}

export interface SeriesPresetDto {
  id: string;
  seriesId: string;
  typographyPresetsJson: string;
  consistencyRulesJson: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface UpdateSeriesPresetRequest {
  typographyPresetsJson: string;
  consistencyRulesJson: string;
}

// Series Members (UC-04 / RBAC)
export interface SeriesMemberDto {
  id: string;
  seriesId: string;
  userId: string;
  fullName: string;
  email: string;
  studioRole: string;
  seriesRole: string;
  joinedAt: string;
}

export interface AddSeriesMemberRequest {
  userId: string;
  seriesRole: string;
}

export interface UpdateSeriesMemberRequest {
  seriesRole: string;
}

function extractError(err: any, defaultMsg: string): string {
  return err.response?.data?.error || err.response?.data?.message || defaultMsg;
}

export const seriesService = {
  async getSeriesList(workspaceId: string, search?: string): Promise<SeriesDto[]> {
    try {
      const res = await axiosClient.get(`/workspaces/${workspaceId}/series`, {
        params: search ? { search } : undefined,
      });
      return res.data;
    } catch {
      return [];
    }
  },

  async getSeriesById(seriesId: string): Promise<SeriesDetailDto> {
    try {
      const res = await axiosClient.get(`/series/${seriesId}`);
      return res.data;
    } catch (err: any) {
      throw new Error(extractError(err, 'Không thể lấy thông tin Series.'));
    }
  },

  /** PUT /api/series/{id}/cover (Producer) — trả coverUrl mới. */
  async setCover(seriesId: string, file: File): Promise<string | null> {
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await axiosClient.put(`/series/${seriesId}/cover`, form, MULTIPART);
      return res.data?.value ?? null;
    } catch (err: any) {
      throw new Error(extractError(err, 'Không thể cập nhật ảnh bìa.'));
    }
  },

  /** PUT /api/series/{id}/{avatar|banner} (Producer, multipart file PNG/JPEG/WebP ≤ 5 MB) — trả URL mới. Lưu lên kho asset (R2). */
  async setSeriesImage(
    seriesId: string,
    kind: SeriesImageKind,
    file: File,
  ): Promise<string | null> {
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await axiosClient.put(`/series/${seriesId}/${kind}`, form, MULTIPART);
      return res.data?.value ?? null;
    } catch (err: any) {
      throw new Error(extractError(err, 'Không thể lưu ảnh.'));
    }
  },

  /** PUT /api/series/{id}/{avatar|banner}/preset { presetId } — Backend lấy file mẫu có kiểm soát rồi lưu lên R2. */
  async setSeriesImagePreset(
    seriesId: string,
    kind: SeriesImageKind,
    presetId: string,
  ): Promise<string | null> {
    try {
      const res = await axiosClient.put(`/series/${seriesId}/${kind}/preset`, { presetId });
      return res.data?.value ?? null;
    } catch (err: any) {
      throw new Error(extractError(err, 'Không thể lưu ảnh mẫu.'));
    }
  },

  /** DELETE /api/series/{id}/{avatar|banner} — gỡ ảnh, FE về fallback (file cũ vẫn giữ trên kho). */
  async clearSeriesImage(seriesId: string, kind: SeriesImageKind): Promise<void> {
    try {
      await axiosClient.delete(`/series/${seriesId}/${kind}`);
    } catch (err: any) {
      throw new Error(extractError(err, 'Không thể gỡ ảnh.'));
    }
  },

  /** DELETE /api/series/{id}/cover (Producer). */
  async clearCover(seriesId: string): Promise<void> {
    try {
      await axiosClient.delete(`/series/${seriesId}/cover`);
    } catch (err: any) {
      throw new Error(extractError(err, 'Không thể xoá ảnh bìa.'));
    }
  },

  async updateStoryArc(
    seriesId: string,
    storyArc: string | null,
  ): Promise<{ value: string | null }> {
    try {
      const res = await axiosClient.put(`/series/${seriesId}/story-arc`, { storyArc });
      return res.data;
    } catch (err: any) {
      throw new Error(extractError(err, 'Không thể cập nhật Story Arc của Series.'));
    }
  },

  async getSeriesProgress(seriesId: string): Promise<SeriesProgressDto> {
    try {
      const res = await axiosClient.get(`/series/${seriesId}/progress`);
      return res.data;
    } catch (err: any) {
      throw new Error(extractError(err, 'Không thể lấy thông tin tiến độ Series.'));
    }
  },

  async createSeries(workspaceId: string, data: CreateSeriesRequest): Promise<SeriesDto> {
    try {
      const res = await axiosClient.post(`/workspaces/${workspaceId}/series`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(extractError(err, 'Không thể tạo Series mới.'));
    }
  },

  async updateSeries(seriesId: string, data: UpdateSeriesRequest): Promise<SeriesDto> {
    try {
      const res = await axiosClient.put(`/series/${seriesId}`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(extractError(err, 'Không thể cập nhật Series.'));
    }
  },

  async deleteSeries(seriesId: string): Promise<void> {
    try {
      await axiosClient.delete(`/series/${seriesId}`);
    } catch (err: any) {
      throw new Error(extractError(err, 'Không thể xóa Series.'));
    }
  },

  async getPresets(seriesId: string): Promise<SeriesPresetDto> {
    try {
      const res = await axiosClient.get(`/series/${seriesId}/presets`);
      return res.data;
    } catch (err: any) {
      throw new Error(extractError(err, 'Không thể tải cấu hình Presets của Series.'));
    }
  },

  async updatePresets(seriesId: string, data: UpdateSeriesPresetRequest): Promise<SeriesPresetDto> {
    try {
      const res = await axiosClient.put(`/series/${seriesId}/presets`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(extractError(err, 'Không thể lưu cấu hình Presets.'));
    }
  },

  // ── Typography Presets CRUD (Task 8, NFR-08) ──
  async getTypographyPresets(seriesId: string): Promise<TypographyPresetDto[]> {
    try {
      const res = await axiosClient.get(`/series/${seriesId}/presets`);
      return res.data;
    } catch (err: any) {
      throw new Error(extractError(err, 'Không thể tải danh sách Typography Presets.'));
    }
  },

  async createTypographyPreset(
    seriesId: string,
    data: CreateTypographyPresetRequest,
  ): Promise<TypographyPresetDto> {
    try {
      const res = await axiosClient.post(`/series/${seriesId}/presets`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(extractError(err, 'Không thể tạo Typography Preset.'));
    }
  },

  async updateTypographyPreset(
    seriesId: string,
    presetId: string,
    data: UpdateTypographyPresetRequest,
  ): Promise<TypographyPresetDto> {
    try {
      const res = await axiosClient.put(`/series/${seriesId}/presets/${presetId}`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(extractError(err, 'Không thể cập nhật Typography Preset.'));
    }
  },

  async deleteTypographyPreset(seriesId: string, presetId: string): Promise<void> {
    try {
      await axiosClient.delete(`/series/${seriesId}/presets/${presetId}`);
    } catch (err: any) {
      throw new Error(extractError(err, 'Không thể xóa Typography Preset.'));
    }
  },

  // ── Consistency Rules CRUD (Task 9, NFR-08) ──
  async getConsistencyRules(seriesId: string): Promise<ConsistencyRuleDto[]> {
    try {
      const res = await axiosClient.get(`/series/${seriesId}/consistency-rules`);
      return res.data;
    } catch (err: any) {
      throw new Error(extractError(err, 'Không thể tải danh sách Consistency Rules.'));
    }
  },

  async createConsistencyRule(
    seriesId: string,
    data: CreateConsistencyRuleRequest,
  ): Promise<ConsistencyRuleDto> {
    try {
      const res = await axiosClient.post(`/series/${seriesId}/consistency-rules`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(extractError(err, 'Không thể tạo Consistency Rule.'));
    }
  },

  async updateConsistencyRule(
    seriesId: string,
    ruleId: string,
    data: UpdateConsistencyRuleRequest,
  ): Promise<ConsistencyRuleDto> {
    try {
      const res = await axiosClient.put(`/series/${seriesId}/consistency-rules/${ruleId}`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(extractError(err, 'Không thể cập nhật Consistency Rule.'));
    }
  },

  async deleteConsistencyRule(seriesId: string, ruleId: string): Promise<void> {
    try {
      await axiosClient.delete(`/series/${seriesId}/consistency-rules/${ruleId}`);
    } catch (err: any) {
      throw new Error(extractError(err, 'Không thể xóa Consistency Rule.'));
    }
  },

  // Series Members APIs
  async getSeriesMembers(workspaceId: string, seriesId: string): Promise<SeriesMemberDto[]> {
    if (!workspaceId) return [];
    try {
      const res = await axiosClient.get(`/Workspaces/${workspaceId}/members`);
      const members: any[] = res.data || [];
      return members.map((m) => ({
        id: m.userId,
        seriesId,
        userId: m.userId,
        fullName: m.fullName || m.email,
        email: m.email,
        studioRole: String(m.role),
        seriesRole: String(m.role),
        joinedAt: m.joinedAt,
      }));
    } catch (err: any) {
      if (err.response?.status === 404) return [];
      return [];
    }
  },

  async addSeriesMember(
    _workspaceId: string,
    seriesId: string,
    req: AddSeriesMemberRequest,
  ): Promise<SeriesMemberDto> {
    return {
      id: req.userId,
      seriesId,
      userId: req.userId,
      fullName: 'Thành viên',
      email: '',
      studioRole: req.seriesRole,
      seriesRole: req.seriesRole,
      joinedAt: new Date().toISOString(),
    };
  },

  async updateSeriesMember(
    workspaceId: string,
    seriesId: string,
    memberId: string,
    req: UpdateSeriesMemberRequest,
  ): Promise<SeriesMemberDto> {
    return {
      id: memberId,
      seriesId,
      userId: memberId,
      fullName: 'Thành viên',
      email: '',
      studioRole: req.seriesRole,
      seriesRole: req.seriesRole,
      joinedAt: new Date().toISOString(),
    };
  },

  async removeSeriesMember(workspaceId: string, seriesId: string, memberId: string): Promise<void> {
    // Thành viên được quản lý ở cấp Studio Workspace (/Workspaces/{id}/members)
    return Promise.resolve();
  },
};
