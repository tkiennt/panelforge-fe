// src/services/series.service.ts
const API_URL = import.meta.env.VITE_APP_URL;
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
  synopsis?: string;
  readingDirection?: number | string;
  pipelineDefinitionId?: string;
  genre?: string;
  format?: string;
  releaseScheduleJson?: string;
}

export interface UpdateSeriesRequest {
  title: string;
  synopsis?: string;
  readingDirection: number | string;
  pipelineDefinitionId?: string;
  genre?: string;
  format?: string;
  releaseScheduleJson?: string;
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
};
