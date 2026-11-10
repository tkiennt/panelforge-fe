import axiosClient from '../api/axiosClient';

export interface PublisherChapterDto {
  id: string;
  seriesId: string;
  seriesTitle: string;
  workspaceId: string;
  workspaceName: string;
  chapterNumber: number;
  title?: string | null;
  targetReleaseDate?: string | null;
  versionVector: number;
  createdAt: string;
  updatedAt?: string | null;
  createdBy?: string | null;
  scenesCount: number;
  pagesCount: number;
  status: 'InProduction' | 'Approved' | 'Published';
  publishedAt?: string | null;
  outline?: string | null;
  isScriptFrozen?: boolean;
  scriptFrozenAt?: string | null;
  scriptFrozenById?: string | null;
  scriptReopenStatus?: number;
  scriptReopenReason?: string | null;
  coverUrl?: string | null;
  scriptContentHash?: string | null;
}

export interface PublisherSeriesDto {
  id: string;
  workspaceId: string;
  workspaceName: string;
  title: string;
  synopsis?: string | null;
  genre: string;
  format: string;
  readingDirection: string | number;
  coverUrl?: string | null;
  totalChaptersCount: number;
  approvedChaptersCount: number;
  publishedChaptersCount: number;
  updatedAt?: string | null;
}

export interface PublisherWorkspaceDto {
  id: string;
  name: string;
  seriesCount: number;
  approvedChaptersCount: number;
}

export interface PublisherChaptersResponse {
  items: PublisherChapterDto[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}

export const publisherService = {
  getChapters: async (params?: {
    status?: string;
    workspaceId?: string;
    seriesId?: string;
    search?: string;
    pageIndex?: number;
    pageSize?: number;
  }): Promise<PublisherChaptersResponse> => {
    const res = await axiosClient.get<PublisherChaptersResponse>('/publisher/chapters', {
      params,
    });
    return res.data;
  },

  getSeries: async (params?: {
    workspaceId?: string;
    search?: string;
  }): Promise<PublisherSeriesDto[]> => {
    const res = await axiosClient.get<PublisherSeriesDto[]>('/publisher/series', {
      params,
    });
    return res.data;
  },

  getWorkspaces: async (): Promise<PublisherWorkspaceDto[]> => {
    const res = await axiosClient.get<PublisherWorkspaceDto[]>('/publisher/workspaces');
    return res.data;
  },
};

