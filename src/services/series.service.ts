// src/services/series.service.ts
import axiosClient from '../api/axiosClient';

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
    try {
      const res = await axiosClient.get(`/workspaces/${workspaceId}/series/${seriesId}/members`);
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 404) return [];
      throw new Error(`Failed to fetch series members: ${err.message}`);
    }
  },

  async addSeriesMember(
    workspaceId: string,
    seriesId: string,
    req: AddSeriesMemberRequest,
  ): Promise<SeriesMemberDto> {
    try {
      const res = await axiosClient.post(
        `/workspaces/${workspaceId}/series/${seriesId}/members`,
        req,
      );
      return res.data;
    } catch (err: any) {
      throw new Error(`Failed to add member to series: ${err.response?.data || err.message}`);
    }
  },

  async updateSeriesMember(
    workspaceId: string,
    seriesId: string,
    memberId: string,
    req: UpdateSeriesMemberRequest,
  ): Promise<SeriesMemberDto> {
    try {
      const res = await axiosClient.put(
        `/workspaces/${workspaceId}/series/${seriesId}/members/${memberId}`,
        req,
      );
      return res.data;
    } catch (err: any) {
      throw new Error(`Failed to update series member: ${err.response?.data || err.message}`);
    }
  },

  async removeSeriesMember(workspaceId: string, seriesId: string, memberId: string): Promise<void> {
    try {
      await axiosClient.delete(`/workspaces/${workspaceId}/series/${seriesId}/members/${memberId}`);
    } catch (err: any) {
      throw new Error(`Failed to remove series member: ${err.response?.data || err.message}`);
    }
  },
};
