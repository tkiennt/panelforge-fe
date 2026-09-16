import React, { useEffect, useRef } from 'react';
import {
  ArrowRight, Play, Check, FolderTree, History, Sparkles,
  Database, GitCommit, BookOpen, KanbanSquare, FileEdit,
  Layers, Eye, CheckCheck, Twitter, Github, Linkedin, Rss,
  Lock, Briefcase, PenLine, ChevronRight
} from 'lucide-react';

interface LandingPageViewProps {
  onEnterDemo: (role: string) => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({ onEnterDemo }) => {
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
      { threshold: 0.08, rootMargin: '0px 0px -60px 0px' }
    );

    document.querySelectorAll('.animate-on-scroll').forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="antialiased text-[#171717] bg-[#FAF8F5]">

      {/* ===== NAV ===== */}
      <header className="sticky top-0 z-40 glass border-b border-[#e7e7e7]/60">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="relative w-9 h-9 rounded-lg tangerine-gradient flex items-center justify-center soft-shadow group-hover:rotate-3 transition-transform">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>
              </svg>
            </div>
            <span className="font-serif text-xl font-bold tracking-tight text-[#171717]">PanelForge</span>
          </a>
          <nav className="hidden md:flex items-center gap-8 text-sm text-[#404040]">
            <a href="#block-features" className="nav-link hover:text-[#171717] transition">Features</a>
            <a href="#block-workflow" className="nav-link hover:text-[#171717] transition">Workflow</a>
            <a href="#block-showcase" className="nav-link hover:text-[#171717] transition">Showcase</a>
            <a href="#block-social" className="nav-link hover:text-[#171717] transition">Studios</a>
            <a href="#" className="nav-link hover:text-[#171717] transition">Docs</a>
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={() => onEnterDemo('producer')} className="hidden sm:block text-sm text-[#404040] hover:text-[#171717] transition cursor-pointer">Sign in</button>
            <button onClick={() => onEnterDemo('producer')} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#171717] text-white text-sm font-medium hover:bg-[#404040] transition soft-shadow cursor-pointer">
              Onboard Studio
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <div className="relative overflow-hidden bg-[#FAF8F5]">
        <div className="absolute inset-0 halftone-pattern"></div>
        <div className="absolute inset-0 hero-radial"></div>
        <div className="absolute inset-0 grid-bg opacity-50"></div>
        <div className="absolute top-32 -left-20 w-72 h-72 rounded-full bg-[#f97316] blur-[100px] opacity-15"></div>
        <div className="absolute top-48 right-0 w-80 h-80 rounded-full bg-[#8b5cf6] blur-[100px] opacity-15"></div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-16 md:pt-24 pb-24 md:pb-32">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left: Copy */}
            <div className="lg:col-span-6 animate-on-scroll">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#e7e7e7] text-xs font-medium text-[#404040] soft-shadow">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] pulse-dot"></span>
                AI-Assisted Manga Production
                <span className="text-[#737373]">·</span>
                <span className="font-mono text-[10px] text-[#737373] uppercase tracking-wider">v3.0</span>
              </div>
              <h1 className="mt-7 font-serif text-5xl md:text-6xl lg:text-7xl font-medium leading-[1.02] tracking-tight text-[#171717]">
                <em className="font-normal text-[#f97316] not-italic italic">Architect</em> Your<br />
                Manga Production.
              </h1>
              <p className="mt-7 text-lg text-[#737373] max-w-lg leading-relaxed">
                From first script to final approval, PanelForge turns chaotic creative work into{' '}
                <span className="text-[#171717] font-medium">structured, verifiable production data</span> — with AI grounded in your series bible.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => onEnterDemo('producer')}
                  className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-full tangerine-gradient text-white font-semibold text-sm tangerine-shadow hover:tangerine-shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer"
                >
                  Onboard Studio
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <a href="#block-workflow" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white border border-[#e7e7e7] text-[#171717] font-medium text-sm hover:border-[#404040]/30 transition">
                  <Play className="w-3.5 h-3.5 text-[#f97316] fill-[#f97316]" />
                  See the workflow
                </a>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#737373]">
                <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#f97316]" /> 14-day studio trial</div>
                <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#f97316]" /> Migrate from any tool</div>
                <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#f97316]" /> SOC 2 ready</div>
              </div>
            </div>

            {/* Right: Visual composition */}
            <div className="lg:col-span-6 relative animate-on-scroll delay-200">
              <div className="relative h-[560px] md:h-[620px]">
                {/* Main project card */}
                <div className="absolute top-0 left-0 w-[340px] md:w-[380px] float-anim">
                  <div className="bg-white rounded-2xl soft-shadow-lg border border-[#e7e7e7]/70 p-5">
                    <div className="flex items-center justify-between pb-3.5 border-b border-[#e7e7e7]/60">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg tangerine-gradient flex items-center justify-center text-white font-serif font-bold text-base">A</div>
                        <div>
                          <div className="text-sm font-semibold text-[#171717] leading-tight">Chronicles of Aria</div>
                          <div className="text-[10px] text-[#737373] uppercase tracking-wider mt-0.5">Series · In Production</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#737373] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] pulse-dot"></span> Live
                      </div>
                    </div>
                    <div className="pt-3.5 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-[#171717] font-medium">
                        <span className="text-[#737373] text-[10px] w-3 inline-block">▾</span>
                        <span>Vol. 3 — The Hollow Crown</span>
                        <span className="ml-auto text-[10px] text-[#737373] font-mono">8/12 ch</span>
                      </div>
                      <div className="ml-4 pl-3 border-l border-dashed border-[#e7e7e7] space-y-1.5 pt-1">
                        <div className="flex items-center gap-2 text-xs text-[#171717] font-medium">
                          <span className="text-[#737373] text-[10px] w-3 inline-block">▾</span>
                          <span>Ch. 14 — Embers</span>
                          <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-[#fff7ed] text-[#f97316] font-semibold tracking-wide">ACTIVE</span>
                        </div>
                        <div className="ml-4 pl-3 border-l border-dashed border-[#e7e7e7] space-y-1.5 pt-1">
                          <div className="flex items-center gap-2 text-[11px] text-[#404040]">
                            <span className="text-[#737373] text-[9px] w-3 inline-block">◇</span>
                            <span>Scene 04 — "The Choice"</span>
                            <span className="ml-auto text-[9px] text-[#737373] font-mono">4p</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-[#404040]">
                            <span className="text-[#737373] text-[9px] w-3 inline-block">◇</span>
                            <span>Scene 05 — "Departure"</span>
                            <span className="ml-auto text-[9px] text-[#737373] font-mono">6p</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-[#737373]">
                            <span className="text-[9px] w-3 inline-block">◇</span>
                            <span className="italic">Scene 06 — "The Fire"</span>
                            <span className="ml-auto text-[9px] italic font-mono">draft</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3.5 border-t border-[#e7e7e7]/60 flex items-center gap-4 text-[10px] text-[#737373]">
                      <div><span className="font-semibold text-[#171717] font-mono">142</span> panels</div>
                      <div><span className="font-semibold text-[#171717] font-mono">3</span> artists</div>
                      <div><span className="font-semibold text-green-600 font-mono">98%</span> on-time</div>
                    </div>
                  </div>
                </div>

                {/* Mini Kanban */}
                <div className="absolute top-8 right-0 w-[210px] float-anim-slow">
                  <div className="bg-white rounded-2xl soft-shadow-lg border border-[#e7e7e7]/70 p-3.5">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="text-[9px] uppercase tracking-[0.15em] text-[#737373] font-semibold">Pipeline</div>
                      <div className="text-[9px] text-[#737373] font-mono">CH-14</div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div>
                        <div className="text-[8px] uppercase tracking-wider text-[#737373] mb-1 font-semibold">Script</div>
                        <div className="bg-[#faf8f5] rounded p-1.5 text-[10px] text-[#404040] font-mono font-semibold">3</div>
                      </div>
                      <div>
                        <div className="text-[8px] uppercase tracking-wider text-[#D97706] mb-1 font-semibold">Ink</div>
                        <div className="bg-[#FFFBEB] rounded p-1.5 text-[10px] text-[#D97706] font-mono font-bold">12</div>
                      </div>
                      <div>
                        <div className="text-[8px] uppercase tracking-wider text-[#737373] mb-1 font-semibold">Done</div>
                        <div className="bg-[#F0FDF4] rounded p-1.5 text-[10px] text-[#10B981] font-mono font-semibold">24</div>
                      </div>
                    </div>
                    <div className="mt-3 h-1 rounded-full bg-[#e7e7e7] overflow-hidden">
                      <div className="h-full w-3/5 tangerine-gradient rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* AI Grounded Card */}
                <div className="absolute top-44 right-2 md:-right-6 w-[260px] glass rounded-2xl shadow-xl border border-[#e7e7e7]/70 p-4 float-anim-delay">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded ai-gradient flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8b5cf6]">AI Grounded</span>
                    <span className="ml-auto text-[9px] text-[#737373] font-mono">just now</span>
                  </div>
                  <div className="text-xs text-[#404040] leading-relaxed">
                    Aria's scar should be <span className="font-semibold text-[#171717]">hidden</span> in this scene — established Vol. 1, Ch. 02.
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#e7e7e7]/60 flex items-center gap-2 text-[10px]">
                    <BookOpen className="w-3 h-3 text-[#737373]" />
                    <span className="text-[#737373]">3 sources cited</span>
                    <span className="ml-auto text-[#8b5cf6] font-semibold cursor-pointer">Apply →</span>
                  </div>
                </div>

                {/* Status Pill */}
                <div className="absolute bottom-20 left-6 md:left-16 px-3.5 py-2 rounded-full bg-white border border-[#e7e7e7] soft-shadow text-xs flex items-center gap-2 float-anim">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] pulse-dot"></span>
                  <span className="font-medium text-[#171717]">3 pages approved</span>
                  <span className="text-[#737373]">· just now</span>
                </div>

                {/* Activity Feed */}
                <div className="absolute bottom-0 right-0 w-[245px] bg-white rounded-2xl soft-shadow-lg border border-[#e7e7e7]/70 p-3.5 float-anim-slow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] uppercase tracking-[0.15em] text-[#737373] font-semibold">Activity</div>
                    <div className="flex items-center gap-1 text-[9px] text-[#737373] font-mono">
                      <span className="w-1 h-1 rounded-full bg-[#f97316] pulse-dot"></span> live
                    </div>
                  </div>
                  <div className="space-y-2.5 text-[11px]">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#fff7ed] flex items-center justify-center text-[#f97316] text-[9px] font-bold flex-shrink-0">M</div>
                      <div className="flex-1 leading-relaxed">
                        <span className="font-semibold text-[#171717]">Mika</span> <span className="text-[#404040]">inked page 14.3</span>
                        <div className="text-[9px] text-[#737373] mt-0.5 font-mono">2 min ago</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#f5f3ff] flex items-center justify-center text-[#8b5cf6] text-[9px] font-bold flex-shrink-0">✦</div>
                      <div className="flex-1 leading-relaxed">
                        <span className="font-semibold text-[#171717]">AI</span> <span className="text-[#404040]">flagged continuity on p.14.2</span>
                        <div className="text-[9px] text-[#737373] mt-0.5 font-mono">5 min ago</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#f4f0e8] flex items-center justify-center text-[#404040] text-[9px] font-bold flex-shrink-0">J</div>
                      <div className="flex-1 leading-relaxed">
                        <span className="font-semibold text-[#171717]">Jiro</span> <span className="text-[#404040]">approved scene 03</span>
                        <div className="text-[9px] text-[#737373] mt-0.5 font-mono">12 min ago</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== VALUE PROPOSITION ===== */}
      <div className="py-24 md:py-32 relative bg-[#F3F3F3]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto animate-on-scroll">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#f97316] uppercase tracking-[0.2em] mb-6">
              <span className="w-8 h-px bg-[#f97316]"></span>
              Why PanelForge
              <span className="w-8 h-px bg-[#f97316]"></span>
            </div>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-medium leading-[1.05] tracking-tight text-[#171717]">
              Production is data,<br />
              <em className="font-normal text-[#737373]">not chaos.</em>
            </h2>
            <p className="mt-7 text-lg text-[#737373] leading-relaxed">
              Stop emailing scripts. Stop losing panel assignments in chat. PanelForge replaces scattered files with a single, structured, append-only record of every creative decision your studio makes.
            </p>
          </div>

          <div className="relative mt-20">
            <div className="grid md:grid-cols-3 gap-5">
              <div className="animate-on-scroll group p-8 rounded-2xl bg-white border border-[#e7e7e7]/70 hover:border-[#0EA5E9]/40 transition-all duration-500 hover:shadow-[0_20px_60px_rgba(14,165,233,0.10)] hover:-translate-y-1.5">
                <div className="w-12 h-12 rounded-xl bg-[#0EA5E9]/10 flex items-center justify-center text-[#0EA5E9] mb-5 group-hover:scale-110 transition-transform">
                  <FolderTree className="w-6 h-6" />
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-[#0EA5E9] font-semibold mb-2">Structured</div>
                <h3 className="font-serif text-2xl font-medium text-[#171717]">A first-class model for every panel.</h3>
                <p className="mt-2.5 text-sm text-[#737373] leading-relaxed">Series, volumes, chapters, scenes, panels — each layer is a first-class object with linked script, references, and approvals.</p>
              </div>
              <div className="animate-on-scroll delay-100 group p-8 rounded-2xl bg-white border border-[#e7e7e7]/70 hover:border-[#404040]/30 transition-all duration-500 hover:shadow-[0_20px_60px_rgba(23,23,23,0.08)] hover:-translate-y-1.5">
                <div className="w-12 h-12 rounded-xl bg-[#f4f0e8] flex items-center justify-center text-[#171717] mb-5 group-hover:scale-110 transition-transform">
                  <History className="w-6 h-6" />
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-[#404040] font-semibold mb-2">Verifiable</div>
                <h3 className="font-serif text-2xl font-medium text-[#171717]">An append-only record of decisions.</h3>
                <p className="mt-2.5 text-sm text-[#737373] leading-relaxed">Every change is appended, never overwritten. Roll back, audit, and trust the timeline of who did what, when.</p>
              </div>
              <div className="animate-on-scroll delay-200 group p-8 rounded-2xl bg-white border border-[#e7e7e7]/70 hover:border-[#8b5cf6]/40 transition-all duration-500 hover:shadow-[0_20px_60px_rgba(139,92,246,0.10)] hover:-translate-y-1.5">
                <div className="w-12 h-12 rounded-xl bg-[#f5f3ff] flex items-center justify-center text-[#8b5cf6] mb-5 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-[#8b5cf6] font-semibold mb-2">Grounded</div>
                <h3 className="font-serif text-2xl font-medium text-[#171717]">AI that cites your own bible.</h3>
                <p className="mt-2.5 text-sm text-[#737373] leading-relaxed">Every AI suggestion is grounded in your series bible — never the open internet. Citations, not hallucinations.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== FEATURES HEADER ===== */}
      <div id="block-features" className="py-20 md:py-28 bg-[#FAF8F5] relative border-t border-[#E7E7E7]/50">
        <div className="absolute inset-0 dot-bg opacity-40"></div>
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-20 animate-on-scroll">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#f97316] uppercase tracking-[0.2em] mb-6">
              <span className="w-8 h-px bg-[#f97316]"></span>
              The Four Pillars
              <span className="w-8 h-px bg-[#f97316]"></span>
            </div>
            <h2 className="font-serif text-4xl md:text-5xl font-medium leading-[1.1] tracking-tight">
              A studio operating system,<br />not another file drawer.
            </h2>
          </div>
        </div>
      </div>

      {/* ===== FEATURE 1: Structured Content Model ===== */}
      <div className="py-20 md:py-24 bg-[#F3F3F3] relative">
        <div className="absolute inset-0 halftone-pattern opacity-30"></div>
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="animate-on-scroll">
              <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#0EA5E9] uppercase tracking-[0.2em] mb-4">
                <span className="w-8 h-px bg-[#0EA5E9]"></span>
                01 / Structured Content
              </div>
              <h3 className="font-serif text-4xl md:text-5xl font-medium leading-[1.1] tracking-tight text-[#171717]">
                A <em className="font-normal text-[#0EA5E9] italic">data model</em> that thinks like manga.
              </h3>
              <p className="mt-5 text-lg text-[#737373] leading-relaxed">
                Series, volumes, chapters, scenes, panels — every layer is a first-class object with linked script, references, and approvals. No more hunting through nested file folders.
              </p>
              <ul className="mt-7 space-y-3 text-sm text-[#404040]">
                {[
                  { bold: 'Per-panel metadata', rest: '— dialogue, SFX, references, status, owner' },
                  { bold: 'Bidirectional links', rest: 'between scenes, panels, and assets' },
                  { bold: 'Query the studio', rest: 'like a database — "all panels awaiting review"' },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 w-5 h-5 rounded-full tangerine-gradient flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                    <span><span className="text-[#171717] font-medium">{item.bold}</span> {item.rest}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="animate-on-scroll delay-200 relative">
              <div className="absolute -inset-6 bg-gradient-to-br from-[#f97316]/8 to-[#8b5cf6]/5 rounded-3xl blur-2xl"></div>
              <div className="relative bg-white rounded-2xl soft-shadow-lg border border-[#e7e7e7]/70 p-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#e7e7e7]/60">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[#737373] font-semibold">Content Model</div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#737373] font-mono">
                    <Database className="w-3 h-3" /> query
                  </div>
                </div>
                <div className="pt-3.5 space-y-1.5 text-xs">
                  {['Series', 'Volume', 'Chapter', 'Scene'].reduce((acc, level, i) => {
                    const counts = ['1', '3', '14', '6'];
                    return [...acc, { level, count: counts[i], indent: i }];
                  }, [] as { level: string; count: string; indent: number }[]).map(({ level, count, indent }) => (
                    <div key={level} style={{ marginLeft: `${indent * 16}px` }}>
                      <div className={`${indent > 0 ? 'pl-3 border-l border-dashed border-[#e7e7e7]' : ''} flex items-center gap-2 text-[#404040] py-0.5`}>
                        <span className="text-[#737373] text-[10px] w-3 inline-block">{indent < 3 ? '▾' : '▸'}</span>
                        <span>{level}</span>
                        <span className="ml-auto text-[9px] text-[#737373] font-mono">{count}</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginLeft: '64px' }} className="pl-3 border-l border-dashed border-[#e7e7e7]">
                    <div className="flex items-center gap-2 text-[#f97316] font-medium py-0.5">
                      <span className="w-3 inline-block">·</span>
                      <span>Panel</span>
                      <span className="ml-auto text-[9px] text-[#737373] font-mono">142</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[#e7e7e7]/60">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="text-[10px] uppercase tracking-[0.15em] text-[#737373] font-semibold">Panel · 14.3.2</div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#fff7ed] text-[#f97316] font-semibold">In Inking</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div className="bg-[#faf8f5] rounded-lg p-2">
                      <div className="text-[#737373] uppercase tracking-wider text-[8px] font-semibold">Dialogue</div>
                      <div className="text-[#171717] mt-1 leading-snug">"I never asked for this."</div>
                    </div>
                    <div className="bg-[#faf8f5] rounded-lg p-2">
                      <div className="text-[#737373] uppercase tracking-wider text-[8px] font-semibold">SFX</div>
                      <div className="text-[#171717] mt-1 leading-snug">— crack</div>
                    </div>
                    <div className="bg-[#faf8f5] rounded-lg p-2">
                      <div className="text-[#737373] uppercase tracking-wider text-[8px] font-semibold">Owner</div>
                      <div className="text-[#171717] mt-1 leading-snug flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-[#fff7ed] text-[#f97316] text-[7px] font-bold flex items-center justify-center">M</span>
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
      <div className="py-20 md:py-24 bg-[#FAF8F5] relative">
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="animate-on-scroll lg:order-2">
              <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#404040] uppercase tracking-[0.2em] mb-4">
                <span className="w-8 h-px bg-[#404040]"></span>
                02 / Append-Only Event Store
              </div>
              <h3 className="font-serif text-4xl md:text-5xl font-medium leading-[1.1] tracking-tight text-[#171717]">
                Every decision, <em className="font-normal text-[#737373]">never</em> overwritten.
              </h3>
              <p className="mt-5 text-lg text-[#737373] leading-relaxed">
                PanelForge treats your studio like a ledger. Script changes, panel revisions, and approvals are committed as events — fully auditable, fully reversible.
              </p>
              <ul className="mt-7 space-y-3 text-sm text-[#404040]">
                {[
                  { bold: 'Cryptographic event log', rest: '— every change signed and time-stamped' },
                  { bold: 'Diff-and-restore', rest: 'any panel, scene, or chapter to any point in time' },
                  { bold: 'Audit-ready exports', rest: 'for publishers, legal, and your future self' },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-[#171717] flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                    <span><span className="text-[#171717] font-medium">{item.bold}</span> {item.rest}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="animate-on-scroll delay-200 lg:order-1 relative">
              <div className="absolute -inset-6 bg-gradient-to-br from-[#171717]/5 to-[#f97316]/5 rounded-3xl blur-2xl"></div>
              <div className="relative bg-white rounded-2xl soft-shadow-lg border border-[#e7e7e7]/70 p-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#e7e7e7]/60">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-[#f4f0e8] flex items-center justify-center text-[#171717]">
                      <GitCommit className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.15em] text-[#737373] font-semibold">Event Log</div>
                      <div className="text-[10px] text-[#737373] font-mono">ch.14 / scene.04</div>
                    </div>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#171717] text-white font-semibold tracking-wider">APPEND-ONLY</span>
                </div>
                <div className="relative pt-4 pl-6">
                  <div className="absolute left-[10px] top-5 bottom-3 w-px bg-[#e7e7e7]"></div>
                  <div className="space-y-4 text-[11px]">
                    {[
                      { time: '14:42 · jiro', hash: '7a3f…b2', title: 'Approved page 14.1', desc: 'Reviewed against bible v3.2 · 4 panels verified', dot: 'bg-[#f97316]' },
                      { time: '14:38 · mika', hash: '9c12…e8', title: 'Inked page 14.3', desc: '3 panels committed · references linked', dot: 'bg-[#e7e7e7]' },
                      { time: '14:21 · ai', hash: '2f8d…a1', title: 'Continuity check on scene 04', desc: '2 flags raised · cited Vol. 1, Ch. 02', dot: 'bg-[#8b5cf6]' },
                      { time: '10:04 · mika', hash: '5b41…c0', title: 'Added scene 05 to chapter 14', desc: '6 panels · script + references', dot: 'bg-[#e7e7e7]' },
                    ].map((ev, i) => (
                      <div key={i} className="relative">
                        <div className={`absolute -left-[19px] top-1 w-3 h-3 rounded-full ${ev.dot} border-2 border-white`}></div>
                        <div className="flex items-center justify-between">
                          <div className="font-mono text-[10px] text-[#737373]">{ev.time}</div>
                          <div className="font-mono text-[9px] text-[#737373]">{ev.hash}</div>
                        </div>
                        <div className="mt-1 text-[#171717] font-medium">{ev.title}</div>
                        <div className="text-[#737373] leading-snug">{ev.desc}</div>
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
      <div className="py-20 md:py-24 bg-[#F3F3F3] relative">
        <div className="absolute inset-0 halftone-pattern opacity-30"></div>
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="animate-on-scroll">
              <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#8b5cf6] uppercase tracking-[0.2em] mb-4">
                <span className="w-8 h-px bg-[#8b5cf6]"></span>
                03 / AI-Grounded Bible
              </div>
              <h3 className="font-serif text-4xl md:text-5xl font-medium leading-[1.1] tracking-tight text-[#171717]">
                AI that <em className="font-normal text-[#8b5cf6]">cites</em> your own canon.
              </h3>
              <p className="mt-5 text-lg text-[#737373] leading-relaxed">
                Your series bible is the source of truth. PanelForge's AI only suggests from it — and every suggestion ships with a citation to the volume, chapter, and panel it came from.
              </p>
              <ul className="mt-7 space-y-3 text-sm text-[#404040]">
                {[
                  { bold: 'Characters, locations, terms', rest: '— versioned, linkable, queryable' },
                  { bold: 'Every AI claim cited', rest: '— never the open internet, only your canon' },
                  { bold: 'Continuity flags', rest: 'the moment a panel drifts from bible' },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 w-5 h-5 rounded-full ai-gradient flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                    <span><span className="text-[#171717] font-medium">{item.bold}</span> {item.rest}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="animate-on-scroll delay-200 relative">
              <div className="absolute -inset-6 bg-gradient-to-br from-[#8b5cf6]/10 to-[#f97316]/5 rounded-3xl blur-2xl"></div>
              <div className="relative bg-white rounded-2xl soft-shadow-lg border border-[#e7e7e7]/70 p-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#e7e7e7]/60">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-[#f4f0e8] flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-[#171717]" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.15em] text-[#737373] font-semibold">Series Bible</div>
                      <div className="text-[10px] text-[#737373] font-mono">aria.v3 · 218 entries</div>
                    </div>
                  </div>
                  <div className="text-[9px] text-[#737373] font-mono flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-green-500"></span> synced
                  </div>
                </div>
                <div className="pt-3.5 space-y-2.5">
                  <div className="p-3 rounded-lg border border-[#F4728A]/20 bg-[#F4728A]/5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#F4728A]/10 text-[#E11D48] text-[10px] font-bold flex items-center justify-center">A</span>
                        <span className="text-sm font-semibold text-[#E11D48]">Aria</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#E11D48]/10 text-[#E11D48] font-semibold tracking-wider">CHARACTER</span>
                      </div>
                      <span className="text-[9px] text-[#737373] font-mono">v3.2</span>
                    </div>
                    <div className="text-[11px] text-[#404040] leading-relaxed">Protagonist · quiet, determined · scar on left brow, hidden Vol. 1+ · speaks in short sentences · sworn to the Hollow Crown.</div>
                  </div>
                  <div className="p-3 rounded-lg border border-[#e7e7e7]/70 bg-[#faf8f5]/60">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-full bg-[#fff7ed] text-[#f97316] text-[10px] font-bold flex items-center justify-center">◇</span>
                      <span className="text-sm font-semibold text-[#171717]">Hollow Crown</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#404040] text-white font-semibold tracking-wider">MACGUFFIN</span>
                    </div>
                    <div className="text-[11px] text-[#404040] leading-relaxed">Antagonistic relic · grants <span className="text-[#171717] font-medium">no</span> magical power · corrupted bearer in Vol. 2.</div>
                  </div>
                </div>
                <div className="mt-3.5 p-3.5 rounded-xl border border-[#8b5cf6]/20 bg-[#f5f3ff]/60 relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-5 h-5 rounded ai-gradient flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8b5cf6]">AI Suggestion</span>
                  </div>
                  <div className="text-[11px] text-[#404040] leading-relaxed">
                    Scene 04 panel 2 may conflict with Aria's <span className="font-semibold text-[#171717]">scar hidden</span> rule. Verify or update the bible.
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#8b5cf6]/15 flex items-center gap-1.5 text-[10px] text-[#737373]">
                    <span className="font-mono">aria.char.scar = hidden</span>
                    <span className="ml-auto text-[#8b5cf6] font-semibold cursor-pointer">View source →</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== FEATURE 4: Kanban Pipeline ===== */}
      <div className="py-20 md:py-24 bg-[#FAF8F5] relative">
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="animate-on-scroll lg:order-2">
              <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#D97706] uppercase tracking-[0.2em] mb-4">
                <span className="w-8 h-px bg-[#D97706]"></span>
                04 / Kanban Pipeline
              </div>
              <h3 className="font-serif text-4xl md:text-5xl font-medium leading-[1.1] tracking-tight text-[#171717]">
                Production that <em className="font-normal text-[#D97706] italic">flows</em>, not queues.
              </h3>
              <p className="mt-5 text-lg text-[#737373] leading-relaxed">
                Every scene moves through a single, visible pipeline — script, sketch, ink, review, approved. No more "where is this page?" messages.
              </p>
              <ul className="mt-7 space-y-3 text-sm text-[#404040]">
                {[
                  { bold: 'Configurable stages', rest: 'per series — match your studio\'s rhythm' },
                  { bold: 'Per-page WIP limits', rest: 'so artists aren\'t drowning' },
                  { bold: 'Bottleneck detection', rest: '— flag stages that stall' },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 w-5 h-5 rounded-full tangerine-gradient flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                    <span><span className="text-[#171717] font-medium">{item.bold}</span> {item.rest}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="animate-on-scroll delay-200 lg:order-1 relative">
              <div className="absolute -inset-6 bg-gradient-to-br from-[#f97316]/8 to-[#171717]/5 rounded-3xl blur-2xl"></div>
              <div className="relative bg-white rounded-2xl soft-shadow-lg border border-[#e7e7e7]/70 p-3.5">
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#e7e7e7]/60 px-1">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-[#737373] font-semibold">Chapter 14 · Pipeline</div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#737373] font-mono">
                    <KanbanSquare className="w-3 h-3" /> 4 stages
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {/* Script */}
                  <div>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <div className="text-[9px] font-bold text-[#404040] uppercase tracking-wider">Script</div>
                      <div className="text-[9px] text-[#737373] font-mono">3</div>
                    </div>
                    <div className="space-y-1.5">
                      {['Scene 04', 'Scene 05', 'Scene 06'].map((s, i) => (
                        <div key={s} className="bg-[#faf8f5] rounded-md p-2 border border-[#e7e7e7]/60">
                          <div className="text-[10px] font-semibold text-[#171717]">{s}</div>
                          {i === 2 && <div className="text-[8px] italic text-[#737373] mt-0.5">draft</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Ink */}
                  <div>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <div className="text-[9px] font-bold text-[#f97316] uppercase tracking-wider">Ink</div>
                      <div className="text-[9px] text-[#f97316] font-mono font-bold">5</div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="bg-[#fff7ed]/70 rounded-md p-2 border border-[#f97316]/30">
                        <div className="text-[10px] font-semibold text-[#171717]">Page 14.3</div>
                        <div className="mt-1 h-1 rounded-full bg-white overflow-hidden">
                          <div className="h-full w-2/3 tangerine-gradient rounded-full"></div>
                        </div>
                      </div>
                      {['Page 14.4', 'Page 14.5'].map(p => (
                        <div key={p} className="bg-[#faf8f5] rounded-md p-2 border border-[#e7e7e7]/60">
                          <div className="text-[10px] font-semibold text-[#171717]">{p}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Review */}
                  <div>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <div className="text-[9px] font-bold text-[#D97706] uppercase tracking-wider">Review</div>
                      <div className="text-[9px] text-[#D97706] font-mono font-bold">2</div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="bg-[#FFFBEB] rounded-md p-2 border border-[#D97706]/30">
                        <div className="text-[10px] font-semibold text-[#171717]">Page 14.1</div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="w-3 h-3 rounded-full bg-[#f5f3ff] text-[#8b5cf6] text-[7px] font-bold flex items-center justify-center">✦</span>
                          <span className="text-[8px] text-[#8b5cf6] font-semibold">1 flag</span>
                        </div>
                      </div>
                      <div className="bg-[#FFFBEB] rounded-md p-2 border border-[#D97706]/30">
                        <div className="text-[10px] font-semibold text-[#171717]">Page 14.2</div>
                      </div>
                    </div>
                  </div>
                  {/* Done */}
                  <div>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <div className="text-[9px] font-bold text-[#10B981] uppercase tracking-wider">Done</div>
                      <div className="text-[9px] text-[#10B981] font-mono font-bold">24</div>
                    </div>
                    <div className="space-y-1.5">
                      {['Page 13.8', 'Page 13.7', 'Page 13.6'].map(p => (
                        <div key={p} className="bg-[#f4f0e8]/60 rounded-md p-2 border border-[#e7e7e7]/60">
                          <div className="text-[10px] font-semibold text-[#404040]">{p}</div>
                          <div className="text-[8px] text-[#10B981] mt-0.5 flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> approved
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
      <div id="block-workflow" className="py-24 md:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#faf8f5] to-white"></div>
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-20 animate-on-scroll">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#f97316] uppercase tracking-[0.2em] mb-6">
              <span className="w-8 h-px bg-[#f97316]"></span>
              From Script to Approved Page
              <span className="w-8 h-px bg-[#f97316]"></span>
            </div>
            <h2 className="font-serif text-4xl md:text-5xl font-medium leading-[1.1] tracking-tight">
              A workflow your team<br />will actually follow.
            </h2>
          </div>
          <div className="relative">
            <div className="hidden lg:block absolute top-12 left-[12%] right-[12%] h-px connector-dashed"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-6 relative">
              {[
                { step: '01', title: 'Script', role: 'Writer', Icon: FileEdit, color: 'text-[#f97316]', desc: 'Writers draft scenes in structured panels — dialogue, SFX, and beats, all linked to the bible.' },
                { step: '02', title: 'Produce', role: 'Artist', Icon: Layers, color: 'text-[#f97316]', desc: 'Artists pull panel-by-panel assignments, with references, history, and ownership baked in.' },
                { step: '03', title: 'Review', role: 'Reviewer', Icon: Eye, color: 'text-[#8b5cf6]', highlight: true, desc: 'Reviewers approve against the bible. AI surfaces continuity flags before humans need to.' },
                { step: '04', title: 'Approved', role: 'Producer', Icon: CheckCheck, color: 'text-[#f97316]', border: true, desc: 'Approved pages export to your pipeline. Every state is in the log. Nothing is lost.' },
              ].map(({ step, title, role, Icon, color, highlight, border, desc }, i) => (
                <div key={step} className={`animate-on-scroll ${i > 0 ? `delay-${i}00` : ''} flex flex-col items-center text-center`}>
                  <div className="relative mb-6">
                    <div className={`absolute inset-0 ${highlight ? 'bg-[#8b5cf6]/15' : 'bg-[#f97316]/15'} rounded-full blur-2xl scale-110`}></div>
                    <div className={`relative w-24 h-24 rounded-full bg-white ${border ? 'border-2 border-[#f97316]' : 'border-2 border-[#e7e7e7]'} soft-shadow flex items-center justify-center`}>
                      <span className={`absolute -top-1 -right-1 w-7 h-7 rounded-full ${border ? 'tangerine-gradient' : 'ink-gradient'} text-white text-xs font-bold flex items-center justify-center font-mono`}>{step}</span>
                      <Icon className={`w-8 h-8 ${color}`} />
                    </div>
                  </div>
                  <h3 className="font-serif text-2xl font-medium text-[#171717]">{title}</h3>
                  <div className={`text-[10px] uppercase tracking-[0.18em] ${highlight ? 'text-[#8b5cf6]' : 'text-[#f97316]'} font-semibold mt-1.5`}>{role}</div>
                  <p className="mt-2.5 text-sm text-[#737373] leading-relaxed max-w-[220px]">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== SHOWCASE ===== */}
      <div id="block-showcase" className="py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-[#faf8f5] to-white"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] rounded-full bg-[#f97316]/5 blur-3xl"></div>
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 animate-on-scroll">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#f97316] uppercase tracking-[0.2em] mb-6">
              <span className="w-8 h-px bg-[#f97316]"></span>
              Unified Workspace
              <span className="w-8 h-px bg-[#f97316]"></span>
            </div>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-medium leading-[1.05] tracking-tight">
              Every role, <em className="font-normal text-[#737373]">one</em> canvas.
            </h2>
            <p className="mt-6 text-lg text-[#737373] leading-relaxed">
              Writers, artists, reviewers, and producers working from the same structured source of truth — in real time.
            </p>
          </div>

          <div className="relative animate-on-scroll">
            <div className="absolute -inset-8 md:-inset-12 bg-gradient-to-br from-[#f97316]/10 via-[#8b5cf6]/5 to-transparent rounded-[2rem] blur-3xl"></div>
            <div className="relative glass-strong rounded-3xl soft-shadow-lg border border-[#e7e7e7]/60 overflow-hidden">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-[#e7e7e7]/60 bg-white/50">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
                </div>
                <div className="ml-3 flex items-center gap-1.5 text-[10px] text-[#737373] font-mono truncate">
                  <Lock className="w-3 h-3" />
                  <span className="hidden sm:inline">panelforge.studio / chronicles-of-aria / vol-3 / ch-14</span>
                </div>
                <div className="ml-auto flex items-center gap-2.5 text-[10px] text-[#737373]">
                  <div className="flex -space-x-1.5">
                    <div className="w-5 h-5 rounded-full bg-[#f97316] border-2 border-white flex items-center justify-center text-[8px] font-bold text-white">M</div>
                    <div className="w-5 h-5 rounded-full bg-[#8b5cf6] border-2 border-white flex items-center justify-center text-[8px] font-bold text-white">A</div>
                    <div className="w-5 h-5 rounded-full bg-[#171717] border-2 border-white flex items-center justify-center text-[8px] font-bold text-white">J</div>
                  </div>
                  <span className="hidden sm:inline">+2 viewing</span>
                </div>
              </div>
              {/* Tab bar */}
              <div className="flex items-center px-5 pt-3 border-b border-[#e7e7e7]/40 bg-white/30 overflow-x-auto">
                {['Pipeline', 'Script', 'Bible', 'Event Log', 'References'].map((tab, i) => (
                  <button key={tab} className={`px-3 py-2 text-xs whitespace-nowrap ${i === 0 ? 'font-medium text-[#171717] border-b-2 border-[#f97316] -mb-px' : 'text-[#737373] hover:text-[#171717]'}`}>{tab}</button>
                ))}
                <div className="ml-auto flex items-center gap-2 pb-1.5">
                  <div className="px-2.5 py-1 rounded-full bg-[#fff7ed] text-[#f97316] text-[10px] font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] pulse-dot"></span> Live
                  </div>
                </div>
              </div>
              {/* Kanban board */}
              <div className="p-3 md:p-4 grid grid-cols-2 md:grid-cols-4 gap-2.5 bg-[#faf8f5]/30">
                {[
                  { title: 'Scripting', count: '3', color: 'text-[#404040]', cards: [
                    { name: 'Scene 04', sub: '"The Choice"', extra: null },
                    { name: 'Scene 05', sub: '"Departure"', extra: null },
                    { name: 'Scene 06', sub: '"The Fire"', extra: 'draft' },
                  ]},
                  { title: 'Inking', count: '5', color: 'text-[#f97316]', cards: [
                    { name: 'Page 14.3', sub: '3 panels · 2 of 3 done', extra: 'progress', flag: null },
                    { name: 'Page 14.4', sub: '4 panels', extra: null },
                    { name: 'Page 14.5', sub: '5 panels', extra: null },
                  ]},
                  { title: 'Review', count: '2', color: 'text-[#404040]', cards: [
                    { name: 'Page 14.1', sub: 'awaiting Jiro', extra: 'ai-flag' },
                    { name: 'Page 14.2', sub: 'final pass', extra: null },
                  ]},
                  { title: 'Done', count: '24', color: 'text-green-700', cards: [
                    { name: 'Page 13.8', sub: null, extra: 'approved' },
                    { name: 'Page 13.7', sub: null, extra: 'approved' },
                    { name: 'Page 13.6', sub: null, extra: 'approved' },
                  ]},
                ].map(col => (
                  <div key={col.title} className="bg-white/85 rounded-xl p-3 border border-[#e7e7e7]/50">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className={`text-[10px] font-bold ${col.color} uppercase tracking-[0.15em]`}>{col.title}</div>
                      <div className={`text-[10px] ${col.color} font-mono font-bold`}>{col.count}</div>
                    </div>
                    <div className="space-y-2">
                      {col.cards.map(card => (
                        <div key={card.name} className={`rounded-lg p-2.5 border ${card.extra === 'approved' ? 'bg-[#f4f0e8]/50 border-[#e7e7e7]/60' : col.title === 'Inking' && card.name === 'Page 14.3' ? 'bg-[#fff7ed]/60 border-[#f97316]/40' : 'bg-[#faf8f5] border-[#e7e7e7]/60'}`}>
                          <div className="flex items-center justify-between">
                            <div className={`text-[11px] font-semibold ${card.extra === 'approved' ? 'text-[#404040]' : 'text-[#171717]'}`}>{card.name}</div>
                            {col.title === 'Inking' && card.name === 'Page 14.3' && <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#f97316] text-white font-bold tracking-wider">WIP</span>}
                          </div>
                          {card.sub && <div className="text-[9px] text-[#737373] mt-0.5 italic">{card.sub}</div>}
                          {card.extra === 'progress' && <div className="mt-2 h-1 rounded-full bg-white overflow-hidden"><div className="h-full w-2/3 tangerine-gradient rounded-full"></div></div>}
                          {card.extra === 'ai-flag' && <div className="mt-2 flex items-center gap-1.5"><div className="w-4 h-4 rounded-full bg-[#f5f3ff] text-[#8b5cf6] text-[7px] font-bold flex items-center justify-center">✦</div><span className="text-[9px] text-[#8b5cf6] font-semibold">1 continuity flag</span></div>}
                          {card.extra === 'approved' && <div className="text-[9px] text-green-700 mt-0.5 flex items-center gap-1"><Check className="w-2.5 h-2.5" /> Approved</div>}
                          {card.extra === 'draft' && <div className="text-[9px] text-[#737373] mt-1">draft</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Floating AI card */}
            <div className="hidden md:block absolute -top-7 -right-4 lg:-right-10 w-72 glass rounded-2xl shadow-xl border border-[#e7e7e7] p-4 float-anim-slow">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded ai-gradient flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8b5cf6]">Continuity Check</span>
                <span className="ml-auto text-[9px] text-[#737373] font-mono">3s ago</span>
              </div>
              <div className="text-xs text-[#404040] leading-relaxed">
                Scene 04 panel 2 has a <span className="font-semibold text-[#171717]">lighting inconsistency</span> vs. neighboring pages.
              </div>
              <div className="mt-3 pt-3 border-t border-[#e7e7e7]/60 flex items-center gap-2 text-[10px]">
                <span className="text-[#737373] font-mono">p.13.5, p.13.6</span>
                <span className="ml-auto text-[#8b5cf6] font-semibold">View fix →</span>
              </div>
            </div>
            {/* Floating stats card */}
            <div className="hidden md:block absolute -bottom-7 -left-4 lg:-left-10 w-60 bg-white rounded-2xl soft-shadow-lg border border-[#e7e7e7] p-4 float-anim">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] uppercase tracking-[0.15em] text-[#737373] font-semibold">This week</div>
                <div className="text-[9px] text-[#737373] font-mono">CH-14</div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex items-baseline justify-between">
                    <div className="font-serif text-2xl font-medium text-[#171717]">142</div>
                    <div className="text-[10px] text-green-600 font-semibold font-mono">+18%</div>
                  </div>
                  <div className="text-[10px] text-[#737373] mt-0.5">Panels shipped</div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between">
                    <div className="font-serif text-2xl font-medium text-[#171717]">3.2<span className="text-sm text-[#737373]">d</span></div>
                    <div className="text-[10px] text-green-600 font-semibold font-mono">-22%</div>
                  </div>
                  <div className="text-[10px] text-[#737373] mt-0.5">Avg page turnaround</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== SOCIAL PROOF ===== */}
      <div id="block-social" className="py-24 md:py-32 paper-gradient relative">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 mb-20">
            {[
              { num: '10M+', label: 'Panels managed' },
              { num: '500+', label: 'Studios onboarded' },
              { num: '42%', label: 'Faster turnaround' },
              { num: '99.9%', label: 'Uptime SLA' },
            ].map((stat, i) => (
              <div key={stat.label} className={`animate-on-scroll ${i > 0 ? `delay-${i}00` : ''} text-center md:text-left`}>
                <div className="font-serif text-5xl md:text-6xl font-medium text-[#171717] leading-none">{stat.num.replace(/[+%]/, '')}<span className="text-[#f97316]">{stat.num.match(/[+%]/)?.[0]}</span></div>
                <div className="mt-3 text-xs text-[#737373] uppercase tracking-[0.18em] font-semibold">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 mb-12 animate-on-scroll">
            <div className="flex-1 h-px bg-[#e7e7e7]"></div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#737373] font-semibold text-center">Trusted by studios shipping the next generation of manga</div>
            <div className="flex-1 h-px bg-[#e7e7e7]"></div>
          </div>

          <div className="animate-on-scroll">
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 md:gap-x-14">
              <div className="font-serif text-2xl font-bold text-[#737373] hover:text-[#171717] transition cursor-default">KUMA<span className="text-[#f97316]">.</span>STUDIO</div>
              <div className="font-mono text-sm font-bold text-[#737373] hover:text-[#171717] transition cursor-default tracking-widest">AKIRA_LABS</div>
              <div className="font-serif text-2xl font-medium italic text-[#737373] hover:text-[#171717] transition cursor-default">Neo Ink<span className="text-[#f97316]">.</span></div>
              <div className="font-sans text-xl font-extrabold text-[#737373] hover:text-[#171717] transition cursor-default tracking-tight">MANGARIUM</div>
              <div className="font-serif text-2xl font-semibold text-[#737373] hover:text-[#171717] transition cursor-default">Panel One<span className="text-[#f97316]">.</span></div>
              <div className="font-mono text-sm font-medium text-[#737373] hover:text-[#171717] transition cursor-default flex items-center gap-1.5"><span className="text-[#f97316]">◇</span> INKHAUS</div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== CTA ===== */}
      <div id="block-cta" className="py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-[#faf8f5] to-white"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-[#f97316]/8 blur-3xl"></div>
        <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <div className="animate-on-scroll">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#f97316] uppercase tracking-[0.2em] mb-6">
              <span className="w-8 h-px bg-[#f97316]"></span>
              Start in minutes
              <span className="w-8 h-px bg-[#f97316]"></span>
            </div>
            <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl font-medium leading-[1.02] tracking-tight">
              Ready to architect<br />your <em className="font-normal text-[#737373]">studio</em>?
            </h2>
            <p className="mt-7 text-lg text-[#737373] max-w-xl mx-auto leading-relaxed">
              Bring your team, your series bible, and your pipeline. PanelForge turns months of scattered work into a verifiable record of every panel you ship.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => onEnterDemo('producer')}
                className="group inline-flex items-center gap-2 px-7 py-4 rounded-full tangerine-gradient text-white font-semibold text-base tangerine-shadow-lg hover:shadow-[0_18px_50px_rgba(249,115,22,0.45)] transition-all hover:-translate-y-0.5 cursor-pointer"
              >
                Onboard Your Studio
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={() => onEnterDemo('producer')}
                className="inline-flex items-center gap-2 px-7 py-4 rounded-full bg-white border border-[#e7e7e7] text-[#171717] font-medium text-base hover:border-[#404040]/30 transition soft-shadow cursor-pointer"
              >
                Talk to a specialist
              </button>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#737373]">
              <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#f97316]" /> 14-day studio trial</div>
              <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#f97316]" /> No credit card required</div>
              <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#f97316]" /> Free data migration</div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== FOOTER ===== */}
      <footer className="bg-[#171717] text-white relative">
        <div className="absolute inset-0 dot-bg opacity-[0.05]"></div>
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-20">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mb-16">
            <div className="col-span-2">
              <a href="#" className="inline-flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg tangerine-gradient flex items-center justify-center soft-shadow">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>
                  </svg>
                </div>
                <span className="font-serif text-2xl font-bold">PanelForge</span>
              </a>
              <p className="mt-5 text-sm text-white/60 max-w-xs leading-relaxed">
                The data layer for manga production. From first script to final approval — structured, verifiable, AI-grounded.
              </p>
              <div className="mt-6 flex items-center gap-2 text-[10px] text-white/40 font-mono uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] pulse-dot"></span> All systems normal
              </div>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Workflow', 'Series Bible', 'Integrations', 'Changelog'] },
              { title: 'Studio', links: ['Customers', 'Pricing', 'Onboarding', 'Migration', 'Status'] },
              { title: 'Resources', links: ['Docs', 'API Reference', 'Guides', 'Blog', 'Community'] },
              { title: 'Company', links: ['About', 'Careers', 'Press kit', 'Contact', 'Security'] },
            ].map(col => (
              <div key={col.title}>
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/40 font-semibold mb-4">{col.title}</div>
                <ul className="space-y-2.5 text-sm text-white/70">
                  {col.links.map(link => (
                    <li key={link}><a href="#" className="hover:text-[#f97316] transition">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-xs text-white/40 flex items-center gap-3 flex-wrap justify-center">
              <span>© 2026 PanelForge Labs.</span>
              <span className="hidden md:inline">·</span>
              <span>Crafted with ✦ by the Studio.</span>
            </div>
            <div className="flex items-center gap-1">
              {[Twitter, Github, Linkedin, Rss].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-full hover:bg-white/5 transition flex items-center justify-center text-white/40 hover:text-[#f97316]">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ===== FLOATING ROLE WIDGET ===== */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="glass rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#e7e7e7]/80 p-1.5 flex items-center gap-1">
          <div className="hidden sm:flex items-center gap-1.5 pl-2 pr-1.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] pulse-dot"></span>
            <span className="text-[10px] font-semibold text-[#404040] uppercase tracking-[0.15em]">Preview</span>
          </div>
          <div className="hidden sm:block w-px h-5 bg-[#e7e7e7] mx-0.5"></div>
          {[
            { label: 'Producer', Icon: Briefcase, role: 'producer' },
            { label: 'Writer', Icon: PenLine, role: 'writer' },
            { label: 'Artist', Icon: Layers, role: 'artist' },
            { label: 'Reviewer', Icon: CheckCheck, role: 'editor' },
          ].map(({ label, Icon, role }) => (
            <div key={role} className="relative group">
              <button
                onClick={() => onEnterDemo(role)}
                className="w-9 h-9 rounded-full transition flex items-center justify-center text-[#404040] hover:text-[#f97316] hover:bg-[#fff7ed] cursor-pointer"
                aria-label={`Preview as ${label}`}
              >
                <Icon className="w-4 h-4" />
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#171717] text-white text-[10px] rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {label}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#171717]"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
