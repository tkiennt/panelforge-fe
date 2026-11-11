import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  FileText,
  Lock,
  Unlock,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Send,
  Eye,
  MessageSquarePlus,
  Info,
  ChevronRight,
  ExternalLink,
  UserCheck,
  AlertOctagon,
  CornerDownRight,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import {
  chapterService,
  type ChapterDto,
  type ChapterBibleGateResultDto,
} from '@/services/chapter.service';
import {
  scriptLineService,
  type SceneDto,
  type SceneDetailDto,
} from '@/services/scriptLine.service';
import {
  assignmentService,
  type ChangeRequestDto,
  type ConsistencyFindingDto,
  type AssignmentDto,
} from '@/services/assignment.service';
import { seriesService, type SeriesDto } from '@/services/series.service';
import { getWorkActions } from '@/shared/features/collaboration/collaborationRules';

interface ScriptReviewViewProps {
  currentUserId?: string;
  workspaceRole?: string;
  onShowToast?: (title: string, message: string) => void;
}

export const ScriptReviewView: React.FC<ScriptReviewViewProps> = ({
  currentUserId,
  workspaceRole,
  onShowToast,
}) => {
  const {
    workspaceId,
    seriesId,
    chapterId: paramChapterId,
  } = useParams<{
    workspaceId: string;
    seriesId: string;
    chapterId: string;
  }>();
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get('assignmentId');

  const navigate = useNavigate();
  const { t } = useTranslation('review');

  const chapterId = paramChapterId || '';

  // Data States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [chapter, setChapter] = useState<ChapterDto | null>(null);
  const [series, setSeries] = useState<SeriesDto | null>(null);
  const [scenes, setScenes] = useState<SceneDto[]>([]);
  const [sceneDetails, setSceneDetails] = useState<Record<string, SceneDetailDto>>({});
  const [bibleGate, setBibleGate] = useState<ChapterBibleGateResultDto | null>(null);
  const [consistencyFindings, setConsistencyFindings] = useState<ConsistencyFindingDto[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequestDto[]>([]);
  const [assignment, setAssignment] = useState<AssignmentDto | null>(null);
  const workActions = useMemo(
    () =>
      assignment
        ? getWorkActions(assignment, {
            userId: currentUserId,
            workspaceRole,
            changeRequests,
            hasCurrentArtwork: null,
          })
        : null,
    [assignment, currentUserId, workspaceRole, changeRequests],
  );
  // Chỉ tạo được yêu cầu sửa khi đang mở phiên duyệt một bài nộp (UnderReview) và không phải bài của chính mình.
  const canDecide = workActions?.canDecide ?? false;
  const approveBlockedReason = workActions?.approveBlockedReason ?? null;

  // Inspector Panel Tabs: 'bibleGate' | 'logicCheck' | 'changeRequests'
  const [activeTab, setActiveTab] = useState<'bibleGate' | 'logicCheck' | 'changeRequests'>(
    'bibleGate',
  );

  // Action pending states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // Change Request Form Modal / Drawer State
  const [showCrModal, setShowCrModal] = useState<boolean>(false);
  const [crReason, setCrReason] = useState<string>('');
  const [crSeverity, setCrSeverity] = useState<'Blocking' | 'Warning' | 'Info'>('Blocking');
  const [crTargetSceneId, setCrTargetSceneId] = useState<string>('');
  const [crContextText, setCrContextText] = useState<string>('');

  // Unfreeze Reason Modal
  const [showUnfreezeModal, setShowUnfreezeModal] = useState<boolean>(false);
  const [unfreezeReason, setUnfreezeReason] = useState<string>('');

  const isProducer = useMemo(() => {
    return workspaceRole?.toLowerCase() === 'producer' || workspaceRole?.toLowerCase() === 'owner';
  }, [workspaceRole]);

  // Load Main Chapter & Script Data
  const loadData = useCallback(async () => {
    if (!chapterId) return;
    setLoading(true);
    setError(null);

    try {
      const [chapterData, scenesData, gateData] = await Promise.all([
        chapterService.getChapterById(chapterId),
        scriptLineService.getScenesByChapter(chapterId),
        chapterService.checkBibleGate(chapterId).catch(() => null),
      ]);

      setChapter(chapterData);
      setScenes(scenesData);
      setBibleGate(gateData);

      if (seriesId) {
        seriesService
          .getSeriesById(seriesId)
          .then(setSeries)
          .catch(() => null);
      }

      // Fetch detail for each scene to load script lines
      const detailsMap: Record<string, SceneDetailDto> = {};
      await Promise.all(
        scenesData.map(async (sc) => {
          try {
            const detail = await scriptLineService.getSceneById(sc.id);
            detailsMap[sc.id] = detail;
          } catch {
            // Scene might be empty
          }
        }),
      );
      setSceneDetails(detailsMap);

      // Load assignment & change requests if assignmentId passed
      if (assignmentId) {
        try {
          const [assignData, crList] = await Promise.all([
            assignmentService.getAssignmentById(chapterId, assignmentId),
            assignmentService.getChangeRequests(chapterId, { assignmentId }),
          ]);
          setAssignment(assignData);
          setChangeRequests(crList);
        } catch {
          // assignment not found
        }
      }

      // Load Consistency findings if available
      try {
        const findings = await assignmentService.getConsistencyFindings(chapterId);
        setConsistencyFindings(findings);
      } catch {
        // no consistency findings yet
      }
    } catch (err: any) {
      console.error('Lỗi khi tải dữ liệu duyệt kịch bản:', err);
      setError(err.message || 'Không thể tải dữ liệu kịch bản của chương này.');
    } finally {
      setLoading(false);
    }
  }, [chapterId, seriesId, assignmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Copy Content Hash
  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
    onShowToast?.('Đã sao chép mã SHA-256', 'Mã kiểm tra toàn vẹn kịch bản đã lưu vào bộ nhớ tạm.');
  };

  // Run AI Consistency & Logic Check (F-05)
  const handleRunConsistencyCheck = async () => {
    if (!chapterId) return;
    setActionLoading('consistency');
    try {
      const res = await assignmentService.runConsistencyCheck(chapterId);
      setConsistencyFindings(res.findings || []);
      setActiveTab('logicCheck');
      onShowToast?.(
        'Đã hoàn thành kiểm tra',
        `Phát hiện ${res.findings?.length || 0} mục lưu ý về Canon và kịch bản.`,
      );
    } catch (err: any) {
      console.error('Lỗi kiểm tra tính nhất quán:', err);
      onShowToast?.('Lỗi kiểm tra', err.message || 'Không thể chạy kiểm tra AI kịch bản.');
    } finally {
      setActionLoading(null);
    }
  };

  // Freeze Script (Producer Authority)
  const handleFreezeScript = async () => {
    if (!chapterId) return;
    setActionLoading('freeze');
    try {
      const updated = await chapterService.freezeScript(chapterId);
      setChapter(updated);
      onShowToast?.(
        'Đã đóng băng kịch bản',
        'Kịch bản đã khoá Canon và tính mã băm SHA-256 thành công. Mở khoá công đoạn vẽ Storyboard.',
      );
    } catch (err: any) {
      console.error('Lỗi đóng băng kịch bản:', err);
      onShowToast?.('Không thể đóng băng', err.message || 'Lỗi quy tắc đóng băng kịch bản.');
    } finally {
      setActionLoading(null);
    }
  };

  // Unfreeze Script (Producer Authority)
  const handleUnfreezeScript = async () => {
    if (!chapterId) return;
    setActionLoading('unfreeze');
    try {
      const updated = await chapterService.unfreezeScript(chapterId, unfreezeReason || undefined);
      setChapter(updated);
      setShowUnfreezeModal(false);
      setUnfreezeReason('');
      onShowToast?.(
        'Đã mở lại kịch bản',
        'Kịch bản đã chuyển về trạng thái bản thảo để Writer tiếp tục chỉnh sửa.',
      );
    } catch (err: any) {
      console.error('Lỗi mở lại kịch bản:', err);
      onShowToast?.('Không thể mở lại', err.message || 'Lỗi quy tắc mở lại kịch bản.');
    } finally {
      setActionLoading(null);
    }
  };

  // Approve Script Reopen Request
  const handleApproveReopen = async () => {
    if (!chapterId) return;
    setActionLoading('approveReopen');
    try {
      const updated = await chapterService.approveScriptReopen(chapterId);
      setChapter(updated);
      onShowToast?.('Đã phê duyệt', 'Chấp thuận yêu cầu mở lại kịch bản của Writer.');
    } catch (err: any) {
      onShowToast?.('Lỗi', err.message || 'Không thể chấp thuận yêu cầu mở lại.');
    } finally {
      setActionLoading(null);
    }
  };

  // Reject Script Reopen Request
  const handleRejectReopen = async () => {
    if (!chapterId) return;
    setActionLoading('rejectReopen');
    try {
      const updated = await chapterService.rejectScriptReopen(chapterId);
      setChapter(updated);
      onShowToast?.('Đã từ chối', 'Đã từ chối yêu cầu mở lại kịch bản.');
    } catch (err: any) {
      onShowToast?.('Lỗi', err.message || 'Không thể từ chối yêu cầu mở lại.');
    } finally {
      setActionLoading(null);
    }
  };

  // Quick Open Change Request for a specific line/scene
  const handlePromptChangeRequest = (sceneId: string, textSnippet?: string) => {
    if (!canDecide) return;
    setCrTargetSceneId(sceneId);
    setCrContextText(textSnippet || '');
    setCrReason('');
    setCrSeverity('Blocking');
    setShowCrModal(true);
  };

  // Submit Change Request
  const handleSubmitChangeRequest = async () => {
    if (!crReason.trim()) {
      onShowToast?.('Thiếu thông tin', 'Vui lòng nhập nội dung yêu cầu sửa đổi.');
      return;
    }

    if (!assignmentId || !canDecide) return;

    setActionLoading('createCr');
    try {
      // Kịch bản không có Panel: vị trí (cảnh/dòng) được ghi vào mô tả; PanelId của Backend là Guid của Panel tranh.
      const scene = scenes.find((sc) => sc.id === crTargetSceneId);
      const location = scene ? `Cảnh ${scene.sceneNumber}` : '';
      const changes = [
        {
          description: [
            `[${crSeverity}]`,
            location,
            crReason.trim(),
            crContextText ? `(Nội dung: "${crContextText.substring(0, 80)}")` : '',
          ]
            .filter(Boolean)
            .join(' '),
        },
      ];

      await assignmentService.requestAssignmentChanges(chapterId, assignmentId, crReason, changes);

      onShowToast?.('Đã gửi yêu cầu sửa', 'Yêu cầu sửa đổi kịch bản đã chuyển giao đến Writer.');
      setShowCrModal(false);
      loadData();
    } catch (err: any) {
      console.error('Lỗi tạo yêu cầu sửa:', err);
      onShowToast?.('Lỗi tạo yêu cầu', err.message || 'Không thể gửi yêu cầu chỉnh sửa.');
    } finally {
      setActionLoading(null);
    }
  };

  // Approve Assignment (Editor / Reviewer action)
  const handleApproveAssignment = async () => {
    if (!assignmentId || !chapterId || !canDecide || approveBlockedReason) return;
    setActionLoading('approveAssignment');
    try {
      await assignmentService.approveAssignment(chapterId, assignmentId);
      onShowToast?.('Đã duyệt kịch bản', 'Bài nộp kịch bản đã được phê duyệt thành công.');
      loadData();
    } catch (err: any) {
      console.error('Lỗi duyệt bài kịch bản:', err);
      onShowToast?.('Lỗi duyệt bài', err.message || 'Không thể phê duyệt bài nộp kịch bản.');
    } finally {
      setActionLoading(null);
    }
  };

  // Triage Finding (AI Continuity Finding)
  const handleDecideFinding = async (
    findingId: string,
    decision: 'Confirmed' | 'Rejected' | 'Ignored' | 'NeedsClarification',
  ) => {
    if (!chapterId) return;
    try {
      await assignmentService.triageConsistencyFinding(chapterId, findingId, decision);
      onShowToast?.('Đã cập nhật', `Đã ghi nhận quyết định "${decision}" cho mục kiểm tra.`);
      const findings = await assignmentService.getConsistencyFindings(chapterId);
      setConsistencyFindings(findings);
    } catch (err: any) {
      onShowToast?.('Lỗi cập nhật', err.message || 'Không thể cập nhật quyết định.');
    }
  };

  const isScriptFrozen = chapter?.isScriptFrozen === true;
  const scriptContentHash = chapter?.scriptContentHash;
  const isReopenRequested = chapter?.scriptReopenStatus === 'Requested';

  // Navigate back to Editor Desk
  const handleBackToDesk = () => {
    if (workspaceId && seriesId) {
      navigate(`/workspaces/${workspaceId}/series/${seriesId}/editor/desk`);
    } else {
      navigate(-1);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center p-6 text-center'>
        <div className='w-10 h-10 border-3 border-[#D8D2C5] border-t-[#C2410C] rounded-full animate-spin mb-4' />
        <h3 className='text-sm font-serif font-bold text-[#1C1917]'>
          Đang tải dữ liệu kịch bản & phân cảnh...
        </h3>
        <p className='text-xs text-[#78716C] mt-1 font-sans'>
          Đang chuẩn bị hồ sơ thẩm định biên tập cho Chương {chapter?.chapterNumber || ''}
        </p>
      </div>
    );
  }

  if (error || !chapter) {
    return (
      <div className='min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center p-6 text-center'>
        <AlertOctagon className='w-12 h-12 text-rose-500 mb-3' />
        <h3 className='text-base font-serif font-bold text-[#1C1917]'>
          Không thể mở bản thảo kịch bản
        </h3>
        <p className='text-xs text-[#78716C] mt-1 max-w-md font-sans'>
          {error || 'Chương không tồn tại.'}
        </p>
        <button
          type='button'
          onClick={handleBackToDesk}
          className='mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#1C1917] hover:bg-[#292524] transition-colors cursor-pointer'
        >
          <ArrowLeft className='w-4 h-4' />
          <span>Về Bàn Thẩm Định</span>
        </button>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-[#FAF9F5] flex flex-col font-sans antialiased text-[#1C1917] selection:bg-[#FCE7D0] selection:text-[#C2410C]'>
      {/* Editorial Topbar: Studio Clean Aesthetic */}
      <header className='sticky top-0 z-30 bg-[#FCFBF8] border-b border-[#D8D2C5] shadow-2xs'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4 flex-wrap'>
          {/* Left: Back button & Breadcrumbs */}
          <div className='flex items-center gap-3'>
            <button
              type='button'
              onClick={handleBackToDesk}
              className='p-1.5 rounded-lg border border-[#D8D2C5] bg-[#FAF9F5] hover:bg-[#F3F0E9] text-[#57534E] hover:text-[#1C1917] transition-colors cursor-pointer shadow-2xs'
              title='Quay lại Bàn Thẩm Định Biên Tập'
            >
              <ArrowLeft className='w-4 h-4' />
            </button>

            <div>
              <div className='flex items-center gap-2 flex-wrap'>
                <span className='text-xs font-semibold text-[#C2410C] uppercase tracking-wider'>
                  Gate 1 · Thẩm Định Kịch Bản
                </span>
                <span className='text-xs text-[#A8A29E]'>/</span>
                <span className='text-xs font-medium text-[#78716C]'>
                  {series?.title || 'Bộ truyện'}
                </span>
              </div>
              <h1 className='text-base sm:text-lg font-serif font-bold text-[#1C1917] tracking-tight flex items-center gap-2 mt-0.5'>
                <span>
                  Chương {chapter.chapterNumber}: {chapter.title || 'Chưa đặt tiêu đề'}
                </span>
              </h1>
            </div>
          </div>

          {/* Right: Canon Status Badge & Major Governance Actions */}
          <div className='flex items-center gap-2.5 flex-wrap'>
            {/* Script Freeze State Badge */}
            {isScriptFrozen ? (
              <div className='flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 rounded-lg px-2.5 py-1 text-xs text-emerald-800 shadow-2xs'>
                <Lock className='w-3.5 h-3.5 text-emerald-600' />
                <span className='font-bold'>Đã chốt Canon & Đóng băng</span>
                {scriptContentHash && (
                  <button
                    type='button'
                    onClick={() => handleCopyHash(scriptContentHash)}
                    className='ml-1 font-mono text-[11px] text-emerald-700 bg-emerald-100/70 hover:bg-emerald-200/80 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors'
                    title={`Mã băm toàn vẹn SHA-256: ${scriptContentHash}`}
                  >
                    <span>{scriptContentHash.substring(0, 8)}...</span>
                    {copiedHash ? (
                      <Check className='w-3 h-3 text-emerald-700' />
                    ) : (
                      <Copy className='w-3 h-3' />
                    )}
                  </button>
                )}
              </div>
            ) : (
              <div className='flex items-center gap-1.5 bg-amber-50 border border-amber-200/80 rounded-lg px-2.5 py-1 text-xs text-amber-800 shadow-2xs'>
                <Unlock className='w-3.5 h-3.5 text-amber-600' />
                <span className='font-medium'>Bản thảo đang mở (Chưa đóng băng)</span>
              </div>
            )}

            {/* AI Consistency Quick Check Trigger */}
            <button
              type='button'
              onClick={handleRunConsistencyCheck}
              disabled={actionLoading === 'consistency'}
              className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#57534E] hover:text-[#1C1917] bg-[#FCFBF8] hover:bg-[#F3F0E9] border border-[#D8D2C5] shadow-2xs transition-colors cursor-pointer disabled:opacity-50'
              title='Quét tính nhất quán với Series Bible và luật nhân vật F-05'
            >
              <Sparkles
                className={`w-3.5 h-3.5 text-purple-600 ${actionLoading === 'consistency' ? 'animate-spin' : ''}`}
              />
              <span>Kiểm tra Canon</span>
            </button>

            {/* Producer Milestone Action: Freeze or Unfreeze */}
            {isProducer && (
              <>
                {!isScriptFrozen ? (
                  <button
                    type='button'
                    onClick={handleFreezeScript}
                    disabled={actionLoading === 'freeze'}
                    className='inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[#059669] hover:bg-[#047857] active:bg-[#065F46] shadow-soft-sm transition-colors cursor-pointer disabled:opacity-50'
                    title='Khóa nội dung kịch bản, tính mã băm SHA-256 và bắt đầu khâu vẽ phân cảnh'
                  >
                    <ShieldCheck className='w-3.5 h-3.5' />
                    <span>
                      {actionLoading === 'freeze' ? 'Đang đóng băng...' : 'Chốt Canon & Đóng Băng'}
                    </span>
                  </button>
                ) : (
                  <button
                    type='button'
                    onClick={() => setShowUnfreezeModal(true)}
                    disabled={actionLoading === 'unfreeze'}
                    className='inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#57534E] hover:text-rose-700 bg-[#FCFBF8] hover:bg-rose-50 border border-[#D8D2C5] hover:border-rose-300 shadow-2xs transition-colors cursor-pointer disabled:opacity-50'
                    title='Mở lại quyền chỉnh sửa kịch bản cho Writer'
                  >
                    <Unlock className='w-3.5 h-3.5' />
                    <span>Mở Lại Kịch Bản</span>
                  </button>
                )}
              </>
            )}

            {/* Assignment Review Decisions (If opened via Assignment) */}
            {assignment && (
              <div className='flex items-center gap-1.5 pl-2 border-l border-[#D8D2C5]'>
                <button
                  type='button'
                  onClick={() => handlePromptChangeRequest(scenes[0]?.id || '')}
                  disabled={!canDecide}
                  className='disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-900 bg-amber-100/70 hover:bg-amber-200/80 border border-amber-300/60 shadow-2xs transition-colors cursor-pointer'
                >
                  <MessageSquarePlus className='w-3.5 h-3.5 text-amber-700' />
                  <span>Yêu cầu sửa</span>
                </button>

                <button
                  type='button'
                  onClick={handleApproveAssignment}
                  disabled={
                    !canDecide || !!approveBlockedReason || actionLoading === 'approveAssignment'
                  }
                  title={approveBlockedReason ?? undefined}
                  className='inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[#C2410C] hover:bg-[#9A3412] active:bg-[#7C2D12] shadow-soft-sm transition-colors cursor-pointer disabled:opacity-50'
                >
                  <CheckCircle2 className='w-3.5 h-3.5' />
                  <span>
                    {actionLoading === 'approveAssignment' ? 'Đang duyệt...' : 'Duyệt Kịch Bản'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Script Reopen Alert Banner (If Writer requested reopen) */}
        {isReopenRequested && (
          <div className='bg-amber-50/90 border-t border-b border-amber-200/80 px-4 sm:px-6 py-2.5'>
            <div className='max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap text-xs'>
              <div className='flex items-center gap-2 text-amber-900'>
                <AlertTriangle className='w-4 h-4 text-amber-600 shrink-0' />
                <div>
                  <span className='font-bold'>Biên kịch gửi yêu cầu mở lại kịch bản:</span>{' '}
                  <span className='italic text-[#57534E]'>
                    "{chapter.scriptReopenReason || 'Cần điều chỉnh tình tiết'}"
                  </span>
                </div>
              </div>

              {isProducer && (
                <div className='flex items-center gap-2'>
                  <button
                    type='button'
                    onClick={handleApproveReopen}
                    disabled={actionLoading === 'approveReopen'}
                    className='px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer transition-colors shadow-2xs'
                  >
                    Chấp thuận mở lại
                  </button>
                  <button
                    type='button'
                    onClick={handleRejectReopen}
                    disabled={actionLoading === 'rejectReopen'}
                    className='px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer transition-colors shadow-2xs'
                  >
                    Từ chối
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Workspace Layout: 2 Columns (Reader & Quality Inspector) */}
      <main className='flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'>
        {/* Left Column: Screenplay Viewer (Read-only Manuscript) */}
        <section className='lg:col-span-8 space-y-6'>
          {/* Editorial Guidance Notice */}
          <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl p-3.5 text-xs text-[#57534E] flex items-center justify-between gap-3 shadow-2xs'>
            <div className='flex items-center gap-2'>
              <BookOpen className='w-4 h-4 text-[#C2410C] shrink-0' />
              <span>
                <strong>Chế độ thẩm định (BR-27):</strong> Biên tập viên đọc, đánh giá tính logic và
                đặt ghi chú chỉnh sửa mà không can thiệp câu chữ trực tiếp của Biên kịch.
              </span>
            </div>
            <span className='font-mono text-[#78716C] shrink-0'>{scenes.length} Phân cảnh</span>
          </div>

          {scenes.length === 0 ? (
            <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl p-12 text-center shadow-2xs'>
              <FileText className='w-12 h-12 text-[#A8A29E] mx-auto mb-3' />
              <h3 className='text-sm font-serif font-bold text-[#1C1917]'>
                Chưa có phân cảnh kịch bản nào
              </h3>
              <p className='text-xs text-[#78716C] mt-1 max-w-md mx-auto'>
                Biên kịch chưa hoàn thiện phân cảnh hoặc chưa nộp bản thảo cho chương này.
              </p>
            </div>
          ) : (
            scenes.map((scene, idx) => {
              const detail = sceneDetails[scene.id];
              const lines = detail?.scriptLines || [];

              return (
                <article
                  key={scene.id}
                  className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl overflow-hidden shadow-2xs transition-all hover:border-[#C4BCAF]'
                >
                  {/* Scene Header Strip (Screenplay Slugline Format) */}
                  <div className='bg-[#F3F0E9] px-4 py-3 border-b border-[#E5E0D8] flex items-center justify-between gap-3 flex-wrap'>
                    <div className='flex items-center gap-2.5'>
                      <span className='w-6 h-6 rounded-md bg-[#1C1917] text-white flex items-center justify-center font-bold text-xs font-mono shrink-0'>
                        {scene.sceneNumber || idx + 1}
                      </span>
                      <h2 className='text-xs sm:text-sm font-serif font-bold text-[#1C1917] tracking-wider uppercase'>
                        {scene.heading ||
                          scene.slugline ||
                          `CẢNH ${scene.sceneNumber}: ${scene.location || 'NỘI CẢNH'} - ${scene.timeOfDay || 'NGÀY'}`}
                      </h2>
                    </div>

                    <div className='flex items-center gap-2'>
                      {scene.defaultNarrationMode && (
                        <span className='text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200/60'>
                          {scene.defaultNarrationMode}
                        </span>
                      )}

                      {canDecide && (
                        <button
                          type='button'
                          onClick={() =>
                            handlePromptChangeRequest(
                              scene.id,
                              scene.heading || `Cảnh ${scene.sceneNumber}`,
                            )
                          }
                          className='inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-[#57534E] hover:text-[#1C1917] hover:bg-[#FAF9F5] border border-[#D8D2C5] transition-colors cursor-pointer shadow-2xs'
                          title='Thêm yêu cầu sửa cho toàn bộ phân cảnh này'
                        >
                          <MessageSquarePlus className='w-3 h-3 text-[#C2410C]' />
                          <span>Ghi chú cảnh</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scene Summary */}
                  {scene.summary && (
                    <div className='px-5 py-2.5 bg-[#FAF9F5] border-b border-[#E5E0D8]/60 text-xs text-[#57534E] italic'>
                      <span className='font-semibold text-[#1C1917] not-italic'>Tóm tắt: </span>
                      {scene.summary}
                    </div>
                  )}

                  {/* Script Lines Flow */}
                  <div className='p-5 space-y-4'>
                    {lines.length === 0 ? (
                      <p className='text-xs text-[#A8A29E] italic text-center py-4'>
                        Phân cảnh này chưa có dòng kịch bản nào.
                      </p>
                    ) : (
                      lines.map((line) => {
                        return (
                          <div
                            key={line.id}
                            className='group relative pl-4 border-l-2 border-[#E5E0D8] hover:border-[#C2410C] transition-colors py-1'
                          >
                            {/* Action / Stage Direction */}
                            {line.stageDirection && (
                              <p className='text-xs text-[#57534E] italic font-serif leading-relaxed mb-1.5'>
                                ({line.stageDirection})
                              </p>
                            )}

                            {/* Dialogue Block */}
                            {line.dialogueText && (
                              <div className='max-w-xl'>
                                <div className='flex items-center gap-2 mb-0.5'>
                                  <span className='text-xs font-mono font-bold text-[#1C1917] uppercase tracking-wide'>
                                    {line.speakerCharacterId
                                      ? `NHÂN VẬT #${line.speakerCharacterId.substring(0, 5)}`
                                      : 'LỜI THOẠI'}
                                  </span>
                                  {line.narrationMode && (
                                    <span className='text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded font-medium'>
                                      {line.narrationMode}
                                    </span>
                                  )}
                                </div>
                                <p className='text-sm text-[#1C1917] leading-relaxed font-sans bg-[#FAF9F5] p-2.5 rounded-lg border border-[#E5E0D8]/70'>
                                  {line.dialogueText}
                                </p>
                              </div>
                            )}

                            {/* Hover Quick Action: Add Line Change Request */}
                            {canDecide && (
                              <div className='absolute right-2 top-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                                <button
                                  type='button'
                                  onClick={() =>
                                    handlePromptChangeRequest(
                                      scene.id,
                                      line.dialogueText || line.stageDirection || '',
                                    )
                                  }
                                  className='inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-[#57534E] bg-white hover:bg-[#F3F0E9] border border-[#D8D2C5] shadow-2xs transition-colors cursor-pointer'
                                  title='Đặt yêu cầu sửa hoặc nhận xét cho dòng kịch bản này'
                                >
                                  <MessageSquarePlus className='w-3 h-3 text-[#C2410C]' />
                                  <span>Nhận xét dòng</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>

        {/* Right Column: Multi-tab Quality & Canon Inspector */}
        <aside className='lg:col-span-4 space-y-5 sticky top-18'>
          <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl overflow-hidden shadow-2xs'>
            {/* Inspector Tab Switcher */}
            <div className='grid grid-cols-3 border-b border-[#D8D2C5] text-xs font-semibold bg-[#F3F0E9]'>
              <button
                type='button'
                onClick={() => setActiveTab('bibleGate')}
                className={`py-2.5 px-2 text-center transition-colors cursor-pointer ${
                  activeTab === 'bibleGate'
                    ? 'bg-[#FCFBF8] text-[#C2410C] border-b-2 border-[#C2410C]'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                Bible Gate
              </button>
              <button
                type='button'
                onClick={() => setActiveTab('logicCheck')}
                className={`py-2.5 px-2 text-center transition-colors cursor-pointer ${
                  activeTab === 'logicCheck'
                    ? 'bg-[#FCFBF8] text-[#C2410C] border-b-2 border-[#C2410C]'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                Logic Canon
              </button>
              <button
                type='button'
                onClick={() => setActiveTab('changeRequests')}
                className={`py-2.5 px-2 text-center transition-colors cursor-pointer ${
                  activeTab === 'changeRequests'
                    ? 'bg-[#FCFBF8] text-[#C2410C] border-b-2 border-[#C2410C]'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                Yêu cầu sửa ({changeRequests.length})
              </button>
            </div>

            {/* Tab 1: Chapter Bible Gate Content */}
            {activeTab === 'bibleGate' && (
              <div className='p-4 space-y-4 text-xs'>
                <div className='flex items-center justify-between'>
                  <span className='font-bold text-[#1C1917]'>Kiểm tra Thực thể Bible</span>
                  {bibleGate?.isPassed ? (
                    <span className='inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80'>
                      <CheckCircle2 className='w-3 h-3 text-emerald-600' />
                      Đạt cổng Canon
                    </span>
                  ) : (
                    <span className='inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80'>
                      <AlertTriangle className='w-3 h-3 text-amber-600' />
                      Chưa chốt hết
                    </span>
                  )}
                </div>

                <div className='grid grid-cols-2 gap-2 text-center'>
                  <div className='p-2 bg-[#FAF9F5] border border-[#E5E0D8] rounded-lg'>
                    <div className='text-[#78716C] text-[11px]'>Đã khóa Canon</div>
                    <div className='text-base font-bold text-emerald-700 mt-0.5'>
                      {bibleGate?.lockedCount ?? 0}
                    </div>
                  </div>
                  <div className='p-2 bg-[#FAF9F5] border border-[#E5E0D8] rounded-lg'>
                    <div className='text-[#78716C] text-[11px]'>Chờ duyệt / Bản nháp</div>
                    <div className='text-base font-bold text-amber-700 mt-0.5'>
                      {bibleGate?.pendingCount ?? 0}
                    </div>
                  </div>
                </div>

                <p className='text-[#78716C] text-[11px] leading-relaxed'>
                  Trước khi Producer Đóng băng Kịch bản, mọi nhân vật chính và bối cảnh xuất hiện
                  trong chương cần có bản thiết kế Canon được khóa.
                </p>

                {/* Referenced Entries List */}
                <div className='space-y-2 mt-3 pt-3 border-t border-[#E5E0D8]'>
                  <span className='font-semibold text-[#1C1917]'>Thực thể xuất hiện:</span>
                  {!bibleGate?.items || bibleGate.items.length === 0 ? (
                    <p className='text-[#A8A29E] italic py-2'>
                      Không có thực thể Bible nào được liên kết.
                    </p>
                  ) : (
                    <div className='space-y-1.5 max-h-64 overflow-y-auto pr-1'>
                      {bibleGate.items.map((item) => (
                        <div
                          key={item.bibleEntryId}
                          className='p-2 bg-[#FAF9F5] border border-[#E5E0D8] rounded-lg flex items-center justify-between gap-2'
                        >
                          <div>
                            <div className='font-bold text-[#1C1917]'>{item.name}</div>
                            <div className='text-[10px] text-[#78716C] font-mono'>
                              {item.category} · #{item.code}
                            </div>
                          </div>

                          {item.isLocked ? (
                            <span className='px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 bg-emerald-50 rounded border border-emerald-200'>
                              Đã khóa
                            </span>
                          ) : (
                            <span className='px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 bg-amber-50 rounded border border-amber-200'>
                              Chưa khóa
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Logic Check & AI Continuity (F-05) */}
            {activeTab === 'logicCheck' && (
              <div className='p-4 space-y-4 text-xs'>
                <div className='flex items-center justify-between'>
                  <span className='font-bold text-[#1C1917]'>Kết Quả Quét Tính Nhất Quán</span>
                  <button
                    type='button'
                    onClick={handleRunConsistencyCheck}
                    disabled={actionLoading === 'consistency'}
                    className='text-[11px] font-semibold text-[#C2410C] hover:underline cursor-pointer flex items-center gap-1'
                  >
                    <RotateCcw
                      className={`w-3 h-3 ${actionLoading === 'consistency' ? 'animate-spin' : ''}`}
                    />
                    <span>Quét lại</span>
                  </button>
                </div>

                {consistencyFindings.length === 0 ? (
                  <div className='p-6 text-center text-[#78716C]'>
                    <Sparkles className='w-8 h-8 text-[#A8A29E] mx-auto mb-2' />
                    <p>Chưa có cảnh báo Canon nào được phát hiện.</p>
                    <button
                      type='button'
                      onClick={handleRunConsistencyCheck}
                      disabled={actionLoading === 'consistency'}
                      className='mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#C2410C] hover:bg-[#9A3412] cursor-pointer shadow-2xs'
                    >
                      Bắt đầu quét Canon
                    </button>
                  </div>
                ) : (
                  <div className='space-y-3'>
                    <div className='flex items-center justify-between p-2.5 bg-[#FAF9F5] rounded-lg border border-[#E5E0D8]'>
                      <span className='text-[#57534E]'>Số cảnh báo phát hiện:</span>
                      <span className='font-bold text-[#1C1917]'>{consistencyFindings.length}</span>
                    </div>

                    {/* Findings list */}
                    {consistencyFindings.map((f) => (
                      <div
                        key={f.id}
                        className='p-3 bg-[#FAF9F5] border border-[#E5E0D8] rounded-lg space-y-2'
                      >
                        <div className='flex items-center justify-between gap-2'>
                          <span className='font-bold text-rose-700 font-mono text-[11px]'>
                            {f.ruleCode || 'CANON_MISMATCH'}
                          </span>
                          <span className='text-[10px] text-[#78716C] font-mono'>{f.severity}</span>
                        </div>
                        <p className='text-[#1C1917] leading-relaxed'>{f.message}</p>
                        {f.evidence && (
                          <p className='text-[11px] text-[#78716C] italic bg-[#F3F0E9] p-1.5 rounded'>
                            {f.evidence}
                          </p>
                        )}

                        {/* Editor Decision Controls */}
                        <div className='pt-2 border-t border-[#E5E0D8]/60 flex items-center justify-end gap-1.5'>
                          <button
                            type='button'
                            onClick={() => handleDecideFinding(f.id, 'Ignored')}
                            className='px-2 py-0.5 rounded text-[10px] font-semibold text-[#57534E] bg-white hover:bg-[#F3F0E9] border border-[#D8D2C5] cursor-pointer'
                          >
                            Bỏ qua
                          </button>
                          <button
                            type='button'
                            onClick={() => handleDecideFinding(f.id, 'Confirmed')}
                            className='px-2 py-0.5 rounded text-[10px] font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer'
                          >
                            Xác nhận lỗi
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Open Change Requests */}
            {activeTab === 'changeRequests' && (
              <div className='p-4 space-y-4 text-xs'>
                <div className='flex items-center justify-between'>
                  <span className='font-bold text-[#1C1917]'>Yêu Cầu Chỉnh Sửa</span>
                  {canDecide && (
                    <button
                      type='button'
                      onClick={() => handlePromptChangeRequest(scenes[0]?.id || '')}
                      className='inline-flex items-center gap-1 text-[11px] font-semibold text-[#C2410C] hover:underline cursor-pointer'
                    >
                      <MessageSquarePlus className='w-3 h-3' />
                      <span>Tạo mới</span>
                    </button>
                  )}
                </div>

                {changeRequests.length === 0 ? (
                  <p className='text-[#A8A29E] italic text-center py-6'>
                    Không có yêu cầu chỉnh sửa nào đang mở.
                  </p>
                ) : (
                  <div className='space-y-2.5 max-h-96 overflow-y-auto pr-1'>
                    {changeRequests.map((cr) => (
                      <div
                        key={cr.id}
                        className='p-3 bg-[#FAF9F5] border border-[#E5E0D8] rounded-lg space-y-1.5'
                      >
                        <div className='flex items-center justify-between'>
                          <span className='font-bold text-[#1C1917]'>#{cr.id.substring(0, 6)}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                              cr.status === 'Open'
                                ? 'bg-amber-100 text-amber-800'
                                : cr.status === 'Resolved'
                                  ? 'bg-sky-100 text-sky-800'
                                  : cr.status === 'Verified'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {cr.status}
                          </span>
                        </div>
                        <p className='text-[#57534E] leading-relaxed'>{cr.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* Modal: Create Change Request */}
      {showCrModal && (
        <div className='fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-2xs'>
          <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl max-w-lg w-full p-5 space-y-4 shadow-xl'>
            <div className='flex items-center justify-between border-b border-[#E5E0D8] pb-3'>
              <h3 className='text-sm font-serif font-bold text-[#1C1917] flex items-center gap-2'>
                <MessageSquarePlus className='w-4 h-4 text-[#C2410C]' />
                <span>Gửi Yêu Cầu Chỉnh Sửa Kịch Bản</span>
              </h3>
              <button
                type='button'
                onClick={() => setShowCrModal(false)}
                className='text-[#78716C] hover:text-[#1C1917] text-xs cursor-pointer font-bold'
              >
                ✕
              </button>
            </div>

            {crContextText && (
              <div className='p-2.5 bg-[#FAF9F5] border border-[#E5E0D8] rounded-lg text-xs text-[#57534E]'>
                <span className='font-semibold text-[#1C1917]'>Dòng kịch bản tham chiếu: </span>
                <span className='italic'>"{crContextText}"</span>
              </div>
            )}

            <div className='space-y-1.5 text-xs'>
              <label className='font-semibold text-[#1C1917]'>Mức độ ảnh hưởng:</label>
              <div className='flex items-center gap-2'>
                {(['Blocking', 'Warning', 'Info'] as const).map((sev) => (
                  <button
                    key={sev}
                    type='button'
                    onClick={() => setCrSeverity(sev)}
                    className={`px-3 py-1.5 rounded-lg font-semibold border transition-colors cursor-pointer text-xs ${
                      crSeverity === sev
                        ? 'bg-[#1C1917] text-white border-[#1C1917]'
                        : 'bg-[#FAF9F5] text-[#57534E] border-[#D8D2C5] hover:bg-[#F3F0E9]'
                    }`}
                  >
                    {sev === 'Blocking'
                      ? 'Ngăn chặn (Blocking)'
                      : sev === 'Warning'
                        ? 'Cảnh báo'
                        : 'Góp ý'}
                  </button>
                ))}
              </div>
            </div>

            <div className='space-y-1.5 text-xs'>
              <label className='font-semibold text-[#1C1917]'>Nội dung yêu cầu chỉnh sửa:</label>
              <textarea
                value={crReason}
                onChange={(e) => setCrReason(e.target.value)}
                placeholder='Mô tả chi tiết câu chữ cần chỉnh, tình tiết mâu thuẫn hoặc yêu cầu phát triển...'
                rows={4}
                className='w-full p-2.5 bg-[#FAF9F5] border border-[#D8D2C5] rounded-lg text-xs text-[#1C1917] focus:outline-none focus:border-[#C2410C]'
              />
            </div>

            <div className='flex items-center justify-end gap-2 pt-2 border-t border-[#E5E0D8]'>
              <button
                type='button'
                onClick={() => setShowCrModal(false)}
                className='px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#57534E] hover:bg-[#F3F0E9] border border-[#D8D2C5] cursor-pointer'
              >
                Hủy
              </button>
              <button
                type='button'
                onClick={handleSubmitChangeRequest}
                disabled={actionLoading === 'createCr'}
                className='px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-[#C2410C] hover:bg-[#9A3412] cursor-pointer shadow-2xs'
              >
                {actionLoading === 'createCr' ? 'Đang gửi...' : 'Gửi Yêu Cầu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Unfreeze Script Reason */}
      {showUnfreezeModal && (
        <div className='fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-2xs'>
          <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl'>
            <div className='flex items-center justify-between border-b border-[#E5E0D8] pb-3'>
              <h3 className='text-sm font-serif font-bold text-[#1C1917] flex items-center gap-2'>
                <Unlock className='w-4 h-4 text-rose-600' />
                <span>Mở Lại Kịch Bản (Unfreeze)</span>
              </h3>
              <button
                type='button'
                onClick={() => setShowUnfreezeModal(false)}
                className='text-[#78716C] hover:text-[#1C1917] text-xs cursor-pointer font-bold'
              >
                ✕
              </button>
            </div>

            <p className='text-xs text-[#57534E] leading-relaxed'>
              Khi mở lại kịch bản, các công đoạn vẽ tiếp theo (như Storyboard/Thumbnail) có thể bị
              ảnh hưởng nếu câu chuyện thay đổi lớn. Vui lòng ghi rõ lý do.
            </p>

            <div className='space-y-1.5 text-xs'>
              <label className='font-semibold text-[#1C1917]'>Lý do mở lại:</label>
              <textarea
                value={unfreezeReason}
                onChange={(e) => setUnfreezeReason(e.target.value)}
                placeholder='Nhập lý do Producer quyết định mở lại kịch bản...'
                rows={3}
                className='w-full p-2.5 bg-[#FAF9F5] border border-[#D8D2C5] rounded-lg text-xs text-[#1C1917] focus:outline-none focus:border-[#C2410C]'
              />
            </div>

            <div className='flex items-center justify-end gap-2 pt-2 border-t border-[#E5E0D8]'>
              <button
                type='button'
                onClick={() => setShowUnfreezeModal(false)}
                className='px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#57534E] hover:bg-[#F3F0E9] border border-[#D8D2C5] cursor-pointer'
              >
                Hủy
              </button>
              <button
                type='button'
                onClick={handleUnfreezeScript}
                disabled={actionLoading === 'unfreeze'}
                className='px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 cursor-pointer shadow-2xs'
              >
                {actionLoading === 'unfreeze' ? 'Đang mở lại...' : 'Xác Nhận Mở Lại'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
