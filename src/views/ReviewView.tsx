import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MessageSquare, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  MinusCircle, 
  GitPullRequest,
  MapPin,
  Play,
  Unlock,
  History
} from 'lucide-react';
import { SystemRole } from '../types';
import { VersionHistoryModal, AIProvenanceModal } from '../components/modals/ProvenanceModals';

interface Annotation {
  id: string;
  x: number;
  y: number;
  content: string;
  author: string;
}

interface Finding {
  id: string;
  message: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'IGNORED';
}

interface ReviewViewProps {
  activeRoles?: SystemRole[];
  onShowToast?: (title: string, desc: string) => void;
  isDevMode?: boolean;
}

export const ReviewView: React.FC<ReviewViewProps> = ({ activeRoles = ['READER'], onShowToast, isDevMode = false }) => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'comments' | 'ai'>('comments');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isAiRunning, setIsAiRunning] = useState(false);
  const [findings, setFindings] = useState<Finding[]>([]);
  
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showAIProvenance, setShowAIProvenance] = useState(false);

  const isEditor = isDevMode || activeRoles.includes('EDITOR') || activeRoles.includes('ADMINISTRATOR') || activeRoles.includes('PRODUCER');
  const isProducer = isDevMode || activeRoles.includes('PRODUCER') || activeRoles.includes('ADMINISTRATOR');

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditor) return; // Chỉ Editor được comment
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const newAnnotation: Annotation = {
      id: `ann-${Date.now()}`,
      x,
      y,
      content: 'Bình luận mới (Draft)',
      author: 'Editor / Reviewer'
    };
    setAnnotations(prev => [...prev, newAnnotation]);
  };

  const handleRunAi = () => {
    setIsAiRunning(true);
    setTimeout(() => {
      setIsAiRunning(false);
      setFindings([
        { id: 'f1', message: 'Inconsistent shading on Akira\'s jacket compared to previous panels.', status: 'PENDING' },
        { id: 'f2', message: 'Missing tone on the background building.', status: 'PENDING' }
      ]);
    }, 2000);
  };

  const updateFindingStatus = (id: string, newStatus: Finding['status']) => {
    setFindings(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
  };

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
              Task: {taskId || 'Unknown'} - Unified Review Board
            </h2>
            <p className="text-[10px] text-[#A3A3A3] uppercase tracking-wider font-bold">
              So sánh và kiểm duyệt
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowVersionHistory(true)}
            className="px-3 py-1.5 flex items-center gap-1.5 border border-[#D4D4D4] rounded text-sm text-[#555555] hover:bg-[#F3F3F3]"
          >
            <History className="w-4 h-4" /> History
          </button>
          <button 
            onClick={() => setShowAIProvenance(true)}
            className="px-3 py-1.5 flex items-center gap-1.5 border border-[#DDD6FE] bg-[#F5F3FF] rounded text-sm text-[#8B5CF6] hover:bg-[#EDE9FE]"
          >
            <Sparkles className="w-4 h-4" /> AI Provenance
          </button>

          {isProducer && (
            <button 
              onClick={() => onShowToast?.('Rollback', 'Tiến trình đã được mở khóa và quay về bước trước.')}
              className="px-3 py-1.5 flex items-center gap-1.5 bg-[#FEF2F2] border border-[#FCA5A5] text-[#EF4444] text-sm font-bold rounded hover:bg-[#FEE2E2]"
            >
              <Unlock className="w-4 h-4" /> Workflow Rollback
            </button>
          )}

          {isEditor && (
            <button 
              onClick={() => {
                onShowToast?.('Approved', 'Bản thảo đã được duyệt thành công.');
                navigate(-1);
              }}
              className="px-4 py-1.5 flex items-center gap-1.5 bg-[#171717] text-white text-sm font-bold rounded hover:bg-black transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" /> Approve
            </button>
          )}
        </div>
      </div>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* SPLIT VIEW AREA */}
        <div className="flex-1 flex">
          {/* Previous Version Viewer */}
          <div className="flex-1 border-r border-[#E7E7E7] bg-[#F3F3F3] flex flex-col">
            <div className="p-3 bg-white border-b border-[#E7E7E7] text-center font-bold text-xs text-[#737373] uppercase tracking-wider">
              Previous Version
            </div>
            <div className="flex-1 p-6 flex items-center justify-center overflow-auto relative">
              <div className="w-full max-w-[400px] aspect-[2/3] bg-white border border-[#D4D4D4] shadow-sm flex items-center justify-center text-[#A3A3A3] flex-col gap-2">
                <span className="font-mono text-sm">v1.2 - Yesterday</span>
                <div className="w-24 h-32 border-2 border-dashed border-[#E7E7E7] opacity-50"></div>
              </div>
            </div>
          </div>

          {/* Current Version Viewer */}
          <div className="flex-1 bg-[#F3F3F3] flex flex-col relative">
            <div className="p-3 bg-white border-b border-[#E7E7E7] text-center font-bold text-xs text-[#F97316] uppercase tracking-wider">
              Current Version (Latest)
            </div>
            <div className="flex-1 p-6 flex items-center justify-center overflow-auto relative">
              <div 
                className={`w-full max-w-[400px] aspect-[2/3] bg-white border-2 border-[#171717] shadow-xl relative ${isEditor ? 'cursor-crosshair' : ''}`}
                onClick={handleImageClick}
              >
                <div className="absolute inset-0 flex items-center justify-center text-[#737373] flex-col gap-2 pointer-events-none">
                  <span className="font-mono text-sm font-bold">v1.3 - Pending Review</span>
                  <p className="text-xs">{isEditor ? 'Click để thả ghim (Drop Annotation)' : 'Read-Only Mode'}</p>
                </div>

                {annotations.map(ann => (
                  <div 
                    key={ann.id}
                    className="absolute w-6 h-6 -ml-3 -mt-3 bg-[#F97316] text-white rounded-full flex items-center justify-center shadow-md animate-in zoom-in"
                    style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
                    title={ann.content}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="w-[380px] shrink-0 bg-white border-l border-[#E7E7E7] flex flex-col h-full z-10">
          <div className="flex border-b border-[#E7E7E7]">
            <button
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'comments' ? 'text-[#171717] border-b-2 border-[#171717]' : 'text-[#A3A3A3] hover:text-[#171717] bg-[#FAF8F4]'
              }`}
              onClick={() => setActiveTab('comments')}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Comments ({annotations.length})
            </button>
            <button
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'ai' ? 'text-[#8B5CF6] border-b-2 border-[#8B5CF6]' : 'text-[#A3A3A3] hover:text-[#8B5CF6] bg-[#FAF8F4]'
              }`}
              onClick={() => setActiveTab('ai')}
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Consistency Check
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {activeTab === 'comments' && (
              <div className="space-y-4">
                {annotations.length === 0 ? (
                  <div className="text-center text-[#A3A3A3] text-sm py-10">
                    Chưa có bình luận nào.<br/>{isEditor ? 'Click vào bản vẽ hiện tại để thả ghim.' : ''}
                  </div>
                ) : (
                  annotations.map((ann, idx) => (
                    <div key={ann.id} className="p-3 border border-[#E7E7E7] rounded-lg bg-[#FAF8F4]">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-[#F97316] text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </div>
                        <span className="text-xs font-bold text-[#171717]">{ann.author}</span>
                      </div>
                      <textarea 
                        className="w-full h-16 p-2 text-sm border border-[#D4D4D4] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#171717]"
                        defaultValue={ann.content}
                        readOnly={!isEditor}
                      />
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-6">
                {isEditor && (
                  <button
                    onClick={handleRunAi}
                    disabled={isAiRunning}
                    className="w-full py-2.5 flex items-center justify-center gap-2 bg-[#F5F3FF] text-[#8B5CF6] text-sm font-bold border border-[#DDD6FE] rounded-lg hover:bg-[#EDE9FE] transition-colors disabled:opacity-50"
                  >
                    {isAiRunning ? (
                      <span className="animate-pulse">Đang quét (Scanning)...</span>
                    ) : (
                      <>
                        <Play className="w-4 h-4" /> Run Consistency Check
                      </>
                    )}
                  </button>
                )}

                {findings.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-[#737373] uppercase border-b border-[#E7E7E7] pb-2">Findings ({findings.length})</h4>
                    {findings.map(f => (
                      <div key={f.id} className="p-3 border border-[#E7E7E7] rounded-lg bg-white shadow-sm space-y-3">
                        <p className="text-sm text-[#171717]">{f.message}</p>
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                            f.status === 'PENDING' ? 'bg-[#F3F3F3] text-[#737373]' :
                            f.status === 'CONFIRMED' ? 'bg-[#ECFCCB] text-[#65A30D]' :
                            f.status === 'REJECTED' ? 'bg-[#FEE2E2] text-[#EF4444]' :
                            'bg-[#E0E7FF] text-[#4F46E5]'
                          }`}>
                            {f.status}
                          </span>
                        </div>
                        {/* Triage Actions */}
                        {isEditor && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-[#E7E7E7]">
                            <button 
                              onClick={() => updateFindingStatus(f.id, 'CONFIRMED')}
                              className="p-1.5 hover:bg-[#ECFCCB] text-[#65A30D] rounded transition-colors" title="Confirmed"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => updateFindingStatus(f.id, 'REJECTED')}
                              className="p-1.5 hover:bg-[#FEE2E2] text-[#EF4444] rounded transition-colors" title="Rejected"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => updateFindingStatus(f.id, 'IGNORED')}
                              className="p-1.5 hover:bg-[#E0E7FF] text-[#4F46E5] rounded transition-colors" title="Ignored"
                            >
                              <MinusCircle className="w-4 h-4" />
                            </button>
                            <div className="flex-1"></div>
                            {f.status === 'CONFIRMED' && (
                              <button className="text-[10px] font-bold flex items-center gap-1 bg-[#171717] text-white px-2 py-1.5 rounded hover:bg-[#404040]">
                                <GitPullRequest className="w-3 h-3" />
                                Create Change Request
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
      <VersionHistoryModal isOpen={showVersionHistory} onClose={() => setShowVersionHistory(false)} />
      <AIProvenanceModal isOpen={showAIProvenance} onClose={() => setShowAIProvenance(false)} />
    </div>
  );
};
