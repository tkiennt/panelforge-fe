// src/shared/features/pipeline-board/DependencyGraphModal.tsx
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Network,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Info,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

export interface GraphNodeItem {
  id: string;
  brief: string;
  status: string | number;
  stageName?: string;
  assigneeName?: string;
  contextText?: string;
  isCurrent?: boolean;
}

export interface DependencyGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetTask: {
    title: string;
    stageName?: string;
    contextText?: string;
    assigneeName?: string;
    isCreating?: boolean;
  };
  dependencies: GraphNodeItem[];
}

export const DependencyGraphModal: React.FC<DependencyGraphModalProps> = ({
  isOpen,
  onClose,
  targetTask,
  dependencies,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isApproved = (status: string | number) => String(status).toLowerCase() === 'approved';

  const approvedCount = dependencies.filter((d) => isApproved(d.status)).length;
  const pendingCount = dependencies.length - approvedCount;

  const modalContent = (
    <div
      className='fixed inset-0 bg-black/60 backdrop-blur-xs z-60 flex items-center justify-center p-4'
      role='dialog'
      aria-modal='true'
      aria-labelledby='dependency-graph-title'
    >
      <div
        ref={modalRef}
        className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden'
      >
        {/* Header */}
        <div className='p-5 border-b border-[#D8D2C5] bg-[#F3F0E9] flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-[#F97316] shadow-2xs'>
              <Network className='w-5 h-5' aria-hidden='true' />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <span className='px-2 py-0.5 rounded bg-[#1C1917] text-white font-mono text-[9px] font-bold'>
                  DAG VISUALIZER
                </span>
                <span className='text-[10px] text-stone-500 font-mono'>
                  Đồ thị phụ thuộc công việc
                </span>
              </div>
              <h3 id='dependency-graph-title' className='text-base font-bold text-[#1C1917] mt-0.5'>
                Sơ Đồ Quan Hệ Phụ Thuộc
              </h3>
            </div>
          </div>
          <button
            type='button'
            onClick={onClose}
            aria-label='Đóng sơ đồ phụ thuộc'
            className='w-8 h-8 rounded-lg hover:bg-white border border-transparent hover:border-[#D8D2C5] flex items-center justify-center text-stone-500 hover:text-[#1C1917] transition-all cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Legend & Stats Banner */}
        <div className='px-6 py-3 bg-[#FAF8F5] border-b border-[#E7E5E4] flex flex-wrap items-center justify-between gap-3 text-xs'>
          <div className='flex items-center gap-4 flex-wrap'>
            <span className='font-semibold text-stone-700'>Chú thích:</span>
            <div className='flex items-center gap-1.5 text-emerald-800'>
              <span className='w-2.5 h-2.5 rounded-full bg-emerald-500'></span>
              <span>Đã duyệt (Đáp ứng)</span>
            </div>
            <div className='flex items-center gap-1.5 text-amber-800'>
              <span className='w-2.5 h-2.5 rounded-full bg-amber-500'></span>
              <span>Chưa duyệt (Phải chờ)</span>
            </div>
            <div className='flex items-center gap-1.5 text-orange-800'>
              <span className='w-2.5 h-2.5 rounded-full bg-[#F97316] ring-2 ring-orange-200'></span>
              <span>Công việc đích ({targetTask.isCreating ? 'Đang tạo' : 'Hiện tại'})</span>
            </div>
          </div>

          <div className='text-[11px] font-mono text-stone-600'>
            {dependencies.length === 0 ? (
              <span className='text-stone-400 italic'>Chưa chọn tiền đề</span>
            ) : (
              <span>
                {dependencies.length} tiền đề ·{' '}
                <strong className='text-emerald-700'>{approvedCount} đã duyệt</strong> ·{' '}
                <strong className='text-amber-700'>{pendingCount} chưa duyệt</strong>
              </span>
            )}
          </div>
        </div>

        {/* Graph Body */}
        <div className='p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6'>
          {dependencies.length === 0 ? (
            <div className='py-12 text-center text-stone-500 bg-white rounded-xl border border-dashed border-stone-300 p-6 space-y-2'>
              <Info className='w-8 h-8 text-stone-400 mx-auto' />
              <p className='text-sm font-medium text-stone-700'>
                Chưa có công việc tiền đề nào được chọn.
              </p>
              <p className='text-xs text-stone-500 max-w-md mx-auto'>
                Khi bạn tick chọn các công việc trong danh sách checkbox, sơ đồ này sẽ trực quan hóa
                dòng phụ thuộc từ các công việc tiền đề đến công việc đích.
              </p>
            </div>
          ) : (
            <div className='flex flex-col md:flex-row items-center justify-between gap-6 relative'>
              {/* Left Column: Predecessors */}
              <div className='w-full md:w-5/12 space-y-3'>
                <div className='text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center justify-between'>
                  <span>Công việc tiền đề ({dependencies.length})</span>
                  <span className='text-[10px] text-stone-400 font-normal'>Phải xong trước</span>
                </div>

                <div className='space-y-2.5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar'>
                  {dependencies.map((node) => {
                    const approved = isApproved(node.status);
                    return (
                      <div
                        key={node.id}
                        className={`p-3 rounded-xl border text-xs transition-all shadow-2xs ${
                          approved
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                            : 'bg-amber-50/80 border-amber-300 text-amber-950'
                        }`}
                      >
                        <div className='flex items-start justify-between gap-2'>
                          <div className='font-semibold text-stone-900 leading-snug line-clamp-2'>
                            {node.brief}
                          </div>
                          <span
                            className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                              approved
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {approved ? (
                              <>
                                <CheckCircle2 className='w-3 h-3' /> Đã duyệt
                              </>
                            ) : (
                              <>
                                <Clock className='w-3 h-3' /> Chưa duyệt
                              </>
                            )}
                          </span>
                        </div>

                        <div className='mt-2 pt-2 border-t border-black/5 flex flex-wrap items-center justify-between gap-1 text-[11px] text-stone-600'>
                          <span>{node.contextText || 'Chương'}</span>
                          {node.assigneeName && (
                            <span className='font-medium text-stone-700'>
                              👤 {node.assigneeName}
                            </span>
                          )}
                          <span className='font-mono text-[10px] text-stone-400'>
                            #{node.id.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Center Connectors (Arrow Direction) */}
              <div className='shrink-0 flex md:flex-col items-center justify-center gap-2 text-stone-400 py-2'>
                <div className='hidden md:flex flex-col items-center gap-1.5'>
                  <div className='w-0.5 h-8 bg-stone-300 rounded'></div>
                  <div className='w-7 h-7 rounded-full bg-white border border-[#D8D2C5] flex items-center justify-center text-[#F97316] shadow-xs'>
                    <ArrowRight className='w-4 h-4' />
                  </div>
                  <div className='w-0.5 h-8 bg-stone-300 rounded'></div>
                </div>
                <span className='text-[10px] font-mono uppercase tracking-widest text-stone-500 font-semibold px-2 py-1 bg-stone-100 rounded border border-stone-200'>
                  Yêu cầu duyệt
                </span>
                <div className='md:hidden flex items-center gap-1.5'>
                  <div className='w-8 h-0.5 bg-stone-300 rounded'></div>
                  <ArrowRight className='w-4 h-4 text-[#F97316]' />
                </div>
              </div>

              {/* Right Column: Target Task */}
              <div className='w-full md:w-5/12 space-y-3'>
                <div className='text-xs font-bold uppercase tracking-wider text-[#F97316] flex items-center justify-between'>
                  <span className='flex items-center gap-1.5'>
                    <Sparkles className='w-3.5 h-3.5' />
                    <span>{targetTask.isCreating ? 'Công việc đang tạo' : 'Công việc đích'}</span>
                  </span>
                  <span className='text-[10px] text-stone-400 font-normal'>Bắt đầu sau</span>
                </div>

                <div className='p-4 rounded-xl border-2 border-[#F97316] bg-white text-xs space-y-3 shadow-md relative overflow-hidden'>
                  <div className='absolute top-0 right-0 bg-[#F97316] text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-bl-lg'>
                    {targetTask.isCreating ? 'ĐANG TẠO' : 'MỤC TIÊU'}
                  </div>

                  <div>
                    <span className='text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200 inline-block mb-1'>
                      {targetTask.stageName || 'Pipeline Stage'}
                    </span>
                    <h4 className='text-sm font-bold text-[#1C1917] leading-snug'>
                      {targetTask.title || '[Chưa nhập tiêu đề brief]'}
                    </h4>
                  </div>

                  <div className='pt-2 border-t border-stone-100 text-[11px] text-stone-600 space-y-1'>
                    <div className='flex items-center justify-between'>
                      <span>Ngữ cảnh:</span>
                      <strong className='text-stone-800'>
                        {targetTask.contextText || 'Chương'}
                      </strong>
                    </div>
                    {targetTask.assigneeName && (
                      <div className='flex items-center justify-between'>
                        <span>Người nhận:</span>
                        <strong className='text-stone-800'>{targetTask.assigneeName}</strong>
                      </div>
                    )}
                  </div>

                  {/* Readiness Status Box */}
                  <div
                    className={`p-2.5 rounded-lg border text-[11px] flex items-start gap-2 ${
                      pendingCount === 0
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    {pendingCount === 0 ? (
                      <>
                        <ShieldCheck className='w-4 h-4 text-emerald-600 shrink-0 mt-0.5' />
                        <div>
                          <strong>Điều kiện phụ thuộc đã đáp ứng:</strong> Tất cả{' '}
                          {dependencies.length} công việc tiền đề đã được duyệt.
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className='w-4 h-4 text-amber-600 shrink-0 mt-0.5' />
                        <div>
                          <strong>Chưa thể bắt đầu:</strong> Phải chờ {pendingCount} công việc tiền
                          đề được phê duyệt (Approved) trước.
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Explanation Footer Note */}
          <div className='p-3.5 bg-[#FAF8F5] rounded-xl border border-[#D8D2C5] text-xs text-stone-600 space-y-1.5'>
            <div className='font-semibold text-stone-800 flex items-center gap-1.5'>
              <Info className='w-3.5 h-3.5 text-[#F97316]' />
              <span>Nguyên tắc xử lý phụ thuộc (BR-19 &amp; DAG):</span>
            </div>
            <ul className='list-disc list-inside space-y-0.5 text-[11px] text-stone-600 pl-1'>
              <li>
                Bạn vẫn có thể <strong>Tạo &amp; Giao Việc</strong> ngay cả khi tiền đề chưa duyệt,
                công việc sẽ ở trạng thái chờ và không thể chuyển sang <em>InProgress</em>.
              </li>
              <li>
                Mỗi công việc tiền đề chỉ được coi là hoàn tất khi đạt trạng thái{' '}
                <strong className='text-emerald-700'>Đã duyệt (Approved)</strong>.
              </li>
              <li>Không thể thiết lập phụ thuộc tạo vòng lặp khép kín giữa các công việc.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className='p-4 border-t border-[#D8D2C5] bg-[#F3F0E9] flex justify-end'>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-medium text-xs shadow-xs cursor-pointer transition-colors'
          >
            Đóng sơ đồ
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
