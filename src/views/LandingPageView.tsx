import React, { useEffect, useRef } from 'react';
import {
  ArrowRight,
  Play,
  Check,
  FolderTree,
  History,
  Sparkles,
  Database,
  GitCommit,
  BookOpen,
  KanbanSquare,
  FileEdit,
  Layers,
  Eye,
  CheckCheck,
  Twitter,
  Github,
  Linkedin,
  Rss,
  Lock,
  Briefcase,
  PenLine,
  ChevronRight,
  User,
} from 'lucide-react';

interface LandingPageViewProps {
  onEnterDemo: (role: string) => void;
  onOpenLogin: () => void;
  onOpenRegister?: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onEnterDemo,
  onOpenLogin,
  onOpenRegister,
}) => {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -60px 0px' },
    );

    document.querySelectorAll('.animate-on-scroll').forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className='antialiased text-[#171717] bg-[#EAE6DF]'>
      {/* ===== NAV ===== */}
      <header className='sticky top-0 z-40 glass border-b border-[#e7e7e7]/60'>
        <div className='max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between'>
          <a href='#' className='flex items-center gap-2.5 group'>
            <div className='relative w-9 h-9 rounded-lg tangerine-gradient flex items-center justify-center soft-shadow group-hover:rotate-3 transition-transform'>
              <svg
                width='18'
                height='18'
                viewBox='0 0 24 24'
                fill='none'
                stroke='white'
                strokeWidth='2.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <path d='M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' />
              </svg>
            </div>
            <span className='font-serif text-xl font-bold tracking-tight text-[#171717]'>
              PanelForge
            </span>
          </a>
          <nav className='hidden md:flex items-center gap-8 text-sm text-[#404040]'>
            <a href='#block-features' className='nav-link hover:text-[#171717] transition'>
              Features
            </a>
            <a href='#block-workflow' className='nav-link hover:text-[#171717] transition'>
              Workflow
            </a>
            <a href='#block-showcase' className='nav-link hover:text-[#171717] transition'>
              Showcase
            </a>
            <a href='#block-social' className='nav-link hover:text-[#171717] transition'>
              Studios
            </a>
            <a href='#' className='nav-link hover:text-[#171717] transition'>
              Docs
            </a>
          </nav>
          <div className='flex items-center gap-3'>
            <button
              onClick={onOpenLogin}
              className='hidden sm:block text-sm text-[#404040] font-medium hover:text-white hover:bg-[#f97316] hover:shadow-[0_8px_20px_rgba(249,115,22,0.3)] hover:-translate-y-1 border border-transparent px-4 py-2 rounded-full transition-all duration-300 cursor-pointer'
            >
              Sign in
            </button>
            <button
              onClick={() => (onOpenRegister ? onOpenRegister() : onEnterDemo('producer'))}
              className='inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#171717] text-white text-sm font-medium hover:bg-[#404040] transition soft-shadow cursor-pointer'
            >
              Onboard Studio
              <ArrowRight className='w-3.5 h-3.5' />
            </button>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <div className='relative w-full min-h-[90vh] bg-[#EAE6DF] overflow-hidden border-b-[1.5px] border-[#171717] flex items-center justify-center pt-16 pb-16'>
        {/* Halftone / Dot Grid Pattern - Giả lập vân giấy truyện tranh */}
        <div className='absolute inset-0 opacity-[0.03] bg-[radial-gradient(#171717_1px,transparent_1px)] [background-size:24px_24px]'></div>

        {/* Drafting Crosshairs */}
        <div className='absolute top-[15%] left-[10%] text-[#B8B8B8] font-mono text-[10px] opacity-40'>
          +
        </div>
        <div className='absolute top-[25%] right-[15%] text-[#B8B8B8] font-mono text-[10px] opacity-40'>
          +
        </div>
        <div className='absolute bottom-[20%] left-[20%] text-[#B8B8B8] font-mono text-[10px] opacity-40'>
          +
        </div>
        <div className='absolute bottom-[30%] right-[8%] text-[#B8B8B8] font-mono text-[10px] opacity-40'>
          +
        </div>

        {/* Tangerine Orange Accent / Focal Point */}
        <div className='absolute right-[20%] top-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#f97316] rounded-full blur-[120px] opacity-10'></div>

        {/* AI Violet Element */}
        <div className='absolute left-[30%] bottom-10 w-[300px] h-[300px] bg-[#8B5CF6] rounded-full blur-[100px] opacity-10'></div>

        {/* Foreground Content */}
        <div className='relative z-20 text-center flex flex-col items-center max-w-4xl px-6 animate-on-scroll'>
          <h1 className='font-serif text-6xl md:text-7xl lg:text-8xl font-bold text-[#171717] tracking-tight leading-[1.05]'>
            <span className='relative inline-block'>
              <em className='font-normal text-[#f97316] not-italic italic relative z-10'>
                Architect
              </em>
              <svg
                className='absolute w-[110%] h-[12px] -bottom-1 -left-[5%] text-[#f97316] opacity-80 z-0'
                viewBox='0 0 200 12'
                preserveAspectRatio='none'
              >
                <path
                  d='M 5,8 Q 50,2 100,6 T 195,5'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='4'
                  strokeLinecap='round'
                />
              </svg>
            </span>{' '}
            Your
            <br />
            Manga Production.
          </h1>

          <p className='mt-8 text-[#171717] font-sans text-lg md:text-xl font-medium tracking-wide max-w-2xl leading-relaxed mx-auto'>
            From first script to final approval, PanelForge is the{' '}
            <span className='bg-[#171717] text-[#EAE6DF] px-2 py-0.5 rounded-sm font-mono text-sm uppercase'>
              Data Layer
            </span>{' '}
            for Modern Manga Studios.
          </p>

          <div className='mt-10 flex flex-wrap items-center justify-center gap-5'>
            <button
              onClick={() => onEnterDemo('producer')}
              className='group inline-flex items-center gap-2 px-8 py-3.5 bg-[#f97316] border-[1.5px] border-[#171717] shadow-[6px_6px_0px_#171717] text-white font-bold text-sm uppercase tracking-wide hover:shadow-[2px_2px_0px_#171717] hover:translate-x-[4px] hover:translate-y-[4px] transition-all cursor-pointer rounded'
            >
              Onboard Studio
              <ArrowRight className='w-4 h-4 group-hover:translate-x-1 transition-transform' />
            </button>
            <a
              href='#block-workflow'
              className='inline-flex items-center gap-2 px-8 py-3.5 bg-white border-[1.5px] border-[#171717] shadow-[6px_6px_0px_#171717] text-[#171717] font-bold text-sm uppercase tracking-wide hover:shadow-[2px_2px_0px_#171717] hover:translate-x-[4px] hover:translate-y-[4px] transition-all rounded cursor-pointer'
            >
              <Play className='w-3.5 h-3.5 text-[#f97316] fill-[#f97316]' />
              See Workflow
            </a>
          </div>

          <div className='mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-bold text-[#404040] uppercase tracking-wide'>
            <div className='flex items-center gap-2'>
              <Check className='w-4 h-4 text-[#f97316]' /> 14-day studio trial
            </div>
            <div className='flex items-center gap-2'>
              <Check className='w-4 h-4 text-[#f97316]' /> Migrate from any tool
            </div>
            <div className='flex items-center gap-2'>
              <Check className='w-4 h-4 text-[#f97316]' /> SOC 2 ready
            </div>
          </div>
        </div>
      </div>

      {/* ===== CREATOR FIRST SECTION ===== */}
      <div className='py-24 bg-[#171717] relative border-b-[1.5px] border-[#171717]'>
        <div className='max-w-4xl mx-auto px-6 text-center animate-on-scroll'>
          <div className='inline-flex items-center gap-3 text-xs font-semibold text-[#f97316] uppercase tracking-[0.2em] mb-10'>
            <span className='w-12 h-[1.5px] bg-[#f97316]'></span>
            Built for the Modern Studio
            <span className='w-12 h-[1.5px] bg-[#f97316]'></span>
          </div>

          <h2 className='font-serif text-3xl md:text-4xl lg:text-5xl italic text-white leading-tight font-medium max-w-3xl mx-auto relative'>
            <span className='text-[#404040] text-7xl font-serif absolute -top-8 -left-8 -z-10'>
              "
            </span>
            PanelForge didn't just organize our files; it gave our artists their creative time back.
            <span className='text-[#404040] text-7xl font-serif absolute -bottom-14 -right-4 -z-10'>
              "
            </span>
          </h2>
        </div>
      </div>
      {/* ===== VALUE PROPOSITION ===== */}
      <div className='py-16 md:py-24 relative bg-[#E2E2E2]'>
        <div className='max-w-6xl mx-auto px-6 lg:px-8'>
          <div className='text-center max-w-3xl mx-auto animate-on-scroll'>
            <div className='inline-flex items-center gap-2 text-[11px] font-semibold text-[#f97316] uppercase tracking-[0.2em] mb-6'>
              <span className='w-8 h-px bg-[#f97316]'></span>
              Why PanelForge
              <span className='w-8 h-px bg-[#f97316]'></span>
            </div>
            <h2 className='font-serif text-4xl md:text-5xl lg:text-6xl font-medium leading-[1.05] tracking-tight text-[#171717]'>
              Production is data,
              <br />
              <em className='font-normal text-[#737373]'>not chaos.</em>
            </h2>
            <p className='mt-7 text-lg text-[#737373] leading-relaxed'>
              Stop emailing scripts. Stop losing panel assignments in chat. PanelForge replaces
              scattered files with a single, structured, append-only record of every creative
              decision your studio makes.
            </p>
          </div>

          <div className='relative mt-20'>
            <div className='grid md:grid-cols-3 gap-5'>
              <div className='animate-on-scroll group p-8 rounded-2xl bg-white border border-[#e7e7e7] soft-shadow hover:border-[#0EA5E9]/40 transition-all duration-500 hover:shadow-[0_20px_60px_rgba(14,165,233,0.10)] hover:-translate-y-1.5'>
                <div className='w-12 h-12 rounded-xl bg-[#0EA5E9]/10 flex items-center justify-center text-[#0EA5E9] mb-5 group-hover:scale-110 transition-transform'>
                  <FolderTree className='w-6 h-6' />
                </div>
                <div className='text-[10px] uppercase tracking-[0.18em] text-[#0EA5E9] font-semibold mb-2'>
                  Structured
                </div>
                <h3 className='font-serif text-2xl font-medium text-[#171717]'>
                  A first-class model for every panel.
                </h3>
                <p className='mt-2.5 text-sm text-[#737373] leading-relaxed'>
                  Series, volumes, chapters, scenes, panels — each layer is a first-class object
                  with linked script, references, and approvals.
                </p>
              </div>
              <div className='animate-on-scroll delay-100 group p-8 rounded-2xl bg-white border border-[#e7e7e7] soft-shadow hover:border-[#404040]/30 transition-all duration-500 hover:shadow-[0_20px_60px_rgba(23,23,23,0.08)] hover:-translate-y-1.5'>
                <div className='w-12 h-12 rounded-xl bg-[#f4f0e8] flex items-center justify-center text-[#171717] mb-5 group-hover:scale-110 transition-transform'>
                  <History className='w-6 h-6' />
                </div>
                <div className='text-[10px] uppercase tracking-[0.18em] text-[#404040] font-semibold mb-2'>
                  Verifiable
                </div>
                <h3 className='font-serif text-2xl font-medium text-[#171717]'>
                  An append-only record of decisions.
                </h3>
                <p className='mt-2.5 text-sm text-[#737373] leading-relaxed'>
                  Every change is appended, never overwritten. Roll back, audit, and trust the
                  timeline of who did what, when.
                </p>
              </div>
              <div className='animate-on-scroll delay-200 group p-8 rounded-2xl bg-white border border-[#e7e7e7] soft-shadow hover:border-[#8b5cf6]/40 transition-all duration-500 hover:shadow-[0_20px_60px_rgba(139,92,246,0.10)] hover:-translate-y-1.5'>
                <div className='w-12 h-12 rounded-xl bg-[#f5f3ff] flex items-center justify-center text-[#8b5cf6] mb-5 group-hover:scale-110 transition-transform'>
                  <Sparkles className='w-6 h-6' />
                </div>
                <div className='text-[10px] uppercase tracking-[0.18em] text-[#8b5cf6] font-semibold mb-2'>
                  Grounded
                </div>
                <h3 className='font-serif text-2xl font-medium text-[#171717]'>
                  AI that cites your own bible.
                </h3>
                <p className='mt-2.5 text-sm text-[#737373] leading-relaxed'>
                  Every AI suggestion is grounded in your series bible — never the open internet.
                  Citations, not hallucinations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== FEATURE 1: Structured Content Model ===== */}
      <div className='py-12 md:py-20 bg-[#E2E2E2] relative'>
        <div className='absolute inset-0 halftone-pattern opacity-30'></div>
        <div className='relative max-w-6xl mx-auto px-6 lg:px-8'>
          <div className='grid lg:grid-cols-2 gap-12 lg:gap-20 items-center'>
            <div className='animate-on-scroll'>
              <div className='inline-flex items-center gap-2 text-[11px] font-semibold text-[#0EA5E9] uppercase tracking-[0.2em] mb-4'>
                <span className='w-8 h-px bg-[#0EA5E9]'></span>
                01 / Structured Content
              </div>
              <h3 className='font-serif text-4xl md:text-5xl font-medium leading-[1.1] tracking-tight text-[#171717]'>
                A <em className='font-normal text-[#0EA5E9] italic'>data model</em> that thinks like
                manga.
              </h3>
              <p className='mt-5 text-lg text-[#737373] leading-relaxed'>
                Series, volumes, chapters, scenes, panels — every layer is a first-class object with
                linked script, references, and approvals. No more hunting through nested file
                folders.
              </p>
              <ul className='mt-7 space-y-3 text-sm text-[#404040]'>
                {[
                  {
                    bold: 'Per-panel metadata',
                    rest: '— dialogue, SFX, references, status, owner',
                  },
                  { bold: 'Bidirectional links', rest: 'between scenes, panels, and assets' },
                  {
                    bold: 'Query the studio',
                    rest: 'like a database — "all panels awaiting review"',
                  },
                ].map((item, i) => (
                  <li key={i} className='flex items-start gap-3'>
                    <span className='mt-0.5 w-5 h-5 rounded-full bg-[#0EA5E9] flex items-center justify-center flex-shrink-0 shadow-sm'>
                      <Check className='w-3 h-3 text-white' />
                    </span>
                    <span>
                      <span className='text-[#171717] font-medium'>{item.bold}</span> {item.rest}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className='animate-on-scroll delay-200 relative'>
              <div className='absolute -inset-6 bg-gradient-to-br from-[#0EA5E9]/10 to-transparent rounded-3xl blur-2xl'></div>
              <div className='relative bg-white rounded-2xl shadow-[0_8px_30px_rgba(14,165,233,0.06)] border border-[#0EA5E9]/20 p-5 overflow-hidden'>
                <div className='absolute top-0 left-0 w-full h-1 bg-[#0EA5E9]'></div>
                <div className='flex items-center justify-between pb-3 border-b border-[#e7e7e7]/60'>
                  <div className='text-[10px] uppercase tracking-[0.15em] text-[#737373] font-semibold'>
                    Content Model
                  </div>
                  <div className='flex items-center gap-1.5 text-[10px] text-[#737373] font-mono'>
                    <Database className='w-3 h-3' /> query
                  </div>
                </div>
                <div className='pt-3.5 space-y-1.5 text-xs'>
                  {['Series', 'Volume', 'Chapter', 'Scene']
                    .reduce(
                      (acc, level, i) => {
                        const counts = ['1', '3', '14', '6'];
                        return [...acc, { level, count: counts[i], indent: i }];
                      },
                      [] as { level: string; count: string; indent: number }[],
                    )
                    .map(({ level, count, indent }) => (
                      <div key={level} style={{ marginLeft: `${indent * 16}px` }}>
                        <div
                          className={`${indent > 0 ? 'pl-3 border-l border-dashed border-[#e7e7e7]' : ''} flex items-center gap-2 text-[#404040] py-0.5`}
                        >
                          <span className='text-[#737373] text-[10px] w-3 inline-block'>
                            {indent < 3 ? '▾' : '▸'}
                          </span>
                          <span>{level}</span>
                          <span className='ml-auto text-[9px] text-[#737373] font-mono'>
                            {count}
                          </span>
                        </div>
                      </div>
                    ))}
                  <div
                    style={{ marginLeft: '64px' }}
                    className='pl-3 border-l border-dashed border-[#e7e7e7]'
                  >
                    <div className='flex items-center gap-2 text-[#f97316] font-medium py-0.5'>
                      <span className='w-3 inline-block'>·</span>
                      <span>Panel</span>
                      <span className='ml-auto text-[9px] text-[#737373] font-mono'>142</span>
                    </div>
                  </div>
                </div>
                <div className='mt-4 pt-4 border-t border-[#e7e7e7]/60'>
                  <div className='flex items-center justify-between mb-2.5'>
                    <div className='text-[10px] uppercase tracking-[0.15em] text-[#737373] font-semibold'>
                      Panel · 14.3.2
                    </div>
                    <span className='text-[9px] px-1.5 py-0.5 rounded bg-[#fff7ed] text-[#f97316] font-semibold'>
                      In Inking
                    </span>
                  </div>
                  <div className='grid grid-cols-3 gap-2 text-[10px]'>
                    <div className='bg-[#EAE6DF] rounded-lg p-2'>
                      <div className='text-[#737373] uppercase tracking-wider text-[8px] font-semibold'>
                        Dialogue
                      </div>
                      <div className='text-[#171717] mt-1 leading-snug'>
                        "I never asked for this."
                      </div>
                    </div>
                    <div className='bg-[#EAE6DF] rounded-lg p-2'>
                      <div className='text-[#737373] uppercase tracking-wider text-[8px] font-semibold'>
                        SFX
                      </div>
                      <div className='text-[#171717] mt-1 leading-snug'>— crack</div>
                    </div>
                    <div className='bg-[#EAE6DF] rounded-lg p-2'>
                      <div className='text-[#737373] uppercase tracking-wider text-[8px] font-semibold'>
                        Owner
                      </div>
                      <div className='text-[#171717] mt-1 leading-snug flex items-center gap-1'>
                        <span className='w-3 h-3 rounded-full bg-[#fff7ed] text-[#f97316] text-[7px] font-bold flex items-center justify-center'>
                          M
                        </span>
                        Mika
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== FEATURE 2: Append-Only Event Store ===== */}
      <div className='py-12 md:py-20 bg-[#EAE6DF] relative'>
        <div className='relative max-w-6xl mx-auto px-6 lg:px-8'>
          <div className='grid lg:grid-cols-2 gap-12 lg:gap-20 items-center'>
            <div className='animate-on-scroll lg:order-2'>
              <div className='inline-flex items-center gap-2 text-[11px] font-semibold text-[#f97316] uppercase tracking-[0.2em] mb-4'>
                <span className='w-8 h-px bg-[#f97316]'></span>
                02 / Append-Only Event Store
              </div>
              <h3 className='font-serif text-4xl md:text-5xl font-medium leading-[1.1] tracking-tight text-[#171717]'>
                Every decision, <em className='font-normal text-[#f97316] italic'>never</em>{' '}
                overwritten.
              </h3>
              <p className='mt-5 text-lg text-[#737373] leading-relaxed'>
                PanelForge treats your studio like a ledger. Script changes, panel revisions, and
                approvals are committed as events — fully auditable, fully reversible.
              </p>
              <ul className='mt-7 space-y-3 text-sm text-[#404040]'>
                {[
                  {
                    bold: 'Cryptographic event log',
                    rest: '— every change signed and time-stamped',
                  },
                  {
                    bold: 'Diff-and-restore',
                    rest: 'any panel, scene, or chapter to any point in time',
                  },
                  {
                    bold: 'Audit-ready exports',
                    rest: 'for publishers, legal, and your future self',
                  },
                ].map((item, i) => (
                  <li key={i} className='flex items-start gap-3'>
                    <span className='mt-0.5 w-5 h-5 rounded-full bg-[#f97316] flex items-center justify-center flex-shrink-0 shadow-sm'>
                      <Check className='w-3 h-3 text-white' />
                    </span>
                    <span>
                      <span className='text-[#171717] font-medium'>{item.bold}</span> {item.rest}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className='animate-on-scroll delay-200 lg:order-1 relative'>
              <div className='absolute -inset-6 bg-gradient-to-br from-[#f97316]/10 to-transparent rounded-3xl blur-2xl'></div>
              <div className='relative bg-white rounded-2xl shadow-[0_8px_30px_rgba(249,115,22,0.08)] border border-[#f97316]/30 p-3.5 overflow-hidden'>
                <div className='absolute top-0 left-0 w-full h-1 bg-[#f97316]'></div>
                <div className='flex items-center justify-between pb-3 border-b border-[#e7e7e7]/60'>
                  <div className='flex items-center gap-2'>
                    <div className='w-7 h-7 rounded bg-[#f97316]/10 flex items-center justify-center text-[#f97316]'>
                      <GitCommit className='w-4 h-4' />
                    </div>
                    <div>
                      <div className='text-[10px] uppercase tracking-[0.15em] text-[#737373] font-semibold'>
                        Event Log
                      </div>
                      <div className='text-[10px] text-[#737373] font-mono'>ch.14 / scene.04</div>
                    </div>
                  </div>
                  <span className='text-[9px] px-2 py-0.5 rounded-full bg-[#f97316]/10 text-[#f97316] font-bold tracking-wider border border-[#f97316]/20'>
                    APPEND-ONLY
                  </span>
                </div>
                <div className='relative pt-4 pl-6'>
                  <div className='absolute left-[10px] top-5 bottom-3 w-px bg-[#e7e7e7]'></div>
                  <div className='space-y-4 text-[11px]'>
                    {[
                      {
                        time: '14:42 · jiro',
                        hash: '7a3f…b2',
                        title: 'Approved page 14.1',
                        desc: 'Reviewed against bible v3.2 · 4 panels verified',
                        dot: 'bg-[#f97316]',
                      },
                      {
                        time: '14:38 · mika',
                        hash: '9c12…e8',
                        title: 'Inked page 14.3',
                        desc: '3 panels committed · references linked',
                        dot: 'bg-[#e7e7e7]',
                      },
                      {
                        time: '14:21 · ai',
                        hash: '2f8d…a1',
                        title: 'Continuity check on scene 04',
                        desc: '2 flags raised · cited Vol. 1, Ch. 02',
                        dot: 'bg-[#8b5cf6]',
                      },
                      {
                        time: '10:04 · mika',
                        hash: '5b41…c0',
                        title: 'Added scene 05 to chapter 14',
                        desc: '6 panels · script + references',
                        dot: 'bg-[#e7e7e7]',
                      },
                    ].map((ev, i) => (
                      <div key={i} className='relative'>
                        <div
                          className={`absolute -left-[19px] top-1 w-3 h-3 rounded-full ${ev.dot} border-2 border-white`}
                        ></div>
                        <div className='flex items-center justify-between'>
                          <div className='font-mono text-[10px] text-[#737373]'>{ev.time}</div>
                          <div className='font-mono text-[9px] text-[#737373]'>{ev.hash}</div>
                        </div>
                        <div className='mt-1 text-[#171717] font-medium'>{ev.title}</div>
                        <div className='text-[#737373] leading-snug'>{ev.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== FEATURE 3: AI-Grounded Series Bible ===== */}
      <div className='py-12 md:py-20 bg-[#E2E2E2] relative'>
        <div className='absolute inset-0 halftone-pattern opacity-30'></div>
        <div className='relative max-w-6xl mx-auto px-6 lg:px-8'>
          <div className='grid lg:grid-cols-2 gap-12 lg:gap-20 items-center'>
            <div className='animate-on-scroll'>
              <div className='inline-flex items-center gap-2 text-[11px] font-semibold text-[#F59E0B] uppercase tracking-[0.2em] mb-4'>
                <span className='w-8 h-px bg-[#F59E0B]'></span>
                03 / AI-Grounded Series Bible
              </div>
              <h3 className='font-serif text-4xl md:text-5xl font-medium leading-[1.1] tracking-tight text-[#171717]'>
                AI that <em className='font-normal text-[#F59E0B] italic'>cites</em> your own canon.
              </h3>
              <p className='mt-5 text-lg text-[#737373] leading-relaxed'>
                Your series bible is the source of truth. PanelForge's AI only suggests from it —
                and every suggestion ships with a citation to the volume, chapter, and panel it came
                from.
              </p>
              <ul className='mt-7 space-y-3 text-sm text-[#404040]'>
                {[
                  {
                    bold: 'Characters, locations, terms',
                    rest: '— versioned, linkable, queryable',
                  },
                  {
                    bold: 'Every AI claim cited',
                    rest: '— never the open internet, only your canon',
                  },
                  { bold: 'Continuity flags', rest: 'the moment a panel drifts from bible' },
                ].map((item, i) => (
                  <li key={i} className='flex items-start gap-3'>
                    <span className='mt-0.5 w-5 h-5 rounded-full bg-[#F59E0B] flex items-center justify-center flex-shrink-0 shadow-sm'>
                      <Check className='w-3 h-3 text-white' />
                    </span>
                    <span>
                      <span className='text-[#171717] font-medium'>{item.bold}</span> {item.rest}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className='animate-on-scroll delay-200 relative'>
              <div className='absolute -inset-6 bg-gradient-to-br from-[#F59E0B]/10 to-transparent rounded-3xl blur-2xl'></div>
              <div className='relative bg-[#EAE6DF] rounded-2xl shadow-[0_8px_30px_rgba(245,158,11,0.08)] border border-[#F59E0B]/20 p-5 overflow-hidden'>
                <div className='absolute top-0 left-0 w-full h-1 bg-[#F59E0B]'></div>
                <div className='flex items-center justify-between pb-3 border-b border-[#e7e7e7]/60'>
                  <div className='flex items-center gap-2'>
                    <div className='w-7 h-7 rounded bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B]'>
                      <Sparkles className='w-4 h-4' />
                    </div>
                    <div>
                      <div className='text-[10px] uppercase tracking-[0.15em] text-[#737373] font-semibold'>
                        Series Bible
                      </div>
                      <div className='text-[10px] text-[#737373] font-mono'>
                        aria.v3 · 218 entries
                      </div>
                    </div>
                  </div>
                  <div className='text-[9px] text-[#737373] font-mono flex items-center gap-1'>
                    <span className='w-1 h-1 rounded-full bg-green-500'></span> synced
                  </div>
                </div>
                <div className='pt-3.5 space-y-2.5'>
                  <div className='p-3 rounded-lg border border-[#F4728A]/20 bg-[#F4728A]/5'>
                    <div className='flex items-center justify-between mb-1'>
                      <div className='flex items-center gap-2'>
                        <span className='w-6 h-6 rounded-full bg-[#F4728A]/10 text-[#E11D48] text-[10px] font-bold flex items-center justify-center'>
                          A
                        </span>
                        <span className='text-sm font-semibold text-[#E11D48]'>Aria</span>
                        <span className='text-[9px] px-1.5 py-0.5 rounded bg-[#E11D48]/10 text-[#E11D48] font-semibold tracking-wider'>
                          CHARACTER
                        </span>
                      </div>
                      <span className='text-[9px] text-[#737373] font-mono'>v3.2</span>
                    </div>
                    <div className='text-[11px] text-[#404040] leading-relaxed'>
                      Protagonist · quiet, determined · scar on left brow, hidden Vol. 1+ · speaks
                      in short sentences · sworn to the Hollow Crown.
                    </div>
                  </div>
                  <div className='p-3 rounded-lg border border-[#e7e7e7]/70 bg-[#EAE6DF]/60'>
                    <div className='flex items-center gap-2 mb-1'>
                      <span className='w-6 h-6 rounded-full bg-[#fff7ed] text-[#f97316] text-[10px] font-bold flex items-center justify-center'>
                        ◇
                      </span>
                      <span className='text-sm font-semibold text-[#171717]'>Hollow Crown</span>
                      <span className='text-[9px] px-1.5 py-0.5 rounded bg-[#404040] text-white font-semibold tracking-wider'>
                        MACGUFFIN
                      </span>
                    </div>
                    <div className='text-[11px] text-[#404040] leading-relaxed'>
                      Antagonistic relic · grants{' '}
                      <span className='text-[#171717] font-medium'>no</span> magical power ·
                      corrupted bearer in Vol. 2.
                    </div>
                  </div>
                </div>
                <div className='mt-3.5 p-3.5 rounded-xl border border-[#8b5cf6]/20 bg-[#f5f3ff]/60 relative overflow-hidden'>
                  <div className='flex items-center gap-2 mb-1.5'>
                    <div className='w-5 h-5 rounded ai-gradient flex items-center justify-center'>
                      <Sparkles className='w-3 h-3 text-white' />
                    </div>
                    <span className='text-[10px] font-bold uppercase tracking-[0.15em] text-[#8b5cf6]'>
                      AI Suggestion
                    </span>
                  </div>
                  <div className='text-[11px] text-[#404040] leading-relaxed'>
                    Scene 04 panel 2 may conflict with Aria's{' '}
                    <span className='font-semibold text-[#171717]'>scar hidden</span> rule. Verify
                    or update the bible.
                  </div>
                  <div className='mt-2 pt-2 border-t border-[#8b5cf6]/15 flex items-center gap-1.5 text-[10px] text-[#737373]'>
                    <span className='font-mono'>aria.char.scar = hidden</span>
                    <span className='ml-auto text-[#8b5cf6] font-semibold cursor-pointer'>
                      View source →
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== FEATURE 4: Kanban Pipeline ===== */}
      <div className='py-12 md:py-20 bg-[#EAE6DF] relative'>
        <div className='relative max-w-6xl mx-auto px-6 lg:px-8'>
          <div className='grid lg:grid-cols-2 gap-12 lg:gap-20 items-center'>
            <div className='animate-on-scroll lg:order-2'>
              <div className='inline-flex items-center gap-2 text-[11px] font-semibold text-[#10B981] uppercase tracking-[0.2em] mb-4'>
                <span className='w-8 h-px bg-[#10B981]'></span>
                04 / Kanban Pipeline
              </div>
              <h3 className='font-serif text-4xl md:text-5xl font-medium leading-[1.1] tracking-tight text-[#171717]'>
                Production that <em className='font-normal text-[#10B981] italic'>flows</em>, not
                queues.
              </h3>
              <p className='mt-5 text-lg text-[#737373] leading-relaxed'>
                Every scene moves through a single, visible pipeline — script, sketch, ink, review,
                approved. No more "where is this page?" messages.
              </p>
              <ul className='mt-7 space-y-3 text-sm text-[#404040]'>
                {[
                  { bold: 'Configurable stages', rest: "per series — match your studio's rhythm" },
                  { bold: 'Per-page WIP limits', rest: "so artists aren't drowning" },
                  { bold: 'Bottleneck detection', rest: '— flag stages that stall' },
                ].map((item, i) => (
                  <li key={i} className='flex items-start gap-3'>
                    <span className='mt-0.5 w-5 h-5 rounded-full bg-[#10B981] flex items-center justify-center flex-shrink-0 shadow-sm'>
                      <Check className='w-3 h-3 text-white' />
                    </span>
                    <span>
                      <span className='text-[#171717] font-medium'>{item.bold}</span> {item.rest}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className='animate-on-scroll delay-200 lg:order-1 relative'>
              <div className='absolute -inset-6 bg-gradient-to-br from-[#10B981]/10 to-transparent rounded-3xl blur-2xl'></div>
              <div className='relative bg-white rounded-2xl shadow-[0_8px_30px_rgba(16,185,129,0.08)] border border-[#10B981]/30 p-3.5 overflow-hidden'>
                <div className='absolute top-0 left-0 w-full h-1 bg-[#10B981]'></div>
                <div className='flex items-center justify-between pb-2.5 mb-3 border-b border-[#e7e7e7]/60 px-1'>
                  <div className='text-[10px] uppercase tracking-[0.15em] text-[#737373] font-semibold'>
                    Chapter 14 · Pipeline
                  </div>
                  <div className='flex items-center gap-1.5 text-[10px] text-[#737373] font-mono'>
                    <KanbanSquare className='w-3 h-3' /> 4 stages
                  </div>
                </div>
                <div className='grid grid-cols-4 gap-2'>
                  {/* Script */}
                  <div>
                    <div className='flex items-center justify-between mb-2 px-1'>
                      <div className='text-[9px] font-bold text-[#404040] uppercase tracking-wider'>
                        Script
                      </div>
                      <div className='text-[9px] text-[#737373] font-mono'>3</div>
                    </div>
                    <div className='space-y-1.5'>
                      {['Scene 04', 'Scene 05', 'Scene 06'].map((s, i) => (
                        <div
                          key={s}
                          className='bg-[#EAE6DF] rounded-md p-2 border border-[#e7e7e7]'
                        >
                          <div className='text-[10px] font-semibold text-[#171717]'>{s}</div>
                          {i === 2 && (
                            <div className='text-[8px] italic text-[#737373] mt-0.5'>draft</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Ink */}
                  <div>
                    <div className='flex items-center justify-between mb-2 px-1'>
                      <div className='text-[9px] font-bold text-[#f97316] uppercase tracking-wider'>
                        Ink
                      </div>
                      <div className='text-[9px] text-[#f97316] font-mono font-bold'>5</div>
                    </div>
                    <div className='space-y-1.5'>
                      <div className='bg-[#fff7ed]/70 rounded-md p-2 border border-[#f97316]/30'>
                        <div className='text-[10px] font-semibold text-[#171717]'>Page 14.3</div>
                        <div className='mt-1 h-1 rounded-full bg-white overflow-hidden'>
                          <div className='h-full w-2/3 tangerine-gradient rounded-full'></div>
                        </div>
                      </div>
                      {['Page 14.4', 'Page 14.5'].map((p) => (
                        <div
                          key={p}
                          className='bg-[#EAE6DF] rounded-md p-2 border border-[#e7e7e7]'
                        >
                          <div className='text-[10px] font-semibold text-[#171717]'>{p}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Review */}
                  <div>
                    <div className='flex items-center justify-between mb-2 px-1'>
                      <div className='text-[9px] font-bold text-[#D97706] uppercase tracking-wider'>
                        Review
                      </div>
                      <div className='text-[9px] text-[#D97706] font-mono font-bold'>2</div>
                    </div>
                    <div className='space-y-1.5'>
                      <div className='bg-[#FFFBEB] rounded-md p-2 border border-[#D97706]/30'>
                        <div className='text-[10px] font-semibold text-[#171717]'>Page 14.1</div>
                        <div className='flex items-center gap-1 mt-1'>
                          <span className='w-3 h-3 rounded-full bg-[#f5f3ff] text-[#8b5cf6] text-[7px] font-bold flex items-center justify-center'>
                            ✦
                          </span>
                          <span className='text-[8px] text-[#8b5cf6] font-semibold'>1 flag</span>
                        </div>
                      </div>
                      <div className='bg-[#FFFBEB] rounded-md p-2 border border-[#D97706]/30'>
                        <div className='text-[10px] font-semibold text-[#171717]'>Page 14.2</div>
                      </div>
                    </div>
                  </div>
                  {/* Done */}
                  <div>
                    <div className='flex items-center justify-between mb-2 px-1'>
                      <div className='text-[9px] font-bold text-[#10B981] uppercase tracking-wider'>
                        Done
                      </div>
                      <div className='text-[9px] text-[#10B981] font-mono font-bold'>24</div>
                    </div>
                    <div className='space-y-1.5'>
                      {['Page 13.8', 'Page 13.7', 'Page 13.6'].map((p) => (
                        <div
                          key={p}
                          className='bg-[#f4f0e8]/60 rounded-md p-2 border border-[#e7e7e7]'
                        >
                          <div className='text-[10px] font-semibold text-[#404040]'>{p}</div>
                          <div className='text-[8px] text-[#10B981] mt-0.5 flex items-center gap-0.5'>
                            <Check className='w-2.5 h-2.5' /> approved
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== HOW IT WORKS ===== */}
      <div id='block-workflow' className='py-16 md:py-24 relative'>
        <div className='absolute inset-0 bg-gradient-to-b from-[#EAE6DF] to-white'></div>
        <div className='relative max-w-6xl mx-auto px-6 lg:px-8'>
          <div className='text-center max-w-2xl mx-auto mb-20 animate-on-scroll'>
            <div className='inline-flex items-center gap-2 text-[11px] font-semibold text-[#f97316] uppercase tracking-[0.2em] mb-6'>
              <span className='w-8 h-px bg-[#f97316]'></span>
              From Script to Approved Page
              <span className='w-8 h-px bg-[#f97316]'></span>
            </div>
            <h2 className='font-serif text-4xl md:text-5xl font-medium leading-[1.1] tracking-tight'>
              A workflow your team
              <br />
              will actually follow.
            </h2>
          </div>
          <div className='relative'>
            <div className='hidden lg:block absolute top-12 left-[12%] right-[12%] h-px connector-dashed'></div>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-6 relative'>
              {[
                {
                  step: '01',
                  title: 'Script',
                  role: 'Writer',
                  Icon: FileEdit,
                  color: 'text-[#0EA5E9]',
                  bgGlow: 'bg-[#0EA5E9]/15',
                  borderClass: 'border-[#0EA5E9]/30',
                  badgeClass: 'bg-[#0EA5E9]',
                  desc: 'Writers draft scenes in structured panels — dialogue, SFX, and beats, all linked to the bible.',
                },
                {
                  step: '02',
                  title: 'Produce',
                  role: 'Artist',
                  Icon: Layers,
                  color: 'text-[#f97316]',
                  bgGlow: 'bg-[#f97316]/15',
                  borderClass: 'border-[#f97316]/30',
                  badgeClass: 'bg-[#f97316]',
                  desc: 'Artists pull panel-by-panel assignments, with references, history, and ownership baked in.',
                },
                {
                  step: '03',
                  title: 'Review',
                  role: 'Editor',
                  Icon: Eye,
                  color: 'text-[#F59E0B]',
                  bgGlow: 'bg-[#F59E0B]/15',
                  borderClass: 'border-[#F59E0B]/30',
                  badgeClass: 'bg-[#F59E0B]',
                  desc: 'Editors approve against the bible. AI surfaces continuity flags before humans need to.',
                },
                {
                  step: '04',
                  title: 'Approved',
                  role: 'Producer',
                  Icon: CheckCheck,
                  color: 'text-[#10B981]',
                  bgGlow: 'bg-[#10B981]/15',
                  borderClass: 'border-[#10B981]/30',
                  badgeClass: 'bg-[#10B981]',
                  desc: 'Approved pages export to your pipeline. Every state is in the log. Nothing is lost.',
                },
              ].map(
                ({ step, title, role, Icon, color, bgGlow, borderClass, badgeClass, desc }, i) => (
                  <div
                    key={step}
                    className={`animate-on-scroll ${i > 0 ? `delay-${i}00` : ''} flex flex-col items-center text-center`}
                  >
                    <div className='relative mb-6'>
                      <div
                        className={`absolute inset-0 ${bgGlow} rounded-full blur-2xl scale-110`}
                      ></div>
                      <div
                        className={`relative w-24 h-24 rounded-full bg-white border-2 ${borderClass} soft-shadow flex items-center justify-center`}
                      >
                        <span
                          className={`absolute -top-1 -right-1 w-7 h-7 rounded-full ${badgeClass} text-white text-xs font-bold flex items-center justify-center font-mono shadow-sm`}
                        >
                          {step}
                        </span>
                        <Icon className={`w-8 h-8 ${color}`} />
                      </div>
                    </div>
                    <h3 className='font-serif text-2xl font-medium text-[#171717]'>{title}</h3>
                    <div
                      className={`text-[10px] uppercase tracking-[0.18em] ${color} font-bold mt-1.5`}
                    >
                      {role}
                    </div>
                    <p className='mt-2.5 text-sm text-[#737373] leading-relaxed max-w-[220px]'>
                      {desc}
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== SHOWCASE ===== */}
      <div id='block-showcase' className='py-16 md:py-24 relative overflow-hidden'>
        <div className='absolute inset-0 bg-gradient-to-b from-white via-[#EAE6DF] to-white'></div>
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] rounded-full bg-[#f97316]/5 blur-3xl'></div>
        <div className='relative max-w-6xl mx-auto px-6 lg:px-8'>
          <div className='text-center max-w-2xl mx-auto mb-16 animate-on-scroll'>
            <div className='inline-flex items-center gap-2 text-[11px] font-semibold text-[#f97316] uppercase tracking-[0.2em] mb-6'>
              <span className='w-8 h-px bg-[#f97316]'></span>
              Unified Workspace
              <span className='w-8 h-px bg-[#f97316]'></span>
            </div>
            <h2 className='font-serif text-4xl md:text-5xl lg:text-6xl font-medium leading-[1.05] tracking-tight'>
              Every role, <em className='font-normal text-[#737373]'>one</em> canvas.
            </h2>
            <p className='mt-6 text-lg text-[#737373] leading-relaxed'>
              Writers, artists, editors, and producers working from the same structured source of
              truth — in real time.
            </p>
          </div>

          <div className='relative animate-on-scroll'>
            <div className='absolute -inset-8 md:-inset-12 bg-gradient-to-br from-[#f97316]/10 via-[#8b5cf6]/5 to-transparent rounded-[2rem] blur-3xl'></div>
            <div className='relative glass-strong rounded-3xl soft-shadow-lg border border-[#e7e7e7] overflow-hidden'>
              {/* Window chrome */}
              <div className='flex items-center gap-2 px-5 py-3 border-b border-[#e7e7e7]/60 bg-white/50'>
                <div className='flex items-center gap-1.5'>
                  <div className='w-3 h-3 rounded-full bg-red-400/80'></div>
                  <div className='w-3 h-3 rounded-full bg-yellow-400/80'></div>
                  <div className='w-3 h-3 rounded-full bg-green-400/80'></div>
                </div>
                <div className='ml-3 flex items-center gap-1.5 text-[10px] text-[#737373] font-mono truncate'>
                  <Lock className='w-3 h-3' />
                  <span className='hidden sm:inline'>
                    panelforge.studio / chronicles-of-aria / vol-3 / ch-14
                  </span>
                </div>
                <div className='ml-auto flex items-center gap-2.5 text-[10px] text-[#737373]'>
                  <div className='flex -space-x-1.5'>
                    <div className='w-5 h-5 rounded-full bg-[#f97316] border-2 border-white flex items-center justify-center text-[8px] font-bold text-white'>
                      M
                    </div>
                    <div className='w-5 h-5 rounded-full bg-[#8b5cf6] border-2 border-white flex items-center justify-center text-[8px] font-bold text-white'>
                      A
                    </div>
                    <div className='w-5 h-5 rounded-full bg-[#171717] border-2 border-white flex items-center justify-center text-[8px] font-bold text-white'>
                      J
                    </div>
                  </div>
                  <span className='hidden sm:inline'>+2 viewing</span>
                </div>
              </div>
              {/* Tab bar */}
              <div className='flex items-center gap-2 px-5 py-3 border-b border-[#e7e7e7]/60 bg-[#EAE6DF]/80 overflow-x-auto'>
                {['Pipeline', 'Script', 'Bible', 'Event Log', 'References'].map((tab, i) => (
                  <button
                    key={tab}
                    className={`px-3 py-1.5 text-[11px] font-semibold rounded-md whitespace-nowrap transition-colors ${i === 0 ? 'bg-[#171717] text-white shadow-sm' : 'bg-white text-[#737373] border border-[#e7e7e7] hover:border-[#171717] hover:text-[#171717]'}`}
                  >
                    {tab}
                  </button>
                ))}
                <div className='ml-auto flex items-center gap-2 pb-1.5'>
                  <div className='px-2.5 py-1 rounded-full bg-[#fff7ed] text-[#f97316] text-[10px] font-semibold flex items-center gap-1.5'>
                    <span className='w-1.5 h-1.5 rounded-full bg-[#f97316] pulse-dot'></span> Live
                  </div>
                </div>
              </div>
              {/* Kanban board */}
              <div className='p-3 md:p-4 grid grid-cols-2 md:grid-cols-4 gap-2.5 bg-[#EAE6DF]/30'>
                {[
                  {
                    title: 'Scripting',
                    count: '3',
                    color: 'text-[#0EA5E9]',
                    bgLabel: 'bg-[#0EA5E9]/10',
                    cards: [
                      { name: 'Scene 04', sub: '"The Choice"', extra: null },
                      { name: 'Scene 05', sub: '"Departure"', extra: null },
                      { name: 'Scene 06', sub: '"The Fire"', extra: 'draft' },
                    ],
                  },
                  {
                    title: 'Inking',
                    count: '5',
                    color: 'text-[#f97316]',
                    bgLabel: 'bg-[#f97316]/10',
                    cards: [
                      {
                        name: 'Page 14.3',
                        sub: '3 panels · 2 of 3 done',
                        extra: 'progress',
                        flag: null,
                      },
                      { name: 'Page 14.4', sub: '4 panels', extra: null },
                      { name: 'Page 14.5', sub: '5 panels', extra: null },
                    ],
                  },
                  {
                    title: 'Review',
                    count: '2',
                    color: 'text-[#F59E0B]',
                    bgLabel: 'bg-[#F59E0B]/10',
                    cards: [
                      { name: 'Page 14.1', sub: 'awaiting Jiro', extra: 'ai-flag' },
                      { name: 'Page 14.2', sub: 'final pass', extra: null },
                    ],
                  },
                  {
                    title: 'Done',
                    count: '24',
                    color: 'text-[#10B981]',
                    bgLabel: 'bg-[#10B981]/10',
                    cards: [
                      { name: 'Page 13.8', sub: null, extra: 'approved' },
                      { name: 'Page 13.7', sub: null, extra: 'approved' },
                      { name: 'Page 13.6', sub: null, extra: 'approved' },
                    ],
                  },
                ].map((col) => (
                  <div
                    key={col.title}
                    className='bg-white/85 rounded-xl p-3 border border-[#e7e7e7] shadow-sm'
                  >
                    <div className='flex items-center justify-between mb-3'>
                      <div
                        className={`px-2 py-1 rounded-md ${col.bgLabel} ${col.color} text-[10px] font-bold uppercase tracking-[0.1em]`}
                      >
                        {col.title}
                      </div>
                      <div className={`text-[10px] ${col.color} font-mono font-bold`}>
                        {col.count}
                      </div>
                    </div>
                    <div className='space-y-2'>
                      {col.cards.map((card) => (
                        <div
                          key={card.name}
                          className={`rounded-lg p-2.5 border ${card.extra === 'approved' ? 'bg-[#f4f0e8]/50 border-[#e7e7e7]/60' : col.title === 'Inking' && card.name === 'Page 14.3' ? 'bg-[#fff7ed]/60 border-[#f97316]/40' : 'bg-[#EAE6DF] border-[#e7e7e7]/60'}`}
                        >
                          <div className='flex items-center justify-between'>
                            <div
                              className={`text-[11px] font-semibold ${card.extra === 'approved' ? 'text-[#404040]' : 'text-[#171717]'}`}
                            >
                              {card.name}
                            </div>
                            {col.title === 'Inking' && card.name === 'Page 14.3' && (
                              <span className='text-[8px] px-1.5 py-0.5 rounded bg-[#f97316] text-white font-bold tracking-wider'>
                                WIP
                              </span>
                            )}
                          </div>
                          {card.sub && (
                            <div className='text-[9px] text-[#737373] mt-0.5 italic'>
                              {card.sub}
                            </div>
                          )}
                          {card.extra === 'progress' && (
                            <div className='mt-2 h-1 rounded-full bg-white overflow-hidden'>
                              <div className='h-full w-2/3 tangerine-gradient rounded-full'></div>
                            </div>
                          )}
                          {card.extra === 'ai-flag' && (
                            <div className='mt-2 flex items-center gap-1.5'>
                              <div className='w-4 h-4 rounded-full bg-[#f5f3ff] text-[#8b5cf6] text-[7px] font-bold flex items-center justify-center'>
                                ✦
                              </div>
                              <span className='text-[9px] text-[#8b5cf6] font-semibold'>
                                1 continuity flag
                              </span>
                            </div>
                          )}
                          {card.extra === 'approved' && (
                            <div className='text-[9px] text-green-700 mt-0.5 flex items-center gap-1'>
                              <Check className='w-2.5 h-2.5' /> Approved
                            </div>
                          )}
                          {card.extra === 'draft' && (
                            <div className='text-[9px] text-[#737373] mt-1'>draft</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Floating AI card */}
            <div className='hidden md:block absolute -top-7 -right-4 lg:-right-10 w-72 glass rounded-2xl shadow-xl border border-[#e7e7e7] p-4 float-anim-slow'>
              <div className='flex items-center gap-2 mb-2'>
                <div className='w-6 h-6 rounded ai-gradient flex items-center justify-center'>
                  <Sparkles className='w-3.5 h-3.5 text-white' />
                </div>
                <span className='text-[10px] font-bold uppercase tracking-[0.15em] text-[#8b5cf6]'>
                  Continuity Check
                </span>
                <span className='ml-auto text-[9px] text-[#737373] font-mono'>3s ago</span>
              </div>
              <div className='text-xs text-[#404040] leading-relaxed'>
                Scene 04 panel 2 has a{' '}
                <span className='font-semibold text-[#171717]'>lighting inconsistency</span> vs.
                neighboring pages.
              </div>
              <div className='mt-3 pt-3 border-t border-[#e7e7e7]/60 flex items-center gap-2 text-[10px]'>
                <span className='text-[#737373] font-mono'>p.13.5, p.13.6</span>
                <span className='ml-auto text-[#8b5cf6] font-semibold'>View fix →</span>
              </div>
            </div>
            {/* Floating stats card */}
            <div className='hidden md:block absolute -bottom-7 -left-4 lg:-left-10 w-60 bg-white rounded-2xl soft-shadow-lg border border-[#e7e7e7] p-4 float-anim'>
              <div className='flex items-center justify-between mb-3'>
                <div className='text-[10px] uppercase tracking-[0.15em] text-[#737373] font-semibold'>
                  This week
                </div>
                <div className='text-[9px] text-[#737373] font-mono'>CH-14</div>
              </div>
              <div className='space-y-3'>
                <div>
                  <div className='flex items-baseline justify-between'>
                    <div className='font-serif text-2xl font-medium text-[#171717]'>142</div>
                    <div className='text-[10px] text-green-600 font-semibold font-mono'>+18%</div>
                  </div>
                  <div className='text-[10px] text-[#737373] mt-0.5'>Panels shipped</div>
                </div>
                <div>
                  <div className='flex items-baseline justify-between'>
                    <div className='font-serif text-2xl font-medium text-[#171717]'>
                      3.2<span className='text-sm text-[#737373]'>d</span>
                    </div>
                    <div className='text-[10px] text-green-600 font-semibold font-mono'>-22%</div>
                  </div>
                  <div className='text-[10px] text-[#737373] mt-0.5'>Avg page turnaround</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== CTA ===== */}
      <div id='block-cta' className='py-16 md:py-24 relative overflow-hidden'>
        <div className='absolute inset-0 bg-gradient-to-b from-white via-[#EAE6DF] to-white'></div>
        <div className='absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-[#f97316]/8 blur-3xl'></div>
        <div className='relative max-w-3xl mx-auto px-6 lg:px-8 text-center'>
          <div className='animate-on-scroll'>
            <div className='inline-flex items-center gap-2 text-[11px] font-semibold text-[#f97316] uppercase tracking-[0.2em] mb-6'>
              <span className='w-8 h-px bg-[#f97316]'></span>
              Start in minutes
              <span className='w-8 h-px bg-[#f97316]'></span>
            </div>
            <h2 className='font-serif text-5xl md:text-6xl lg:text-7xl font-medium leading-[1.02] tracking-tight'>
              Ready to architect
              <br />
              your <em className='font-normal text-[#737373]'>studio</em>?
            </h2>
            <p className='mt-7 text-lg text-[#737373] max-w-xl mx-auto leading-relaxed'>
              Bring your team, your series bible, and your pipeline. PanelForge turns months of
              scattered work into a verifiable record of every panel you ship.
            </p>
            <div className='mt-10 flex flex-col sm:flex-row items-center justify-center gap-3'>
              <button
                onClick={() => onEnterDemo('producer')}
                className='group inline-flex items-center gap-2 px-7 py-4 rounded-full tangerine-gradient text-white font-semibold text-base tangerine-shadow-lg hover:shadow-[0_18px_50px_rgba(249,115,22,0.45)] transition-all hover:-translate-y-0.5 cursor-pointer'
              >
                Onboard Your Studio
                <ArrowRight className='w-4 h-4 group-hover:translate-x-0.5 transition-transform' />
              </button>
              <button
                onClick={() => onEnterDemo('producer')}
                className='inline-flex items-center gap-2 px-7 py-4 rounded-full bg-white border border-[#e7e7e7] text-[#171717] font-medium text-base hover:border-[#404040]/30 transition soft-shadow cursor-pointer'
              >
                Talk to a specialist
              </button>
            </div>
            <div className='mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#737373]'>
              <div className='flex items-center gap-1.5'>
                <Check className='w-3.5 h-3.5 text-[#f97316]' /> 14-day studio trial
              </div>
              <div className='flex items-center gap-1.5'>
                <Check className='w-3.5 h-3.5 text-[#f97316]' /> No credit card required
              </div>
              <div className='flex items-center gap-1.5'>
                <Check className='w-3.5 h-3.5 text-[#f97316]' /> Free data migration
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== FOOTER ===== */}
      <footer className='bg-[#171717] text-white relative'>
        <div className='absolute inset-0 dot-bg opacity-[0.05]'></div>
        <div className='relative max-w-7xl mx-auto px-6 lg:px-8 py-12'>
          <div className='grid grid-cols-2 md:grid-cols-6 gap-10 mb-16'>
            <div className='col-span-2'>
              <a href='#' className='inline-flex items-center gap-2.5'>
                <div className='w-9 h-9 rounded-lg tangerine-gradient flex items-center justify-center soft-shadow'>
                  <svg
                    width='18'
                    height='18'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='white'
                    strokeWidth='2.5'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <path d='M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' />
                  </svg>
                </div>
                <span className='font-serif text-2xl font-bold'>PanelForge</span>
              </a>
              <p className='mt-5 text-sm text-white/60 max-w-xs leading-relaxed'>
                The data layer for manga production. From first script to final approval —
                structured, verifiable, AI-grounded.
              </p>
              <div className='mt-6 flex items-center gap-2 text-[10px] text-white/40 font-mono uppercase tracking-wider'>
                <span className='w-1.5 h-1.5 rounded-full bg-[#f97316] pulse-dot'></span> All
                systems normal
              </div>
            </div>
            {[
              {
                title: 'Product',
                links: ['Features', 'Workflow', 'Series Bible', 'Integrations', 'Changelog'],
              },
              {
                title: 'Studio',
                links: ['Customers', 'Pricing', 'Onboarding', 'Migration', 'Status'],
              },
              {
                title: 'Resources',
                links: ['Docs', 'API Reference', 'Guides', 'Blog', 'Community'],
              },
              { title: 'Company', links: ['About', 'Careers', 'Press kit', 'Contact', 'Security'] },
            ].map((col) => (
              <div key={col.title}>
                <div className='text-[11px] uppercase tracking-[0.2em] text-white/40 font-semibold mb-4'>
                  {col.title}
                </div>
                <ul className='space-y-2.5 text-sm text-white/70'>
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href='#' className='hover:text-[#f97316] transition'>
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className='pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4'>
            <div className='text-xs text-white/40 flex items-center gap-3 flex-wrap justify-center'>
              <span>© 2026 PanelForge Labs.</span>
              <span className='hidden md:inline'>·</span>
              <span>Crafted with ✦ by the Studio.</span>
            </div>
            <div className='flex items-center gap-1'>
              {[Twitter, Github, Linkedin, Rss].map((Icon, i) => (
                <a
                  key={i}
                  href='#'
                  className='w-9 h-9 rounded-full hover:bg-white/5 transition flex items-center justify-center text-white/40 hover:text-[#f97316]'
                >
                  <Icon className='w-4 h-4' />
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ===== FLOATING ROLE WIDGET ===== */}
      <div className='fixed bottom-6 right-6 z-50'>
        <div className='glass rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#e7e7e7] p-1.5 flex items-center gap-1'>
          <div className='hidden sm:flex items-center gap-1.5 pl-2 pr-1.5 py-1'>
            <span className='w-1.5 h-1.5 rounded-full bg-[#f97316] pulse-dot'></span>
            <span className='text-[10px] font-semibold text-[#404040] uppercase tracking-[0.15em]'>
              Preview
            </span>
          </div>
          <div className='hidden sm:block w-px h-5 bg-[#e7e7e7] mx-0.5'></div>
          {[
            { label: 'Producer', Icon: Briefcase, role: 'producer' },
            { label: 'Writer', Icon: PenLine, role: 'writer' },
            { label: 'Artist', Icon: Layers, role: 'artist' },
            { label: 'Editor', Icon: CheckCheck, role: 'editor' },
          ].map(({ label, Icon, role }) => (
            <div key={role} className='relative group'>
              <button
                onClick={() => onEnterDemo(role)}
                className='w-9 h-9 rounded-full transition flex items-center justify-center text-[#404040] hover:text-[#f97316] hover:bg-[#fff7ed] cursor-pointer'
                aria-label={`Preview as ${label}`}
              >
                <Icon className='w-4 h-4' />
              </button>
              <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#171717] text-white text-[10px] rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none'>
                {label}
                <div className='absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#171717]'></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
