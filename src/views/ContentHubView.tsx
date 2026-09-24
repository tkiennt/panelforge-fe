import React, { useState } from 'react';
import {
  Folder,
  Plus,
  ArrowRight,
  Clock,
  Search,
  Sparkles,
  ChevronDown,
  LayoutGrid,
  TrendingUp,
  BookOpen,
  Calendar,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { MangaProject, ViewMode } from '../types';
import { CreateProjectModal } from '../components/CreateProjectModal';

interface ContentHubViewProps {
  projects: MangaProject[];
  onSelectProject: (proj: MangaProject) => void;
  onNavigateView?: (view: ViewMode) => void;
  onEnterProject: (proj: MangaProject, targetView?: ViewMode) => void;
  onCreateNewProject: (project?: MangaProject) => void;
  onOpenExportModal: () => void;
  isRootView?: boolean;
}

export const ContentHubView: React.FC<ContentHubViewProps> = ({
  projects,
  onSelectProject,
  onEnterProject,
  onCreateNewProject,
  isRootView = true,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<string>('ALL');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Filter projects according to tab, format, and search/tag
  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const tagQ = tagFilter.toLowerCase().trim();

    const matchesSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.subtitle.toLowerCase().includes(q) ||
      p.arc.toLowerCase().includes(q) ||
      (p.tagline && p.tagline.toLowerCase().includes(q));

    const matchesTag =
      !tagQ ||
      p.genres?.some((g) => g.toLowerCase().includes(tagQ)) ||
      p.arc.toLowerCase().includes(tagQ);

    let matchesFilter = true;
    if (filter === 'ACTIVE') {
      matchesFilter = p.progressPercent < 100;
    } else if (filter === 'COMPLETED') {
      matchesFilter = p.progressPercent >= 100 || p.status.toLowerCase().includes('completed');
    }

    let matchesFormat = true;
    if (formatFilter !== 'ALL') {
      matchesFormat = p.format.toLowerCase().includes(formatFilter.toLowerCase());
    }

    return matchesSearch && matchesTag && matchesFilter && matchesFormat;
  });

  // Calculate high-level summary KPIs matching the screenshot
  const activeSeriesCount = projects.filter((p) => p.progressPercent < 100).length;
  const totalCompletedPages = projects.reduce((acc, p) => acc + (p.completedPages || 0), 0);
  const totalTargetPages = projects.reduce((acc, p) => acc + (p.totalPages || 0), 0);
  const completionRate =
    totalTargetPages > 0 ? ((totalCompletedPages / totalTargetPages) * 100).toFixed(1) : '69.5';

  const handleCreateSubmit = (newProject: MangaProject) => {
    onCreateNewProject(newProject);
    setIsCreateModalOpen(false);
  };

  return (
    <div className='min-h-screen bg-[#F8F6F0] text-[#171717] font-sans antialiased flex flex-col'>
      {/* Outer Studio Window Title Bar */}
      {isRootView && (
        <div className='bg-[#171717] text-white px-4 py-1.5 flex items-center justify-between text-xs border-b border-[#2C2C2C]'>
          <div className='flex items-center gap-2 font-mono text-[11px] text-[#A3A3A3]'>
            <span className='w-2.5 h-2.5 rounded-full bg-[#EF4444] inline-block'></span>
            <span className='w-2.5 h-2.5 rounded-full bg-[#F59E0B] inline-block'></span>
            <span className='w-2.5 h-2.5 rounded-full bg-[#10B981] inline-block'></span>
            <span className='ml-2 font-display font-semibold text-white tracking-tight flex items-center gap-1.5'>
              <span className='px-1 py-0.2 bg-white/20 text-white rounded text-[9px]'>PF</span>
              PanelForge - Studio Content Hub
            </span>
          </div>
          <div className='text-[10px] font-mono text-[#737373]'>
            Mappa Private Model Mesh • Latency: 14ms
          </div>
        </div>
      )}

      {/* Main Studio Top Navigation Bar */}
      <header className='bg-white border-b border-[#E7E7E7] px-6 lg:px-10 py-3 flex items-center justify-between sticky top-0 z-30 shadow-2xs'>
        {/* Left: Studio Identity & Content Hub Breadcrumb */}
        <div className='flex items-center gap-3'>
          <div className='w-8 h-8 rounded-lg bg-[#171717] flex items-center justify-center text-white font-bold text-sm tracking-tighter shadow-xs'>
            PF
          </div>
          <div>
            <div className='font-bold text-sm tracking-tight text-[#171717] flex items-center gap-1.5 font-display'>
              PANELFORGE
            </div>
            <div className='text-[10px] text-[#888888] tracking-wide font-mono'>
              MANGA STUDIO AI
            </div>
          </div>

          <div className='hidden sm:flex items-center gap-1.5 ml-2 px-3 py-1 rounded-lg bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] text-xs font-semibold'>
            <Folder className='w-3.5 h-3.5 text-[#D97706]' />
            <span>Studio Content Hub • Mappa Co.</span>
          </div>
        </div>

        {/* Center: Search Manga Series (⌘K) */}
        <div className='hidden md:flex items-center flex-1 max-w-md mx-6'>
          <div className='relative w-full'>
            <Search className='w-3.5 h-3.5 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2' />
            <input
              type='text'
              placeholder='Search manga series, cuts, arcs (⌘K)...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full pl-9 pr-12 py-1.5 bg-[#FAF8F4] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-[#171717] placeholder-[#888888] focus:outline-none focus:border-[#F97316] transition-all'
            />
            <kbd className='absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-white text-[10px] font-mono text-[#888888] border border-[#E7E7E7] shadow-2xs'>
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right: LoRA Engine Status & Producer Badge */}
        <div className='flex items-center gap-3'>
          <div className='hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F5F3FF] text-[#6D28D9] border border-[#DDD6FE] text-xs font-mono font-medium'>
            <span className='w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse'></span>
            <span>LoRA Engine: v4.2 Active</span>
          </div>

          <div className='flex items-center gap-2 pl-2 border-l border-[#E7E7E7]'>
            <div className='w-8 h-8 rounded-full bg-[#C2410C] text-white font-semibold text-xs flex items-center justify-center ring-2 ring-[#F97316]/20'>
              TF
            </div>
            <div className='hidden sm:block text-left'>
              <div className='text-xs font-bold text-[#171717] leading-none'>Tatsuki F.</div>
              <div className='text-[10px] text-[#888888] font-mono mt-0.5'>Lead Producer</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body Container */}
      <main className='max-w-7xl w-full mx-auto px-6 lg:px-10 py-6 space-y-6 flex-1'>
        {/* Page Hero Header */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
          <div>
            <div className='flex items-center gap-2 text-[11px] font-mono tracking-wider mb-1'>
              <span className='text-[#888888]'>PRODUCTION HQ</span>
              <span className='text-[#888888]'>/</span>
              <span className='text-[#EA580C] font-semibold'>CONTENT DIRECTORY</span>
            </div>
            <h1 className='text-2xl lg:text-3xl font-bold font-display text-[#171717] tracking-tight'>
              Manga Series &amp; Publications
            </h1>
            <p className='text-xs text-[#666666] mt-0.5'>
              Active manga pipelines, tankobon release schedules, and editorial sign-offs.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className='px-4 py-2.5 bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0 self-start sm:self-auto'
          >
            <Plus className='w-4 h-4' />
            <span>Create New Series</span>
          </button>
        </div>

        {/* 4 Metric KPI Cards Row */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
          {/* KPI 1: Active Series */}
          <div className='bg-white rounded-2xl border border-[#E7E7E7] p-4 shadow-2xs'>
            <div className='text-[10px] font-mono font-bold uppercase tracking-wider text-[#888888] mb-1'>
              Active Series
            </div>
            <div className='text-2xl font-bold font-display text-[#171717]'>
              {activeSeriesCount} Running
            </div>
            <div className='flex items-center gap-1 text-[11px] font-mono text-[#10B981] font-semibold mt-1'>
              <ArrowUpRight className='w-3.5 h-3.5' />
              <span>+1 this quarter</span>
            </div>
          </div>

          {/* KPI 2: Master Inked Pages */}
          <div className='bg-white rounded-2xl border border-[#E7E7E7] p-4 shadow-2xs'>
            <div className='text-[10px] font-mono font-bold uppercase tracking-wider text-[#888888] mb-1'>
              Master Inked Pages
            </div>
            <div className='text-2xl font-bold font-display text-[#171717]'>128 / 184 Pages</div>
            <div className='text-[11px] font-mono text-[#888888] mt-1'>
              {completionRate}% completion rate
            </div>
          </div>

          {/* KPI 3: AI Layering Velocity */}
          <div className='bg-white rounded-2xl border border-[#E7E7E7] p-4 shadow-2xs'>
            <div className='text-[10px] font-mono font-bold uppercase tracking-wider text-[#888888] mb-1'>
              AI Layering Velocity
            </div>
            <div className='text-2xl font-bold font-display text-[#171717]'>+34% Pacing</div>
            <div className='text-[11px] font-mono text-[#7C3AED] font-semibold mt-1'>
              Est. release on track
            </div>
          </div>

          {/* KPI 4: Next Release Gate */}
          <div className='bg-white rounded-2xl border border-[#E7E7E7] p-4 shadow-2xs'>
            <div className='text-[10px] font-mono font-bold uppercase tracking-wider text-[#888888] mb-1'>
              Next Release Gate
            </div>
            <div className='text-2xl font-bold font-display text-[#171717]'>4 Days Left</div>
            <div className='text-[11px] font-mono text-[#888888] mt-1'>Nov 28 Tankōbon Drop</div>
          </div>
        </div>

        {/* Filters and Controls Row */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1'>
          {/* Filter Tabs */}
          <div className='flex items-center gap-2'>
            {[
              { key: 'ALL', label: `All Series (${projects.length})` },
              {
                key: 'ACTIVE',
                label: `In Production (${projects.filter((p) => p.progressPercent < 100).length})`,
              },
              {
                key: 'COMPLETED',
                label: `Completed (${projects.filter((p) => p.progressPercent >= 100).length})`,
              },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filter === t.key
                    ? 'bg-[#171717] text-white shadow-xs'
                    : 'text-[#666666] hover:text-[#171717] hover:bg-[#FAF8F4] bg-white border border-[#E7E7E7]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Right Filters */}
          <div className='flex items-center gap-2'>
            {/* Format filter dropdown */}
            <div className='relative'>
              <select
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value)}
                className='appearance-none pl-3 pr-7 py-1.5 bg-white border border-[#E7E7E7] rounded-lg text-xs text-[#555555] focus:outline-none focus:border-[#F97316] cursor-pointer'
              >
                <option value='ALL'>Format: All (B5, A4, Webtoon)</option>
                <option value='B5'>B5 Tankōbon</option>
                <option value='Webtoon'>Webtoon</option>
                <option value='A4'>Standard Folio (A4)</option>
              </select>
              <ChevronDown className='w-3.5 h-3.5 text-[#888888] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none' />
            </div>

            {/* Tag search input */}
            <input
              type='text'
              placeholder='Filter tags...'
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className='px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg text-xs text-[#171717] placeholder-[#888888] focus:outline-none focus:border-[#F97316] w-32 sm:w-40 transition-all'
            />
          </div>
        </div>

        {/* 4 Manga Series Grid matching reference image */}
        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5'>
          {filteredProjects.map((project, idx) => {
            // Theme accent colors for each card
            const isCyber = project.id.includes('cyber');
            const isDrifter = project.id.includes('drifter');
            const isValkyrie = project.id.includes('valkyrie');
            const isChrono = project.id.includes('chrono');

            const barColor = isCyber
              ? 'bg-[#EA580C]'
              : isDrifter
                ? 'bg-[#10B981]'
                : isValkyrie
                  ? 'bg-[#F59E0B]'
                  : 'bg-[#6366F1]';

            const statusDotColor =
              project.progressPercent >= 80
                ? 'bg-[#10B981]'
                : project.progressPercent >= 40
                  ? 'bg-[#10B981]'
                  : 'bg-[#6366F1]';

            return (
              <div
                key={project.id}
                className='bg-white rounded-2xl border border-[#E7E7E7] overflow-hidden shadow-2xs hover:border-[#171717] transition-all flex flex-col justify-between group hover:shadow-md'
              >
                <div>
                  {/* Top Cover Box with Stylized Manga Header Plate */}
                  <div
                    onClick={() => onEnterProject(project, 'dashboard')}
                    className='relative h-44 bg-[#171717] p-4 flex flex-col justify-between cursor-pointer overflow-hidden border-b border-[#2C2C2C]'
                  >
                    {/* Background Artwork Layer with Subtle Overlay */}
                    {project.coverImage && (
                      <img
                        src={project.coverImage}
                        alt={project.title}
                        className='absolute inset-0 w-full h-full object-cover opacity-25 group-hover:scale-105 group-hover:opacity-35 transition-all duration-500'
                      />
                    )}

                    {/* Dark gradient backdrop */}
                    <div className='absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30 pointer-events-none'></div>

                    {/* Top Tag */}
                    <div className='relative z-10 flex items-center justify-between'>
                      <span className='text-[10px] font-mono tracking-widest text-[#A3A3A3] uppercase'>
                        {isCyber && 'VOL 01 • CH. 05'}
                        {isDrifter && 'VOL 01 • EPISODE 14'}
                        {isValkyrie && 'VOL 03 • CHAPTER 19'}
                        {isChrono && 'VOL 01 • PRE-PROD'}
                        {!isCyber && !isDrifter && !isValkyrie && !isChrono && project.arc}
                      </span>
                    </div>

                    {/* Center Typography Box */}
                    <div className='relative z-10 my-auto text-center py-2 px-3 border border-white/15 rounded-lg bg-black/40 backdrop-blur-2xs'>
                      <div className='text-base font-black font-display text-white tracking-wider uppercase drop-shadow-sm'>
                        {project.coverText || project.title}
                      </div>
                      <div className='text-[9px] font-mono text-[#D4D4D4] tracking-wider mt-0.5 uppercase'>
                        {project.format || 'B5 TANKŌBON MASTER • 600 DPI'}
                      </div>
                    </div>

                    {/* Bottom Specification Badge */}
                    <div className='relative z-10 flex items-center justify-between text-[9px] font-mono text-[#A3A3A3]'>
                      <span>{project.format}</span>
                    </div>
                  </div>

                  {/* Card Content Details */}
                  <div className='p-4 space-y-3'>
                    {/* Title & Status */}
                    <div>
                      <h3
                        onClick={() => onEnterProject(project, 'dashboard')}
                        className='font-bold text-sm text-[#171717] font-display hover:text-[#EA580C] cursor-pointer transition-colors'
                      >
                        {project.title}
                      </h3>
                      <div className='flex items-center gap-1.5 mt-0.5 text-xs text-[#555555]'>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusDotColor}`}></span>
                        <span className='text-[11px] font-medium'>{project.status}</span>
                      </div>
                    </div>

                    {/* Tagline / Snippet */}
                    <p className='text-xs text-[#666666] leading-relaxed line-clamp-2 min-h-[36px]'>
                      {project.tagline || project.subtitle}
                    </p>

                    {/* Tags */}
                    <div className='flex flex-wrap items-center gap-1.5 pt-0.5'>
                      {isCyber && (
                        <>
                          <span className='px-2 py-0.5 rounded bg-[#FAF8F4] text-[#555555] border border-[#E7E7E7] text-[10px] font-mono'>
                            Sci-Fi / Cyberpunk Noir
                          </span>
                          <span className='px-2 py-0.5 rounded bg-[#FAF8F4] text-[#555555] border border-[#E7E7E7] text-[10px] font-mono'>
                            Chapter 5
                          </span>
                        </>
                      )}
                      {isDrifter && (
                        <>
                          <span className='px-2 py-0.5 rounded bg-[#FAF8F4] text-[#555555] border border-[#E7E7E7] text-[10px] font-mono'>
                            Mecha / Action
                          </span>
                          <span className='px-2 py-0.5 rounded bg-[#FAF8F4] text-[#555555] border border-[#E7E7E7] text-[10px] font-mono'>
                            Episode 14
                          </span>
                        </>
                      )}
                      {isValkyrie && (
                        <>
                          <span className='px-2 py-0.5 rounded bg-[#FAF8F4] text-[#555555] border border-[#E7E7E7] text-[10px] font-mono'>
                            Dark Fantasy
                          </span>
                          <span className='px-2 py-0.5 rounded bg-[#FAF8F4] text-[#555555] border border-[#E7E7E7] text-[10px] font-mono'>
                            Chapter 19
                          </span>
                        </>
                      )}
                      {isChrono && (
                        <>
                          <span className='px-2 py-0.5 rounded bg-[#FAF8F4] text-[#555555] border border-[#E7E7E7] text-[10px] font-mono'>
                            Adventure / Sci-Fi
                          </span>
                          <span className='px-2 py-0.5 rounded bg-[#FAF8F4] text-[#555555] border border-[#E7E7E7] text-[10px] font-mono'>
                            Pre-Inking
                          </span>
                        </>
                      )}
                      {!isCyber && !isDrifter && !isValkyrie && !isChrono && (
                        <>
                          {project.genres?.slice(0, 2).map((g) => (
                            <span
                              key={g}
                              className='px-2 py-0.5 rounded bg-[#FAF8F4] text-[#555555] border border-[#E7E7E7] text-[10px] font-mono'
                            >
                              {g}
                            </span>
                          ))}
                        </>
                      )}
                    </div>

                    {/* Progress Bar & Status Text */}
                    <div className='pt-2 space-y-1'>
                      <div className='flex items-center justify-between text-xs font-mono'>
                        <span className='text-[#555555] text-[11px]'>
                          {isCyber && '21 / 32 Pages Done'}
                          {isDrifter && '45 / 50 Panels Done'}
                          {isValkyrie && '12 / 30 Pages Done'}
                          {isChrono && 'Storyboards Approved'}
                          {!isCyber &&
                            !isDrifter &&
                            !isValkyrie &&
                            !isChrono &&
                            `${project.completedPages} / ${project.totalPages} Pages`}
                        </span>
                        <strong className='text-[#171717] text-[11px]'>
                          {isChrono ? 'Phase 1' : `${project.progressPercent}%`}
                        </strong>
                      </div>
                      <div className='w-full bg-[#EAE8E0] h-2 rounded-full overflow-hidden'>
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${project.progressPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer: Date & Enter Board CTA */}
                <div className='px-4 py-3 bg-[#FAF8F4] border-t border-[#E7E7E7] flex items-center justify-between text-xs'>
                  <div className='flex items-center gap-1 text-[11px] font-mono text-[#888888]'>
                    <Clock className='w-3 h-3 text-[#888888]' />
                    <span>
                      {isCyber && 'Nov 28 (4 Days)'}
                      {isDrifter && 'Dec 05'}
                      {isValkyrie && 'Dec 18'}
                      {isChrono && 'Jan 2027'}
                      {!isCyber && !isDrifter && !isValkyrie && !isChrono && project.dueDate}
                    </span>
                  </div>

                  <button
                    onClick={() => onEnterProject(project, 'dashboard')}
                    className='text-xs font-bold text-[#171717] hover:text-[#EA580C] flex items-center gap-1 cursor-pointer transition-colors group/btn'
                  >
                    <span>Enter Board</span>
                    <span className='text-[#EA580C] group-hover/btn:translate-x-0.5 transition-transform'>
                      &gt;
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Anthology / Collaborative One-shot Banner at Bottom */}
        <div className='bg-white rounded-2xl border border-[#E7E7E7] p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div className='flex items-center gap-3.5'>
            <div className='w-10 h-10 rounded-xl bg-[#FFF7ED] border border-[#FDBA74]/40 flex items-center justify-center text-[#EA580C] shrink-0'>
              <LayoutGrid className='w-5 h-5' />
            </div>
            <div>
              <div className='font-bold text-sm text-[#171717] font-display'>
                Need to launch an anthology or collaborative one-shot?
              </div>
              <div className='text-xs text-[#666666] mt-0.5'>
                Quickly import scripts from Final Draft, setup AI character consistency models, and
                invite artists.
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className='px-4 py-2 bg-white hover:bg-[#F8F6F0] border border-[#D1D5DB] rounded-xl text-xs font-bold text-[#171717] hover:border-[#171717] shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 self-start md:self-auto'
          >
            <span>Launch One-Shot Wizard</span>
            <ArrowRight className='w-3.5 h-3.5 text-[#EA580C]' />
          </button>
        </div>

        {/* Bottom Studio Signature */}
        <div className='text-center py-2 text-[11px] font-mono text-[#888888]'>
          PanelForge Studio Edition v2.4 • Connected to Mappa Private Model Mesh (Latency: 14ms)
        </div>
      </main>

      {/* Setup New Manga Series / Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateProject={handleCreateSubmit}
      />
    </div>
  );
};
