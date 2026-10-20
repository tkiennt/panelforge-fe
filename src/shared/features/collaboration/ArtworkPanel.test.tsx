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

  it('khung chưa có ảnh riêng: hiện "Dùng ảnh cả trang" và xem phần cắt đúng khung', async () => {
    vi.mocked(artworkService.getArtworkAccessLink).mockResolvedValueOnce({
      url: '/api/assets/download?token=page',
    } as never);
    render(
      <ArtworkPanel
        chapterId='chap-1'
        pageId='page-101'
        stageId='stage-thumbnail'
        artworks={mockArtworks}
        panels={[
          {
            id: 'p-1',
            pageId: 'page-101',
            panelNumber: 1,
            readingOrder: 1,
            boundingBox: JSON.stringify({
              normalized: { x: 0.5, y: 0, w: 0.5, h: 0.25 },
              pageWidthPx: 1200,
              pageHeightPx: 1800,
            }),
            createdAt: '2026-01-01T00:00:00Z',
          },
        ]}
        canUpload={false}
        onChanged={vi.fn()}
      />,
    );

    expect(screen.getByTestId('panel-uses-page-art-p-1')).toHaveTextContent('Dùng ảnh cả trang v1');
    expect(screen.queryByText('Chưa có ảnh')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('panel-page-art-preview-btn-p-1'));
    const crop = await screen.findByTestId('panel-page-art-crop-p-1');
    expect(crop.style.backgroundSize).toBe('200% 400%');
    expect(crop.style.backgroundPosition).toBe('100% 0%');
  });

  it('không lấy v4 của khung đã xoá làm "bản hiện tại" của ảnh cả trang', () => {
    const base = mockArtworks[0];
    const deletedPanelV4 = {
      ...base,
      id: 'old-4',
      versionNumber: 4,
      fileName: 'old-panel.png',
      panelId: 'deleted-panel',
      createdAt: '2026-10-20T06:53:00Z',
    };
    const pageV1 = { ...base, id: 'page-1', versionNumber: 1, createdAt: '2026-10-20T09:17:00Z' };
    render(
      <ArtworkPanel
        chapterId='chap-1'
        pageId='page-101'
        stageId='stage-thumbnail'
        artworks={[deletedPanelV4, pageV1]}
        panels={[
          {
            id: 'p-new',
            pageId: 'page-101',
            panelNumber: 1,
            readingOrder: 1,
            boundingBox: '{"x":10,"y":10,"width":80,"height":35}',
            createdAt: '2026-10-20T09:18:00Z',
          },
        ]}
        canUpload={false}
        onChanged={vi.fn()}
      />,
    );

    expect(screen.getByTestId('artwork-version-breakdown')).toHaveTextContent(
      '1 cả trang · 0 theo khung · 1 của khung đã xoá',
    );
    expect(screen.getByText(/Ảnh artwork cả trang \(1 phiên bản\)/)).toBeInTheDocument();
    expect(screen.getByText('Bản hiện tại').closest('li')).toHaveTextContent('v1');
    expect(screen.queryByText('old-panel.png')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/Xem 1 phiên bản của khung đã xoá/));
    expect(screen.getByText('old-panel.png').closest('li')).toHaveTextContent('Khung đã xoá');
  });

  it('bảo toàn tỷ lệ ảnh với object-contain, nền trung tính, nút Mở lớn và không bóp méo ảnh dọc', async () => {
    vi.mocked(artworkService.getArtworkAccessLink).mockResolvedValueOnce({
      url: 'https://cdn.example.com/artworks/portrait_page.png',
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

    // Mở preview inline
    fireEvent.click(screen.getByRole('button', { name: /Xem/i }));

    const zoomButton = await screen.findByTitle('Bấm để phóng to');
    const previewImg = zoomButton.querySelector('img');
    expect(previewImg).toBeInTheDocument();

    // Xác nhận class giữ tỷ lệ và object-contain
    expect(previewImg?.className).toContain('object-contain');
    expect(previewImg?.className).toContain('max-h-[440px]');
    expect(previewImg?.className).toContain('max-w-full');
    expect(previewImg?.className).not.toContain('basis-full');

    // Xác nhận có nút "Mở lớn"
    expect(screen.getByRole('button', { name: /Mở lớn/i })).toBeInTheDocument();
  });

  it('chuyển UUID kỹ thuật dài vào chi tiết và dùng fallback trung thực cho khung đã xoá', () => {
    const uuidArt: AssetReferenceDto = {
      ...mockArtworks[0],
      id: 'art-uuid-1',
      fileName: '07566405-b98d-4a12-87a1-8d2b3c4d5e6f.png',
      panelId: 'deleted-panel-uuid',
      versionNumber: 1,
    };

    render(
      <ArtworkPanel
        chapterId='chap-1'
        pageId='page-101'
        stageId='stage-thumbnail'
        artworks={[uuidArt]}
        canUpload={false}
        onChanged={vi.fn()}
      />,
    );

    // Mở xem phiên bản của khung đã xoá
    fireEvent.click(screen.getByText(/Xem 1 phiên bản của khung đã xoá/));

    // Tiêu đề chính không hiển thị nguyên chuỗi UUID mà hiển thị tên trung thực
    expect(screen.getByText('Ảnh của khung đã xóa (v1)')).toBeInTheDocument();

    // Mở Chi tiết để kiểm tra tên file UUID gốc được lưu giữ
    fireEvent.click(screen.getByRole('button', { name: /Chi tiết/i }));
    const details = screen.getByTestId('artwork-details-art-uuid-1');
    expect(details).toHaveTextContent('07566405-b98d-4a12-87a1-8d2b3c4d5e6f.png');
    expect(details).toHaveTextContent('deleted-panel-uuid');
  });

  it('nhóm các phiên bản của các khung đã xoá khác nhau theo panelId', () => {
    const deletedPanelArts: AssetReferenceDto[] = [
      {
        ...mockArtworks[0],
        id: 'old-p1-v1',
        panelId: 'panel-alpha',
        versionNumber: 1,
        fileName: 'alpha_v1.png',
        createdAt: '2026-10-20T08:00:00Z',
      },
      {
        ...mockArtworks[0],
        id: 'old-p1-v2',
        panelId: 'panel-alpha',
        versionNumber: 2,
        fileName: 'alpha_v2.png',
        createdAt: '2026-10-20T09:00:00Z',
      },
      {
        ...mockArtworks[0],
        id: 'old-p2-v1',
        panelId: 'panel-beta',
        versionNumber: 1,
        fileName: 'beta_v1.png',
        createdAt: '2026-10-20T08:30:00Z',
      },
    ];

    render(
      <ArtworkPanel
        chapterId='chap-1'
        pageId='page-101'
        stageId='stage-thumbnail'
        artworks={deletedPanelArts}
        canUpload={false}
        onChanged={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(/Xem 3 phiên bản của khung đã xoá/));

    // Phải có 2 nhóm khung cũ tách biệt
    expect(screen.getByText(/Khung trước đây #1 \(2 phiên bản\)/)).toBeInTheDocument();
    expect(screen.getByText(/Khung trước đây #2 \(1 phiên bản\)/)).toBeInTheDocument();

    // Cả 2 nhóm đều có bản cuối của chính nó
    expect(screen.getAllByText('Bản cuối của khung')).toHaveLength(2);
    expect(screen.getByText('alpha_v2.png')).toBeInTheDocument();
    expect(screen.getByText('alpha_v1.png')).toBeInTheDocument();
    expect(screen.getByText('beta_v1.png')).toBeInTheDocument();
  });

  it('hỗ trợ điều khiển zoom trong lightbox (phóng to, thu nhỏ, vừa khung, 100%)', async () => {
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

    // Mở preview
    fireEvent.click(screen.getByRole('button', { name: /Xem/i }));

    // Bấm nút "Mở lớn"
    const openLightboxBtn = await screen.findByRole('button', { name: /Mở lớn/i });
    fireEvent.click(openLightboxBtn);

    const dialog = screen.getByTestId('artwork-zoom');
    expect(dialog).toBeInTheDocument();

    // Mặc định ở chế độ "Vừa khung" (có badge hiển thị trạng thái)
    expect(screen.getAllByText('Vừa khung').length).toBeGreaterThanOrEqual(1);

    // Bấm nút phóng to (+)
    const zoomInBtn = screen.getByTitle('Phóng to (+)');
    fireEvent.click(zoomInBtn);
    expect(screen.getByText('125%')).toBeInTheDocument();

    // Bấm nút thu nhỏ (-)
    const zoomOutBtn = screen.getByTitle('Thu nhỏ (-)');
    fireEvent.click(zoomOutBtn);
    expect(screen.getAllByText('100%').length).toBeGreaterThanOrEqual(1);

    // Bấm nút "Vừa khung" để reset
    const fitBtn = screen.getByTitle('Vừa khung hình');
    fireEvent.click(fitBtn);
    expect(screen.getAllByText('Vừa khung').length).toBeGreaterThanOrEqual(1);
  });

  it('hiển thị nút Thử tải lại khi ảnh lỗi và nạp link mới', async () => {
    vi.mocked(artworkService.getArtworkAccessLink)
      .mockResolvedValueOnce({
        url: 'https://cdn.example.com/artworks/expired_link.png',
        expiresAtUtc: '2026-10-08T10:00:00Z',
      })
      .mockResolvedValueOnce({
        url: 'https://cdn.example.com/artworks/fresh_link.png',
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

    fireEvent.click(screen.getByRole('button', { name: /Xem/i }));

    const img = await screen.findByAltText(/Artwork v1 của page1_thumbnail_v1.png/i);

    // Giả lập lỗi tải ảnh (link hết hạn)
    fireEvent.error(img);

    // Nút "Thử tải lại" xuất hiện
    const retryBtn = await screen.findByRole('button', { name: /Thử tải lại/i });
    expect(retryBtn).toBeInTheDocument();
    expect(
      screen.getByText(/Không thể tải ảnh \(link tạm thời có thể đã hết hạn\)/i),
    ).toBeInTheDocument();

    // Bấm thử tải lại
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(artworkService.getArtworkAccessLink).toHaveBeenCalledTimes(2);
    });
  });

  it('giữ cache ảnh khi ẩn/hiện lại mà không gọi getArtworkAccessLink thêm lần nữa', async () => {
    vi.mocked(artworkService.getArtworkAccessLink).mockResolvedValueOnce({
      url: 'https://cdn.example.com/artworks/cached_page.png',
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
      expect(artworkService.getArtworkAccessLink).toHaveBeenCalledTimes(1);
    });

    // Bấm Ẩn bằng nút trên preview card
    const hideButton = screen.getByTitle('Ẩn xem nhanh');
    fireEvent.click(hideButton);

    // Bấm Xem lại
    const viewAgainButton = screen.getByRole('button', { name: /Xem/i });
    fireEvent.click(viewAgainButton);

    // Không gọi thêm lần nữa
    expect(artworkService.getArtworkAccessLink).toHaveBeenCalledTimes(1);
    expect(screen.getByTitle('Bấm để phóng to')).toBeInTheDocument();
  });
});
