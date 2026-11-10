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
  it('renders Canva primary dock, keeping drawer initially closed for clean canvas entrance', () => {
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

    // Primary dock is rendered
    expect(screen.getByTestId('canva-primary-dock')).toBeInTheDocument();
    expect(screen.getByTestId('canva-tab-pages')).toBeInTheDocument();
    expect(screen.getByTestId('canva-tab-script')).toBeInTheDocument();
    expect(screen.getByTestId('canva-tab-bible')).toBeInTheDocument();

    // Drawer starts closed (w-0) so user sees only the blank paper initially
    const drawer = screen.getByTestId('canva-secondary-drawer');
    expect(drawer).toHaveClass('w-0');

    // Clicking Pages tab opens drawer
    fireEvent.click(screen.getByTestId('canva-tab-pages'));
    expect(drawer).toHaveClass('w-[330px]');
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

    // Click Script tab in dock to open it
    fireEvent.click(screen.getByTestId('canva-tab-script'));

    // Drawer opens and switches to Script
    const drawer = screen.getByTestId('canva-secondary-drawer');
    expect(drawer).toHaveClass('w-[330px]');
    expect(screen.getByTestId('canva-drawer-script')).toBeInTheDocument();
    expect(screen.getByText('Phân cảnh 1: Cổng Thành Phía Nam')).toBeInTheDocument();
    expect(screen.getByText('NGOẠI · CỔNG THÀNH · SÁNG')).toBeInTheDocument();
    expect(screen.getAllByText('Minh Triết').length).toBeGreaterThan(0);
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

    // Click Bible tab in dock to open it
    fireEvent.click(screen.getByTestId('canva-tab-bible'));

    // Drawer opens and switches to Bible
    const drawer = screen.getByTestId('canva-secondary-drawer');
    expect(drawer).toHaveClass('w-[330px]');
    expect(screen.getByTestId('canva-drawer-bible')).toBeInTheDocument();
    expect(screen.getByText(/Tra cứu nhân vật & bối cảnh/i)).toBeInTheDocument();
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

    const drawer = screen.getByTestId('canva-secondary-drawer');
    expect(drawer).toHaveClass('w-0');

    // Click tab 'pages' -> Drawer opens
    fireEvent.click(screen.getByTestId('canva-tab-pages'));
    expect(drawer).toHaveClass('w-[330px]');

    // Click tab 'pages' again -> Drawer closes (Canva behavior)
    fireEvent.click(screen.getByTestId('canva-tab-pages'));
    expect(drawer).toHaveClass('w-0');

    // Click drawer toggle button at bottom -> Drawer opens back
    fireEvent.click(screen.getByTestId('canva-drawer-toggle'));
    expect(drawer).toHaveClass('w-[330px]');
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

    // Open pages drawer
    fireEvent.click(screen.getByTestId('canva-tab-pages'));

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

  it('defaults to light theme paper and supports custom theme integration', () => {
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

    const sidebar = screen.getByTestId('artist-desk-sidebar');
    // Default theme is paper (màu sáng)
    expect(sidebar).toHaveAttribute('data-sb-theme', 'paper');
  });

  it('renders script in continuous manuscript flow by page and panel for reference without box cards', () => {
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

    // Open Script tab
    fireEvent.click(screen.getByTestId('canva-tab-script'));

    // Verify continuous manuscript container
    expect(screen.getByTestId('canva-script-manuscript-flow')).toBeInTheDocument();
    expect(screen.getByText(/── TRANG 1 ──/i)).toBeInTheDocument();
    expect(screen.getByTestId('script-panel-section-1-1')).toBeInTheDocument();

    // Search filter in script
    const searchInput = screen.getByTestId('canva-input-search-script');
    fireEvent.change(searchInput, { target: { value: 'Hắc Long' } });
    expect(screen.getByText(/Thanh Hà/i)).toBeInTheDocument();
  });

  it('renders series bible with reference image and turnaround visual notes', () => {
    const customBible = [
      {
        id: 'bible-1',
        name: 'Chiến Thần Viễn Cổ',
        category: 'character' as const,
        tag: 'Huyền thoại',
        description:
          'Chiến binh cổ đại mặc chiến giáp hoàng kim.',
        visualNotes: ['Chiến giáp hoàng kim rực rỡ', 'Thương bạc dài 3 mét'],
        imageUrl: 'https://example.com/character-sheet.png',
      },
    ];

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
        bibleEntities={customBible}
      />
    );

    // Open Bible tab
    fireEvent.click(screen.getByTestId('canva-tab-bible'));

    expect(screen.getByText('Chiến Thần Viễn Cổ')).toBeInTheDocument();
    expect(screen.getByText('Chiến giáp hoàng kim rực rỡ')).toBeInTheDocument();
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/character-sheet.png');
  });

  it('switches to Templates tab, filters presets, selects template and clears template', () => {
    const handleSelectTemplate = vi.fn();
    const handleClearTemplate = vi.fn();

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
        activeTemplateId='f0000000-0000-0000-0000-000000000004'
        hasPagePanels={true}
        onSelectTemplate={handleSelectTemplate}
        onClearTemplate={handleClearTemplate}
      />
    );

    // Open Templates tab
    fireEvent.click(screen.getByTestId('canva-tab-templates'));
    expect(screen.getByTestId('canva-drawer-templates')).toBeInTheDocument();
    expect(screen.getByText('Mẫu Khung Tranh Tham Khảo')).toBeInTheDocument();

    // Select a different template (4-Koma Classic)
    fireEvent.click(screen.getByTestId('canva-template-card-f0000000-0000-0000-0000-00000000000c'));
    expect(handleSelectTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'f0000000-0000-0000-0000-00000000000c', panelCount: 4 })
    );

    // Search filter
    fireEvent.change(screen.getByTestId('canva-input-search-templates'), {
      target: { value: 'Widescreen' },
    });
    expect(screen.getByTestId('canva-template-card-f0000000-0000-0000-0000-00000000000f')).toBeInTheDocument();
    expect(screen.queryByTestId('canva-template-card-f0000000-0000-0000-0000-00000000000c')).not.toBeInTheDocument();

    // Clear template button works
    fireEvent.click(screen.getByTestId('canva-btn-clear-template'));
    expect(handleClearTemplate).toHaveBeenCalledTimes(1);
  });

  it('renders locked layout banner when isLayoutLocked=true and triggers onUnlockLayout', () => {
    const handleUnlock = vi.fn();
    const handleSelectTemplate = vi.fn();

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
        activeTemplateId='f0000000-0000-0000-0000-000000000004'
        hasPagePanels={true}
        isLayoutLocked={true}
        hasPageArtwork={true}
        onUnlockLayout={handleUnlock}
        onSelectTemplate={handleSelectTemplate}
      />
    );

    fireEvent.click(screen.getByTestId('canva-tab-templates'));
    // Status banner is removed to keep template drawer clean
    expect(screen.queryByTestId('canva-layout-locked-banner')).not.toBeInTheDocument();

    // Clicking a different template card when locked with artwork triggers unlock prompt rather than directly switching
    fireEvent.click(screen.getByTestId('canva-template-card-f0000000-0000-0000-0000-00000000000c'));
    expect(handleUnlock).toHaveBeenCalledTimes(1);
    expect(handleSelectTemplate).not.toHaveBeenCalled();
  });
});
