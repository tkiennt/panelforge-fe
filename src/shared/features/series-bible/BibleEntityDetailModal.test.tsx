import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BibleEntityDetailModal } from './BibleEntityDetailModal';
import { BibleEntity } from '@/types';
import { BibleEntryDto } from '@/services/bible.service';

vi.mock('@/shared/components/AuthenticatedImage', () => ({
  AuthenticatedImage: ({ alt, className }: any) => (
    <img alt={alt} className={className} data-testid='auth-image' />
  ),
}));

describe('BibleEntityDetailModal UX/UI', () => {
  const mockEntityWithImage: BibleEntity = {
    id: 'ent-1',
    code: 'CHR-001',
    name: 'Tần Mục',
    category: 'characters',
    subtitle: 'Tàn Lão Thôn Thiếu Chủ',
    description: 'Xuất thân Tàn Lão Thôn, có Cửu Long Thần Khí.',
    imageUrl: 'https://example.com/tanmuc.png',
    isLocked: true,
    lockedAt: '2026-10-15T08:30:00Z',
  };

  const mockEntityNoImage: BibleEntity = {
    id: 'ent-2',
    code: 'LOC-001',
    name: 'Đại Khư',
    category: 'locations',
    subtitle: 'Vùng đất cấm',
    description: 'Nơi bóng tối buông xuống vào ban đêm.',
    imageUrl: undefined,
    isLocked: false,
  };

  const mockRawEntry: BibleEntryDto = {
    id: 'ent-1',
    seriesBibleId: 'sb-1',
    category: 0,
    code: 'CHR-001',
    name: 'Tần Mục',
    subtitle: 'Tàn Lão Thôn Thiếu Chủ',
    description: 'Xuất thân Tàn Lão Thôn, có Cửu Long Thần Khí.',
    detailsJson: '{}',
    referenceImageUrl: 'https://example.com/tanmuc.png',
    priority: 1,
    strictCheck: true,
    isActive: true,
    createdAt: '2026-10-15T00:00:00Z',
    effectiveRevision: {
      id: 'rev-1',
      bibleEntryId: 'ent-1',
      versionNumber: 2,
      summary: 'Cập nhật trang phục',
      snapshotJson: '{}',
      contentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      effectiveFromChapterNumber: 5,
      isInitialVersion: false,
      createdAt: '2026-10-15T08:30:00Z',
      isLocked: true,
      lockedAt: '2026-10-15T08:30:00Z',
    },
  };

  const defaultProps = {
    entity: mockEntityWithImage,
    rawEntry: mockRawEntry,
    isProducer: true,
    onClose: vi.fn(),
    onOpenHistory: vi.fn(),
    onOpenAddRevision: vi.fn(),
    onShowToast: vi.fn(),
    onZoomImage: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders in a portal inside document.body with z-[1000] and locks body scroll', () => {
    const { unmount } = render(<BibleEntityDetailModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog.className).toContain('z-[1000]');
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('displays code, unique entity name in header, and category badge without duplicate name in body', () => {
    render(<BibleEntityDetailModal {...defaultProps} />);

    expect(screen.getByText('CHR-001')).toBeInTheDocument();
    // Header should contain entity name as h2
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Tần Mục');
    expect(screen.getByText('Nhân vật')).toBeInTheDocument();

    // Verify there is no duplicate h3/heading in body with the name
    const allHeadings = screen.getAllByRole('heading');
    expect(allHeadings.length).toBe(1);
  });

  it('displays Canon locked banner with chapter and approval date, without BR-18 code', () => {
    render(<BibleEntityDetailModal {...defaultProps} />);

    expect(screen.getByText(/Canon đã khoá/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Ch\.\s*5\s*→\s*hết/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Đã duyệt/i)).toBeInTheDocument();

    // Must NOT contain internal code BR-18
    expect(screen.queryByText(/BR-18/i)).not.toBeInTheDocument();
  });

  it('displays stageName alongside chapter range if provided in revision', () => {
    const rawWithStage: BibleEntryDto = {
      ...mockRawEntry,
      effectiveRevision: {
        ...mockRawEntry.effectiveRevision!,
        stageName: 'Lúc nhỏ',
        effectiveFromChapterNumber: 1,
        effectiveToChapterNumber: 19,
      },
    };

    render(<BibleEntityDetailModal {...defaultProps} rawEntry={rawWithStage} />);

    expect(screen.getAllByText(/Lúc nhỏ\s*·\s*Ch\.1–19/i).length).toBeGreaterThanOrEqual(1);
  });

  it('allows Writer/Artist to create drafts via canCreateDraft prop', () => {
    render(<BibleEntityDetailModal {...defaultProps} isProducer={false} canCreateDraft={true} />);

    const draftBtn = screen.getByRole('button', { name: /\+ Tạo bản nháp mới/i });
    expect(draftBtn).toBeInTheDocument();
    fireEvent.click(draftBtn);

    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(defaultProps.onOpenAddRevision).toHaveBeenCalledWith(mockEntityWithImage);
  });

  it('shows read-only notice when canCreateDraft is false for non-producer', () => {
    render(<BibleEntityDetailModal {...defaultProps} isProducer={false} canCreateDraft={false} />);

    expect(screen.getByText(/Chế độ chỉ xem/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /\+ Tạo/i })).not.toBeInTheDocument();
  });

  it('renders image and triggers zoom when image is clicked or zoom button is clicked', () => {
    render(<BibleEntityDetailModal {...defaultProps} />);

    expect(screen.getByTestId('auth-image')).toBeInTheDocument();
    const zoomButton = screen.getByRole('button', { name: /Phóng to ảnh/i });
    fireEvent.click(zoomButton);

    expect(defaultProps.onZoomImage).toHaveBeenCalledWith({
      url: 'https://example.com/tanmuc.png',
      title: 'Tần Mục',
    });
  });

  it('renders compact empty state without giant black box when no image exists', () => {
    render(
      <BibleEntityDetailModal {...defaultProps} entity={mockEntityNoImage} rawEntry={undefined} />,
    );

    expect(screen.queryByTestId('auth-image')).not.toBeInTheDocument();
    expect(screen.getByText(/Chưa có ảnh Reference Sheet cho mục này/i)).toBeInTheDocument();

    // For producer, shows action to create revision to add image
    const addImgBtn = screen.getByRole('button', {
      name: /Tạo phiên bản mới để thêm ảnh/i,
    });
    expect(addImgBtn).toBeInTheDocument();

    fireEvent.click(addImgBtn);
    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(defaultProps.onOpenAddRevision).toHaveBeenCalledWith(mockEntityNoImage);
  });

  it('collapses technical details by default, expands on click, and copies hash', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    render(<BibleEntityDetailModal {...defaultProps} />);

    const toggleTechBtn = screen.getByRole('button', {
      name: /Chi tiết kỹ thuật & Mã băm/i,
    });
    expect(toggleTechBtn).toBeInTheDocument();

    // Hash not visible yet
    expect(
      screen.queryByText('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'),
    ).not.toBeInTheDocument();

    // Expand
    fireEvent.click(toggleTechBtn);

    expect(
      screen.getByText('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'),
    ).toBeInTheDocument();

    const copyBtn = screen.getByRole('button', { name: /Sao chép/i });
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    await waitFor(() => {
      expect(screen.getByText('Đã chép!')).toBeInTheDocument();
    });
  });

  it('closes on Escape key press and on close button click', () => {
    render(<BibleEntityDetailModal {...defaultProps} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);

    const closeBtn = screen.getByRole('button', { name: /Đóng cửa sổ chi tiết/i });
    fireEvent.click(closeBtn);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(2);
  });
});
