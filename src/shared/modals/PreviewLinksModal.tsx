import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  ShieldAlert,
  RotateCcw,
  AlertTriangle,
  MessageSquare,
  Clock,
  Mail,
  CheckCircle2,
  Loader2,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  previewLinkService,
  PreviewLinkDto,
  CreatedPreviewLinkDto,
  PreviewFeedbackDto,
  PreviewFeedbackStatus,
} from '@/services/previewLink.service';
import { assignmentService } from '@/services/assignment.service';
import type { AssignmentDto } from '@/types/pipeline';
import { WorkspaceRole } from '@/types';

export interface PreviewLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string;
  chapterNumber: number | string;
  chapterTitle?: string | null;
  chapterStatus?: string;
  workspaceRole?: WorkspaceRole | null;
  onReopenChapter?: (reason?: string) => Promise<void> | void;
  onShowToast?: (title: string, desc: string) => void;
}

export const PreviewLinksModal: React.FC<PreviewLinksModalProps> = ({
  isOpen,
  onClose,
  chapterId,
  chapterNumber,
  chapterTitle,
  chapterStatus,
  workspaceRole,
  onReopenChapter,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'links' | 'feedback'>('links');

  // Tab 1: Quản lý Link
  const [links, setLinks] = useState<PreviewLinkDto[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(72);
  const [creatingLink, setCreatingLink] = useState(false);
  const [createdLink, setCreatedLink] = useState<CreatedPreviewLinkDto | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Tab 2: Phản hồi & Triage
  const [feedbacks, setFeedbacks] = useState<PreviewFeedbackDto[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | PreviewFeedbackStatus>('ALL');
  const [triageNotes, setTriageNotes] = useState<Record<string, string>>({});
  const [triagingId, setTriagingId] = useState<string | null>(null);

  // 5.7: phản hồi NeedsChange → yêu cầu sửa của một việc (sau khi chương mở lại)
  const [assignments, setAssignments] = useState<AssignmentDto[]>([]);
  const [crAssignment, setCrAssignment] = useState<Record<string, string>>({});
  const [creatingCrId, setCreatingCrId] = useState<string | null>(null);
  const isInProduction = chapterStatus === 'InProduction';

  const fetchLinks = useCallback(async () => {
    if (!chapterId) return;
    setLoadingLinks(true);
    try {
      const data = await previewLinkService.getPreviewLinks(chapterId);
      setLinks(data || []);
    } catch {
      // ignore
    } finally {
      setLoadingLinks(false);
    }
  }, [chapterId]);

  const fetchFeedback = useCallback(async () => {
    if (!chapterId) return;
    setLoadingFeedback(true);
    try {
      const statusParam = filterStatus === 'ALL' ? undefined : filterStatus;
      const data = await previewLinkService.getPreviewFeedback(chapterId, statusParam);
      setFeedbacks(data || []);
    } catch {
      // ignore
    } finally {
      setLoadingFeedback(false);
    }
  }, [chapterId, filterStatus]);

  useEffect(() => {
    if (isOpen) {
      fetchLinks();
      fetchFeedback();
    }
  }, [isOpen, fetchLinks, fetchFeedback]);

  useEffect(() => {
    if (isOpen && isInProduction && chapterId) {
      assignmentService.getAssignments(chapterId).then(setAssignments);
    }
  }, [isOpen, isInProduction, chapterId]);

  if (!isOpen) return null;

  const isApproved = chapterStatus === 'Approved';

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterId || !recipientEmail.trim()) return;

    setCreatingLink(true);
    try {
      const res = await previewLinkService.createPreviewLink(chapterId, {
        recipientEmail: recipientEmail.trim(),
        expiresInHours: Number(expiresInHours) || 72,
      });
      setCreatedLink(res);
      setRecipientEmail('');
      setHasCopied(false);
      onShowToast?.(
        'Tạo link xem thử thành công',
        'Vui lòng sao chép link ngay. Token chỉ hiển thị một lần duy nhất.',
      );
      fetchLinks();
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Không thể tạo link xem thử. Chỉ tạo được khi chương ở trạng thái Đã Duyệt (Approved).';
      onShowToast?.('Lỗi tạo link', msg);
    } finally {
      setCreatingLink(false);
    }
  };

  const handleCopyLink = (token: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${origin}/preview/${token}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(fullUrl);
    }
    setHasCopied(true);
    onShowToast?.('Đã sao chép', 'Đã sao chép liên kết xem thử vào clipboard.');
    setTimeout(() => setHasCopied(false), 3000);
  };

  const handleRevokeLink = async (linkId: string) => {
    if (!confirm('Bạn có chắc muốn thu hồi liên kết xem thử này ngay lập tức?')) return;
    setRevokingId(linkId);
    try {
      await previewLinkService.revokePreviewLink(chapterId, linkId);
      onShowToast?.('Đã thu hồi', 'Liên kết xem thử đã bị vô hiệu hóa.');
      fetchLinks();
    } catch (err: any) {
      onShowToast?.('Lỗi thu hồi', err?.response?.data?.error || 'Không thể thu hồi link.');
    } finally {
      setRevokingId(null);
    }
  };

  const handleTriage = async (feedbackId: string, decision: 'Noted' | 'NeedsChange') => {
    const note = triageNotes[feedbackId]?.trim() || '';
    if (decision === 'NeedsChange' && !note) {
      onShowToast?.(
        'Bắt buộc ghi chú',
        'Bạn phải nhập lý do / ghi chú khi yêu cầu sửa đổi (NeedsChange).',
      );
      return;
    }

    setTriagingId(feedbackId);
    try {
      const updated = await previewLinkService.triagePreviewFeedback(chapterId, feedbackId, {
        decision,
        note: note || undefined,
      });
      setFeedbacks((prev) => prev.map((f) => (f.id === feedbackId ? updated : f)));
      onShowToast?.(
        'Đã xử lý phản hồi',
        decision === 'NeedsChange'
          ? 'Đã chuyển thành Cần sửa đổi. Bạn có thể mở lại chương để phân công chỉnh sửa.'
          : 'Đã ghi nhận phản hồi của độc giả/đối tác.',
      );
    } catch (err: any) {
      onShowToast?.('Lỗi xử lý', err?.response?.data?.error || 'Không thể xử lý phản hồi.');
    } finally {
      setTriagingId(null);
    }
  };

  const handleCreateChangeRequest = async (feedbackId: string, assignmentId: string) => {
    setCreatingCrId(feedbackId);
    try {
      const updated = await previewLinkService.createChangeRequestFromFeedback(
        chapterId,
        feedbackId,
        { assignmentId },
      );
      setFeedbacks((prev) => prev.map((f) => (f.id === feedbackId ? updated : f)));
      assignmentService.getAssignments(chapterId).then(setAssignments);
      onShowToast?.(
        'Đã tạo yêu cầu sửa',
        'Việc được chọn đã nhận yêu cầu sửa; người làm đã được thông báo.',
      );
    } catch (err: any) {
      onShowToast?.(
        'Không tạo được yêu cầu sửa',
        err?.response?.data?.error || 'Vui lòng thử lại.',
      );
    } finally {
      setCreatingCrId(null);
    }
  };

  /** Việc gắn đúng trang/khung của phản hồi lên đầu danh sách chọn. */
  const assignmentOptions = (fb: PreviewFeedbackDto) =>
    [...assignments].sort(
      (a, b) =>
        Number([fb.panelId, fb.pageId].includes(b.targetEntityId)) -
        Number([fb.panelId, fb.pageId].includes(a.targetEntityId)),
    );

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div
      className='fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150'
      data-testid='preview-links-modal'
    >
      <div className='bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-[#E7E7E7] overflow-hidden text-xs text-[#171717]'>
        {/* Header */}
        <div className='px-6 py-4 border-b border-[#E7E7E7] flex items-center justify-between bg-[#FAF8F5]'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#F97316] shadow-2xs'>
              <Share2 className='w-5 h-5' />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-[9px] font-bold'>
                  CF5 // PREVIEW &amp; FEEDBACK
                </span>
                <span className='text-[10px] text-[#888888] font-mono'>
                  Bản xem thử bảo mật &amp; Phản hồi đối tác
                </span>
              </div>
              <h2 className='text-base font-bold text-[#171717] mt-0.5'>
                Chương #{chapterNumber}
                {chapterTitle ? `: ${chapterTitle}` : ''}
              </h2>
            </div>
          </div>

          <button
            type='button'
            onClick={onClose}
            className='w-8 h-8 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] flex items-center justify-center text-[#888888] hover:text-[#171717] transition-all cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className='px-6 border-b border-[#E7E7E7] flex items-center gap-4 bg-white font-semibold text-xs'>
          <button
            type='button'
            onClick={() => setActiveTab('links')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'links'
                ? 'border-[#F97316] text-[#F97316]'
                : 'border-transparent text-[#737373] hover:text-[#171717]'
            }`}
            data-testid='tab-preview-links'
          >
            <Share2 className='w-4 h-4' />
            <span>Liên Kết Xem Thử ({links.length})</span>
          </button>

          <button
            type='button'
            onClick={() => setActiveTab('feedback')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'feedback'
                ? 'border-[#F97316] text-[#F97316]'
                : 'border-transparent text-[#737373] hover:text-[#171717]'
            }`}
            data-testid='tab-preview-feedback'
          >
            <MessageSquare className='w-4 h-4' />
            <span>Phản Hồi Độc Giả ({feedbacks.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className='p-6 overflow-y-auto flex-1 custom-scrollbar space-y-5'>
          {activeTab === 'links' && (
            <div className='space-y-5'>
              {/* Cảnh báo nếu chương chưa Approved */}
              {!isApproved && (
                <div className='p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2.5'>
                  <AlertTriangle className='w-4 h-4 shrink-0 text-amber-600 mt-0.5' />
                  <div className='text-xs'>
                    <strong>Lưu ý nghiệp vụ (BR-09):</strong> Chỉ các chương đã được Producer hoàn
                    tất duyệt sản xuất (trạng thái <code>Approved</code>) mới đủ điều kiện tạo liên
                    kết xem thử ra bên ngoài.
                  </div>
                </div>
              )}

              {/* Form tạo link mới (cho Producer) */}
              {isApproved && (
                <form
                  onSubmit={handleCreateLink}
                  className='p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E7E7] space-y-3'
                >
                  <div className='flex items-center gap-1.5 font-bold text-[#171717]'>
                    <Sparkles className='w-4 h-4 text-[#F97316]' />
                    <span>Tạo Liên Kết Xem Thử Mới Cho Đối Tác / Độc Giả</span>
                  </div>

                  <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                    <div className='sm:col-span-2'>
                      <label className='block font-semibold text-[#171717] mb-1'>
                        Email người nhận (để đóng watermark định danh) *
                      </label>
                      <div className='relative'>
                        <Mail className='w-3.5 h-3.5 text-[#888888] absolute left-3 top-2.5' />
                        <input
                          type='email'
                          required
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          placeholder='partner@publisher.com hoặc reader@gmail.com'
                          className='w-full pl-8 pr-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
                          data-testid='create-preview-email-input'
                        />
                      </div>
                    </div>

                    <div>
                      <label className='block font-semibold text-[#171717] mb-1'>
                        Thời hạn hiệu lực (giờ)
                      </label>
                      <div className='relative'>
                        <Clock className='w-3.5 h-3.5 text-[#888888] absolute left-3 top-2.5' />
                        <input
                          type='number'
                          min={1}
                          max={720}
                          value={expiresInHours}
                          onChange={(e) => setExpiresInHours(parseInt(e.target.value) || 72)}
                          className='w-full pl-8 pr-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg text-xs font-mono focus:outline-none focus:border-[#F97316]'
                          data-testid='create-preview-hours-input'
                        />
                      </div>
                    </div>
                  </div>

                  <div className='flex justify-end pt-1'>
                    <button
                      type='submit'
                      disabled={creatingLink || !recipientEmail.trim()}
                      className='px-4 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer'
                      data-testid='create-preview-link-btn'
                    >
                      {creatingLink ? (
                        <Loader2 className='w-3.5 h-3.5 animate-spin' />
                      ) : (
                        <Share2 className='w-3.5 h-3.5' />
                      )}
                      <span>Tạo Link Xem Thử</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Banner hiển thị link vừa tạo (Chỉ hiện MỘT lần) */}
              {createdLink && (
                <div
                  className='p-4 rounded-xl bg-orange-50/80 border border-orange-300 text-orange-950 space-y-2.5 animate-in fade-in duration-200'
                  data-testid='created-link-banner'
                >
                  <div className='flex items-center justify-between'>
                    <div className='font-bold flex items-center gap-1.5 text-orange-900'>
                      <CheckCircle2 className='w-4 h-4 text-orange-600' />
                      <span>Link Xem Thử Đã Được Khởi Tạo Thành Công!</span>
                    </div>
                    <button
                      type='button'
                      onClick={() => setCreatedLink(null)}
                      className='text-orange-700 hover:text-orange-950 text-[11px] font-semibold underline cursor-pointer'
                    >
                      Đóng thông báo
                    </button>
                  </div>

                  <div className='p-2.5 bg-white rounded-lg border border-orange-200 flex items-center justify-between gap-2'>
                    <span
                      className='font-mono text-xs text-[#171717] break-all select-all'
                      data-testid='created-preview-link-url'
                    >
                      {origin}/preview/{createdLink.token}
                    </span>
                    <button
                      type='button'
                      onClick={() => handleCopyLink(createdLink.token)}
                      className='px-3 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer'
                      data-testid='copy-preview-link-btn'
                    >
                      {hasCopied ? (
                        <Check className='w-3.5 h-3.5' />
                      ) : (
                        <Copy className='w-3.5 h-3.5' />
                      )}
                      <span>{hasCopied ? 'Đã sao chép' : 'Sao chép link'}</span>
                    </button>
                  </div>

                  <div className='text-[11px] text-amber-800 bg-amber-100/60 p-2 rounded-lg border border-amber-200/80'>
                    ⚠️ <strong>Cảnh báo bảo mật:</strong> Token liên kết chỉ hiển thị một lần duy
                    nhất trên giao diện (máy chủ chỉ lưu mã băm SHA-256). Vui lòng sao chép và gửi
                    cho người nhận ngay bây giờ.
                  </div>
                </div>
              )}

              {/* Bảng danh sách liên kết đã tạo */}
              <div className='border border-[#E7E7E7] rounded-xl overflow-hidden'>
                <div className='p-3 bg-[#FAF8F5] border-b border-[#E7E7E7] flex items-center justify-between'>
                  <div className='font-bold text-xs text-[#171717] flex items-center gap-1.5'>
                    <span>Danh Sách Link Xem Thử Đã Phát Hành</span>
                  </div>
                  <button
                    type='button'
                    onClick={fetchLinks}
                    disabled={loadingLinks}
                    className='p-1 rounded hover:bg-white text-[#737373] hover:text-[#171717] transition-colors cursor-pointer'
                    title='Tải lại'
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${loadingLinks ? 'animate-spin text-[#F97316]' : ''}`}
                    />
                  </button>
                </div>

                <table className='w-full text-left border-collapse text-xs'>
                  <thead className='bg-[#FAF8F5] border-b border-[#E7E7E7] font-mono text-[10px] text-[#737373] uppercase'>
                    <tr>
                      <th className='py-2.5 px-3'>Email Người Nhận</th>
                      <th className='py-2.5 px-3'>Trạng Thái</th>
                      <th className='py-2.5 px-3'>Hạn Sử Dụng</th>
                      <th className='py-2.5 px-3'>Truy Cập (Mở / Chặn)</th>
                      <th className='py-2.5 px-3'>Lần Cuối Mở</th>
                      <th className='py-2.5 px-3'>Phản Hồi</th>
                      <th className='py-2.5 px-3 text-right'>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-[#E7E7E7]'>
                    {loadingLinks ? (
                      <tr>
                        <td colSpan={7} className='py-8 text-center text-[#888888]'>
                          <Loader2 className='w-5 h-5 animate-spin mx-auto mb-1 text-[#F97316]' />
                          <span>Đang nạp danh sách liên kết...</span>
                        </td>
                      </tr>
                    ) : links.length === 0 ? (
                      <tr>
                        <td colSpan={7} className='py-8 text-center text-[#888888]'>
                          Chưa có link xem thử nào được tạo cho chương này.
                        </td>
                      </tr>
                    ) : (
                      links.map((item) => {
                        const isExpired = new Date(item.expiresAt) < new Date();
                        const statusClass =
                          item.status === 'Active' && !isExpired
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : item.status === 'Revoked'
                              ? 'bg-red-50 text-red-700 border-red-300'
                              : 'bg-zinc-100 text-zinc-600 border-zinc-300';
                        const statusLabel =
                          item.status === 'Active' && !isExpired
                            ? 'Hoạt động'
                            : item.status === 'Revoked'
                              ? 'Đã thu hồi'
                              : 'Hết hạn';

                        return (
                          <tr key={item.id} className='hover:bg-[#FAF8F5] transition-colors'>
                            <td className='py-2.5 px-3 font-medium text-[#171717]'>
                              {item.recipientEmail}
                            </td>
                            <td className='py-2.5 px-3 whitespace-nowrap'>
                              <span
                                className={`px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold ${statusClass}`}
                              >
                                {statusLabel}
                              </span>
                            </td>
                            <td className='py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-[#555555]'>
                              {new Date(item.expiresAt).toLocaleString('vi-VN')}
                            </td>
                            <td className='py-2.5 px-3 font-mono text-[11px] text-[#555555]'>
                              {item.accessCount} / {item.deniedCount}
                            </td>
                            <td className='py-2.5 px-3 font-mono text-[11px] text-[#737373]'>
                              {item.lastAccessAt
                                ? new Date(item.lastAccessAt).toLocaleString('vi-VN')
                                : 'Chưa xem'}
                            </td>
                            <td className='py-2.5 px-3 font-mono text-[11px] font-bold text-[#F97316]'>
                              {item.feedbackCount || 0}
                            </td>
                            <td className='py-2.5 px-3 text-right'>
                              {item.status === 'Active' && !isExpired && (
                                <button
                                  type='button'
                                  onClick={() => handleRevokeLink(item.id)}
                                  disabled={revokingId === item.id}
                                  className='px-2 py-1 rounded bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-semibold text-[10px] transition-colors cursor-pointer disabled:opacity-50'
                                  data-testid={`revoke-link-btn-${item.id}`}
                                >
                                  {revokingId === item.id ? 'Đang thu hồi...' : 'Thu hồi'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className='space-y-4'>
              {/* Filter Bar */}
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-1.5'>
                  <span className='text-[11px] font-semibold text-[#737373]'>Lọc trạng thái:</span>
                  {(['ALL', 'New', 'Noted', 'NeedsChange'] as const).map((st) => (
                    <button
                      key={st}
                      type='button'
                      onClick={() => setFilterStatus(st)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                        filterStatus === st
                          ? 'bg-[#171717] text-white border-[#171717]'
                          : 'bg-white hover:bg-[#FAF8F5] border-[#E7E7E7] text-[#555555]'
                      }`}
                      data-testid={`filter-feedback-${st}`}
                    >
                      {st === 'ALL'
                        ? 'Tất cả'
                        : st === 'New'
                          ? 'Mới (New)'
                          : st === 'Noted'
                            ? 'Đã ghi nhận'
                            : 'Cần sửa (NeedsChange)'}
                    </button>
                  ))}
                </div>

                <button
                  type='button'
                  onClick={fetchFeedback}
                  disabled={loadingFeedback}
                  className='p-1 rounded hover:bg-[#FAF8F5] text-[#737373] hover:text-[#171717] transition-colors cursor-pointer'
                  title='Tải lại phản hồi'
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${loadingFeedback ? 'animate-spin text-[#F97316]' : ''}`}
                  />
                </button>
              </div>

              {/* Feedback List */}
              {loadingFeedback ? (
                <div className='py-12 text-center text-[#888888]'>
                  <Loader2 className='w-5 h-5 animate-spin mx-auto mb-1 text-[#F97316]' />
                  <span>Đang tải danh sách phản hồi...</span>
                </div>
              ) : feedbacks.length === 0 ? (
                <div className='py-12 text-center text-[#888888] border border-dashed border-[#E7E7E7] rounded-xl space-y-1'>
                  <MessageSquare className='w-6 h-6 mx-auto text-[#888888]' />
                  <div className='font-bold text-[#171717]'>Chưa có phản hồi nào</div>
                  <p className='text-[11px] text-[#737373]'>
                    Các ý kiến đóng góp từ liên kết xem thử công khai sẽ xuất hiện ở đây.
                  </p>
                </div>
              ) : (
                <div className='space-y-3'>
                  {feedbacks.map((fb) => {
                    const noteValue = triageNotes[fb.id] || '';
                    const isTriaging = triagingId === fb.id;
                    const scopeLabel = fb.panelId
                      ? `Khung #${fb.panelId.slice(0, 6)} (Trang #${fb.pageId?.slice(0, 6)})`
                      : fb.pageId
                        ? `Trang #${fb.pageId.slice(0, 6)}`
                        : 'Toàn Chương';

                    return (
                      <div
                        key={fb.id}
                        className='p-4 rounded-xl border border-[#E7E7E7] bg-white space-y-3 hover:shadow-xs transition-shadow'
                        data-testid={`feedback-item-${fb.id}`}
                      >
                        <div className='flex items-center justify-between flex-wrap gap-2'>
                          <div className='flex items-center gap-2'>
                            <span className='px-2 py-0.5 rounded bg-orange-50 border border-orange-200 text-[#F97316] font-mono text-[10px] font-bold'>
                              {scopeLabel}
                            </span>
                            <span className='font-semibold text-[#171717]'>
                              {fb.recipientEmail}
                            </span>
                            {fb.assetReferenceId && (
                              <span className='text-[10px] font-mono text-[#888888]'>
                                (Bản v{fb.chapterVersion})
                              </span>
                            )}
                          </div>

                          <div className='flex items-center gap-2'>
                            <span
                              className={`px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold ${
                                fb.status === 'New'
                                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                                  : fb.status === 'Noted'
                                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                                    : 'bg-red-50 text-red-700 border-red-300'
                              }`}
                              data-testid={`feedback-status-${fb.id}`}
                            >
                              {fb.status === 'New'
                                ? 'Chờ duyệt'
                                : fb.status === 'Noted'
                                  ? 'Đã ghi nhận'
                                  : 'Cần sửa đổi'}
                            </span>
                            <span className='text-[10px] text-[#888888] font-mono'>
                              {new Date(fb.createdAt).toLocaleString('vi-VN')}
                            </span>
                          </div>
                        </div>

                        {/* Nội dung phản hồi */}
                        <div className='p-3 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs text-[#171717] leading-relaxed'>
                          &ldquo;{fb.message}&rdquo;
                        </div>

                        {/* Ghi chú triage đã có */}
                        {fb.triageNote && (
                          <div className='text-[11px] text-[#555555] bg-blue-50/60 border border-blue-200/80 p-2.5 rounded-lg'>
                            <strong className='text-blue-900'>Ghi chú xử lý:</strong>{' '}
                            {fb.triageNote}
                            {fb.triagedAt && (
                              <span className='text-[10px] text-blue-700 font-mono ml-2'>
                                ({new Date(fb.triagedAt).toLocaleString('vi-VN')})
                              </span>
                            )}
                          </div>
                        )}

                        {/* Đã thành yêu cầu sửa: không phân loại lại được (BE trả 409) */}
                        {fb.changeRequestId && (
                          <div
                            className='pt-2 border-t border-[#E7E7E7] flex items-center gap-1.5 text-[11px] text-emerald-800'
                            data-testid={`feedback-cr-linked-${fb.id}`}
                          >
                            <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' />
                            <span>
                              Đã chuyển thành yêu cầu sửa. Theo dõi tiến độ ở danh sách Yêu cầu sửa
                              của chương.
                            </span>
                          </div>
                        )}

                        {/* Triage Actions Form */}
                        {!fb.changeRequestId && (
                          <div className='pt-2 border-t border-[#E7E7E7] flex flex-col sm:flex-row items-stretch sm:items-center gap-2'>
                            <input
                              type='text'
                              value={noteValue}
                              onChange={(e) =>
                                setTriageNotes((prev) => ({ ...prev, [fb.id]: e.target.value }))
                              }
                              placeholder={
                                fb.status === 'NeedsChange'
                                  ? 'Nhập ghi chú / lý do sửa đổi (Bắt buộc)...'
                                  : 'Nhập ghi chú xử lý (tuỳ chọn)...'
                              }
                              className='flex-1 px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
                              data-testid={`triage-note-input-${fb.id}`}
                            />

                            <div className='flex items-center gap-1.5 shrink-0'>
                              <button
                                type='button'
                                disabled={isTriaging}
                                onClick={() => handleTriage(fb.id, 'Noted')}
                                className='px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50'
                                data-testid={`triage-noted-btn-${fb.id}`}
                              >
                                Ghi nhận (Noted)
                              </button>

                              <button
                                type='button'
                                disabled={isTriaging || !noteValue.trim()}
                                onClick={() => handleTriage(fb.id, 'NeedsChange')}
                                className='px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-300 text-orange-800 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'
                                title={
                                  !noteValue.trim()
                                    ? 'NeedsChange bắt buộc phải nhập ghi chú'
                                    : 'Đánh dấu cần sửa đổi'
                                }
                                data-testid={`triage-needschange-btn-${fb.id}`}
                              >
                                Cần sửa (NeedsChange)
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Gợi ý mở lại chương khi phản hồi là NeedsChange (chỉ chương Approved mới mở lại được) */}
                        {!fb.changeRequestId &&
                          (fb.status === 'NeedsChange' || noteValue) &&
                          isApproved &&
                          onReopenChapter && (
                            <div className='p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg flex items-center justify-between gap-3 text-amber-900'>
                              <span className='text-[11px]'>
                                💡 Phản hồi này yêu cầu sửa đổi. Bạn có thể mở lại chương để chuyển
                                về sản xuất:
                              </span>
                              <button
                                type='button'
                                onClick={() =>
                                  onReopenChapter(fb.triageNote || noteValue || fb.message)
                                }
                                className='px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-1 shrink-0 transition-colors cursor-pointer shadow-2xs'
                                data-testid={`reopen-chapter-from-feedback-btn-${fb.id}`}
                              >
                                <RotateCcw className='w-3.5 h-3.5' />
                                <span>Mở lại chương</span>
                              </button>
                            </div>
                          )}

                        {/* 5.7: chương đã mở lại → chuyển phản hồi thành yêu cầu sửa của một việc */}
                        {!fb.changeRequestId && fb.status === 'NeedsChange' && isInProduction && (
                          <div className='p-2.5 bg-orange-50/70 border border-orange-200 rounded-lg flex flex-col sm:flex-row sm:items-center gap-2 text-orange-950'>
                            <label
                              htmlFor={`cr-assignment-${fb.id}`}
                              className='text-[11px] shrink-0'
                            >
                              Giao sửa cho việc:
                            </label>
                            <select
                              id={`cr-assignment-${fb.id}`}
                              value={crAssignment[fb.id] || ''}
                              onChange={(e) =>
                                setCrAssignment((prev) => ({ ...prev, [fb.id]: e.target.value }))
                              }
                              className='flex-1 min-w-0 px-2 py-1.5 bg-white border border-orange-200 rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
                              data-testid={`cr-assignment-select-${fb.id}`}
                            >
                              <option value=''>-- Chọn việc cần sửa --</option>
                              {assignmentOptions(fb).map((a) => {
                                const waiting =
                                  a.status === 'Submitted' || a.status === 'UnderReview';
                                return (
                                  <option key={a.id} value={a.id} disabled={waiting}>
                                    {a.assignedRole} · {a.brief.slice(0, 60)} (
                                    {waiting ? 'đang chờ duyệt' : a.status})
                                  </option>
                                );
                              })}
                            </select>
                            <button
                              type='button'
                              disabled={!crAssignment[fb.id] || creatingCrId === fb.id}
                              onClick={() => handleCreateChangeRequest(fb.id, crAssignment[fb.id])}
                              className='px-3 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1 shrink-0 transition-colors cursor-pointer'
                              data-testid={`create-cr-from-feedback-btn-${fb.id}`}
                            >
                              {creatingCrId === fb.id && (
                                <Loader2 className='w-3.5 h-3.5 animate-spin' />
                              )}
                              <span>Tạo yêu cầu sửa</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default PreviewLinksModal;
