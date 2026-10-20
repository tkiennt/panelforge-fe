import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PageArtworkWorkflow } from './PageArtworkWorkflow';
import { panelService } from '@/services/panel.service';
import { elementService } from '@/services/element.service';

vi.mock('@/services/panel.service', () => ({
  panelService: { splitArtwork: vi.fn(), createPanel: vi.fn() },
}));
vi.mock('@/services/element.service', () => ({
  elementService: { addElement: vi.fn() },
}));

const split = vi.mocked(panelService.splitArtwork);
const createPanel = vi.mocked(panelService.createPanel);
const addElement = vi.mocked(elementService.addElement);

const page = { id: 'page-1', pageNumber: 2, widthPx: 1200, heightPx: 1800 };
const baseProps = {
  page,
  stageName: 'Ink',
  assignmentBrief: 'Vẽ trang 2',
  artwork: { id: 'art-1', versionNumber: 3, url: 'http://api.test/art.png' },
  pendingFile: null,
  uploading: false,
  uploadProgressMsg: null,
  canEdit: true,
  existingPanels: [],
  defaultRightToLeft: false,
  onPickFile: vi.fn(),
  onCancelPending: vi.fn(),
  onUploadPending: vi.fn(),
  onApplied: vi.fn(),
};

const result = {
  width: 600,
  height: 900,
  panels: [{ order: 1, bbox: [10, 20, 300, 200] as [number, number, number, number] }],
  bubbles: [
    { panelOrder: 1, bbox: [50, 60, 100, 40] as [number, number, number, number], polygon: [] },
  ],
};

async function openAndDetect() {
  fireEvent.click(screen.getByTestId('workflow-detect-btn'));
  fireEvent.click(screen.getByTestId('split-run-btn'));
  await waitFor(() => expect(split).toHaveBeenCalled());
}

describe('PageArtworkWorkflow', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, blob: async () => new Blob(['x'], { type: 'image/png' }) })),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('hiển thị trang, công đoạn, việc và phiên bản artwork', () => {
    render(<PageArtworkWorkflow {...baseProps} />);
    expect(screen.getByTestId('workflow-context').textContent).toContain('Trang 2 · Công đoạn Ink');
    expect(screen.getByText('Artwork v3')).toBeTruthy();
    expect(screen.getByTestId('workflow-new-version-btn').textContent).toContain(
      'Tải phiên bản mới',
    );
  });

  it('chưa có artwork: nút "Chọn ảnh trang truyện"', () => {
    render(<PageArtworkWorkflow {...baseProps} artwork={null} />);
    fireEvent.click(screen.getByTestId('workflow-pick-btn'));
    expect(baseProps.onPickFile).toHaveBeenCalled();
    expect(screen.queryByTestId('workflow-detect-btn')).toBeNull();
  });

  it('file đang chờ: hiện tên, dung lượng, Tải lên / Đổi / Hủy', () => {
    const file = new File([new Uint8Array(2048)], 'trang2.png', { type: 'image/png' });
    render(<PageArtworkWorkflow {...baseProps} pendingFile={file} />);
    expect(screen.getByTestId('pending-file-name').textContent).toBe('trang2.png');
    expect(screen.getByText(/2 KB/)).toBeTruthy();
    fireEvent.click(screen.getByTestId('pending-upload-btn'));
    fireEvent.click(screen.getByTestId('pending-cancel-btn'));
    expect(baseProps.onUploadPending).toHaveBeenCalled();
    expect(baseProps.onCancelPending).toHaveBeenCalled();
  });

  it('nhận diện chỉ vẽ bản nháp, gửi đúng rightToLeft, chưa lưu gì', async () => {
    split.mockResolvedValue(result);
    render(<PageArtworkWorkflow {...baseProps} defaultRightToLeft />);
    await openAndDetect();
    expect(split).toHaveBeenCalledWith('page-1', expect.any(File), true);
    expect(await screen.findAllByTestId('split-region-panel')).toHaveLength(1);
    expect(screen.getAllByTestId('split-region-bubble')).toHaveLength(1);
    expect(createPanel).not.toHaveBeenCalled();
    expect(addElement).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('split-toggle-overlay'));
    expect(screen.queryByTestId('split-overlay')).toBeNull();
  });

  it('không có bóng thoại: báo rõ và vẫn cho lưu panel', async () => {
    split.mockResolvedValue({ ...result, bubbles: [] });
    render(<PageArtworkWorkflow {...baseProps} />);
    await openAndDetect();
    expect(await screen.findByTestId('split-empty-bubble')).toBeTruthy();
    expect(screen.getByTestId('split-notice').textContent).toContain('Không phát hiện bóng thoại');
    expect((screen.getByTestId('split-confirm-btn') as HTMLButtonElement).disabled).toBe(false);
  });

  it('503: thông báo dịch vụ chưa khả dụng', async () => {
    split.mockRejectedValue(
      new Error(
        'Dịch vụ nhận diện tạm thời chưa khả dụng. Bạn vẫn có thể tải bản vẽ và thử nhận diện lại sau.',
      ),
    );
    render(<PageArtworkWorkflow {...baseProps} />);
    await openAndDetect();
    expect((await screen.findByTestId('split-error')).textContent).toContain(
      'tạm thời chưa khả dụng',
    );
  });

  it('xác nhận: tạo panel (đánh số tiếp theo) và bóng SPEECH_BALLOON với toạ độ trang', async () => {
    split.mockResolvedValue(result);
    createPanel.mockResolvedValue({ id: 'real-panel' } as never);
    addElement.mockResolvedValue({ elementId: 'e1' } as never);
    render(
      <PageArtworkWorkflow
        {...baseProps}
        existingPanels={[{ id: 'old', panelNumber: 4, readingOrder: 4 } as never]}
      />,
    );
    await openAndDetect();
    expect(await screen.findByTestId('split-existing-warning')).toBeTruthy();
    fireEvent.click(screen.getByTestId('split-confirm-btn'));
    await waitFor(() => expect(baseProps.onApplied).toHaveBeenCalled());

    // Ảnh 600x900 → trang 1200x1800: hệ số 2, không viền trống
    const req = createPanel.mock.calls[0][1];
    expect(req.panelNumber).toBe(5);
    expect(JSON.parse(req.boundingBox!)).toMatchObject({ x: 20, y: 40, width: 600, height: 400 });
    expect(addElement).toHaveBeenCalledWith(
      'page-1',
      expect.objectContaining({
        elementType: 'SPEECH_BALLOON',
        x: 100,
        y: 120,
        width: 200,
        height: 80,
        panelId: 'real-panel',
      }),
    );
    expect(screen.getByTestId('split-saved').textContent).toContain('1 panel và 1 bóng thoại');
  });

  it('409 khi lưu: hướng dẫn tải lại, không thử lại', async () => {
    split.mockResolvedValue(result);
    createPanel.mockRejectedValue(Object.assign(new Error('conflict'), { status: 409 }));
    render(<PageArtworkWorkflow {...baseProps} />);
    await openAndDetect();
    fireEvent.click(await screen.findByTestId('split-confirm-btn'));
    expect((await screen.findByTestId('split-error')).textContent).toContain('tải lại trang');
    expect(createPanel).toHaveBeenCalledTimes(1);
    expect(addElement).not.toHaveBeenCalled();
  });
});
