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
  isLocked?: boolean;
  priceVnd?: number;
}

export interface PublisherLatestChapterDto {
  chapterId: string;
  chapterNumber: number;
  title?: string | null;
  status: string;
  updatedAt?: string | null;
}

export interface PublisherSeriesListItemDto {
  seriesId: string;
  id: string;
  title: string;
  coverImageUrl?: string | null;
  coverUrl?: string | null;
  status: 'Ongoing' | 'Completed' | string;
  genres: string[];
  genre: string;
  ageRating: string;
  synopsis?: string | null;
  workspaceId: string;
  workspaceName: string;
  totalChaptersCount: number;
  approvedChaptersCount: number;
  publishedChaptersCount: number;
  latestChapter?: PublisherLatestChapterDto | null;
  updatedAt?: string | null;
  format?: string;
  readingDirection?: string | number;
}

// Alias for backwards compatibility
export type PublisherSeriesDto = PublisherSeriesListItemDto;

export interface PublisherManagedChapterDto {
  chapterId: string;
  id: string;
  chapterNumber: number;
  title?: string | null;
  status: 'InProduction' | 'Approved' | 'Published' | string;
  publishAt?: string | null;
  publishedAt?: string | null;
  pageCount: number;
  pagesCount: number;
  approvedAt?: string | null;
  approvedBy?: string | null;
  isLocked?: boolean;
  priceVnd?: number;
}

export interface PublisherSeriesDetailDto {
  seriesId: string;
  id: string;
  title: string;
  coverImageUrl?: string | null;
  coverUrl?: string | null;
  workspaceId: string;
  workspaceName: string;
  producerName?: string | null;
  genres: string[];
  genre: string;
  ageRating: string;
  status: string;
  logline?: string | null;
  synopsis?: string | null;
  chapters: PublisherManagedChapterDto[];
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
    filter?: string;
    workspaceId?: string;
    search?: string;
    sortBy?: string;
  }): Promise<PublisherSeriesListItemDto[]> => {
    const res = await axiosClient.get<PublisherSeriesListItemDto[]>('/publisher/series', {
      params,
    });
    return res.data;
  },

  getSeriesDetail: async (seriesId: string): Promise<PublisherSeriesDetailDto> => {
    const res = await axiosClient.get<PublisherSeriesDetailDto>(`/publisher/series/${seriesId}`);
    return res.data;
  },

  getWorkspaces: async (): Promise<PublisherWorkspaceDto[]> => {
    const res = await axiosClient.get<PublisherWorkspaceDto[]>('/publisher/workspaces');
    return res.data;
  },
};
