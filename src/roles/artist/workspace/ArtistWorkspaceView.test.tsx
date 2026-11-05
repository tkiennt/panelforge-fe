// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ArtistWorkspaceView } from './ArtistWorkspaceView';
import { chapterService } from '@/services/chapter.service';

vi.mock('@/services/chapter.service', () => ({
  chapterService: {
    submitManuscript: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('ArtistWorkspaceView (Clean Consolidated Single-Layout Architecture)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderView = () =>
    render(
      <MemoryRouter>
        <ArtistWorkspaceView workspaceRole='ARTIST' />
      </MemoryRouter>
    );

  it('renders top bar without mode-switcher tabs and displays breadcrumb, progress badge and CTA', () => {
    renderView();

    // 1. Breadcrumb & Navigation
    expect(screen.getByTestId('artist-workspace-topbar')).toBeInTheDocument();
    expect(screen.getByTestId('artist-breadcrumb')).toHaveTextContent('Trang 1');

    // 2. Không còn Mode-Switcher tabs (Full Page vs Panel Templates)
    expect(screen.queryByTestId('mode-switcher-full-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mode-switcher-panel-template')).not.toBeInTheDocument();

    // 3. Progress Badge & CTA
    expect(screen.getByTestId('progress-badge')).toBeInTheDocument();
    expect(screen.getByTestId('submit-review-btn')).toBeInTheDocument();
  });

  it('renders Left Column (35%) Script Reader with scene title and formatted panel cards', () => {
    renderView();

    expect(screen.getByTestId('script-reader-column')).toBeInTheDocument();
    expect(screen.getByText(/Phân cảnh 1: Cổng Thành Phía Nam/i)).toBeInTheDocument();
    expect(screen.getByTestId('panel-script-card-1')).toBeInTheDocument();
    expect(screen.getByText(/Minh Triết:/i)).toBeInTheDocument();
  });

  it('defaults new page to Single-Panel layout with 2 centered action buttons: [Tải ảnh lên] and [Chọn Template]', () => {
    renderView();

    // Canvas hiển thị trạng thái 1-panel rỗng
    expect(screen.getByTestId('single-panel-empty-state')).toBeInTheDocument();

    // 2 Nút CTA chính ở trung tâm
    const uploadBtn = screen.getByTestId('canvas-empty-upload-artwork-btn');
    const selectTemplateBtn = screen.getByTestId('canvas-empty-select-template-btn');

    expect(uploadBtn).toBeInTheDocument();
    expect(uploadBtn).toHaveTextContent('Tải ảnh lên');

    expect(selectTemplateBtn).toBeInTheDocument();
    expect(selectTemplateBtn).toHaveTextContent('Chọn Template');
  });

  it('clicking [Chọn Template] opens the 320px Right-Hand Sidebar with manga layout presets', async () => {
    renderView();

    const selectTemplateBtn = screen.getByTestId('canvas-empty-select-template-btn');
    fireEvent.click(selectTemplateBtn);

    // Sidebar mở ra
    const sidebar = screen.getByTestId('template-selector-sidebar');
    expect(sidebar).toBeInTheDocument();
    expect(sidebar.className).toContain('translate-x-0');

    // Kiểm tra danh sách presets
    expect(screen.getByTestId('preset-card-single-full')).toBeInTheDocument();
    expect(screen.getByTestId('preset-card-3-panel-shonen')).toBeInTheDocument();
    expect(screen.getByTestId('preset-card-4-panel-yonkoma')).toBeInTheDocument();

    // Nút đóng sidebar
    const closeBtn = screen.getByTestId('close-template-sidebar-btn');
    fireEvent.click(closeBtn);
    expect(sidebar.className).toContain('translate-x-full');
  });

  it('selecting a multi-panel template updates layout immediately into independent dropzones', async () => {
    renderView();

    // Mở sidebar và chọn mẫu 3-panel shonen
    fireEvent.click(screen.getByTestId('canvas-empty-select-template-btn'));
    const shonenPreset = screen.getByTestId('preset-card-3-panel-shonen');
    fireEvent.click(shonenPreset);

    // Canvas chuyển thành 3 ô khung độc lập
    await waitFor(() => {
      expect(screen.getByTestId('panel-box-1')).toBeInTheDocument();
      expect(screen.getByTestId('panel-box-2')).toBeInTheDocument();
      expect(screen.getByTestId('panel-box-3')).toBeInTheDocument();
    });

    // Mỗi khung có nút nạp ảnh độc lập
    expect(screen.getByTestId('panel-1-upload-btn')).toBeInTheDocument();
    expect(screen.getByTestId('panel-2-upload-btn')).toBeInTheDocument();
    expect(screen.getByTestId('panel-3-upload-btn')).toBeInTheDocument();

    // Floating toolbar hiển thị ở cạnh đáy
    expect(screen.getByTestId('canvas-floating-controls')).toBeInTheDocument();

    // Click chọn panel 2 sẽ highlight panel 2 và thẻ kịch bản
    fireEvent.click(screen.getByTestId('panel-box-2'));
    expect(screen.getByTestId('panel-box-2').className).toContain('border-[#F97316]');
  });

  it('Submission Gate Rule: validates review submission readiness', async () => {
    renderView();

    const submitBtn = screen.getByTestId('submit-review-btn');
    // Chưa có ảnh -> nút nộp bị vô hiệu
    expect(submitBtn).toBeDisabled();

    // Giả lập nạp ảnh cho Single-Panel qua file input
    const file = new File(['dummy manga art'], 'page-1.png', { type: 'image/png' });
    const singleFileInput = screen.getByTestId('single-page-file-input');
    fireEvent.change(singleFileInput, { target: { files: [file] } });

    // Sau khi nạp ảnh cho 1-panel: Sẵn sàng nộp bản thảo
    await waitFor(() => {
      expect(screen.getByTestId('single-panel-populated-artwork')).toBeInTheDocument();
      expect(submitBtn).not.toBeDisabled();
    });

    // Bấm nộp bản thảo
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByTestId('workspace-toast')).toHaveTextContent(/Nộp bản thảo thành công/i);
    });
  });

  it('supports Tab switching between Script and Character Bible in the left column', () => {
    renderView();

    // Mặc định tab Script đang active
    expect(screen.getByTestId('tab-script-btn')).toBeInTheDocument();
    expect(screen.getByTestId('tab-characters-btn')).toBeInTheDocument();
    expect(screen.getByTestId('panel-script-card-1')).toBeInTheDocument();

    // Chuyển sang tab Nhân vật
    fireEvent.click(screen.getByTestId('tab-characters-btn'));
    expect(screen.getByTestId('character-bible-list')).toBeInTheDocument();
    expect(screen.getByTestId('character-card-char-1')).toHaveTextContent('Minh Triết');
  });

  it('supports collapsing and expanding the left context reference sidebar', () => {
    renderView();

    // Nút thu gọn ở header cột trái
    const collapseBtn = screen.getByTestId('collapse-left-sidebar-btn');
    fireEvent.click(collapseBtn);

    // Sidebar bị gập
    expect(screen.getByTestId('script-reader-section').className).toContain('w-0');

    // Nút mở lại xuất hiện trên canvas
    const expandBtn = screen.getByTestId('expand-left-sidebar-btn');
    expect(expandBtn).toBeInTheDocument();
    fireEvent.click(expandBtn);

    // Sidebar mở lại bình thường
    expect(screen.getByTestId('script-reader-column')).toBeInTheDocument();
  });

  it('toggles Zen Mode on and off via button or keyboard', () => {
    renderView();

    // Bật Zen Mode từ topbar
    const zenBtn = screen.getByTestId('topbar-zen-mode-btn');
    fireEvent.click(zenBtn);

    // Topbar ẩn, Zen pill hiện
    expect(screen.queryByTestId('artist-workspace-topbar')).not.toBeInTheDocument();
    expect(screen.getByTestId('zen-mode-pill')).toBeInTheDocument();

    // Thoát Zen Mode bằng phím Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByTestId('artist-workspace-topbar')).toBeInTheDocument();
    expect(screen.queryByTestId('zen-mode-pill')).not.toBeInTheDocument();
  });

  it('renders bottom filmstrip thumbnail navigator and zoom controls', () => {
    renderView();

    // Filmstrip navigator
    expect(screen.getByTestId('filmstrip-container')).toBeInTheDocument();
    expect(screen.getByTestId('filmstrip-page-btn-1')).toBeInTheDocument();
    expect(screen.getByTestId('filmstrip-page-btn-2')).toBeInTheDocument();

    // Zoom controls on canvas
    expect(screen.getByTestId('canvas-zoom-controls')).toBeInTheDocument();
  });
});
