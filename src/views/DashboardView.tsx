import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Calendar,
  Sparkles,
  Download,
  Eye,
  Sliders,
  ChevronDown,
  ArrowRight,
  Clock,
  CheckCircle2,
  ListTodo
} from 'lucide-react';
import { MangaProject, AssistantRosterItem, ProvenanceLogItem } from '../types';

interface DashboardViewProps {
  activeProject?: MangaProject;
  assistants?: AssistantRosterItem[];
  provenanceLogs?: ProvenanceLogItem[];
  onOpenSpreadModal?: () => void;
  onOpenCanvasModal?: () => void;
  onRunAiAudit?: () => void;
  onExportReport?: () => void;
  onConfigureAnchors?: () => void;
  onViewAuditLog?: () => void;
  onManageAssignments?: () => void;
  onShowToast?: (title: string, desc: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activeProject,
  assistants = [],
  provenanceLogs = [],
  onOpenSpreadModal = () => {},
  onOpenCanvasModal = () => {},
  onRunAiAudit = () => {},
  onExportReport = () => {},
  onConfigureAnchors = () => {},
  onViewAuditLog = () => {},
  onManageAssignments = () => {},
  onShowToast = () => {},
}) => {
  const navigate = useNavigate();
  const [selectedChapter, setSelectedChapter] = useState('Chapter 5');
  const [auditRunning, setAuditRunning] = useState(false);

  const handleAuditClick = () => {
    setAuditRunning(true);
    setTimeout(() => {
      setAuditRunning(false);
      onRunAiAudit();
    }, 1200);
  };

  return (
    <div className='w-full max-w-7xl mx-auto p-6 md:p-8 space-y-6 bg-zinc-50 min-h-screen'>
      {/* Streamlined Header & Action Bar */}
      <div className='bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4'>
        <div>
          <h1 className='text-xl md:text-2xl font-bold text-zinc-900 tracking-tight'>
            {activeProject?.title || 'Series Dashboard'}
          </h1>
          <p className='text-sm text-zinc-600 mt-1 font-medium'>
            Production overview and active progress.
          </p>
        </div>

        <div className='flex items-center gap-3'>
          <div className='relative'>
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              className='appearance-none bg-white border border-zinc-200 text-sm font-semibold text-zinc-700 pl-4 pr-10 py-2 rounded-lg cursor-pointer transition-colors focus:outline-none focus:border-orange-500 hover:bg-zinc-50 shadow-sm'
            >
              <option>Chapter 5 (Active)</option>
              <option>Chapter 6 (Pre-production)</option>
              <option>Chapter 4 (Completed)</option>
            </select>
            <ChevronDown className='w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none' />
          </div>

          <button
            onClick={handleAuditClick}
            disabled={auditRunning}
            className='px-4 py-2 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-70 shadow-sm'
          >
            <Sparkles className={`w-4 h-4 ${auditRunning ? 'animate-spin' : ''}`} />
            <span>{auditRunning ? 'Auditing...' : 'Run AI Audit'}</span>
          </button>

          <button
            onClick={onExportReport}
            className='px-4 py-2 rounded-lg bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm'
          >
            <Download className='w-4 h-4 text-zinc-500' />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Consolidated Metric Cards */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {/* Metric 1: Pipeline Completion */}
        <div className='bg-white border border-zinc-200 rounded-xl p-6 shadow-sm'>
          <div className='flex items-center justify-between mb-4'>
            <span className='text-sm font-semibold text-zinc-600'>Pipeline Completion</span>
            <span className='text-xs font-semibold px-2 py-1 bg-zinc-100 text-zinc-700 rounded-md'>56%</span>
          </div>
          <div className='w-full bg-zinc-100 h-2 rounded-full overflow-hidden mb-3'>
            <div className='bg-orange-500 h-full rounded-full transition-all duration-500' style={{ width: '56%' }}></div>
          </div>
          <p className='text-sm font-medium text-zinc-500'>18 / 32 pages mastered (14 left)</p>
        </div>

        {/* Metric 2: Deadline */}
        <div className='bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-col justify-between'>
          <div className='flex items-center justify-between mb-4'>
            <span className='text-sm font-semibold text-zinc-600'>Upcoming Deadline</span>
            <Calendar className='w-5 h-5 text-orange-500' />
          </div>
          <div>
            <div className='text-2xl font-bold text-zinc-900'>4 Days Left</div>
            <p className='text-sm font-medium text-zinc-500 mt-1'>Target: Nov 28, 2026</p>
          </div>
        </div>

        {/* Metric 3: Active Chapter Status */}
        <div className='bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-col justify-between'>
          <div className='flex items-center justify-between mb-4'>
            <span className='text-sm font-semibold text-zinc-600'>Active Chapter Status</span>
            <span className='flex items-center gap-1 text-xs font-semibold px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md'>
              <CheckCircle2 className='w-3 h-3' /> On Track
            </span>
          </div>
          <div>
            <div className='text-2xl font-bold text-zinc-900'>In Production</div>
            <p className='text-sm font-medium text-zinc-500 mt-1'>Stages 1–3 Validated</p>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2 space-y-6'>
          {/* Active Work Bench (Cleaned) */}
          <div className='bg-white border border-zinc-200 rounded-xl p-6 shadow-sm'>
            <h2 className='text-base font-semibold text-zinc-800 mb-4 flex items-center gap-2'>
              <ListTodo className='w-5 h-5 text-zinc-400' />
              Active Work Bench
            </h2>
            <div className='flex flex-col sm:flex-row sm:items-center gap-4'>
              <div 
                className='w-24 h-16 bg-zinc-100 rounded-lg overflow-hidden shrink-0 border border-zinc-200 cursor-pointer hover:opacity-90 transition-opacity'
                onClick={onOpenSpreadModal}
              >
                <img
                  src='https://lh3.googleusercontent.com/aida-public/AB6AXuBRF-X_pK-VNA-EDpW2TbENZXn5jBdsCJEViFUEfD1-cL_s6PpvrNV7Br-yvSJJP7XpLx-Q6po_dSRvBycNhUkNoZrpxI6pCLfmSiu3GY9sfOpdOlnvjkYYCL0y61ttCJ5fLSmT1ICs8y7G9Q6Y5MOdvUJxx1VFnqyY8qN7YBUINiyVOxDKYSL905nG_GxVijlasleWGD3OZipKscljZThMLHG09TocsEdeAvvhlPimteBhQD9Wacq_qA'
                  alt='Spread 18-19'
                  className='w-full h-full object-cover'
                />
              </div>
              <div className='flex-1'>
                <h3 className='text-sm font-bold text-zinc-900 mb-1'>Chapter 5 — Spread 18–19</h3>
                <div className='flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-500'>
                  <span className='px-2 py-0.5 rounded bg-zinc-100 text-zinc-700'>Assignee: Kenji S.</span>
                  <span>•</span>
                  <span>Task: Inking pass & alignment</span>
                </div>
              </div>
              <div className='flex items-center gap-2 mt-4 sm:mt-0'>
                <button
                  onClick={onOpenSpreadModal}
                  className='px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold text-zinc-700 flex items-center gap-1 transition-colors'
                >
                  <Eye className='w-3.5 h-3.5' /> Preview
                </button>
                <button
                  onClick={onOpenCanvasModal}
                  className='px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors'
                >
                  <Sliders className='w-3.5 h-3.5' /> Open Canvas
                </button>
              </div>
            </div>
          </div>

          {/* Cleaned Production Velocity & Stage Breakdown */}
          <div className='bg-white border border-zinc-200 rounded-xl p-6 shadow-sm'>
            <h2 className='text-base font-semibold text-zinc-800 mb-4 flex items-center gap-2'>
              <TrendingUp className='w-5 h-5 text-zinc-400' />
              Stage Progress
            </h2>
            <div className='space-y-4'>
              {/* Stage 1 */}
              <div className='flex items-center gap-4'>
                <div className='w-8 h-8 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center font-bold text-sm shrink-0'>1</div>
                <div className='flex-1'>
                  <div className='flex justify-between text-sm font-medium mb-1'>
                    <span className='text-zinc-900'>Script & Dialogue</span>
                    <span className='text-zinc-500'>100%</span>
                  </div>
                  <div className='w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden'>
                    <div className='bg-emerald-500 h-full rounded-full' style={{ width: '100%' }}></div>
                  </div>
                </div>
              </div>
              {/* Stage 2 */}
              <div className='flex items-center gap-4'>
                <div className='w-8 h-8 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center font-bold text-sm shrink-0'>2</div>
                <div className='flex-1'>
                  <div className='flex justify-between text-sm font-medium mb-1'>
                    <span className='text-zinc-900'>Storyboard</span>
                    <span className='text-zinc-500'>90%</span>
                  </div>
                  <div className='w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden'>
                    <div className='bg-blue-500 h-full rounded-full' style={{ width: '90%' }}></div>
                  </div>
                </div>
              </div>
              {/* Stage 3 */}
              <div className='flex items-center gap-4'>
                <div className='w-8 h-8 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center font-bold text-sm shrink-0'>3</div>
                <div className='flex-1'>
                  <div className='flex justify-between text-sm font-medium mb-1'>
                    <span className='text-zinc-900'>Rough Pencil & Layout</span>
                    <span className='text-zinc-500'>75%</span>
                  </div>
                  <div className='w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden'>
                    <div className='bg-purple-500 h-full rounded-full' style={{ width: '75%' }}></div>
                  </div>
                </div>
              </div>
              {/* Stage 4 */}
              <div className='flex items-center gap-4'>
                <div className='w-8 h-8 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center font-bold text-sm shrink-0'>4</div>
                <div className='flex-1'>
                  <div className='flex justify-between text-sm font-medium mb-1'>
                    <span className='text-zinc-900'>Inking & Screentone</span>
                    <span className='text-zinc-500'>31%</span>
                  </div>
                  <div className='w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden'>
                    <div className='bg-orange-500 h-full rounded-full' style={{ width: '31%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className='space-y-6'>
          {/* Active Assistant Roster */}
          <div className='bg-white border border-zinc-200 rounded-xl p-6 shadow-sm'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-base font-semibold text-zinc-800'>Active Crew</h2>
              <button
                onClick={onManageAssignments}
                className='text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors'
              >
                Manage
              </button>
            </div>
            <div className='space-y-3'>
              {assistants.length > 0 ? (
                assistants.map((asst) => (
                  <div key={asst.id} className='flex items-center gap-3 p-3 rounded-lg border border-zinc-100 bg-zinc-50'>
                    <div
                      className='w-8 h-8 rounded-full text-white font-semibold text-xs flex items-center justify-center shrink-0'
                      style={{ backgroundColor: asst.avatarBg || '#f97316' }}
                    >
                      {asst.initials}
                    </div>
                    <div className='flex-1 overflow-hidden'>
                      <div className='text-sm font-bold text-zinc-900 truncate'>{asst.name}</div>
                      <div className='text-xs font-medium text-zinc-500 truncate'>{asst.task}</div>
                    </div>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${asst.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  </div>
                ))
              ) : (
                <div className='text-sm text-zinc-500 text-center py-4'>No active crew.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
