import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FrameTemplateModal } from './FrameTemplateModal';
import { frameTemplateService, FrameTemplateDto } from '@/services/frameTemplate.service';

vi.mock('@/services/frameTemplate.service', () => ({
  frameTemplateService: {
    getFrameTemplates: vi.fn(),
    applyFrameTemplate: vi.fn(),
  },
}));

describe('FrameTemplateModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTemplates: FrameTemplateDto[] = [
    {
      id: 'tpl-1',
      name: '4-Koma Classic',
      layoutFormat: 'StandardPage',
      isBuiltIn: true,
      panelCount: 4,
      slots: [
        { x: 0.1, y: 0.05, w: 0.8, h: 0.2, borderless: false },
        { x: 0.1, y: 0.28, w: 0.8, h: 0.2, borderless: false },
        { x: 0.1, y: 0.51, w: 0.8, h: 0.2, borderless: false },
        {
          x: 0.1,
          y: 0.74,
          w: 0.8,
          h: 0.2,
          borderless: true,
          corners: [
            { x: 0, y: 0 },
            { x: 1, y: 0.1 },
            { x: 1, y: 1 },
            { x: 0, y: 0.9 },
          ],
        },
      ],
      createdAt: '2026-10-08T00:00:00Z',
    },
    {
      id: 'tpl-2',
      name: 'Spread Splash',
      layoutFormat: 'SpreadDouble',
      isBuiltIn: false,
      panelCount: 1,
      slots: [{ x: 0, y: 0, w: 1, h: 1, borderless: true }],
      createdAt: '2026-10-08T00:00:00Z',
    },
  ];

  it('không render khi isOpen là false', () => {
    const { container } = render(
      <FrameTemplateModal
        isOpen={false}
        onClose={vi.fn()}
        workspaceId='ws-1'
        pageId='page-1'
        pageNumber={1}
        onApplied={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('tải và hiển thị danh sách templates khi mở với toạ độ chuẩn hoá 0–1 được nhân 100 thành %', async () => {
    vi.mocked(frameTemplateService.getFrameTemplates).mockResolvedValueOnce(mockTemplates);

    render(
      <FrameTemplateModal
        isOpen={true}
        onClose={vi.fn()}
        workspaceId='ws-1'
        pageId='page-1'
        pageNumber={1}
        hasExistingPanels={true}
        onApplied={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByText(/4-Koma Classic/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Spread Splash/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Trang đã có khung tranh/i)).toBeInTheDocument();

    // Kiểm tra slot thu nhỏ của panel 1 được render với % chuẩn (0.1 * 100 = 10%)
    const slots = screen.getAllByText('1');
    expect(slots[0]).toHaveStyle({
      left: '10%',
      top: '5%',
      width: '80%',
      height: '20%',
    });
  });

  it('gọi applyFrameTemplate khi bấm nút Áp Dụng Mẫu Khung', async () => {
    vi.mocked(frameTemplateService.getFrameTemplates).mockResolvedValueOnce(mockTemplates);
    vi.mocked(frameTemplateService.applyFrameTemplate).mockResolvedValueOnce([
      {
        id: 'p-1',
        pageId: 'page-1',
        panelNumber: 1,
        boundingBox: '{"x": 10, "y": 5, "width": 80, "height": 20}',
        readingOrder: 1,
        createdAt: '2026-10-08T00:00:00Z',
      },
    ]);

    const handleApplied = vi.fn();
    const handleClose = vi.fn();

    render(
      <FrameTemplateModal
        isOpen={true}
        onClose={handleClose}
        workspaceId='ws-1'
        pageId='page-1'
        pageNumber={1}
        onApplied={handleApplied}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByText(/4-Koma Classic/i).length).toBeGreaterThanOrEqual(1);
    });

    const applyBtn = screen.getByRole('button', { name: /Áp Dụng Mẫu Khung/i });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(frameTemplateService.applyFrameTemplate).toHaveBeenCalledWith('page-1', 'tpl-1');
      expect(handleApplied).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
