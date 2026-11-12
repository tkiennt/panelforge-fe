import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UploadPagesModal } from './UploadPagesModal';
import { pageService, type PageDto } from '@/services/page.service';
import { artworkService } from '@/services/artwork.service';
import type { PipelineStageDto } from '@/services/pipeline.service';

vi.mock('@/services/page.service', () => ({
  pageService: {
    createPage: vi.fn(),
    deletePage: vi.fn(),
  },
}));

vi.mock('@/services/artwork.service', () => ({
  artworkService: {
    uploadArtwork: vi.fn(),
  },
  computeFileSha256: vi.fn().mockResolvedValue('test-sha-256'),
}));

describe('UploadPagesModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockShowToast = vi.fn();

  const mockStages: PipelineStageDto[] = [
    {
      id: 'stage-pencil',
      name: 'Nét chì (Pencil)',
      slug: 'pencil',
      stageOrder: 1,
      isEnabled: true,
      isApprovalGate: false,
      isInitial: true,
      isTerminal: false,
      allowedRole: 'Artist',
    },
    {
      id: 'stage-ink',
      name: 'Đi nét & Trame (Ink)',
      slug: 'ink',
      stageOrder: 2,
      isEnabled: true,
      isApprovalGate: false,
      isInitial: false,
      isTerminal: false,
      allowedRole: 'Artist',
    },
  ];

  const mockPage: PageDto = {
    id: 'page-1',
    chapterId: 'chap-1',
    pageNumber: 1,
    layoutFormat: 'MANGA_PORTRAIT',
    widthPx: 1200,
    heightPx: 1800,
    dpi: 300,
    elementsCount: 0,
    isContentReady: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Image natural dimensions loading
    window.Image = class {
      onload: () => void = () => {};
      onerror: () => void = () => {};
      naturalWidth = 1200;
      naturalHeight = 1800;
      set src(_val: string) {
        setTimeout(() => this.onload(), 0);
      }
    } as any;

    // Mock URL methods
    window.URL.createObjectURL = vi.fn((file: any) => `blob://test-${file.name}`);
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hiển thị chính xác tên công đoạn đang tải ảnh lên và cho phép chuyển đổi stage', () => {
    render(
      <UploadPagesModal
        isOpen={true}
        onClose={mockOnClose}
        chapterId='chap-1'
        selectedPage={mockPage}
        pages={[mockPage]}
        defaultStageId='stage-ink'
        stageName='Đi nét & Trame (Ink)'
        availableStages={mockStages}
        onSuccess={mockOnSuccess}
        showToast={mockShowToast}
      />,
    );

    const stageBanner = screen.getByTestId('upload-target-stage');
    expect(stageBanner).toHaveTextContent('Đi nét & Trame (Ink)');

    // Select dropdown hiển thị cả 2 stage
    const select = screen.getByLabelText('Chọn công đoạn tải ảnh') as HTMLSelectElement;
    expect(select.value).toBe('stage-ink');

    fireEvent.change(select, { target: { value: 'stage-pencil' } });
    expect(select.value).toBe('stage-pencil');
    expect(stageBanner).toHaveTextContent('Nét chì (Pencil)');
  });

  it('khoá tuỳ chọn cập nhật trang hiện tại khi trang đã bị tách việc hoặc hoạ sĩ chỉ giữ panel', () => {
    render(
      <UploadPagesModal
        isOpen={true}
        onClose={mockOnClose}
        chapterId='chap-1'
        selectedPage={mockPage}
        pages={[mockPage]}
        defaultStageId='stage-ink'
        isCurrentPageCarvedOut={true}
        onSuccess={mockOnSuccess}
        showToast={mockShowToast}
      />,
    );

    // Radio cập nhật trang hiện tại bị disabled và có thông báo lý do
    const updateRadio = screen.getByRole('radio', {
      name: /Cập nhật ảnh cho Trang 1 hiện tại/i,
    }) as HTMLInputElement;
    expect(updateRadio.disabled).toBe(true);
    expect(
      screen.getByText(/Trang này đã được tách cho hoạ sĩ khác ở cùng công đoạn/i),
    ).toBeInTheDocument();

    // Radio tạo trang mới được chọn mặc định
    const newPageRadio = screen.getByRole('radio', {
      name: /Tạo thành trang mới tiếp theo/i,
    }) as HTMLInputElement;
    expect(newPageRadio.checked).toBe(true);
  });

  it('khoá tuỳ chọn cập nhật khi hoạ sĩ không có quyền chỉnh sửa (canEditPages=false)', () => {
    render(
      <UploadPagesModal
        isOpen={true}
        onClose={mockOnClose}
        chapterId='chap-1'
        selectedPage={mockPage}
        pages={[mockPage]}
        defaultStageId='stage-ink'
        canEditPages={false}
        onSuccess={mockOnSuccess}
        showToast={mockShowToast}
      />,
    );

    const updateRadio = screen.getByRole('radio', {
      name: /Cập nhật ảnh cho Trang 1 hiện tại/i,
    }) as HTMLInputElement;
    expect(updateRadio.disabled).toBe(true);
    expect(screen.getByText(/Bạn chỉ có quyền xem, không thể tải ảnh/i)).toBeInTheDocument();
  });

  it('chặn tải tệp ảnh vượt quá 20MB', async () => {
    render(
      <UploadPagesModal
        isOpen={true}
        onClose={mockOnClose}
        chapterId='chap-1'
        selectedPage={mockPage}
        pages={[mockPage]}
        defaultStageId='stage-ink'
        onSuccess={mockOnSuccess}
        showToast={mockShowToast}
      />,
    );

    const oversizedFile = new File(['x'.repeat(100)], 'huge.png', { type: 'image/png' });
    Object.defineProperty(oversizedFile, 'size', { value: 21 * 1024 * 1024 });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [oversizedFile] } });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Ảnh quá lớn', expect.stringContaining('20 MB'));
    });
  });

  it('rollback xoá trang đã tạo khi uploadArtwork bị lỗi trong luồng tải 1 trang', async () => {
    const createdPage = { ...mockPage, id: 'new-created-page', pageNumber: 2 };
    (pageService.createPage as any).mockResolvedValue(createdPage);
    (artworkService.uploadArtwork as any).mockRejectedValue(new Error('Lỗi máy chủ 500'));

    render(
      <UploadPagesModal
        isOpen={true}
        onClose={mockOnClose}
        chapterId='chap-1'
        selectedPage={null}
        pages={[mockPage]}
        defaultStageId='stage-ink'
        onSuccess={mockOnSuccess}
        showToast={mockShowToast}
      />,
    );

    const validFile = new File(['image-content'], 'page-2.png', { type: 'image/png' });
    Object.defineProperty(validFile, 'size', { value: 5 * 1024 * 1024 });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByText('page-2.png')).toBeInTheDocument();
    });

    const uploadBtn = screen.getByRole('button', { name: /Tạo trang mới & Tải ảnh/i });
    fireEvent.click(uploadBtn);

    await waitFor(() => {
      expect(pageService.createPage).toHaveBeenCalled();
      expect(artworkService.uploadArtwork).toHaveBeenCalled();
      // Phải gọi deletePage để thu hồi trang mồ côi
      expect(pageService.deletePage).toHaveBeenCalledWith('new-created-page');
      expect(mockShowToast).toHaveBeenCalledWith('Lỗi tải ảnh', 'Lỗi máy chủ 500');
    });
  });

  it('từ chối tệp ảnh bị hỏng không đọc được kích thước', async () => {
    // Giả lập ảnh bị hỏng làm trigger onerror
    window.Image = class {
      onload: () => void = () => {};
      onerror: () => void = () => {};
      set src(_val: string) {
        setTimeout(() => this.onerror(), 0);
      }
    } as any;

    render(
      <UploadPagesModal
        isOpen={true}
        onClose={mockOnClose}
        chapterId='chap-1'
        selectedPage={mockPage}
        pages={[mockPage]}
        defaultStageId='stage-ink'
        onSuccess={mockOnSuccess}
        showToast={mockShowToast}
      />,
    );

    const corruptFile = new File(['corrupt-data'], 'broken.jpg', { type: 'image/jpeg' });
    Object.defineProperty(corruptFile, 'size', { value: 2 * 1024 * 1024 });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [corruptFile] } });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Tệp ảnh lỗi',
        expect.stringContaining('Không thể giải mã tệp ảnh "broken.jpg"'),
      );
    });
  });

  it('hỗ trợ đóng modal bằng phím Escape và thu hồi URL khi unmount', () => {
    const { unmount } = render(
      <UploadPagesModal
        isOpen={true}
        onClose={mockOnClose}
        chapterId='chap-1'
        selectedPage={mockPage}
        pages={[mockPage]}
        defaultStageId='stage-ink'
        onSuccess={mockOnSuccess}
        showToast={mockShowToast}
      />,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();

    unmount();
    expect(window.URL.revokeObjectURL).toBeDefined();
  });
});
