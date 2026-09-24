import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Send, History, Sparkles } from 'lucide-react';

import { ScriptEditor } from '../components/task-editor/ScriptEditor';
import { ArtworkCanvas } from '../components/task-editor/ArtworkCanvas';
import { LetteringWorkspace } from '../components/task-editor/LetteringWorkspace';
import { VersionHistoryModal, AIProvenanceModal } from '../components/modals/ProvenanceModals';
import { KanbanCard, SystemRole } from '../types';
import { INITIAL_KANBAN_CARDS } from '../data/mockData';

interface TaskEditorProps {
  activeRoles: SystemRole[];
  onShowToast: (title: string, desc: string) => void;
  isDevMode?: boolean;
}

export const TaskEditor: React.FC<TaskEditorProps> = ({ activeRoles, onShowToast, isDevMode = false }) => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  
  const [task, setTask] = useState<KanbanCard | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showAIProvenance, setShowAIProvenance] = useState(false);

  useEffect(() => {
    if (taskId) {
      // Mock fetch
      const found = INITIAL_KANBAN_CARDS.find(c => c.id === taskId);
      if (found) {
        setTask(found);
      } else {
        // Fallback for unknown IDs to allow UI testing
        setTask({
          id: taskId,
          title: `Demo Task: ${taskId}`,
          projectId: 'cyberpunk-2077',
          stage: taskId.includes('letter') ? 'LETTER' : taskId.includes('script') ? 'SCRIPT' : 'INK',
          assignee: { name: 'Test User', avatarUrl: '' },
          dueDate: new Date().toISOString(),
          priority: 'HIGH'
        });
      }
    }
  }, [taskId]);

  if (!task) {
    return <div className="p-8 text-center text-[#737373]">Đang tải dữ liệu Task...</div>;
  }

  // RBAC Permission Check (Dev Mode overrides active roles to allow editing all stages)
  const isWriter = isDevMode || activeRoles.includes('WRITER') || activeRoles.includes('ADMINISTRATOR');
  const isArtist = isDevMode || activeRoles.includes('ARTIST') || activeRoles.includes('ADMINISTRATOR');
  const isLetterer = isDevMode || activeRoles.includes('LETTERER') || activeRoles.includes('ADMINISTRATOR');

  const renderStageComponent = () => {
    switch (task.stage) {
      case 'script':
        return (
          <ScriptEditor 
             isReadOnly={!isWriter} 
             onAIBreakdown={() => isWriter ? onShowToast("AI Breakdown", "Đang phân tích kịch bản...") : null} 
          />
        );
      case 'thumbnail':
      case 'pencil':
      case 'ink':
      case 'color':
        return (
          <ArtworkCanvas 
             isReadOnly={!isArtist} 
          />
        );
      case 'letter':
        return (
          <LetteringWorkspace 
             isReadOnly={!isLetterer} 
          />
        );
      case 'review':
      case 'approved':
        return (
          <div className="flex-1 flex flex-col items-center justify-center text-[#737373]">
            <p>Task đang ở trạng thái {task.stage}.</p>
            <button onClick={() => navigate(`/review/${task.id}`)} className="mt-4 px-4 py-2 bg-[#171717] text-white rounded font-bold">Chuyển tới màn hình Review</button>
          </div>
        );
      default:
        return <div className="p-8">Invalid Stage: {task.stage}</div>;
    }
  };

  const canEdit = (task.stage === 'script' && isWriter) || 
                  (['thumbnail', 'pencil', 'ink', 'color'].includes(task.stage) && isArtist) || 
                  (task.stage === 'letter' && isLetterer);

  return (
    <div className="w-full h-full flex flex-col bg-[#FAF8F4] overflow-hidden">
      {/* HEADER */}
      <div className="shrink-0 h-16 bg-white border-b border-[#E7E7E7] px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F3F3F3] text-[#737373] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-sm font-bold text-[#171717]">
              {task.title} - {task.pageNumber}
            </h2>
            <p className="text-[10px] text-[#A3A3A3] uppercase tracking-wider font-bold">
              Stage: {task.stage} | Assignee: {task.assignee}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setShowVersionHistory(true)}
             className="px-3 py-1.5 flex items-center gap-1.5 border border-[#D4D4D4] rounded text-sm text-[#555555] hover:bg-[#F3F3F3]"
           >
             <History className="w-4 h-4" /> Version History
           </button>
           <button 
             onClick={() => setShowAIProvenance(true)}
             className="px-3 py-1.5 flex items-center gap-1.5 border border-[#DDD6FE] bg-[#F5F3FF] rounded text-sm text-[#8B5CF6] hover:bg-[#EDE9FE]"
           >
             <Sparkles className="w-4 h-4" /> AI Provenance
           </button>
           
           {canEdit && (
             <>
               <button 
                 onClick={() => onShowToast('Lưu bản nháp', 'Đã lưu thay đổi.')}
                 className="px-4 py-1.5 flex items-center gap-1.5 bg-[#F3F3F3] border border-[#D4D4D4] text-[#171717] text-sm font-bold rounded hover:bg-[#E7E7E7]"
               >
                 <Save className="w-4 h-4" /> Save
               </button>
               <button 
                 onClick={() => {
                   onShowToast('Đã gửi', 'Đã chuyển task sang bước tiếp theo để Review.');
                   navigate(-1);
                 }}
                 className="px-4 py-1.5 flex items-center gap-1.5 bg-[#171717] text-white text-sm font-bold rounded hover:bg-black transition-colors"
               >
                 <Send className="w-4 h-4" /> Submit for Review
               </button>
             </>
           )}
        </div>
      </div>

      {/* RENDER KHUNG LÀM VIỆC ĐỘNG THEO STAGE & ROLE */}
      <div className="flex-1 flex overflow-hidden">
        {renderStageComponent()}
      </div>

      {/* MODALS */}
      <VersionHistoryModal isOpen={showVersionHistory} onClose={() => setShowVersionHistory(false)} />
      <AIProvenanceModal isOpen={showAIProvenance} onClose={() => setShowAIProvenance(false)} />
    </div>
  );
};
