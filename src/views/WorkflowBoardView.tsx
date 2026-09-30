import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
import { seriesService, SeriesMemberDto } from '../services/series.service';

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
  { key: 'script', label: '1. Script', dotColor: 'bg-zinc-900' },
  { key: 'thumbnail', label: '2. Thumbnail', dotColor: 'bg-blue-500' },
  { key: 'pencil', label: '3. Pencil', dotColor: 'bg-orange-600' },
  { key: 'ink', label: '4. Ink', dotColor: 'bg-zinc-900' },
  { key: 'color', label: '5. Color', dotColor: 'bg-cyan-700' },
  { key: 'letter', label: '6. Letter', dotColor: 'bg-purple-700' },
  { key: 'review', label: '7. Review', dotColor: 'bg-amber-500' },
  { key: 'approved', label: '8. Approved', dotColor: 'bg-emerald-500' },
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

  const { seriesId } = useParams();
  const [seriesMembers, setSeriesMembers] = useState<SeriesMemberDto[]>([]);

  useEffect(() => {
    if (seriesId) {
      const workspaceId = JSON.parse(localStorage.getItem('activeWorkspace') || '{}').id;
      if (workspaceId) {
        seriesService.getSeriesMembers(workspaceId, seriesId).then(data => {
          setSeriesMembers(data || []);
        }).catch(err => console.error(err));
      }
    }
  }, [seriesId]);

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
      <section className='bg-white px-6 py-4 border-b border-zinc-200 shrink-0'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          {/* Title & Progress Block */}
          <div className='flex items-center gap-6 min-w-0'>
            <div>
              <div className='flex items-center gap-2'>
                <span className='px-2 py-0.5 rounded bg-zinc-900 text-white  text-[10px] uppercase tracking-wider font-bold'>
                  ARC 02
                </span>
                <h1 className='text-xl lg:text-2xl font-bold  text-zinc-900 tracking-tight'>
                  Chapter {activeProject?.chapter || '1'}: {activeProject?.totalPages || 0} Total
                  Pages
                </h1>
              </div>
              <div className='flex items-center gap-3 mt-1.5 text-xs'>
                <span className='font-semibold text-zinc-900'>
                  {activeProject?.completedPages || 0} / {activeProject?.totalPages || 0} Completed
                </span>
                <span className='text-zinc-400  font-medium'>
                  (
                  {activeProject?.totalPages
                    ? Math.round(
                        ((activeProject.completedPages || 0) / activeProject.totalPages) * 100,
                      )
                    : 0}
                  %)
                </span>
                <div className='w-40 sm:w-52 h-2 bg-zinc-100 rounded-full overflow-hidden flex'>
                  <div
                    className='bg-orange-600 h-full transition-all duration-500'
                    style={{
                      width: `${activeProject?.totalPages ? ((activeProject.completedPages || 0) / activeProject.totalPages) * 100 : 0}%`,
                    }}
                  ></div>
                  <div className='bg-purple-700/30 h-full' style={{ width: '25%' }}></div>
                </div>
              </div>
            </div>

            {/* Inline Burndown Mini-Chart */}
            <div className='hidden xl:flex items-center gap-3 pl-6 border-l border-zinc-200'>
              <div className='flex flex-col'>
                <span className='text-[10px]  text-zinc-400 uppercase tracking-wider'>
                  Velocity Pace
                </span>
                <span className='text-sm font-bold text-zinc-900 '>+4.2 pgs / day</span>
              </div>
              <svg className='w-24 h-8 text-orange-600' fill='none' viewBox='0 0 96 32'>
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
            <div className='flex items-center gap-1.5 px-3 py-1 rounded bg-amber-50 text-amber-600 border border-amber-500/30 text-xs font-semibold'>
              <Clock className='w-3.5 h-3.5' />
              <span>4 Days to Print Deadline</span>
            </div>
            <div className='flex items-center gap-1.5 px-3 py-1 rounded bg-zinc-50 text-zinc-900 border border-zinc-200 text-xs font-semibold'>
              <CheckCircle className='w-3.5 h-3.5 text-emerald-500' />
              <span>0 Blocked</span>
            </div>
            <div className='flex items-center gap-1.5 px-3 py-1 rounded bg-purple-50 text-purple-700 border border-purple-500/30 text-xs font-semibold'>
              <Sparkles className='w-3.5 h-3.5' />
              <span>99.4% AI Continuity</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filter & Controls Toolbar */}
      <section className='bg-zinc-50 px-6 py-3 border-b border-zinc-200 shrink-0 shadow-sm'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          {/* Search and Dropdowns */}
          <div className='flex flex-wrap items-center gap-2.5'>
            {/* Search Input */}
            <div className='relative flex items-center'>
              <Search className='w-4 h-4 text-zinc-400 absolute left-2.5' />
              <input
                type='text'
                placeholder='Search pages, cuts, notes... (⌘K)'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='w-56 sm:w-64 pl-8 pr-3 py-1.5 bg-white rounded border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 transition-all'
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className='absolute right-2 text-zinc-400 hover:text-zinc-900 text-xs'
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
                className='appearance-none bg-white border border-zinc-200 pl-3 pr-8 py-1.5 rounded text-xs font-semibold text-zinc-900 focus:outline-none focus:border-zinc-900 cursor-pointer'
              >
                <option value='ALL'>Assignee: All Members</option>
                {seriesMembers.length > 0 ? seriesMembers.map(m => (
                  <option key={m.userId} value={m.fullName || m.email.split('@')[0]}>
                    {m.fullName || m.email.split('@')[0]} ({m.seriesRole || 'Member'})
                  </option>
                )) : (
                  <>
                    <option value='Kenji'>Kenji (Artist)</option>
                    <option value='Arata'>Arata (Writer)</option>
                    <option value='Mei'>Mei (Artist)</option>
                  </>
                )}
                <option value='Yuto'>Yuto (Artist)</option>
                <option value='Tatsuki'>Tatsuki F. (Lead)</option>
              </select>
              <ChevronDown className='w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none' />
            </div>

            {/* Stage Dropdown */}
            <div className='relative'>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className='appearance-none bg-white border border-zinc-200 pl-3 pr-8 py-1.5 rounded text-xs font-semibold text-zinc-900 focus:outline-none focus:border-zinc-900 cursor-pointer'
              >
                <option value='ALL'>Stages: All (8 Stages)</option>
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronDown className='w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none' />
            </div>

            {/* Page Type Dropdown */}
            <div className='relative'>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className='appearance-none bg-white border border-zinc-200 pl-3 pr-8 py-1.5 rounded text-xs font-semibold text-zinc-900 focus:outline-none focus:border-zinc-900 cursor-pointer'
              >
                <option value='ALL'>Page Type: All</option>
                <option value='Spread'>Spread / Splash</option>
                <option value='Action'>Action Sequence</option>
                <option value='Dialogue'>Dialogue Heavy</option>
              </select>
              <ChevronDown className='w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none' />
            </div>
          </div>

          {/* View Controls & Action Buttons */}
          <div className='flex items-center gap-2.5'>
            {/* View Switchers */}
            <div className='flex items-center bg-white rounded p-0.5 border border-zinc-200'>
              <button
                onClick={() => setSubView('board')}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  subView === 'board'
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'
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
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'
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
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'
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
              className='px-3 py-1.5 rounded bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer'
            >
              <TrendingUp className='w-3.5 h-3.5 text-orange-600' />
              <span>Burndown Analytics</span>
            </button>

            {/* + New Page Card */}
            <button
              onClick={onOpenNewCardModal}
              className='px-3.5 py-1.5 rounded bg-zinc-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95'
            >
              <Plus className='w-3.5 h-3.5' />
              <span>+ New Page Card</span>
            </button>
          </div>
        </div>
      </section>

      {/* Burndown Analytics Slide-Over Drawer */}
      {burndownOpen && (
        <div className='bg-white border-b border-zinc-200 px-6 py-4 transition-all duration-300 shrink-0 shadow-inner'>
          <div className='flex items-center justify-between mb-3'>
            <h3 className='text-sm font-bold text-zinc-900 flex items-center gap-2 '>
              <TrendingUp className='w-4 h-4 text-orange-600' />
              Chapter 5 Burndown &amp; Velocity Telemetry
            </h3>
            <button
              onClick={() => setBurndownOpen(false)}
              className='text-zinc-400 hover:text-zinc-900 p-1 rounded hover:bg-zinc-100'
            >
              <X className='w-4 h-4' />
            </button>
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4'>
            <div className='p-3.5 bg-zinc-50 rounded border border-zinc-200'>
              <div className='flex items-center justify-between mb-1 text-[11px]  text-zinc-400 uppercase'>
                <span>Target Velocity</span>
                <TrendingUp className='w-4 h-4 text-orange-600' />
              </div>
              <div className='text-xl font-bold text-zinc-900 '>5.0 pgs / day</div>
              <p className='text-[11px] text-zinc-600 mt-1 '>
                Remaining: 14 pages across 4 days
              </p>
            </div>

            <div className='p-3.5 bg-zinc-50 rounded border border-zinc-200'>
              <div className='flex items-center justify-between mb-1 text-[11px]  text-zinc-400 uppercase'>
                <span>Inking Throughput</span>
                <Sparkles className='w-4 h-4 text-purple-700' />
              </div>
              <div className='text-xl font-bold text-zinc-900 '>3.2 hrs / page</div>
              <p className='text-[11px] text-emerald-600 mt-1  font-semibold'>
                18% faster with Vector Auto-fill
              </p>
            </div>

            <div className='p-3.5 bg-zinc-50 rounded border border-zinc-200'>
              <div className='flex items-center justify-between mb-1 text-[11px]  text-zinc-400 uppercase'>
                <span>Review Cycle Lag</span>
                <Clock className='w-4 h-4 text-amber-600' />
              </div>
              <div className='text-xl font-bold text-zinc-900 '>1.4 hrs avg</div>
              <p className='text-[11px] text-zinc-600 mt-1 '>
                Editorial sign-offs on schedule
              </p>
            </div>

            <div className='p-3.5 bg-zinc-50 rounded border border-zinc-200'>
              <div className='flex items-center justify-between mb-1 text-[11px]  text-zinc-400 uppercase'>
                <span>Export Readiness</span>
                <CheckCircle className='w-4 h-4 text-emerald-500' />
              </div>
              <div className='text-xl font-bold text-zinc-900 '>11 / 32 Ready</div>
              <p className='text-[11px] text-zinc-600 mt-1 '>
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
                  className='flex flex-col min-w-[280px] max-w-[290px] shrink-0 bg-white rounded-xl border border-zinc-200 shadow-sm'
                >
                  {/* Column Header */}
                  <div className='p-3 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between rounded-t-xl'>
                    <div className='flex items-center gap-2'>
                      <span className={`w-2 h-2 rounded-full ${stage.dotColor}`}></span>
                      <span className='text-xs font-bold uppercase tracking-wider text-zinc-900 '>
                        {stage.label}
                      </span>
                      <span className='px-1.5 py-0.2 rounded bg-white text-zinc-900 text-[10px]  font-bold border border-zinc-200'>
                        {stageCards.length}
                      </span>
                    </div>
                    <button
                      onClick={onOpenNewCardModal}
                      className='w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer'
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
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col shadow-sm group ${
                            isPage12
                              ? 'border-2 border-zinc-900 bg-white hover:border-orange-600 ring-2 ring-orange-600/10'
                              : isPage8Review
                                ? 'border-2 border-amber-500 bg-white hover:border-zinc-900'
                                : 'border-zinc-200 bg-white hover:border-zinc-900'
                          }`}
                        >
                          {/* Card Top Pill Row */}
                          <div className='flex items-center justify-between mb-2'>
                            <div className='flex items-center gap-1.5'>
                              <span
                                className={`text-[10px]  font-bold px-1.5 py-0.5 rounded tracking-wider ${
                                  isPage12
                                    ? 'bg-zinc-900 text-white'
                                    : 'bg-zinc-100 text-zinc-900'
                                }`}
                              >
                                {card.pageNumber}
                              </span>
                              {card.subTitle && (
                                <span className='text-[10px] text-zinc-400'>{card.subTitle}</span>
                              )}
                            </div>

                            {card.aiAssistBadge ? (
                              <span className='bg-purple-50 text-purple-700 border border-purple-500/30 font-medium px-2 py-0.5 rounded text-[10px] flex items-center gap-1'>
                                <Sparkles className='w-3 h-3' />
                                {card.aiAssistBadge}
                              </span>
                            ) : card.isOverdue ? (
                              <span className='bg-amber-50 text-amber-600 border border-amber-500/30 font-medium px-2 py-0.5 rounded text-[10px] flex items-center gap-1 '>
                                <Clock className='w-3 h-3' />
                                Pending Review
                              </span>
                            ) : card.statusBadge ? (
                              <span className='text-[10px]  font-medium px-1.5 py-0.5 rounded bg-zinc-50 text-zinc-600 border border-zinc-200'>
                                {card.statusBadge}
                              </span>
                            ) : card.scriptVersion ? (
                              <span className='text-[10px]  text-zinc-400'>
                                {card.scriptVersion}
                              </span>
                            ) : null}
                          </div>

                          {/* Image or Wireframe preview if available */}
                          {card.imageUrl ? (
                            <div className='relative w-full h-28 bg-zinc-900 rounded-lg border border-zinc-200 overflow-hidden mb-2.5'>
                              <img
                                src={card.imageUrl}
                                alt={card.title}
                                className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                              />
                              {card.wireframeText && (
                                <div className='absolute bottom-1 right-1 bg-black/80 text-white  text-[9px] px-1.5 py-0.5 rounded'>
                                  {card.wireframeText}
                                </div>
                              )}
                            </div>
                          ) : card.stage === 'thumbnail' && card.pageNumber === 'PAGE 18' ? (
                            <div className='w-full h-16 bg-zinc-50 rounded border border-zinc-200 p-1.5 grid grid-cols-3 gap-1 mb-2'>
                              <div className='bg-white border border-zinc-200 col-span-2'></div>
                              <div className='bg-white border border-zinc-200'></div>
                              <div className='bg-white border border-zinc-200'></div>
                              <div className='bg-white border border-zinc-200 col-span-2'></div>
                            </div>
                          ) : null}

                          {/* Overdue Banner if applicable */}
                          {card.isOverdue && (
                            <div className='bg-[#FEF2F2] border border-[#EF4444]/30 p-2 rounded-md flex items-center justify-between mb-2'>
                              <span className='text-[11px] font-bold text-[#DC2626] flex items-center gap-1'>
                                <AlertTriangle className='w-3.5 h-3.5 text-[#DC2626]' />
                                Overdue: {card.dueText}
                              </span>
                              <span className='text-[10px] font-bold  px-1.5 py-0.2 rounded bg-[#FEE2E2] text-[#DC2626]'>
                                {card.overdueText}
                              </span>
                            </div>
                          )}

                          {/* Editorial Note if applicable */}
                          {card.editorialNote && (
                            <div className='p-2 bg-amber-50 rounded border border-amber-500/20 mb-2 text-[11px] text-[#92400E]'>
                              <strong>Editorial Note:</strong> {card.editorialNote}
                            </div>
                          )}

                          {/* Card Title / Description */}
                          <p className='text-xs font-medium text-zinc-900 line-clamp-2 leading-relaxed mb-2.5'>
                            {card.title}
                          </p>

                          {/* Tags */}
                          {card.tags && card.tags.length > 0 && (
                            <div className='flex flex-wrap items-center gap-1 mb-3'>
                              {card.tags.map((t, idx) => (
                                <span
                                  key={idx}
                                  className='text-[9px]  px-1.5 py-0.5 rounded bg-zinc-50 text-zinc-600 border border-zinc-200'
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Card Footer */}
                          <div className='mt-auto pt-2 border-t border-zinc-100 flex items-center justify-between'>
                            <div className='flex items-center gap-1.5'>
                              <div
                                className='w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center'
                                style={{ backgroundColor: card.avatarBg }}
                                title={`${card.assignee} (${card.assigneeRole})`}
                              >
                                {card.assigneeInitials}
                              </div>
                              <span className='text-[11px] text-zinc-600'>{card.assignee}</span>
                            </div>

                            {/* Action Button */}
                            <div
                              className='flex items-center gap-1'
                              onClick={(e) => e.stopPropagation()}
                            >
                              {card.stage === 'review' ? (
                                <button
                                  onClick={() => advanceStage(card)}
                                  className='px-2 py-0.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-semibold rounded flex items-center gap-1 transition-colors cursor-pointer'
                                  title='Approve Stage'
                                >
                                  <Check className='w-3 h-3' />
                                  <span>Approve</span>
                                </button>
                              ) : card.stage === 'pencil' ? (
                                <button
                                  onClick={() => advanceStage(card)}
                                  className='px-2 py-0.5 bg-zinc-900 hover:bg-black text-white text-[10px] font-semibold rounded flex items-center gap-1 transition-colors cursor-pointer'
                                  title='Move to Ink'
                                >
                                  <span>To Ink</span>
                                  <ArrowRight className='w-3 h-3' />
                                </button>
                              ) : (
                                <button
                                  onClick={() => advanceStage(card)}
                                  className='w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer'
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
                      <div className='p-8 text-center border-2 border-dashed border-zinc-200 rounded-lg'>
                        <span className='text-xs text-zinc-400 '>
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
            <div className='bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden'>
              <div className='p-4 bg-zinc-50 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3'>
                <div className='flex items-center gap-3'>
                  <h3 className='text-base font-bold  text-zinc-900 flex items-center gap-2'>
                    <Layers className='w-4 h-4 text-orange-600' />
                    Production Sheet: Chapter {activeProject?.chapter || '1'}
                  </h3>
                  <span className='px-2 py-0.5 bg-white border border-zinc-200 rounded text-xs  font-bold text-zinc-900'>
                    {filteredCards.length} Pages Listed
                  </span>
                </div>
                <div className='flex items-center gap-3 text-xs text-zinc-600 '>
                  <span className='flex items-center gap-1'>
                    <span className='w-2 h-2 rounded-full bg-emerald-500'></span>
                    11 Approved
                  </span>
                  <span className='flex items-center gap-1'>
                    <span className='w-2 h-2 rounded-full bg-amber-500'></span>1 Late Review
                  </span>
                  <span className='flex items-center gap-1'>
                    <span className='w-2 h-2 rounded-full bg-orange-600'></span>
                    In Progress
                  </span>
                </div>
              </div>

              <div className='overflow-x-auto'>
                <table className='w-full text-left border-collapse text-xs'>
                  <thead className='bg-zinc-50 border-b border-zinc-200 text-zinc-600  uppercase text-[11px]'>
                    <tr>
                      <th className='p-3.5 pl-5 w-12'>
                        <input type='checkbox' className='rounded border-zinc-200' />
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
                  <tbody className='divide-y divide-zinc-200'>
                    {filteredCards.map((card) => (
                      <tr
                        key={card.id}
                        onClick={() => onOpenCardDetails(card)}
                        className='hover:bg-zinc-50 transition-colors cursor-pointer'
                      >
                        <td className='p-3.5 pl-5' onClick={(e) => e.stopPropagation()}>
                          <input type='checkbox' className='rounded border-zinc-200' />
                        </td>
                        <td className='p-3.5'>
                          <div className='flex items-center gap-2.5'>
                            <div className='w-9 h-9 rounded bg-zinc-50 border border-zinc-200 flex items-center justify-center font-bold text-zinc-900 shrink-0  text-[11px]'>
                              {card.pageNumber.replace('PAGE ', 'P')}
                            </div>
                            <div>
                              <div className='font-bold text-zinc-900 flex items-center gap-1.5'>
                                {card.pageNumber}
                                {card.subTitle && (
                                  <span className='px-1.5 py-0.2 rounded bg-orange-50 text-orange-700 font-semibold text-[10px]'>
                                    {card.subTitle}
                                  </span>
                                )}
                              </div>
                              <span className='text-[11px] text-zinc-400 '>
                                {card.pageType} Sequence
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className='p-3.5 font-medium text-zinc-900 max-w-xs truncate'>
                          {card.title}
                        </td>
                        <td className='p-3.5'>
                          <span className='px-2.5 py-1 rounded bg-zinc-50 text-zinc-900 border border-zinc-200 font-semibold text-[11px] uppercase '>
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
                            <span className='font-medium text-zinc-900'>{card.assignee}</span>
                          </div>
                        </td>
                        <td className='p-3.5'>
                          <span
                            className={
                              card.isOverdue ? 'text-[#DC2626] font-bold' : 'text-zinc-900'
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
                          <span className='px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-500/30 font-semibold text-[10px] flex items-center gap-1 w-max '>
                            <Sparkles className='w-3 h-3' />
                            99.4% Verified
                          </span>
                        </td>
                        <td className='p-3.5 pr-5 text-right' onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onOpenCardDetails(card)}
                            className='px-2.5 py-1 bg-white border border-zinc-200 hover:border-zinc-900 rounded text-[11px] font-semibold text-zinc-900 transition-all shadow-sm cursor-pointer'
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
                <h3 className='text-base font-bold  text-zinc-900 flex items-center gap-2'>
                  <Grid className='w-4 h-4 text-orange-600' />
                  Contact Sheet Gallery
                </h3>
                <p className='text-xs text-zinc-600'>
                  Showing {filteredCards.length} manga story page spreads in standard B5 aspect
                  ratio (2:3)
                </p>
              </div>
              <span className='text-xs  text-zinc-400 bg-white px-2.5 py-1 rounded border border-zinc-200'>
                Aspect: B5 Manga (600 DPI)
              </span>
            </div>

            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4'>
              {filteredCards.map((card) => (
                <div
                  key={card.id}
                  onClick={() => onOpenCardDetails(card)}
                  className='bg-white rounded-xl border border-zinc-200 hover:border-zinc-900 p-2.5 shadow-sm hover:shadow-md cursor-pointer group transition-all flex flex-col justify-between'
                >
                  <div className='relative w-full aspect-[2/3] bg-zinc-900 rounded-lg border border-zinc-200 overflow-hidden mb-2'>
                    {card.imageUrl ? (
                      <img
                        src={card.imageUrl}
                        alt={card.title}
                        className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                      />
                    ) : (
                      <div className='w-full h-full flex flex-col items-center justify-center p-3 text-center bg-zinc-50'>
                        <span className=' text-xs font-bold text-zinc-900'>
                          {card.pageNumber}
                        </span>
                        <span className='text-[10px] text-zinc-400 mt-1  uppercase'>
                          {card.stage}
                        </span>
                      </div>
                    )}
                    <div className='absolute top-2 left-2 bg-black/80 text-white  text-[9px] font-bold px-1.5 py-0.5 rounded'>
                      {card.pageNumber}
                    </div>
                    {card.isOverdue && (
                      <div className='absolute top-2 right-2 bg-[#EF4444] text-white  text-[9px] font-bold px-1.5 py-0.5 rounded'>
                        Late
                      </div>
                    )}
                  </div>

                  <div className='text-[11px] font-semibold text-zinc-900 truncate'>
                    {card.title}
                  </div>
                  <div className='flex items-center justify-between text-[10px] text-zinc-600 mt-1 pt-1 border-t border-zinc-100'>
                    <span className=' uppercase'>{card.stage}</span>
                    <span className='font-bold text-zinc-900'>{card.assignee}</span>
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
