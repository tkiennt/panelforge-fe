import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Send,
  History,
  Sparkles,
  Play,
  Calendar,
  MessageSquare,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

import { ScriptEditor } from '@/roles/writer/components/ScriptEditor';
import { ArtworkCanvas } from '@/roles/artist/components/ArtworkCanvas';
import { LetteringWorkspace } from '@/roles/letterer/views/LetteringWorkspace';
import { ChapterProvenanceModal } from '@/shared/features/provenance/ChapterProvenanceModal';
import { canViewProvenanceReport } from '@/shared/features/provenance/provenanceRules';
import { KanbanCard, AssignmentDto } from '@/types';
import { assignmentService } from '@/services/assignment.service';

interface TaskEditorProps {
  activeRoles: string[];
  onShowToast: (title: string, desc: string) => void;
  isDevMode?: boolean;
}

export const TaskEditorView: React.FC<TaskEditorProps> = ({
  activeRoles,
  onShowToast,
  isDevMode = false,
}) => {
  const { taskId, workspaceId, seriesId } = useParams<{
    taskId: string;
    workspaceId?: string;
    seriesId?: string;
  }>();
  const [searchParams] = useSearchParams();
  const chapterId = searchParams.get('chapterId') || '';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [assignment, setAssignment] = useState<AssignmentDto | null>(null);
  const [task, setTask] = useState<KanbanCard | null>(null);
  const [taskStatus, setTaskStatus] = useState<string>('Assigned');
  const [showProvenance, setShowProvenance] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (!taskId) return;
    let isMounted = true;

    const loadAssignmentData = async () => {
      setLoading(true);
      try {
        const liveAssignment = await assignmentService.getAssignmentById(
          taskId,
          chapterId || undefined,
          workspaceId || undefined,
        );
        if (!isMounted) return;

        if (liveAssignment) {
          setAssignment(liveAssignment);
          setTaskStatus(String(liveAssignment.status));
          const stageKey = String(liveAssignment.pipelineStageId || '').toLowerCase();
          const detectedStage = stageKey.includes('script')
            ? 'script'
            : stageKey.includes('letter')
              ? 'letter'
              : 'ink';

          setTask({
            id: liveAssignment.id,
            title: liveAssignment.brief || `Nhiệm vụ #${liveAssignment.id.substring(0, 8)}`,
            pageNumber: `Stage ${liveAssignment.pipelineStageId ? liveAssignment.pipelineStageId.substring(0, 4) : 'General'}`,
            stage: detectedStage,
            assignee: liveAssignment.assigneeUserId || 'Thành viên',
            assigneeRole: String(liveAssignment.assignedRole || ''),
            assigneeInitials: 'AU',
            avatarBg: '#E7E7E7',
            pageType: 'Single',
            dueText: liveAssignment.dueDate
              ? new Date(liveAssignment.dueDate).toLocaleDateString('vi-VN')
              : '',
            tags: [],
          });
        } else {
          // Fallback task construct
          setTask({
            id: taskId,
            title: `Task: ${taskId}`,
            pageNumber: 'Page 1',
            stage: taskId.includes('letter')
              ? 'letter'
              : taskId.includes('script')
                ? 'script'
                : 'ink',
            assignee: 'Assigned User',
            assigneeRole: '',
            assigneeInitials: 'AU',
            avatarBg: '#E7E7E7',
            pageType: 'Single',
            dueText: '',
            tags: [],
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadAssignmentData();
    return () => {
      isMounted = false;
    };
  }, [taskId, chapterId, workspaceId]);

  if (loading && !task) {
    return (
      <div className='p-12 text-center text-stone-500 flex flex-col items-center justify-center gap-2'>
        <Loader2 className='w-6 h-6 animate-spin text-orange-500' />
        <span className='text-xs font-mono'>Đang tải dữ liệu Task từ Live API...</span>
      </div>
    );
  }

  if (!task) {
    return (
      <div className='p-8 text-center text-[#737373] text-xs font-mono'>
        Không tìm thấy dữ liệu Task.
      </div>
    );
  }

  // RBAC Permission Check (Dev Mode overrides active roles to allow editing all stages)
  const isWriter =
    isDevMode || activeRoles.includes('WRITER') || activeRoles.includes('ADMINISTRATOR');
  const isArtist =
    isDevMode || activeRoles.includes('ARTIST') || activeRoles.includes('ADMINISTRATOR');
  const isLetterer =
    isDevMode || activeRoles.includes('LETTERER') || activeRoles.includes('ADMINISTRATOR');

  const renderStageComponent = () => {
    switch (task.stage) {
      case 'script':
        return (
          <ScriptEditor
            isReadOnly={!isWriter}
            onAIBreakdown={() =>
              isWriter ? onShowToast('AI Breakdown', 'Đang phân tích kịch bản...') : null
            }
          />
        );
      case 'thumbnail':
      case 'pencil':
      case 'ink':
      case 'color':
        return <ArtworkCanvas isReadOnly={!isArtist} />;
      case 'letter':
        return <LetteringWorkspace isReadOnly={!isLetterer} />;
      case 'review':
      case 'approved':
        return (
          <div className='flex-1 flex flex-col items-center justify-center text-[#737373]'>
            <p>Task đang ở trạng thái {task.stage}.</p>
            <button
              onClick={() => navigate(`/review/${task.id}`)}
              className='mt-4 px-4 py-2 bg-[#171717] text-white rounded font-bold'
            >
              Chuyển tới màn hình Review
            </button>
          </div>
        );
      default:
        return <div className='p-8'>Invalid Stage: {task.stage}</div>;
    }
  };

  const canEdit =
    (task.stage === 'script' && isWriter) ||
    (['thumbnail', 'pencil', 'ink', 'color'].includes(task.stage) && isArtist) ||
    (task.stage === 'letter' && isLetterer);

  const handleStartWork = async () => {
    setIsTransitioning(true);
    try {
      if (chapterId && taskId) {
        await assignmentService.startAssignment(chapterId, taskId);
      }
      setTaskStatus('InProgress');
      onShowToast('Bắt đầu làm việc', 'Nhiệm vụ đã chuyển sang trạng thái InProgress.');
    } catch (err: any) {
      onShowToast('Không thể bắt đầu', err.message || 'Lỗi bắt đầu công việc.');
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (taskStatus === 'Assigned') {
      onShowToast(
        'Cảnh báo quy trình (BR-19)',
        'Phải bấm "Bắt đầu làm" (InProgress) trước khi nộp để tránh lỗi 409 Conflict!',
      );
      return;
    }
    setIsTransitioning(true);
    try {
      if (chapterId && taskId) {
        await assignmentService.submitAssignment(chapterId, taskId);
      }
      setTaskStatus('Submitted');
      onShowToast('Đã nộp bài', 'Nhiệm vụ đã được gửi tới Editor để xét duyệt.');
      navigate(-1);
    } catch (err: any) {
      onShowToast('Không thể nộp bài', err.message || 'Lỗi nộp bài.');
    } finally {
      setIsTransitioning(false);
    }
  };

  return (
    <div className='w-full h-full flex flex-col bg-[#F3F0E9] overflow-hidden'>
      {/* HEADER */}
      <div className='shrink-0 h-16 bg-[#FCFBF8] border-b border-[#D8D2C5] px-6 flex items-center justify-between z-10 shadow-2xs'>
        <div className='flex items-center gap-4'>
          <button
            onClick={() => navigate(-1)}
            className='w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F3F0E9] text-[#57534E] hover:text-[#1C1917] transition-colors cursor-pointer'
          >
            <ArrowLeft className='w-4 h-4' />
          </button>
          <div>
            <h2 className='text-sm font-bold font-serif text-[#1C1917]'>
              {task.title} - {task.pageNumber}
            </h2>
            <div className='flex items-center gap-2 text-xs font-mono text-[#57534E] mt-0.5'>
              <span className='font-bold uppercase tracking-wider text-[#C2410C]'>
                Stage: {task.stage}
              </span>
              <span>•</span>
              <span>Người làm: {task.assignee}</span>
              {task.dueText && (
                <>
                  <span>•</span>
                  <span className='flex items-center gap-1 text-[#1C1917] font-semibold'>
                    <Calendar className='w-3 h-3 text-[#57534E]' /> Hạn: {task.dueText}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className='flex items-center gap-3'>
          {seriesId && chapterId && (
            <button
              type='button'
              onClick={() => setShowProvenance(true)}
              className='px-3 py-1.5 flex items-center gap-1.5 border border-[#D8D2C5] bg-[#FCFBF8] rounded-lg text-xs font-semibold text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3F0E9] cursor-pointer transition-colors shadow-2xs'
            >
              <History className='w-4 h-4 text-[#C2410C]' /> Lịch sử &amp; nguồn gốc
            </button>
          )}

          {canEdit && (
            <>
              {(taskStatus === 'Assigned' || taskStatus === 'ReworkRequired') && (
                <button
                  disabled={isTransitioning}
                  onClick={handleStartWork}
                  className='px-3.5 py-1.5 flex items-center gap-1.5 bg-[#FFF2E6] border border-[#FDBA74] text-[#C2410C] text-xs font-bold rounded-lg hover:bg-[#FDBA74]/30 transition-colors shadow-2xs cursor-pointer disabled:opacity-50'
                  title='Bắt đầu làm việc (InProgress) trước khi nộp bài'
                >
                  {isTransitioning ? (
                    <Loader2 className='w-3.5 h-3.5 animate-spin' />
                  ) : (
                    <Play className='w-3.5 h-3.5 text-[#C2410C]' />
                  )}
                  <span>{taskStatus === 'ReworkRequired' ? 'Bắt đầu sửa lại' : 'Bắt đầu làm'}</span>
                </button>
              )}
              <button
                onClick={() => onShowToast('Lưu bản nháp', 'Đã lưu thay đổi.')}
                className='px-4 py-1.5 flex items-center gap-1.5 bg-[#FCFBF8] border border-[#D8D2C5] text-[#1C1917] text-xs font-bold rounded-lg hover:bg-[#F3F0E9] transition-colors cursor-pointer shadow-2xs'
              >
                <Save className='w-3.5 h-3.5' /> Lưu nháp
              </button>
              <button
                disabled={isTransitioning}
                onClick={handleSubmitForReview}
                className='px-4 py-1.5 flex items-center gap-1.5 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 bg-[#F97316] hover:bg-[#EA580C] shadow-soft-sm active:scale-95'
                title={
                  taskStatus === 'Assigned'
                    ? 'Cần bắt đầu làm trước khi nộp bài'
                    : 'Nộp bài để chuyển sang xét duyệt Review'
                }
              >
                {isTransitioning ? (
                  <Loader2 className='w-3.5 h-3.5 animate-spin' />
                ) : (
                  <Send className='w-3.5 h-3.5' />
                )}
                <span>Nộp duyệt (Submit for Review)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editor Feedback Banner if Rework Required */}
      {assignment?.lastFeedbackComment && taskStatus === 'ReworkRequired' && (
        <div className='bg-red-50 border-b border-red-200 px-6 py-2.5 flex items-center gap-2 text-xs text-red-800 animate-in fade-in duration-150'>
          <AlertTriangle className='w-4 h-4 text-red-600 shrink-0' />
          <span className='font-bold'>Yêu cầu sửa từ Editor:</span>
          <span className='font-serif italic text-red-900'>"{assignment.lastFeedbackComment}"</span>
        </div>
      )}

      {/* RENDER KHUNG LÀM VIỆC ĐỘNG THEO STAGE & ROLE */}
      <div className='flex-1 flex overflow-hidden'>{renderStageComponent()}</div>

      {/* MODALS */}
      {showProvenance && seriesId && chapterId && (
        <ChapterProvenanceModal
          seriesId={seriesId}
          chapterId={chapterId}
          // Tab Provenance Report chỉ cho Producer/Editor (BE vẫn kiểm quyền thật)
          viewerRole={activeRoles.find((r) => canViewProvenanceReport(r)) ?? activeRoles[0]}
          onClose={() => setShowProvenance(false)}
        />
      )}
    </div>
  );
};

export const TaskEditor = TaskEditorView;
