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
      />,
    );

    // Primary dock is rendered
    expect(screen.getByTestId('canva-primary-dock')).toBeInTheDocument();
    expect(screen.getByTestId('canva-tab-pages')).toBeInTheDocument();
    expect(screen.getByTestId('canva-tab-script')).toBeInTheDocument();
    expect(screen.getByTestId('canva-tab-bible')).toBeInTheDocument();

    // Drawer starts closed (w-0) so user sees only the blank paper initially
    const drawer = screen.getByTestId('canva-secondary-drawer');
    expect(drawer).toHaveClass('w-0');
    expect(drawer).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('canva-tab-pages')).toHaveAttribute('aria-expanded', 'false');

    // Clicking Pages tab opens drawer
    fireEvent.click(screen.getByTestId('canva-tab-pages'));
    expect(drawer).toHaveClass('w-[340px]');
    expect(drawer).toHaveAttribute('aria-hidden', 'false');
    expect(screen.getByTestId('canva-tab-pages')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('canva-tab-pages')).toHaveAttribute('aria-pressed', 'true');
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
      />,
    );

    // Click Script tab in dock to open it
    fireEvent.click(screen.getByTestId('canva-tab-script'));

    // Drawer opens and switches to Script
    const drawer = screen.getByTestId('canva-secondary-drawer');
    expect(drawer).toHaveStyle({ width: '400px' });
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
      />,
    );

    // Click Bible tab in dock to open it
    fireEvent.click(screen.getByTestId('canva-tab-bible'));

    // Drawer opens and switches to Bible
    const drawer = screen.getByTestId('canva-secondary-drawer');
    expect(drawer).toHaveClass('w-[340px]');
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
      />,
    );

    const drawer = screen.getByTestId('canva-secondary-drawer');
    expect(drawer).toHaveClass('w-0');

    // Click tab 'pages' -> Drawer opens
    fireEvent.click(screen.getByTestId('canva-tab-pages'));
    expect(drawer).toHaveClass('w-[340px]');

    // Click tab 'pages' again -> Drawer closes (Canva behavior)
    fireEvent.click(screen.getByTestId('canva-tab-pages'));
    expect(drawer).toHaveClass('w-0');

    // Click drawer toggle button at bottom -> Drawer opens back
    fireEvent.click(screen.getByTestId('canva-drawer-toggle'));
    expect(drawer).toHaveClass('w-[340px]');
  });

  it('supports vertical toolbar navigation and closes the drawer with Escape', () => {
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
      />,
    );

    const pagesButton = screen.getByTestId('canva-tab-pages');
    const scriptButton = screen.getByTestId('canva-tab-script');
    const drawer = screen.getByTestId('canva-secondary-drawer');

    pagesButton.focus();
    fireEvent.keyDown(pagesButton, { key: 'ArrowDown' });
    expect(scriptButton).toHaveFocus();

    fireEvent.click(scriptButton);
    expect(drawer).not.toHaveClass('w-0');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(drawer).toHaveClass('w-0');
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
      />,
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

  it('hides add, duplicate, and delete page buttons when canEditPages is false', () => {
    renderWithRouter(
      <ArtistCanvaSidebar
        pages={MOCK_PAGES}
        selectedPageId='page-1'
        canEditPages={false}
        onSelectPage={vi.fn()}
        onAddPage={vi.fn()}
        onDuplicatePage={vi.fn()}
        onDeletePage={vi.fn()}
        onMovePage={vi.fn()}
        onToggleVisibility={vi.fn()}
      />,
    );

    // Open pages drawer
    fireEvent.click(screen.getByTestId('canva-tab-pages'));

    expect(screen.queryByTestId('canva-btn-add-page-header')).not.toBeInTheDocument();
    expect(screen.queryByTitle(/nhân bản trang|duplicate page/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/xóa trang|delete page/i)).not.toBeInTheDocument();
  });

  it('keeps the artist tool drawer on its independent paper theme', () => {
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
      />,
    );

    const sidebar = screen.getByTestId('artist-desk-sidebar');
    expect(sidebar).toHaveAttribute('data-sb-theme', 'paper');
  });

  it('defaults the script reader to the current page and can search the whole chapter', () => {
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
      />,
    );

    // Open Script tab
    fireEvent.click(screen.getByTestId('canva-tab-script'));

    // Verify continuous manuscript container
    expect(screen.getByTestId('canva-script-manuscript-flow')).toBeInTheDocument();
    expect(screen.getByTestId('canva-script-mode-current-page')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('script-panel-section-1-1')).toBeInTheDocument();

    // Search filter across the chapter after opting into the all-chapter mode.
    fireEvent.click(screen.getByTestId('canva-script-mode-all'));
    const searchInput = screen.getByTestId('canva-input-search-script');
    fireEvent.change(searchInput, { target: { value: 'Hắc Long' } });
    expect(screen.getAllByText(/Thanh Hà/i).length).toBeGreaterThan(0);
  });

  it('renders series bible with reference image and turnaround visual notes', () => {
    const customBible = [
      {
        id: 'bible-1',
        name: 'Chiến Thần Viễn Cổ',
        category: 'character' as const,
        tag: 'Huyền thoại',
        description: 'Chiến binh cổ đại mặc chiến giáp hoàng kim.',
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
      />,
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
      />,
    );

    // Open Templates tab
    fireEvent.click(screen.getByTestId('canva-tab-templates'));
    expect(screen.getByTestId('canva-drawer-templates')).toBeInTheDocument();
    expect(screen.getByText('Mẫu Khung Tranh Tham Khảo')).toBeInTheDocument();

    // Select a different template (4-Koma Classic)
    fireEvent.click(screen.getByTestId('canva-template-card-f0000000-0000-0000-0000-00000000000c'));
    expect(handleSelectTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'f0000000-0000-0000-0000-00000000000c', panelCount: 4 }),
    );

    // Search filter
    fireEvent.change(screen.getByTestId('canva-input-search-templates'), {
      target: { value: 'Widescreen' },
    });
    expect(
      screen.getByTestId('canva-template-card-f0000000-0000-0000-0000-00000000000f'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('canva-template-card-f0000000-0000-0000-0000-00000000000c'),
    ).not.toBeInTheDocument();

    // Clear template button works
    fireEvent.click(screen.getByTestId('canva-btn-clear-template'));
    expect(handleClearTemplate).toHaveBeenCalledTimes(1);
  });

  it('allows selecting another template when the page already has panels', () => {
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
        onSelectTemplate={handleSelectTemplate}
      />,
    );

    fireEvent.click(screen.getByTestId('canva-tab-templates'));
    // Status banner is removed to keep template drawer clean
    expect(screen.queryByTestId('canva-layout-locked-banner')).not.toBeInTheDocument();

    // Existing panels never block choosing another template.
    fireEvent.click(screen.getByTestId('canva-template-card-f0000000-0000-0000-0000-00000000000c'));
    expect(handleSelectTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'f0000000-0000-0000-0000-00000000000c' }),
    );
  });

  it('renders Sidetab Changes (Tab 5) with badge counter, filters, and resolve actions', () => {
    const handleResolve = vi.fn();
    const handleNavigate = vi.fn();

    const mockCRs = [
      {
        id: 'cr-1',
        assignmentId: 'assign-1',
        chapterId: 'chap-1',
        responsibleUserId: 'user-1',
        createdByUserId: 'editor-1',
        description: 'Vẽ lại góc nghiêng thanh kiếm của nhân vật chính ở khung 2',
        status: 'Open' as const,
        reviewerComment: 'Góc kiếm hiện tại che mất biểu cảm gương mặt',
        pageId: 'page-1',
        createdAt: '2026-11-10T10:00:00Z',
      },
      {
        id: 'cr-2',
        assignmentId: 'assign-1',
        chapterId: 'chap-1',
        responsibleUserId: 'user-1',
        createdByUserId: 'editor-1',
        description: 'Bổ sung hiệu ứng tốc độ',
        status: 'Resolved' as const,
        resolutionNote: 'Đã thêm các đường speed lines ở mép phải khung',
        createdAt: '2026-11-10T09:00:00Z',
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
        changeRequests={mockCRs}
        onResolveChangeRequest={handleResolve}
        onNavigateToChangeRequestTarget={handleNavigate}
      />,
    );

    // Badge counter shows 1 open request
    expect(screen.getByTestId('changes-badge-counter')).toHaveTextContent('1');

    // Click tab changes to open drawer
    fireEvent.click(screen.getByTestId('canva-tab-changes'));
    expect(screen.getByTestId('canva-drawer-changes')).toBeInTheDocument();
    expect(
      screen.getByText('Vẽ lại góc nghiêng thanh kiếm của nhân vật chính ở khung 2'),
    ).toBeInTheDocument();

    // Click "Xem vị trí" triggers onNavigateToChangeRequestTarget
    fireEvent.click(screen.getByTestId('btn-navigate-cr-cr-1'));
    expect(handleNavigate).toHaveBeenCalledWith(mockCRs[0]);
    // Yêu cầu không gắn trang / khung: không hiện "Xem vị trí"
    expect(screen.queryByTestId('btn-navigate-cr-cr-2')).toBeNull();

    // Inline artist resolution note textarea is rendered directly in open cards (Stitch design)
    const input = screen.getByPlaceholderText('Ghi chú đã sửa của Họa sĩ...');
    expect(input).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'Đã xoay góc kiếm 15 độ' } });
    fireEvent.click(screen.getByTestId('btn-resolve-cr-cr-1'));
    expect(handleResolve).toHaveBeenCalledWith('cr-1', 'Đã xoay góc kiếm 15 độ');
  });

  it('renders mark number badge for a card whose id is in markNumberById', () => {
    const mockCRs = [
      {
        id: 'cr-1',
        assignmentId: 'assign-1',
        chapterId: 'chap-1',
        responsibleUserId: 'user-1',
        createdByUserId: 'editor-1',
        description: 'Vẽ lại góc nghiêng thanh kiếm',
        status: 'Open' as const,
        createdAt: '2026-11-10T10:00:00Z',
      },
      {
        id: 'cr-2',
        assignmentId: 'assign-1',
        chapterId: 'chap-1',
        responsibleUserId: 'user-1',
        createdByUserId: 'editor-1',
        description: 'Bổ sung hiệu ứng tốc độ',
        status: 'Open' as const,
        createdAt: '2026-11-10T09:00:00Z',
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
        changeRequests={mockCRs}
        markNumberById={{ 'cr-1': 1 }}
      />,
    );

    fireEvent.click(screen.getByTestId('canva-tab-changes'));

    const card1 = screen.getByTestId('change-request-card-cr-1');
    const card2 = screen.getByTestId('change-request-card-cr-2');

    expect(card1).toHaveTextContent('1');
    expect(screen.getByTestId('cr-mark-number-cr-1')).toHaveTextContent('1');
    expect(card2).not.toHaveTextContent('1');
    expect(screen.queryByTestId('cr-mark-number-cr-2')).toBeNull();
  });

  it('renders History Drawer (Tab 6) as compact drawer with timeline and restore action', () => {
    const handleRestore = vi.fn();
    const handleRefresh = vi.fn();

    const mockHistory = {
      pageId: 'page-1',
      currentVersion: 3,
      page: 1,
      pageSize: 50,
      totalCount: 3,
      items: [
        {
          version: 3,
          eventType: 'CanvasUpdated',
          occurredAtUtc: '2026-11-10T10:00:00Z',
          summary: 'Cập nhật canvas',
        },
        {
          version: 2,
          eventType: 'ElementAdded',
          occurredAtUtc: '2026-11-10T09:30:00Z',
          summary: 'Thêm đối tượng',
        },
        {
          version: 1,
          eventType: 'PageCreated',
          occurredAtUtc: '2026-11-10T09:00:00Z',
          summary: 'Khởi tạo trang',
        },
      ],
    };

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
        pageHistory={mockHistory}
        onRestoreVersion={handleRestore}
        onRefreshHistory={handleRefresh}
      />,
    );

    // Click History tab
    fireEvent.click(screen.getByTestId('canva-tab-history'));
    const drawer = screen.getByTestId('canva-secondary-drawer');
    // Compact drawer width
    expect(drawer).toHaveClass('w-[340px]');

    expect(screen.getByTestId('canva-drawer-history')).toBeInTheDocument();
    expect(screen.getByTestId('history-entry-v3')).toHaveTextContent('v3');
    expect(screen.getByText('Hiện hành')).toBeInTheDocument();

    // v2 has "Khôi phục bản này"
    const restoreBtnV2 = screen.getByTestId('btn-restore-v2');
    fireEvent.click(restoreBtnV2);
    // Confirm prompt appears
    expect(screen.getByText('Khôi phục về v2?')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('btn-confirm-restore-v2'));
    expect(handleRestore).toHaveBeenCalledWith(2);

    // Refresh button
    fireEvent.click(screen.getByTestId('btn-refresh-history'));
    expect(handleRefresh).toHaveBeenCalledTimes(1);
  });

  it('truyền letteringReadOnly={true} xuống LetteringScriptPanel khi mở tab lettering', () => {
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
        activeTab='lettering'
        isDrawerOpen={true}
        letteringReadOnly={true}
        scriptLines={[
          {
            id: 'line-1',
            pageNumber: 1,
            dialogueText: 'Xin chào',
          },
        ]}
      />,
    );

    expect(screen.getByTestId('canva-drawer-lettering')).toBeInTheDocument();
    const line = screen.getByTestId('lettering-script-line-line-1');
    expect(line).toHaveAttribute('draggable', 'false');
    expect(screen.getByTestId('lettering-drag-speech')).toBeDisabled();
  });
});
