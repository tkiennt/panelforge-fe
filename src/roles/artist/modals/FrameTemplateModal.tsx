import React, { useEffect, useState } from 'react';
import {
  LayoutTemplate,
  X,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Layers,
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
          'Áp dụng mẫu khung thành công',
          `Đã áp dụng mẫu khung với ${createdPanels.length} ô panel cho Trang ${pageNumber}.`,
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
    <div className='fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200'>
      <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh] overflow-hidden'>
        {/* Header */}
        <div className='p-5 border-b border-[#E7E7E7] flex items-center justify-between bg-[#FAF8F5]'>
          <div className='flex items-center gap-2.5'>
            <div className='p-2 bg-blue-100 text-blue-600 rounded-xl'>
              <LayoutTemplate className='w-5 h-5' />
            </div>
            <div>
              <h3 className='text-sm font-bold text-[#171717]'>
                Áp Dụng Mẫu Khung Tranh (Frame Templates)
              </h3>
              <p className='text-[11px] text-[#737373]'>
                Trang {pageNumber} • Chọn mẫu khung dựng sẵn để tự động sinh ô Panel theo thứ tự đọc
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='p-1.5 text-[#888888] hover:text-[#171717] rounded-lg transition-colors cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Warning if page already has panels */}
        {hasExistingPanels && (
          <div className='mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900'>
            <ShieldAlert className='w-4 h-4 text-amber-600 shrink-0 mt-0.5' />
            <div>
              <div className='font-bold'>Trang đã có khung tranh (Panels)</div>
              <p className='text-[11px] text-amber-800 mt-0.5'>
                Trang này đã có các ô panel. Việc áp dụng mẫu khung mới có thể gây xung đột thứ tự
                đọc hoặc tạo thêm các ô mới. Hãy chắc chắn trước khi tiếp tục.
              </p>
            </div>
          </div>
        )}

        {/* Error notice */}
        {errorMsg && (
          <div className='mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700'>
            <AlertTriangle className='w-4 h-4 text-red-600 shrink-0' />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Content body */}
        <div className='p-6 flex-1 overflow-y-auto custom-scrollbar space-y-4'>
          {loading ? (
            <div className='p-12 text-center text-xs text-zinc-500'>
              Đang tải danh sách mẫu khung...
            </div>
          ) : templates.length === 0 ? (
            <div className='p-12 text-center text-xs text-zinc-500 border border-dashed border-[#E7E7E7] rounded-xl'>
              Chưa có mẫu khung nào trong Studio.
            </div>
          ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              {templates.map((tpl) => {
                const isSelected = tpl.id === selectedTemplateId;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20'
                        : 'border-[#E7E7E7] bg-white hover:border-blue-300'
                    }`}
                  >
                    <div className='flex items-center justify-between mb-2'>
                      <div className='font-bold text-xs text-[#171717] flex items-center gap-1.5'>
                        <span>{tpl.name}</span>
                        {tpl.isBuiltIn && (
                          <span className='px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-100 text-zinc-600'>
                            Mặc định
                          </span>
                        )}
                      </div>
                      <span className='font-mono text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded'>
                        {tpl.panelCount} ô
                      </span>
                    </div>

                    <div className='text-[10px] text-[#737373] mb-3'>
                      Khổ: <span className='font-mono'>{tpl.layoutFormat}</span>
                    </div>

                    {/* Miniature Slot Layout Visualization */}
                    {/* BE trả x/y/w/h chuẩn hoá 0–1 theo trang; corners 0–1 trong hộp khung (khung nghiêng) */}
                    <div
                      className={`${tpl.layoutFormat === 'SpreadDouble' ? 'aspect-[3/2]' : 'aspect-[2/3]'} bg-white border border-zinc-200 rounded relative overflow-hidden`}
                    >
                      {tpl.slots.map((s, idx) => (
                        <div
                          key={idx}
                          className={`absolute border ${s.borderless ? 'border-dashed border-blue-300' : 'border-blue-400'} bg-blue-500/15 flex items-center justify-center font-mono text-[9px] font-bold text-blue-700`}
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
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='p-4 border-t border-[#E7E7E7] flex items-center justify-between bg-[#FAF8F5]'>
          <div className='text-xs text-[#737373]'>
            {selectedTemplate && (
              <span>
                Đang chọn: <strong>{selectedTemplate.name}</strong> ({selectedTemplate.panelCount} ô
                Panel)
              </span>
            )}
          </div>
          <div className='flex items-center gap-2'>
            <button
              onClick={onClose}
              className='px-3.5 py-1.5 text-xs text-[#555555] hover:text-[#171717] font-semibold cursor-pointer'
            >
              Hủy
            </button>
            <button
              onClick={handleApply}
              disabled={applying || !selectedTemplateId}
              className='px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer'
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
