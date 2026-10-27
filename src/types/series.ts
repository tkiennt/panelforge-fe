export type ViewMode = 'dashboard' | 'workflow' | 'bible' | 'members' | 'publications';

export type WorkflowSubView = 'board' | 'list' | 'grid';

export interface MangaProject {
  id: string;
  title: string;
  subtitle: string;
  arc: string;
  chapter: number;
  format: string;
  status: string;
  progressPercent: number;
  completedPages: number;
  totalPages: number;
  dueDate: string;
  daysLeft: number;
  genres: string[];
  coverStyle: 'halftone-cyber' | 'drifter' | 'valkyrie' | 'chrono';
  coverText: string;
  tagline: string;
  lastUpdated: string;
  coverImage?: string;
}

export type {
  StageBreakdownDto,
  ChapterProgressDto,
  WorkloadDto,
  OverdueAssignmentDto,
  OverdueChangeRequestDto,
  BurndownPointDto,
  SeriesProgressDto,
} from '@/services/series.service';
