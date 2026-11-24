import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { pageService } from '@/services/page.service';
import type { AssignmentDto, StageTaskDto, TaskGridDto } from '@/types/pipeline';
import { WorkspaceRole } from '@/types';
import { useConfirm } from '@/shared/context/ConfirmContext';
import { useTranslation } from '@/lib/i18n';
import { Modal } from '@/shared/ui';

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
  const { t } = useTranslation();
  const confirm = useConfirm();
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

  // 5.7: phản hồi NeedsChange → yêu cầu sửa của một việc (Assignment cũ hoặc ô Lưới V3 sau khi chương mở lại)
  const [assignments, setAssignments] = useState<AssignmentDto[]>([]);
  const [taskGrid, setTaskGrid] = useState<TaskGridDto | null>(null);
  const [pages, setPages] = useState<Array<{ id: string; pageNumber: number }>>([]);
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
    }
  }, [isOpen, fetchLinks]);

  useEffect(() => {
    if (isOpen) {
      fetchFeedback();
    }
  }, [isOpen, fetchFeedback]);

  useEffect(() => {
    if (!isOpen || !chapterId) {
      setPages([]);
      return;
    }
    Promise.resolve(pageService.getPagesByChapter?.(chapterId))
      .then((res) => setPages(res || []))
      .catch(() => setPages([]));
  }, [isOpen, chapterId]);

  useEffect(() => {
    if (!isOpen || !chapterId) return;
    Promise.resolve(assignmentService.getTaskGrid?.(chapterId))
      .then((res) => setTaskGrid(res || null))
      .catch(() => setTaskGrid(null));
    if (isInProduction) {
      Promise.resolve(assignmentService.getAssignments?.(chapterId))
        .then((res) => setAssignments(res || []))
        .catch(() => setAssignments([]));
    }
  }, [isOpen, isInProduction, chapterId]);

  if (!isOpen) return null;

  const pageNumberById = new Map<string, number>();
  for (const p of pages) pageNumberById.set(p.id, p.pageNumber);
  for (const p of taskGrid?.pages ?? []) pageNumberById.set(p.id, p.pageNumber);

  const isApproved =
    chapterStatus === 'ChapterApproved' || chapterStatus === 'HandedOffAndPublished';

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
        t('common.modals.previewLinks.toastCreatedTitle'),
        t('common.modals.previewLinks.toastCreatedDesc'),
      );
      fetchLinks();
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        t('common.modals.previewLinks.createErrorFallback');
      onShowToast?.(t('common.modals.previewLinks.toastCreateErrorTitle'), msg);
    } finally {
      setCreatingLink(false);
    }
  };

  const handleCopyLink = (token: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${origin}/review/invite/${token}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(fullUrl);
    }
    setHasCopied(true);
    onShowToast?.(
      t('common.modals.previewLinks.toastCopiedTitle'),
      t('common.modals.previewLinks.toastCopiedDesc'),
    );
    setTimeout(() => setHasCopied(false), 3000);
  };

  const handleRevokeLink = async (linkId: string) => {
    if (
      !(await confirm({
        title: t('common.modals.previewLinks.revokeConfirmTitle'),
        description: t('common.modals.previewLinks.revokeConfirmDesc'),
        confirmText: t('common.modals.previewLinks.revokeConfirmBtn'),
        cancelText: t('common.modals.previewLinks.revokeCancelBtn'),
        variant: 'warning',
      }))
    )
      return;
    setRevokingId(linkId);
    try {
      await previewLinkService.revokePreviewLink(chapterId, linkId);
      onShowToast?.(
        t('common.modals.previewLinks.toastRevokedTitle'),
        t('common.modals.previewLinks.toastRevokedDesc'),
      );
      fetchLinks();
    } catch (err: any) {
      onShowToast?.(
        t('common.modals.previewLinks.toastRevokeErrorTitle'),
        err?.response?.data?.error || t('common.modals.previewLinks.revokeErrorFallback'),
      );
    } finally {
      setRevokingId(null);
    }
  };

  const handleTriage = async (feedbackId: string, decision: 'Noted' | 'NeedsChange') => {
    const note = triageNotes[feedbackId]?.trim() || '';
    if (decision === 'NeedsChange' && !note) {
      onShowToast?.(
        t('common.modals.previewLinks.toastNoteRequiredTitle'),
        t('common.modals.previewLinks.toastNoteRequiredDesc'),
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
        t('common.modals.previewLinks.toastTriagedTitle'),
        decision === 'NeedsChange'
          ? t('common.modals.previewLinks.toastTriagedNeedsChange')
          : t('common.modals.previewLinks.toastTriagedNoted'),
      );
    } catch (err: any) {
      onShowToast?.(
        t('common.modals.previewLinks.toastTriageErrorTitle'),
        err?.response?.data?.error || t('common.modals.previewLinks.triageErrorFallback'),
      );
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
      Promise.resolve(assignmentService.getAssignments?.(chapterId))
        .then((res) => setAssignments(res || []))
        .catch(() => {});
      Promise.resolve(assignmentService.getTaskGrid?.(chapterId))
        .then((res) => setTaskGrid(res || null))
        .catch(() => {});
      onShowToast?.(
        updated.stageTaskId
          ? t('common.modals.previewLinks.toastCrGridTitle')
          : t('common.modals.previewLinks.toastCrTitle'),
        updated.stageTaskId
          ? t('common.modals.previewLinks.toastCrGridDesc')
          : t('common.modals.previewLinks.toastCrDesc'),
      );
    } catch (err: any) {
      onShowToast?.(
        t('common.modals.previewLinks.toastCrErrorTitle'),
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          t('common.modals.previewLinks.tryAgainLater'),
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

  /** Ô Lưới V3 đã giao người làm (không lấy Unassigned/Cancelled vì BE trả 409), ưu tiên đúng trang của phản hồi. */
  const gridTaskOptions = (fb: PreviewFeedbackDto): StageTaskDto[] => {
    if (!taskGrid?.tasks?.length) return [];
    const stageOrder = new Map(taskGrid.stages.map((s) => [s.id, s.stageOrder]));
    return taskGrid.tasks
      .filter((t) => t.status !== 'Unassigned' && t.status !== 'Cancelled')
      .sort((a, b) => {
        const matchA = fb.pageId ? Number(a.pageId === fb.pageId) : Number(!a.pageId);
        const matchB = fb.pageId ? Number(b.pageId === fb.pageId) : Number(!b.pageId);
        if (matchA !== matchB) return matchB - matchA;
        const sa = stageOrder.get(a.pipelineStageId) ?? 999;
        const sb = stageOrder.get(b.pipelineStageId) ?? 999;
        if (sa !== sb) return sa - sb;
        return (
          (pageNumberById.get(a.pageId || '') ?? 0) - (pageNumberById.get(b.pageId || '') ?? 0)
        );
      });
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeLabel={t('common.actions.close')}
      size='xl'
      title={t('common.modals.previewLinks.modalTitle')}
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
                <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-xs font-bold'>
                  CF5 // PREVIEW &amp; FEEDBACK
                </span>
                <span className='text-xs text-[#888888] font-mono'>
                  {t('common.modals.previewLinks.headerSubtitle')}
                </span>
              </div>
              <h2 className='text-base font-bold text-[#171717] mt-0.5'>
                {`${t('common.modals.previewLinks.chapterHeading', { number: chapterNumber })}${chapterTitle ? `: ${chapterTitle}` : ''}`}
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
            <span>{t('common.modals.previewLinks.tabLinks', { count: links.length })}</span>
          </button>

          <button
            type='button'
            onClick={() => {
              setActiveTab('feedback');
              void fetchFeedback();
            }}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'feedback'
                ? 'border-[#F97316] text-[#F97316]'
                : 'border-transparent text-[#737373] hover:text-[#171717]'
            }`}
            data-testid='tab-preview-feedback'
          >
            <MessageSquare className='w-4 h-4' />
            <span>{t('common.modals.previewLinks.tabFeedback', { count: feedbacks.length })}</span>
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
                    <strong>{t('common.modals.previewLinks.br09NoteTitle')}</strong>{' '}
                    {t('common.modals.previewLinks.br09NoteBefore')}
                    <code>Approved</code>
                    {t('common.modals.previewLinks.br09NoteAfter')}
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
                    <span>{t('common.modals.previewLinks.createFormTitle')}</span>
                  </div>

                  <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                    <div className='sm:col-span-2'>
                      <label className='block font-semibold text-[#171717] mb-1'>
                        {t('common.modals.previewLinks.recipientEmailLabel')}
                      </label>
                      <div className='relative'>
                        <Mail className='w-3.5 h-3.5 text-[#888888] absolute left-3 top-2.5' />
                        <input
                          type='email'
                          required
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          placeholder={t('common.modals.previewLinks.recipientEmailPlaceholder')}
                          className='w-full pl-8 pr-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
                          data-testid='create-preview-email-input'
                        />
                      </div>
                    </div>

                    <div>
                      <label className='block font-semibold text-[#171717] mb-1'>
                        {t('common.modals.previewLinks.expiresInHoursLabel')}
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
                      <span>{t('common.modals.previewLinks.createLinkBtn')}</span>
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
                      <span>{t('common.modals.previewLinks.createdBannerTitle')}</span>
                    </div>
                    <button
                      type='button'
                      onClick={() => setCreatedLink(null)}
                      className='text-orange-700 hover:text-orange-950 text-xs font-semibold underline cursor-pointer'
                    >
                      {t('common.modals.previewLinks.dismissBanner')}
                    </button>
                  </div>

                  <div className='p-2.5 bg-white rounded-lg border border-orange-200 flex items-center justify-between gap-2'>
                    <span
                      className='font-mono text-xs text-[#171717] break-all select-all'
                      data-testid='created-preview-link-url'
                    >
                      {origin}/review/invite/{createdLink.token}
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
                      <span>
                        {hasCopied
                          ? t('common.modals.previewLinks.copiedLinkBtn')
                          : t('common.modals.previewLinks.copyLinkBtn')}
                      </span>
                    </button>
                  </div>

                  <div className='text-xs text-amber-800 bg-amber-100/60 p-2.5 rounded-lg border border-amber-200/80'>
                    ⚠️ <strong>{t('common.modals.previewLinks.securityWarningLabel')}</strong>{' '}
                    {t('common.modals.previewLinks.securityWarningText')}
                  </div>
                </div>
              )}

              {/* Bảng danh sách liên kết đã tạo */}
              <div className='border border-[#E7E7E7] rounded-xl overflow-hidden'>
                <div className='p-3 bg-[#FAF8F5] border-b border-[#E7E7E7] flex items-center justify-between'>
                  <div className='font-bold text-xs text-[#171717] flex items-center gap-1.5'>
                    <span>{t('common.modals.previewLinks.linksTableTitle')}</span>
                  </div>
                  <button
                    type='button'
                    onClick={fetchLinks}
                    disabled={loadingLinks}
                    className='p-1 rounded hover:bg-white text-[#737373] hover:text-[#171717] transition-colors cursor-pointer'
                    title={t('common.modals.previewLinks.reloadTitle')}
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${loadingLinks ? 'animate-spin text-[#F97316]' : ''}`}
                    />
                  </button>
                </div>

                <table className='w-full text-left border-collapse text-xs'>
                  <thead className='bg-[#FAF8F5] border-b border-[#E7E7E7] font-mono text-xs text-[#737373] uppercase'>
                    <tr>
                      <th className='py-2.5 px-3'>{t('common.modals.previewLinks.colEmail')}</th>
                      <th className='py-2.5 px-3'>{t('common.modals.previewLinks.colStatus')}</th>
                      <th className='py-2.5 px-3'>{t('common.modals.previewLinks.colExpires')}</th>
                      <th className='py-2.5 px-3'>{t('common.modals.previewLinks.colAccess')}</th>
                      <th className='py-2.5 px-3'>
                        {t('common.modals.previewLinks.colLastAccess')}
                      </th>
                      <th className='py-2.5 px-3'>{t('common.modals.previewLinks.colFeedback')}</th>
                      <th className='py-2.5 px-3 text-right'>
                        {t('common.modals.previewLinks.colActions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-[#E7E7E7]'>
                    {loadingLinks ? (
                      <tr>
                        <td colSpan={7} className='py-8 text-center text-[#888888]'>
                          <Loader2 className='w-5 h-5 animate-spin mx-auto mb-1 text-[#F97316]' />
                          <span>{t('common.modals.previewLinks.loadingLinks')}</span>
                        </td>
                      </tr>
                    ) : links.length === 0 ? (
                      <tr>
                        <td colSpan={7} className='py-8 text-center text-[#888888]'>
                          {t('common.modals.previewLinks.emptyLinks')}
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
                            ? t('common.modals.previewLinks.statusActive')
                            : item.status === 'Revoked'
                              ? t('common.modals.previewLinks.statusRevoked')
                              : t('common.modals.previewLinks.statusExpired');

                        return (
                          <tr key={item.id} className='hover:bg-[#FAF8F5] transition-colors'>
                            <td className='py-2.5 px-3 font-medium text-[#171717]'>
                              {item.recipientEmail}
                            </td>
                            <td className='py-2.5 px-3 whitespace-nowrap'>
                              <span
                                className={`px-2 py-0.5 rounded-full border text-xs font-mono font-bold ${statusClass}`}
                              >
                                {statusLabel}
                              </span>
                            </td>
                            <td className='py-2.5 px-3 whitespace-nowrap font-mono text-xs text-[#555555]'>
                              {new Date(item.expiresAt).toLocaleString('vi-VN')}
                            </td>
                            <td className='py-2.5 px-3 font-mono text-xs text-[#555555]'>
                              {item.accessCount} / {item.deniedCount}
                            </td>
                            <td className='py-2.5 px-3 font-mono text-xs text-[#737373]'>
                              {item.lastAccessAt
                                ? new Date(item.lastAccessAt).toLocaleString('vi-VN')
                                : t('common.modals.previewLinks.notViewedYet')}
                            </td>
                            <td className='py-2.5 px-3 font-mono text-xs font-bold text-[#F97316]'>
                              {item.feedbackCount || 0}
                            </td>
                            <td className='py-2.5 px-3 text-right'>
                              {item.status === 'Active' && !isExpired && (
                                <button
                                  type='button'
                                  onClick={() => handleRevokeLink(item.id)}
                                  disabled={revokingId === item.id}
                                  className='px-2 py-1 rounded bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50'
                                  data-testid={`revoke-link-btn-${item.id}`}
                                >
                                  {revokingId === item.id
                                    ? t('common.modals.previewLinks.revokingBtn')
                                    : t('common.modals.previewLinks.revokeBtn')}
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
                  <span className='text-xs font-semibold text-[#737373]'>
                    {t('common.modals.previewLinks.filterStatusLabel')}
                  </span>
                  {(['ALL', 'New', 'Noted', 'NeedsChange'] as const).map((st) => (
                    <button
                      key={st}
                      type='button'
                      onClick={() => setFilterStatus(st)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        filterStatus === st
                          ? 'bg-[#171717] text-white border-[#171717]'
                          : 'bg-white hover:bg-[#FAF8F5] border-[#E7E7E7] text-[#555555]'
                      }`}
                      data-testid={`filter-feedback-${st}`}
                    >
                      {st === 'ALL'
                        ? t('common.modals.previewLinks.filterAll')
                        : st === 'New'
                          ? t('common.modals.previewLinks.filterNew')
                          : st === 'Noted'
                            ? t('common.modals.previewLinks.filterNoted')
                            : t('common.modals.previewLinks.filterNeedsChange')}
                    </button>
                  ))}
                </div>

                <button
                  type='button'
                  onClick={fetchFeedback}
                  disabled={loadingFeedback}
                  className='p-1 rounded hover:bg-[#FAF8F5] text-[#737373] hover:text-[#171717] transition-colors cursor-pointer'
                  title={t('common.modals.previewLinks.reloadFeedbackTitle')}
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
                  <span>{t('common.modals.previewLinks.loadingFeedback')}</span>
                </div>
              ) : feedbacks.length === 0 ? (
                <div className='py-12 text-center text-[#888888] border border-dashed border-[#E7E7E7] rounded-xl space-y-1'>
                  <MessageSquare className='w-6 h-6 mx-auto text-[#888888]' />
                  <div className='font-bold text-[#171717]'>
                    {t('common.modals.previewLinks.emptyFeedbackTitle')}
                  </div>
                  <p className='text-xs text-[#737373]'>
                    {t('common.modals.previewLinks.emptyFeedbackDesc')}
                  </p>
                </div>
              ) : (
                <div className='space-y-3'>
                  {feedbacks.map((fb) => {
                    const noteValue = triageNotes[fb.id] || '';
                    const isTriaging = triagingId === fb.id;
                    const pageNum =
                      fb.pageNumber ?? (fb.pageId ? pageNumberById.get(fb.pageId) : undefined);
                    const pageText =
                      pageNum !== undefined
                        ? t('common.modals.previewLinks.pageNum', { number: pageNum })
                        : fb.pageId
                          ? t('common.modals.previewLinks.pageId', { id: fb.pageId.slice(0, 6) })
                          : null;
                    const panelNum = fb.panelNumber ?? undefined;
                    const panelText = fb.panelId
                      ? panelNum !== undefined
                        ? t('common.modals.previewLinks.panelNum', { number: panelNum })
                        : t('common.modals.previewLinks.panelNum', {
                            number: fb.panelId.slice(0, 6),
                          })
                      : null;
                    const scopeLabel = panelText
                      ? pageText
                        ? `${panelText} (${pageText})`
                        : panelText
                      : (pageText ?? t('common.modals.previewLinks.wholeChapter'));
                    const artworkVersion = fb.artworkVersionNumber ?? undefined;

                    return (
                      <div
                        key={fb.id}
                        className='p-4 rounded-xl border border-[#E7E7E7] bg-white space-y-3 hover:shadow-xs transition-shadow'
                        data-testid={`feedback-item-${fb.id}`}
                      >
                        <div className='flex items-center justify-between flex-wrap gap-2'>
                          <div className='flex items-center gap-2'>
                            <span className='px-2 py-0.5 rounded bg-orange-50 border border-orange-200 text-[#F97316] font-mono text-xs font-bold'>
                              {scopeLabel}
                            </span>
                            <span className='font-semibold text-[#171717]'>
                              {fb.reviewerName ? `${fb.reviewerName} · ` : ''}
                              {fb.recipientEmail}
                            </span>
                            {artworkVersion !== undefined && (
                              <span className='text-xs font-mono text-[#888888]'>
                                {t('common.modals.previewLinks.artworkVersion', {
                                  version: artworkVersion,
                                })}
                              </span>
                            )}
                          </div>

                          <div className='flex items-center gap-2'>
                            <span
                              className={`px-2 py-0.5 rounded-full border text-xs font-mono font-bold ${
                                fb.status === 'New'
                                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                                  : fb.status === 'Noted'
                                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                                    : 'bg-red-50 text-red-700 border-red-300'
                              }`}
                              data-testid={`feedback-status-${fb.id}`}
                            >
                              {fb.status === 'New'
                                ? t('common.modals.previewLinks.feedbackStatusNew')
                                : fb.status === 'Noted'
                                  ? t('common.modals.previewLinks.feedbackStatusNoted')
                                  : t('common.modals.previewLinks.feedbackStatusNeedsChange')}
                            </span>
                            <span className='text-xs text-[#888888] font-mono'>
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
                          <div className='text-xs text-[#555555] bg-blue-50/60 border border-blue-200/80 p-2.5 rounded-lg'>
                            <strong className='text-blue-900'>
                              {t('common.modals.previewLinks.triageNoteLabel')}
                            </strong>{' '}
                            {fb.triageNote}
                            {fb.triagedAt && (
                              <span className='text-xs text-blue-700 font-mono ml-2'>
                                ({new Date(fb.triagedAt).toLocaleString('vi-VN')})
                              </span>
                            )}
                          </div>
                        )}

                        {/* Đã thành yêu cầu sửa (Assignment cũ hoặc ô Lưới V3): không phân loại lại được (BE trả 409) */}
                        {Boolean(fb.changeRequestId || fb.stageTaskId) && (
                          <div
                            className='pt-2 border-t border-[#E7E7E7] flex items-center gap-1.5 text-xs text-emerald-800'
                            data-testid={`feedback-cr-linked-${fb.id}`}
                          >
                            <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' />
                            <span>
                              {fb.stageTaskId
                                ? t('common.modals.previewLinks.crLinkedGrid')
                                : t('common.modals.previewLinks.crLinkedLegacy')}
                            </span>
                          </div>
                        )}

                        {/* Triage Actions Form */}
                        {!fb.changeRequestId && !fb.stageTaskId && (
                          <div className='pt-2 border-t border-[#E7E7E7] flex flex-col sm:flex-row items-stretch sm:items-center gap-2'>
                            <input
                              type='text'
                              value={noteValue}
                              onChange={(e) =>
                                setTriageNotes((prev) => ({ ...prev, [fb.id]: e.target.value }))
                              }
                              placeholder={
                                fb.status === 'NeedsChange'
                                  ? t('common.modals.previewLinks.triagePlaceholderRequired')
                                  : t('common.modals.previewLinks.triagePlaceholderOptional')
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
                                {t('common.modals.previewLinks.triageNotedBtn')}
                              </button>

                              <button
                                type='button'
                                disabled={isTriaging || !noteValue.trim()}
                                onClick={() => handleTriage(fb.id, 'NeedsChange')}
                                className='px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-300 text-orange-800 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'
                                title={
                                  !noteValue.trim()
                                    ? t('common.modals.previewLinks.triageNeedsChangeTitleDisabled')
                                    : t('common.modals.previewLinks.triageNeedsChangeTitleEnabled')
                                }
                                data-testid={`triage-needschange-btn-${fb.id}`}
                              >
                                {t('common.modals.previewLinks.triageNeedsChangeBtn')}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Gợi ý mở lại chương khi phản hồi là NeedsChange (chỉ chương Approved mới mở lại được) */}
                        {!fb.changeRequestId &&
                          !fb.stageTaskId &&
                          (fb.status === 'NeedsChange' || noteValue) &&
                          isApproved &&
                          onReopenChapter && (
                            <div className='p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg flex items-center justify-between gap-3 text-amber-900'>
                              <span className='text-xs'>
                                💡 {t('common.modals.previewLinks.reopenHint')}
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
                                <span>{t('common.modals.previewLinks.reopenBtn')}</span>
                              </button>
                            </div>
                          )}

                        {/* 5.7: chương đã mở lại → chuyển phản hồi thành yêu cầu sửa của một việc (Assignment cũ hoặc ô Lưới V3) */}
                        {!fb.changeRequestId &&
                          !fb.stageTaskId &&
                          fb.status === 'NeedsChange' &&
                          isInProduction && (
                            <div className='p-2.5 bg-orange-50/70 border border-orange-200 rounded-lg flex flex-col sm:flex-row sm:items-center gap-2 text-orange-950'>
                              <label
                                htmlFor={`cr-assignment-${fb.id}`}
                                className='text-xs shrink-0'
                              >
                                {t('common.modals.previewLinks.assignCrLabel')}
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
                                <option value=''>
                                  {t('common.modals.previewLinks.selectTaskPlaceholder')}
                                </option>
                                {assignmentOptions(fb).map((a) => {
                                  const waiting =
                                    a.status === 'Submitted' || a.status === 'UnderReview';
                                  return (
                                    <option key={a.id} value={a.id} disabled={waiting}>
                                      {a.assignedRole} · {a.brief.slice(0, 60)} (
                                      {waiting
                                        ? t('common.modals.previewLinks.waitingReview')
                                        : a.status}
                                      )
                                    </option>
                                  );
                                })}
                                {gridTaskOptions(fb).map((task) => {
                                  const waiting =
                                    task.status === 'Submitted' || task.status === 'UnderReview';
                                  const stg = taskGrid?.stages.find(
                                    (s) => s.id === task.pipelineStageId,
                                  );
                                  const pageNum = task.pageId
                                    ? pageNumberById.get(task.pageId)
                                    : undefined;
                                  const lot = task.lotId
                                    ? taskGrid?.lots.find((l) => l.id === task.lotId)
                                    : null;
                                  const stageLabel = stg
                                    ? `${stg.stageOrder}. ${stg.name}`
                                    : t('common.modals.previewLinks.stageFallback');
                                  const pageLabel = pageNum
                                    ? t('common.modals.previewLinks.pageNum', { number: pageNum })
                                    : task.pageId
                                      ? t('common.modals.previewLinks.pageId', {
                                          id: task.pageId.slice(0, 6),
                                        })
                                      : t('common.modals.previewLinks.wholeChapterLower');
                                  const rolePrefix = lot?.assignedRole
                                    ? `${lot.assignedRole} · `
                                    : '';
                                  return (
                                    <option key={task.id} value={task.id} disabled={waiting}>
                                      {t('common.modals.previewLinks.gridPrefix')} {rolePrefix}
                                      {stageLabel} · {pageLabel} (
                                      {waiting
                                        ? t('common.modals.previewLinks.waitingReview')
                                        : task.status === 'Approved'
                                          ? t('common.modals.previewLinks.approvedReopen')
                                          : task.status}
                                      )
                                    </option>
                                  );
                                })}
                              </select>
                              <button
                                type='button'
                                disabled={!crAssignment[fb.id] || creatingCrId === fb.id}
                                onClick={() =>
                                  handleCreateChangeRequest(fb.id, crAssignment[fb.id])
                                }
                                className='px-3 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1 shrink-0 transition-colors cursor-pointer'
                                data-testid={`create-cr-from-feedback-btn-${fb.id}`}
                              >
                                {creatingCrId === fb.id && (
                                  <Loader2 className='w-3.5 h-3.5 animate-spin' />
                                )}
                                <span>{t('common.modals.previewLinks.createCrBtn')}</span>
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
    </Modal>
  );
};
export default PreviewLinksModal;
