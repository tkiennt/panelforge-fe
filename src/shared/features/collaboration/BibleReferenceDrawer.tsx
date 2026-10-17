import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  Lock,
  Layers,
  Sparkles,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Tag,
  Loader2,
  AlertCircle,
  Eye,
  Filter,
} from 'lucide-react';
import { bibleService, BibleEntryDto } from '@/services/bible.service';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';

export interface BibleReferenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  seriesId?: string;
  chapterId?: string;
  chapterNumber?: number;
  panelId?: string | null;
  panelNumber?: number | null;
  availablePanels?: { id: string; panelNumber?: number; readingOrder?: number }[];
  onSelectPanel?: (panelId: string) => void;
}

export const BibleReferenceDrawer: React.FC<BibleReferenceDrawerProps> = ({
  isOpen,
  onClose,
  seriesId,
  chapterId,
  chapterNumber = 1,
  panelId,
  panelNumber,
  availablePanels = [],
  onSelectPanel,
}) => {
  const [activeMode, setActiveMode] = useState<'panel' | 'chapter'>('panel');
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(panelId || null);

  const [panelEntries, setPanelEntries] = useState<BibleEntryDto[]>([]);
  const [chapterEntries, setChapterEntries] = useState<BibleEntryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedImageModal, setSelectedImageModal] = useState<{
    url: string;
    name: string;
  } | null>(null);

  // Sync prop panelId
  useEffect(() => {
    if (panelId) {
      setSelectedPanelId(panelId);
    } else if (availablePanels.length > 0 && !selectedPanelId) {
      setSelectedPanelId(availablePanels[0].id);
    }
  }, [panelId, availablePanels, selectedPanelId]);

  // Load panel bible entries (endpoint 3: GET /api/panels/{panelId}/bible)
  useEffect(() => {
    if (!isOpen || activeMode !== 'panel' || !selectedPanelId) {
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    bibleService
      .getPanelBible(selectedPanelId)
      .then((entries) => {
        if (isMounted) {
          setPanelEntries(entries || []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Không thể tải thiết kế nhân vật trong khung tranh.');
          setPanelEntries([]);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeMode, selectedPanelId]);

  // Load full chapter canon bible entries (endpoint 4: GET /api/series/{seriesId}/bible/at-chapter/{n}?canonOnly=true)
  useEffect(() => {
    if (!isOpen || activeMode !== 'chapter' || !seriesId) {
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    bibleService
      .getBibleEntriesAtChapter(seriesId, chapterNumber, true)
      .then((entries) => {
        if (isMounted) {
          setChapterEntries(entries || []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Không thể tải toàn bộ Bible chương này.');
          setChapterEntries([]);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeMode, seriesId, chapterNumber]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentEntries = activeMode === 'panel' ? panelEntries : chapterEntries;
  const activePanelObj = availablePanels.find((p) => p.id === selectedPanelId);
  const displayPanelNumber = panelNumber ?? activePanelObj?.panelNumber ?? null;

  return (
    <div
      className='fixed inset-0 z-50 overflow-hidden'
      aria-labelledby='bible-reference-drawer-title'
      role='dialog'
      aria-modal='true'
      data-testid='bible-reference-drawer'
    >
      {/* Backdrop with subtle overlay for seamless side-by-side art review */}
      <div
        className='fixed inset-0 bg-black/30 md:bg-black/15 backdrop-blur-[1px] transition-opacity animate-in fade-in duration-200'
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className='fixed inset-y-0 right-0 max-w-full flex pl-6 md:pl-10 pointer-events-none'>
        <div className='w-screen max-w-md md:max-w-lg lg:max-w-xl bg-white border-l border-stone-200 shadow-2xl flex flex-col text-xs text-[#0c0a09] animate-in slide-in-from-right duration-200 pointer-events-auto'>
          {/* Header */}
          <div className='p-4 border-b border-stone-200 bg-[#FAF8F5] flex items-center justify-between'>
            <div className='flex items-center gap-2.5 min-w-0'>
              <div className='w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#F97316] shrink-0 shadow-2xs'>
                <BookOpen className='w-4 h-4' />
              </div>
              <div className='min-w-0'>
                <div className='flex items-center gap-1.5'>
                  <span className='px-2 py-0.5 rounded bg-[#0c0a09] text-white font-mono text-xs font-bold'>
                    BIBLE REFERENCE
                  </span>
                  <span className='text-xs text-stone-500 font-mono'>
                    Chương {chapterNumber}
                    {displayPanelNumber ? ` • Khung #${displayPanelNumber}` : ''}
                  </span>
                </div>
                <h3
                  id='bible-reference-drawer-title'
                  className='text-sm font-bold text-[#0c0a09] truncate font-serif mt-0.5 tracking-tight'
                >
                  Tham Chiếu Thiết Kế &amp; Nhân Vật
                </h3>
              </div>
            </div>

            <button
              type='button'
              onClick={onClose}
              className='w-8 h-8 rounded-lg hover:bg-stone-200/60 border border-transparent hover:border-stone-200 flex items-center justify-center text-stone-400 hover:text-stone-800 transition-colors cursor-pointer'
              data-testid='close-bible-drawer-btn'
              aria-label='Đóng tham chiếu Bible'
            >
              <X className='w-4 h-4' />
            </button>
          </div>

          {/* Mode Switcher & Panel selector */}
          <div className='p-3 bg-white border-b border-stone-200 space-y-2.5'>
            <div className='flex items-center gap-1.5 bg-[#F4F2EB] p-1 rounded-xl'>
              <button
                type='button'
                onClick={() => setActiveMode('panel')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeMode === 'panel'
                    ? 'bg-white text-[#0c0a09] shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                data-testid='tab-panel-bible'
              >
                <Layers className='w-3.5 h-3.5 text-[#F97316]' />
                <span>Theo Khung Tranh ({panelEntries.length})</span>
              </button>
              <button
                type='button'
                onClick={() => setActiveMode('chapter')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeMode === 'chapter'
                    ? 'bg-white text-[#0c0a09] shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                data-testid='tab-chapter-bible'
              >
                <Lock className='w-3.5 h-3.5 text-amber-600' />
                <span>Toàn Bộ Chương (Canon)</span>
              </button>
            </div>

            {/* Panel Selector (only in panel mode when panels exist) */}
            {activeMode === 'panel' && availablePanels.length > 1 && (
              <div className='flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar'>
                <span className='text-xs font-mono text-stone-500 whitespace-nowrap font-medium'>
                  Chọn khung:
                </span>
                {availablePanels.map((p, idx) => {
                  const pNum = p.panelNumber ?? idx + 1;
                  const isSelected = p.id === selectedPanelId;
                  return (
                    <button
                      key={p.id}
                      type='button'
                      onClick={() => {
                        setSelectedPanelId(p.id);
                        onSelectPanel?.(p.id);
                      }}
                      className={`px-2.5 py-1 rounded-lg font-mono text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#0c0a09] text-white shadow-xs ring-2 ring-[#F97316]/30'
                          : 'bg-[#FAF8F5] text-stone-700 hover:bg-[#F0ECE1] border border-stone-200'
                      }`}
                      data-testid={`select-panel-${p.id}`}
                    >
                      Khung #{pNum}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Drawer Body / Cards List */}
          <div className='flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#FAF8F5]'>
            {loading ? (
              <div
                className='py-16 text-center text-stone-500 space-y-2'
                data-testid='bible-drawer-loading'
              >
                <Loader2 className='w-6 h-6 animate-spin text-[#F97316] mx-auto' />
                <p className='text-xs font-medium'>Đang nạp thiết kế tham chiếu nhân vật...</p>
              </div>
            ) : error ? (
              <div className='p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-start gap-2.5'>
                <AlertCircle className='w-4 h-4 text-red-500 shrink-0 mt-0.5' />
                <div>
                  <p className='font-semibold'>Không thể tải Bible Reference</p>
                  <p className='text-xs text-red-700 mt-0.5'>{error}</p>
                </div>
              </div>
            ) : currentEntries.length === 0 ? (
              <div className='p-8 bg-white border border-dashed border-stone-300 rounded-2xl text-center space-y-3 shadow-2xs'>
                <div className='w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mx-auto'>
                  <BookOpen className='w-5 h-5' />
                </div>
                <div>
                  <h4 className='font-bold text-sm text-[#0c0a09]'>
                    {activeMode === 'panel'
                      ? 'Chưa có nhân vật gắn trong khung này'
                      : 'Chưa có nhân vật nào được duyệt khoá'}
                  </h4>
                  <p className='text-xs text-stone-500 mt-1 max-w-xs mx-auto leading-relaxed'>
                    {activeMode === 'panel'
                      ? 'Khung tranh chưa neo dòng thoại của nhân vật có bản character sheet được khoá tham chiếu.'
                      : 'Chưa có mục nhân vật nào được Producer duyệt và khoá tham chiếu ở chương này.'}
                  </p>
                </div>

                {activeMode === 'panel' && (
                  <button
                    type='button'
                    onClick={() => setActiveMode('chapter')}
                    className='px-3.5 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-2xs cursor-pointer'
                    data-testid='btn-view-all-chapter-bible'
                  >
                    <BookOpen className='w-3.5 h-3.5' />
                    <span>Xem toàn bộ Bible chương này (Canon Only)</span>
                  </button>
                )}
              </div>
            ) : (
              <div className='space-y-4'>
                {activeMode === 'panel' && (
                  <div className='flex items-center justify-between text-xs text-stone-500 px-1 font-medium'>
                    <span>
                      Nhân vật có thoại trong khung: <strong>{currentEntries.length}</strong>
                    </span>
                    <button
                      type='button'
                      onClick={() => setActiveMode('chapter')}
                      className='text-[#F97316] hover:underline font-semibold flex items-center gap-1 cursor-pointer'
                      data-testid='switch-to-all-chapter-bible-btn'
                    >
                      <span>Xem toàn bộ ({chapterEntries.length || '...'})</span>
                      <ChevronRight className='w-3.5 h-3.5' />
                    </button>
                  </div>
                )}

                {currentEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className='bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-soft-sm hover:border-stone-400 hover:shadow-md transition-all'
                    data-testid={`bible-reference-card-${entry.id}`}
                  >
                    {/* Visual Reference Image */}
                    <div className='relative w-full h-52 bg-zinc-950 overflow-hidden flex items-center justify-center border-b border-stone-200'>
                      {entry.referenceImageUrl ? (
                        <div
                          className='w-full h-full relative cursor-pointer group'
                          onClick={() =>
                            setSelectedImageModal({
                              url: entry.referenceImageUrl!,
                              name: entry.name,
                            })
                          }
                          title='Bấm để phóng to ảnh tham chiếu'
                        >
                          <AuthenticatedImage
                            src={entry.referenceImageUrl}
                            alt={entry.name}
                            className='w-full h-full object-contain group-hover:scale-102 transition-transform duration-200'
                          />
                          <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-[1px]'>
                            <Eye className='w-4 h-4' />
                            <span>Phóng to Reference Sheet</span>
                          </div>
                        </div>
                      ) : (
                        <div className='w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-stone-500 p-4 text-center'>
                          <BookOpen className='w-8 h-8 mb-1.5 opacity-40' />
                          <span className='text-xs font-mono uppercase tracking-wider text-stone-400'>
                            Chưa có ảnh Reference Sheet
                          </span>
                        </div>
                      )}

                      {/* Canon Locked Badge */}
                      <div className='absolute top-2.5 left-2.5 flex items-center gap-1.5'>
                        <span className='px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1 shadow-xs'>
                          <Lock className='w-3 h-3' />
                          CANON LOCKED
                        </span>
                        {entry.code && (
                          <span className='px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-xs text-white text-xs font-mono'>
                            {entry.code}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content Details */}
                    <div className='p-4 space-y-2.5'>
                      <div>
                        <h4 className='text-base font-bold text-[#0c0a09] font-serif tracking-tight'>
                          {entry.name}
                        </h4>
                        {entry.subtitle && (
                          <p className='text-xs text-[#F97316] font-mono font-semibold'>
                            {entry.subtitle}
                          </p>
                        )}
                      </div>

                      {entry.description && (
                        <p className='text-xs md:text-sm text-stone-600 leading-relaxed line-clamp-3 hover:line-clamp-none transition-all'>
                          {entry.description}
                        </p>
                      )}

                      {entry.effectiveRevision && (
                        <div className='pt-2.5 border-t border-[#F0ECE1] flex items-center justify-between text-xs font-mono text-stone-500'>
                          <span className='font-semibold'>Bản khoá v{entry.effectiveRevision.versionNumber}</span>
                          <span>
                            Hiệu lực từ Chương {entry.effectiveRevision.effectiveFromChapterNumber}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className='p-4 bg-white border-t border-stone-200 flex items-center justify-between'>
            <div className='flex items-center gap-1.5 text-xs text-stone-500 font-medium'>
              <ShieldCheck className='w-4 h-4 text-emerald-600' />
              <span>FR-Artist-04 // Tham chiếu chuẩn Canon</span>
            </div>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 bg-[#0c0a09] hover:bg-stone-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-soft-sm'
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* Zoom Image Overlay Modal */}
      {selectedImageModal && (
        <div
          className='fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150'
          onClick={() => setSelectedImageModal(null)}
          data-testid='bible-image-zoom-overlay'
        >
          <div
            className='relative max-w-4xl max-h-[90vh] flex flex-col items-center'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='w-full flex items-center justify-between pb-2 text-white text-xs font-mono'>
              <span className='font-bold'>{selectedImageModal.name} (Canon Reference Sheet)</span>
              <button
                type='button'
                onClick={() => setSelectedImageModal(null)}
                className='p-1 rounded hover:bg-white/20 text-white'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='max-h-[82vh] overflow-hidden rounded-xl border border-white/20 bg-zinc-950 flex items-center justify-center'>
              <AuthenticatedImage
                src={selectedImageModal.url}
                alt={selectedImageModal.name}
                className='max-h-[80vh] w-auto object-contain'
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
