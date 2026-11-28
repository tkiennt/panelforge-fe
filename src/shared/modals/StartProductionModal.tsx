import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Play,
  Plus,
  Trash2,
  Users,
  ShieldAlert,
  Layers,
} from 'lucide-react';
import { Modal } from '@/shared/ui';
import {
  chapterService,
  StartChapterProductionRequest,
  StartChapterProductionResultDto,
  ProductionPageAssignmentRequest,
  ScriptVersionOutdatedDetails,
} from '@/services/chapter.service';
import {
  chapterCastService,
  ChapterCastDto,
  ChapterCastBlockerDto,
} from '@/services/chapterCast.service';
import { bibleService } from '@/services/bible.service';
import { workspaceService } from '@/services/workspace.service';
import { pageService, PageDto } from '@/services/page.service';
import { SeriesMemberDto } from '@/services/series.service';
import { ScriptVersionDiff } from '@/shared/features/script-versions/ScriptVersionDiff';

export interface StartProductionModalProps {
  isOpen: boolean;
  workspaceId: string;
  seriesId: string;
  chapterId: string;
  chapterNumber?: number | string;
  chapterTitle?: string;
  /** Q26: bản kịch bản đã nộp Producer đang xem (chapter.lastSubmittedVersionId). Gửi kèm khi bắt đầu sản xuất. */
  expectedSubmittedVersionId?: string | null;
  onClose: () => void;
  onSuccess?: (result?: StartChapterProductionResultDto) => void;
  onShowToast?: (title: string, desc: string) => void;
  /** Q26: 409 SCRIPT_VERSION_OUTDATED → cha tải lại dữ liệu chương để Producer thấy bản mới. */
  onVersionOutdated?: () => void;
}

interface RangeItem {
  id: string;
  artistId: string;
  pageFrom: number;
  pageTo: number;
}

export const StartProductionModal: React.FC<StartProductionModalProps> = ({
  isOpen,
  workspaceId,
  seriesId,
  chapterId,
  chapterNumber,
  chapterTitle,
  expectedSubmittedVersionId,
  onClose,
  onSuccess,
  onShowToast,
  onVersionOutdated,
}) => {
  const { t } = useTranslation('production');

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [cast, setCast] = useState<ChapterCastDto | null>(null);
  const [openCommentsCount, setOpenCommentsCount] = useState(0);
  const [members, setMembers] = useState<SeriesMemberDto[]>([]);
  const [pages, setPages] = useState<PageDto[]>([]);

  // Artist assignment
  const [artistMode, setArtistMode] = useState<'whole' | 'ranges'>('whole');
  const [singleArtistId, setSingleArtistId] = useState('');
  const [artistRanges, setArtistRanges] = useState<RangeItem[]>([]);
  const [firstStageOnly, setFirstStageOnly] = useState(false);

  // Letterer assignment
  const [assignLetterer, setAssignLetterer] = useState(false);
  const [lettererMode, setLettererMode] = useState<'whole' | 'ranges'>('whole');
  const [singleLettererId, setSingleLettererId] = useState('');
  const [lettererRanges, setLettererRanges] = useState<RangeItem[]>([]);

  // Inline submit error (409)
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitBlockers, setSubmitBlockers] = useState<ChapterCastBlockerDto[]>([]);
  // Q26: Writer đã nộp bản mới sau bản Producer đang xem → hiện thông báo và diff, Producer xác nhận lại
  const [outdated, setOutdated] = useState<{
    fromVersionId: string | null;
    versionNumber: number | null;
  } | null>(null);
  const [togglingCrowdId, setTogglingCrowdId] = useState<string | null>(null);

  const minPage = useMemo(() => {
    if (pages.length === 0) return 1;
    return Math.min(...pages.map((p) => p.pageNumber));
  }, [pages]);

  const maxPage = useMemo(() => {
    if (pages.length === 0) return 1;
    return Math.max(...pages.map((p) => p.pageNumber));
  }, [pages]);

  const resetForm = useCallback(() => {
    setArtistMode('whole');
    setSingleArtistId('');
    setArtistRanges([]);
    setFirstStageOnly(false);
    setAssignLetterer(false);
    setLettererMode('whole');
    setSingleLettererId('');
    setLettererRanges([]);
    setSubmitError(null);
    setSubmitBlockers([]);
    setTogglingCrowdId(null);
    setOutdated(null);
  }, []);

  useEffect(() => {
    if (!isOpen || !chapterId) return;

    let isMounted = true;
    setLoading(true);
    resetForm();

    Promise.all([
      chapterCastService.getChapterCast(chapterId).catch(() => null),
      chapterService.getScriptComments(chapterId).catch(() => []),
      workspaceId
        ? workspaceService
            .getMembers(workspaceId)
            .then((list) =>
              list.map((m): SeriesMemberDto => ({
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
            .catch(() => [] as SeriesMemberDto[])
        : Promise.resolve([] as SeriesMemberDto[]),
      pageService.getPagesByChapter(chapterId).catch(() => []),
    ])
      .then(([castData, commentsData, membersData, pagesData]) => {
        if (!isMounted) return;

        setCast(castData);
        const unresolved = (commentsData || []).filter((c) => !c.resolvedAt).length;
        setOpenCommentsCount(unresolved);

        setMembers(membersData || []);

        const loadedPages = (pagesData || []).slice().sort((a, b) => a.pageNumber - b.pageNumber);
        setPages(loadedPages);

        if (loadedPages.length > 0) {
          const lo = loadedPages[0].pageNumber;
          const hi = loadedPages[loadedPages.length - 1].pageNumber;
          setArtistRanges([{ id: 'artist-range-1', artistId: '', pageFrom: lo, pageTo: hi }]);
          setLettererRanges([{ id: 'letterer-range-1', artistId: '', pageFrom: lo, pageTo: hi }]);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setSubmitError(err?.message || t('common.modals.startProduction.loadError'));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t chỉ dùng cho thông báo lỗi; thêm vào sẽ tải lại và xoá phân công đang nhập khi đổi ngôn ngữ
  }, [isOpen, chapterId, workspaceId, seriesId, resetForm]);

  // Client validation for ranges
  const validateRanges = useCallback(
    (ranges: RangeItem[]): { conflict: string | null; allAssigned: boolean } => {
      if (ranges.length === 0) return { conflict: null, allAssigned: false };

      let allAssigned = true;
      for (const r of ranges) {
        if (!r.artistId) {
          allAssigned = false;
        }
        if (r.pageFrom > r.pageTo) {
          return {
            conflict: t(
              'seriesChaptersModal.startProductionModal.conflictFromGreaterTo',
              'Trang bắt đầu không thể lớn hơn trang kết thúc.',
            ),
            allAssigned,
          };
        }
        if (r.pageFrom < minPage || r.pageTo > maxPage) {
          return {
            conflict: t(
              'seriesChaptersModal.startProductionModal.conflictOutsideRange',
              'Dải trang nằm ngoài phạm vi trang của chương.',
            ),
            allAssigned,
          };
        }
      }

      for (let i = 0; i < ranges.length; i++) {
        for (let j = i + 1; j < ranges.length; j++) {
          if (ranges[i].pageFrom <= ranges[j].pageTo && ranges[j].pageFrom <= ranges[i].pageTo) {
            return {
              conflict: t('seriesChaptersModal.startProductionModal.conflictOverlap', {
                from1: ranges[i].pageFrom,
                to1: ranges[i].pageTo,
                from2: ranges[j].pageFrom,
                to2: ranges[j].pageTo,
                defaultValue: `Dải trang ${ranges[i].pageFrom}-${ranges[i].pageTo} chồng lấn với dải ${ranges[j].pageFrom}-${ranges[j].pageTo}.`,
              }),
              allAssigned,
            };
          }
        }
      }

      return { conflict: null, allAssigned };
    },
    [t, minPage, maxPage],
  );

  const artistValidation = useMemo(() => {
    if (artistMode === 'whole') {
      return { conflict: null, isValid: Boolean(singleArtistId) };
    }
    const { conflict, allAssigned } = validateRanges(artistRanges);
    return { conflict, isValid: !conflict && allAssigned };
  }, [artistMode, singleArtistId, artistRanges, validateRanges]);

  const lettererValidation = useMemo(() => {
    if (!assignLetterer) return { conflict: null, isValid: true };
    if (lettererMode === 'whole') {
      return { conflict: null, isValid: Boolean(singleLettererId) };
    }
    const { conflict, allAssigned } = validateRanges(lettererRanges);
    return { conflict, isValid: !conflict && allAssigned };
  }, [assignLetterer, lettererMode, singleLettererId, lettererRanges, validateRanges]);

  const isBibleBlocked = Boolean(cast?.gate && !cast.gate.canStart);

  const canSubmit =
    !loading &&
    !submitting &&
    !isBibleBlocked &&
    artistValidation.isValid &&
    lettererValidation.isValid &&
    pages.length > 0;

  const handleAddArtistRange = () => {
    setArtistRanges((prev) => [
      ...prev,
      {
        id: `artist-range-${Date.now()}`,
        artistId: '',
        pageFrom: minPage,
        pageTo: maxPage,
      },
    ]);
  };

  const handleRemoveArtistRange = (id: string) => {
    setArtistRanges((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAddLettererRange = () => {
    setLettererRanges((prev) => [
      ...prev,
      {
        id: `letterer-range-${Date.now()}`,
        artistId: '',
        pageFrom: minPage,
        pageTo: maxPage,
      },
    ]);
  };

  const handleRemoveLettererRange = (id: string) => {
    setLettererRanges((prev) => prev.filter((r) => r.id !== id));
  };

  const handleQuickMarkCrowd = async (bibleEntryId: string) => {
    if (!seriesId || !bibleEntryId) return;
    setTogglingCrowdId(bibleEntryId);
    try {
      await bibleService.setBibleEntryCrowd(seriesId, bibleEntryId, true);
      const updatedCast = await chapterCastService.getChapterCast(chapterId).catch(() => null);
      if (updatedCast) {
        setCast(updatedCast);
      }
      setSubmitBlockers((prev) => {
        const remaining = prev.filter((b) => b.bibleEntryId !== bibleEntryId);
        if (remaining.length === 0) {
          setSubmitError(null);
        }
        return remaining;
      });
      onShowToast?.(
        t('seriesChaptersModal.startProductionModal.crowdMarkedTitle', 'Đã đánh dấu Quần chúng'),
        '',
      );
    } catch (err: any) {
      onShowToast?.(
        err?.message ||
          t(
            'seriesChaptersModal.startProductionModal.crowdMarkFailed',
            'Không thể đánh dấu Quần chúng',
          ),
        '',
      );
    } finally {
      setTogglingCrowdId(null);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitBlockers([]);

    try {
      const pageAssignments: ProductionPageAssignmentRequest[] =
        artistMode === 'whole'
          ? [{ artistId: singleArtistId, pageFrom: minPage, pageTo: maxPage }]
          : artistRanges.map((r) => ({
              artistId: r.artistId,
              pageFrom: r.pageFrom,
              pageTo: r.pageTo,
            }));

      let lettererAssignments: ProductionPageAssignmentRequest[] | null = null;
      if (assignLetterer) {
        lettererAssignments =
          lettererMode === 'whole'
            ? [{ artistId: singleLettererId, pageFrom: minPage, pageTo: maxPage }]
            : lettererRanges.map((r) => ({
                artistId: r.artistId,
                pageFrom: r.pageFrom,
                pageTo: r.pageTo,
              }));
      }

      const body: StartChapterProductionRequest = {
        pageAssignments,
        lettererAssignments,
        ...(firstStageOnly ? { firstStageOnly: true } : {}),
        ...(expectedSubmittedVersionId ? { expectedSubmittedVersionId } : {}),
      };

      const result = await chapterService.startProduction(chapterId, body);
      const createdLots = Array.isArray(result?.lots) ? result.lots : [];
      void createdLots;

      onShowToast?.(
        t('seriesChaptersModal.startProductionModal.toastSuccessTitle', 'Đã bắt đầu sản xuất'),
        t('seriesChaptersModal.startProductionModal.toastSuccessDesc', {
          number: chapterNumber ?? '',
          defaultValue: `Chương ${chapterNumber ?? ''} đã chuyển sang InProduction. Kịch bản đã được đóng băng.`,
        }),
      );

      onSuccess?.(result);
      onClose();
    } catch (err: any) {
      if (err?.code === 'SCRIPT_VERSION_OUTDATED') {
        // Không tự gửi lại: báo Writer đã nộp bản mới, tải lại dữ liệu để Producer xem và xác nhận lần nữa
        const details: Partial<ScriptVersionOutdatedDetails> = err.details ?? {};
        setOutdated({
          fromVersionId: details.expectedSubmittedVersionId ?? expectedSubmittedVersionId ?? null,
          versionNumber: details.currentVersionNumber ?? null,
        });
        setSubmitError(null);
        onVersionOutdated?.();
        return;
      }
      const blockers = err.blockers || err.response?.data?.blockers || [];
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.data?.message ||
        err?.data?.error ||
        err?.message ||
        t('common.modals.startProduction.submitError');
      setSubmitError(msg);
      setSubmitBlockers(Array.isArray(blockers) ? blockers : []);
      if (err?.status === 409 || err?.response?.status === 409 || err?.code === 'CONFLICT') {
        onShowToast?.(msg, '');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size='lg'
      title={t(
        'seriesChaptersModal.startProductionModal.title',
        'Gate 1: Duyệt kịch bản & Bắt đầu sản xuất',
      )}
      closeLabel={t('seriesChaptersModal.startProductionModal.cancel', 'Đóng')}
    >
      <div className='bg-[#FCFBF8] border border-stone-200/90 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden'>
        {/* Header summary */}
        <div className='px-5 py-3.5 bg-[#FAF8F5] border-b border-stone-200 flex items-center justify-between gap-3 shrink-0'>
          <div>
            <h3 className='text-sm font-bold text-stone-900 font-studio'>
              {t(
                'seriesChaptersModal.startProductionModal.title',
                'Gate 1: Duyệt kịch bản & Bắt đầu sản xuất',
              )}
            </h3>
            <p className='text-xs text-stone-500 font-sans'>
              {t('seriesChaptersModal.startProductionModal.subtitle', {
                number: chapterNumber ?? '',
                title: chapterTitle || '',
                defaultValue: `Chương ${chapterNumber ?? ''}${chapterTitle ? `: ${chapterTitle}` : ''}`,
              })}
            </p>
          </div>
        </div>

        {/* Modal content */}
        <div className='p-5 overflow-y-auto space-y-4 text-xs font-sans'>
          {loading ? (
            <div className='py-12 flex flex-col items-center justify-center gap-2 text-stone-500'>
              <Loader2 className='w-6 h-6 animate-spin text-[#F97316]' />
              <p className='text-xs font-medium'>
                {t(
                  'seriesChaptersModal.startProductionModal.loading',
                  'Đang tải dữ liệu kiểm tra Gate 1...',
                )}
              </p>
            </div>
          ) : (
            <>
              {/* 1. Bible Gate Check */}
              {isBibleBlocked ? (
                <div
                  role='alert'
                  data-testid='gate1-bible-blockers'
                  className='rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-rose-900'
                >
                  <div className='flex items-start gap-2.5'>
                    <ShieldAlert className='w-4 h-4 text-rose-600 mt-0.5 shrink-0' />
                    <div className='space-y-1 flex-1'>
                      <h4 className='font-bold text-xs text-rose-800'>
                        {t(
                          'seriesChaptersModal.startProductionModal.bibleGateBlocked',
                          'Series Bible chưa sẵn sàng (Chặn Gate 1)',
                        )}
                      </h4>
                      <p className='text-xs text-rose-700 leading-relaxed'>
                        {t(
                          'seriesChaptersModal.startProductionModal.bibleGateBlockedDesc',
                          'Cần khóa Canon cho các nhân vật/thực thể trước khi bắt đầu sản xuất tranh.',
                        )}
                      </p>
                      {cast?.gate?.blockers && cast.gate.blockers.length > 0 && (
                        <ul className='mt-2 space-y-1.5 text-xs bg-white/80 rounded-lg p-2.5 border border-rose-200'>
                          {cast.gate.blockers.map((b, idx) => (
                            <li
                              key={b.bibleEntryId || idx}
                              className='text-rose-800 font-medium flex items-center justify-between gap-2 flex-wrap'
                            >
                              <span className='font-mono'>
                                <span className='font-bold'>{b.entryName}</span>: {b.reason}
                                {b.sourceExplanation ? ` (${b.sourceExplanation})` : ''}
                              </span>
                              {b.bibleEntryId && seriesId && (
                                <button
                                  type='button'
                                  disabled={togglingCrowdId === b.bibleEntryId}
                                  onClick={() => void handleQuickMarkCrowd(b.bibleEntryId)}
                                  data-testid={`gate1-quick-crowd-${b.bibleEntryId}`}
                                  className='px-2 py-0.5 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-sans text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-50'
                                >
                                  {t(
                                    'seriesChaptersModal.startProductionModal.markCrowdQuickBtn',
                                    'Đánh dấu Quần chúng',
                                  )}
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  data-testid='gate1-bible-ready'
                  className='rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 flex items-center gap-2 text-emerald-800'
                >
                  <CheckCircle2 className='w-4 h-4 text-emerald-600 shrink-0' />
                  <span className='font-semibold text-xs'>
                    {t(
                      'seriesChaptersModal.startProductionModal.bibleGateReady',
                      'Series Bible sẵn sàng (Canon đã khóa)',
                    )}
                  </span>
                </div>
              )}

              {/* 2. Soft Open Comments Warning */}
              {openCommentsCount > 0 && (
                <div
                  role='alert'
                  data-testid='gate1-open-comments-warning'
                  className='rounded-xl border border-amber-200 bg-amber-50/80 p-3 flex items-start gap-2 text-amber-900'
                >
                  <AlertTriangle className='w-4 h-4 text-amber-600 mt-0.5 shrink-0' />
                  <span className='text-xs leading-relaxed'>
                    {t('seriesChaptersModal.startProductionModal.openCommentsWarning', {
                      count: openCommentsCount,
                      defaultValue: `Còn ${openCommentsCount} góp ý kịch bản chưa giải quyết (góp ý không chặn tiến độ).`,
                    })}
                  </span>
                </div>
              )}

              {/* Check if chapter has pages */}
              {pages.length === 0 && (
                <div
                  role='alert'
                  className='rounded-xl border border-rose-200 bg-rose-50 p-3 flex items-center gap-2 text-rose-800'
                >
                  <AlertCircle className='w-4 h-4 text-rose-600 shrink-0' />
                  <span className='font-medium text-xs'>
                    {t(
                      'seriesChaptersModal.startProductionModal.noPagesWarning',
                      'Chương chưa có trang nào để phân công.',
                    )}
                  </span>
                </div>
              )}

              {/* 3. Artist Assignment (Mandatory) */}
              <div className='rounded-xl border border-stone-200 bg-white p-4 space-y-3 shadow-2xs'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Users className='w-4 h-4 text-[#F97316]' />
                    <label className='font-bold text-xs text-stone-900'>
                      {t(
                        'seriesChaptersModal.startProductionModal.artistSection',
                        'Phân công Artist (Bắt buộc)',
                      )}
                    </label>
                  </div>

                  {/* Mode switch */}
                  <div className='flex items-center gap-1 p-0.5 bg-stone-100 rounded-lg border border-stone-200'>
                    <button
                      type='button'
                      onClick={() => setArtistMode('whole')}
                      data-testid='gate1-artist-mode-whole'
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                        artistMode === 'whole'
                          ? 'bg-white text-stone-900 shadow-2xs'
                          : 'text-stone-500 hover:text-stone-700'
                      }`}
                    >
                      {t(
                        'seriesChaptersModal.startProductionModal.modeWholeChapter',
                        'Toàn bộ chương',
                      )}
                    </button>
                    <button
                      type='button'
                      onClick={() => setArtistMode('ranges')}
                      data-testid='gate1-artist-mode-ranges'
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                        artistMode === 'ranges'
                          ? 'bg-white text-stone-900 shadow-2xs'
                          : 'text-stone-500 hover:text-stone-700'
                      }`}
                    >
                      {t(
                        'seriesChaptersModal.startProductionModal.modePageRanges',
                        'Theo dải trang',
                      )}
                    </button>
                  </div>
                </div>

                {artistMode === 'whole' ? (
                  <div className='space-y-2'>
                    <select
                      value={singleArtistId}
                      onChange={(e) => setSingleArtistId(e.target.value)}
                      data-testid='gate1-artist-select'
                      aria-label={t(
                        'seriesChaptersModal.startProductionModal.selectArtist',
                        'Chọn Artist...',
                      )}
                      className='w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-800'
                    >
                      <option value=''>
                        {t(
                          'seriesChaptersModal.startProductionModal.selectArtist',
                          'Chọn Artist...',
                        )}
                      </option>
                      {members.map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.fullName} ({m.studioRole || m.seriesRole})
                        </option>
                      ))}
                    </select>
                    {pages.length > 0 && (
                      <p className='text-xs text-stone-500'>
                        {t('seriesChaptersModal.startProductionModal.wholeChapterArtistDesc', {
                          count: pages.length,
                          from: minPage,
                          to: maxPage,
                          defaultValue: `Giao toàn bộ ${pages.length} trang (Trang ${minPage} - Trang ${maxPage}) cho Artist được chọn.`,
                        })}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className='space-y-2.5'>
                    {artistRanges.map((r, index) => (
                      <div
                        key={r.id}
                        data-testid={`gate1-artist-range-${index}`}
                        className='flex items-center gap-2 p-2.5 rounded-lg border border-stone-200 bg-[#FAF9F5]'
                      >
                        <select
                          value={r.artistId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setArtistRanges((prev) =>
                              prev.map((item) =>
                                item.id === r.id ? { ...item, artistId: val } : item,
                              ),
                            );
                          }}
                          aria-label={t('common.modals.startProduction.artistRangeAria', {
                            index: index + 1,
                          })}
                          className='flex-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-800'
                        >
                          <option value=''>
                            {t(
                              'seriesChaptersModal.startProductionModal.selectArtist',
                              'Chọn Artist...',
                            )}
                          </option>
                          {members.map((m) => (
                            <option key={m.userId} value={m.userId}>
                              {m.fullName} ({m.studioRole || m.seriesRole})
                            </option>
                          ))}
                        </select>

                        <div className='flex items-center gap-1.5 shrink-0'>
                          <span className='text-xs text-stone-500'>
                            {t('seriesChaptersModal.startProductionModal.fromPage', 'Từ trang')}
                          </span>
                          <input
                            type='number'
                            min={minPage}
                            max={maxPage}
                            value={r.pageFrom}
                            aria-label={t('common.modals.startProduction.fromPageRangeAria', {
                              index: index + 1,
                            })}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setArtistRanges((prev) =>
                                prev.map((item) =>
                                  item.id === r.id ? { ...item, pageFrom: val } : item,
                                ),
                              );
                            }}
                            className='w-14 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-center font-mono font-bold'
                          />
                          <span className='text-xs text-stone-500'>
                            {t('seriesChaptersModal.startProductionModal.toPage', 'Đến trang')}
                          </span>
                          <input
                            type='number'
                            min={minPage}
                            max={maxPage}
                            value={r.pageTo}
                            aria-label={t('common.modals.startProduction.toPageRangeAria', {
                              index: index + 1,
                            })}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setArtistRanges((prev) =>
                                prev.map((item) =>
                                  item.id === r.id ? { ...item, pageTo: val } : item,
                                ),
                              );
                            }}
                            className='w-14 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-center font-mono font-bold'
                          />
                        </div>

                        {artistRanges.length > 1 && (
                          <button
                            type='button'
                            onClick={() => handleRemoveArtistRange(r.id)}
                            aria-label={t('common.modals.startProduction.removeRangeAria', {
                              index: index + 1,
                            })}
                            className='p-1.5 text-stone-400 hover:text-rose-600 transition-colors cursor-pointer'
                          >
                            <Trash2 className='w-4 h-4' />
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type='button'
                      onClick={handleAddArtistRange}
                      data-testid='gate1-add-artist-range-btn'
                      className='text-xs font-bold text-[#EA580C] hover:text-[#C2410C] flex items-center gap-1 cursor-pointer'
                    >
                      <Plus className='w-3.5 h-3.5' />
                      <span>
                        {t('seriesChaptersModal.startProductionModal.addRange', 'Thêm dải trang')}
                      </span>
                    </button>

                    {artistValidation.conflict && (
                      <div
                        role='alert'
                        data-testid='gate1-artist-conflict-alert'
                        className='p-2.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center gap-2'
                      >
                        <AlertCircle className='w-4 h-4 text-rose-600 shrink-0' />
                        <span>{artistValidation.conflict}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className='pt-3 border-t border-stone-100 space-y-1'>
                  <label className='inline-flex items-center gap-2 cursor-pointer font-semibold text-xs text-stone-900'>
                    <input
                      type='checkbox'
                      checked={firstStageOnly}
                      onChange={(e) => setFirstStageOnly(e.target.checked)}
                      data-testid='gate1-first-stage-only-checkbox'
                      className='rounded border-stone-300 text-[#F97316] focus:ring-[#F97316] accent-[#F97316]'
                    />
                    <span>
                      {t(
                        'seriesChaptersModal.startProductionModal.firstStageOnlyLabel',
                        'Chỉ giao công đoạn đầu',
                      )}
                    </span>
                  </label>
                  <p className='text-xs text-stone-500 pl-6 leading-relaxed'>
                    {t(
                      'seriesChaptersModal.startProductionModal.firstStageOnlyHint',
                      "Các công đoạn sau để trống; bật 'Tự giao công đoạn kế tiếp' ở tab Automation để hệ thống tự giao khi đến lượt.",
                    )}
                  </p>
                </div>
              </div>

              {/* 4. Letterer Assignment (Optional) */}
              <div className='rounded-xl border border-stone-200 bg-white p-4 space-y-3 shadow-2xs'>
                <div className='flex items-center justify-between'>
                  <label className='flex items-center gap-2 cursor-pointer font-bold text-xs text-stone-900'>
                    <input
                      type='checkbox'
                      checked={assignLetterer}
                      onChange={(e) => setAssignLetterer(e.target.checked)}
                      data-testid='gate1-letterer-checkbox'
                      className='rounded border-stone-300 text-[#F97316] focus:ring-[#F97316]'
                    />
                    <Layers className='w-4 h-4 text-[#F97316]' />
                    <span>
                      {t(
                        'seriesChaptersModal.startProductionModal.lettererSection',
                        'Phân công Letterer (Tuỳ chọn)',
                      )}
                    </span>
                  </label>

                  {assignLetterer && (
                    <div className='flex items-center gap-1 p-0.5 bg-stone-100 rounded-lg border border-stone-200'>
                      <button
                        type='button'
                        onClick={() => setLettererMode('whole')}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                          lettererMode === 'whole'
                            ? 'bg-white text-stone-900 shadow-2xs'
                            : 'text-stone-500 hover:text-stone-700'
                        }`}
                      >
                        {t(
                          'seriesChaptersModal.startProductionModal.modeWholeChapter',
                          'Toàn bộ chương',
                        )}
                      </button>
                      <button
                        type='button'
                        onClick={() => setLettererMode('ranges')}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                          lettererMode === 'ranges'
                            ? 'bg-white text-stone-900 shadow-2xs'
                            : 'text-stone-500 hover:text-stone-700'
                        }`}
                      >
                        {t(
                          'seriesChaptersModal.startProductionModal.modePageRanges',
                          'Theo dải trang',
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {assignLetterer && (
                  <>
                    {lettererMode === 'whole' ? (
                      <div className='space-y-2'>
                        <select
                          value={singleLettererId}
                          onChange={(e) => setSingleLettererId(e.target.value)}
                          data-testid='gate1-letterer-select'
                          aria-label={t(
                            'seriesChaptersModal.startProductionModal.selectLetterer',
                            'Chọn Letterer...',
                          )}
                          className='w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-800'
                        >
                          <option value=''>
                            {t(
                              'seriesChaptersModal.startProductionModal.selectLetterer',
                              'Chọn Letterer...',
                            )}
                          </option>
                          {members.map((m) => (
                            <option key={m.userId} value={m.userId}>
                              {m.fullName} ({m.studioRole || m.seriesRole})
                            </option>
                          ))}
                        </select>
                        {pages.length > 0 && (
                          <p className='text-xs text-stone-500'>
                            {t(
                              'seriesChaptersModal.startProductionModal.wholeChapterLettererDesc',
                              {
                                count: pages.length,
                                from: minPage,
                                to: maxPage,
                                defaultValue: `Giao toàn bộ ${pages.length} trang (Trang ${minPage} - Trang ${maxPage}) cho Letterer được chọn.`,
                              },
                            )}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className='space-y-2.5'>
                        {lettererRanges.map((r, index) => (
                          <div
                            key={r.id}
                            data-testid={`gate1-letterer-range-${index}`}
                            className='flex items-center gap-2 p-2.5 rounded-lg border border-stone-200 bg-[#FAF9F5]'
                          >
                            <select
                              value={r.artistId}
                              onChange={(e) => {
                                const val = e.target.value;
                                setLettererRanges((prev) =>
                                  prev.map((item) =>
                                    item.id === r.id ? { ...item, artistId: val } : item,
                                  ),
                                );
                              }}
                              aria-label={t('common.modals.startProduction.lettererRangeAria', {
                                index: index + 1,
                              })}
                              className='flex-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-800'
                            >
                              <option value=''>
                                {t(
                                  'seriesChaptersModal.startProductionModal.selectLetterer',
                                  'Chọn Letterer...',
                                )}
                              </option>
                              {members.map((m) => (
                                <option key={m.userId} value={m.userId}>
                                  {m.fullName} ({m.studioRole || m.seriesRole})
                                </option>
                              ))}
                            </select>

                            <div className='flex items-center gap-1.5 shrink-0'>
                              <span className='text-xs text-stone-500'>
                                {t('seriesChaptersModal.startProductionModal.fromPage', 'Từ trang')}
                              </span>
                              <input
                                type='number'
                                min={minPage}
                                max={maxPage}
                                value={r.pageFrom}
                                aria-label={t(
                                  'common.modals.startProduction.lettererFromPageAria',
                                  { index: index + 1 },
                                )}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setLettererRanges((prev) =>
                                    prev.map((item) =>
                                      item.id === r.id ? { ...item, pageFrom: val } : item,
                                    ),
                                  );
                                }}
                                className='w-14 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-center font-mono font-bold'
                              />
                              <span className='text-xs text-stone-500'>
                                {t('seriesChaptersModal.startProductionModal.toPage', 'Đến trang')}
                              </span>
                              <input
                                type='number'
                                min={minPage}
                                max={maxPage}
                                value={r.pageTo}
                                aria-label={t('common.modals.startProduction.lettererToPageAria', {
                                  index: index + 1,
                                })}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setLettererRanges((prev) =>
                                    prev.map((item) =>
                                      item.id === r.id ? { ...item, pageTo: val } : item,
                                    ),
                                  );
                                }}
                                className='w-14 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-center font-mono font-bold'
                              />
                            </div>

                            {lettererRanges.length > 1 && (
                              <button
                                type='button'
                                onClick={() => handleRemoveLettererRange(r.id)}
                                aria-label={t(
                                  'common.modals.startProduction.removeLettererRangeAria',
                                  { index: index + 1 },
                                )}
                                className='p-1.5 text-stone-400 hover:text-rose-600 transition-colors cursor-pointer'
                              >
                                <Trash2 className='w-4 h-4' />
                              </button>
                            )}
                          </div>
                        ))}

                        <button
                          type='button'
                          onClick={handleAddLettererRange}
                          data-testid='gate1-add-letterer-range-btn'
                          className='text-xs font-bold text-[#EA580C] hover:text-[#C2410C] flex items-center gap-1 cursor-pointer'
                        >
                          <Plus className='w-3.5 h-3.5' />
                          <span>
                            {t(
                              'seriesChaptersModal.startProductionModal.addRange',
                              'Thêm dải trang',
                            )}
                          </span>
                        </button>

                        {lettererValidation.conflict && (
                          <div
                            role='alert'
                            data-testid='gate1-letterer-conflict-alert'
                            className='p-2.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center gap-2'
                          >
                            <AlertCircle className='w-4 h-4 text-rose-600 shrink-0' />
                            <span>{lettererValidation.conflict}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 5a. Q26: kịch bản đã có bản nộp mới hơn bản đang xem */}
              {outdated && (
                <div
                  role='alert'
                  data-testid='gate1-version-outdated'
                  className='rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-amber-900 space-y-3'
                >
                  <div className='flex items-start gap-2'>
                    <AlertTriangle className='w-4 h-4 text-amber-600 mt-0.5 shrink-0' />
                    <div className='space-y-1'>
                      <p className='font-semibold text-xs leading-relaxed'>
                        {t('seriesChaptersModal.startProductionModal.versionOutdatedTitle', {
                          version: outdated.versionNumber ?? '?',
                          defaultValue: `Writer đã nộp kịch bản mới (v${outdated.versionNumber ?? '?'}).`,
                        })}
                      </p>
                      <p className='text-xs leading-relaxed'>
                        {t('seriesChaptersModal.startProductionModal.versionOutdatedDesc', {
                          defaultValue:
                            'Bản bạn đang xem đã cũ. Xem thay đổi bên dưới rồi xác nhận bắt đầu sản xuất lại.',
                        })}
                      </p>
                    </div>
                  </div>
                  <ScriptVersionDiff
                    chapterId={chapterId}
                    defaultFromId={outdated.fromVersionId}
                    defaultToId={null}
                  />
                </div>
              )}

              {/* 5. Inline 409 / Submit error display */}
              {submitError && (
                <div
                  role='alert'
                  data-testid='gate1-submit-error'
                  className='rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-rose-900 space-y-2'
                >
                  <div className='flex items-start gap-2'>
                    <AlertCircle className='w-4 h-4 text-rose-600 mt-0.5 shrink-0' />
                    <span className='font-semibold text-xs leading-relaxed'>{submitError}</span>
                  </div>
                  {submitBlockers.length > 0 && (
                    <ul className='space-y-1.5 text-xs bg-white/80 rounded-lg p-2.5 border border-rose-200'>
                      {submitBlockers.map((b, idx) => (
                        <li
                          key={b.bibleEntryId || idx}
                          className='text-rose-800 font-medium flex items-center justify-between gap-2 flex-wrap'
                        >
                          <span className='font-mono'>
                            <span className='font-bold'>{b.entryName}</span>: {b.reason}
                            {b.sourceExplanation ? ` (${b.sourceExplanation})` : ''}
                          </span>
                          {b.bibleEntryId && seriesId && (
                            <button
                              type='button'
                              disabled={togglingCrowdId === b.bibleEntryId}
                              onClick={() => void handleQuickMarkCrowd(b.bibleEntryId)}
                              data-testid={`gate1-quick-crowd-${b.bibleEntryId}`}
                              className='px-2 py-0.5 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-sans text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-50'
                            >
                              {t(
                                'seriesChaptersModal.startProductionModal.markCrowdQuickBtn',
                                'Đánh dấu Quần chúng',
                              )}
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className='px-5 py-3.5 bg-[#FAF8F5] border-t border-stone-200 flex items-center justify-end gap-2.5 shrink-0'>
          <button
            type='button'
            onClick={onClose}
            disabled={submitting}
            className='px-4 py-2 rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 font-semibold text-xs transition-studio disabled:opacity-50 cursor-pointer'
          >
            {t('seriesChaptersModal.startProductionModal.cancel', 'Xem lại')}
          </button>
          <button
            type='button'
            onClick={handleSubmit}
            disabled={!canSubmit}
            data-testid='gate1-submit-btn'
            className='px-4 py-2 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-xs transition-studio flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer active:scale-98'
          >
            {submitting ? (
              <>
                <Loader2 className='w-3.5 h-3.5 animate-spin' />
                <span>
                  {t('seriesChaptersModal.startProductionModal.submittingBtn', 'Đang bắt đầu...')}
                </span>
              </>
            ) : (
              <>
                <Play className='w-3.5 h-3.5 text-orange-200' />
                <span>
                  {t('seriesChaptersModal.startProductionModal.submitBtn', 'Bắt đầu sản xuất')}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
