// src/roles/writer/components/script/flow/converter/AiScriptConvertModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Zap,
  FileText,
  Lightbulb,
  ArrowRight,
  Layers,
  Settings,
  X,
  Check,
  AlertTriangle,
  RotateCcw,
  Copy,
  Cpu,
  Bookmark,
  Upload,
  Code2,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import { SeriesBibleContext } from './types';
import { convertToComicScript } from './aiScriptService';
import {
  parseScriptTextToBlocks,
  countPagesAndPanels,
  filterScriptTextByPageRange,
} from './scriptConverterAdapter';

export interface AiScriptConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyScript: (scriptText: string, mode: 'append' | 'insert' | 'replace') => void;
  initialStartingPageNumber?: number;
  seriesBibleContext?: SeriesBibleContext;
  onShowToast?: (title: string, desc: string) => void;
}

const SAMPLE_NOVEL_PROSE = `Đêm đã về khuya, những hạt mưa phùn lạnh buốt bắt đầu trút xuống ngã tư Shibuya. Dưới ánh đèn neon chập chờn, Minh kéo sụp chiếc mũ lưỡi trai để che đi vết thương trên trán.
"Chúng ta phải rời khỏi đây ngay lập tức!" - Minh quay sang giục Lan, ánh mắt không ngừng liếc nhìn con hẻm tối phía sau.
Lan siết chặt chiếc cặp tài liệu trong tay, thở dốc: "Nhưng còn bản thiết kế... nếu bọn chúng lấy được thì sao?"
Bỗng nhiên, một tiếng nổ chói tai vang lên từ tầng thượng tòa nhà đối diện! (BÙM!)
Khói đen bốc lên cuồn cuộn. Một bóng đen bí ẩn từ từ bước ra khỏi làn khói với lưỡi kiếm sáng loáng.`;

const PROMPT_PRESETS = [
  'Cảnh rượt đuổi nghẹt thở trên nóc tàu điện ngầm lúc nửa đêm.',
  'Hai nhân vật đối đầu dưới mưa lớn, tiết lộ bí mật thân thế bị che giấu.',
  'Trận chiến phép thuật nảy lửa trong thư viện cổ bị phong ấn.',
  'Cuộc hội ngộ bất ngờ sau 5 năm tại quán cà phê quen thuộc.',
];

export const AiScriptConvertModal: React.FC<AiScriptConvertModalProps> = ({
  isOpen,
  onClose,
  onApplyScript,
  initialStartingPageNumber = 1,
  seriesBibleContext,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'convert_raw_text' | 'generate_from_prompt'>(
    'convert_raw_text',
  );
  const [inputContent, setInputContent] = useState('');
  const [startingPage, setStartingPage] = useState<number>(initialStartingPageNumber);
  const [targetPanels, setTargetPanels] = useState<number>(4);
  const [attachBible, setAttachBible] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [convertedResult, setConvertedResult] = useState<string | null>(null);
  const [pagesCount, setPagesCount] = useState<number>(0);
  const [panelsCount, setPanelsCount] = useState<number>(0);
  const [resultSource, setResultSource] = useState<'gemini' | 'heuristic'>('heuristic');
  const [confirmReplace, setConfirmReplace] = useState<boolean>(false);

  // Staged Ingestion & Performance Guard States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importedFileName, setImportedFileName] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'visual' | 'raw_editor'>('visual');
  const [ingestionScope, setIngestionScope] = useState<'all' | 'range'>('all');
  const [rangeFromPage, setRangeFromPage] = useState<number>(initialStartingPageNumber);
  const [rangeToPage, setRangeToPage] = useState<number>(initialStartingPageNumber);

  useEffect(() => {
    if (isOpen) {
      setStartingPage(initialStartingPageNumber);
      setRangeFromPage(initialStartingPageNumber);
      setRangeToPage(initialStartingPageNumber);
      setConfirmReplace(false);
      setIngestionScope('all');
    }
  }, [isOpen, initialStartingPageNumber]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setInputContent(text);
        setImportedFileName(file.name);
        setConvertedResult(null);
        onShowToast?.(
          'Đã nạp tệp kịch bản thô',
          `Đã tải "${file.name}" (${(file.size / 1024).toFixed(1)} KB) thành công.`,
        );
      }
    };
    reader.onerror = () => {
      onShowToast?.('Lỗi tải tệp tin', 'Không thể đọc nội dung tệp tin đã chọn.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleInsertTag = (tagPrefix: string) => {
    setInputContent((prev) => {
      const trimmed = prev.trimEnd();
      return trimmed ? `${trimmed}\n\n${tagPrefix}` : tagPrefix;
    });
  };

  const handleRawScriptChange = (newText: string) => {
    setConvertedResult(newText);
    const stats = countPagesAndPanels(newText);
    setPagesCount(stats.pagesCount);
    setPanelsCount(stats.panelsCount);
    setRangeToPage(Math.max(rangeFromPage, rangeFromPage + stats.pagesCount - 1));
  };

  const handleConvert = async () => {
    if (!inputContent.trim()) {
      onShowToast?.(
        'Chưa có nội dung',
        'Vui lòng nhập đoạn văn bản hoặc ý tưởng phân cảnh cần chuyển đổi.',
      );
      return;
    }

    setIsProcessing(true);
    try {
      const response = await convertToComicScript({
        mode: activeTab,
        inputContent,
        startingPageNumber: startingPage,
        targetPanelsPerPage: targetPanels,
        seriesBibleContext: attachBible ? seriesBibleContext : undefined,
      });

      setConvertedResult(response.scriptText);
      setPagesCount(response.pagesCount);
      setPanelsCount(response.panelsCount);
      setResultSource(response.source);
      setRangeFromPage(startingPage);
      setRangeToPage(Math.max(startingPage, startingPage + response.pagesCount - 1));

      onShowToast?.(
        'Phân đoạn thành công',
        `Đã tạo ${response.pagesCount} trang kịch bản (${response.panelsCount} panel) sẵn sàng nạp có kiểm soát.`,
      );
    } catch (err: any) {
      onShowToast?.('Lỗi xử lý', err.message || 'Không thể chuyển đổi văn bản.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = (mode: 'append' | 'insert' | 'replace') => {
    if (!convertedResult) return;
    if (mode === 'replace' && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }

    let scriptToApply = convertedResult;
    if (ingestionScope === 'range' && pagesCount > 1) {
      const filtered = filterScriptTextByPageRange(convertedResult, rangeFromPage, rangeToPage);
      if (!filtered.filteredText) {
        onShowToast?.(
          'Dải trang trống',
          `Không tìm thấy nội dung từ Trang ${rangeFromPage} đến ${rangeToPage}.`,
        );
        return;
      }
      scriptToApply = filtered.filteredText;
      onShowToast?.(
        'Đã nạp phân đoạn',
        `Chỉ nạp ${filtered.pagesCount} trang (${filtered.panelsCount} panel) vào Editor để giữ mượt hiệu năng.`,
      );
    }

    onApplyScript(scriptToApply, mode);
    onClose();
  };

  const previewBlocks = convertedResult
    ? parseScriptTextToBlocks(convertedResult, { startingPageNumber: startingPage })
    : [];

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150'>
      <div className='relative flex flex-col w-full max-w-5xl max-h-[92vh] bg-[#FAF8F5] border border-[#DCD5C6] rounded-2xl shadow-2xl overflow-hidden font-sans text-stone-900'>
        {/* HEADER */}
        <header className='flex items-center justify-between px-6 py-4 bg-[#F2EDE4] border-b border-[#E2DBD0] shrink-0'>
          <div className='flex items-center gap-3'>
            <div className='flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#C2410C] to-amber-600 text-white shadow-sm'>
              <Zap className='w-5 h-5' />
            </div>
            <div>
              <h2 className='text-base font-bold text-stone-900 flex items-center gap-2'>
                Smart Convert & AI Biên Kịch
                <span className='text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300'>
                  Auto-Format
                </span>
              </h2>
              <p className='text-xs text-stone-500'>
                Chuyển văn xuôi, trích đoạn tiểu thuyết hoặc ý tưởng prompt thành kịch bản
                Manga/Webtoon chuẩn hoá
              </p>
            </div>
          </div>

          <button
            type='button'
            onClick={onClose}
            className='p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition-all cursor-pointer'
          >
            <X className='w-5 h-5' />
          </button>
        </header>

        {/* BODY TABS & CONTENT */}
        <div className='flex-1 overflow-y-auto p-5 sm:p-6 space-y-4'>
          {/* TAB SELECTOR */}
          <div className='flex items-center gap-2 border-b border-[#E5E0D8] pb-3'>
            <button
              type='button'
              onClick={() => {
                setActiveTab('convert_raw_text');
                setConvertedResult(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'convert_raw_text'
                  ? 'bg-[#C2410C] text-white shadow-2xs'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <FileText className='w-3.5 h-3.5' />
              <span>1. Chuyển đổi văn bản thô (Paste & Convert)</span>
            </button>

            <button
              type='button'
              onClick={() => {
                setActiveTab('generate_from_prompt');
                setConvertedResult(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'generate_from_prompt'
                  ? 'bg-[#4F46E5] text-white shadow-2xs'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <Sparkles className='w-3.5 h-3.5' />
              <span>2. AI Viết phân cảnh từ ý tưởng</span>
            </button>
          </div>

          {/* TWO COLUMN WORKSPACE: INPUT & LIVE PREVIEW */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-5'>
            {/* CỘT TRÁI: INPUT & CẤU HÌNH */}
            <div className='flex flex-col space-y-3.5'>
              {/* Presets / Sample helper */}
              <div className='flex items-center justify-between text-xs'>
                <span className='font-semibold text-stone-700 flex items-center gap-1.5'>
                  {activeTab === 'convert_raw_text'
                    ? 'Nội dung văn xuôi thô:'
                    : 'Ý tưởng kịch bản cần phát triển:'}
                </span>

                <div className='flex items-center gap-2'>
                  {activeTab === 'convert_raw_text' && (
                    <>
                      <input
                        type='file'
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept='.txt,.md,.text'
                        className='hidden'
                      />
                      <button
                        type='button'
                        onClick={() => fileInputRef.current?.click()}
                        className='text-[11px] font-semibold text-stone-600 bg-white hover:bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-lg cursor-pointer flex items-center gap-1 transition-all'
                        title='Tải file kịch bản thô (.txt, .md) từ máy tính'
                      >
                        <Upload className='w-3 h-3 text-stone-500' />
                        Tải tệp thô (.txt/.md)
                      </button>

                      <button
                        type='button'
                        onClick={() => {
                          setInputContent(SAMPLE_NOVEL_PROSE);
                          setImportedFileName(null);
                        }}
                        className='text-[11px] font-semibold text-[#C2410C] hover:underline cursor-pointer flex items-center gap-1'
                      >
                        <RotateCcw className='w-3 h-3' />
                        Đoạn mẫu
                      </button>
                    </>
                  )}
                  {activeTab === 'generate_from_prompt' && (
                    <span className='text-[11px] text-stone-400'>
                      Chọn gợi ý bên dưới hoặc tự gõ
                    </span>
                  )}
                </div>
              </div>

              {importedFileName && (
                <div className='flex items-center justify-between px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 font-mono'>
                  <span>
                    📄 Đang sử dụng tệp: <strong>{importedFileName}</strong>
                  </span>
                  <button
                    type='button'
                    onClick={() => {
                      setInputContent('');
                      setImportedFileName(null);
                    }}
                    className='text-stone-400 hover:text-stone-700 ml-2'
                  >
                    <X className='w-3 h-3' />
                  </button>
                </div>
              )}

              {/* Textarea */}
              <div className='relative flex-1 min-h-[220px]'>
                <textarea
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                  placeholder={
                    activeTab === 'convert_raw_text'
                      ? 'Dán đoạn văn tiểu thuyết, bản thảo Word, hoặc tải tệp .txt/.md vào đây...'
                      : 'Mô tả ngắn gọn bối cảnh, hành động và mục tiêu của phân cảnh (Ví dụ: Minh và Lan rượt đuổi sát thủ dưới mưa rào...)'
                  }
                  className='w-full h-full min-h-[220px] p-3.5 bg-white border border-[#D5CEC2] rounded-xl text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#C2410C]/30 focus:border-[#C2410C] leading-relaxed resize-y font-sans shadow-2xs'
                />
              </div>

              {/* Quick Tags Toolbar for manual splitting */}
              <div className='flex items-center gap-1.5 text-[11px] text-stone-500 flex-wrap'>
                <span className='font-mono text-[10px] uppercase font-bold text-stone-400'>
                  Thẻ phân đoạn nhanh:
                </span>
                <button
                  type='button'
                  onClick={() => handleInsertTag(`! Trang ${startingPage}`)}
                  className='px-2 py-0.5 rounded bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 border border-stone-200 text-[10px] font-bold cursor-pointer transition-colors'
                >
                  + Ngắt Trang (!)
                </button>
                <button
                  type='button'
                  onClick={() => handleInsertTag(`" Panel 1.1: [Toàn cảnh]`)}
                  className='px-2 py-0.5 rounded bg-stone-100 hover:bg-indigo-100 text-stone-700 hover:text-indigo-900 border border-stone-200 text-[10px] font-bold cursor-pointer transition-colors'
                >
                  + Khung Panel (")
                </button>
                <button
                  type='button'
                  onClick={() => handleInsertTag(`@Minh: ""`)}
                  className='px-2 py-0.5 rounded bg-stone-100 hover:bg-emerald-100 text-stone-700 hover:text-emerald-900 border border-stone-200 text-[10px] font-bold cursor-pointer transition-colors'
                >
                  + Thoại (@)
                </button>
              </div>

              {/* Prompt Suggestions (khi ở Tab 2) */}
              {activeTab === 'generate_from_prompt' && (
                <div className='space-y-1.5'>
                  <div className='text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1'>
                    <Lightbulb className='w-3 h-3 text-amber-500' />
                    Gợi ý mẫu phân cảnh:
                  </div>
                  <div className='flex flex-wrap gap-1.5'>
                    {PROMPT_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type='button'
                        onClick={() => setInputContent(preset)}
                        className='text-[11px] text-stone-600 bg-white hover:bg-amber-50 hover:text-amber-900 border border-stone-200 hover:border-amber-300 px-2.5 py-1 rounded-lg transition-all text-left cursor-pointer'
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* OPTIONS BAR */}
              <div className='bg-[#F2EDE4]/70 border border-[#E0D8CB] rounded-xl p-3 space-y-2.5 text-xs'>
                <div className='font-bold text-stone-700 flex items-center gap-1.5 text-[11px] uppercase tracking-wide'>
                  <Settings className='w-3.5 h-3.5 text-stone-500' />
                  Tuỳ chọn cấu trúc kịch bản
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-[11px] font-semibold text-stone-600 mb-1'>
                      Bắt đầu từ Trang số:
                    </label>
                    <input
                      type='number'
                      min={1}
                      value={startingPage}
                      onChange={(e) => setStartingPage(Math.max(1, parseInt(e.target.value) || 1))}
                      className='w-full px-2.5 py-1.5 bg-white border border-[#D5CEC2] rounded-lg text-xs font-bold text-[#C2410C] focus:outline-none focus:border-[#C2410C]'
                    />
                  </div>

                  <div>
                    <label className='block text-[11px] font-semibold text-stone-600 mb-1'>
                      Khung hình / Trang:
                    </label>
                    <select
                      value={targetPanels}
                      onChange={(e) => setTargetPanels(parseInt(e.target.value, 10))}
                      className='w-full px-2.5 py-1.5 bg-white border border-[#D5CEC2] rounded-lg text-xs font-semibold text-stone-800 focus:outline-none focus:border-[#C2410C] cursor-pointer'
                    >
                      <option value={3}>3 Panel / Trang (Nhịp chậm / Tĩnh)</option>
                      <option value={4}>4 Panel / Trang (Tiêu chuẩn Webtoon)</option>
                      <option value={5}>5 Panel / Trang (Tiêu chuẩn Manga)</option>
                      <option value={6}>6 Panel / Trang (Hành động dồn dập)</option>
                    </select>
                  </div>
                </div>

                {/* Series Bible Toggle */}
                <div className='flex items-center justify-between pt-1 border-t border-stone-200/60'>
                  <div className='flex items-center gap-2'>
                    <Bookmark className='w-3.5 h-3.5 text-indigo-600' />
                    <div>
                      <span className='font-semibold text-stone-800 text-[11px]'>
                        Đính kèm Series Bible
                      </span>
                      <p className='text-[10px] text-stone-500'>
                        {seriesBibleContext?.characters?.length || 0} nhân vật khả dụng để tự gán
                        @Tag
                      </p>
                    </div>
                  </div>
                  <input
                    type='checkbox'
                    checked={attachBible}
                    onChange={(e) => setAttachBible(e.target.checked)}
                    className='w-4 h-4 accent-[#C2410C] cursor-pointer rounded'
                  />
                </div>
              </div>

              {/* Action Button: Run Convert */}
              <button
                type='button'
                disabled={isProcessing || !inputContent.trim()}
                onClick={handleConvert}
                className='flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#C2410C] to-amber-700 hover:from-[#9A3412] hover:to-amber-800 shadow-sm transition-all disabled:opacity-40 cursor-pointer'
              >
                {isProcessing ? (
                  <>
                    <Cpu className='w-4 h-4 animate-spin' />
                    <span>Đang phân tích cấu trúc Manga...</span>
                  </>
                ) : (
                  <>
                    <Zap className='w-4 h-4' />
                    <span>⚡ Phân tích & Tạo Kịch bản Chuẩn hoá</span>
                  </>
                )}
              </button>
            </div>

            {/* CỘT PHẢI: LIVE VISUAL PREVIEW & RAW EDIT */}
            <div className='flex flex-col bg-white border border-[#D5CEC2] rounded-xl overflow-hidden shadow-2xs'>
              {/* Preview Header */}
              <div className='flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-[#F9F7F3] border-b border-[#E8E2D6] text-xs'>
                <div className='flex items-center gap-2'>
                  <div className='flex items-center bg-stone-200/80 p-0.5 rounded-lg border border-stone-300'>
                    <button
                      type='button'
                      onClick={() => setPreviewMode('visual')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                        previewMode === 'visual'
                          ? 'bg-white text-stone-900 shadow-2xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <Layers className='w-3 h-3 text-indigo-600' />
                      Visual Blocks
                    </button>
                    <button
                      type='button'
                      onClick={() => setPreviewMode('raw_editor')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                        previewMode === 'raw_editor'
                          ? 'bg-white text-stone-900 shadow-2xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <Code2 className='w-3 h-3 text-[#C2410C]' />
                      Mã thô (Editable)
                    </button>
                  </div>
                </div>

                {convertedResult && (
                  <div className='flex items-center gap-2 text-[10px] font-mono'>
                    <span className='bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold'>
                      {pagesCount} Trang
                    </span>
                    <span className='bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded font-bold'>
                      {panelsCount} Panel
                    </span>
                    <span className='text-gray-400 hidden sm:inline'>
                      ({resultSource === 'gemini' ? 'Gemini AI' : 'Smart Heuristic'})
                    </span>
                  </div>
                )}
              </div>

              {/* Preview Content Pane */}
              <div className='flex-1 p-4 overflow-y-auto max-h-[380px] space-y-2.5 font-mono text-xs select-text'>
                {!convertedResult ? (
                  <div className='flex flex-col items-center justify-center h-full min-h-[220px] text-stone-400 space-y-2 text-center p-4'>
                    <Sparkles className='w-8 h-8 text-stone-300' />
                    <p className='text-xs font-medium'>Chưa có kịch bản chuyển đổi</p>
                    <p className='text-[11px] text-stone-400 max-w-xs'>
                      Nhập nội dung ở cột bên trái và bấm nút "Phân tích & Tạo kịch bản" để xem kết
                      quả tại đây.
                    </p>
                  </div>
                ) : previewMode === 'raw_editor' ? (
                  <div className='flex flex-col h-full min-h-[300px] space-y-2 font-sans'>
                    <div className='flex items-center justify-between text-[11px] text-stone-500'>
                      <span className='flex items-center gap-1 font-semibold text-stone-700'>
                        <Info className='w-3.5 h-3.5 text-amber-600' />
                        Chỉnh sửa điểm ngắt trang (!) và panel (") trước khi nạp vào Editor:
                      </span>
                      <button
                        type='button'
                        onClick={() => {
                          navigator.clipboard.writeText(convertedResult);
                          onShowToast?.(
                            'Đã sao chép',
                            'Đã copy toàn bộ kịch bản thô vào Clipboard.',
                          );
                        }}
                        className='flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:underline cursor-pointer font-sans'
                      >
                        <Copy className='w-3 h-3' />
                        Sao chép mã
                      </button>
                    </div>
                    <textarea
                      value={convertedResult}
                      onChange={(e) => handleRawScriptChange(e.target.value)}
                      className='w-full h-full min-h-[290px] p-3 bg-stone-900 text-amber-200 border border-stone-800 rounded-lg font-mono text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-amber-500 resize-y'
                      placeholder='! Trang 01&#10;" Panel 1.1: [Toàn cảnh]&#10;@Minh: "Lời thoại..."'
                    />
                  </div>
                ) : (
                  previewBlocks.map((b, idx) => {
                    if (b.type === 'page') {
                      return (
                        <div
                          key={idx}
                          className='font-bold uppercase tracking-wider text-xs text-[#C2410C] bg-[#FFF2E6] border-2 border-[#C2410C] px-3 py-1.5 rounded-lg shadow-2xs flex items-center gap-2 mt-3'
                        >
                          <span className='w-4 h-4 rounded-full bg-[#C2410C] text-white flex items-center justify-center text-[10px] font-black'>
                            !
                          </span>
                          <span>Trang {b.pageNumber}</span>
                        </div>
                      );
                    }

                    if (b.type === 'panel') {
                      return (
                        <div
                          key={idx}
                          className='font-bold text-xs text-slate-800 bg-[#F8FAFC] border-l-4 border-[#4F46E5] px-3 py-1.5 rounded-r-lg shadow-2xs mt-2'
                        >
                          " Panel {b.panelNumber}: [{b.cameraAngle || 'Toàn cảnh'}]
                        </div>
                      );
                    }

                    if (b.type === 'dialogue') {
                      return (
                        <div
                          key={idx}
                          className='italic text-[#0F172A] text-xs ml-4 pl-3 border-l-2 border-indigo-200 my-1 font-sans'
                        >
                          <span className='font-bold text-[#4338CA] not-italic bg-indigo-50 px-1.5 py-0.5 rounded text-[10px] mr-1 border border-indigo-200'>
                            @{b.character}
                          </span>
                          : "{b.content}"
                        </div>
                      );
                    }

                    if (b.type === 'sfx') {
                      return (
                        <div
                          key={idx}
                          className='text-[11px] px-2 py-0.5 rounded border border-amber-300 bg-[#FFFBEB] text-amber-950 inline-flex items-center gap-1 font-mono font-bold my-1'
                        >
                          ⚡ SFX: {b.content}
                        </div>
                      );
                    }

                    if (b.type === 'caption') {
                      return (
                        <div
                          key={idx}
                          className='text-stone-700 text-[11px] border-l-2 border-slate-300 pl-2.5 my-1 italic font-sans'
                        >
                          Caption: {b.content}
                        </div>
                      );
                    }

                    return (
                      <p
                        key={idx}
                        className='text-stone-600 text-[11px] ml-2 leading-relaxed my-1 font-mono'
                      >
                        {b.content}
                      </p>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <footer className='flex flex-col gap-3 px-6 py-3.5 bg-[#F2EDE4] border-t border-[#E2DBD0] shrink-0'>
          {/* Staged Ingestion Guard: Phân đoạn nạp kịch bản lớn */}
          {convertedResult && pagesCount > 1 && (
            <div className='flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-white/90 border border-stone-200 rounded-xl text-xs'>
              <div className='flex flex-wrap items-center gap-3'>
                <span className='font-bold text-stone-700 flex items-center gap-1.5'>
                  <SlidersHorizontal className='w-3.5 h-3.5 text-[#C2410C]' />
                  Kiểm soát nạp (Tránh nghẽn DOM):
                </span>
                <label className='flex items-center gap-1.5 text-stone-700 cursor-pointer text-xs'>
                  <input
                    type='radio'
                    name='ingestionScope'
                    checked={ingestionScope === 'all'}
                    onChange={() => setIngestionScope('all')}
                    className='accent-[#C2410C]'
                  />
                  <span>Tất cả ({pagesCount} trang)</span>
                </label>
                <label className='flex items-center gap-1.5 text-stone-700 cursor-pointer text-xs'>
                  <input
                    type='radio'
                    name='ingestionScope'
                    checked={ingestionScope === 'range'}
                    onChange={() => setIngestionScope('range')}
                    className='accent-[#C2410C]'
                  />
                  <span>Phân đoạn: Từ trang</span>
                  <input
                    type='number'
                    min={startingPage}
                    max={rangeToPage}
                    value={rangeFromPage}
                    disabled={ingestionScope !== 'range'}
                    onChange={(e) =>
                      setRangeFromPage(
                        Math.max(startingPage, parseInt(e.target.value) || startingPage),
                      )
                    }
                    className='w-12 px-1.5 py-0.5 bg-white border border-stone-300 rounded text-center font-bold text-[#C2410C] text-xs disabled:opacity-40'
                  />
                  <span>đến</span>
                  <input
                    type='number'
                    min={rangeFromPage}
                    max={startingPage + pagesCount - 1}
                    value={rangeToPage}
                    disabled={ingestionScope !== 'range'}
                    onChange={(e) =>
                      setRangeToPage(
                        Math.min(
                          startingPage + pagesCount - 1,
                          parseInt(e.target.value) || startingPage,
                        ),
                      )
                    }
                    className='w-12 px-1.5 py-0.5 bg-white border border-stone-300 rounded text-center font-bold text-[#C2410C] text-xs disabled:opacity-40'
                  />
                </label>
              </div>

              {ingestionScope === 'range' && (
                <div className='text-[11px] font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200'>
                  ⚡ Đã chọn: {Math.max(0, rangeToPage - rangeFromPage + 1)} trang (Giữ Editor mượt
                  mà 60 FPS)
                </div>
              )}
            </div>
          )}

          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='text-xs text-stone-500 font-medium'>
              {convertedResult ? (
                <span className='text-emerald-700 font-semibold flex items-center gap-1'>
                  <Check className='w-4 h-4 text-emerald-600' />
                  Đã sẵn sàng chèn vào Editor ({pagesCount} Trang, {panelsCount} Panel)
                </span>
              ) : (
                <span>Vui lòng chuyển đổi trước khi áp dụng vào trình soạn thảo</span>
              )}
            </div>

            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={onClose}
                className='px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-600 bg-white hover:bg-stone-100 border border-stone-300 transition-all cursor-pointer'
              >
                Đóng
              </button>

              {/* Chèn vào cuối kịch bản */}
              <button
                type='button'
                disabled={!convertedResult}
                onClick={() => handleApply('append')}
                className='px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 shadow-2xs transition-all disabled:opacity-40 cursor-pointer'
                title='Thêm các trang kịch bản mới này vào cuối tài liệu hiện tại'
              >
                + Chèn vào cuối
              </button>

              {/* Chèn tại vị trí con trỏ */}
              <button
                type='button'
                disabled={!convertedResult}
                onClick={() => handleApply('insert')}
                className='px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#C2410C] hover:bg-[#9A3412] shadow-2xs transition-all disabled:opacity-40 cursor-pointer'
                title='Chèn ngay tại vị trí con trỏ hiện tại của kịch bản'
              >
                ↳ Chèn tại con trỏ
              </button>

              {/* Ghi đè toàn bộ kịch bản */}
              <button
                type='button'
                disabled={!convertedResult}
                onClick={() => handleApply('replace')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  confirmReplace
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-300'
                } disabled:opacity-40`}
                title='Thay thế toàn bộ văn bản kịch bản hiện tại'
              >
                {confirmReplace ? 'Xác nhận Ghi đè toàn bộ?' : 'Ghi đè tất cả'}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
