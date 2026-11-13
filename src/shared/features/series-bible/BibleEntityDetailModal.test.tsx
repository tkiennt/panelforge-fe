import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BibleEntityDetailModal } from './BibleEntityDetailModal';
import { BibleEntity } from '@/types';
import { BibleEntryDto, BibleEntryRevisionDto, bibleService } from '@/services/bible.service';

vi.mock('@/shared/components/AuthenticatedImage', () => ({
  AuthenticatedImage: ({ alt, className, 'data-testid': testId, ...props }: any) => (
    <img alt={alt} className={className} data-testid={testId || 'auth-image'} {...props} />
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

  it('renders as a full-page overlay in document.body (no AppShell sidebar) and locks body scroll', () => {
    const { unmount } = render(<BibleEntityDetailModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog.className).toContain('fixed inset-0');
    expect(dialog).toContainElement(screen.getByTestId('bible-entity-workbench'));
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

    expect(screen.getByText(/Đã khóa chuẩn/i)).toBeInTheDocument();
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

    const draftBtn = screen.getByRole('button', { name: /Tạo bản nháp mới/i });
    expect(draftBtn).toBeInTheDocument();
    fireEvent.click(draftBtn);

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
    expect(defaultProps.onOpenAddRevision).toHaveBeenCalledWith(mockEntityNoImage);
  });

  it('does not display raw technical hashes or developer IDs to maintain clean creative UI', () => {
    render(<BibleEntityDetailModal {...defaultProps} />);

    // Technical jargon like raw hash and system id are hidden from artists/creators
    expect(screen.queryByText(/Chi tiết kỹ thuật & Mã băm/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Mã băm nội dung/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Mã định danh hệ thống/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('mock-char-1')).not.toBeInTheDocument();
  });

  it('closes on Escape key press and on close button click', () => {
    render(<BibleEntityDetailModal {...defaultProps} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);

    const closeBtn = screen.getByRole('button', { name: /Đóng cửa sổ chi tiết/i });
    fireEvent.click(closeBtn);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(2);
  });

  it('renders turnaround gallery thumbnails and switches active view on click (Step 3)', () => {
    const entityWithGallery: BibleEntity = {
      ...mockEntityWithImage,
      gallery: [
        { url: 'https://example.com/side.png', label: 'Góc nghiêng (Side)' },
        { url: 'https://example.com/expr.png', label: 'Biểu cảm vui' },
      ],
    };

    render(<BibleEntityDetailModal {...defaultProps} entity={entityWithGallery} />);

    expect(screen.getByText(/Góc nhìn & Biểu cảm \(2\):/i)).toBeInTheDocument();
    expect(screen.getByText('Góc nghiêng (Side)')).toBeInTheDocument();
    expect(screen.getByText('Biểu cảm vui')).toBeInTheDocument();

    const sideThumb = screen.getByText('Góc nghiêng (Side)');
    fireEvent.click(sideThumb);

    expect(screen.getByText('Tần Mục - Góc nghiêng (Side)')).toBeInTheDocument();
  });

  it('deduplicates revisions of the same chapter milestone and uses explicit stageName without displaying twice', () => {
    const rawWithMultiRev: BibleEntryDto = {
      ...mockRawEntry,
      effectiveRevision: {
        id: 'rev-2',
        bibleEntryId: 'ent-1',
        versionNumber: 2,
        summary: 'Đặt tên giai đoạn',
        stageName: 'Lúc nhỏ',
        snapshotJson: '{}',
        contentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        effectiveFromChapterNumber: 1,
        isInitialVersion: false,
        createdAt: '2026-10-15T09:00:00Z',
      },
    };

    render(<BibleEntityDetailModal {...defaultProps} rawEntry={rawWithMultiRev} />);

    // Era selector should have ONE stage tab for Chapter 1 with stageName 'Lúc nhỏ'
    const eraSelector = screen.getByTestId('era-stages-selector');
    expect(eraSelector).toBeInTheDocument();
    expect(screen.getAllByText('Lúc nhỏ').length).toBeGreaterThanOrEqual(1);
    // Must not duplicate with fallback 'Giai đoạn khởi đầu'
    expect(screen.queryByText('Giai đoạn khởi đầu')).not.toBeInTheDocument();
  });
  it('disables rework button and marks endorse button as endorsed when revision is WriterEndorsed (Bug 5)', () => {
    const rawWithEndorsed: BibleEntryDto = {
      ...mockRawEntry,
      effectiveRevision: {
        id: 'rev-endorsed',
        bibleEntryId: 'ent-1',
        versionNumber: 2,
        summary: 'Writer đã duyệt',
        stageName: 'Giai đoạn chuẩn',
        snapshotJson: '{}',
        contentHash: 'abc',
        effectiveFromChapterNumber: 1,
        isInitialVersion: false,
        createdAt: '2026-10-15T09:00:00Z',
        reviewStatus: 'WriterEndorsed',
        referenceImageUrl: 'https://example.com/sheet.png',
      },
    };

    render(
      <BibleEntityDetailModal {...defaultProps} rawEntry={rawWithEndorsed} canEndorse={true} />,
    );

    const reworkBtn = screen.getByTestId('detail-rework-btn');
    expect(reworkBtn).toBeDisabled();

    const endorseBtn = screen.getByTestId('detail-endorse-btn');
    expect(endorseBtn).toBeDisabled();
    expect(screen.getByText('Đã duyệt thiết kế')).toBeInTheDocument();
  });

  it('renders correct category type badge in header for characters and locations (Bug 1)', () => {
    const { rerender } = render(
      <BibleEntityDetailModal
        {...defaultProps}
        entity={{ ...mockEntityWithImage, category: 'characters' }}
      />,
    );
    expect(screen.getByText('Nhân vật')).toBeInTheDocument();

    rerender(
      <BibleEntityDetailModal
        {...defaultProps}
        entity={{ ...mockEntityWithImage, category: 'locations' }}
      />,
    );
    expect(screen.getByText('Bối cảnh & Địa điểm')).toBeInTheDocument();
  });

  it('selects latestSavedRevision immediately without overriding current view (Bug 4)', () => {
    const newRev = {
      id: 'rev-new-submitted',
      bibleEntryId: 'ent-1',
      versionNumber: 3,
      summary: 'Artist nộp concept mới',
      snapshotJson: '{}',
      contentHash: 'hash3',
      effectiveFromChapterNumber: 1,
      isInitialVersion: false,
      createdAt: '2026-10-29T10:00:00Z',
      reviewStatus: 'ConceptSubmitted' as const,
      referenceImageUrl: 'https://example.com/new.png',
    };

    render(<BibleEntityDetailModal {...defaultProps} latestSavedRevision={newRev} />);

    expect(screen.getByText('v3')).toBeInTheDocument();
    expect(screen.getByText('Chờ thẩm định')).toBeInTheDocument();
  });

  it('does not close workbench when Escape is pressed while a child modal is open (Bug 2)', () => {
    const childModal = document.createElement('div');
    childModal.setAttribute('data-child-modal', 'true');
    document.body.appendChild(childModal);

    render(<BibleEntityDetailModal {...defaultProps} />);
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(defaultProps.onClose).not.toHaveBeenCalled();
    document.body.removeChild(childModal);
  });

  it('renders "Chưa thiết lập" when character age and height are unset, never defaulting to "17 tuổi" or "178 cm"', () => {
    const characterWithoutAttributes: BibleEntity = {
      id: 'ent-unset',
      code: 'CHR-999',
      name: 'Nhân vật mới',
      category: 'characters',
      description: 'Mô tả nhân vật',
    };

    render(
      <BibleEntityDetailModal
        {...defaultProps}
        entity={characterWithoutAttributes}
        rawEntry={undefined}
      />,
    );

    // Verify age and height are "Chưa thiết lập"
    const unsetLabels = screen.getAllByText('Chưa thiết lập');
    expect(unsetLabels.length).toBeGreaterThanOrEqual(2);

    // Absolutely must NOT contain mock strings 17 tuổi or 178 cm
    expect(screen.queryByText('17 tuổi')).not.toBeInTheDocument();
    expect(screen.queryByText('178 cm')).not.toBeInTheDocument();
    expect(screen.queryByText(/Robotic prosthetic arm/i)).not.toBeInTheDocument();
  });

  it('renders location specifications and concept art labels instead of character fields for locations', () => {
    const locationEntity: BibleEntity = {
      id: 'ent-loc',
      code: 'LOC-002',
      name: 'Hệ thống hang động ngầm',
      category: 'locations',
      subtitle: 'Hang động cổ xưa',
      description: 'Cầu đá cổ bị gãy nhịp, vực sâu không đáy.',
    };

    render(
      <BibleEntityDetailModal {...defaultProps} entity={locationEntity} rawEntry={undefined} />,
    );

    // Must render Location card title & fields
    expect(screen.getByText(/Thông số không gian & Bối cảnh/i)).toBeInTheDocument();
    expect(screen.getByText('Loại không gian')).toBeInTheDocument();
    expect(screen.getByText('Kiến trúc & vật cố định')).toBeInTheDocument();
    expect(screen.getByText('Cầu đá cổ bị gãy nhịp, vực sâu không đáy.')).toBeInTheDocument();

    // Must NOT render Character fields
    expect(screen.queryByText('Độ tuổi:')).not.toBeInTheDocument();
    expect(screen.queryByText('Chiều cao:')).not.toBeInTheDocument();
    expect(screen.queryByText('17 tuổi')).not.toBeInTheDocument();
    expect(screen.queryByText('178 cm')).not.toBeInTheDocument();

    // Card 2 must render Environment Concept Art labels
    expect(screen.getByText('Bản vẽ Concept Bối cảnh')).toBeInTheDocument();
    expect(screen.getByText('Toàn cảnh (Wide Shot)')).toBeInTheDocument();
    expect(screen.getByText('Góc cận cảnh (Close-up)')).toBeInTheDocument();

    // Location reference status instead of lock button
    expect(screen.getByText('Tham chiếu Bối cảnh & Địa điểm')).toBeInTheDocument();
    expect(screen.queryByTestId('detail-lock-btn')).not.toBeInTheDocument();
  });

  it('renders 3-column layout with Era Stages, Hero Artwork Canvas, and merged Version & Audit Trail', () => {
    const rev1: BibleEntryRevisionDto = {
      id: 'rev-v1',
      bibleEntryId: mockEntityWithImage.id,
      versionNumber: 1,
      summary: 'Initial draft',
      snapshotJson: '{}',
      contentHash: 'hash1',
      reviewStatus: 'Draft',
      isLocked: false,
      isInitialVersion: true,
      referenceImageUrl: '/api/series/ser-1/bible/assets/hash-v1',
      stageName: 'Giai đoạn chuẩn',
      effectiveFromChapterNumber: 1,
      createdAt: '2026-10-01T00:00:00Z',
    };

    const rev2: BibleEntryRevisionDto = {
      id: 'rev-v2',
      bibleEntryId: mockEntityWithImage.id,
      versionNumber: 2,
      summary: 'Concept submitted',
      snapshotJson: '{}',
      contentHash: 'hash2',
      reviewStatus: 'ConceptSubmitted',
      isLocked: false,
      isInitialVersion: false,
      referenceImageUrl: '/api/series/ser-1/bible/assets/hash-v2',
      stageName: 'Giai đoạn chuẩn',
      effectiveFromChapterNumber: 1,
      createdAt: '2026-10-15T00:00:00Z',
    };

    vi.spyOn(bibleService, 'getEntryHistory').mockResolvedValue([rev1, rev2]);

    const entryWithTwoRevisions: BibleEntryDto = {
      id: mockEntityWithImage.id,
      seriesBibleId: 'sb-1',
      code: mockEntityWithImage.code,
      name: mockEntityWithImage.name,
      description: mockEntityWithImage.description,
      detailsJson: '{}',
      category: 'Character',
      priority: 'Standard',
      strictCheck: false,
      isActive: true,
      effectiveRevision: rev2,
      createdAt: '2026-10-01T00:00:00Z',
    };

    render(
      <BibleEntityDetailModal
        {...defaultProps}
        entity={mockEntityWithImage}
        rawEntry={entryWithTwoRevisions}
        latestSavedRevision={rev2}
      />,
    );

    // Column 1: Era stages selector
    expect(screen.getByTestId('era-stages-selector')).toBeInTheDocument();
    expect(screen.getByText('Thời kỳ & Giai đoạn')).toBeInTheDocument();

    // Column 2: Hero Artwork Canvas
    expect(screen.getByTestId('auth-image')).toBeInTheDocument();

    // Column 3: Merged Version and Audit Trail
    expect(screen.getByText('Phiên bản & Nhật ký')).toBeInTheDocument();
    expect(screen.getByText('Lịch sử thay đổi')).toBeInTheDocument();
  });

  it('renders conceptImageUrl and chronological events in the audit trail when available', () => {
    const revWithEvents = {
      id: 'rev-with-events-1',
      bibleEntryId: mockEntityWithImage.id,
      versionNumber: 2,
      summary: 'Revision with events',
      snapshotJson: '{}',
      contentHash: 'hash-events-1234567890',
      effectiveFromChapterNumber: 1,
      isInitialVersion: false,
      createdAt: '2026-11-02T10:00:00Z',
      isLocked: false,
      reviewStatus: 'ConceptSubmitted' as const,
      conceptImageUrl: 'https://example.com/concept-special.png',
      events: [
        {
          id: 'evt-1',
          type: 'Created' as const,
          actorId: null,
          comment: null,
          imageUrl: null,
          eventHash: 'hash-created-event',
          createdAt: '2026-11-02T09:00:00Z',
        },
        {
          id: 'evt-2',
          type: 'ConceptSubmitted' as const,
          actorId: 'artist-1',
          comment: 'Bản vẽ chi tiết phục trang',
          imageUrl: 'https://example.com/concept-special.png',
          eventHash: 'hash-concept-event',
          createdAt: '2026-11-02T10:00:00Z',
        },
      ],
    };

    const entryWithEvents: BibleEntryDto = {
      id: mockEntityWithImage.id,
      seriesBibleId: 'sb-1',
      code: mockEntityWithImage.code,
      name: mockEntityWithImage.name,
      description: mockEntityWithImage.description,
      detailsJson: '{}',
      category: 'Character',
      priority: 'Standard',
      strictCheck: false,
      isActive: true,
      effectiveRevision: revWithEvents,
      createdAt: '2026-10-01T00:00:00Z',
    };

    render(
      <BibleEntityDetailModal
        {...defaultProps}
        entity={mockEntityWithImage}
        rawEntry={entryWithEvents}
        latestSavedRevision={revWithEvents}
      />,
    );

    // Verify Audit Trail has the real event items
    expect(screen.getByText('Lịch sử thay đổi')).toBeInTheDocument();
    expect(screen.getByText(/Đã nộp Concept Art/)).toBeInTheDocument();
    expect(screen.getByText(/Bản vẽ chi tiết phục trang/)).toBeInTheDocument();
  });

  describe('workbench Writer ↔ Artist (sidebar, trạng thái, đặc tả theo danh mục)', () => {
    const draftEntry: BibleEntryDto = {
      ...mockRawEntry,
      category: 1,
      detailsJson: JSON.stringify({
        attributes: { age: '17', hair: 'tóc ngắn rối', forbidden: 'không đeo kính' },
      }),
      effectiveRevision: {
        ...mockRawEntry.effectiveRevision!,
        isLocked: false,
        lockedAt: null,
        reviewStatus: 'Draft',
      },
    };

    it('renders the character spec schema with filled values and completeness', () => {
      render(<BibleEntityDetailModal {...defaultProps} rawEntry={draftEntry} />);

      expect(screen.getByText('Kiểu tóc')).toBeInTheDocument();
      expect(screen.getByText('tóc ngắn rối')).toBeInTheDocument();
      expect(screen.getByText('Không được vẽ')).toBeInTheDocument();
      expect(screen.getByText('không đeo kính')).toBeInTheDocument();
      expect(screen.getByTestId('spec-completeness').textContent).toMatch(/^3\//);
      expect(screen.getByText('Turnaround trước / nghiêng / sau')).toBeInTheDocument();
    });

    it('shows whose turn it is: Artist uploads on a Draft visual entry', () => {
      localStorage.setItem(
        'activeWorkspace',
        JSON.stringify({ id: 'ws-1', currentUserRole: 'ARTIST' }),
      );
      render(
        <BibleEntityDetailModal
          {...defaultProps}
          isProducer={false}
          isArtist
          rawEntry={draftEntry}
        />,
      );

      const strip = screen.getByTestId('bible-status-strip');
      expect(strip.textContent).toContain('Artist tải Model Sheet theo đặc tả');
      expect(strip.textContent).toContain('Đến lượt bạn');
      localStorage.removeItem('activeWorkspace');
    });

    it('treats BE category 3 as a Prop (visual, lockable) even though the list tab groups it with terminology', () => {
      render(
        <BibleEntityDetailModal
          {...defaultProps}
          entity={{ ...mockEntityNoImage, category: 'terminology', isVisualDesign: true }}
          rawEntry={{ ...draftEntry, category: 3, detailsJson: '{}' }}
        />,
      );

      expect(screen.getByText('Chủ sở hữu')).toBeInTheDocument();
      expect(screen.getByTestId('bible-artwork-column')).toBeInTheDocument();
    });

    it('hides the artwork column for text-only entries', () => {
      render(
        <BibleEntityDetailModal
          {...defaultProps}
          entity={{ ...mockEntityNoImage, category: 'terminology' }}
          rawEntry={{ ...draftEntry, category: 4, detailsJson: '{}' }}
        />,
      );

      expect(screen.getByText('Cách dùng trong thoại')).toBeInTheDocument();
      expect(screen.queryByTestId('bible-artwork-column')).toBeNull();
    });

    it('lists script usages in the sidebar and warns about Gate 1', async () => {
      vi.spyOn(bibleService, 'getEntryHistory').mockResolvedValue([]);
      vi.spyOn(bibleService, 'getEntryUsages').mockResolvedValue([
        {
          chapterId: 'c1',
          chapterNumber: 1,
          chapterTitle: 'Mở đầu',
          lineCount: 2,
          isScriptFrozen: true,
          isCanonSatisfied: true,
        },
        {
          chapterId: 'c3',
          chapterNumber: 3,
          chapterTitle: 'Biến cố',
          lineCount: 1,
          isScriptFrozen: false,
          isCanonSatisfied: false,
        },
      ]);
      render(<BibleEntityDetailModal {...defaultProps} seriesId='ser-1' rawEntry={draftEntry} />);

      expect(await screen.findByText('Biến cố')).toBeInTheDocument();
      expect(screen.getByText('Đạt Canon')).toBeInTheDocument();
      expect(screen.getByText('Chưa khoá Canon')).toBeInTheDocument();
      expect(screen.getByText(/bị chặn ở Gate 1/)).toBeInTheDocument();
    });

    it('switches to a sibling entry of the same category from the sidebar', () => {
      const onSelectEntity = vi.fn();
      const other = {
        ...mockEntityNoImage,
        id: 'ent-2',
        code: 'CHR-002',
        name: 'Lão Mã',
        category: mockEntityWithImage.category,
      };
      render(
        <BibleEntityDetailModal
          {...defaultProps}
          entities={[mockEntityWithImage, other]}
          onSelectEntity={onSelectEntity}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /Lão Mã/ }));
      expect(onSelectEntity).toHaveBeenCalledWith(other);
    });
  });

  describe('Khóa Canon & Duyệt thiết kế (2026-11-04 Handoff & Breaking changes)', () => {
    it('chỉ hiển thị nút Khóa Canon khi revision là WriterEndorsed; ẩn khi Draft, ConceptSubmitted hoặc ReworkRequired', () => {
      const baseRev: BibleEntryRevisionDto = {
        id: 'rev-test-lock',
        bibleEntryId: mockEntityWithImage.id,
        versionNumber: 1,
        summary: 'Bản vẽ',
        snapshotJson: '{}',
        contentHash: 'hash-test-lock-12345',
        effectiveFromChapterNumber: 1,
        isInitialVersion: true,
        createdAt: '2026-11-04T10:00:00Z',
        isLocked: false,
        reviewStatus: 'Draft',
        referenceImageUrl: 'https://example.com/concept.png',
      };

      const makeEntry = (rev: BibleEntryRevisionDto): BibleEntryDto => ({
        id: mockEntityWithImage.id,
        seriesBibleId: 'sb-1',
        code: mockEntityWithImage.code,
        name: mockEntityWithImage.name,
        description: mockEntityWithImage.description,
        detailsJson: '{}',
        category: 'Character',
        priority: 'Standard',
        strictCheck: false,
        isActive: true,
        effectiveRevision: rev,
        createdAt: '2026-10-01T00:00:00Z',
      });

      // 1. Khi Draft: không có nút khóa Canon
      const { rerender } = render(
        <BibleEntityDetailModal
          {...defaultProps}
          isProducer={true}
          entity={mockEntityWithImage}
          rawEntry={makeEntry(baseRev)}
          latestSavedRevision={baseRev}
        />,
      );
      expect(screen.queryByTestId('detail-lock-btn')).not.toBeInTheDocument();

      // 2. Khi ConceptSubmitted: không có nút khóa Canon
      const conceptRev: BibleEntryRevisionDto = { ...baseRev, reviewStatus: 'ConceptSubmitted' };
      rerender(
        <BibleEntityDetailModal
          {...defaultProps}
          isProducer={true}
          entity={mockEntityWithImage}
          rawEntry={makeEntry(conceptRev)}
          latestSavedRevision={conceptRev}
        />,
      );
      expect(screen.queryByTestId('detail-lock-btn')).not.toBeInTheDocument();

      // 3. Khi ReworkRequired: không có nút khóa Canon
      const reworkRev: BibleEntryRevisionDto = { ...baseRev, reviewStatus: 'ReworkRequired' };
      rerender(
        <BibleEntityDetailModal
          {...defaultProps}
          isProducer={true}
          entity={mockEntityWithImage}
          rawEntry={makeEntry(reworkRev)}
          latestSavedRevision={reworkRev}
        />,
      );
      expect(screen.queryByTestId('detail-lock-btn')).not.toBeInTheDocument();

      // 4. Khi WriterEndorsed: hiển thị nút Khóa Canon
      const endorsedRev: BibleEntryRevisionDto = { ...baseRev, reviewStatus: 'WriterEndorsed' };
      rerender(
        <BibleEntityDetailModal
          {...defaultProps}
          isProducer={true}
          entity={mockEntityWithImage}
          rawEntry={makeEntry(endorsedRev)}
          latestSavedRevision={endorsedRev}
        />,
      );
      expect(screen.getByTestId('detail-lock-btn')).toBeInTheDocument();
      expect(screen.getByTestId('detail-lock-btn')).toHaveTextContent('🔒 Khóa Canon');
    });

    it('vô hiệu hóa nút Duyệt thiết kế khi revision đang ReworkRequired', () => {
      const reworkRev: BibleEntryRevisionDto = {
        id: 'rev-rework',
        bibleEntryId: mockEntityWithImage.id,
        versionNumber: 1,
        summary: 'Bản vẽ cần sửa',
        snapshotJson: '{}',
        contentHash: 'hash-rework-123',
        effectiveFromChapterNumber: 1,
        isInitialVersion: true,
        createdAt: '2026-11-04T10:00:00Z',
        isLocked: false,
        reviewStatus: 'ReworkRequired',
        referenceImageUrl: 'https://example.com/concept.png',
      };

      const reworkEntry: BibleEntryDto = {
        id: mockEntityWithImage.id,
        seriesBibleId: 'sb-1',
        code: mockEntityWithImage.code,
        name: mockEntityWithImage.name,
        description: mockEntityWithImage.description,
        detailsJson: '{}',
        category: 'Character',
        priority: 'Standard',
        strictCheck: false,
        isActive: true,
        effectiveRevision: reworkRev,
        createdAt: '2026-10-01T00:00:00Z',
      };

      render(
        <BibleEntityDetailModal
          {...defaultProps}
          canEndorse={true}
          entity={mockEntityWithImage}
          rawEntry={reworkEntry}
          latestSavedRevision={reworkRev}
        />,
      );

      const endorseBtn = screen.getByTestId('detail-endorse-btn');
      expect(endorseBtn).toBeDisabled();
      expect(endorseBtn).toHaveAttribute(
        'title',
        'Bản vẽ đang bị yêu cầu vẽ lại; cần Artist nộp lại concept trước khi duyệt',
      );
    });
  });
});
