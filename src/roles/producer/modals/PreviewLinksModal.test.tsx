import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { PreviewLinksModal } from './PreviewLinksModal';
import {
  previewLinkService,
  PreviewLinkDto,
  PreviewFeedbackDto,
} from '@/services/previewLink.service';
import { assignmentService } from '@/services/assignment.service';

vi.mock('@/services/previewLink.service', () => ({
  previewLinkService: {
    getPreviewLinks: vi.fn(),
    createPreviewLink: vi.fn(),
    revokePreviewLink: vi.fn(),
    getPreviewFeedback: vi.fn(),
    triagePreviewFeedback: vi.fn(),
    createChangeRequestFromFeedback: vi.fn(),
  },
}));

vi.mock('@/services/assignment.service', () => ({
  assignmentService: { getAssignments: vi.fn() },
}));

describe('PreviewLinksModal', () => {
  const mockLinks: PreviewLinkDto[] = [
    {
      id: 'link-1',
      chapterId: 'chap-101',
      recipientEmail: 'reviewer@editor.com',
      status: 'Active',
      createdAt: '2026-10-08T10:00:00Z',
      expiresAt: '2026-10-15T10:00:00Z',
      chapterVersion: 1,
      pageCount: 12,
      accessCount: 5,
      deniedCount: 0,
      lastAccessAt: '2026-10-08T12:00:00Z',
      feedbackCount: 2,
    },
    {
      id: 'link-2',
      chapterId: 'chap-101',
      recipientEmail: 'old@partner.com',
      status: 'Revoked',
      createdAt: '2026-10-01T10:00:00Z',
      expiresAt: '2026-10-04T10:00:00Z',
      chapterVersion: 1,
      pageCount: 12,
      accessCount: 1,
      deniedCount: 1,
      feedbackCount: 0,
    },
  ];

  const mockFeedback: PreviewFeedbackDto[] = [
    {
      id: 'fb-1',
      previewLinkId: 'link-1',
      chapterId: 'chap-101',
      pageId: 'page-1',
      panelId: 'panel-2',
      assetReferenceId: 'asset-1',
      chapterVersion: 1,
      recipientEmail: 'reviewer@editor.com',
      message: 'Khung 2 cần phóng to thoại một chút',
      status: 'New',
      createdAt: '2026-10-08T14:00:00Z',
    },
    {
      id: 'fb-2',
      previewLinkId: 'link-1',
      chapterId: 'chap-101',
      pageId: null,
      panelId: null,
      chapterVersion: 1,
      recipientEmail: 'reviewer@editor.com',
      message: 'Cốt truyện mở đầu hấp dẫn',
      status: 'Noted',
      triageNote: 'Đã lưu lại',
      createdAt: '2026-10-08T15:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (previewLinkService.getPreviewLinks as any).mockResolvedValue(mockLinks);
    (previewLinkService.getPreviewFeedback as any).mockResolvedValue(mockFeedback);
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  it('hiển thị danh sách link xem thử và số liệu truy cập khi mở modal', async () => {
    render(
      <PreviewLinksModal
        isOpen={true}
        onClose={vi.fn()}
        chapterId='chap-101'
        chapterNumber={1}
        chapterTitle='The Letter in the Foam'
        chapterStatus='Approved'
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Chương #1: The Letter in the Foam')).toBeInTheDocument();
      expect(screen.getByText('reviewer@editor.com')).toBeInTheDocument();
      expect(screen.getByText('old@partner.com')).toBeInTheDocument();
    });

    expect(screen.getByText('Hoạt động')).toBeInTheDocument();
    expect(screen.getByText('Đã thu hồi')).toBeInTheDocument();
  });

  it('tạo link xem thử mới, hiển thị link một lần và sao chép vào clipboard thành công', async () => {
    (previewLinkService.createPreviewLink as any).mockResolvedValueOnce({
      id: 'new-link-99',
      recipientEmail: 'newpartner@studio.com',
      expiresAt: '2026-10-18T10:00:00Z',
      token: 'secret-token-token123',
    });

    render(
      <PreviewLinksModal
        isOpen={true}
        onClose={vi.fn()}
        chapterId='chap-101'
        chapterNumber={1}
        chapterTitle='The Letter in the Foam'
        chapterStatus='Approved'
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('create-preview-email-input')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('create-preview-email-input'), {
      target: { value: 'newpartner@studio.com' },
    });
    fireEvent.change(screen.getByTestId('create-preview-hours-input'), {
      target: { value: '48' },
    });

    fireEvent.click(screen.getByTestId('create-preview-link-btn'));

    await waitFor(() => {
      expect(previewLinkService.createPreviewLink).toHaveBeenCalledWith('chap-101', {
        recipientEmail: 'newpartner@studio.com',
        expiresInHours: 48,
      });
      expect(screen.getByTestId('created-link-banner')).toBeInTheDocument();
      expect(screen.getByTestId('created-preview-link-url')).toHaveTextContent(
        '/preview/secret-token-token123',
      );
    });

    // Bấm nút sao chép link
    const copyBtn = screen.getByTestId('copy-preview-link-btn');
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('/preview/secret-token-token123'),
    );
    expect(screen.getByText('Đã sao chép')).toBeInTheDocument();
  });

  it('thu hồi link xem thử đang hoạt động', async () => {
    (previewLinkService.revokePreviewLink as any).mockResolvedValueOnce(undefined);

    render(
      <PreviewLinksModal
        isOpen={true}
        onClose={vi.fn()}
        chapterId='chap-101'
        chapterNumber={1}
        chapterStatus='Approved'
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('revoke-link-btn-link-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('revoke-link-btn-link-1'));

    await waitFor(() => {
      expect(previewLinkService.revokePreviewLink).toHaveBeenCalledWith('chap-101', 'link-1');
    });
  });

  it('triage phản hồi: NeedsChange bắt buộc ghi chú (note); gợi ý mở lại chương', async () => {
    const mockReopen = vi.fn();
    (previewLinkService.triagePreviewFeedback as any).mockResolvedValueOnce({
      ...mockFeedback[0],
      status: 'NeedsChange',
      triageNote: 'Cần sửa thoại khung 2',
    });

    render(
      <PreviewLinksModal
        isOpen={true}
        onClose={vi.fn()}
        chapterId='chap-101'
        chapterNumber={1}
        chapterStatus='Approved'
        onReopenChapter={mockReopen}
      />,
    );

    // Chuyển sang Tab Feedback
    fireEvent.click(screen.getByTestId('tab-preview-feedback'));

    await waitFor(() => {
      expect(screen.getByTestId('feedback-item-fb-1')).toBeInTheDocument();
    });

    const needsChangeBtn = screen.getByTestId('triage-needschange-btn-fb-1');
    // Khi chưa nhập note: nút NeedsChange BỊ VÔ HIỆU HÓA
    expect(needsChangeBtn).toBeDisabled();

    // Nhập ghi chú xử lý
    const noteInput = screen.getByTestId('triage-note-input-fb-1');
    fireEvent.change(noteInput, { target: { value: 'Cần sửa thoại khung 2' } });

    // Nút NeedsChange trở nên khả dụng
    expect(needsChangeBtn).not.toBeDisabled();

    // Bấm nút Cần sửa (NeedsChange)
    fireEvent.click(needsChangeBtn);

    await waitFor(() => {
      expect(previewLinkService.triagePreviewFeedback).toHaveBeenCalledWith('chap-101', 'fb-1', {
        decision: 'NeedsChange',
        note: 'Cần sửa thoại khung 2',
      });
    });

    // Khi phản hồi cần sửa đổi, nút "Mở lại chương" được gợi ý
    await waitFor(() => {
      expect(screen.getByTestId('reopen-chapter-from-feedback-btn-fb-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('reopen-chapter-from-feedback-btn-fb-1'));

    expect(mockReopen).toHaveBeenCalledWith('Cần sửa thoại khung 2');
  });

  describe('5.7: phản hồi cần sửa → yêu cầu sửa (chương đã mở lại)', () => {
    const needsChange: PreviewFeedbackDto = {
      ...mockFeedback[0],
      status: 'NeedsChange',
      triageNote: 'Phóng to thoại khung 2',
    };
    const assignment = (id: string, target: string, status: string, brief: string) => ({
      id,
      targetEntityId: target,
      status,
      brief,
      assignedRole: 'Letterer',
    });

    const renderInProduction = () =>
      render(
        <PreviewLinksModal
          isOpen={true}
          onClose={vi.fn()}
          chapterId='chap-101'
          chapterNumber={1}
          chapterStatus='InProduction'
          onReopenChapter={vi.fn()}
        />,
      );

    it('chọn việc (việc đúng trang/khung lên đầu, việc đang chờ duyệt bị khoá) rồi tạo yêu cầu sửa', async () => {
      (previewLinkService.getPreviewFeedback as any).mockResolvedValue([needsChange]);
      (assignmentService.getAssignments as any).mockResolvedValue([
        assignment('a-other', 'page-9', 'Approved', 'Lettering trang 9'),
        assignment('a-review', 'page-1', 'UnderReview', 'Lettering lại trang 1'),
        assignment('a-panel', 'panel-2', 'Approved', 'Lettering khung 2'),
      ]);
      (previewLinkService.createChangeRequestFromFeedback as any).mockResolvedValueOnce({
        ...needsChange,
        changeRequestId: 'cr-1',
      });

      renderInProduction();
      fireEvent.click(screen.getByTestId('tab-preview-feedback'));

      const select = await screen.findByTestId('cr-assignment-select-fb-1');
      await waitFor(() => expect(select.querySelectorAll('option')).toHaveLength(4));
      const options = Array.from(select.querySelectorAll('option'));
      expect(options[1]).toHaveValue('a-review');
      expect(options[1]).toBeDisabled();
      expect(options[2]).toHaveValue('a-panel');
      expect(screen.queryByTestId('reopen-chapter-from-feedback-btn-fb-1')).not.toBeInTheDocument();

      const createBtn = screen.getByTestId('create-cr-from-feedback-btn-fb-1');
      expect(createBtn).toBeDisabled();
      fireEvent.change(select, { target: { value: 'a-panel' } });
      fireEvent.click(createBtn);

      await waitFor(() => {
        expect(previewLinkService.createChangeRequestFromFeedback).toHaveBeenCalledWith(
          'chap-101',
          'fb-1',
          { assignmentId: 'a-panel' },
        );
        expect(screen.getByTestId('feedback-cr-linked-fb-1')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('triage-noted-btn-fb-1')).not.toBeInTheDocument();
    });

    it('phản hồi đã thành yêu cầu sửa thì không cho phân loại hay tạo lại', async () => {
      (previewLinkService.getPreviewFeedback as any).mockResolvedValue([
        { ...needsChange, changeRequestId: 'cr-1' },
      ]);
      (assignmentService.getAssignments as any).mockResolvedValue([]);

      renderInProduction();
      fireEvent.click(screen.getByTestId('tab-preview-feedback'));

      expect(await screen.findByTestId('feedback-cr-linked-fb-1')).toBeInTheDocument();
      expect(screen.queryByTestId('triage-needschange-btn-fb-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('cr-assignment-select-fb-1')).not.toBeInTheDocument();
    });
  });
});
