// src/roles/writer/components/script/flow/converter/ScriptImportModal.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { JSONContent } from '@tiptap/core';
import {
  FileText,
  Upload,
  Sparkles,
  RotateCcw,
  Check,
  AlertTriangle,
  Lightbulb,
  FileCode,
  LayoutGrid,
  Layers,
  SlidersHorizontal,
} from 'lucide-react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { SeriesBibleContext } from './types';
import {
  parseScriptTextToBlocks,
  convertBlocksToEditorNodes,
  ParsedScriptBlock,
} from './scriptConverterAdapter';
import { convertRawTextHeuristically } from './regexScriptParser';

export interface ScriptImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyScript: (nodes: JSONContent[], mode: 'append' | 'insert' | 'replace') => void;
  initialStartingPageNumber?: number;
  seriesBibleContext?: SeriesBibleContext;
  characters?: { id: string; name: string; code?: string | null }[];
  onShowToast?: (title: string, desc: string) => void;
}

const SAMPLE_NOVEL_PROSE = `Đêm đã về khuya, những hạt mưa phùn lạnh buốt bắt đầu trút xuống ngã tư Shibuya. Dưới ánh đèn neon chập chờn, Minh kéo sụp chiếc mũ lưỡi trai để che đi vết thương trên trán.
"Chúng ta phải rời khỏi đây ngay lập tức!" - Minh quay sang giục Lan, ánh mắt không ngừng liếc nhìn con hẻm tối phía sau.
Lan siết chặt chiếc cặp tài liệu trong tay, thở dốc: "Nhưng còn bản thiết kế... nếu bọn chúng lấy được thì sao?"
Bỗng nhiên, một tiếng nổ chói tai vang lên từ tầng thượng tòa nhà đối diện! (BÙM!)
Khói đen bốc lên cuồn cuộn. Một bóng đen bí ẩn từ từ bước ra khỏi làn khói với lưỡi kiếm sáng loáng.`;

const SAMPLE_COMIC_SCRIPT = `! Trang 01
" Panel 1.1: [Toàn cảnh]
Mưa phùn trút xuống ngã tư Shibuya rực rỡ ánh đèn neon.
Minh kéo sụp chiếc mũ lưỡi trai che đi vết thương trên trán.
@Minh: "Chúng ta phải rời khỏi đây ngay lập tức!"

" Panel 1.2: [Cận cảnh]
Lan ôm chặt chiếc cặp tài liệu trước ngực, ánh mắt đầy căng thẳng.
@Lan: "Nhưng còn bản thiết kế... nếu bọn chúng đoạt được thì sao?"

" Panel 1.3: [Góc cao]
Tòa nhà đối diện bốc cháy dữ dội sau tiếng nổ lớn.
SFX: BÙM!
Caption: Mọi lối thoát dường như đã bị chặn đứng.`;

export const ScriptImportModal: React.FC<ScriptImportModalProps> = ({
  isOpen,
  onClose,
  onApplyScript,
  initialStartingPageNumber = 1,
  seriesBibleContext,
  characters,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'file'>('paste');
  const [inputContent, setInputContent] = useState('');
  const [startingPage, setStartingPage] = useState<number>(initialStartingPageNumber);
  const [targetPanels, setTargetPanels] = useState<number>(4);
  const [autoConvertProse, setAutoConvertProse] = useState<boolean>(true);
  const [previewTab, setPreviewTab] = useState<'visual' | 'text'>('visual');
  const [confirmReplace, setConfirmReplace] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStartingPage(initialStartingPageNumber);
      setConfirmReplace(false);
    }
  }, [isOpen, initialStartingPageNumber]);

  // Phân tích văn bản thô theo thời gian thực (Live Parser)
  const parsedResult = useMemo(() => {
    const trimmed = inputContent.trim();
    if (!trimmed) {
      return {
        formattedScript: '',
        blocks: [] as ParsedScriptBlock[],
        pagesCount: 0,
        panelsCount: 0,
        dialoguesCount: 0,
        sfxCount: 0,
        editorNodes: [] as JSONContent[],
      };
    }

    // Kiểm tra xem văn bản đã có cấu trúc Trang/Panel rõ ràng chưa
    const hasExplicitMarkers =
      /^(?:[!#📄]?\s*(?:Trang|Page)\s*\d+|(?:[-"”]\s*)?(?:Panel|Khung)\s*[\d.]+)/im.test(trimmed);

    let bibleCtx = seriesBibleContext;
    if (!bibleCtx && characters && characters.length > 0) {
      bibleCtx = {
        characters: characters.map((c) => ({ name: c.name })),
      };
    }

    let scriptText = trimmed;
    // Nếu là văn xuôi tự nhiên và người dùng bật tự động chia khung/trang từ văn xuôi
    if (!hasExplicitMarkers && autoConvertProse) {
      const converted = convertRawTextHeuristically({
        mode: 'convert_raw_text',
        inputContent: trimmed,
        startingPageNumber: startingPage,
        targetPanelsPerPage: targetPanels,
        seriesBibleContext: bibleCtx,
      });
      scriptText = converted.scriptText;
    }

    const blocks = parseScriptTextToBlocks(scriptText, {
      startingPageNumber: startingPage,
      targetPanelsPerPage: targetPanels,
      characters,
    });

    const pagesCount = blocks.filter((b) => b.type === 'page').length || (blocks.length > 0 ? 1 : 0);
    const panelsCount = blocks.filter((b) => b.type === 'panel').length;
    const dialoguesCount = blocks.filter((b) => b.type === 'dialogue').length;
    const sfxCount = blocks.filter((b) => b.type === 'sfx').length;

    const editorNodes = convertBlocksToEditorNodes(blocks, {
      startingPageNumber: startingPage,
      targetPanelsPerPage: targetPanels,
      characters,
    });

    return {
      formattedScript: scriptText,
      blocks,
      pagesCount,
      panelsCount,
      dialoguesCount,
      sfxCount,
      editorNodes,
    };
  }, [inputContent, startingPage, targetPanels, autoConvertProse, seriesBibleContext, characters]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setInputContent(text);
        setFileName(file.name);
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

  const handleApply = (mode: 'append' | 'insert' | 'replace') => {
    if (parsedResult.editorNodes.length === 0) return;

    if (mode === 'replace' && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }

    onApplyScript(parsedResult.editorNodes, mode);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeLabel='Đóng'
      title={
        <div className='flex items-center gap-2.5'>
          <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100 text-orange-700'>
            <FileText className='w-4 h-4' />
          </div>
          <div>
            <h2 className='text-base font-bold text-stone-900'>Nhập văn bản thô vào kịch bản</h2>
            <p className='text-xs text-stone-500 font-normal'>
              Tự động phân tích văn xuôi, tiểu thuyết hoặc bản thảo thô thành định dạng kịch bản chuẩn
            </p>
          </div>
        </div>
      }
      size='xl'
      footer={
        <div className='flex flex-wrap items-center justify-between w-full gap-3'>
          <div className='text-xs text-stone-600 flex items-center gap-2'>
            {parsedResult.pagesCount > 0 ? (
              <span className='inline-flex items-center gap-1.5 font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200'>
                <Check className='w-3.5 h-3.5 text-emerald-600' />
                Sẵn sàng chèn {parsedResult.pagesCount} trang · {parsedResult.panelsCount} khung · {parsedResult.dialoguesCount} câu thoại
              </span>
            ) : (
              <span className='text-stone-400'>Dán văn bản hoặc tải tệp để xem trước kịch bản phân tích</span>
            )}
          </div>

          <div className='flex items-center gap-2'>
            <Button variant='secondary' size='sm' onClick={onClose}>
              Đóng
            </Button>

            <Button
              variant='secondary'
              size='sm'
              disabled={parsedResult.editorNodes.length === 0}
              onClick={() => handleApply('append')}
              title='Thêm các trang kịch bản mới này vào cuối tài liệu hiện tại'
            >
              + Chèn vào cuối
            </Button>

            <Button
              variant='primary'
              size='sm'
              disabled={parsedResult.editorNodes.length === 0}
              onClick={() => handleApply('insert')}
              title='Chèn ngay tại vị trí con trỏ hiện tại trong trình soạn thảo'
            >
              ↳ Chèn tại con trỏ
            </Button>

            <Button
              variant='danger'
              size='sm'
              disabled={parsedResult.editorNodes.length === 0}
              onClick={() => handleApply('replace')}
              title='Thay thế toàn bộ nội dung kịch bản hiện tại'
              className={confirmReplace ? 'animate-pulse' : ''}
            >
              {confirmReplace ? 'Xác nhận ghi đè tất cả?' : 'Ghi đè tất cả'}
            </Button>
          </div>
        </div>
      }
    >
      <div className='space-y-4'>
        {/* Thanh công cụ cấu hình phân tích */}
        <div className='flex flex-wrap items-center justify-between gap-3 p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs'>
          <div className='flex items-center gap-4 flex-wrap'>
            <label className='flex items-center gap-1.5 font-medium text-stone-700 cursor-pointer'>
              <span>Trang bắt đầu:</span>
              <input
                type='number'
                min={1}
                value={startingPage}
                onChange={(e) => setStartingPage(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className='w-14 px-2 py-1 bg-white border border-stone-300 rounded text-center font-bold text-stone-800 focus:outline-none focus:border-orange-500'
              />
            </label>

            <label className='flex items-center gap-1.5 font-medium text-stone-700 cursor-pointer'>
              <span>Số khung / trang:</span>
              <input
                type='number'
                min={2}
                max={8}
                value={targetPanels}
                onChange={(e) => setTargetPanels(Math.max(2, Math.min(8, parseInt(e.target.value, 10) || 4)))}
                className='w-14 px-2 py-1 bg-white border border-stone-300 rounded text-center font-bold text-stone-800 focus:outline-none focus:border-orange-500'
              />
            </label>

            <label className='flex items-center gap-1.5 text-stone-700 cursor-pointer'>
              <input
                type='checkbox'
                checked={autoConvertProse}
                onChange={(e) => setAutoConvertProse(e.target.checked)}
                className='rounded border-stone-300 text-orange-600 focus:ring-orange-500'
              />
              <span className='font-medium'>Tự động phân nhịp văn xuôi thành Khung hình</span>
            </label>
          </div>

          {/* Quick presets */}
          <div className='flex items-center gap-1.5'>
            <button
              type='button'
              onClick={() => setInputContent(SAMPLE_NOVEL_PROSE)}
              className='inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded hover:bg-stone-100 transition-colors cursor-pointer'
              title='Nạp trích đoạn tiểu thuyết có thoại và hành động'
            >
              <Lightbulb className='w-3 h-3 text-amber-500' />
              <span>Mẫu văn xuôi</span>
            </button>
            <button
              type='button'
              onClick={() => setInputContent(SAMPLE_COMIC_SCRIPT)}
              className='inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded hover:bg-stone-100 transition-colors cursor-pointer'
              title='Nạp kịch bản truyện tranh mẫu'
            >
              <FileCode className='w-3 h-3 text-blue-500' />
              <span>Mẫu kịch bản</span>
            </button>
            {inputContent && (
              <button
                type='button'
                onClick={() => {
                  setInputContent('');
                  setFileName(null);
                }}
                className='p-1 text-stone-400 hover:text-stone-700 transition-colors'
                title='Xóa nội dung'
              >
                <RotateCcw className='w-3.5 h-3.5' />
              </button>
            )}
          </div>
        </div>

        {/* Khu vực 2 cột: Nhập liệu bên trái & Xem trước bên phải */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          {/* CỘT TRÁI: Ô NHẬP LIỆU */}
          <div className='flex flex-col space-y-2'>
            <div className='flex items-center justify-between border-b border-stone-200 pb-2'>
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={() => setActiveTab('paste')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                    activeTab === 'paste'
                      ? 'bg-stone-800 text-white'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Dán văn bản
                </button>
                <button
                  type='button'
                  onClick={() => {
                    setActiveTab('file');
                    fileInputRef.current?.click();
                  }}
                  className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                    activeTab === 'file'
                      ? 'bg-stone-800 text-white'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <Upload className='w-3 h-3' />
                  <span>Tải tệp tin</span>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type='file'
                accept='.txt,.md,.fountain'
                className='hidden'
                onChange={handleFileUpload}
              />
              {fileName && (
                <span className='text-[11px] text-stone-500 truncate max-w-[180px]'>
                  Tệp: <strong className='text-stone-700'>{fileName}</strong>
                </span>
              )}
            </div>

            <textarea
              value={inputContent}
              onChange={(e) => {
                setInputContent(e.target.value);
                setConfirmReplace(false);
              }}
              placeholder={`Dán văn bản thô vào đây (trích đoạn tiểu thuyết, bản thảo, kịch bản thô)...\n\nVí dụ:\nĐêm đã về khuya. Minh nhìn ra ngoài cửa sổ.\n"Chúng ta phải đi thôi!" - Minh nói.\nBỗng nhiên một tiếng nổ lớn vang lên! (BÙM!)\n\nHoặc định dạng kịch bản chuẩn:\n! Trang 01\n" Panel 1.1: [Toàn cảnh]\n@Minh: "Đi thôi!"\nSFX: BÙM!`}
              className='w-full h-80 p-3 bg-white border border-stone-300 rounded-lg font-mono text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 resize-none leading-relaxed'
            />

            <div className='flex items-center justify-between text-[11px] text-stone-400 px-1'>
              <span>{inputContent ? `${inputContent.length} ký tự · ${inputContent.split(/\r?\n/).length} dòng` : 'Chưa có nội dung'}</span>
              <span>Hỗ trợ: .txt, .md, .fountain</span>
            </div>
          </div>

          {/* CỘT PHẢI: XEM TRƯỚC (LIVE PREVIEW) */}
          <div className='flex flex-col space-y-2'>
            <div className='flex items-center justify-between border-b border-stone-200 pb-2'>
              <div className='flex items-center gap-1.5'>
                <span className='text-xs font-bold text-stone-700'>Xem trước kết quả parse</span>
                {parsedResult.pagesCount > 0 && (
                  <div className='flex items-center gap-1 ml-1'>
                    <span className='px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800'>
                      {parsedResult.pagesCount} Trang
                    </span>
                    <span className='px-1.5 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700'>
                      {parsedResult.panelsCount} Khung
                    </span>
                    <span className='px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800'>
                      {parsedResult.dialoguesCount} Thoại
                    </span>
                    {parsedResult.sfxCount > 0 && (
                      <span className='px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800'>
                        {parsedResult.sfxCount} SFX
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className='flex items-center gap-1'>
                <button
                  type='button'
                  onClick={() => setPreviewTab('visual')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    previewTab === 'visual'
                      ? 'bg-stone-200 text-stone-800 font-bold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                  title='Xem trước dạng thẻ phân cảnh'
                >
                  Trực quan
                </button>
                <button
                  type='button'
                  onClick={() => setPreviewTab('text')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    previewTab === 'text'
                      ? 'bg-stone-200 text-stone-800 font-bold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                  title='Xem trước dạng mã kịch bản chuẩn'
                >
                  Kịch bản
                </button>
              </div>
            </div>

            {/* Nội dung Preview */}
            <div className='h-80 overflow-y-auto p-3 bg-stone-50 border border-stone-200 rounded-lg'>
              {parsedResult.blocks.length === 0 ? (
                <div className='h-full flex flex-col items-center justify-center text-stone-400 text-xs space-y-2'>
                  <FileText className='w-8 h-8 text-stone-300 stroke-1' />
                  <p>Kết quả phân tích phân cảnh sẽ hiển thị tại đây.</p>
                </div>
              ) : previewTab === 'visual' ? (
                <div className='space-y-3'>
                  {parsedResult.blocks.map((block, idx) => {
                    if (block.type === 'page') {
                      return (
                        <div
                          key={idx}
                          className='px-2.5 py-1 bg-stone-800 text-white text-xs font-bold rounded flex items-center justify-between tracking-wide'
                        >
                          <span>TRANG {block.pageNumber || '01'}</span>
                          <span className='text-[10px] text-stone-400 font-normal'>Ngắt trang truyện</span>
                        </div>
                      );
                    }

                    if (block.type === 'panel') {
                      return (
                        <div
                          key={idx}
                          className='p-2 bg-orange-50/80 border-l-4 border-orange-500 rounded-r text-xs flex items-center justify-between'
                        >
                          <span className='font-bold text-orange-900'>
                            Khung {block.panelNumber || '1.1'}
                            {block.cameraAngle && (
                              <span className='ml-2 font-semibold text-orange-700 bg-orange-100/70 px-1.5 py-0.5 rounded text-[10px]'>
                                {block.cameraAngle}
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    }

                    if (block.type === 'dialogue') {
                      return (
                        <div
                          key={idx}
                          className='ml-4 p-2 bg-white border border-stone-200 rounded-lg text-xs space-y-0.5 shadow-2xs'
                        >
                          <div className='text-[11px] font-bold text-stone-900 uppercase tracking-wide flex items-center gap-1.5'>
                            <span className='w-1.5 h-1.5 rounded-full bg-blue-600' />
                            <span>{block.character || 'Nhân vật'}</span>
                          </div>
                          <p className='text-stone-800 italic pl-3'>"{block.content}"</p>
                        </div>
                      );
                    }

                    if (block.type === 'sfx') {
                      return (
                        <div
                          key={idx}
                          className='ml-4 px-2.5 py-1 bg-amber-50 border border-amber-300 rounded text-xs font-bold text-amber-900 tracking-wider'
                        >
                          SFX: {block.content}
                        </div>
                      );
                    }

                    if (block.type === 'caption') {
                      return (
                        <div
                          key={idx}
                          className='ml-4 p-2 bg-stone-100 border border-stone-300 rounded text-xs text-stone-700 italic'
                        >
                          <strong className='not-italic font-bold text-stone-800'>Dẫn chuyện:</strong> {block.content}
                        </div>
                      );
                    }

                    return (
                      <div key={idx} className='ml-4 text-xs text-stone-600 pl-2 border-l border-stone-300 leading-relaxed'>
                        {block.content}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <pre className='font-mono text-xs text-stone-800 whitespace-pre-wrap leading-relaxed'>
                  {parsedResult.formattedScript}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
