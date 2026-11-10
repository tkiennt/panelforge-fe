import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookMarked,
  BookOpen,
  Briefcase,
  Search,
  RefreshCw,
  Send,
  Sparkles,
  Layers,
  CheckCircle2,
  Clock,
  ExternalLink,
  Bot,
  X,
  Loader2,
} from 'lucide-react';
import {
  publisherService,
  PublisherSeriesDto,
  PublisherWorkspaceDto,
} from '@/services/publisher.service';
import { chapterService, ChapterDto } from '@/services/chapter.service';
import {
  aiAgentsService,
  AiSuggestionDto,
  SeriesMetadataSuggestion,
} from '@/services/aiAgents.service';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';

interface PublisherSeriesViewProps {
  onShowToast?: (title: string, desc: string) => void;
}

export const PublisherSeriesView: React.FC<PublisherSeriesViewProps> = ({ onShowToast }) => {
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState<PublisherWorkspaceDto[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [seriesList, setSeriesList] = useState<PublisherSeriesDto[]>([]);
  const [loading, setLoading] = useState(true);

  // AI Copilot Modal State
  const [copilotSeries, setCopilotSeries] = useState<PublisherSeriesDto | null>(null);
  const [seriesChapters, setSeriesChapters] = useState<ChapterDto[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [copilotInstruction, setCopilotInstruction] = useState<string>('');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotResult, setCopilotResult] = useState<AiSuggestionDto | null>(null);

  // Load Workspaces for filter dropdown
  useEffect(() => {
    publisherService
      .getWorkspaces()
      .then((data) => setWorkspaces(data || []))
      .catch((err) => console.warn('Không thể tải danh sách Studio:', err));
  }, []);

  // Fetch Series
  const fetchSeries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await publisherService.getSeries({
        workspaceId: selectedWorkspaceId || undefined,
        search: searchQuery || undefined,
      });
      setSeriesList(data || []);
    } catch (err: any) {
      onShowToast?.('Không thể tải danh sách bộ truyện', err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  }, [selectedWorkspaceId, searchQuery, onShowToast]);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  // When opening copilot modal, fetch chapters of that series
  const openCopilotModal = async (s: PublisherSeriesDto) => {
    setCopilotSeries(s);
    setCopilotInstruction('');
    setCopilotResult(null);
    setSelectedChapterId('');
    try {
      const res = await chapterService.getChaptersBySeries(s.id, 1, 50);
      const chaps = res.items || [];
      setSeriesChapters(chaps);
      if (chaps.length > 0) {
        setSelectedChapterId(chaps[0].id);
      }
    } catch (err) {
      console.warn('Không thể tải danh sách chương của bộ truyện:', err);
    }
  };

  const handleRunCopilot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotSeries) return;
    if (!selectedChapterId) {
      onShowToast?.('Lỗi', 'Bộ truyện cần có ít nhất một chương để AI phân tích.');
      return;
    }
    setCopilotLoading(true);
    setCopilotResult(null);
    try {
      const res = await aiAgentsService.runPublisherMetadata(copilotSeries.id, {
        chapterId: selectedChapterId,
        instruction: copilotInstruction || undefined,
      });
      setCopilotResult(res);
      onShowToast?.('AI Publisher Copilot', 'Đã phân tích xong và đưa ra đề xuất xuất bản.');
    } catch (err: any) {
      onShowToast?.('Lỗi AI Copilot', err.message || 'Không thể tạo gợi ý metadata.');
    } finally {
      setCopilotLoading(false);
    }
  };

  return (
    <div className='min-h-full bg-[#F3F0E9] p-6 space-y-6'>
      {/* Header Banner */}
      <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div className='flex items-center gap-3.5'>
          <div className='w-12 h-12 rounded-2xl bg-[#FFF2E6] border border-[#FDBA74] text-[#C2410C] flex items-center justify-center shadow-xs'>
            <BookMarked className='w-6 h-6' />
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-xl font-serif font-bold text-[#1C1917]'>
                Quản Lý Bộ Truyện // Series Bible &amp; AI Copilot
              </h1>
              <span className='px-2 py-0.5 rounded bg-[#FFF2E6] text-[#C2410C] border border-[#FDBA74] text-xs font-mono font-bold'>
                METADATA &amp; WORLDBUILDING
              </span>
            </div>
            <p className='text-xs text-[#57534E] mt-1'>
              Tra cứu thiết lập nhân vật, bối cảnh (Series Bible) và sử dụng AI Publisher Copilot để tự động đề xuất logline, tóm tắt và thẻ phân loại phát hành.
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2.5 flex-wrap'>
          <button
            type='button'
            onClick={fetchSeries}
            disabled={loading}
            className='px-3 py-1.5 bg-[#FCFBF8] border border-[#D8D2C5] hover:bg-[#F3F0E9] text-xs font-semibold text-[#57534E] hover:text-[#1C1917] rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
          <button
            type='button'
            onClick={() => navigate('/publisher/desk')}
            className='px-3.5 py-1.5 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-soft-sm active:scale-95'
          >
            <Send className='w-3.5 h-3.5' />
            <span>Cổng Duyệt Xuất Bản</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3'>
        <div className='flex flex-wrap items-center gap-3 flex-1'>
          {/* Studio Filter */}
          <div className='flex items-center gap-1.5'>
            <Briefcase className='w-4 h-4 text-[#C2410C] shrink-0' />
            <select
              value={selectedWorkspaceId}
              onChange={(e) => setSelectedWorkspaceId(e.target.value)}
              className='text-xs font-medium bg-[#F8F6F0] border border-[#D8D2C5] rounded-xl px-3 py-2 text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 cursor-pointer min-w-[180px]'
            >
              <option value=''>Tất cả Studio</option>
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name} ({ws.seriesCount} bộ truyện)
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className='relative flex-1 min-w-[200px]'>
            <Search className='w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2' />
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Tìm kiếm bộ truyện hoặc studio...'
              className='w-full text-xs bg-[#F8F6F0] border border-[#D8D2C5] rounded-xl pl-9 pr-3 py-2 text-[#1C1917] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#F97316]/30'
            />
          </div>

          {(selectedWorkspaceId || searchQuery) && (
            <button
              type='button'
              onClick={() => {
                setSelectedWorkspaceId('');
                setSearchQuery('');
              }}
              className='px-2.5 py-1.5 rounded-xl border border-stone-300 hover:bg-stone-200 text-xs font-semibold text-stone-600 flex items-center gap-1 transition-colors cursor-pointer'
            >
              <X className='w-3.5 h-3.5' />
              <span>Xóa lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* Series Cards Grid */}
      {seriesList.length === 0 ? (
        <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl p-12 text-center text-[#57534E] space-y-2 shadow-2xs'>
          <BookOpen className='w-8 h-8 text-[#D8D2C5] mx-auto' />
          <div className='font-serif font-bold text-sm text-[#1C1917]'>
            Không tìm thấy bộ truyện nào
          </div>
          <p className='text-xs text-[#57534E] max-w-sm mx-auto'>
            Chưa có bộ truyện nào phù hợp với điều kiện tìm kiếm. Hãy thử xóa bộ lọc để xem toàn bộ danh sách.
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
          {seriesList.map((s) => (
            <div
              key={s.id}
              className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl p-5 shadow-2xs hover:shadow-soft-sm hover:border-[#F97316]/40 transition-all flex flex-col justify-between space-y-4'
            >
              <div className='space-y-3'>
                {/* Header: Studio + Badges */}
                <div className='flex items-center justify-between gap-2 flex-wrap'>
                  <span className='px-2 py-0.5 rounded bg-stone-200 text-stone-800 font-sans font-semibold text-[11px] flex items-center gap-1 border border-stone-300'>
                    <Briefcase className='w-3 h-3 text-[#C2410C]' />
                    <span>{s.workspaceName}</span>
                  </span>

                  <div className='flex items-center gap-1.5'>
                    <span className='px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-mono font-bold border border-amber-200'>
                      {s.genre}
                    </span>
                    <span className='px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[10px] font-mono font-bold border border-stone-200'>
                      {s.format}
                    </span>
                  </div>
                </div>

                {/* Series Title & Synopsis */}
                <div className='flex items-start gap-3.5'>
                  {s.coverUrl ? (
                    <AuthenticatedImage
                      src={s.coverUrl}
                      alt={s.title}
                      className='w-16 h-22 object-cover rounded-xl border border-[#D8D2C5] shadow-2xs shrink-0 bg-stone-100'
                      fallback={
                        <div className='w-16 h-22 rounded-xl bg-[#FAF8F5] border border-[#D8D2C5] flex flex-col items-center justify-center text-center shrink-0 shadow-2xs p-1'>
                          <BookOpen className='w-5 h-5 text-stone-400' />
                          <span className='text-[9px] text-stone-500 font-bold mt-1 line-clamp-1'>
                            {s.title}
                          </span>
                        </div>
                      }
                    />
                  ) : (
                    <div className='w-16 h-22 rounded-xl bg-[#FAF8F5] border border-[#D8D2C5] flex flex-col items-center justify-center text-center shrink-0 shadow-2xs p-1'>
                      <BookOpen className='w-5 h-5 text-[#F97316]' />
                      <span className='text-[9px] text-stone-500 font-bold mt-1 line-clamp-1'>
                        {s.title}
                      </span>
                    </div>
                  )}

                  <div className='space-y-1.5 min-w-0'>
                    <h3 className='font-serif font-bold text-base text-[#1C1917] leading-tight'>
                      {s.title}
                    </h3>
                    <p className='text-xs text-[#57534E] line-clamp-3 leading-relaxed'>
                      {s.synopsis || 'Chưa có thông tin tóm tắt cốt truyện.'}
                    </p>
                  </div>
                </div>

                {/* Chapters Stats */}
                <div className='grid grid-cols-3 gap-2 bg-[#F8F6F0] p-2.5 rounded-xl border border-[#D8D2C5]/70 text-center'>
                  <div>
                    <span className='block text-[10px] text-stone-500 font-medium'>Chờ duyệt</span>
                    <span className='font-mono font-bold text-xs text-[#C2410C]'>
                      {s.approvedChaptersCount}
                    </span>
                  </div>
                  <div className='border-x border-[#D8D2C5]'>
                    <span className='block text-[10px] text-stone-500 font-medium'>Đã phát hành</span>
                    <span className='font-mono font-bold text-xs text-emerald-700'>
                      {s.publishedChaptersCount}
                    </span>
                  </div>
                  <div>
                    <span className='block text-[10px] text-stone-500 font-medium'>Tổng số tập</span>
                    <span className='font-mono font-bold text-xs text-stone-700'>
                      {s.totalChaptersCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className='pt-2 border-t border-[#D8D2C5] flex items-center justify-between gap-2 flex-wrap'>
                <button
                  type='button'
                  onClick={() =>
                    navigate(`/workspaces/${s.workspaceId}/series/${s.id}/bible`)
                  }
                  className='px-3 py-1.5 rounded-xl border border-[#D8D2C5] bg-[#FAF8F5] hover:bg-[#F3F0E9] text-xs font-semibold text-[#1C1917] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
                  title='Xem Series Bible chi tiết'
                >
                  <BookMarked className='w-3.5 h-3.5 text-[#C2410C]' />
                  <span>Xem Bible</span>
                </button>

                <button
                  type='button'
                  onClick={() => openCopilotModal(s)}
                  className='px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-xs font-semibold text-purple-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
                  title='Mở AI Publisher Copilot để gợi ý Logline / Synopsis'
                >
                  <Bot className='w-3.5 h-3.5 text-purple-600' />
                  <span>AI Copilot</span>
                </button>

                <button
                  type='button'
                  onClick={() =>
                    navigate(`/publisher/desk?workspaceId=${s.workspaceId}&seriesId=${s.id}`)
                  }
                  className='px-3.5 py-1.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-soft-sm'
                  title='Xem các chương chờ duyệt của bộ truyện'
                >
                  <Send className='w-3.5 h-3.5' />
                  <span>Duyệt Tập</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Publisher Copilot Modal */}
      {copilotSeries && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200'>
          <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5'>
            <div className='flex items-center justify-between border-b border-[#D8D2C5] pb-4'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center border border-purple-200'>
                  <Bot className='w-5 h-5' />
                </div>
                <div>
                  <h2 className='text-base font-serif font-bold text-[#1C1917]'>
                    AI Publisher Copilot
                  </h2>
                  <p className='text-xs text-stone-500'>
                    Bộ truyện: <strong>{copilotSeries.title}</strong> ({copilotSeries.workspaceName})
                  </p>
                </div>
              </div>
              <button
                type='button'
                onClick={() => setCopilotSeries(null)}
                className='w-8 h-8 rounded-full hover:bg-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-800 transition-colors cursor-pointer'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            <form onSubmit={handleRunCopilot} className='space-y-4'>
              <div>
                <label className='block text-xs font-bold text-stone-700 mb-1'>
                  Chọn tập/chương làm nguồn phân tích
                </label>
                {seriesChapters.length === 0 ? (
                  <p className='text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200'>
                    Bộ truyện này chưa có chương nào được tạo. AI Copilot cần ít nhất 1 chương để phân tích.
                  </p>
                ) : (
                  <select
                    value={selectedChapterId}
                    onChange={(e) => setSelectedChapterId(e.target.value)}
                    className='w-full text-xs font-medium bg-[#F8F6F0] border border-[#D8D2C5] rounded-xl px-3 py-2 text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-purple-400/40 cursor-pointer'
                  >
                    {seriesChapters.map((c) => (
                      <option key={c.id} value={c.id}>
                        Chương #{c.chapterNumber}: {c.title || 'Chưa đặt tiêu đề'} ({c.status})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className='block text-xs font-bold text-stone-700 mb-1'>
                  Chỉ dẫn tùy chọn cho AI (tối đa 500 ký tự)
                </label>
                <textarea
                  value={copilotInstruction}
                  onChange={(e) => setCopilotInstruction(e.target.value.slice(0, 500))}
                  placeholder='Ví dụ: Tạo logline giật gân thu hút độc giả Shonen, nhấn mạnh vào yếu tố tu tiên và kiếm hiệp...'
                  className='w-full text-xs bg-[#F8F6F0] border border-[#D8D2C5] rounded-xl p-3 text-[#1C1917] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-purple-400/40 min-h-[80px]'
                />
                <span className='block text-[10px] text-stone-400 text-right mt-0.5'>
                  {copilotInstruction.length}/500
                </span>
              </div>

              <div className='flex items-center justify-end gap-2'>
                <button
                  type='button'
                  onClick={() => setCopilotSeries(null)}
                  className='px-3.5 py-1.5 rounded-xl border border-stone-300 text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer'
                >
                  Đóng
                </button>
                <button
                  type='submit'
                  disabled={copilotLoading || !selectedChapterId}
                  className='px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-soft-sm'
                >
                  {copilotLoading ? (
                    <>
                      <Loader2 className='w-4 h-4 animate-spin' />
                      <span>Đang phân tích cốt truyện...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className='w-4 h-4' />
                      <span>Sinh Gợi Ý Xuất Bản</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Result Area */}
            {copilotResult && (
              <div className='mt-4 p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3 animate-in fade-in duration-150'>
                <div className='flex items-center gap-2 text-xs font-bold text-purple-900'>
                  <Sparkles className='w-4 h-4 text-purple-600' />
                  <span>Đề Xuất Metadata Xuất Bản Từ AI:</span>
                </div>
                <div className='text-xs text-stone-800 space-y-2 whitespace-pre-wrap font-sans leading-relaxed bg-white/80 p-3 rounded-xl border border-purple-100'>
                  {(() => {
                    const payload = copilotResult.payload as SeriesMetadataSuggestion | undefined;
                    if (payload && payload.metadata) {
                      return (
                        <div className='space-y-2'>
                          {payload.metadata.logline && (
                            <div>
                              <span className='font-bold text-purple-800'>Logline: </span>
                              <span>{payload.metadata.logline}</span>
                            </div>
                          )}
                          {payload.metadata.synopsis && (
                            <div>
                              <span className='font-bold text-purple-800'>Tóm tắt đề xuất: </span>
                              <span>{payload.metadata.synopsis}</span>
                            </div>
                          )}
                          {payload.metadata.genre && (
                            <div>
                              <span className='font-bold text-purple-800'>Thể loại đề xuất: </span>
                              <span>{payload.metadata.genre}</span>
                            </div>
                          )}
                          {payload.metadata.teaser && (
                            <div>
                              <span className='font-bold text-purple-800'>Teaser câu khách: </span>
                              <span>{payload.metadata.teaser}</span>
                            </div>
                          )}
                          {payload.metadata.ageRating && (
                            <div>
                              <span className='font-bold text-purple-800'>Độ tuổi khuyến nghị: </span>
                              <span className='font-mono font-bold text-purple-900'>
                                {payload.metadata.ageRating}
                              </span>
                            </div>
                          )}
                          {payload.reason && (
                            <p className='text-[11px] text-stone-500 italic mt-1'>
                              Lý do: {payload.reason}
                            </p>
                          )}
                        </div>
                      );
                    }
                    return <div>{copilotResult.summary || 'Đã phân tích xong.'}</div>;
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
