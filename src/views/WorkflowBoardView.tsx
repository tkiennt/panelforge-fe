import React, { useState, useMemo } from 'react';
import {
  Kanban,
  List,
  Grid,
  TrendingUp,
  Search,
  Filter,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowRight,
  MoreHorizontal,
  ChevronDown,
  Layers,
  FileDown,
  Sliders,
  X,
  History,
  Palette,
  Eye,
  Check,
} from 'lucide-react';
import { KanbanCard, KanbanStageKey, WorkflowSubView, MangaProject } from '../types';

interface WorkflowBoardViewProps {
  activeProject?: MangaProject;
  cards?: KanbanCard[];
  onUpdateCardStage: (cardId: string, newStage: KanbanStageKey) => void;
  onOpenCardDetails: (card: KanbanCard) => void;
  onOpenExportModal: () => void;
  onOpenNewCardModal: () => void;
  onShowToast: (title: string, desc: string) => void;
}

const STAGES: { key: KanbanStageKey; label: string; dotColor: string }[] = [
  { key: 'script', label: '1. Script', dotColor: 'bg-[#171717]' },
  { key: 'thumbnail', label: '2. Thumbnail', dotColor: 'bg-[#0EA5E9]' },
  { key: 'pencil', label: '3. Pencil', dotColor: 'bg-[#F97316]' },
  { key: 'ink', label: '4. Ink', dotColor: 'bg-[#171717]' },
  { key: 'color', label: '5. Color', dotColor: 'bg-[#006591]' },
  { key: 'letter', label: '6. Letter', dotColor: 'bg-[#6D28D9]' },
  { key: 'review', label: '7. Review', dotColor: 'bg-[#F59E0B]' },
  { key: 'approved', label: '8. Approved', dotColor: 'bg-[#10B981]' },
];

export const WorkflowBoardView: React.FC<WorkflowBoardViewProps> = ({
  activeProject,
  cards = [],
  onUpdateCardStage,
  onOpenCardDetails,
  onOpenExportModal,
  onOpenNewCardModal,
  onShowToast,
}) => {
  const [subView, setSubView] = useState<WorkflowSubView>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [burndownOpen, setBurndownOpen] = useState(false);

  // Filtered Cards
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const matchesSearch =
        !searchQuery ||
        card.pageNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.assignee.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAssignee =
        assigneeFilter === 'ALL' || card.assignee.toLowerCase() === assigneeFilter.toLowerCase();

      const matchesStage = stageFilter === 'ALL' || card.stage === stageFilter;

      const matchesType =
        typeFilter === 'ALL' ||
        (typeFilter === 'Spread' &&
          (card.pageType === 'Spread' ||
            card.pageNumber.includes('–') ||
            card.pageNumber.includes('-'))) ||
        (typeFilter === 'Action' && card.pageType === 'Action') ||
        (typeFilter === 'Dialogue' && card.pageType === 'Dialogue');

      return matchesSearch && matchesAssignee && matchesStage && matchesType;
    });
  }, [cards, searchQuery, assigneeFilter, stageFilter, typeFilter]);

  const cardsByStage = useMemo(() => {
    const map: Record<KanbanStageKey, KanbanCard[]> = {
      script: [],
      thumbnail: [],
      pencil: [],
      ink: [],
      color: [],
      letter: [],
      review: [],
      approved: [],
    };
    filteredCards.forEach((c) => {
      if (map[c.stage]) {
        map[c.stage].push(c);
      }
    });
    return map;
  }, [filteredCards]);

  const advanceStage = (card: KanbanCard) => {
    const stageOrder: KanbanStageKey[] = [
      'script',
      'thumbnail',
      'pencil',
      'ink',
      'color',
      'letter',
      'review',
      'approved',
    ];
    const currentIndex = stageOrder.indexOf(card.stage);
    if (currentIndex < stageOrder.length - 1) {
      const nextStage = stageOrder[currentIndex + 1];
      onUpdateCardStage(card.id, nextStage);
      onShowToast('Page Advanced', `${card.pageNumber} moved to ${nextStage.toUpperCase()}.`);
    } else {
      onShowToast('Already Mastered', `${card.pageNumber} is in final approved stage.`);
    }
  };

  return (
    <div className='flex flex-col flex-1 h-[calc(100vh-4rem)] overflow-hidden'>
      {/* Top Burndown & Velocity Summary Bar */}
      <section className='bg-white px-6 py-4 border-b border-[#E7E7E7] shrink-0'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          {/* Title & Progress Block */}
          <div className='flex items-center gap-6 min-w-0'>
            <div>
              <div className='flex items-center gap-2'>
                <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-[10px] uppercase tracking-wider font-bold'>
                  ARC 02
                </span>
                <h1 className='text-xl lg:text-2xl font-bold font-display text-[#171717] tracking-tight'>
                  Chapter {activeProject?.chapter || '1'}: {activeProject?.totalPages || 0} Total
                  Pages
                </h1>
              </div>
              <div className='flex items-center gap-3 mt-1.5 text-xs'>
                <span className='font-semibold text-[#171717]'>
                  {activeProject?.completedPages || 0} / {activeProject?.totalPages || 0} Completed
                </span>
                <span className='text-[#888888] font-mono font-medium'>
                  (
                  {activeProject?.totalPages
                    ? Math.round(
                        ((activeProject.completedPages || 0) / activeProject.totalPages) * 100,
                      )
                    : 0}
                  %)
                </span>
                <div className='w-40 sm:w-52 h-2 bg-[#F3F1EB] rounded-full overflow-hidden flex'>
                  <div
                    className='bg-[#F97316] h-full transition-all duration-500'
                    style={{
                      width: `${activeProject?.totalPages ? ((activeProject.completedPages || 0) / activeProject.totalPages) * 100 : 0}%`,
                    }}
                  ></div>
                  <div className='bg-[#6D28D9]/30 h-full' style={{ width: '25%' }}></div>
                </div>
              </div>
            </div>

            {/* Inline Burndown Mini-Chart */}
            <div className='hidden xl:flex items-center gap-3 pl-6 border-l border-[#E7E7E7]'>
              <div className='flex flex-col'>
                <span className='text-[10px] font-mono text-[#888888] uppercase tracking-wider'>
                  Velocity Pace
                </span>
                <span className='text-sm font-bold text-[#171717] font-mono'>+4.2 pgs / day</span>
              </div>
              <svg className='w-24 h-8 text-[#F97316]' fill='none' viewBox='0 0 96 32'>
                <path
                  d='M2 28 L20 22 L38 24 L56 14 L74 16 L94 4'
                  stroke='currentColor'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                />
                <path d='M2 28 L94 28' stroke='#E7E7E7' strokeDasharray='3 3' strokeWidth='1' />
                <circle cx='94' cy='4' fill='#F97316' r='3' />
              </svg>
            </div>
          </div>

          {/* Quick Metrics Pills */}
          <div className='flex flex-wrap items-center gap-2'>
            <div className='flex items-center gap-1.5 px-3 py-1 rounded bg-[#FFFBEB] text-[#D97706] border border-[#F59E0B]/30 text-xs font-semibold'>
              <Clock className='w-3.5 h-3.5' />
              <span>4 Days to Print Deadline</span>
            </div>
            <div className='flex items-center gap-1.5 px-3 py-1 rounded bg-[#F8F6F0] text-[#171717] border border-[#E7E7E7] text-xs font-semibold'>
              <CheckCircle className='w-3.5 h-3.5 text-[#10B981]' />
              <span>0 Blocked</span>
            </div>
            <div className='flex items-center gap-1.5 px-3 py-1 rounded bg-[#F3E8FF] text-[#6D28D9] border border-[#8B5CF6]/30 text-xs font-semibold'>
              <Sparkles className='w-3.5 h-3.5' />
              <span>99.4% AI Continuity</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filter & Controls Toolbar */}
      <section className='bg-[#FAF8F4] px-6 py-3 border-b border-[#E7E7E7] shrink-0 shadow-2xs'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          {/* Search and Dropdowns */}
          <div className='flex flex-wrap items-center gap-2.5'>
            {/* Search Input */}
            <div className='relative flex items-center'>
              <Search className='w-4 h-4 text-[#888888] absolute left-2.5' />
              <input
                type='text'
                placeholder='Search pages, cuts, notes... (⌘K)'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='w-56 sm:w-64 pl-8 pr-3 py-1.5 bg-white rounded border border-[#E7E7E7] text-xs text-[#171717] placeholder-[#888888] focus:outline-none focus:border-[#171717] transition-all'
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className='absolute right-2 text-[#888888] hover:text-[#171717] text-xs'
                >
                  ×
                </button>
              )}
            </div>

            {/* Assignee Filter */}
            <div className='relative'>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className='appearance-none bg-white border border-[#E7E7E7] pl-3 pr-8 py-1.5 rounded text-xs font-semibold text-[#171717] focus:outline-none focus:border-[#171717] cursor-pointer'
              >
                <option value='ALL'>Assignee: All Members</option>
                <option value='Kenji'>Kenji (Artist)</option>
                <option value='Arata'>Arata (Writer)</option>
                <option value='Mei'>Mei (Artist)</option>
                <option value='Yuto'>Yuto (Artist)</option>
                <option value='Tatsuki'>Tatsuki F. (Lead)</option>
              </select>
              <ChevronDown className='w-3.5 h-3.5 text-[#888888] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none' />
            </div>

            {/* Stage Dropdown */}
            <div className='relative'>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className='appearance-none bg-white border border-[#E7E7E7] pl-3 pr-8 py-1.5 rounded text-xs font-semibold text-[#171717] focus:outline-none focus:border-[#171717] cursor-pointer'
              >
                <option value='ALL'>Stages: All (8 Stages)</option>
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronDown className='w-3.5 h-3.5 text-[#888888] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none' />
            </div>

            {/* Page Type Dropdown */}
            <div className='relative'>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className='appearance-none bg-white border border-[#E7E7E7] pl-3 pr-8 py-1.5 rounded text-xs font-semibold text-[#171717] focus:outline-none focus:border-[#171717] cursor-pointer'
              >
                <option value='ALL'>Page Type: All</option>
                <option value='Spread'>Spread / Splash</option>
                <option value='Action'>Action Sequence</option>
                <option value='Dialogue'>Dialogue Heavy</option>
              </select>
              <ChevronDown className='w-3.5 h-3.5 text-[#888888] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none' />
            </div>
          </div>

          {/* View Controls & Action Buttons */}
          <div className='flex items-center gap-2.5'>
            {/* View Switchers */}
            <div className='flex items-center bg-white rounded p-0.5 border border-[#E7E7E7]'>
              <button
                onClick={() => setSubView('board')}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  subView === 'board'
                    ? 'bg-[#171717] text-white shadow-xs'
                    : 'text-[#555555] hover:text-[#171717]'
                }`}
                title='Board View'
              >
                <Kanban className='w-3.5 h-3.5' />
                <span>Board</span>
              </button>
              <button
                onClick={() => setSubView('list')}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  subView === 'list'
                    ? 'bg-[#171717] text-white shadow-xs'
                    : 'text-[#555555] hover:text-[#171717]'
                }`}
                title='List View'
              >
                <List className='w-3.5 h-3.5' />
                <span>List</span>
              </button>
              <button
                onClick={() => setSubView('grid')}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  subView === 'grid'
                    ? 'bg-[#171717] text-white shadow-xs'
                    : 'text-[#555555] hover:text-[#171717]'
                }`}
                title='Grid Spread View'
              >
                <Grid className='w-3.5 h-3.5' />
                <span>Grid</span>
              </button>
            </div>

            {/* Burndown Drawer Toggle */}
            <button
              onClick={() => setBurndownOpen(!burndownOpen)}
              className='px-3 py-1.5 rounded bg-white border border-[#E7E7E7] hover:bg-[#F3F1EB] text-[#171717] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer'
            >
              <TrendingUp className='w-3.5 h-3.5 text-[#F97316]' />
              <span>Burndown Analytics</span>
            </button>

            {/* + New Page Card */}
            <button
              onClick={onOpenNewCardModal}
              className='px-3.5 py-1.5 rounded bg-[#171717] hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95'
            >
              <Plus className='w-3.5 h-3.5' />
              <span>+ New Page Card</span>
            </button>
          </div>
        </div>
      </section>

      {/* Burndown Analytics Slide-Over Drawer */}
      {burndownOpen && (
        <div className='bg-white border-b border-[#E7E7E7] px-6 py-4 transition-all duration-300 shrink-0 shadow-inner'>
          <div className='flex items-center justify-between mb-3'>
            <h3 className='text-sm font-bold text-[#171717] flex items-center gap-2 font-display'>
              <TrendingUp className='w-4 h-4 text-[#F97316]' />
              Chapter 5 Burndown &amp; Velocity Telemetry
            </h3>
            <button
              onClick={() => setBurndownOpen(false)}
              className='text-[#888888] hover:text-[#171717] p-1 rounded hover:bg-[#F3F1EB]'
            >
              <X className='w-4 h-4' />
            </button>
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4'>
            <div className='p-3.5 bg-[#FAF8F4] rounded border border-[#E7E7E7]'>
              <div className='flex items-center justify-between mb-1 text-[11px] font-mono text-[#888888] uppercase'>
                <span>Target Velocity</span>
                <TrendingUp className='w-4 h-4 text-[#F97316]' />
              </div>
              <div className='text-xl font-bold text-[#171717] font-display'>5.0 pgs / day</div>
              <p className='text-[11px] text-[#555555] mt-1 font-mono'>
                Remaining: 14 pages across 4 days
              </p>
            </div>

            <div className='p-3.5 bg-[#FAF8F4] rounded border border-[#E7E7E7]'>
              <div className='flex items-center justify-between mb-1 text-[11px] font-mono text-[#888888] uppercase'>
                <span>Inking Throughput</span>
                <Sparkles className='w-4 h-4 text-[#6D28D9]' />
              </div>
              <div className='text-xl font-bold text-[#171717] font-display'>3.2 hrs / page</div>
              <p className='text-[11px] text-[#059669] mt-1 font-mono font-semibold'>
                18% faster with Vector Auto-fill
              </p>
            </div>

            <div className='p-3.5 bg-[#FAF8F4] rounded border border-[#E7E7E7]'>
              <div className='flex items-center justify-between mb-1 text-[11px] font-mono text-[#888888] uppercase'>
                <span>Review Cycle Lag</span>
                <Clock className='w-4 h-4 text-[#D97706]' />
              </div>
              <div className='text-xl font-bold text-[#171717] font-display'>1.4 hrs avg</div>
              <p className='text-[11px] text-[#555555] mt-1 font-mono'>
                Editorial sign-offs on schedule
              </p>
            </div>

            <div className='p-3.5 bg-[#FAF8F4] rounded border border-[#E7E7E7]'>
              <div className='flex items-center justify-between mb-1 text-[11px] font-mono text-[#888888] uppercase'>
                <span>Export Readiness</span>
                <CheckCircle className='w-4 h-4 text-[#10B981]' />
              </div>
              <div className='text-xl font-bold text-[#171717] font-display'>11 / 32 Ready</div>
              <p className='text-[11px] text-[#555555] mt-1 font-mono'>
                CMYK 600dpi separation verified
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main View Mode Selector Content */}
      <div className='flex-1 overflow-auto bg-[#F3F3F3]'>
        {/* ==================== SUB-VIEW 1: KANBAN BOARD (8 STAGES) ==================== */}
        {subView === 'board' && (
          <div className='p-6 overflow-x-auto h-full flex items-start gap-4 w-max custom-scrollbar'>
            {STAGES.map((stage) => {
              const stageCards = cardsByStage[stage.key];
              return (
                <div
                  key={stage.key}
                  className='flex flex-col min-w-[280px] max-w-[290px] shrink-0 bg-white rounded-xl border border-[#E7E7E7] shadow-xs'
                >
                  {/* Column Header */}
                  <div className='p-3 border-b border-[#E7E7E7] bg-[#FAF8F4] flex items-center justify-between rounded-t-xl'>
                    <div className='flex items-center gap-2'>
                      <span className={`w-2 h-2 rounded-full ${stage.dotColor}`}></span>
                      <span className='text-xs font-bold uppercase tracking-wider text-[#171717] font-display'>
                        {stage.label}
                      </span>
                      <span className='px-1.5 py-0.2 rounded bg-white text-[#171717] text-[10px] font-mono font-bold border border-[#E7E7E7]'>
                        {stageCards.length}
                      </span>
                    </div>
                    <button
                      onClick={onOpenNewCardModal}
                      className='w-6 h-6 rounded flex items-center justify-center text-[#888888] hover:text-[#171717] hover:bg-[#F3F1EB] transition-colors cursor-pointer'
                      title={`Quick add to ${stage.label}`}
                    >
                      <Plus className='w-3.5 h-3.5' />
                    </button>
                  </div>

                  {/* Column Cards Container */}
                  <div className='p-2.5 flex flex-col gap-2.5 min-h-[500px] overflow-y-auto max-h-[calc(100vh-16rem)] custom-scrollbar'>
                    {stageCards.map((card) => {
                      const isPage12 = card.pageNumber === 'PAGE 12';
                      const isPage8Review =
                        card.pageNumber === 'PAGE 08' && card.stage === 'review';

                      return (
                        <article
                          key={card.id}
                          onClick={() => onOpenCardDetails(card)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col shadow-xs group ${
                            isPage12
                              ? 'border-2 border-[#171717] bg-white hover:border-[#F97316] ring-2 ring-[#F97316]/10'
                              : isPage8Review
                                ? 'border-2 border-[#F59E0B] bg-white hover:border-[#171717]'
                                : 'border-[#E7E7E7] bg-white hover:border-[#171717]'
                          }`}
                        >
                          {/* Card Top Pill Row */}
                          <div className='flex items-center justify-between mb-2'>
                            <div className='flex items-center gap-1.5'>
                              <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded tracking-wider ${
                                  isPage12
                                    ? 'bg-[#171717] text-white'
                                    : 'bg-[#F3F1EB] text-[#171717]'
                                }`}
                              >
                                {card.pageNumber}
                              </span>
                              {card.subTitle && (
                                <span className='text-[10px] text-[#888888]'>{card.subTitle}</span>
                              )}
                            </div>

                            {card.aiAssistBadge ? (
                              <span className='bg-[#F3E8FF] text-[#6D28D9] border border-[#8B5CF6]/30 font-medium px-2 py-0.5 rounded text-[10px] flex items-center gap-1'>
                                <Sparkles className='w-3 h-3' />
                                {card.aiAssistBadge}
                              </span>
                            ) : card.isOverdue ? (
                              <span className='bg-[#FFFBEB] text-[#D97706] border border-[#F59E0B]/30 font-medium px-2 py-0.5 rounded text-[10px] flex items-center gap-1 font-mono'>
                                <Clock className='w-3 h-3' />
                                Pending Review
                              </span>
                            ) : card.statusBadge ? (
                              <span className='text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-[#F8F6F0] text-[#555555] border border-[#E7E7E7]'>
                                {card.statusBadge}
                              </span>
                            ) : card.scriptVersion ? (
                              <span className='text-[10px] font-mono text-[#888888]'>
                                {card.scriptVersion}
                              </span>
                            ) : null}
                          </div>

                          {/* Image or Wireframe preview if available */}
                          {card.imageUrl ? (
                            <div className='relative w-full h-28 bg-[#171717] rounded-lg border border-[#E7E7E7] overflow-hidden mb-2.5'>
                              <img
                                src={card.imageUrl}
                                alt={card.title}
                                className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                              />
                              {card.wireframeText && (
                                <div className='absolute bottom-1 right-1 bg-black/80 text-white font-mono text-[9px] px-1.5 py-0.5 rounded'>
                                  {card.wireframeText}
                                </div>
                              )}
                            </div>
                          ) : card.stage === 'thumbnail' && card.pageNumber === 'PAGE 18' ? (
                            <div className='w-full h-16 bg-[#F8F6F0] rounded border border-[#E7E7E7] p-1.5 grid grid-cols-3 gap-1 mb-2'>
                              <div className='bg-white border border-[#E7E7E7] col-span-2'></div>
                              <div className='bg-white border border-[#E7E7E7]'></div>
                              <div className='bg-white border border-[#E7E7E7]'></div>
                              <div className='bg-white border border-[#E7E7E7] col-span-2'></div>
                            </div>
                          ) : null}

                          {/* Overdue Banner if applicable */}
                          {card.isOverdue && (
                            <div className='bg-[#FEF2F2] border border-[#EF4444]/30 p-2 rounded-md flex items-center justify-between mb-2'>
                              <span className='text-[11px] font-bold text-[#DC2626] flex items-center gap-1'>
                                <AlertTriangle className='w-3.5 h-3.5 text-[#DC2626]' />
                                Overdue: {card.dueText}
                              </span>
                              <span className='text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-[#FEE2E2] text-[#DC2626]'>
                                {card.overdueText}
                              </span>
                            </div>
                          )}

                          {/* Editorial Note if applicable */}
                          {card.editorialNote && (
                            <div className='p-2 bg-[#FFFBEB] rounded border border-[#F59E0B]/20 mb-2 text-[11px] text-[#92400E]'>
                              <strong>Editorial Note:</strong> {card.editorialNote}
                            </div>
                          )}

                          {/* Card Title / Description */}
                          <p className='text-xs font-medium text-[#171717] line-clamp-2 leading-relaxed mb-2.5'>
                            {card.title}
                          </p>

                          {/* Tags */}
                          {card.tags && card.tags.length > 0 && (
                            <div className='flex flex-wrap items-center gap-1 mb-3'>
                              {card.tags.map((t, idx) => (
                                <span
                                  key={idx}
                                  className='text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#F8F6F0] text-[#555555] border border-[#E7E7E7]'
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Card Footer */}
                          <div className='mt-auto pt-2 border-t border-[#F3F1EB] flex items-center justify-between'>
                            <div className='flex items-center gap-1.5'>
                              <div
                                className='w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center'
                                style={{ backgroundColor: card.avatarBg }}
                                title={`${card.assignee} (${card.assigneeRole})`}
                              >
                                {card.assigneeInitials}
                              </div>
                              <span className='text-[11px] text-[#555555]'>{card.assignee}</span>
                            </div>

                            {/* Action Button */}
                            <div
                              className='flex items-center gap-1'
                              onClick={(e) => e.stopPropagation()}
                            >
                              {card.stage === 'review' ? (
                                <button
                                  onClick={() => advanceStage(card)}
                                  className='px-2 py-0.5 bg-[#10B981] hover:bg-[#059669] text-white text-[10px] font-semibold rounded flex items-center gap-1 transition-colors cursor-pointer'
                                  title='Approve Stage'
                                >
                                  <Check className='w-3 h-3' />
                                  <span>Approve</span>
                                </button>
                              ) : card.stage === 'pencil' ? (
                                <button
                                  onClick={() => advanceStage(card)}
                                  className='px-2 py-0.5 bg-[#171717] hover:bg-black text-white text-[10px] font-semibold rounded flex items-center gap-1 transition-colors cursor-pointer'
                                  title='Move to Ink'
                                >
                                  <span>To Ink</span>
                                  <ArrowRight className='w-3 h-3' />
                                </button>
                              ) : (
                                <button
                                  onClick={() => advanceStage(card)}
                                  className='w-6 h-6 rounded flex items-center justify-center text-[#888888] hover:text-[#171717] hover:bg-[#F3F1EB] transition-colors cursor-pointer'
                                  title='Advance to next stage'
                                >
                                  <ArrowRight className='w-3.5 h-3.5' />
                                </button>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}

                    {stageCards.length === 0 && (
                      <div className='p-8 text-center border-2 border-dashed border-[#E7E7E7] rounded-lg'>
                        <span className='text-xs text-[#888888] font-mono'>
                          No pages in this stage
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ==================== SUB-VIEW 2: PRODUCTION SHEET (LIST VIEW) ==================== */}
        {subView === 'list' && (
          <div className='p-6'>
            <div className='bg-white rounded-xl border border-[#E7E7E7] shadow-xs overflow-hidden'>
              <div className='p-4 bg-[#FAF8F4] border-b border-[#E7E7E7] flex flex-wrap items-center justify-between gap-3'>
                <div className='flex items-center gap-3'>
                  <h3 className='text-base font-bold font-display text-[#171717] flex items-center gap-2'>
                    <Layers className='w-4 h-4 text-[#F97316]' />
                    Production Sheet: Chapter {activeProject?.chapter || '1'}
                  </h3>
                  <span className='px-2 py-0.5 bg-white border border-[#E7E7E7] rounded text-xs font-mono font-bold text-[#171717]'>
                    {filteredCards.length} Pages Listed
                  </span>
                </div>
                <div className='flex items-center gap-3 text-xs text-[#555555] font-mono'>
                  <span className='flex items-center gap-1'>
                    <span className='w-2 h-2 rounded-full bg-[#10B981]'></span>
                    11 Approved
                  </span>
                  <span className='flex items-center gap-1'>
                    <span className='w-2 h-2 rounded-full bg-[#F59E0B]'></span>1 Late Review
                  </span>
                  <span className='flex items-center gap-1'>
                    <span className='w-2 h-2 rounded-full bg-[#F97316]'></span>
                    In Progress
                  </span>
                </div>
              </div>

              <div className='overflow-x-auto'>
                <table className='w-full text-left border-collapse text-xs'>
                  <thead className='bg-[#F8F6F0] border-b border-[#E7E7E7] text-[#555555] font-mono uppercase text-[11px]'>
                    <tr>
                      <th className='p-3.5 pl-5 w-12'>
                        <input type='checkbox' className='rounded border-[#E7E7E7]' />
                      </th>
                      <th className='p-3.5 font-semibold'>Page # &amp; Cut</th>
                      <th className='p-3.5 font-semibold'>Scene Description</th>
                      <th className='p-3.5 font-semibold'>Pipeline Stage</th>
                      <th className='p-3.5 font-semibold'>Assignee</th>
                      <th className='p-3.5 font-semibold'>Deadline</th>
                      <th className='p-3.5 font-semibold'>AI Continuity</th>
                      <th className='p-3.5 pr-5 text-right font-semibold'>Actions</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-[#E7E7E7]'>
                    {filteredCards.map((card) => (
                      <tr
                        key={card.id}
                        onClick={() => onOpenCardDetails(card)}
                        className='hover:bg-[#FAF8F4] transition-colors cursor-pointer'
                      >
                        <td className='p-3.5 pl-5' onClick={(e) => e.stopPropagation()}>
                          <input type='checkbox' className='rounded border-[#E7E7E7]' />
                        </td>
                        <td className='p-3.5'>
                          <div className='flex items-center gap-2.5'>
                            <div className='w-9 h-9 rounded bg-[#F8F6F0] border border-[#E7E7E7] flex items-center justify-center font-bold text-[#171717] shrink-0 font-mono text-[11px]'>
                              {card.pageNumber.replace('PAGE ', 'P')}
                            </div>
                            <div>
                              <div className='font-bold text-[#171717] flex items-center gap-1.5'>
                                {card.pageNumber}
                                {card.subTitle && (
                                  <span className='px-1.5 py-0.2 rounded bg-[#FFF7ED] text-[#C2410C] font-semibold text-[10px]'>
                                    {card.subTitle}
                                  </span>
                                )}
                              </div>
                              <span className='text-[11px] text-[#888888] font-mono'>
                                {card.pageType} Sequence
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className='p-3.5 font-medium text-[#171717] max-w-xs truncate'>
                          {card.title}
                        </td>
                        <td className='p-3.5'>
                          <span className='px-2.5 py-1 rounded bg-[#F8F6F0] text-[#171717] border border-[#E7E7E7] font-semibold text-[11px] uppercase font-mono'>
                            {card.stage}
                          </span>
                        </td>
                        <td className='p-3.5'>
                          <div className='flex items-center gap-1.5'>
                            <div
                              className='w-5 h-5 rounded-full text-white flex items-center justify-center text-[9px] font-bold'
                              style={{ backgroundColor: card.avatarBg }}
                            >
                              {card.assigneeInitials}
                            </div>
                            <span className='font-medium text-[#171717]'>{card.assignee}</span>
                          </div>
                        </td>
                        <td className='p-3.5'>
                          <span
                            className={
                              card.isOverdue ? 'text-[#DC2626] font-bold' : 'text-[#171717]'
                            }
                          >
                            {card.dueText}
                          </span>
                          {card.isOverdue && (
                            <span className='block text-[10px] text-[#DC2626] font-bold'>
                              {card.overdueText}
                            </span>
                          )}
                        </td>
                        <td className='p-3.5'>
                          <span className='px-2 py-0.5 rounded bg-[#F3E8FF] text-[#6D28D9] border border-[#8B5CF6]/30 font-semibold text-[10px] flex items-center gap-1 w-max font-mono'>
                            <Sparkles className='w-3 h-3' />
                            99.4% Verified
                          </span>
                        </td>
                        <td className='p-3.5 pr-5 text-right' onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onOpenCardDetails(card)}
                            className='px-2.5 py-1 bg-white border border-[#E7E7E7] hover:border-[#171717] rounded text-[11px] font-semibold text-[#171717] transition-all shadow-2xs cursor-pointer'
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SUB-VIEW 3: CONTACT SHEET GALLERY (GRID VIEW) ==================== */}
        {subView === 'grid' && (
          <div className='p-6'>
            <div className='mb-4 flex items-center justify-between'>
              <div>
                <h3 className='text-base font-bold font-display text-[#171717] flex items-center gap-2'>
                  <Grid className='w-4 h-4 text-[#F97316]' />
                  Contact Sheet Gallery
                </h3>
                <p className='text-xs text-[#555555]'>
                  Showing {filteredCards.length} manga story page spreads in standard B5 aspect
                  ratio (2:3)
                </p>
              </div>
              <span className='text-xs font-mono text-[#888888] bg-white px-2.5 py-1 rounded border border-[#E7E7E7]'>
                Aspect: B5 Manga (600 DPI)
              </span>
            </div>

            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4'>
              {filteredCards.map((card) => (
                <div
                  key={card.id}
                  onClick={() => onOpenCardDetails(card)}
                  className='bg-white rounded-xl border border-[#E7E7E7] hover:border-[#171717] p-2.5 shadow-xs hover:shadow-md cursor-pointer group transition-all flex flex-col justify-between'
                >
                  <div className='relative w-full aspect-[2/3] bg-[#171717] rounded-lg border border-[#E7E7E7] overflow-hidden mb-2'>
                    {card.imageUrl ? (
                      <img
                        src={card.imageUrl}
                        alt={card.title}
                        className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                      />
                    ) : (
                      <div className='w-full h-full flex flex-col items-center justify-center p-3 text-center bg-[#F8F6F0]'>
                        <span className='font-mono text-xs font-bold text-[#171717]'>
                          {card.pageNumber}
                        </span>
                        <span className='text-[10px] text-[#888888] mt-1 font-mono uppercase'>
                          {card.stage}
                        </span>
                      </div>
                    )}
                    <div className='absolute top-2 left-2 bg-black/80 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded'>
                      {card.pageNumber}
                    </div>
                    {card.isOverdue && (
                      <div className='absolute top-2 right-2 bg-[#EF4444] text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded'>
                        Late
                      </div>
                    )}
                  </div>

                  <div className='text-[11px] font-semibold text-[#171717] truncate'>
                    {card.title}
                  </div>
                  <div className='flex items-center justify-between text-[10px] text-[#555555] mt-1 pt-1 border-t border-[#F3F1EB]'>
                    <span className='font-mono uppercase'>{card.stage}</span>
                    <span className='font-bold text-[#171717]'>{card.assignee}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
