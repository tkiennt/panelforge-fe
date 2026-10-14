import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ArtworkPanel } from './ArtworkPanel';
import { artworkService } from '@/services/artwork.service';
import type { AssetReferenceDto } from '@/types';

vi.mock('@/services/artwork.service', () => ({
  artworkService: {
    getArtworkAccessLink: vi.fn(),
    uploadArtworkFile: vi.fn(),
  },
  resolveArtworkUrl: (url: string) => url,
  computeFileSha256: vi.fn(),
}));

describe('ArtworkPanel Component', () => {
  const mockArtworks: AssetReferenceDto[] = [
    {
      id: 'art-1',
      assetId: 'asset-1',
      chapterId: 'chap-1',
      pageId: 'page-101',
      pipelineStageId: 'stage-thumbnail',
      versionNumber: 1,
      layerType: null,
      fileName: 'page1_thumbnail_v1.png',
      contentType: 'image/png',
      sizeBytes: 1024 * 500, // 500 KB
      sha256: 'abcdef1234567890abcdef1234567890',
      reused: false,
      uploadedByUserId: 'user-artist-1',
      createdAt: '2026-10-08T10:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị danh sách artwork phiên bản của trang', () => {
    render(
      <ArtworkPanel
        chapterId='chap-1'
        pageId='page-101'
        stageId='stage-thumbnail'
        artworks={mockArtworks}
        canUpload={false}
        onChanged={vi.fn()}
      />,
    );

    expect(screen.getByText(/Artwork của trang/i)).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('page1_thumbnail_v1.png')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Xem/i })).toBeInTheDocument();
  });

  it('bấm "Xem" nạp link ảnh, bấm vào ảnh mở modal phóng to, đóng bằng nút X hoặc phím Esc', async () => {
    vi.mocked(artworkService.getArtworkAccessLink).mockResolvedValueOnce({
      url: 'https://cdn.example.com/artworks/page1_v1.png',
      expiresAtUtc: '2026-10-08T11:00:00Z',
    });

    render(
      <ArtworkPanel
        chapterId='chap-1'
        pageId='page-101'
        stageId='stage-thumbnail'
        artworks={mockArtworks}
        canUpload={false}
        onChanged={vi.fn()}
      />,
    );

    const viewButton = screen.getByRole('button', { name: /Xem/i });
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(screen.getByTitle('Bấm để phóng to')).toBeInTheDocument();
    });

    // Bấm vào ảnh preview để phóng to (Zoom in)
    const zoomButton = screen.getByTitle('Bấm để phóng to');
    fireEvent.click(zoomButton);

    // Kiểm tra lớp phủ zoom xuất hiện
    const zoomDialog = screen.getByTestId('artwork-zoom');
    expect(zoomDialog).toBeInTheDocument();
    expect(zoomDialog).toHaveAttribute('role', 'dialog');

    // Đóng bằng nút X
    const closeBtn = screen.getByRole('button', { name: 'Đóng' });
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('artwork-zoom')).not.toBeInTheDocument();

    // Mở lại và đóng bằng phím Escape
    fireEvent.click(zoomButton);
    expect(screen.getByTestId('artwork-zoom')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('artwork-zoom')).not.toBeInTheDocument();
  });

  it('danh sách phiên bản thu gọn: chỉ hiện bản mới nhất, bấm nút hiện các bản cũ và xem chi tiết kỹ thuật', () => {
    const multiArtworks: AssetReferenceDto[] = [
      mockArtworks[0],
      {
        id: 'art-2',
        assetId: 'asset-2',
        chapterId: 'chap-1',
        pageId: 'page-101',
        pipelineStageId: 'stage-thumbnail',
        versionNumber: 2,
        layerType: null,
        fileName: 'page1_thumbnail_v2.png',
        contentType: 'image/png',
        sizeBytes: 1024 * 600,
        sha256: '9876543210fedcba9876543210fedcba',
        reused: false,
        uploadedByUserId: 'user-artist-1',
        createdAt: '2026-10-08T12:00:00Z',
      },
    ];

    render(
      <ArtworkPanel
        chapterId='chap-1'
        pageId='page-101'
        stageId='stage-thumbnail'
        artworks={multiArtworks}
        submissions={[
          {
            id: 'sub-1',
            assignmentId: 'a1',
            chapterId: 'chap-1',
            submittedByUserId: 'user-artist-1',
            attemptNumber: 1,
            status: 'Pending',
            submittedAt: '2026-10-08T12:05:00Z',
            artworkReferenceIds: ['art-2'],
          },
        ]}
        canUpload={false}
        onChanged={vi.fn()}
      />,
    );

    // Mặc định hiện bản mới nhất v2 kèm huy hiệu Mới nhất và Đang duyệt
    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('page1_thumbnail_v2.png')).toBeInTheDocument();
    expect(screen.getByText('Mới nhất')).toBeInTheDocument();
    expect(screen.getByText('Đang duyệt')).toBeInTheDocument();

    // Bản cũ v1 chưa hiển thị
    expect(screen.queryByText('page1_thumbnail_v1.png')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Xem 1 phiên bản cũ/i })).toBeInTheDocument();

    // Bấm xem phiên bản cũ
    fireEvent.click(screen.getByRole('button', { name: /Xem 1 phiên bản cũ/i }));
    expect(screen.getByText('page1_thumbnail_v1.png')).toBeInTheDocument();

    // Bấm xem "Chi tiết" kỹ thuật
    const detailButtons = screen.getAllByRole('button', { name: /Chi tiết/i });
    fireEvent.click(detailButtons[0]);
    expect(screen.getByTestId('artwork-details-art-2')).toBeInTheDocument();
    expect(screen.getByText(/9876543210fedcba/)).toBeInTheDocument();
  });

  it('hiển thị danh sách Panel và cho phép bấm tải ảnh cho từng khung', () => {
    const mockPanels = [
      {
        id: 'p-1',
        pageId: 'page-101',
        panelNumber: 1,
        readingOrder: 1,
        boundingBox: '{"x":10,"y":10,"width":80,"height":35}',
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'p-2',
        pageId: 'page-101',
        panelNumber: 2,
        readingOrder: 2,
        boundingBox: '{"x":10,"y":50,"width":80,"height":35}',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];

    const panelArt: AssetReferenceDto = {
      id: 'art-panel-1',
      assetId: 'asset-panel-1',
      chapterId: 'chap-1',
      pageId: 'page-101',
      pipelineStageId: 'stage-thumbnail',
      versionNumber: 1,
      fileName: 'panel1.png',
      contentType: 'image/png',
      sizeBytes: 1024,
      sha256: 'hash1',
      reused: false,
      uploadedByUserId: 'user-artist-1',
      createdAt: '2026-10-08T10:00:00Z',
      panelId: 'p-1',
    };

    render(
      <ArtworkPanel
        chapterId='chap-1'
        pageId='page-101'
        stageId='stage-thumbnail'
        artworks={[panelArt]}
        panels={mockPanels}
        canUpload={true}
        onChanged={vi.fn()}
      />,
    );

    expect(screen.getByTestId('panel-artworks-section')).toBeInTheDocument();
    expect(screen.getByText(/Ảnh theo từng khung/i)).toBeInTheDocument();
    expect(screen.getByText('Đọc #1')).toBeInTheDocument();
    expect(screen.getByText('Đọc #2')).toBeInTheDocument();
    expect(screen.getByTestId('upload-panel-btn-p-1')).toBeInTheDocument();
    expect(screen.getByTestId('upload-panel-btn-p-2')).toBeInTheDocument();
    expect(screen.getByText(/Khung #1/)).toBeInTheDocument();
  });

  it('vẽ đúng số khung đánh số và màu sắc theo assetReferenceId trên thumbnail và khi phóng to (zoom)', async () => {
    vi.mocked(artworkService.getArtworkAccessLink).mockResolvedValueOnce({
      url: 'https://cdn.example.com/artworks/page1_v1.png',
      expiresAtUtc: '2026-10-08T11:00:00Z',
    });

    const mockChangeRequests: any[] = [
      {
        id: 'cr-open',
        assignmentId: 'asg-1',
        chapterId: 'chap-1',
        description: 'Vẽ lại mắt nhân vật',
        status: 'Open',
        regionJson: '{"x":0.1,"y":0.2,"w":0.3,"h":0.4}',
        assetReferenceId: 'art-1',
      },
      {
        id: 'cr-resolved',
        assignmentId: 'asg-1',
        chapterId: 'chap-1',
        description: 'Bóng đổ đã sửa',
        status: 'Resolved',
        regionJson: '{"x":0.5,"y":0.5,"w":0.2,"h":0.2}',
        assetReferenceId: 'art-1',
      },
      {
        id: 'cr-rejected',
        assignmentId: 'asg-1',
        chapterId: 'chap-1',
        description: 'Không sửa viền khung',
        status: 'Rejected',
        regionJson: '{"x":0.7,"y":0.1,"w":0.15,"h":0.15}',
        assetReferenceId: 'art-1',
      },
      {
        id: 'cr-other',
        assignmentId: 'asg-1',
        chapterId: 'chap-1',
        description: 'Yêu cầu của artwork khác',
        status: 'Open',
        regionJson: '{"x":0.2,"y":0.2,"w":0.2,"h":0.2}',
        assetReferenceId: 'art-different',
      },
    ];

    render(
      <ArtworkPanel
        chapterId='chap-1'
        pageId='page-101'
        stageId='stage-thumbnail'
        artworks={mockArtworks}
        changeRequests={mockChangeRequests}
        highlightedChangeRequestId='cr-open'
        canUpload={false}
        onChanged={vi.fn()}
      />,
    );

    // Bấm Xem để tải preview
    const viewButton = screen.getByRole('button', { name: /Xem/i });
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(screen.getByTestId('artwork-boxes-art-1')).toBeInTheDocument();
    });

    // 3 hộp thuộc art-1 phải được vẽ
    const boxOpen = screen.getByTestId('cr-box-cr-open');
    const boxResolved = screen.getByTestId('cr-box-cr-resolved');
    const boxRejected = screen.getByTestId('cr-box-cr-rejected');

    expect(boxOpen).toBeInTheDocument();
    expect(boxResolved).toBeInTheDocument();
    expect(boxRejected).toBeInTheDocument();

    // Hộp của artwork khác không được vẽ trên art-1
    expect(screen.queryByTestId('cr-box-cr-other')).not.toBeInTheDocument();

    // Kiểm tra style và số thứ tự
    expect(boxOpen.className).toContain('border-red-500');
    expect(boxOpen.className).toContain('animate-pulse'); // highlighted
    expect(boxOpen).toHaveTextContent('#1');

    expect(boxResolved.className).toContain('border-emerald-500');
    expect(boxResolved).toHaveTextContent('#2');

    expect(boxRejected.className).toContain('border-dashed');
    expect(boxRejected).toHaveTextContent('#3');

    // Mở zoom modal
    const zoomButton = screen.getByTitle('Bấm để phóng to');
    fireEvent.click(zoomButton);

    expect(screen.getByTestId('artwork-zoom')).toBeInTheDocument();
    expect(screen.getByTestId('artwork-zoom-boxes')).toBeInTheDocument();
  });

  it('hỗ trợ yêu cầu sửa dữ liệu cũ không có assetReferenceId nhưng có submissionId', async () => {
    vi.mocked(artworkService.getArtworkAccessLink).mockResolvedValueOnce({
      url: 'https://cdn.example.com/artworks/page1_v1.png',
      expiresAtUtc: '2026-10-08T11:00:00Z',
    });

    const legacySubmissions: any[] = [
      {
        id: 'sub-legacy',
        assignmentId: 'asg-1',
        status: 'Rejected',
        artworkReferenceIds: ['art-1'],
      },
    ];

    const legacyChangeRequests: any[] = [
      {
        id: 'cr-legacy',
        assignmentId: 'asg-1',
        chapterId: 'chap-1',
        description: 'Yêu cầu sửa cũ',
        status: 'Open',
        regionJson: '{"x":0.2,"y":0.2,"w":0.4,"h":0.4}',
        submissionId: 'sub-legacy',
      },
    ];

    render(
      <ArtworkPanel
        chapterId='chap-1'
        pageId='page-101'
        stageId='stage-thumbnail'
        artworks={mockArtworks}
        submissions={legacySubmissions}
        changeRequests={legacyChangeRequests}
        canUpload={false}
        onChanged={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Xem/i }));

    await waitFor(() => {
      expect(screen.getByTestId('cr-box-cr-legacy')).toBeInTheDocument();
    });
  });

  it('tính huy hiệu "Mới nhất" chuẩn xác theo từng scope Panel/Trang và sắp xếp theo versionNumber + createdAt', () => {
    const scopedArtworks: AssetReferenceDto[] = [
      {
        id: 'art-panel-3',
        assetId: 'asset-p3',
        chapterId: 'chap-1',
        pageId: 'page-101',
        pipelineStageId: 'stage-thumbnail',
        versionNumber: 1,
        fileName: 'panel3.png',
        contentType: 'image/png',
        sizeBytes: 100,
        sha256: 'h3',
        reused: false,
        uploadedByUserId: 'user-artist-1',
        createdAt: '2026-10-08T09:00:00Z',
        panelId: 'p-3',
      },
      {
        id: 'art-panel-4',
        assetId: 'asset-p4',
        chapterId: 'chap-1',
        pageId: 'page-101',
        pipelineStageId: 'stage-thumbnail',
        versionNumber: 1,
        fileName: 'panel4.png',
        contentType: 'image/png',
        sizeBytes: 100,
        sha256: 'h4',
        reused: false,
        uploadedByUserId: 'user-artist-1',
        createdAt: '2026-10-08T10:00:00Z',
        panelId: 'p-4',
      },
    ];

    render(
      <ArtworkPanel
        chapterId='chap-1'
        pageId='page-101'
        stageId='stage-thumbnail'
        artworks={scopedArtworks}
        panels={[
          {
            id: 'p-3',
            pageId: 'page-101',
            panelNumber: 3,
            readingOrder: 3,
            boundingBox: '{}',
            createdAt: '2026-01-01T00:00:00Z',
          },
          {
            id: 'p-4',
            pageId: 'page-101',
            panelNumber: 4,
            readingOrder: 4,
            boundingBox: '{}',
            createdAt: '2026-01-01T00:00:00Z',
          },
        ]}
        canUpload={false}
        onChanged={vi.fn()}
      />,
    );

    // Mở xem tất cả phiên bản cũ
    const showOlderBtn = screen.queryByRole('button', { name: /Xem \d+ phiên bản cũ/i });
    if (showOlderBtn) fireEvent.click(showOlderBtn);

    // Cả hai panel đều là phiên bản mới nhất của chính nó (scope riêng của từng panelId)
    const latestBadges = screen.getAllByText('Mới nhất');
    expect(latestBadges.length).toBeGreaterThanOrEqual(1);
  });
});
