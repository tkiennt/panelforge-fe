import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ArtistWorkspaceView } from './ArtistWorkspaceView';
import { chapterService } from '@/services/chapter.service';

vi.mock('@/services/chapter.service', () => ({
  chapterService: {
    submitManuscript: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('ArtistWorkspaceView (Clean 2-Zone Editorial Manga Architecture)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderView = () =>
    render(
      <MemoryRouter>
        <ArtistWorkspaceView workspaceRole='ARTIST' />
      </MemoryRouter>
    );

  it('renders top bar with breadcrumb, mode switcher, progress badge and CTA', () => {
    renderView();

    // Top Bar Breadcrumb
    expect(screen.getByTestId('workspace-top-bar')).toBeInTheDocument();
    expect(screen.getByText('Vương Triều Bóng Đêm')).toBeInTheDocument();
    expect(screen.getByText('Chương 12')).toBeInTheDocument();
    expect(screen.getByText(/Trang 1 \/ 18/)).toBeInTheDocument();

    // Mode Switcher
    expect(screen.getByTestId('mode-full-page-btn')).toBeInTheDocument();
    expect(screen.getByTestId('mode-panel-template-btn')).toBeInTheDocument();

    // Progress Badge & Action CTA
    expect(screen.getByTestId('workspace-progress-badge')).toBeInTheDocument();
    expect(screen.getByTestId('submit-for-review-cta')).toBeInTheDocument();
  });

  it('renders Left Column (35%) Script Reader with scene title and formatted panel cards', () => {
    renderView();

    expect(screen.getByTestId('script-reader-column')).toBeInTheDocument();
    expect(screen.getByText('Phân cảnh 1: Cổng Thành Phía Nam')).toBeInTheDocument();
    expect(screen.getByText('NGOẠI · CỔNG THÀNH · SÁNG')).toBeInTheDocument();

    // Formatted Panel Block Cards
    expect(screen.getByTestId('panel-script-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('panel-script-card-2')).toBeInTheDocument();
    expect(screen.getByTestId('panel-script-card-3')).toBeInTheDocument();

    // Dialogues & Action descriptions
    expect(screen.getByText('Minh Triết')).toBeInTheDocument();
    expect(screen.getByText('"Cuối cùng chúng ta cũng đã vượt qua được thung lũng bóng đêm."')).toBeInTheDocument();
    expect(screen.getByText('Hoàng Anh')).toBeInTheDocument();
  });

  it('Mode 1 (Full Page Artwork): displays clean dropzone and optimistic local preview', async () => {
    renderView();

    // Initial state: Dropzone visible
    expect(screen.getByTestId('full-page-canvas-container')).toBeInTheDocument();
    expect(screen.getByTestId('full-page-dropzone')).toBeInTheDocument();
    expect(screen.getByText('Kéo thả tranh vẽ toàn trang vào đây')).toBeInTheDocument();

    // Simulate drop or paste image file
    const file = new File(['dummy-art'], 'page_1.png', { type: 'image/png' });
    const dropzone = screen.getByTestId('full-page-dropzone');

    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file],
      },
    });

    // Preview state should appear with version badge
    await waitFor(() => {
      expect(screen.getByTestId('replace-full-page-btn')).toBeInTheDocument();
      expect(screen.getByTestId('fullscreen-full-page-btn')).toBeInTheDocument();
      expect(screen.getByText('Bản vẽ toàn trang: Sẵn sàng')).toBeInTheDocument();
    });
  });

  it('Mode 2 (Panel Templates & Frames): allows switching mode, selecting template and uploading to panel', async () => {
    renderView();

    // Switch to Panel Template Mode
    fireEvent.click(screen.getByTestId('mode-panel-template-btn'));

    expect(screen.getByTestId('template-panel-canvas-container')).toBeInTheDocument();

    // 3 panels from default preset are rendered
    expect(screen.getByTestId('canvas-panel-slot-1')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-panel-slot-2')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-panel-slot-3')).toBeInTheDocument();

    // Drop file into Panel #1
    const file = new File(['dummy-panel-1'], 'panel_1.png', { type: 'image/png' });
    const panelSlot1 = screen.getByTestId('canvas-panel-slot-1');

    fireEvent.drop(panelSlot1, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId('replace-panel-art-btn-1')).toBeInTheDocument();
      expect(screen.getByTestId('remove-panel-art-btn-1')).toBeInTheDocument();
    });

    // Floating toolbar controls
    expect(screen.getByTestId('template-floating-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('change-template-floating-btn')).toBeInTheDocument();
    expect(screen.getByTestId('reset-template-floating-btn')).toBeInTheDocument();
  });

  it('Submits for review when ready and triggers backend chapter service', async () => {
    renderView();

    // In Full Page Mode, upload page first
    const file = new File(['dummy-art'], 'page_1.png', { type: 'image/png' });
    fireEvent.drop(screen.getByTestId('full-page-dropzone'), {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByText('Bản vẽ toàn trang: Sẵn sàng')).toBeInTheDocument();
    });

    // Click CTA
    fireEvent.click(screen.getByTestId('submit-for-review-cta'));

    await waitFor(() => {
      expect(screen.getByTestId('workspace-toast')).toBeInTheDocument();
      expect(screen.getByText('Nộp bản thảo thành công!')).toBeInTheDocument();
    });
  });
});
