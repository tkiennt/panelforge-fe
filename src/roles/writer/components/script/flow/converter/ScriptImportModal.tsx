// src/roles/writer/components/script/flow/converter/ScriptImportModal.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { JSONContent } from '@tiptap/core';
import {
  BookOpenText,
  CornerDownLeft,
  FileText,
  Gauge,
  Upload,
  RotateCcw,
  Check,
  Lightbulb,
  FileCode,
  LayoutGrid,
  Layers,
  MessageCircle,
  Plus,
  Replace,
  SlidersHorizontal,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Card, CardBody, CardHeader } from '@/shared/ui/Surface';
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

const SAMPLE_ENGLISH_SCRIPT = `Page 1
Panel 1: [Wide shot]
Location: Neon-lit alleyway, Downtown Tokyo - Midnight.
Rain pours over the empty street. Arthur steps out of the shadow, his trench coat soaked.
NARRATOR: "In a city that never sleeps, some secrets are best left buried."

Panel 2: [Close-up]
Arthur inspects the ancient brass cylinder in his hand.
ARTHUR: "It's still intact."
ARTHUR (THINKING): "They have no idea what they unleashed."

Panel 3: [High angle]
Suddenly, glass shatters from the rooftop above!
SFX: CRASH!
LANCELOT: "Hand it over, Arthur! There is nowhere left to run!"`;

export const ScriptImportModal: React.FC<ScriptImportModalProps> = ({
  isOpen,
  onClose,
  onApplyScript,
  initialStartingPageNumber = 1,
  seriesBibleContext,
  characters,
  onShowToast,
}) => {
  const { t } = useTranslation('writer');
  const [activeTab, setActiveTab] = useState<'paste' | 'file'>('paste');
  const [inputContent, setInputContent] = useState('');
  const [startingPage, setStartingPage] = useState<number>(initialStartingPageNumber);
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
    if (!hasExplicitMarkers) {
      const converted = convertRawTextHeuristically({
        mode: 'convert_raw_text',
        inputContent: trimmed,
        startingPageNumber: startingPage,
        seriesBibleContext: bibleCtx,
      });
      scriptText = converted.scriptText;
    }

    const blocks = parseScriptTextToBlocks(scriptText, {
      startingPageNumber: startingPage,
      characters,
    });

    const pagesCount = blocks.filter((b) => b.type === 'page').length || (blocks.length > 0 ? 1 : 0);
    const panelsCount = blocks.filter((b) => b.type === 'panel').length;
    const dialoguesCount = blocks.filter((b) => b.type === 'dialogue').length;
    const sfxCount = blocks.filter((b) => b.type === 'sfx').length;

    const editorNodes = convertBlocksToEditorNodes(blocks, {
      startingPageNumber: startingPage,
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
  }, [inputContent, startingPage, seriesBibleContext, characters]);

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
          t('scriptImport.fileLoadedTitle'),
          t('scriptImport.fileLoadedDesc', {
            name: file.name,
            size: (file.size / 1024).toFixed(1),
          }),
        );
      }
    };
    reader.onerror = () => {
      onShowToast?.(t('scriptImport.fileErrorTitle'), t('scriptImport.fileErrorDesc'));
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
      closeLabel={t('scriptImport.close')}
      title={
        <span className='flex items-center gap-2.5'>
          <span className='grid size-8 shrink-0 place-items-center rounded-lg bg-orange-100 text-orange-700'>
            <FileText className='size-4' aria-hidden='true' />
          </span>
          <span>{t('scriptImport.title')}</span>
        </span>
      }
      description={t('scriptImport.description')}
      size='xl'
      className='max-w-[min(1180px,calc(100vw-32px))]'
      footer={
        <div className='flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <div className='flex min-w-0 items-center gap-2 text-xs text-stone-600' aria-live='polite'>
            {parsedResult.pagesCount > 0 ? (
              <Badge tone={confirmReplace ? 'warning' : 'success'} icon={confirmReplace ? <Replace /> : <Check />}>
                {confirmReplace
                  ? t('scriptImport.replaceWarning')
                  : t('scriptImport.readySummary', {
                      pages: parsedResult.pagesCount,
                      panels: parsedResult.panelsCount,
                      dialogues: parsedResult.dialoguesCount,
                    })}
              </Badge>
            ) : (
              <span className='text-stone-500'>{t('scriptImport.emptyFooter')}</span>
            )}
          </div>

          <div className='flex flex-wrap items-center justify-end gap-2'>
            <Button variant='secondary' size='sm' onClick={onClose}>
              {t('scriptImport.close')}
            </Button>

            <Button
              variant='danger'
              size='sm'
              disabled={parsedResult.editorNodes.length === 0}
              onClick={() => handleApply('replace')}
              title={t('scriptImport.replaceTitle')}
              className='min-w-32'
              leadingIcon={<Replace aria-hidden='true' />}
            >
              {confirmReplace ? t('scriptImport.confirmReplace') : t('scriptImport.replaceAll')}
            </Button>

            <Button
              variant='secondary'
              size='sm'
              disabled={parsedResult.editorNodes.length === 0}
              onClick={() => handleApply('append')}
              title={t('scriptImport.appendTitle')}
              leadingIcon={<Plus aria-hidden='true' />}
            >
              {t('scriptImport.append')}
            </Button>

            <Button
              variant='primary'
              size='sm'
              disabled={parsedResult.editorNodes.length === 0}
              onClick={() => handleApply('insert')}
              title={t('scriptImport.insertTitle')}
              leadingIcon={<CornerDownLeft aria-hidden='true' />}
            >
              {t('scriptImport.insertAtCursor')}
            </Button>
          </div>
        </div>
      }
    >
      <div className='space-y-4'>
        <Card tone='brand'>
          <CardHeader
            icon={<SlidersHorizontal aria-hidden='true' />}
            title={t('scriptImport.settingsTitle')}
            subtitle={t('scriptImport.settingsSubtitle')}
            actions={
              <div className='flex flex-wrap items-center justify-end gap-2'>
                <Button
                  variant='secondary'
                  size='sm'
                  onClick={() => setInputContent(SAMPLE_NOVEL_PROSE)}
                  title={t('scriptImport.proseSampleTitle')}
                  leadingIcon={<Lightbulb className='text-amber-600' aria-hidden='true' />}
                >
                  {t('scriptImport.proseSample')}
                </Button>
                <Button
                  variant='secondary'
                  size='sm'
                  onClick={() => setInputContent(SAMPLE_COMIC_SCRIPT)}
                  title={t('scriptImport.scriptSampleTitle')}
                  leadingIcon={<FileCode className='text-blue-600' aria-hidden='true' />}
                >
                  {t('scriptImport.scriptSample')}
                </Button>
                <Button
                  variant='secondary'
                  size='sm'
                  onClick={() => setInputContent(SAMPLE_ENGLISH_SCRIPT)}
                  title={t('scriptImport.englishSampleTitle')}
                  leadingIcon={<FileText className='text-violet-600' aria-hidden='true' />}
                >
                  {t('scriptImport.englishSample')}
                </Button>
                {inputContent && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => {
                      setInputContent('');
                      setFileName(null);
                    }}
                    aria-label={t('scriptImport.clearContent')}
                    title={t('scriptImport.clearContent')}
                    className='size-8 min-h-8 px-0'
                  >
                    <RotateCcw aria-hidden='true' />
                  </Button>
                )}
              </div>
            }
          />
          <CardBody className='py-3'>
            <label className='grid max-w-32 gap-1 text-xs font-semibold text-stone-700'>
              <span>{t('scriptImport.startingPage')}</span>
              <input
                type='number'
                min={1}
                value={startingPage}
                onChange={(e) => setStartingPage(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className='min-h-9 w-full rounded-md border border-stone-300 bg-white px-3 text-sm font-bold text-stone-900 outline-none transition-colors focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
              />
            </label>
          </CardBody>
        </Card>

        <div className='grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]'>
          <Card as='section' className='flex min-h-[28rem] flex-col xl:h-[clamp(30rem,56dvh,36rem)]'>
            <CardHeader
              icon={<BookOpenText aria-hidden='true' />}
              title={t('scriptImport.sourceTitle')}
              subtitle={fileName ? t('scriptImport.loadedFile', { name: fileName }) : t('scriptImport.sourceSubtitle')}
              actions={
                <div className='flex items-center rounded-lg bg-stone-100 p-1' role='tablist' aria-label={t('scriptImport.sourceTabsLabel')}>
                <button
                  type='button'
                  onClick={() => setActiveTab('paste')}
                  role='tab'
                  aria-selected={activeTab === 'paste'}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activeTab === 'paste'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {t('scriptImport.pasteText')}
                </button>
                <button
                  type='button'
                  onClick={() => {
                    setActiveTab('file');
                    fileInputRef.current?.click();
                  }}
                  role='tab'
                  aria-selected={activeTab === 'file'}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activeTab === 'file'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Upload className='size-3.5' aria-hidden='true' />
                  <span>{t('scriptImport.uploadFile')}</span>
                </button>
              </div>
              }
            />
            <CardBody className='flex min-h-0 flex-1 flex-col gap-2 p-0'>
              <input
                ref={fileInputRef}
                type='file'
                accept='.txt,.md,.fountain'
                className='hidden'
                onChange={handleFileUpload}
              />
            <label htmlFor='script-import-source' className='sr-only'>{t('scriptImport.sourceLabel')}</label>
            <textarea
              id='script-import-source'
              value={inputContent}
              onChange={(e) => {
                setInputContent(e.target.value);
                setConfirmReplace(false);
              }}
              placeholder={t('scriptImport.placeholder')}
              className='min-h-[22rem] w-full flex-1 resize-none border-0 bg-white p-4 font-mono text-xs leading-relaxed text-stone-800 outline-none placeholder:text-stone-400 focus:ring-2 focus:ring-inset focus:ring-orange-300'
            />

            <div className='flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 bg-stone-50 px-4 py-2 text-xs text-stone-500'>
              <span>{inputContent ? t('scriptImport.inputStats', { characters: inputContent.length, lines: inputContent.split(/\r?\n/).length }) : t('scriptImport.noContent')}</span>
              <span>{t('scriptImport.supportedFiles')}</span>
            </div>
            </CardBody>
          </Card>

          <Card as='section' tone='info' className='flex min-h-[28rem] flex-col xl:h-[clamp(30rem,56dvh,36rem)]'>
            <CardHeader
              icon={<Sparkles aria-hidden='true' />}
              title={t('scriptImport.previewTitle')}
              subtitle={t('scriptImport.previewSubtitle')}
              actions={
                <div className='flex items-center rounded-lg bg-stone-100 p-1' role='tablist' aria-label={t('scriptImport.previewTabsLabel')}>
                <button
                  type='button'
                  onClick={() => setPreviewTab('visual')}
                  role='tab'
                  aria-selected={previewTab === 'visual'}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    previewTab === 'visual'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title={t('scriptImport.visualPreviewTitle')}
                >
                  {t('scriptImport.visual')}
                </button>
                <button
                  type='button'
                  onClick={() => setPreviewTab('text')}
                  role='tab'
                  aria-selected={previewTab === 'text'}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    previewTab === 'text'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title={t('scriptImport.scriptPreviewTitle')}
                >
                  {t('scriptImport.script')}
                </button>
              </div>
              }
            />

            <CardBody className='flex min-h-0 flex-1 flex-col gap-3 bg-stone-50/70 p-3'>
              {parsedResult.pagesCount > 0 && (
                <div className='flex flex-wrap gap-2' aria-label={t('scriptImport.parseSummaryLabel')}>
                  <Badge tone='brand' icon={<Layers aria-hidden='true' />}>{t('scriptImport.pagesCount', { count: parsedResult.pagesCount })}</Badge>
                  <Badge tone='neutral' icon={<LayoutGrid aria-hidden='true' />}>{t('scriptImport.panelsCount', { count: parsedResult.panelsCount })}</Badge>
                  <Badge tone='info' icon={<MessageCircle aria-hidden='true' />}>{t('scriptImport.dialoguesCount', { count: parsedResult.dialoguesCount })}</Badge>
                  {parsedResult.sfxCount > 0 && <Badge tone='warning' icon={<Volume2 aria-hidden='true' />}>{t('scriptImport.sfxCount', { count: parsedResult.sfxCount })}</Badge>}
                </div>
              )}

            <div className='min-h-[20rem] flex-1 overflow-y-auto rounded-lg border border-stone-200 bg-white p-3 [scrollbar-gutter:stable]'>
              {parsedResult.blocks.length === 0 ? (
                <div className='flex h-full flex-col items-center justify-center space-y-3 px-6 text-center text-stone-500'>
                  <span className='grid size-12 place-items-center rounded-full bg-stone-100 text-stone-400'>
                    <Gauge className='size-6' aria-hidden='true' />
                  </span>
                  <div>
                    <p className='text-sm font-semibold text-stone-700'>{t('scriptImport.emptyPreviewTitle')}</p>
                    <p className='mt-1 text-xs'>{t('scriptImport.emptyPreviewDesc')}</p>
                  </div>
                </div>
              ) : previewTab === 'visual' ? (
                <div className='space-y-3'>
                  {parsedResult.blocks.map((block, idx) => {
                    if (block.type === 'page') {
                      return (
                        <div
                          key={idx}
                          className='flex items-center justify-between rounded-md bg-stone-900 px-3 py-2 text-xs font-bold tracking-wide text-white'
                        >
                          <span>{t('scriptImport.pageHeading', { number: block.pageNumber || '01' })}</span>
                          <span className='font-normal text-stone-300'>{t('scriptImport.pageBreak')}</span>
                        </div>
                      );
                    }

                    if (block.type === 'panel') {
                      return (
                        <div
                          key={idx}
                          className='flex items-center justify-between rounded-r-md border-l-4 border-orange-500 bg-orange-50/80 p-2.5 text-xs'
                        >
                          <span className='font-bold text-orange-900'>
                            {t('scriptImport.panelHeading', { number: block.panelNumber || '1.1' })}
                            {block.cameraAngle && (
                              <span className='ml-2 rounded bg-orange-100/70 px-2 py-0.5 text-xs font-semibold text-orange-700'>
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
                          <div
                            data-testid='dialogue-speaker'
                            className='flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-stone-900'
                          >
                            <span className='w-1.5 h-1.5 rounded-full bg-blue-600' />
                            <span>{block.character || t('scriptImport.characterFallback')}</span>
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
                          {t('scriptImport.sfxPrefix')}: {block.content}
                        </div>
                      );
                    }

                    if (block.type === 'caption') {
                      return (
                        <div
                          key={idx}
                          className='ml-4 p-2 bg-stone-100 border border-stone-300 rounded text-xs text-stone-700 italic'
                        >
                          <strong className='not-italic font-bold text-stone-800'>{t('scriptImport.captionPrefix')}:</strong> {block.content}
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
            </CardBody>
          </Card>
        </div>
      </div>
    </Modal>
  );
};
