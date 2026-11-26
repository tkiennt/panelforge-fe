import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Flag,
  Layers,
  Loader2,
  Lock,
  MessageSquare,
  Send,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { Modal } from '@/shared/ui';
import {
  chapterService,
  type NewPageAssignmentRequest,
  type RefreezeScriptPreviewDto,
  type RefreezeScriptResultDto,
} from '@/services/chapter.service';
import { bibleService } from '@/services/bible.service';
import { seriesService, type SeriesMemberDto } from '@/services/series.service';
import { workspaceService } from '@/services/workspace.service';

export interface RefreezeScriptModalProps {
  isOpen: boolean;
  workspaceId: string;
  seriesId: string;
  chapterId: string;
  chapterNumber?: number | string;
  chapterTitle?: string;
  onClose: () => void;
  onSuccess?: (result?: RefreezeScriptResultDto) => void;
  onShowToast?: (title: string, desc: string) => void;
}

type ImpactTab = 'visual' | 'text';

const isArtistMember = (m: SeriesMemberDto): boolean => {
  const role = String(m.seriesRole || '').toLowerCase();
  return role === 'artist' || role === 'producer' || role === 'owner';
};

const isLettererMember = (m: SeriesMemberDto): boolean => {
  const role = String(m.seriesRole || '').toLowerCase();
  return role === 'letterer' || role === 'artist' || role === 'producer' || role === 'owner';
};

export const RefreezeScriptModal: React.FC<RefreezeScriptModalProps> = ({
  isOpen,
  workspaceId,
  seriesId,
  chapterId,
  chapterNumber,
  chapterTitle,
  onClose,
  onSuccess,
  onShowToast,
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<RefreezeScriptPreviewDto | null>(null);
  const [members, setMembers] = useState<SeriesMemberDto[]>([]);
  const [assignments, setAssignments] = useState<
    Record<number, { artistId: string; lettererId: string }>
  >({});
  const [activeTab, setActiveTab] = useState<ImpactTab>('visual');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<{
    code?: string;
    message: string;
    details?: any;
  } | null>(null);
  const [togglingCrowdId, setTogglingCrowdId] = useState<string | null>(null);
  const [nudgingWriter, setNudgingWriter] = useState(false);
  const [nudgedWriterDone, setNudgedWriterDone] = useState(false);

  const loadPreviewAndMembers = useCallback(async () => {
    if (!chapterId) return;
    setLoading(true);
    setLoadError(null);
    setSubmitError(null);
    try {
      const [previewData, membersData] = await Promise.all([
        chapterService.getRefreezePreview(chapterId),
        seriesId && workspaceId
          ? seriesService
              .getSeriesMembers(workspaceId, seriesId)
              .catch(() =>
                workspaceService.getMembers(workspaceId).then((ws) =>
                  ws.map((m): SeriesMemberDto => ({
                    id: m.userId,
                    seriesId: seriesId || '',
                    userId: m.userId,
                    fullName: m.fullName,
                    email: m.email,
                    avatarUrl: m.avatarUrl,
                    studioRole: String(m.role),
                    seriesRole: String(m.role),
                    joinedAt: m.joinedAt,
                    status: m.status,
                  })),
                ),
              )
          : workspaceId
            ? workspaceService.getMembers(workspaceId).then((ws) =>
                ws.map((m): SeriesMemberDto => ({
                  id: m.userId,
                  seriesId: seriesId || '',
                  userId: m.userId,
                  fullName: m.fullName,
                  email: m.email,
                  avatarUrl: m.avatarUrl,
                  studioRole: String(m.role),
                  seriesRole: String(m.role),
                  joinedAt: m.joinedAt,
                  status: m.status,
                })),
              )
            : Promise.resolve([] as SeriesMemberDto[]),
      ]);

      setPreview(previewData);
      setMembers(membersData || []);

      const initialAssignments: Record<number, { artistId: string; lettererId: string }> = {};
      for (const ap of previewData.addedPages ?? []) {
        initialAssignments[ap.pageNumber] = {
          artistId: ap.suggestedArtistId ?? '',
          lettererId: ap.suggestedLettererId ?? '',
        };
      }
      setAssignments(initialAssignments);

      if (
        (previewData.visualImpacts?.length ?? 0) === 0 &&
        (previewData.textImpacts?.length ?? 0) > 0
      ) {
        setActiveTab('text');
      } else {
        setActiveTab('visual');
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Không thể tải dữ liệu xem trước khi chốt lại kịch bản.');
    } finally {
      setLoading(false);
    }
  }, [chapterId, seriesId, workspaceId]);

  useEffect(() => {
    if (!isOpen) return;
    setNudgedWriterDone(false);
    void loadPreviewAndMembers();
  }, [isOpen, loadPreviewAndMembers]);

  const artistOptions = useMemo(() => members.filter(isArtistMember), [members]);
  const lettererOptions = useMemo(() => members.filter(isLettererMember), [members]);

  const addedPages = preview?.addedPages ?? [];
  const removedPages = preview?.removedPages ?? [];
  const visualImpacts = preview?.visualImpacts ?? [];
  const textImpacts = preview?.textImpacts ?? [];

  const allAddedPagesAssigned = useMemo(
    () => addedPages.every((ap) => Boolean(assignments[ap.pageNumber]?.artistId)),
    [addedPages, assignments],
  );

  const hasRemovedPageBlocker = useMemo(
    () => removedPages.some((rp) => !rp.canSafelyDelete),
    [removedPages],
  );

  const isHashMismatch = Boolean(
    submitError?.code === 'HASH_MISMATCH' || (preview && !preview.hashParity.isMatched),
  );
  const bibleBlockers =
    submitError?.code === 'BIBLE_GATE_BLOCKED' && Array.isArray(submitError?.details?.blockers)
      ? submitError.details.blockers
      : preview?.bibleGate && !preview.bibleGate.isCanonLocked
        ? preview.bibleGate.blockers
        : [];
  const isBibleBlocked = bibleBlockers.length > 0;

  const canConfirm =
    !loading &&
    !submitting &&
    Boolean(preview) &&
    !isHashMismatch &&
    !isBibleBlocked &&
    !hasRemovedPageBlocker &&
    allAddedPagesAssigned;

  const handleAssignmentChange = (
    pageNumber: number,
    field: 'artistId' | 'lettererId',
    value: string,
  ) => {
    setAssignments((prev) => ({
      ...prev,
      [pageNumber]: {
        artistId: field === 'artistId' ? value : prev[pageNumber]?.artistId ?? '',
        lettererId: field === 'lettererId' ? value : prev[pageNumber]?.lettererId ?? '',
      },
    }));
  };

  const handleQuickMarkCrowd = async (entryId: string) => {
    if (!seriesId) return;
    setTogglingCrowdId(entryId);
    try {
      await bibleService.setBibleEntryCrowd(seriesId, entryId, true);
      onShowToast?.('Đã cập nhật Series Bible', 'Thực thể đã được đánh dấu là Quần chúng.');
      await loadPreviewAndMembers();
    } catch (err: any) {
      onShowToast?.('Không thể cập nhật', err?.message || 'Vui lòng thử lại.');
    } finally {
      setTogglingCrowdId(null);
    }
  };

  const handleNudgeWriter = async () => {
    if (!chapterId || nudgingWriter) return;
    setNudgingWriter(true);
    try {
      await chapterService.addScriptComment(chapterId, {
        body: 'Kịch bản có thay đổi mới chưa được gửi duyệt. Vui lòng bấm Nộp kịch bản để Producer chốt lại.',
      });
      setNudgedWriterDone(true);
      onShowToast?.(
        'Đã nhắc Biên kịch',
        'Hệ thống đã gửi thông báo nhắc Biên kịch nộp lại bản kịch bản mới nhất.',
      );
    } catch (err: any) {
      onShowToast?.('Không thể gửi nhắc nhở', err?.message || 'Vui lòng thử lại.');
    } finally {
      setNudgingWriter(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview || !canConfirm) return;
    setSubmitting(true);
    setSubmitError(null);

    const newPageAssignments: NewPageAssignmentRequest[] = addedPages.map((ap) => {
      const assigned = assignments[ap.pageNumber];
      return {
        pageNumber: ap.pageNumber,
        artistId: assigned.artistId,
        lettererId: assigned.lettererId || null,
      };
    });

    try {
      const result = await chapterService.refreezeScript(chapterId, {
        expectedScriptHash: preview.hashParity.submittedHash || preview.hashParity.currentDraftHash,
        newPageAssignments,
      });
      onShowToast?.(
        'Đã khóa lại kịch bản',
        result.message || `Kịch bản Chương ${chapterNumber ?? preview.chapterNumber} đã được chốt lại.`,
      );
      onSuccess?.(result);
    } catch (err: any) {
      setSubmitError({
        code: err?.code,
        message: err?.message || 'Không thể khóa lại kịch bản. Vui lòng thử lại.',
        details: err?.details,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resolvedChapterNumber = chapterNumber ?? preview?.chapterNumber ?? '';
  const resolvedTitle = chapterTitle || preview?.chapterTitle || '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size='lg'
      title={`Khóa lại kịch bản — Chương ${resolvedChapterNumber}`}
      closeLabel='Đóng'
    >
      <div
        data-testid='refreeze-script-modal'
        className='bg-[#FFFFFF] border border-stone-200 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden'
      >
        {/* Header */}
        <div className='px-5 py-3.5 bg-[#FAF8F5] border-b border-stone-200 flex items-center justify-between gap-3 shrink-0'>
          <div className='min-w-0'>
            <div className='flex items-center gap-2 flex-wrap'>
              <h3 className='text-sm font-bold text-[#171717]'>
                Khóa lại kịch bản — Chương {resolvedChapterNumber}
                {resolvedTitle ? `: ${resolvedTitle}` : ''}
              </h3>
              <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200'>
                Đang sản xuất
              </span>
            </div>
            <p className='text-xs text-stone-600 mt-0.5'>
              Kiểm tra các thay đổi, phân công trang bổ sung và xác nhận để tiếp tục sản xuất.
            </p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className='p-5 overflow-y-auto flex-1 space-y-4 text-xs text-[#171717]'>
          {loading ? (
            <div className='py-12 flex flex-col items-center justify-center gap-2 text-stone-500'>
              <Loader2 className='w-6 h-6 animate-spin text-[#F97316]' />
              <p className='font-medium'>Đang đối chiếu phiên bản kịch bản...</p>
            </div>
          ) : loadError ? (
            <div
              role='alert'
              className='rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900 space-y-2'
            >
              <div className='flex items-center gap-2 font-bold'>
                <AlertTriangle className='w-4 h-4 text-rose-600 shrink-0' />
                <span>Không tải được dữ liệu kiểm tra</span>
              </div>
              <p className='text-rose-800'>{loadError}</p>
            </div>
          ) : preview ? (
            <>
              {/* Version comparison strip */}
              <div className='rounded-xl border border-stone-200 bg-[#FAF8F5] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2'>
                <div className='flex items-center gap-2 text-stone-700'>
                  <Lock className='w-3.5 h-3.5 text-stone-500' aria-hidden='true' />
                  <span>
                    Bản đã chốt:{' '}
                    <strong className='text-[#171717]'>
                      {preview.previousFrozenVersionNumber
                        ? `v${preview.previousFrozenVersionNumber}`
                        : 'Chưa có'}
                    </strong>
                  </span>
                  <span className='text-stone-400'>→</span>
                  <span>
                    Bản mới nộp:{' '}
                    <strong className='text-[#EA580C]'>
                      {preview.submittedVersionNumber ? `v${preview.submittedVersionNumber}` : 'Mới nhất'}
                    </strong>
                  </span>
                </div>
                {preview.hashParity.isMatched && (
                  <span className='inline-flex items-center gap-1 text-emerald-700 font-semibold'>
                    <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' aria-hidden='true' />
                    Khớp bản nộp
                  </span>
                )}
              </div>

              {/* 409 Hash Mismatch Blocker */}
              {isHashMismatch && (
                <div
                  role='alert'
                  data-testid='refreeze-hash-mismatch-alert'
                  className='rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-amber-900 space-y-2'
                >
                  <div className='flex items-start justify-between gap-3 flex-wrap'>
                    <div className='flex items-start gap-2 min-w-0 flex-1'>
                      <AlertTriangle className='w-4 h-4 text-[#D97706] mt-0.5 shrink-0' />
                      <div>
                        <p className='font-bold text-amber-950'>
                          Kịch bản vừa có chỉnh sửa mới sau lần nộp
                        </p>
                        <p className='text-amber-800 mt-0.5 leading-relaxed'>
                          {submitError?.message ||
                            `Biên kịch đã chỉnh sửa thêm sau bản v${preview.hashParity.submittedVersionNumber ?? '?'}. Cần Biên kịch nộp lại để bản chốt trùng khớp hoàn toàn.`}
                        </p>
                      </div>
                    </div>
                    <button
                      type='button'
                      data-testid='refreeze-nudge-writer-btn'
                      disabled={nudgingWriter || nudgedWriterDone}
                      onClick={() => void handleNudgeWriter()}
                      className='inline-flex items-center gap-1.5 rounded-lg bg-[#D97706] hover:bg-amber-700 text-white px-3 py-1.5 font-semibold shrink-0 cursor-pointer disabled:opacity-60'
                    >
                      <Send className='w-3.5 h-3.5' aria-hidden='true' />
                      {nudgedWriterDone
                        ? 'Đã nhắc Biên kịch'
                        : nudgingWriter
                          ? 'Đang gửi...'
                          : 'Nhắc Biên kịch nộp lại'}
                    </button>
                  </div>
                </div>
              )}

              {/* 409 Bible Gate Blocker */}
              {isBibleBlocked && (
                <div
                  role='alert'
                  data-testid='refreeze-bible-blocker-alert'
                  className='rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-rose-900 space-y-2'
                >
                  <div className='flex items-start gap-2'>
                    <ShieldAlert className='w-4 h-4 text-[#EF4444] mt-0.5 shrink-0' />
                    <div className='flex-1 space-y-2'>
                      <div className='flex items-center justify-between gap-2 flex-wrap'>
                        <p className='font-bold text-rose-900'>
                          Hồ sơ truyện chưa khóa Canon cho toàn bộ thực thể chính
                        </p>
                        {workspaceId && seriesId && (
                          <Link
                            to={`/workspaces/${workspaceId}/series/${seriesId}/bible`}
                            className='text-xs font-semibold text-rose-700 underline hover:text-rose-900'
                          >
                            Mở Hồ sơ truyện
                          </Link>
                        )}
                      </div>
                      <ul className='space-y-1.5 bg-white rounded-lg p-2.5 border border-rose-200'>
                        {bibleBlockers.map((b: any, idx: number) => (
                          <li
                            key={b.bibleEntryId || idx}
                            className='flex items-center justify-between gap-2 flex-wrap text-rose-900'
                          >
                            <span>
                              <strong>{b.entryName}</strong>: {b.reason}
                            </span>
                            {b.bibleEntryId && seriesId && (
                              <button
                                type='button'
                                disabled={togglingCrowdId === b.bibleEntryId}
                                onClick={() => void handleQuickMarkCrowd(b.bibleEntryId)}
                                className='px-2 py-0.5 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold cursor-pointer disabled:opacity-50'
                              >
                                Đánh dấu Quần chúng
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Artwork on Removed Page 409 Error */}
              {(submitError?.code === 'ACTIVE_ARTWORK_ON_REMOVED_PAGE' || hasRemovedPageBlocker) && (
                <div
                  role='alert'
                  data-testid='refreeze-active-artwork-alert'
                  className='rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-rose-900 flex items-start gap-2'
                >
                  <AlertTriangle className='w-4 h-4 text-[#EF4444] mt-0.5 shrink-0' />
                  <div>
                    <p className='font-bold'>Trang bị gỡ bỏ vừa phát sinh bản vẽ hoặc bóng thoại</p>
                    <p className='text-rose-800 mt-0.5'>
                      {submitError?.message ||
                        'Không thể gỡ bỏ trang đã có họa sĩ bắt đầu vẽ hoặc đặt bóng thoại. Vui lòng yêu cầu Biên kịch khôi phục lại trang đó.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Generic unexpected submit error */}
              {submitError &&
                submitError.code !== 'HASH_MISMATCH' &&
                submitError.code !== 'BIBLE_GATE_BLOCKED' &&
                submitError.code !== 'ACTIVE_ARTWORK_ON_REMOVED_PAGE' && (
                  <div
                    role='alert'
                    className='rounded-xl border border-rose-300 bg-rose-50 p-3 text-rose-900 flex items-center gap-2'
                  >
                    <AlertTriangle className='w-4 h-4 text-[#EF4444] shrink-0' />
                    <span>{submitError.message}</span>
                  </div>
                )}

              {/* SECTION 1: Added Pages Assignment */}
              <section
                data-testid='refreeze-added-pages'
                className='rounded-xl border border-stone-200 bg-white p-3.5 space-y-2.5'
              >
                <div className='flex items-center justify-between gap-2'>
                  <h4 className='font-bold text-[#171717] flex items-center gap-1.5'>
                    <Layers className='w-4 h-4 text-[#EA580C]' aria-hidden='true' />
                    Trang mới bổ sung ({addedPages.length})
                  </h4>
                  {addedPages.length > 0 && !allAddedPagesAssigned && (
                    <span className='text-[11px] font-semibold text-[#D97706]'>
                      Cần giao 100% Họa sĩ cho trang mới
                    </span>
                  )}
                </div>

                {addedPages.length === 0 ? (
                  <p className='text-stone-500'>Không có trang mới nào được thêm vào kịch bản.</p>
                ) : (
                  <div className='overflow-x-auto border border-stone-200 rounded-lg'>
                    <table className='w-full text-left border-collapse'>
                      <thead className='bg-[#FAF8F5] text-stone-600 border-b border-stone-200'>
                        <tr>
                          <th className='px-3 py-2 font-semibold'>Trang</th>
                          <th className='px-3 py-2 font-semibold'>Số khung</th>
                          <th className='px-3 py-2 font-semibold'>Họa sĩ phụ trách *</th>
                          <th className='px-3 py-2 font-semibold'>Letterer phụ trách</th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-stone-100'>
                        {addedPages.map((ap) => {
                          const current = assignments[ap.pageNumber] ?? {
                            artistId: '',
                            lettererId: '',
                          };
                          return (
                            <tr key={ap.pageNumber}>
                              <td className='px-3 py-2 font-semibold text-[#171717]'>
                                Trang {ap.pageNumber}
                              </td>
                              <td className='px-3 py-2 text-stone-600'>{ap.panelCount} khung</td>
                              <td className='px-3 py-2'>
                                <select
                                  aria-label={`Họa sĩ cho Trang ${ap.pageNumber}`}
                                  data-testid={`refreeze-artist-select-${ap.pageNumber}`}
                                  value={current.artistId}
                                  onChange={(e) =>
                                    handleAssignmentChange(ap.pageNumber, 'artistId', e.target.value)
                                  }
                                  className='w-full rounded-md border border-stone-300 bg-white px-2 py-1 text-xs text-[#171717] focus:border-[#F97316] focus:outline-none'
                                >
                                  <option value=''>-- Chọn Họa sĩ --</option>
                                  {artistOptions.map((m) => (
                                    <option key={m.userId} value={m.userId}>
                                      {m.fullName}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className='px-3 py-2'>
                                <select
                                  aria-label={`Letterer cho Trang ${ap.pageNumber}`}
                                  data-testid={`refreeze-letterer-select-${ap.pageNumber}`}
                                  value={current.lettererId}
                                  onChange={(e) =>
                                    handleAssignmentChange(
                                      ap.pageNumber,
                                      'lettererId',
                                      e.target.value,
                                    )
                                  }
                                  className='w-full rounded-md border border-stone-300 bg-white px-2 py-1 text-xs text-[#171717] focus:border-[#F97316] focus:outline-none'
                                >
                                  <option value=''>Mặc định theo Họa sĩ</option>
                                  {lettererOptions.map((m) => (
                                    <option key={m.userId} value={m.userId}>
                                      {m.fullName}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* SECTION 2: Removed Pages Summary */}
              {removedPages.length > 0 && (
                <section
                  data-testid='refreeze-removed-pages'
                  className='rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-2'
                >
                  <h4 className='font-bold text-amber-950 flex items-center gap-1.5'>
                    <Trash2 className='w-4 h-4 text-[#D97706]' aria-hidden='true' />
                    Trang đã gỡ bỏ ({removedPages.length})
                  </h4>
                  <ul className='space-y-1 text-amber-900'>
                    {removedPages.map((rp) => (
                      <li key={rp.pageId} className='flex items-center justify-between gap-2'>
                        <span>
                          <strong>Trang {rp.pageNumber}</strong>{' '}
                          {rp.canSafelyDelete
                            ? '(Chưa có nét vẽ) — các công đoạn trống sẽ được hủy tự động.'
                            : '(Đang có bản vẽ/bóng thoại — không thể gỡ bỏ!)'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* SECTION 3: Impact Breakdown (2-tier tabs) */}
              <section className='rounded-xl border border-stone-200 bg-white p-3.5 space-y-3'>
                <div className='flex items-center justify-between gap-2 flex-wrap border-b border-stone-200 pb-2.5'>
                  <h4 className='font-bold text-[#171717]'>Phân loại ảnh hưởng nội dung</h4>
                  <div className='inline-flex items-center gap-1.5 bg-[#FAF8F5] p-1 rounded-lg border border-stone-200'>
                    <button
                      type='button'
                      data-testid='refreeze-tab-visual'
                      onClick={() => setActiveTab('visual')}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                        activeTab === 'visual'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-stone-700 hover:bg-stone-200/70'
                      }`}
                    >
                      <Flag className='w-3.5 h-3.5' aria-hidden='true' />
                      <span>Ảnh hưởng nét vẽ ({visualImpacts.length})</span>
                    </button>
                    <button
                      type='button'
                      data-testid='refreeze-tab-text'
                      onClick={() => setActiveTab('text')}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                        activeTab === 'text'
                          ? 'bg-[#D97706] text-white shadow-xs'
                          : 'text-stone-700 hover:bg-stone-200/70'
                      }`}
                    >
                      <MessageSquare className='w-3.5 h-3.5' aria-hidden='true' />
                      <span>Ảnh hưởng lời thoại ({textImpacts.length})</span>
                    </button>
                  </div>
                </div>

                {activeTab === 'visual' ? (
                  visualImpacts.length === 0 ? (
                    <p className='text-stone-500 py-2'>
                      Không có thay đổi về hành động vẽ hay thiết kế nhân vật trên các trang đang vẽ. Họa sĩ không bị gián đoạn.
                    </p>
                  ) : (
                    <ul className='space-y-2' data-testid='refreeze-visual-list'>
                      {visualImpacts.map((vi, idx) => (
                        <li
                          key={`${vi.pageNumber}-${vi.panelNumber}-${idx}`}
                          className='rounded-lg border border-rose-200 bg-rose-50/50 p-2.5 space-y-1'
                        >
                          <div className='flex items-center justify-between gap-2 flex-wrap'>
                            <span className='font-bold text-rose-900'>
                              ⚑ Trang {vi.pageNumber} — Khung {vi.panelNumber}
                            </span>
                            <span className='text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800'>
                              {vi.affectedStages.join(', ')}
                            </span>
                          </div>
                          <p className='text-stone-700'>{vi.reason}</p>
                          {vi.affectedAssigneeNames.length > 0 && (
                            <p className='text-[11px] text-stone-600'>
                              Họa sĩ chịu ảnh hưởng: {vi.affectedAssigneeNames.join(', ')}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )
                ) : textImpacts.length === 0 ? (
                  <p className='text-stone-500 py-2'>
                    Không có thay đổi về lời thoại, suy nghĩ, dẫn truyện hay hiệu ứng âm thanh.
                  </p>
                ) : (
                  <ul className='space-y-2' data-testid='refreeze-text-list'>
                    {textImpacts.map((ti, idx) => (
                      <li
                        key={`${ti.lineId ?? idx}-${ti.elementId ?? idx}`}
                        className='rounded-lg border border-amber-200 bg-amber-50/50 p-2.5 space-y-1'
                      >
                        <div className='flex items-center justify-between gap-2 flex-wrap'>
                          <span className='font-bold text-amber-950'>
                            Trang {ti.pageNumber} — Khung {ti.panelNumber}
                            {ti.speakerLabel ? ` (${ti.speakerLabel})` : ''}
                          </span>
                          {ti.isStale && (
                            <span className='text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300'>
                              Thoại cũ trên bóng chữ
                            </span>
                          )}
                        </div>
                        {ti.oldText && (
                          <p className='text-stone-500 line-through'>{ti.oldText}</p>
                        )}
                        <p className='text-[#171717] font-medium'>
                          {ti.newText || '(Dòng thoại đã được gỡ bỏ)'}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : null}
        </div>

        {/* Sticky Footer CTA */}
        <div className='px-5 py-3 bg-[#FAF8F5] border-t border-stone-200 flex items-center justify-end gap-2.5 shrink-0 sticky bottom-0'>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-2 rounded-lg border border-stone-300 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer'
          >
            Đóng
          </button>
          <button
            type='button'
            data-testid='refreeze-confirm-btn'
            disabled={!canConfirm}
            onClick={() => void handleConfirm()}
            className='inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-bold shadow-xs cursor-pointer disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed'
          >
            {submitting ? (
              <>
                <Loader2 className='w-3.5 h-3.5 animate-spin' />
                <span>Đang chốt lại...</span>
              </>
            ) : (
              <>
                <Lock className='w-3.5 h-3.5' aria-hidden='true' />
                <span>Xác nhận khóa lại kịch bản</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
