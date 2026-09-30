import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Activity,
  Users,
  BookOpen,
  Calendar,
  Settings,
  GitPullRequest,
  Clock,
  CheckCircle2,
  Plus,
  ArrowRight,
  MoreVertical,
  BookCopy,
  DownloadCloud,
} from 'lucide-react';
import { seriesService, SeriesDetailDto, SeriesMemberDto } from '../../services/series.service';
import { chapterService, ChapterDto } from '../../services/chapter.service';

export default function SeriesDashboardView() {
  const { workspaceId, seriesId } = useParams<{ workspaceId: string; seriesId: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'overview' | 'crew' | 'pipeline' | 'activity'>(
    'overview',
  );
  const [series, setSeries] = useState<SeriesDetailDto | null>(null);
  const [members, setMembers] = useState<SeriesMemberDto[]>([]);
  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!workspaceId || !seriesId) return;
      setIsLoading(true);
      try {
        const [seriesData, membersData, chaptersData] = await Promise.all([
          seriesService.getSeriesById(seriesId),
          seriesService.getSeriesMembers(workspaceId, seriesId).catch(() => []), // Fallback to empty if api doesn't exist yet
          chapterService
            .getChaptersBySeries(seriesId, 1, 50)
            .then((res) => res.items)
            .catch(() => []),
        ]);
        setSeries(seriesData);
        setMembers(membersData);
        setChapters(chaptersData);
      } catch (err: any) {
        setError(err.message || 'Failed to load series data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [workspaceId, seriesId]);

  if (isLoading) {
    return (
      <div className='p-8 w-full max-w-7xl mx-auto space-y-6 animate-pulse bg-zinc-50 min-h-screen'>
        <div className='h-32 bg-zinc-200 rounded-xl w-full'></div>
        <div className='flex gap-4'>
          <div className='h-10 bg-zinc-200 rounded-lg w-32'></div>
          <div className='h-10 bg-zinc-200 rounded-lg w-32'></div>
        </div>
        <div className='grid grid-cols-4 gap-6'>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className='h-24 bg-zinc-200 rounded-xl'></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className='p-8 w-full max-w-7xl mx-auto text-center bg-zinc-50 min-h-screen'>
        <div className='bg-red-50 text-red-600 p-6 rounded-xl border border-red-200 shadow-sm'>
          {error || 'Series not found'}
        </div>
      </div>
    );
  }

  const totalChapters = chapters.length;
  const completedChapters = chapters.filter(
    (c) => c.status === 'Published' || c.status === 'Approved',
  ).length;
  const progressPct = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

  return (
    <div className='w-full max-w-7xl mx-auto p-6 md:p-8 space-y-8 bg-zinc-50 min-h-screen'>
      {/* Zone 1: High-Level Overview Header */}
      <div className='bg-white border border-zinc-200 rounded-xl p-6 relative overflow-hidden shadow-sm'>
        <div className='absolute top-0 right-0 p-8 opacity-[0.03] text-orange-600 pointer-events-none'>
          <BookOpen size={200} />
        </div>
        <div className='flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10'>
          <div className='space-y-4'>
            <div>
              <div className='flex items-center gap-3 mb-2'>
                <span className='px-2.5 py-1 text-xs font-semibold bg-zinc-100 text-zinc-700 rounded-md border border-zinc-200'>
                  {series.format || 'Manga'}
                </span>
                <span className='px-2.5 py-1 text-xs font-semibold bg-orange-50 text-orange-700 rounded-md border border-orange-200'>
                  {series.genre || 'Action'}
                </span>
                <span className='px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200 flex items-center gap-1'>
                  <Activity size={14} /> Active Production
                </span>
              </div>
              <h1 className='text-xl md:text-2xl font-bold text-zinc-900 tracking-tight'>
                {series.title}
              </h1>
              <p className='text-zinc-600 max-w-2xl mt-2 text-sm font-medium leading-relaxed'>
                {series.synopsis || 'No synopsis available for this series.'}
              </p>
            </div>

            {/* Progress Bar */}
            <div className='w-full max-w-md pt-2'>
              <div className='flex justify-between text-xs text-zinc-600 font-medium mb-2'>
                <span>Overall Progress</span>
                <span>
                  {progressPct}% ({completedChapters}/{totalChapters} Chapters)
                </span>
              </div>
              <div className='h-2 w-full bg-zinc-200 rounded-full overflow-hidden'>
                <div
                  className='h-full bg-orange-500 rounded-full transition-all duration-1000'
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Zone 5: Quick Actions Bar (Integrated in Header for prominence) */}
          <div className='flex flex-col gap-3 min-w-[200px]'>
            <button className='flex items-center justify-center gap-2 w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm'>
              <Plus size={18} />
              New Chapter
            </button>
            <button className='flex items-center justify-center gap-2 w-full bg-white hover:bg-zinc-50 text-zinc-700 px-4 py-2.5 rounded-xl font-medium transition-colors border border-zinc-200 shadow-sm'>
              <BookCopy size={18} />
              Series Bible
            </button>
            <button className='flex items-center justify-center gap-2 w-full bg-white hover:bg-zinc-50 text-zinc-700 px-4 py-2.5 rounded-xl font-medium transition-colors border border-zinc-200 shadow-sm'>
              <DownloadCloud size={18} />
              Export / Publish
            </button>
          </div>
        </div>
      </div>

      {/* Zone 2: Key Metrics Widget Row */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <div className='bg-white border border-zinc-200 rounded-xl p-5 flex items-center justify-between shadow-sm'>
          <div>
            <p className='text-sm text-zinc-600 font-medium'>Total Chapters</p>
            <p className='text-2xl font-bold text-zinc-900 mt-1'>{totalChapters}</p>
          </div>
          <div className='w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600'>
            <BookOpen size={24} />
          </div>
        </div>
        <div className='bg-white border border-zinc-200 rounded-xl p-5 flex items-center justify-between shadow-sm'>
          <div>
            <p className='text-sm text-zinc-600 font-medium'>Active Crew</p>
            <p className='text-2xl font-bold text-zinc-900 mt-1'>{members.length || 0}</p>
          </div>
          <div className='w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600'>
            <Users size={24} />
          </div>
        </div>
        <div className='bg-white border border-zinc-200 rounded-xl p-5 flex items-center justify-between shadow-sm'>
          <div>
            <p className='text-sm text-zinc-600 font-medium'>In Review</p>
            <p className='text-2xl font-bold text-orange-600 mt-1'>
              {chapters.filter((c) => c.status === 'InProduction').length}
            </p>
          </div>
          <div className='w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600'>
            <Clock size={24} />
          </div>
        </div>
        <div className='bg-white border border-zinc-200 rounded-xl p-5 flex items-center justify-between shadow-sm'>
          <div>
            <p className='text-sm text-zinc-600 font-medium'>Approved</p>
            <p className='text-2xl font-bold text-emerald-600 mt-1'>{completedChapters}</p>
          </div>
          <div className='w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600'>
            <CheckCircle2 size={24} />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className='border-b border-zinc-200'>
        <nav className='flex gap-6'>
          {(['overview', 'pipeline', 'crew', 'activity'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-sm font-medium capitalize transition-colors relative ${
                activeTab === tab ? 'text-orange-600' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {tab === 'overview' && 'Dashboard Overview'}
              {tab === 'pipeline' && 'Production Pipeline'}
              {tab === 'crew' && 'Crew & Workload'}
              {tab === 'activity' && 'Activity Stream'}
              {activeTab === tab && (
                <span className='absolute bottom-0 left-0 w-full h-0.5 bg-orange-600 rounded-t-full'></span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Contents */}
      <div className='min-h-[400px]'>
        {activeTab === 'overview' && (
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
            {/* Zone 3: Active Production Pipeline Snapshot */}
            <div className='lg:col-span-2 space-y-6'>
              <div className='flex items-center justify-between'>
                <h2 className='text-base font-semibold text-zinc-800 flex items-center gap-2'>
                  <GitPullRequest size={20} className='text-zinc-500' />
                  Pipeline Snapshot
                </h2>
                <button className='text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1'>
                  View Full Board <ArrowRight size={16} />
                </button>
              </div>
              <div className='bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm'>
                {/* Mocked mini-kanban summary */}
                <div className='grid grid-cols-4 divide-x divide-zinc-200 border-b border-zinc-200'>
                  {['Scripting', 'Thumbnail', 'Inking', 'Coloring'].map((stage) => (
                    <div key={stage} className='p-4 text-center'>
                      <div className='text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2'>
                        {stage}
                      </div>
                      <div className='text-3xl font-light text-zinc-900'>0</div>
                    </div>
                  ))}
                </div>
                <div className='p-4 bg-zinc-50 text-center'>
                  <p className='text-sm text-zinc-500 font-medium'>
                    Pipeline stages will dynamically populate based on Series Pipeline
                    Configuration.
                  </p>
                </div>
              </div>
            </div>

            {/* Zone 4: Team Activity Snapshot */}
            <div className='space-y-6'>
              <div className='flex items-center justify-between'>
                <h2 className='text-base font-semibold text-zinc-800 flex items-center gap-2'>
                  <Activity size={20} className='text-zinc-500' />
                  Recent Activity
                </h2>
              </div>
              <div className='bg-white border border-zinc-200 rounded-xl p-5 shadow-sm'>
                <div className='space-y-6'>
                  {/* Mock Activity Stream */}
                  <div className='flex gap-4'>
                    <div className='mt-1 w-2 h-2 rounded-full bg-orange-500 ring-4 ring-orange-500/20 flex-shrink-0'></div>
                    <div>
                      <p className='text-sm text-zinc-700 font-medium'>
                        Series <span className='font-bold text-zinc-900'>{series.title}</span>{' '}
                        initialized.
                      </p>
                      <p className='text-xs text-zinc-500 mt-1'>Just now</p>
                    </div>
                  </div>
                  <div className='flex gap-4'>
                    <div className='mt-1 w-2 h-2 rounded-full bg-zinc-300 flex-shrink-0'></div>
                    <div>
                      <p className='text-sm text-zinc-700 font-medium'>
                        Pipeline template assigned.
                      </p>
                      <p className='text-xs text-zinc-500 mt-1'>2 hours ago</p>
                    </div>
                  </div>
                </div>
                <button className='w-full mt-6 py-2 text-sm text-zinc-600 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 rounded-lg transition-colors font-medium border border-zinc-200'>
                  View All Activity
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'crew' && (
          <div className='space-y-6'>
            <div className='flex items-center justify-between'>
              <h2 className='text-base font-semibold text-zinc-800'>Series Crew</h2>
              <button className='px-4 py-2 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 text-sm font-medium rounded-lg transition-colors shadow-sm'>
                Manage Crew
              </button>
            </div>

            {members.length === 0 ? (
              <div className='text-center py-12 bg-white border border-zinc-200 border-dashed rounded-xl'>
                <Users size={48} className='mx-auto text-zinc-300 mb-4' />
                <h3 className='text-zinc-900 font-semibold'>No Crew Members Found</h3>
                <p className='text-zinc-500 font-medium text-sm mt-1'>
                  This series doesn't have any dedicated crew members yet.
                </p>
              </div>
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {members.map((member) => (
                  <div
                    key={member.id}
                    className='bg-white border border-zinc-200 rounded-xl p-4 flex items-start gap-4 shadow-sm'
                  >
                    <div className='w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold'>
                      {member.fullName.charAt(0)}
                    </div>
                    <div className='flex-1'>
                      <h4 className='text-zinc-900 font-bold text-sm'>{member.fullName}</h4>
                      <div className='flex items-center gap-2 mt-1'>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            member.seriesRole === 'Producer'
                              ? 'bg-orange-50 text-orange-600'
                              : member.seriesRole === 'Writer'
                                ? 'bg-blue-50 text-blue-600'
                                : member.seriesRole === 'Artist'
                                  ? 'bg-purple-50 text-purple-600'
                                  : 'bg-emerald-50 text-emerald-600'
                          }`}
                        >
                          {member.seriesRole}
                        </span>
                      </div>
                    </div>
                    <button className='text-zinc-400 hover:text-zinc-600'>
                      <MoreVertical size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'pipeline' && (
          <div className='text-center py-20 bg-white border border-zinc-200 rounded-xl shadow-sm'>
            <GitPullRequest size={64} className='mx-auto text-zinc-300 mb-6' />
            <h2 className='text-xl font-bold text-zinc-900 mb-2 tracking-tight'>
              Production Pipeline configuration
            </h2>
            <p className='text-zinc-500 max-w-md mx-auto font-medium text-sm'>
              Detailed pipeline tracking and stage configuration will be available here, providing
              real-time visibility into every step of the manga production process.
            </p>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className='text-center py-20 bg-white border border-zinc-200 rounded-xl shadow-sm'>
            <Activity size={64} className='mx-auto text-zinc-300 mb-6' />
            <h2 className='text-xl font-bold text-zinc-900 mb-2 tracking-tight'>
              Full Activity Stream
            </h2>
            <p className='text-zinc-500 max-w-md mx-auto font-medium text-sm'>
              A detailed audit log of all actions, approvals, and comments across the entire series
              will be displayed here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
