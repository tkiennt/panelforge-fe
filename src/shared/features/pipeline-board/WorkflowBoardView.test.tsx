import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkflowBoardView } from './WorkflowBoardView';
import { MangaProject, KanbanCard } from '@/types';

const mockProject: MangaProject = {
  id: 'proj-1',
  title: 'Ghost Protocol: Sector 9',
  subtitle: 'Studio Mappa',
  arc: 'Arc 01',
  chapter: 1,
  format: 'B5 Tankobon',
  status: 'Pre-Production',
  progressPercent: 20,
  completedPages: 4,
  totalPages: 24,
  dueDate: 'Jan 2027',
  daysLeft: 45,
  genres: ['Cyberpunk'],
  coverStyle: 'halftone-cyber',
  coverText: 'GHOST PROTOCOL',
  tagline: 'Pilot Draft',
  lastUpdated: 'Just now',
};

const mockCards: KanbanCard[] = [
  {
    id: 'card-1',
    pageNumber: 'Page 01',
    title: 'Cyberpunk Rooftop Encounter',
    stage: 'script',
    assignee: 'Kenji S.',
    assigneeRole: 'Writer',
    assigneeInitials: 'KS',
    avatarBg: 'bg-emerald-600',
    pageType: 'Spread',
    dueText: 'Tomorrow',
    tags: ['dialogue'],
  },
  {
    id: 'card-2',
    pageNumber: 'Page 02',
    title: 'Mecha Awakening Sequence',
    stage: 'pencil',
    assignee: 'Yuki M.',
    assigneeRole: 'Artist',
    assigneeInitials: 'YM',
    avatarBg: 'bg-amber-600',
    pageType: 'Action',
    dueText: 'In 3 days',
    tags: ['action', 'climax'],
  },
];

describe('WorkflowBoardView Component', () => {
  it('render đầy đủ 8 cột giai đoạn Kanban', () => {
    render(
      <WorkflowBoardView
        activeProject={mockProject}
        cards={mockCards}
        onUpdateCardStage={vi.fn()}
        onOpenCardDetails={vi.fn()}
        onOpenExportModal={vi.fn()}
        onOpenNewCardModal={vi.fn()}
        onShowToast={vi.fn()}
      />,
    );

    expect(screen.getAllByText(/1\. Script/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/2\. Thumbnail/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/3\. Pencil/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/4\. Ink/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/5\. Color/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/6\. Letter/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/7\. Review/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/8\. Approved/i).length).toBeGreaterThanOrEqual(1);
  });

  it('hiển thị đúng các thẻ trang truyện và tiêu đề của chúng', () => {
    render(
      <WorkflowBoardView
        activeProject={mockProject}
        cards={mockCards}
        onUpdateCardStage={vi.fn()}
        onOpenCardDetails={vi.fn()}
        onOpenExportModal={vi.fn()}
        onOpenNewCardModal={vi.fn()}
        onShowToast={vi.fn()}
      />,
    );

    expect(screen.getByText('Page 01')).toBeInTheDocument();
    expect(screen.getByText('Cyberpunk Rooftop Encounter')).toBeInTheDocument();
    expect(screen.getByText('Page 02')).toBeInTheDocument();
    expect(screen.getByText('Mecha Awakening Sequence')).toBeInTheDocument();
  });
});
