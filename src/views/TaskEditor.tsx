import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOCK_CARDS, PipelineCard } from '../data/mockPipelineData';
import { ScriptEditor } from '../components/task-editor/ScriptEditor';
import { ArtworkCanvas } from '../components/task-editor/ArtworkCanvas';
import { LetteringWorkspace } from '../components/task-editor/LetteringWorkspace';
import { Save, Send, ArrowLeft } from 'lucide-react';
import { SystemRole } from '../types';

interface TaskEditorProps {
  activeRoles?: SystemRole[];
  onShowToast?: (title: string, desc: string) => void;
}

export const TaskEditor: React.FC<TaskEditorProps> = ({
  activeRoles,
  onShowToast
}) => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<PipelineCard | null>(null);

  useEffect(() => {
    // 1. Fetch dữ liệu của task dựa vào taskId
    if (taskId) {
      const foundTask = MOCK_CARDS.find(c => c.id === taskId);
      setTask(foundTask || null);
    }
  }, [taskId]);

  if (!task) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#FAF8F4]">
        <p className="text-[#A3A3A3]">Đang tải dữ liệu Task...</p>
      </div>
    );
  }

  // 2. Dùng Switch-Case (hoặc Strategy pattern) để render component con
  const renderWorkspace = () => {
    const stage = task.stage.toUpperCase(); // 'SCRIPT', 'THUMBNAIL', 'PENCIL', etc.

    switch (stage) {
      case 'SCRIPT':
        return <ScriptEditor />;
      
      case 'THUMBNAIL':
      case 'PENCIL':
      case 'INK':
      case 'COLOR':
        return <ArtworkCanvas />;
      
      case 'LETTER':
        return <LetteringWorkspace />;
      
      default:
        // REVIEW hoặc APPROVED có thể dùng chung UI xem trước hoặc ArtworkCanvas read-only
        return (
          <div className="flex-1 flex items-center justify-center text-[#737373]">
            Không có workspace riêng cho stage: {stage}
          </div>
        );
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#FAF8F4] overflow-hidden">
      {/* 3. Header cố định */}
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
              {task.identifier} - {task.title}
            </h2>
            <p className="text-[10px] text-[#A3A3A3] uppercase tracking-wider font-bold">
              Stage: {task.stage}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => onShowToast?.("Saved", "Đã lưu nháp công việc.")}
            className="px-4 py-2 flex items-center gap-2 bg-[#F3F3F3] text-[#171717] text-xs font-bold uppercase rounded hover:bg-[#E7E7E7] transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </button>
          <button 
            onClick={() => onShowToast?.("Submitted", "Đã gửi yêu cầu Review.")}
            className="px-4 py-2 flex items-center gap-2 bg-[#171717] text-white text-xs font-bold uppercase rounded hover:bg-[#404040] transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            Submit for Review
          </button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden p-6">
        {renderWorkspace()}
      </div>
    </div>
  );
};
