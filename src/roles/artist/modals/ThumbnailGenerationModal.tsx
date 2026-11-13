import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2, Palette, Sparkles, X } from 'lucide-react';
import {
  AiApiError,
  AiSuggestionDto,
  ThumbnailSuggestion,
  aiAgentsService,
} from '@/services/aiAgents.service';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';

interface ThumbnailGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  seriesId: string;
  chapterId: string;
  panelId: string;
  panelNumber?: number;
  chapterVersion: number;
  onSuccess: () => Promise<void> | void;
  onShowToast?: (title: string, desc: string) => void;
  onOpenStep1?: () => void;
}

export const ThumbnailGenerationModal: React.FC<ThumbnailGenerationModalProps> = ({
  isOpen,
  onClose,
  seriesId,
  chapterId,
  panelId,
  panelNumber,
  chapterVersion,
  onSuccess,
  onShowToast,
  onOpenStep1,
}) => {
  const [instruction, setInstruction] = useState('');
  const [generating, setGenerating] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [suggestion, setSuggestion] = useState<AiSuggestionDto | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPromptMissing, setIsPromptMissing] = useState(false);

  // Khôi phục đề xuất Thumbnail Pending (nếu đã có trước đó cho panel này)
  useEffect(() => {
    if (!isOpen || !seriesId || !panelId) return;
    let alive = true;
    setErrorMsg(null);
    setIsPromptMissing(false);
    setInstruction('');

    aiAgentsService
      .getSuggestions(seriesId, { status: 'Pending' })
      .then((list) => {
        if (!alive) return;
        const match = list.find(
          (s) =>
            s.kind === 'Thumbnail' &&
            (s.payload as ThumbnailSuggestion | undefined)?.panelId === panelId,
        );
        if (match) {
          setSuggestion(match);
        } else {
          setSuggestion(null);
        }
      })
      .catch(() => {
        // bỏ qua lỗi kiểm tra
      });

    return () => {
      alive = false;
    };
  }, [isOpen, seriesId, panelId]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!seriesId || !panelId || generating) return;
    setGenerating(true);
    setErrorMsg(null);
    try {
      const res = await aiAgentsService.runThumbnail(seriesId, {
        panelId,
        instruction: instruction.trim() || null,
      });
      setSuggestion(res);
      onShowToast?.('Sinh ảnh thành công', 'AI đã sinh bản vẽ mẫu cho khung tranh.');
    } catch (e: unknown) {
      const err = e as Partial<AiApiError> | undefined;
      const msg = err?.message || 'Không thể sinh ảnh thumbnail AI cho khung.';
      const promptMissing =
        err?.status === 409 ||
        err?.code === 'Conflict' ||
        err?.code === 'Validation' ||
        Boolean(
          msg.includes('prompt ảnh đã duyệt') ||
          msg.includes('ImagePrompt') ||
          msg.includes('chưa có prompt') ||
          msg.includes('bước 1'),
        );
      setIsPromptMissing(promptMissing);
      setErrorMsg(
        promptMissing
          ? msg.includes('chưa có prompt')
            ? msg
            : 'Panel chưa có mô tả vẽ đã duyệt. Vui lòng chạy bước 1 (Tạo mô tả vẽ) và Chấp nhận (Accept) trước khi sinh ảnh.'
          : msg,
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleAccept = async () => {
    if (!suggestion || deciding) return;
    setDeciding(true);
    setErrorMsg(null);
    try {
      await aiAgentsService.review(seriesId, suggestion.id, 'accept', {
        chapterVersion,
      });
      onShowToast?.('Đã chấp nhận', 'Ảnh mẫu AI đã được gán làm artwork mới cho khung.');
      await onSuccess();
      onClose();
    } catch (e: unknown) {
      const err = e as Partial<AiApiError> | undefined;
      setErrorMsg(err?.message || 'Không thể chấp nhận ảnh mẫu AI.');
    } finally {
      setDeciding(false);
    }
  };

  const handleReject = async () => {
    if (!suggestion || deciding) return;
    setDeciding(true);
    setErrorMsg(null);
    try {
      await aiAgentsService.review(seriesId, suggestion.id, 'reject', {
        chapterVersion,
      });
      onShowToast?.('Đã từ chối', 'Đã bỏ qua ảnh mẫu AI.');
      setSuggestion(null);
    } catch (e: unknown) {
      const err = e as Partial<AiApiError> | undefined;
      setErrorMsg(err?.message || 'Không thể từ chối đề xuất ảnh AI.');
    } finally {
      setDeciding(false);
    }
  };

  const payload = suggestion?.payload as ThumbnailSuggestion | undefined;

  return (
    <div
      data-testid='thumbnail-generation-modal'
      role='dialog'
      aria-modal='true'
      aria-labelledby='thumbnail-modal-title'
      className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200'
    >
      <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl w-full max-w-xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden'>
        {/* Header */}
        <div className='p-4 border-b border-[#D8D2C5] flex items-center justify-between bg-[#F8F6F0]'>
          <div className='flex items-center gap-2.5'>
            <div className='p-2 bg-[#FFF2E6] text-[#C2410C] rounded-xl border border-[#FDBA74]'>
              <Palette className='w-5 h-5' />
            </div>
            <div>
              <h2
                id='thumbnail-modal-title'
                className='font-bold text-sm text-[#1C1917] flex items-center gap-2'
              >
                <span>Sinh Ảnh Mẫu AI (Thumbnail)</span>
                {panelNumber !== undefined && (
                  <span className='px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#FFF2E6] text-[#C2410C] border border-[#FDBA74]'>
                    Khung #{panelNumber}
                  </span>
                )}
              </h2>
              <p className='text-xs text-[#57534E]'>
                Tạo phác thảo / thumbnail tự động từ ImagePrompt đã duyệt của phân cảnh
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={generating || deciding}
            className='p-1.5 rounded-lg text-[#57534E] hover:bg-[#F3F0E9] hover:text-[#1C1917] cursor-pointer transition-colors disabled:opacity-50'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Body */}
        <div className='p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar'>
          {errorMsg && (
            <div
              role='alert'
              className='p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs space-y-2'
            >
              <div className='flex items-start gap-2 leading-relaxed whitespace-pre-line'>
                <AlertTriangle className='w-4 h-4 shrink-0 mt-0.5 text-rose-600' />
                <span>{errorMsg}</span>
              </div>
              {isPromptMissing && onOpenStep1 && (
                <div className='pt-1 border-t border-rose-200/60 flex items-center justify-between gap-2'>
                  <span className='text-[11px] text-rose-700'>
                    Cần hoàn thành bước 1 (Tạo mô tả vẽ) trước:
                  </span>
                  <button
                    type='button'
                    data-testid='open-step1-from-modal-btn'
                    onClick={() => {
                      onClose();
                      onOpenStep1();
                    }}
                    className='px-3 py-1.5 bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0'
                  >
                    <Sparkles className='w-3.5 h-3.5' />
                    <span>Mở bước 1 ngay</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {!suggestion ? (
            <div className='space-y-4'>
              <div className='p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed'>
                <strong>Lưu ý:</strong> Quá trình sinh ảnh AI mất khoảng <strong>10–60 giây</strong>
                . Khung tranh phải có <em>Mô tả vẽ AI</em> đã được Chấp nhận (Accept).
              </div>

              <div>
                <label
                  htmlFor='ai-thumbnail-instruction'
                  className='block text-xs font-semibold text-[#1C1917] mb-1.5'
                >
                  Yêu cầu bổ sung cho ảnh khung này (tùy chọn)
                </label>
                <textarea
                  id='ai-thumbnail-instruction'
                  rows={4}
                  maxLength={500}
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  disabled={generating}
                  placeholder='Ví dụ: Góc máy cận cảnh biểu cảm ngạc nhiên; ánh sáng tương phản cao; nhấn mạnh chi tiết đôi mắt...'
                  className='w-full p-3 bg-white border border-[#D8D2C5] rounded-xl text-xs text-[#1C1917] focus:border-[#F97316] focus:outline-none resize-none'
                />
                <div className='text-right text-[10px] text-[#57534E] mt-1 font-mono'>
                  {instruction.length}/500 ký tự
                </div>
              </div>

              {generating && (
                <div className='p-6 rounded-xl border border-orange-200 bg-orange-50/50 flex flex-col items-center justify-center text-center space-y-2.5 animate-pulse'>
                  <Loader2 className='w-8 h-8 text-[#C2410C] animate-spin' />
                  <div className='text-xs font-bold text-[#1C1917]'>Đang sinh ảnh bằng AI...</div>
                  <p className='text-[11px] text-[#57534E] max-w-xs'>
                    Mô hình đang kết hợp nhân vật Series Bible và mô tả kịch bản để vẽ thumbnail.
                    Vui lòng không đóng cửa sổ.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className='space-y-4'>
              <div className='p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between'>
                <span className='font-semibold flex items-center gap-1.5'>
                  <Sparkles className='w-4 h-4 text-emerald-600' />
                  Đã sinh ảnh mẫu AI thành công
                </span>
                <span className='text-[10px] font-mono'>
                  {payload?.provider} · {payload?.model}
                </span>
              </div>

              {/* Preview Image */}
              {payload?.sha256 ? (
                <div className='w-full h-64 bg-stone-900 rounded-xl overflow-hidden border border-[#D8D2C5] flex items-center justify-center relative shadow-inner'>
                  <AuthenticatedImage
                    src={`/api/series/${seriesId}/bible/assets/${payload.sha256}`}
                    alt={`AI Thumbnail Khung #${panelNumber ?? ''}`}
                    className='max-w-full max-h-full object-contain'
                  />
                </div>
              ) : null}

              {/* Prompt info */}
              {payload?.prompt && (
                <div className='p-3 bg-[#F8F6F0] border border-[#D8D2C5] rounded-xl space-y-1 text-xs'>
                  <span className='font-bold text-[#1C1917] block'>
                    Mô tả lệnh tạo ảnh (Prompt):
                  </span>
                  <p className='text-[#57534E] italic leading-relaxed line-clamp-4'>
                    "{payload.prompt}"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='p-4 border-t border-[#D8D2C5] flex items-center justify-between bg-[#F8F6F0]'>
          {!suggestion ? (
            <>
              <button
                type='button'
                onClick={onClose}
                disabled={generating}
                className='px-4 py-2 border border-[#D8D2C5] rounded-xl text-xs font-semibold text-[#1C1917] hover:bg-[#F3F0E9] cursor-pointer disabled:opacity-50'
              >
                Hủy
              </button>
              <button
                type='button'
                data-testid='start-generate-thumbnail-btn'
                onClick={handleGenerate}
                disabled={generating}
                className='px-4 py-2 bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors disabled:opacity-50'
              >
                {generating ? (
                  <>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    <span>Đang sinh ảnh (10-60s)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className='w-4 h-4' />
                    <span>Bắt đầu sinh ảnh</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type='button'
                data-testid='reject-thumbnail-btn'
                onClick={handleReject}
                disabled={deciding}
                className='px-4 py-2 border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50'
              >
                {deciding ? <Loader2 className='w-4 h-4 animate-spin' /> : 'Từ chối & sinh lại'}
              </button>
              <button
                type='button'
                data-testid='accept-thumbnail-btn'
                onClick={handleAccept}
                disabled={deciding}
                className='px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50'
              >
                {deciding ? (
                  <>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    <span>Đang áp dụng...</span>
                  </>
                ) : (
                  <>
                    <Check className='w-4 h-4' />
                    <span>Chấp nhận ảnh này</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
