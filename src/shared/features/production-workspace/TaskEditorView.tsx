import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
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

import { ArtworkCanvas } from '@/roles/artist/components/ArtworkCanvas';
import { ChapterProvenanceModal } from '@/shared/features/provenance/ChapterProvenanceModal';
import { canViewProvenanceReport } from '@/shared/features/provenance/provenanceRules';
import { KanbanCard, AssignmentDto } from '@/types';
import { assignmentService } from '@/services/assignment.service';
import { buildArtistDeskUrl, buildScriptEditorUrl, buildTaskReviewUrl } from '@/app/routePaths';

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
  const { t, lang } = useTranslation('features');
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

          const effectiveChapterId = chapterId || liveAssignment.chapterId || '';
          if (workspaceId && seriesId) {
            if (detectedStage === 'script') {
              navigate(
                buildScriptEditorUrl(workspaceId, seriesId, {
                  chapterId: effectiveChapterId || undefined,
                  assignmentId: liveAssignment.id,
                }),
                { replace: true },
              );
              return;
            }
            if (detectedStage === 'letter') {
              navigate(
                buildArtistDeskUrl(workspaceId, seriesId, {
                  chapterId: effectiveChapterId || undefined,
                  assignmentId: liveAssignment.id,
                  tab: 'lettering',
                }),
                { replace: true },
              );
              return;
            }
          }

          setTask({
            id: liveAssignment.id,
            title:
              liveAssignment.brief ||
              t('productionWorkspace.taskEditor.taskNumberTitle', {
                id: liveAssignment.id.substring(0, 8),
              }),
            pageNumber: `Stage ${liveAssignment.pipelineStageId ? liveAssignment.pipelineStageId.substring(0, 4) : 'General'}`,
            stage: detectedStage,
            assignee:
              liveAssignment.assigneeUserId || t('productionWorkspace.taskEditor.memberFallback'),
            assigneeRole: String(liveAssignment.assignedRole || ''),
            assigneeInitials: 'AU',
            avatarBg: '#E7E7E7',
            pageType: 'Single',
            dueText: liveAssignment.dueDate
              ? new Date(liveAssignment.dueDate).toLocaleDateString(
                  lang === 'en' ? 'en-US' : 'vi-VN',
                )
              : '',
            tags: [],
          });
        } else {
          // Fallback task construct
          const fallbackStage = taskId.includes('letter')
            ? 'letter'
            : taskId.includes('script')
              ? 'script'
              : 'ink';

          if (workspaceId && seriesId) {
            if (fallbackStage === 'script') {
              navigate(
                buildScriptEditorUrl(workspaceId, seriesId, {
                  chapterId: chapterId || undefined,
                  assignmentId: taskId,
                }),
                { replace: true },
              );
              return;
            }
            if (fallbackStage === 'letter') {
              navigate(
                buildArtistDeskUrl(workspaceId, seriesId, {
                  chapterId: chapterId || undefined,
                  assignmentId: taskId,
                  tab: 'lettering',
                }),
                { replace: true },
              );
              return;
            }
          }

          setTask({
            id: taskId,
            title: `Task: ${taskId}`,
            pageNumber: 'Page 1',
            stage: fallbackStage,
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
  }, [taskId, chapterId, workspaceId, seriesId, navigate, t, lang]);

  if (loading && !task) {
    return (
      <div className='p-12 text-center text-stone-500 flex flex-col items-center justify-center gap-2'>
        <Loader2 className='w-6 h-6 animate-spin text-orange-500' />
        <span className='text-xs font-mono'>
          {t('productionWorkspace.taskEditor.loadingLiveApi')}
        </span>
      </div>
    );
  }

  if (!task) {
    return (
      <div className='p-8 text-center text-[#737373] text-xs font-mono'>
        {t('productionWorkspace.taskEditor.notFound')}
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
          <div className='flex-1 flex flex-col items-center justify-center p-8 text-stone-600 gap-3'>
            <p className='text-sm'>{t('productionWorkspace.taskEditor.scriptInEditorNote')}</p>
            {workspaceId && seriesId && (
              <button
                onClick={() =>
                  navigate(
                    buildScriptEditorUrl(workspaceId, seriesId, {
                      chapterId: chapterId || undefined,
                      assignmentId: task.id,
                    }),
                  )
                }
                className='px-4 py-2 bg-[#EA580C] text-white rounded font-medium text-xs hover:bg-[#C2410C] transition-colors cursor-pointer'
              >
                {t('productionWorkspace.taskEditor.openScriptEditor')}
              </button>
            )}
          </div>
        );
      case 'pencil':
      case 'ink':
      case 'color':
        return <ArtworkCanvas isReadOnly={!isArtist} />;
      case 'letter':
        return (
          <div className='flex-1 flex flex-col items-center justify-center p-8 text-stone-600 gap-3'>
            <p className='text-sm'>{t('productionWorkspace.taskEditor.letteringInDeskNote')}</p>
            {workspaceId && seriesId && (
              <button
                onClick={() =>
                  navigate(
                    buildArtistDeskUrl(workspaceId, seriesId, {
                      chapterId: chapterId || undefined,
                      assignmentId: task.id,
                      tab: 'lettering',
                    }),
                  )
                }
                className='px-4 py-2 bg-[#EA580C] text-white rounded font-medium text-xs hover:bg-[#C2410C] transition-colors cursor-pointer'
              >
                {t('productionWorkspace.taskEditor.openArtistDeskLettering')}
              </button>
            )}
          </div>
        );
      case 'review':
      case 'approved':
        return (
          <div className='flex-1 flex flex-col items-center justify-center text-[#737373]'>
            <p>{t('productionWorkspace.taskEditor.taskInStatusNote', { stage: task.stage })}</p>
            <button
              onClick={() => {
                if (workspaceId && seriesId) {
                  navigate(buildTaskReviewUrl(workspaceId, seriesId, task.id));
                } else {
                  navigate(`/review/${task.id}`);
                }
              }}
              className='mt-4 px-4 py-2 bg-[#171717] text-white rounded font-bold'
            >
              {t('productionWorkspace.taskEditor.goToReview')}
            </button>
          </div>
        );
      default:
        return <div className='p-8'>Invalid Stage: {task.stage}</div>;
    }
  };

  const canEdit =
    (task.stage === 'script' && isWriter) ||
    (['pencil', 'ink', 'color'].includes(task.stage) && isArtist) ||
    (task.stage === 'letter' && isLetterer);

  const handleStartWork = async () => {
    setIsTransitioning(true);
    try {
      if (chapterId && taskId) {
        await assignmentService.startAssignment(chapterId, taskId);
      }
      setTaskStatus('InProgress');
      onShowToast(
        t('productionWorkspace.taskEditor.startWorkToastTitle'),
        t('productionWorkspace.taskEditor.startWorkToastDesc'),
      );
    } catch (err: any) {
      onShowToast(
        t('productionWorkspace.taskEditor.startWorkErrorTitle'),
        err.message || t('productionWorkspace.taskEditor.startWorkErrorDesc'),
      );
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (taskStatus === 'Assigned') {
      onShowToast(
        t('productionWorkspace.taskEditor.submitBr19Title'),
        t('productionWorkspace.taskEditor.submitBr19Desc'),
      );
      return;
    }
    setIsTransitioning(true);
    try {
      if (chapterId && taskId) {
        await assignmentService.submitAssignment(chapterId, taskId);
      }
      setTaskStatus('Submitted');
      onShowToast(
        t('productionWorkspace.taskEditor.submittedToastTitle'),
        t('productionWorkspace.taskEditor.submittedToastDesc'),
      );
      navigate(-1);
    } catch (err: any) {
      onShowToast(
        t('productionWorkspace.taskEditor.submitErrorTitle'),
        err.message || t('productionWorkspace.taskEditor.submitErrorDesc'),
      );
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
              <span>
                {t('productionWorkspace.taskEditor.assigneeLabel', { name: task.assignee })}
              </span>
              {task.dueText && (
                <>
                  <span>•</span>
                  <span className='flex items-center gap-1 text-[#1C1917] font-semibold'>
                    <Calendar className='w-3 h-3 text-[#57534E]' />{' '}
                    {t('productionWorkspace.taskEditor.dueLabel', { date: task.dueText })}
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
              <History className='w-4 h-4 text-[#C2410C]' />{' '}
              {t('productionWorkspace.taskEditor.historyProvenance')}
            </button>
          )}

          {canEdit && (
            <>
              {(taskStatus === 'Assigned' || taskStatus === 'ReworkRequired') && (
                <button
                  disabled={isTransitioning}
                  onClick={handleStartWork}
                  className='px-3.5 py-1.5 flex items-center gap-1.5 bg-[#FFF2E6] border border-[#FDBA74] text-[#C2410C] text-xs font-bold rounded-lg hover:bg-[#FDBA74]/30 transition-colors shadow-2xs cursor-pointer disabled:opacity-50'
                  title={t('productionWorkspace.taskEditor.startWorkTooltip')}
                >
                  {isTransitioning ? (
                    <Loader2 className='w-3.5 h-3.5 animate-spin' />
                  ) : (
                    <Play className='w-3.5 h-3.5 text-[#C2410C]' />
                  )}
                  <span>
                    {taskStatus === 'ReworkRequired'
                      ? t('productionWorkspace.taskEditor.startReworkBtn')
                      : t('productionWorkspace.taskEditor.startWorkBtn')}
                  </span>
                </button>
              )}
              <button
                onClick={() =>
                  onShowToast(
                    t('productionWorkspace.taskEditor.saveDraftToastTitle'),
                    t('productionWorkspace.taskEditor.saveDraftToastDesc'),
                  )
                }
                className='px-4 py-1.5 flex items-center gap-1.5 bg-[#FCFBF8] border border-[#D8D2C5] text-[#1C1917] text-xs font-bold rounded-lg hover:bg-[#F3F0E9] transition-colors cursor-pointer shadow-2xs'
              >
                <Save className='w-3.5 h-3.5' /> {t('productionWorkspace.taskEditor.saveDraftBtn')}
              </button>
              <button
                disabled={isTransitioning}
                onClick={handleSubmitForReview}
                className='px-4 py-1.5 flex items-center gap-1.5 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 bg-[#F97316] hover:bg-[#EA580C] shadow-soft-sm active:scale-95'
                title={
                  taskStatus === 'Assigned'
                    ? t('productionWorkspace.taskEditor.submitDisabledTooltip')
                    : t('productionWorkspace.taskEditor.submitTooltip')
                }
              >
                {isTransitioning ? (
                  <Loader2 className='w-3.5 h-3.5 animate-spin' />
                ) : (
                  <Send className='w-3.5 h-3.5' />
                )}
                <span>{t('productionWorkspace.taskEditor.submitBtn')}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editor Feedback Banner if Rework Required */}
      {assignment?.lastFeedbackComment && taskStatus === 'ReworkRequired' && (
        <div className='bg-red-50 border-b border-red-200 px-6 py-2.5 flex items-center gap-2 text-xs text-red-800 animate-in fade-in duration-150'>
          <AlertTriangle className='w-4 h-4 text-red-600 shrink-0' />
          <span className='font-bold'>
            {t('productionWorkspace.taskEditor.editorFeedbackLabel')}
          </span>
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
