// src/services/series.service.ts
import { API_URL } from '../config/env';
export interface SeriesDto {
  id: string;
  workspaceId: string;
  title: string;
  synopsis?: string | null;
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

function getActiveToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
}

function getAuthHeaders(): Record<string, string> {
  const token = getActiveToken() || '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token && !token.startsWith('mock-')) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const seriesService = {
  async getSeriesList(workspaceId: string, search?: string): Promise<SeriesDto[]> {
    const token = getActiveToken();
    if (!token || token.startsWith('mock-')) {
      return [];
    }

    const url = new URL(`${API_URL}/api/workspaces/${workspaceId}/series`);
    if (search) url.searchParams.set('search', search);

    try {
      const res = await fetch(url.toString(), {
        headers: getAuthHeaders(),
      });
      if (res.status === 401) {
        if (typeof window !== 'undefined') localStorage.removeItem('token');
        return [];
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Không thể lấy danh sách Series.');
      }
      return res.json();
    } catch {
      return [];
    }
  },

  async getSeriesById(seriesId: string): Promise<SeriesDetailDto> {
    const res = await fetch(`${API_URL}/api/series/${seriesId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Không thể lấy thông tin Series.');
    }
    return res.json();
  },

  async createSeries(workspaceId: string, data: CreateSeriesRequest): Promise<SeriesDto> {
    const res = await fetch(`${API_URL}/api/workspaces/${workspaceId}/series`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Không thể tạo Series mới.');
    }
    return res.json();
  },

  async updateSeries(seriesId: string, data: UpdateSeriesRequest): Promise<SeriesDto> {
    const res = await fetch(`${API_URL}/api/series/${seriesId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Không thể cập nhật Series.');
    }
    return res.json();
  },

  async deleteSeries(seriesId: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/series/${seriesId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Không thể xóa Series.');
    }
  },

  async getPresets(seriesId: string): Promise<SeriesPresetDto> {
    const res = await fetch(`${API_URL}/api/series/${seriesId}/presets`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Không thể tải cấu hình Presets của Series.');
    }
    return res.json();
  },

  async updatePresets(seriesId: string, data: UpdateSeriesPresetRequest): Promise<SeriesPresetDto> {
    const res = await fetch(`${API_URL}/api/series/${seriesId}/presets`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Không thể lưu cấu hình Presets.');
    }
    return res.json();
  },

  // ── Typography Presets CRUD (Task 8, NFR-08) ──
  async getTypographyPresets(seriesId: string): Promise<TypographyPresetDto[]> {
    const res = await fetch(`${API_URL}/api/series/${seriesId}/presets`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Không thể tải danh sách Typography Presets.');
    }
    return res.json();
  },

  async createTypographyPreset(
    seriesId: string,
    data: CreateTypographyPresetRequest,
  ): Promise<TypographyPresetDto> {
    const res = await fetch(`${API_URL}/api/series/${seriesId}/presets`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Không thể tạo Typography Preset.');
    }
    return res.json();
  },

  async updateTypographyPreset(
    seriesId: string,
    presetId: string,
    data: UpdateTypographyPresetRequest,
  ): Promise<TypographyPresetDto> {
    const res = await fetch(`${API_URL}/api/series/${seriesId}/presets/${presetId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Không thể cập nhật Typography Preset.');
    }
    return res.json();
  },

  async deleteTypographyPreset(seriesId: string, presetId: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/series/${seriesId}/presets/${presetId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Không thể xóa Typography Preset.');
    }
  },

  // ── Consistency Rules CRUD (Task 9, NFR-08) ──
  async getConsistencyRules(seriesId: string): Promise<ConsistencyRuleDto[]> {
    const res = await fetch(`${API_URL}/api/series/${seriesId}/consistency-rules`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Không thể tải danh sách Consistency Rules.');
    }
    return res.json();
  },

  async createConsistencyRule(
    seriesId: string,
    data: CreateConsistencyRuleRequest,
  ): Promise<ConsistencyRuleDto> {
    const res = await fetch(`${API_URL}/api/series/${seriesId}/consistency-rules`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Không thể tạo Consistency Rule.');
    }
    return res.json();
  },

  async updateConsistencyRule(
    seriesId: string,
    ruleId: string,
    data: UpdateConsistencyRuleRequest,
  ): Promise<ConsistencyRuleDto> {
    const res = await fetch(`${API_URL}/api/series/${seriesId}/consistency-rules/${ruleId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Không thể cập nhật Consistency Rule.');
    }
    return res.json();
  },

  async deleteConsistencyRule(seriesId: string, ruleId: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/series/${seriesId}/consistency-rules/${ruleId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Không thể xóa Consistency Rule.');
    }
  },
};
