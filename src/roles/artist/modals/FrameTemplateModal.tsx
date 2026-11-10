import React, { useEffect, useState } from 'react';
import {
  LayoutTemplate,
  X,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { frameTemplateService, FrameTemplateDto } from '@/services/frameTemplate.service';
import { PanelDto } from '@/types/pipeline';

interface FrameTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  pageId: string;
  pageNumber: number;
  hasExistingPanels?: boolean;
  onApplied: (panels: PanelDto[]) => void;
  onShowToast?: (title: string, desc: string) => void;
}

export const FrameTemplateModal: React.FC<FrameTemplateModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  pageId,
  pageNumber,
  hasExistingPanels = false,
  onApplied,
  onShowToast,
}) => {
  const [templates, setTemplates] = useState<FrameTemplateDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'narrative' | 'action' | 'cinematic' | 'webtoon'>('all');

  useEffect(() => {
    if (!isOpen || !workspaceId) return;
    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);
    frameTemplateService
      .getFrameTemplates(workspaceId)
      .then((data) => {
        if (!isMounted) return;
        setTemplates(data);
        if (data.length > 0) {
          setSelectedTemplateId(data[0].id);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setErrorMsg(err.message || 'Không thể tải danh sách mẫu khung tranh.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, workspaceId]);

  if (!isOpen) return null;

  const handleApply = async () => {
    if (!selectedTemplateId) return;
    setApplying(true);
    setErrorMsg(null);
    try {
      const createdPanels = await frameTemplateService.applyFrameTemplate(
        pageId,
        selectedTemplateId,
      );
      if (onShowToast) {
        onShowToast(
          'Đã áp dụng mẫu khung',
          `Áp dụng mẫu khung ${createdPanels.length} ô cho Trang ${pageNumber}.`,
        );
      }
      onApplied(createdPanels);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi áp dụng mẫu khung vào trang.');
    } finally {
      setApplying(false);
    }
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <div className='fixed inset-0 z-50 bg-[#1C1917]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150'>
      <div className='bg-[#FCFBF8] rounded-xl sm:rounded-2xl border border-[#D8D2C5] shadow-2xl max-w-xl sm:max-w-2xl w-full flex flex-col max-h-[85vh] sm:max-h-[560px] overflow-hidden'>
        {/* Header */}
        <div className='px-4 py-3 border-b border-[#D8D2C5] flex items-center justify-between bg-[#F8F6F0]'>
          <div className='flex items-center gap-2.5 min-w-0'>
            <div className='p-1.5 bg-[#FFF2E6] text-[#C2410C] rounded-lg border border-[#FDBA74]/80 shrink-0'>
              <LayoutTemplate className='w-4 h-4' />
            </div>
            <div className='min-w-0'>
              <div className='flex items-center gap-2'>
                <h3 className='text-sm font-semibold text-[#1C1917] truncate'>
                  Áp Dụng Mẫu Khung Tranh (Frame Templates)
                </h3>
                <span className='px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#E7E2D9] text-[#57534E] shrink-0'>
                  Trang {pageNumber}
                </span>
              </div>
              <p className='text-[11px] text-[#78716C] truncate'>
                Chọn mẫu dựng sẵn để tự động sinh ô Panel theo thứ tự đọc
              </p>
            </div>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='p-1.5 text-[#78716C] hover:text-[#1C1917] hover:bg-[#EAE5D9] rounded-lg transition-colors cursor-pointer shrink-0 ml-2'
            aria-label='Đóng'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Warning if page already has panels */}
        {hasExistingPanels && (
          <div className='mx-4 mt-3 px-3 py-2 bg-amber-50/90 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-900'>
            <ShieldAlert className='w-4 h-4 text-amber-600 shrink-0' />
            <div className='flex-1 leading-snug'>
              <span className='font-bold'>Trang đã có khung tranh:</span>{' '}
              <span className='text-amber-800 text-[11px]'>
                Thao tác này sẽ bổ sung các ô mới và có thể thay đổi thứ tự đọc hiện tại.
              </span>
            </div>
          </div>
        )}

        {/* Error notice */}
        {errorMsg && (
          <div className='mx-4 mt-3 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700'>
            <AlertTriangle className='w-4 h-4 text-rose-600 shrink-0' />
            <span className='truncate'>{errorMsg}</span>
          </div>
        )}

        {/* Category Tabs: Mục đích kể chuyện */}
        <div className='px-4 pt-2.5 pb-1 flex items-center gap-1.5 overflow-x-auto custom-scrollbar border-b border-[#E7E2D9] bg-[#FAF8F3]'>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'narrative', label: 'Tự sự (Narrative)' },
            { id: 'action', label: 'Hành động (Action)' },
            { id: 'cinematic', label: 'Đại cảnh (Cinematic)' },
            { id: 'webtoon', label: 'Cuộn dọc (Webtoon)' },
          ].map((cat) => (
            <button
              key={cat.id}
              type='button'
              onClick={() => setCategoryFilter(cat.id as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                categoryFilter === cat.id
                  ? 'bg-[#C2410C] text-white shadow-xs'
                  : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#EAE5D9]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Content body */}
        <div className='p-3 sm:p-4 flex-1 overflow-y-auto custom-scrollbar'>
          {loading ? (
            <div className='py-12 text-center text-xs text-[#57534E]'>
              Đang tải danh sách mẫu khung...
            </div>
          ) : templates.length === 0 ? (
            <div className='py-12 text-center text-xs text-[#57534E] border border-dashed border-[#D8D2C5] rounded-xl'>
              Chưa có mẫu khung nào trong Studio.
            </div>
          ) : (
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3'>
              {templates
                .filter((tpl) => categoryFilter === 'all' || (tpl.category || 'narrative') === categoryFilter)
                .map((tpl) => {
                  const isSelected = tpl.id === selectedTemplateId;
                  const catLabel =
                    tpl.category === 'action'
                      ? 'Hành động'
                      : tpl.category === 'cinematic'
                        ? 'Đại cảnh'
                        : tpl.category === 'webtoon'
                          ? 'Cuộn dọc'
                          : 'Tự sự';
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      onDoubleClick={handleApply}
                      title={tpl.description || tpl.name}
                      className={`group p-2.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#F97316] bg-[#FFF2E6]/60 ring-2 ring-[#F97316]/25 shadow-xs'
                          : 'border-[#D8D2C5] bg-[#FCFBF8] hover:border-stone-400 hover:bg-stone-50/60'
                      }`}
                    >
                      {/* Top badge */}
                      <div className='w-full flex items-center justify-between gap-1 mb-1.5'>
                        {tpl.code ? (
                          <span className='font-mono font-bold text-[9px] px-1.5 py-0.2 rounded bg-stone-200 text-stone-800'>
                            {tpl.code}
                          </span>
                        ) : (
                          <span className='text-[9px] text-[#78716C]'>
                            {tpl.isBuiltIn ? 'Mặc định' : 'Tuỳ chỉnh'}
                          </span>
                        )}
                        <span className='text-[8.5px] font-medium px-1.5 py-0.2 rounded bg-amber-100/80 text-amber-900 border border-amber-200/60'>
                          {catLabel}
                        </span>
                      </div>
                    {/* Miniature Slot Layout Visualization */}
                    <div className='w-full h-28 sm:h-32 bg-[#F5F2EB] rounded-lg border border-[#E7E2D9] flex items-center justify-center p-1.5 mb-2 relative overflow-hidden group-hover:border-stone-300'>
                      <div
                        className={`${
                          tpl.layoutFormat === 'SpreadDouble'
                            ? 'aspect-[3/2] w-full max-h-full'
                            : 'aspect-[2/3] h-full'
                        } bg-white border border-stone-300 rounded-xs relative overflow-hidden shadow-2xs`}
                      >
                        {tpl.slots.map((s, idx) => (
                          <div
                            key={idx}
                            className={`absolute border flex items-center justify-center font-mono text-[10px] sm:text-xs font-bold transition-colors select-none ${
                              s.borderless
                                ? 'border-dashed border-orange-400'
                                : isSelected
                                  ? 'border-orange-500'
                                  : 'border-stone-800'
                            } ${
                              isSelected
                                ? 'bg-orange-500/20 text-orange-950'
                                : 'bg-stone-200/85 text-stone-700'
                            }`}
                            style={{
                              left: `${s.x * 100}%`,
                              top: `${s.y * 100}%`,
                              width: `${s.w * 100}%`,
                              height: `${s.h * 100}%`,
                              clipPath: s.corners?.length
                                ? `polygon(${s.corners.map((c) => `${c.x * 100}% ${c.y * 100}%`).join(', ')})`
                                : undefined,
                            }}
                          >
                            {idx + 1}
                          </div>
                        ))}
                      </div>

                      {isSelected && (
                        <div className='absolute top-1.5 right-1.5 w-4 h-4 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-xs'>
                          <CheckCircle2 className='w-3 h-3' />
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className='flex items-center justify-between gap-1.5 min-w-0'>
                      <div className='flex items-center gap-1 min-w-0'>
                        <span
                          className={`text-xs truncate ${
                            isSelected ? 'text-[#C2410C] font-bold' : 'text-stone-800 font-medium'
                          }`}
                          title={tpl.name}
                        >
                          {tpl.name}
                        </span>
                        {tpl.isBuiltIn && (
                          <span className='px-1 py-0.2 rounded text-[9px] font-semibold bg-[#E7E2D9] text-[#57534E] shrink-0'>
                            Mặc định
                          </span>
                        )}
                      </div>
                      <span
                        className={`shrink-0 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-orange-500 text-white'
                            : 'bg-stone-200/70 text-stone-600'
                        }`}
                      >
                        {tpl.panelCount} ô
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='px-4 py-2.5 border-t border-[#D8D2C5] flex items-center justify-between bg-[#F8F6F0] gap-3'>
          <div className='text-xs text-[#57534E] truncate min-w-0'>
            {selectedTemplate && (
              <span className='truncate block'>
                Đang chọn: <strong className='text-[#1C1917]'>{selectedTemplate.name}</strong> (
                {selectedTemplate.panelCount} ô Panel)
              </span>
            )}
          </div>
          <div className='flex items-center gap-2 shrink-0'>
            <button
              type='button'
              onClick={onClose}
              className='px-3 py-1.5 text-xs text-[#57534E] hover:text-[#1C1917] hover:bg-[#EAE5D9] rounded-lg font-medium cursor-pointer transition-colors'
            >
              Hủy
            </button>
            <button
              type='button'
              onClick={handleApply}
              disabled={applying || !selectedTemplateId}
              className='px-3.5 py-1.5 bg-[#F97316] hover:bg-[#EA580C] disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95'
            >
              <span>{applying ? 'Đang áp dụng...' : 'Áp Dụng Mẫu Khung'}</span>
              <ArrowRight className='w-3.5 h-3.5' />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FrameTemplateModal;
