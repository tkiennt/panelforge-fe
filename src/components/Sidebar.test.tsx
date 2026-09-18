import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from './Sidebar';
import { MangaProject } from '../types';

const mockProject: MangaProject = {
  id: 'proj-1',
  title: 'Chainsaw Exorcist',
  subtitle: 'Arc 01 - Pilot',
  arc: 'Arc 01',
  chapter: 1,
  format: 'B5 Tankobon',
  status: 'In Progress',
  progressPercent: 45,
  completedPages: 9,
  totalPages: 20,
  dueDate: 'Dec 2026',
  daysLeft: 30,
  genres: ['Action', 'Supernatural'],
  coverStyle: 'drifter',
  coverText: 'CHAINSAW',
  tagline: 'Grounded lore',
  lastUpdated: 'Today',
};

describe('Sidebar Component', () => {
  it('hiển thị thông tin dự án hiện tại', () => {
    render(
      <Sidebar
        currentView='dashboard'
        onSelectView={vi.fn()}
        activeProject={mockProject}
        projects={[mockProject]}
        onSelectProject={vi.fn()}
        onReturnToHub={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenHelp={vi.fn()}
        onOpenStorageModal={vi.fn()}
        userRole='ARTIST'
      />,
    );

    expect(screen.getByText('Chainsaw Exorcist')).toBeInTheDocument();
    expect(screen.getByText('Arc 01 - Pilot')).toBeInTheDocument();
  });

  it('hiển thị đúng menu cho vai trò ARTIST và gọi callback onSelectView khi click', async () => {
    const user = userEvent.setup();
    const handleSelectView = vi.fn();

    render(
      <Sidebar
        currentView='dashboard'
        onSelectView={handleSelectView}
        activeProject={mockProject}
        projects={[mockProject]}
        onSelectProject={vi.fn()}
        onReturnToHub={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenHelp={vi.fn()}
        onOpenStorageModal={vi.fn()}
        userRole='ARTIST'
      />,
    );

    expect(screen.getByText('Dashboard (Họa sĩ)')).toBeInTheDocument();
    const workflowBtn = screen.getByText('Workflow Board');
    expect(workflowBtn).toBeInTheDocument();

    await user.click(workflowBtn);
    expect(handleSelectView).toHaveBeenCalledWith('workflow');
  });

  it('hiển thị đúng menu cho vai trò WRITER', () => {
    render(
      <Sidebar
        currentView='script'
        onSelectView={vi.fn()}
        activeProject={mockProject}
        projects={[mockProject]}
        onSelectProject={vi.fn()}
        onReturnToHub={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenHelp={vi.fn()}
        onOpenStorageModal={vi.fn()}
        userRole='WRITER'
      />,
    );

    expect(screen.getByText('Kịch bản & Lời thoại')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard (Họa sĩ)')).not.toBeInTheDocument();
  });

  it('hiển thị đúng menu cho vai trò EDITOR', () => {
    render(
      <Sidebar
        currentView='review'
        onSelectView={vi.fn()}
        activeProject={mockProject}
        projects={[mockProject]}
        onSelectProject={vi.fn()}
        onReturnToHub={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenHelp={vi.fn()}
        onOpenStorageModal={vi.fn()}
        userRole='EDITOR'
      />,
    );

    expect(screen.getByText('Trung tâm Phê duyệt')).toBeInTheDocument();
    expect(screen.getByText('Quản lý Nhân sự')).toBeInTheDocument();
  });
});
