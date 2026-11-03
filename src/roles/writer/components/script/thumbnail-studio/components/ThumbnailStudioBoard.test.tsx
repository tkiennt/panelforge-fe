// src/roles/writer/components/script/thumbnail-studio/components/ThumbnailStudioBoard.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ThumbnailStudioBoard } from './ThumbnailStudioBoard';
import { useComicStudioStore, DEFAULT_DEMO_SCRIPT } from '../store/useComicStudioStore';
import { parseComicScript } from '../lib/comicScriptParser';
import { SceneDetailDto } from '@/services/scriptLine.service';

describe('ThumbnailStudioBoard Component', () => {
  beforeEach(() => {
    useComicStudioStore.setState({
      rawScript: DEFAULT_DEMO_SCRIPT,
      ast: parseComicScript(DEFAULT_DEMO_SCRIPT),
      sketches: {},
      isDrawerOpen: false,
    });
  });

  it('renders Thumbnail Studio header, stats, and default page cards', () => {
    render(<ThumbnailStudioBoard />);

    expect(screen.getByText('THUMBNAIL & STORYBOARD STUDIO')).toBeInTheDocument();
    expect(screen.getByTestId('thumbnail-studio-board')).toBeInTheDocument();

    // Check stats badges
    expect(screen.getByText(/2 trang/i)).toBeInTheDocument();
    expect(screen.getByText(/4 ô truyện/i)).toBeInTheDocument();
    expect(screen.getByText(/phác thảo/i)).toBeInTheDocument();

    // Check page header
    expect(screen.getByText('TRANG 1')).toBeInTheDocument();
    expect(screen.getByText('TRANG 2')).toBeInTheDocument();
  });

  it('allows toggling between Board view and Split view', () => {
    render(<ThumbnailStudioBoard />);

    const splitBtn = screen.getByTestId('view-layout-split');
    fireEvent.click(splitBtn);

    // In split view, the raw script textarea should be visible
    expect(screen.getByTestId('comic-script-raw-textarea')).toBeInTheDocument();

    const boardBtn = screen.getByTestId('view-layout-board');
    fireEvent.click(boardBtn);

    // In board view, the textarea is hidden
    expect(screen.queryByTestId('comic-script-raw-textarea')).not.toBeInTheDocument();
  });

  it('filters panels when changing shot type', () => {
    render(<ThumbnailStudioBoard />);

    const filterSelect = screen.getByTestId('shot-filter-select');
    fireEvent.change(filterSelect, { target: { value: 'extreme_wide' } });

    // Extreme Wide should still have at least 1 panel visible
    expect(screen.getByText('TRANG 1')).toBeInTheDocument();
  });

  it('inserts transition page using LexoRank when button clicked', () => {
    const onShowToast = vi.fn();
    render(<ThumbnailStudioBoard onShowToast={onShowToast} />);

    const insertBtn = screen.getByTestId('insert-transition-page-1');
    fireEvent.click(insertBtn);

    expect(onShowToast).toHaveBeenCalledWith(
      expect.stringContaining('Chèn trang đệm'),
      expect.any(String)
    );

    // Page 1.5 should now exist in AST
    const storeState = useComicStudioStore.getState();
    expect(storeState.ast.pages.some((p) => p.pageNumber === 1.5)).toBe(true);
  });

  it('adds a new page when "+ Thêm trang" is clicked', () => {
    const onShowToast = vi.fn();
    render(<ThumbnailStudioBoard onShowToast={onShowToast} />);

    const addPageBtn = screen.getByTestId('add-new-page-btn');
    fireEvent.click(addPageBtn);

    expect(onShowToast).toHaveBeenCalledWith(
      expect.stringContaining('Thêm trang thành công'),
      expect.any(String)
    );
  });

  it('syncs script from scenes when "Nạp kịch bản" is clicked', () => {
    const mockScenes: SceneDetailDto[] = [
      {
        id: 'scene-test-1',
        chapterId: 'chap-1',
        sceneNumber: 1,
        heading: 'INT. PHÒNG THỬ NGHIỆM - NGÀY',
        summary: 'Minh kiểm tra hệ thống',
        createdAt: '2026-11-03T00:00:00Z',
        scriptLines: [
          {
            id: 'line-1',
            lineOrder: 1,
            speakerCharacterId: 'char-1',
            dialogueText: 'Hệ thống đã hoạt động ổn định.',
            stageDirection: 'Gõ phím liên hồi',
            narrationMode: 'Present',
          },
        ],
      },
    ];

    const onShowToast = vi.fn();
    render(
      <ThumbnailStudioBoard
        scenes={mockScenes}
        getSpeakerName={() => 'Minh'}
        onShowToast={onShowToast}
      />
    );

    const syncBtn = screen.getByTestId('sync-from-scenes-btn');
    fireEvent.click(syncBtn);

    expect(onShowToast).toHaveBeenCalledWith(
      expect.stringContaining('Đã đồng bộ kịch bản'),
      expect.any(String)
    );
  });
});
