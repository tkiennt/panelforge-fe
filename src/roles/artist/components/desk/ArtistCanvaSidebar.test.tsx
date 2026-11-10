import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ArtistCanvaSidebar } from './ArtistCanvaSidebar';
import { ArtistPageItem } from './ArtistPageSidebar';

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
];

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe('ArtistCanvaSidebar - Canva-style Navigation & Multi-Tab Drawer', () => {
  it('renders Canva primary dock with Pages, Script, and Bible tabs', () => {
    renderWithRouter(
      <ArtistCanvaSidebar
        pages={MOCK_PAGES}
        selectedPageId='page-1'
        onSelectPage={vi.fn()}
        onAddPage={vi.fn()}
        onDuplicatePage={vi.fn()}
        onDeletePage={vi.fn()}
        onMovePage={vi.fn()}
        onToggleVisibility={vi.fn()}
      />
    );

    // Primary dock
    expect(screen.getByTestId('canva-primary-dock')).toBeInTheDocument();
    expect(screen.getByTestId('canva-tab-pages')).toBeInTheDocument();
    expect(screen.getByTestId('canva-tab-script')).toBeInTheDocument();
    expect(screen.getByTestId('canva-tab-bible')).toBeInTheDocument();

    // Default active tab is Pages
    expect(screen.getByTestId('canva-secondary-drawer')).toBeInTheDocument();
    expect(screen.getByTestId('canva-drawer-pages')).toBeInTheDocument();
    expect(screen.getByText('Quản Lý Trang (2)')).toBeInTheDocument();
  });

  it('switches to Script tab and displays scene slugline, character dialogue and stage directions', () => {
    renderWithRouter(
      <ArtistCanvaSidebar
        pages={MOCK_PAGES}
        selectedPageId='page-1'
        onSelectPage={vi.fn()}
        onAddPage={vi.fn()}
        onDuplicatePage={vi.fn()}
        onDeletePage={vi.fn()}
        onMovePage={vi.fn()}
        onToggleVisibility={vi.fn()}
      />
    );

    // Click Script tab in dock
    fireEvent.click(screen.getByTestId('canva-tab-script'));

    // Drawer switches to Script
    expect(screen.getByTestId('canva-drawer-script')).toBeInTheDocument();
    expect(screen.getByText('Phân cảnh 1: Cổng Thành Phía Nam')).toBeInTheDocument();
    expect(screen.getByText('NGOẠI · CỔNG THÀNH · SÁNG')).toBeInTheDocument();
    expect(screen.getByText('Minh Triết')).toBeInTheDocument();
  });

  it('switches to Series Bible tab and displays character and location lore cards', () => {
    renderWithRouter(
      <ArtistCanvaSidebar
        pages={MOCK_PAGES}
        selectedPageId='page-1'
        onSelectPage={vi.fn()}
        onAddPage={vi.fn()}
        onDuplicatePage={vi.fn()}
        onDeletePage={vi.fn()}
        onMovePage={vi.fn()}
        onToggleVisibility={vi.fn()}
      />
    );

    // Click Bible tab in dock
    fireEvent.click(screen.getByTestId('canva-tab-bible'));

    // Drawer switches to Bible
    expect(screen.getByTestId('canva-drawer-bible')).toBeInTheDocument();
    expect(screen.getByText(/Tra Cứu Nhân Vật & Bối Cảnh Canon/i)).toBeInTheDocument();
    expect(screen.getByText('Minh Triết (Nhân vật chính)')).toBeInTheDocument();
    expect(screen.getByText('Cổng Thành Phía Nam (Nam Môn Quan)')).toBeInTheDocument();
  });

  it('toggles drawer collapse when clicking active tab again or drawer toggle button', () => {
    renderWithRouter(
      <ArtistCanvaSidebar
        pages={MOCK_PAGES}
        selectedPageId='page-1'
        onSelectPage={vi.fn()}
        onAddPage={vi.fn()}
        onDuplicatePage={vi.fn()}
        onDeletePage={vi.fn()}
        onMovePage={vi.fn()}
        onToggleVisibility={vi.fn()}
      />
    );

    // Drawer is initially open
    expect(screen.getByTestId('canva-secondary-drawer')).toBeInTheDocument();

    // Click active tab 'pages' again -> Drawer closes (Canva behavior)
    fireEvent.click(screen.getByTestId('canva-tab-pages'));
    expect(screen.queryByTestId('canva-secondary-drawer')).not.toBeInTheDocument();

    // Click drawer toggle button at bottom -> Drawer opens back
    fireEvent.click(screen.getByTestId('canva-drawer-toggle'));
    expect(screen.getByTestId('canva-secondary-drawer')).toBeInTheDocument();
  });

  it('handles page selection, addition, and eye visibility toggle', () => {
    const handleSelect = vi.fn();
    const handleAdd = vi.fn();
    const handleToggleVis = vi.fn();

    renderWithRouter(
      <ArtistCanvaSidebar
        pages={MOCK_PAGES}
        selectedPageId='page-1'
        onSelectPage={handleSelect}
        onAddPage={handleAdd}
        onDuplicatePage={vi.fn()}
        onDeletePage={vi.fn()}
        onMovePage={vi.fn()}
        onToggleVisibility={handleToggleVis}
      />
    );

    // Select Page 2
    fireEvent.click(screen.getByTestId('canva-page-card-2'));
    expect(handleSelect).toHaveBeenCalledWith('page-2');

    // Add page
    fireEvent.click(screen.getByTestId('canva-btn-add-page-header'));
    expect(handleAdd).toHaveBeenCalledTimes(1);

    // Toggle eye on Page 1
    fireEvent.click(screen.getByTestId('canva-btn-eye-1'));
    expect(handleToggleVis).toHaveBeenCalledWith('page-1');
  });

  it('supports custom theme integration with system sidebar theme', () => {
    renderWithRouter(
      <ArtistCanvaSidebar
        pages={MOCK_PAGES}
        selectedPageId='page-1'
        onSelectPage={vi.fn()}
        onAddPage={vi.fn()}
        onDuplicatePage={vi.fn()}
        onDeletePage={vi.fn()}
        onMovePage={vi.fn()}
        onToggleVisibility={vi.fn()}
        theme='paper'
      />
    );

    const sidebar = screen.getByTestId('artist-desk-sidebar');
    expect(sidebar).toHaveAttribute('data-sb-theme', 'paper');
  });
});
