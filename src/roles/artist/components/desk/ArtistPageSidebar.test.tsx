import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArtistPageSidebar, ArtistPageItem } from './ArtistPageSidebar';

const MOCK_PAGES: ArtistPageItem[] = [
  {
    id: 'page-1',
    pageNumber: 1,
    title: 'Cổng Thành Phía Nam',
    stage: 'pencil',
    panelsCount: 4,
    format: 'B5 Master',
    isVisible: true,
  },
  {
    id: 'page-2',
    pageNumber: 2,
    title: 'Cơn Bão Cát',
    stage: 'ink',
    panelsCount: 5,
    format: 'B5 Master',
    isVisible: true,
  },
  {
    id: 'page-3',
    pageNumber: 3,
    title: 'Hội Ngộ',
    stage: 'lettering',
    panelsCount: 3,
    format: 'B5 Master',
    isVisible: false,
  },
];

describe('ArtistPageSidebar - Photoshop-style Pages Panel', () => {
  it('renders expanded Photoshop sidebar with tabs, pages list, and footer toolbar', () => {
    const handleSelect = vi.fn();
    const handleAdd = vi.fn();
    const handleDuplicate = vi.fn();
    const handleDelete = vi.fn();
    const handleMove = vi.fn();
    const handleToggleVis = vi.fn();
    const handleToggleCollapse = vi.fn();

    render(
      <ArtistPageSidebar
        pages={MOCK_PAGES}
        selectedPageId='page-1'
        onSelectPage={handleSelect}
        onAddPage={handleAdd}
        onDuplicatePage={handleDuplicate}
        onDeletePage={handleDelete}
        onMovePage={handleMove}
        onToggleVisibility={handleToggleVis}
        isCollapsed={false}
        onToggleCollapse={handleToggleCollapse}
      />,
    );

    // Sidebar exists
    expect(screen.getByTestId('artist-page-sidebar')).toBeInTheDocument();

    // Tab Header
    expect(screen.getByText('QUẢN LÝ TRANG')).toBeInTheDocument();
    expect(screen.getByTestId('btn-collapse-sidebar')).toBeInTheDocument();

    // Search and filters exist
    expect(screen.getByTestId('input-search-pages')).toBeInTheDocument();
    expect(screen.getByTestId('filter-stage-all')).toBeInTheDocument();
    expect(screen.getByTestId('filter-stage-pencil')).toBeInTheDocument();
    expect(screen.getByTestId('filter-stage-ink')).toBeInTheDocument();

    // Page cards exist
    expect(screen.getByTestId('page-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('page-card-2')).toBeInTheDocument();
    expect(screen.getByTestId('page-card-3')).toBeInTheDocument();

    // Footer actions exist
    expect(screen.getByTestId('btn-footer-add-page')).toBeInTheDocument();
    expect(screen.getByTestId('btn-footer-duplicate')).toBeInTheDocument();
    expect(screen.getByTestId('btn-footer-move-up')).toBeInTheDocument();
    expect(screen.getByTestId('btn-footer-move-down')).toBeInTheDocument();
    expect(screen.getByTestId('btn-footer-delete')).toBeInTheDocument();
  });

  it('handles selecting, adding, duplicating and deleting pages', () => {
    const handleSelect = vi.fn();
    const handleAdd = vi.fn();
    const handleDuplicate = vi.fn();
    const handleDelete = vi.fn();
    const handleMove = vi.fn();
    const handleToggleVis = vi.fn();
    const handleToggleCollapse = vi.fn();

    render(
      <ArtistPageSidebar
        pages={MOCK_PAGES}
        selectedPageId='page-1'
        onSelectPage={handleSelect}
        onAddPage={handleAdd}
        onDuplicatePage={handleDuplicate}
        onDeletePage={handleDelete}
        onMovePage={handleMove}
        onToggleVisibility={handleToggleVis}
        isCollapsed={false}
        onToggleCollapse={handleToggleCollapse}
      />,
    );

    // Click on Page 2
    fireEvent.click(screen.getByTestId('page-card-2'));
    expect(handleSelect).toHaveBeenCalledWith('page-2');

    // Click Add Page in footer
    fireEvent.click(screen.getByTestId('btn-footer-add-page'));
    expect(handleAdd).toHaveBeenCalledTimes(1);

    // Click Duplicate in footer
    fireEvent.click(screen.getByTestId('btn-footer-duplicate'));
    expect(handleDuplicate).toHaveBeenCalledWith('page-1');

    // Click Delete in footer
    fireEvent.click(screen.getByTestId('btn-footer-delete'));
    expect(handleDelete).toHaveBeenCalledWith('page-1');

    // Click Eye toggle on Page 1
    fireEvent.click(screen.getByTestId('btn-eye-1'));
    expect(handleToggleVis).toHaveBeenCalledWith('page-1');
  });

  it('filters pages by stage chips', () => {
    render(
      <ArtistPageSidebar
        pages={MOCK_PAGES}
        selectedPageId='page-1'
        onSelectPage={vi.fn()}
        onAddPage={vi.fn()}
        onDuplicatePage={vi.fn()}
        onDeletePage={vi.fn()}
        onMovePage={vi.fn()}
        onToggleVisibility={vi.fn()}
        isCollapsed={false}
        onToggleCollapse={vi.fn()}
      />,
    );

    // Filter to ink stage
    fireEvent.click(screen.getByTestId('filter-stage-ink'));
    expect(screen.queryByTestId('page-card-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('page-card-2')).toBeInTheDocument();
    expect(screen.queryByTestId('page-card-3')).not.toBeInTheDocument();

    // Back to all
    fireEvent.click(screen.getByTestId('filter-stage-all'));
    expect(screen.getByTestId('page-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('page-card-2')).toBeInTheDocument();
    expect(screen.getByTestId('page-card-3')).toBeInTheDocument();
  });

  it('switches view mode to compact list and searches pages', () => {
    render(
      <ArtistPageSidebar
        pages={MOCK_PAGES}
        selectedPageId='page-1'
        onSelectPage={vi.fn()}
        onAddPage={vi.fn()}
        onDuplicatePage={vi.fn()}
        onDeletePage={vi.fn()}
        onMovePage={vi.fn()}
        onToggleVisibility={vi.fn()}
        isCollapsed={false}
        onToggleCollapse={vi.fn()}
      />,
    );

    // Switch to compact view
    fireEvent.click(screen.getByTestId('btn-view-compact'));
    expect(screen.getByTestId('page-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('page-row-2')).toBeInTheDocument();

    // Search for "Bão"
    fireEvent.change(screen.getByTestId('input-search-pages'), {
      target: { value: 'Bão' },
    });
    expect(screen.queryByTestId('page-row-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('page-row-2')).toBeInTheDocument();
  });

  it('renders collapsed dock mode when isCollapsed is true and allows expanding', () => {
    const handleToggleCollapse = vi.fn();
    const handleAdd = vi.fn();

    render(
      <ArtistPageSidebar
        pages={MOCK_PAGES}
        selectedPageId='page-1'
        onSelectPage={vi.fn()}
        onAddPage={handleAdd}
        onDuplicatePage={vi.fn()}
        onDeletePage={vi.fn()}
        onMovePage={vi.fn()}
        onToggleVisibility={vi.fn()}
        isCollapsed={true}
        onToggleCollapse={handleToggleCollapse}
      />,
    );

    // Collapsed sidebar exists
    expect(screen.getByTestId('artist-page-sidebar-collapsed')).toBeInTheDocument();
    expect(screen.getByTestId('mini-page-btn-1')).toBeInTheDocument();
    expect(screen.getByTestId('mini-page-btn-2')).toBeInTheDocument();

    // Click expand
    fireEvent.click(screen.getByTestId('btn-expand-sidebar'));
    expect(handleToggleCollapse).toHaveBeenCalledTimes(1);

    // Quick add in collapsed mode
    fireEvent.click(screen.getByTestId('btn-add-page-collapsed'));
    expect(handleAdd).toHaveBeenCalledTimes(1);
  });
});
