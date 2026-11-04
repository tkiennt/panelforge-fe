import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  MessageSquare,
  Film,
  Layers,
} from 'lucide-react';
import {
  pageService,
  AutoAssignScriptLinesResult,
} from '@/services/page.service';
import { PanelDto } from '@/types/pipeline';
import { SceneScriptLineSummaryDto } from '@/services/scriptLine.service';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  pageNumber: number;
  sceneId: string;
  sceneHeading?: string;
  panels: PanelDto[];
  lines: SceneScriptLineSummaryDto[];
  bibleNameById?: Record<string, string>;
  onSuccess: () => Promise<void> | void;
  onShowToast?: (title: string, message: string) => void;
}

export const AutoAssignScriptLinesModal: React.FC<Props> = ({
  isOpen,
  onClose,
  pageId,
  pageNumber,
  sceneId,
  sceneHeading,
  panels,
  lines,
  bibleNameById = {},
  onSuccess,
  onShowToast,
}) => {
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<AutoAssignScriptLinesResult | null>(null);

  useEffect(() => {
    if (!isOpen || !pageId || !sceneId) {
      setPreviewResult(null);
      setErrorMsg(null);
      return;
    }

    let isMounted = true;
    setLoadingPreview(true);
    setErrorMsg(null);

    pageService
      .autoAssignScriptLines(pageId, { sceneId, dryRun: true })
      .then((res) => {
        if (!isMounted) return;
        setPreviewResult(res);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setErrorMsg(err?.message || 'Không thể tính toán phân bổ kịch bản xem trước.');
      })
      .finally(() => {
        if (isMounted) setLoadingPreview(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, pageId, sceneId]);

  if (!isOpen) return null;

  const linesById = new Map<string, SceneScriptLineSummaryDto>(lines.map((l) => [l.id, l]));
  const panelsById = new Map<string, PanelDto>(panels.map((p) => [p.id, p]));

  const handleApply = async () => {
    if (applying || !pageId || !sceneId) return;
    setApplying(true);
    setErrorMsg(null);
    try {
      await pageService.autoAssignScriptLines(pageId, { sceneId, dryRun: false });
      onShowToast?.(
        'Phân bổ kịch bản thành công',
        `Đã phân bổ kịch bản vào ${previewResult?.assignments?.length || 0} khung tranh.`
      );
      await onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Lỗi khi áp dụng phân bổ kịch bản vào các khung.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-labelledby='auto-assign-modal-title'
      data-testid='auto-assign-script-lines-modal'
      className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200'
    >
      <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden'>
        {/* Header */}
        <div className='p-4 border-b border-[#D8D2C5] flex items-center justify-between bg-[#F8F6F0]'>
          <div className='flex items-center gap-2.5'>
            <div className='p-2 bg-[#FFF2E6] text-[#C2410C] rounded-xl border border-[#FDBA74]'>
              <Sparkles className='w-5 h-5' />
            </div>
            <div>
              <h2 id='auto-assign-modal-title' className='font-bold text-sm text-[#1C1917] flex items-center gap-2'>
                <span>Tự Động Phân Bổ Kịch Bản</span>
                <span className='px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#FFF2E6] text-[#C2410C] border border-[#FDBA74]'>
                  Trang #{pageNumber}
                </span>
              </h2>
              <p className='text-xs text-[#57534E]'>
                Gom dòng chỉ dẫn & thoại theo sau thành cụm, gán lần lượt vào các khung theo thứ tự đọc
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={applying}
            className='p-1.5 rounded-lg text-[#57534E] hover:bg-[#F3F0E9] hover:text-[#1C1917] cursor-pointer transition-colors disabled:opacity-50'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Body */}
        <div className='p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar'>
          {sceneHeading && (
            <div className='text-xs text-[#57534E] flex items-center gap-1.5 bg-[#F8F6F0] p-2.5 rounded-xl border border-[#D8D2C5]'>
              <Film className='w-4 h-4 text-[#C2410C]' />
              <span>Phân cảnh nguồn:</span>
              <strong className='text-[#1C1917]'>{sceneHeading}</strong>
            </div>
          )}

          {errorMsg && (
            <div
              role='alert'
              className='p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2 leading-relaxed'
            >
              <AlertTriangle className='w-4 h-4 shrink-0 mt-0.5 text-rose-600' />
              <span>{errorMsg}</span>
            </div>
          )}

          {loadingPreview ? (
            <div className='py-12 flex flex-col items-center justify-center text-center space-y-2 text-[#57534E]'>
              <Loader2 className='w-8 h-8 text-[#C2410C] animate-spin' />
              <div className='text-xs font-semibold text-[#1C1917]'>
                Đang phân tích cấu trúc kịch bản và khung trang...
              </div>
              <p className='text-[11px] max-w-sm'>
                Hệ thống đang rà soát các dòng chỉ dẫn và thoại để gom cụm tối ưu cho trang.
              </p>
            </div>
          ) : previewResult ? (
            <div className='space-y-3.5'>
              {/* Summary Stats */}
              <div className='grid grid-cols-2 gap-2 text-xs'>
                <div className='p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl'>
                  <div className='text-emerald-700 font-semibold flex items-center gap-1.5 mb-1'>
                    <CheckCircle2 className='w-4 h-4 text-emerald-600' />
                    <span>Khung được phân bổ</span>
                  </div>
                  <div className='text-lg font-bold text-emerald-900'>
                    {previewResult.assignments.length} / {panels.length} khung
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl border ${
                    previewResult.missingPanels > 0
                      ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                      : 'bg-stone-50 border-stone-200 text-stone-700'
                  }`}
                >
                  <div className='font-semibold flex items-center gap-1.5 mb-1'>
                    <Layers className='w-4 h-4 text-amber-600' />
                    <span>Khung còn thiếu</span>
                  </div>
                  <div className='text-lg font-bold'>
                    {previewResult.missingPanels} khung
                  </div>
                </div>
              </div>

              {previewResult.missingPanels > 0 && (
                <div className='p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed flex items-start gap-2'>
                  <AlertTriangle className='w-4 h-4 shrink-0 mt-0.5 text-amber-600' />
                  <div>
                    <strong>Lưu ý:</strong> Kịch bản có nhiều cụm hơn số khung hiện tại trên trang. Có{' '}
                    <strong>{previewResult.unassignedLineIds.length} dòng kịch bản</strong> sẽ chưa được
                    gán. Bạn có thể thêm {previewResult.missingPanels} khung nữa vào trang sau đó.
                  </div>
                </div>
              )}

              {/* Assignment Mapping */}
              <div className='space-y-2.5'>
                <h4 className='text-xs font-bold text-[#1C1917] uppercase tracking-wider'>
                  Chi tiết phân bổ vào từng khung:
                </h4>
                {previewResult.assignments.map((grp, idx) => {
                  const panel = panelsById.get(grp.panelId);
                  return (
                    <div
                      key={grp.panelId}
                      className='p-3 bg-white rounded-xl border border-[#D8D2C5] shadow-2xs space-y-2'
                    >
                      <div className='flex items-center justify-between text-xs border-b border-[#F3F0E9] pb-1.5'>
                        <span className='font-bold text-[#1C1917] flex items-center gap-1.5'>
                          <span className='w-5 h-5 rounded-full bg-[#FFF2E6] text-[#C2410C] font-mono text-[11px] font-bold flex items-center justify-center'>
                            {idx + 1}
                          </span>
                          <span>Khung #{panel?.panelNumber ?? idx + 1}</span>
                          <span className='text-[10px] text-[#57534E] font-normal'>
                            (Thứ tự đọc #{panel?.readingOrder ?? idx + 1})
                          </span>
                        </span>
                        <span className='text-[10px] font-mono font-bold text-[#57534E] bg-[#F8F6F0] px-2 py-0.5 rounded-full border border-[#D8D2C5]'>
                          {grp.scriptLineIds.length} dòng
                        </span>
                      </div>

                      <div className='space-y-1.5 pl-6'>
                        {grp.scriptLineIds.map((lid) => {
                          const line = linesById.get(lid);
                          if (!line) return null;
                          const isDialogue = Boolean(line.speakerCharacterId || line.dialogueText?.trim());
                          const characterName = line.speakerCharacterId
                            ? bibleNameById[line.speakerCharacterId] || 'Nhân vật'
                            : 'Lời thoại';
                          return (
                            <div
                              key={lid}
                              className='text-xs flex items-start gap-2 p-1.5 rounded-lg bg-[#FAF8F5] border border-[#EBE6DD]'
                            >
                              <span className='text-[10px] font-mono text-[#57534E] mt-0.5 shrink-0'>
                                #{line.lineOrder}
                              </span>
                              {isDialogue ? (
                                <span className='shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1'>
                                  <MessageSquare className='w-2.5 h-2.5 text-sky-600' />
                                  <span>{characterName}</span>
                                </span>
                              ) : (
                                <span className='shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200 flex items-center gap-1'>
                                  <Film className='w-2.5 h-2.5 text-stone-500' />
                                  <span>Chỉ dẫn</span>
                                </span>
                              )}
                              <p className='text-xs text-[#1C1917] leading-relaxed line-clamp-2'>
                                {line.dialogueText || line.stageDirection || '(Chỉ dẫn diễn xuất)'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {previewResult.unassignedLineIds.length > 0 && (
                  <div className='p-3 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-2'>
                    <div className='text-xs font-bold text-amber-900 flex items-center justify-between'>
                      <span>Dòng kịch bản chưa thể gán (vượt số lượng khung)</span>
                      <span className='font-mono font-bold'>{previewResult.unassignedLineIds.length} dòng</span>
                    </div>
                    <div className='space-y-1 pl-2'>
                      {previewResult.unassignedLineIds.map((lid) => {
                        const line = linesById.get(lid);
                        if (!line) return null;
                        return (
                          <div key={lid} className='text-xs text-[#57534E] flex items-center gap-2'>
                            <span className='font-mono text-[10px]'>#{line.lineOrder}</span>
                            <span className='truncate'>{line.dialogueText || line.stageDirection}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className='p-4 border-t border-[#D8D2C5] flex items-center justify-between bg-[#F8F6F0]'>
          <button
            type='button'
            onClick={onClose}
            disabled={applying}
            className='px-4 py-2 border border-[#D8D2C5] rounded-xl text-xs font-semibold text-[#1C1917] hover:bg-[#F3F0E9] cursor-pointer disabled:opacity-50'
          >
            Hủy
          </button>
          <button
            type='button'
            data-testid='apply-auto-assign-btn'
            onClick={handleApply}
            disabled={loadingPreview || applying || !previewResult || previewResult.assignments.length === 0}
            className='px-4 py-2 bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors disabled:opacity-50'
          >
            {applying ? (
              <>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span>Đang áp dụng...</span>
              </>
            ) : (
              <>
                <Sparkles className='w-4 h-4' />
                <span>Áp dụng phân bổ</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
