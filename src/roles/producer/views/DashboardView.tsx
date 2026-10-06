import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Calendar,
  Sparkles,
  Download,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  Clock,
  Zap,
  ShieldCheck,
  FileSpreadsheet,
  Sliders,
  Layers,
  ArrowUpRight,
  GitBranch,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { MangaProject, AssistantRosterItem, ProvenanceLogItem } from '@/types';

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
  const [velocityTab, setVelocityTab] = useState<'7days' | 'arc02' | 'full'>('7days');
  const [selectedArc, setSelectedArc] = useState('Arc 02: Chapter 5 (Active)');
  const [auditRunning, setAuditRunning] = useState(false);

  const handleAuditClick = () => {
    setAuditRunning(true);
    setTimeout(() => {
      setAuditRunning(false);
      onRunAiAudit();
    }, 1200);
  };

  return (
    <div className='space-y-6 max-w-7xl mx-auto pb-12'>
      {/* Top Banner Context & Header Row */}
      <div className='bg-white border border-[#E7E7E7] rounded-xl p-5 shadow-xs'>
        <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4'>
          <div>
            <div className='flex items-center gap-2 text-[11px] font-mono font-semibold tracking-wider text-[#F97316] mb-1'>
              <span>ARC 02 • SHIBUYA OVERDRIVE</span>
              <span className='text-[#888888]'>•</span>
              <span className='text-[#555555]'>B5 TANKŌBON SPEC (600 DPI)</span>
            </div>
            <h1 className='text-2xl lg:text-3xl font-bold font-display text-[#171717] tracking-tight'>
              Dashboard: {activeProject?.title || 'Overview'}
            </h1>
            <p className='text-xs text-[#555555] mt-1'>
              Real-time production metrics, AI model continuity, and velocity tracking across
              Chapter {activeProject?.chapter || '1'}.
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-2.5'>
            {/* Arc Selector */}
            <div className='relative'>
              <select
                value={selectedArc}
                onChange={(e) => setSelectedArc(e.target.value)}
                className='appearance-none bg-[#F8F6F0] hover:bg-[#F3F1EB] border border-[#E7E7E7] text-xs font-semibold text-[#171717] pl-3 pr-8 py-2 rounded-lg cursor-pointer transition-colors focus:outline-none focus:border-[#F97316]'
              >
                <option>Arc 02: Chapter 5 (Active)</option>
                <option>Arc 02: Chapter 6 (Pre-production)</option>
                <option>Arc 01: Complete Tankōbon</option>
              </select>
              <ChevronDown className='w-3.5 h-3.5 text-[#888888] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none' />
            </div>

            {/* Run AI Audit Button */}
            <button
              onClick={handleAuditClick}
              disabled={auditRunning}
              className='px-3.5 py-2 rounded-lg bg-[#F3E8FF] hover:bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#6D28D9] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-70'
            >
              <Sparkles className={`w-3.5 h-3.5 ${auditRunning ? 'animate-spin' : ''}`} />
              <span>{auditRunning ? 'Auditing Model...' : 'Run AI Audit'}</span>
            </button>

            {/* Export Report Button */}
            <button
              onClick={onExportReport}
              className='px-3.5 py-2 rounded-lg bg-white hover:bg-[#F8F6F0] border border-[#E7E7E7] text-[#171717] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
            >
              <Download className='w-3.5 h-3.5 text-[#555555]' />
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Top KPI Metric Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        {/* Metric 1: Pipeline Completion */}
        <div className='bg-white border border-[#E7E7E7] rounded-xl p-4 shadow-xs hover:border-[#F97316]/40 transition-colors flex flex-col justify-between'>
          <div>
            <div className='flex items-center justify-between text-[11px] font-mono uppercase text-[#888888] tracking-wider mb-1'>
              <span>Pipeline Completion</span>
              <span className='inline-flex items-center gap-1 text-[#EA580C] bg-[#FFF7ED] border border-[#FDBA74]/40 px-1.5 py-0.2 rounded font-semibold text-[10px]'>
                <TrendingUp className='w-3 h-3' /> +4.2 pg/d
              </span>
            </div>
            <div className='text-3xl font-bold font-display text-[#171717] mt-1'>
              56% <span className='text-sm font-normal text-[#888888]'>/ 100%</span>
            </div>
          </div>
          <div className='mt-4 pt-2 border-t border-[#F3F1EB]'>
            <div className='w-full bg-[#E5E5E5] h-1.5 rounded-full overflow-hidden mb-1.5'>
              <div className='bg-[#F97316] h-full rounded-full' style={{ width: '56%' }}></div>
            </div>
            <div className='text-[10px] font-mono text-[#555555]'>
              <strong className='text-[#171717]'>18</strong> / 32 pgs mastered (14 left to ink)
            </div>
          </div>
        </div>

        {/* Metric 2: Print Lock Window */}
        <div className='bg-white border border-[#E7E7E7] rounded-xl p-4 shadow-xs hover:border-[#F97316]/40 transition-colors flex flex-col justify-between'>
          <div>
            <div className='flex items-center justify-between text-[11px] font-mono uppercase text-[#888888] tracking-wider mb-1'>
              <span>Print Lock Window</span>
              <span className='text-[#D97706] bg-[#FFFBEB] border border-[#F59E0B]/30 px-1.5 py-0.2 rounded font-semibold text-[10px]'>
                +12% pace
              </span>
            </div>
            <div className='text-3xl font-bold font-display text-[#171717] mt-1'>
              4 <span className='text-base font-normal text-[#555555]'>Days Left</span>
            </div>
          </div>
          <div className='mt-4 pt-2 border-t border-[#F3F1EB] flex items-center justify-between'>
            <div className='text-[10px] font-mono text-[#555555]'>
              <div className='uppercase text-[9px] text-[#888888]'>Tankōbon Drop</div>
              <strong className='text-[#171717]'>Nov 28, 2026</strong>
            </div>
            <Calendar className='w-4 h-4 text-[#F97316]' />
          </div>
        </div>

        {/* Metric 3: LoRA Continuity Check */}
        <div className='bg-white border border-[#E7E7E7] rounded-xl p-4 shadow-xs hover:border-[#8B5CF6]/40 transition-colors flex flex-col justify-between'>
          <div>
            <div className='flex items-center justify-between text-[11px] font-mono uppercase text-[#888888] tracking-wider mb-1'>
              <span className='text-[#6D28D9]'>LoRA Continuity Check</span>
              <span className='inline-flex items-center gap-1 text-[#6D28D9] bg-[#F3E8FF] border border-[#8B5CF6]/30 px-1.5 py-0.2 rounded font-semibold text-[10px]'>
                <span className='w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse'></span>
                Active
              </span>
            </div>
            <div className='text-3xl font-bold font-display text-[#6D28D9] mt-1'>
              99.4% <span className='text-sm font-normal text-[#6D28D9]'>MATCH</span>
            </div>
          </div>
          <div className='mt-4 pt-2 border-t border-[#F3F1EB] text-[10px] font-mono'>
            <div className='flex items-center justify-between text-[#059669]'>
              <span className='text-[#555555]'>Violations Flagged:</span>
              <strong className='text-[#059669]'>0 Errors (18 pgs)</strong>
            </div>
            <div className='text-[#888888] truncate mt-0.5'>Checkpoint: V-Rockstar-v4.2</div>
          </div>
        </div>

        {/* Metric 4: Production Gates */}
        <div className='bg-white border border-[#E7E7E7] rounded-xl p-4 shadow-xs hover:border-[#10B981]/40 transition-colors flex flex-col justify-between'>
          <div>
            <div className='flex items-center justify-between text-[11px] font-mono uppercase text-[#888888] tracking-wider mb-1'>
              <span>Production Gates</span>
              <span className='text-[#059669] bg-[#ECFDF5] border border-[#10B981]/30 px-1.5 py-0.2 rounded font-semibold text-[10px]'>
                CLEAR RUNWAY
              </span>
            </div>
            <div className='text-3xl font-bold font-display text-[#171717] mt-1'>
              0 <span className='text-base font-normal text-[#555555]'>Blockers</span>
            </div>
          </div>
          <div className='mt-4 pt-2 border-t border-[#F3F1EB] flex items-center justify-between text-[10px] font-mono'>
            <span className='text-[#555555]'>Editor Sign-offs</span>
            <span className='text-[#059669] flex items-center gap-1 font-semibold'>
              <CheckCircle2 className='w-3.5 h-3.5' /> Stages 1–4 Validated
            </span>
          </div>
        </div>
      </div>

      {/* Active Work Bench: Spread Double-Page Climax */}
      <div className='bg-white border border-[#E7E7E7] rounded-xl p-5 shadow-xs'>
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div className='flex items-start sm:items-center gap-4'>
            {/* Thumbnail Preview */}
            <div
              className='relative w-28 h-20 bg-[#171717] rounded-lg overflow-hidden shrink-0 border border-[#E7E7E7] group shadow-xs cursor-pointer'
              onClick={onOpenSpreadModal}
            >
              <img
                src='https://lh3.googleusercontent.com/aida-public/AB6AXuBRF-X_pK-VNA-EDpW2TbENZXn5jBdsCJEViFUEfD1-cL_s6PpvrNV7Br-yvSJJP7XpLx-Q6po_dSRvBycNhUkNoZrpxI6pCLfmSiu3GY9sfOpdOlnvjkYYCL0y61ttCJ5fLSmT1ICs8y7G9Q6Y5MOdvUJxx1VFnqyY8qN7YBUINiyVOxDKYSL905nG_GxVijlasleWGD3OZipKscljZThMLHG09TocsEdeAvvhlPimteBhQD9Wacq_qA'
                alt='Spread 18-19 Climax'
                className='w-full h-full object-cover grayscale opacity-90 group-hover:scale-105 transition-transform'
              />
              <span className='absolute bottom-1 right-1 bg-black/80 text-white font-mono text-[9px] font-bold px-1 rounded'>
                P18-19
              </span>
            </div>

            <div>
              <div className='flex flex-wrap items-center gap-2 mb-1'>
                <span className='px-2 py-0.5 rounded bg-[#FFF7ED] text-[#C2410C] border border-[#FDBA74] text-[10px] font-mono font-bold tracking-wider uppercase'>
                  ACTIVE WORK BENCH
                </span>
                <span className='text-[10px] font-mono text-[#888888]'>
                  SPREAD DOUBLE-PAGE CLIMAX
                </span>
              </div>
              <h3 className='text-lg font-bold font-display text-[#171717]'>
                Chapter 5: &ldquo;Neon Monsoon&rdquo; — Spread 18–19 Climax
              </h3>
              <div className='flex flex-wrap items-center gap-3 text-xs text-[#555555] mt-1'>
                <span className='flex items-center gap-1.5 font-medium'>
                  <span className='w-5 h-5 rounded-full bg-[#171717] text-white text-[9px] font-bold flex items-center justify-center'>
                    KS
                  </span>
                  Kenji S. (Key Inker)
                </span>
                <span className='text-[#E7E7E7]'>•</span>
                <span className='text-[11px] text-[#555555]'>
                  Current task: Inking pass &amp; 3D perspective line alignment
                </span>
                <span className='text-[#E7E7E7]'>•</span>
                <span className='inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#F3E8FF] text-[#6D28D9] border border-[#8B5CF6]/30'>
                  <Sparkles className='w-3 h-3 text-[#8B5CF6]' />
                  LoRA Infill In-progress
                </span>
              </div>
            </div>
          </div>

          <div className='flex items-center gap-2.5 self-end md:self-center shrink-0'>
            <button
              onClick={onOpenSpreadModal}
              className='px-3.5 py-2 rounded-lg border border-[#E7E7E7] hover:border-[#171717] bg-white hover:bg-[#F8F6F0] text-xs font-semibold text-[#171717] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs'
            >
              <Eye className='w-3.5 h-3.5 text-[#555555]' />
              <span>Open Full Spread</span>
            </button>
            <button
              onClick={onOpenCanvasModal}
              className='px-3.5 py-2 rounded-lg bg-[#171717] hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95'
            >
              <Sliders className='w-3.5 h-3.5' />
              <span>Open Canvas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid: Production Velocity & Stage Breakdown vs Provenance Stream */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Left 2 Columns: Velocity & Stages + Burn-up Chart + Assistant Roster */}
        <div className='lg:col-span-2 space-y-6'>
          {/* Section: Production Velocity & Stage Breakdown */}
          <div className='bg-white border border-[#E7E7E7] rounded-xl p-5 shadow-xs'>
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4'>
              <div>
                <h3 className='text-base font-bold font-display text-[#171717]'>
                  Production Velocity &amp; Stage Breakdown
                </h3>
                <p className='text-xs text-[#555555]'>
                  Live page throughput across the 4 core manuscript milestones
                </p>
              </div>

              {/* Range Tabs */}
              <div className='flex items-center bg-[#F8F6F0] p-1 rounded-lg border border-[#E7E7E7] text-xs'>
                <button
                  onClick={() => setVelocityTab('7days')}
                  className={`px-3 py-1 rounded-md transition-all font-semibold ${
                    velocityTab === '7days'
                      ? 'bg-white text-[#171717] shadow-2xs'
                      : 'text-[#555555] hover:text-[#171717]'
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => setVelocityTab('arc02')}
                  className={`px-3 py-1 rounded-md transition-all font-semibold ${
                    velocityTab === 'arc02'
                      ? 'bg-white text-[#171717] shadow-2xs'
                      : 'text-[#555555] hover:text-[#171717]'
                  }`}
                >
                  Arc 02
                </button>
                <button
                  onClick={() => setVelocityTab('full')}
                  className={`px-3 py-1 rounded-md transition-all font-semibold ${
                    velocityTab === 'full'
                      ? 'bg-white text-[#171717] shadow-2xs'
                      : 'text-[#555555] hover:text-[#171717]'
                  }`}
                >
                  Full Run
                </button>
              </div>
            </div>

            {/* 4 Core Stage Progress Cards with Deep Links to Kanban */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6'>
              {/* Stage 1: Script & Dialogue */}
              <div
                onClick={() => navigate('/workspace')}
                className='bg-[#FAF8F4] hover:bg-white border border-[#E7E7E7] hover:border-[#171717] rounded-lg p-3.5 flex flex-col justify-between transition-all cursor-pointer group shadow-2xs'
                title='Nhấn để xem chi tiết danh sách Script & Dialogue trên Kanban'
              >
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    <span className='w-5 h-5 rounded-full bg-[#171717] text-white text-[10px] font-bold flex items-center justify-center font-mono'>
                      1
                    </span>
                    <span className='text-xs font-bold text-[#171717] group-hover:text-[#F97316] transition-colors'>
                      Script &amp; Dialogue
                    </span>
                  </div>
                  <span className='text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#ECFDF5] text-[#059669] border border-[#10B981]/30'>
                    100% DONE
                  </span>
                </div>
                <div className='w-full bg-[#E5E5E5] h-1.5 rounded-full overflow-hidden mb-2'>
                  <div className='bg-[#171717] h-full rounded-full' style={{ width: '100%' }}></div>
                </div>
                <div className='flex items-center justify-between text-[11px] text-[#555555]'>
                  <span>32 of 32 pages drafted</span>
                  <span className='font-semibold text-[#171717] flex items-center gap-1 group-hover:text-[#F97316]'>
                    View Tasks <ArrowRight className='w-3 h-3' />
                  </span>
                </div>
              </div>

              {/* Stage 2: Name / Storyboard */}
              <div
                onClick={() => navigate('/workspace')}
                className='bg-[#FAF8F4] hover:bg-white border border-[#E7E7E7] hover:border-[#0EA5E9] rounded-lg p-3.5 flex flex-col justify-between transition-all cursor-pointer group shadow-2xs'
                title='Nhấn để xem chi tiết Cảnh Storyboard trên Kanban'
              >
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    <span className='w-5 h-5 rounded-full bg-[#0EA5E9] text-white text-[10px] font-bold flex items-center justify-center font-mono'>
                      2
                    </span>
                    <span className='text-xs font-bold text-[#171717] group-hover:text-[#0EA5E9] transition-colors'>
                      Name / Storyboard
                    </span>
                  </div>
                  <span className='text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#E0F2FE] text-[#0284C7] border border-[#0EA5E9]/30'>
                    90% PASS
                  </span>
                </div>
                <div className='w-full bg-[#E5E5E5] h-1.5 rounded-full overflow-hidden mb-2'>
                  <div className='bg-[#0EA5E9] h-full rounded-full' style={{ width: '90%' }}></div>
                </div>
                <div className='flex items-center justify-between text-[11px] text-[#555555]'>
                  <span>29 of 32 pages storyboarded</span>
                  <span className='font-semibold text-[#0284C7] flex items-center gap-1'>
                    View Tasks <ArrowRight className='w-3 h-3' />
                  </span>
                </div>
              </div>

              {/* Stage 3: Rough Pencil & Layout */}
              <div
                onClick={() => navigate('/workspace')}
                className='bg-[#FAF8F4] hover:bg-white border border-[#E7E7E7] hover:border-[#8B5CF6] rounded-lg p-3.5 flex flex-col justify-between transition-all cursor-pointer group shadow-2xs'
                title='Nhấn để mở danh sách 8 công việc trong hàng đợi Rough Pencil'
              >
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    <span className='w-5 h-5 rounded-full bg-[#8B5CF6] text-white text-[10px] font-bold flex items-center justify-center font-mono'>
                      3
                    </span>
                    <span className='text-xs font-bold text-[#171717] group-hover:text-[#8B5CF6] transition-colors'>
                      Rough Pencil &amp; Layout
                    </span>
                  </div>
                  <span className='text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#F3E8FF] text-[#6D28D9] border border-[#8B5CF6]/30'>
                    75% IN RUN
                  </span>
                </div>
                <div className='w-full bg-[#E5E5E5] h-1.5 rounded-full overflow-hidden mb-2'>
                  <div className='bg-[#8B5CF6] h-full rounded-full' style={{ width: '75%' }}></div>
                </div>
                <div className='flex items-center justify-between text-[11px] text-[#555555]'>
                  <span>24 of 32 pages positioned</span>
                  <span className='font-semibold text-[#6D28D9] flex items-center gap-1'>
                    8 In Queue <ArrowRight className='w-3 h-3' />
                  </span>
                </div>
              </div>

              {/* Stage 4: Finished Ink & Screentone */}
              <div
                onClick={() => navigate('/workspace')}
                className='bg-[#FAF8F4] hover:bg-white border border-[#E7E7E7] hover:border-[#F97316] rounded-lg p-3.5 flex flex-col justify-between transition-all cursor-pointer group shadow-2xs'
                title='Nhấn để nhảy tới công đoạn Inking & Screentone trên Kanban'
              >
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    <span className='w-5 h-5 rounded-full bg-[#F97316] text-white text-[10px] font-bold flex items-center justify-center font-mono'>
                      4
                    </span>
                    <span className='text-xs font-bold text-[#171717] group-hover:text-[#F97316] transition-colors'>
                      Finished Ink &amp; Screentone
                    </span>
                  </div>
                  <span className='text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#FFF7ED] text-[#EA580C] border border-[#FDBA74]'>
                    31% FOCUS
                  </span>
                </div>
                <div className='w-full bg-[#E5E5E5] h-1.5 rounded-full overflow-hidden mb-2'>
                  <div className='bg-[#F97316] h-full rounded-full' style={{ width: '31%' }}></div>
                </div>
                <div className='flex items-center justify-between text-[11px] text-[#555555]'>
                  <span>10 of 32 master sheets signed</span>
                  <span className='font-semibold text-[#F97316] flex items-center gap-1'>
                    Inking Tasks <ArrowRight className='w-3 h-3' />
                  </span>
                </div>
              </div>
            </div>

            {/* Burn-Up Pacing vs Production Target SVG Chart */}
            <div className='bg-[#FAF8F4] border border-[#E7E7E7] rounded-xl p-4'>
              <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3'>
                <div className='text-xs font-bold uppercase tracking-wider text-[#171717] font-mono'>
                  Burn-Up Pacing vs Production Target
                </div>
                <div className='flex items-center gap-4 text-xs font-mono'>
                  <div className='px-2 py-0.5 rounded bg-[#FFF7ED] text-[#C2410C] border border-[#FDBA74] text-[11px] font-semibold'>
                    Pacing: 5.2 pgs/day{' '}
                    <span className='font-normal text-[#555555]'>(Target: 4.5)</span>
                  </div>
                  <div className='flex items-center gap-1 text-[11px] text-[#555555]'>
                    <span className='w-3 h-0.5 bg-[#F97316]'></span> Actual Mastered
                  </div>
                  <div className='flex items-center gap-1 text-[11px] text-[#888888]'>
                    <span className='w-3 h-0.5 border-t border-dashed border-[#888888]'></span>{' '}
                    Target Curve
                  </div>
                </div>
              </div>

              {/* SVG Curve Display */}
              <div className='relative w-full h-48 sm:h-56 bg-white rounded-lg border border-[#E7E7E7] p-2 overflow-hidden'>
                <svg viewBox='0 0 700 220' className='w-full h-full text-xs select-none'>
                  {/* Grid Lines */}
                  <line x1='40' y1='30' x2='680' y2='30' stroke='#F0EDED' strokeDasharray='3 3' />
                  <text x='15' y='34' fill='#888888' fontSize='10' fontFamily='monospace'>
                    32p
                  </text>

                  <line x1='40' y1='80' x2='680' y2='80' stroke='#F0EDED' strokeDasharray='3 3' />
                  <text x='15' y='84' fill='#888888' fontSize='10' fontFamily='monospace'>
                    24p
                  </text>

                  <line x1='40' y1='130' x2='680' y2='130' stroke='#F0EDED' strokeDasharray='3 3' />
                  <text x='15' y='134' fill='#888888' fontSize='10' fontFamily='monospace'>
                    16p
                  </text>

                  <line x1='40' y1='180' x2='680' y2='180' stroke='#F0EDED' strokeDasharray='3 3' />
                  <text x='20' y='184' fill='#888888' fontSize='10' fontFamily='monospace'>
                    8p
                  </text>

                  {/* Target Curve (Dashed) */}
                  <path
                    d='M 50 190 L 150 165 L 260 135 L 380 100 L 500 65 L 650 30'
                    fill='none'
                    stroke='#888888'
                    strokeWidth='1.5'
                    strokeDasharray='4 4'
                  />

                  {/* Climax Marker Vertical Line */}
                  <line
                    x1='530'
                    y1='20'
                    x2='530'
                    y2='190'
                    stroke='#8B5CF6'
                    strokeWidth='1.5'
                    strokeDasharray='3 3'
                  />
                  <rect
                    x='505'
                    y='10'
                    width='60'
                    height='16'
                    rx='3'
                    fill='#F3E8FF'
                    stroke='#8B5CF6'
                    strokeWidth='0.8'
                  />
                  <text
                    x='512'
                    y='22'
                    fill='#6D28D9'
                    fontSize='9'
                    fontFamily='monospace'
                    fontWeight='bold'
                  >
                    CLIMAX P24
                  </text>

                  {/* Today (D9) Marker */}
                  <line
                    x1='420'
                    y1='30'
                    x2='420'
                    y2='190'
                    stroke='#F97316'
                    strokeWidth='1'
                    strokeDasharray='2 2'
                    opacity='0.6'
                  />

                  {/* Actual Mastered Curve (Gradient Area + Solid Line) */}
                  <defs>
                    <linearGradient id='curveGradient' x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='0%' stopColor='#F97316' stopOpacity='0.25' />
                      <stop offset='100%' stopColor='#F97316' stopOpacity='0.0' />
                    </linearGradient>
                  </defs>
                  <path
                    d='M 50 190 Q 150 180, 220 160 T 350 120 T 420 85 L 420 190 Z'
                    fill='url(#curveGradient)'
                  />
                  <path
                    d='M 50 190 Q 150 180, 220 160 T 350 120 T 420 85'
                    fill='none'
                    stroke='#F97316'
                    strokeWidth='3.5'
                    strokeLinecap='round'
                  />

                  {/* Active Point on Today */}
                  <circle cx='420' cy='85' r='5' fill='#F97316' stroke='#FFFFFF' strokeWidth='2' />

                  {/* X Axis Labels */}
                  <text x='45' y='210' fill='#888888' fontSize='10' fontFamily='monospace'>
                    Day 01
                  </text>
                  <text x='135' y='210' fill='#888888' fontSize='10' fontFamily='monospace'>
                    Day 03
                  </text>
                  <text x='235' y='210' fill='#888888' fontSize='10' fontFamily='monospace'>
                    Day 05
                  </text>
                  <text x='330' y='210' fill='#888888' fontSize='10' fontFamily='monospace'>
                    Day 07
                  </text>
                  <text
                    x='405'
                    y='210'
                    fill='#F97316'
                    fontSize='10'
                    fontFamily='monospace'
                    fontWeight='bold'
                  >
                    Today (D9)
                  </text>
                  <text x='510' y='210' fill='#888888' fontSize='10' fontFamily='monospace'>
                    Day 11
                  </text>
                  <text x='620' y='210' fill='#888888' fontSize='10' fontFamily='monospace'>
                    Lock (D14)
                  </text>
                </svg>
              </div>

              {/* Generative Screentoning Impact Banner */}
              <div className='mt-3 p-3 bg-white border border-[#E7E7E7] rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2'>
                <div className='flex items-center gap-2 text-xs'>
                  <div className='w-6 h-6 rounded-md bg-[#FFF7ED] text-[#F97316] flex items-center justify-center shrink-0'>
                    <Zap className='w-3.5 h-3.5' />
                  </div>
                  <span className='text-[#171717]'>
                    <strong>Generative Screentoning Impact:</strong> AI background hatch inking
                    saved an estimated <strong>19.4 studio hours</strong> this week.
                  </span>
                </div>
                <span className='font-mono text-[10px] font-bold text-[#EA580C] bg-[#FFF7ED] px-2 py-1 rounded border border-[#FDBA74] whitespace-nowrap'>
                  EST. FINISH: NOV 27 (1 DAY EARLY)
                </span>
              </div>
            </div>
          </div>

          {/* Active Assistant Roster Card */}
          <div className='bg-white border border-[#E7E7E7] rounded-xl p-5 shadow-xs'>
            <div className='flex items-center justify-between mb-3.5'>
              <div className='text-xs font-mono font-bold uppercase tracking-wider text-[#888888]'>
                Active Assistant Roster
              </div>
              <button
                onClick={onManageAssignments}
                className='text-xs font-semibold text-[#F97316] hover:text-[#EA580C] transition-colors cursor-pointer'
              >
                Manage Assignments (6)
              </button>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
              {assistants.map((asst) => (
                <div
                  key={asst.id}
                  className='p-3 bg-[#FAF8F4] border border-[#E7E7E7] rounded-xl flex items-center justify-between hover:bg-white hover:border-[#171717] transition-all cursor-pointer shadow-2xs'
                  onClick={onManageAssignments}
                >
                  <div className='flex items-center gap-2.5 overflow-hidden'>
                    <div
                      className='w-8 h-8 rounded-full text-white font-semibold text-xs flex items-center justify-center shrink-0'
                      style={{ backgroundColor: asst.avatarBg }}
                    >
                      {asst.initials}
                    </div>
                    <div className='overflow-hidden'>
                      <div className='text-xs font-bold text-[#171717] truncate'>{asst.name}</div>
                      <div className='text-[10px] text-[#555555] font-mono truncate'>
                        {asst.task}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      asst.status === 'active' ? 'bg-[#10B981]' : 'bg-[#F59E0B]'
                    }`}
                  ></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Provenance Log & Manga LoRA Engine Card */}
        <div className='space-y-6'>
          {/* Provenance Log Card (SHA-256 Audit Stream) */}
          <div className='bg-white border border-[#E7E7E7] rounded-xl p-5 shadow-xs flex flex-col justify-between'>
            <div>
              <div className='flex items-center justify-between pb-3 mb-3 border-b border-[#E7E7E7]'>
                <div className='flex items-center gap-2'>
                  <ShieldCheck className='w-4 h-4 text-[#171717]' />
                  <div>
                    <h3 className='text-sm font-bold font-display text-[#171717]'>
                      Provenance Log
                    </h3>
                    <div className='text-[9px] font-mono text-[#888888] tracking-wider'>
                      SHA-256 AUDIT STREAM
                    </div>
                  </div>
                </div>
                <span className='text-[10px] font-mono text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full border border-[#10B981]/30 flex items-center gap-1 font-semibold'>
                  <span className='w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse'></span>
                  Live Sync
                </span>
              </div>

              {/* Event Stream Timeline */}
              <div className='space-y-4 text-xs'>
                {provenanceLogs.map((log) => (
                  <div
                    key={log.id}
                    className='relative pl-5 border-l-2 border-[#E7E7E7] hover:border-[#F97316] transition-colors pb-1'
                  >
                    <div className='absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-[#171717] ring-2 ring-white'></div>
                    <div className='flex items-center justify-between text-[10px] font-mono mb-0.5'>
                      <strong className='text-[#171717] font-semibold'>{log.actor}</strong>
                      <span className='text-[#888888]'>{log.timeAgo}</span>
                    </div>
                    <p className='text-[11px] text-[#555555] leading-relaxed mb-1.5'>
                      {log.details}
                    </p>
                    <div className='flex flex-wrap items-center gap-1.5 font-mono text-[9px]'>
                      <span className='px-1.5 py-0.2 rounded bg-[#F8F6F0] text-[#555555] border border-[#E7E7E7]'>
                        {log.hash}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded font-semibold ${log.statusTagColor}`}>
                        {log.statusTag}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={onViewAuditLog}
              className='mt-5 w-full py-2 bg-[#F8F6F0] hover:bg-[#F3F1EB] text-[#171717] border border-[#E7E7E7] rounded-lg text-xs font-semibold font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer'
            >
              <span>View Full Cryptographic Audit Log</span>
              <ArrowUpRight className='w-3.5 h-3.5' />
            </button>
          </div>

          {/* Manga LoRA Engine Card */}
          <div className='bg-white border border-[#E7E7E7] rounded-xl p-5 shadow-xs space-y-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <div className='w-7 h-7 rounded-lg bg-[#F3E8FF] text-[#6D28D9] flex items-center justify-center'>
                  <Sparkles className='w-4 h-4' />
                </div>
                <div>
                  <h4 className='text-xs font-bold text-[#171717] font-display'>
                    Manga LoRA Engine v4.2
                  </h4>
                  <div className='text-[10px] text-[#888888] font-mono'>
                    Neural Continuity Matrix
                  </div>
                </div>
              </div>
              <span className='text-[10px] font-mono px-2 py-0.5 rounded bg-[#ECFDF5] text-[#059669] font-bold border border-[#10B981]/30'>
                STABLE
              </span>
            </div>

            <div className='space-y-2 text-xs font-mono pt-1'>
              <div className='flex items-center justify-between py-1 border-b border-[#F3F1EB]'>
                <span className='text-[#888888]'>Continuity Vector Drift</span>
                <span className='font-bold text-[#171717]'>&lt; 0.04 σ</span>
              </div>
              <div className='flex items-center justify-between py-1 border-b border-[#F3F1EB]'>
                <span className='text-[#888888]'>Prompt Inversion Latency</span>
                <span className='font-bold text-[#171717]'>1.18s / cut</span>
              </div>
              <div className='py-1'>
                <span className='text-[#888888] block text-[10px] uppercase'>
                  Active Reference Anchor
                </span>
                <span className='text-[11px] text-[#6D28D9] font-bold truncate block mt-0.5'>
                  ch05_character_sheet_v4.2.safetensors
                </span>
              </div>
            </div>

            <button
              onClick={onConfigureAnchors}
              className='w-full py-2 bg-white border border-[#8B5CF6]/40 hover:bg-[#F3E8FF] text-[#6D28D9] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
            >
              <Sliders className='w-3.5 h-3.5' />
              <span>CONFIGURE MODEL ANCHORS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
