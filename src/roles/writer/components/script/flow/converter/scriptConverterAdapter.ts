// src/roles/writer/components/script/flow/converter/scriptConverterAdapter.ts
import { generateGuid } from '../scriptFlowAdapter';
import { MangaBlockType } from '../types';

export interface ConverterAdapterOptions {
  startingPageNumber?: number;
  sceneId?: string;
  defaultNarrationMode?: 'Present' | 'VoiceOver' | 'Flashback';
  targetPanelsPerPage?: number;
}

export interface ParsedScriptBlock {
  type: 'page' | 'panel' | 'dialogue' | 'sfx' | 'caption' | 'action';
  pageNumber?: string;
  panelNumber?: string;
  cameraAngle?: string;
  character?: string;
  content: string;
}

const NON_SPEAKER_KEYWORDS = new Set([
  'trang',
  'page',
  'panel',
  'khung',
  'ô',
  'sfx',
  'caption',
  'lời dẫn',
  'lời dẫn truyện',
  'dẫn chuyện',
  'người dẫn',
  'người dẫn chuyện',
  'bối cảnh',
  'thời gian',
  'địa điểm',
  'góc máy',
  'camera',
  'ghi chú',
  'cảnh',
  'scene',
  'âm thanh',
  'note',
]);

/**
 * Chuẩn hóa góc máy từ chuỗi mô tả
 */
function normalizeCameraAngle(rawAngle?: string): string {
  if (!rawAngle) return 'Toàn cảnh';
  const clean = rawAngle.trim().replace(/^[\[\(]|[\]\)]$/g, '').trim();
  if (!clean) return 'Toàn cảnh';

  const lower = clean.toLowerCase();
  if (lower.includes('toàn cảnh') || lower.includes('wide')) return 'Toàn cảnh';
  if (lower.includes('trung cảnh') || lower.includes('medium')) return 'Trung cảnh';
  if (lower.includes('cận cảnh') || lower.includes('close-up') || lower.includes('close up')) return 'Cận cảnh';
  if (lower.includes('đặc tả') || lower.includes('extreme close')) return 'Góc đặc tả';
  if (lower.includes('góc thấp') || lower.includes('low angle')) return 'Góc thấp';
  if (lower.includes('góc cao') || lower.includes('high angle')) return 'Góc cao';
  if (lower.includes('pov') || lower.includes('góc nhìn')) return 'Góc nhìn POV';
  return clean;
}

/**
 * Phân tích chuỗi kịch bản văn bản thuần thành danh sách các khối logic có cấu trúc chuẩn:
 * Page -> Panel -> Nhân vật -> Lời thoại
 */
export function parseScriptTextToBlocks(
  scriptText: string,
  options?: ConverterAdapterOptions
): ParsedScriptBlock[] {
  const lines = scriptText.split(/\r?\n/);
  const rawBlocks: ParsedScriptBlock[] = [];

  let currentPageIndex = 0;
  let panelCountInPage = 0;
  let pageOffset = options?.startingPageNumber ?? 1;
  let hasSetFirstPage = false;
  let hasExplicitPageOrPanel = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // 1. Nhận diện Trang: "! Trang 1", "# Page 1", "Trang 01", "Page 1", "=== Trang 1 ===", "[Trang 1]"
    const pageMatch =
      trimmed.match(/^(?:[!#📄]?\s*(?:Trang|Page)\s*(\d+))/i) ||
      trimmed.match(/^(?:Trang|Page)\s+(\d+)/i) ||
      trimmed.match(/^==+\s*(?:Trang|Page)?\s*(\d+)\s*==+/i) ||
      trimmed.match(/^\[(?:Trang|Page)\s*(\d+)\]/i);

    const isPageLine =
      trimmed.startsWith('!') ||
      trimmed.startsWith('#') ||
      /^Trang\s+\d+/i.test(trimmed) ||
      /^Page\s+\d+/i.test(trimmed) ||
      /^==+\s*(?:Trang|Page)?\s*\d+/i.test(trimmed) ||
      /^\[(?:Trang|Page)\s*\d+\]/i.test(trimmed);

    if (isPageLine && pageMatch) {
      hasExplicitPageOrPanel = true;
      const parsedNum = parseInt(pageMatch[1], 10);
      if (!hasSetFirstPage) {
        hasSetFirstPage = true;
        if (options?.startingPageNumber && options.startingPageNumber > 0) {
          pageOffset = options.startingPageNumber;
          currentPageIndex = pageOffset;
        } else {
          currentPageIndex = parsedNum > 0 ? parsedNum : 1;
        }
      } else {
        currentPageIndex++;
      }

      panelCountInPage = 0;
      const formattedPage = String(currentPageIndex).padStart(2, '0');
      rawBlocks.push({
        type: 'page',
        pageNumber: formattedPage,
        content: `Trang ${formattedPage}`,
      });
      continue;
    }

    // 2. Nhận diện Panel:
    // - '" Panel 1.1: [Toàn cảnh]', '- Panel 1.1: [Shot]', 'Panel 1.1', 'Panel 1'
    // - 'Khung 1', 'Khung 1.1', 'Khung tranh 1', 'Ô 1', '[Panel 1: Cận cảnh]', '#panel 1.1'
    const panelMatch =
      trimmed.match(
        /^(?:[-"”]\s*)?(?:Panel|Khung(?:\s*tranh)?|Ô(?:\s*tranh|\s*số)?|#panel)\s*(\d+(?:\.\d+)?)(?:\s*[:.-]?\s*\[(.*?)\]|\s*[:.-]\s*(.*?))?$/i
      ) ||
      trimmed.match(
        /^\[(?:Panel|Khung(?:\s*tranh)?|Ô)\s*(\d+(?:\.\d+)?)(?:\s*[:.-]\s*(.*?))?\]$/i
      );

    const isPanelLine =
      trimmed.startsWith('"') ||
      trimmed.startsWith('”') ||
      trimmed.startsWith('-') ||
      /^Panel\s*[\d.]+/i.test(trimmed) ||
      /^Khung(?:\s*tranh)?\s*[\d.]+/i.test(trimmed) ||
      /^Ô(?:\s*tranh|\s*số)?\s*[\d.]+/i.test(trimmed) ||
      /^\[(?:Panel|Khung|Ô)\s*[\d.]+/i.test(trimmed) ||
      /^#panel\s*[\d.]+/i.test(trimmed);

    if (isPanelLine && panelMatch) {
      hasExplicitPageOrPanel = true;
      panelCountInPage++;
      const pRaw = panelMatch[1];
      let pIdx = panelCountInPage;
      let pPage = currentPageIndex > 0 ? currentPageIndex : (options?.startingPageNumber || 1);

      if (pRaw && pRaw.includes('.')) {
        const parts = pRaw.split('.');
        const parsedPIdx = parseInt(parts[1], 10);
        if (!isNaN(parsedPIdx)) pIdx = parsedPIdx;
      }

      const rawAngle = panelMatch[2] || panelMatch[3] || 'Toàn cảnh';
      const angle = normalizeCameraAngle(rawAngle);
      const pNumber = `${pPage}.${pIdx}`;

      rawBlocks.push({
        type: 'panel',
        pageNumber: String(pPage).padStart(2, '0'),
        panelNumber: pNumber,
        cameraAngle: angle,
        content: `" Panel ${pNumber}: [${angle}]`,
      });
      continue;
    }

    // 3. Nhận diện SFX: SFX: ... hoặc * BÙM * hoặc (SFX: Tiếng nổ)
    const sfxMatch =
      trimmed.match(/^(?:SFX|Âm\s*thanh)\s*:\s*(.*)/i) ||
      trimmed.match(/^\*\s*(.*?)\s*\*$/) ||
      trimmed.match(/^\((?:SFX|Tiếng\s*[^)]+|tiếng\s*[^)]+|[A-ZÀ-Ỹ0-9_! -]{2,20}!)\)$/i) ||
      trimmed.match(/^\[(?:SFX|Âm\s*thanh)\s*:\s*(.*)\]$/i);

    if (sfxMatch) {
      const sfxBody = (sfxMatch[1] || trimmed).replace(/^\*|\*$/g, '').trim().toUpperCase() || 'TIẾNG ĐỘNG';
      rawBlocks.push({
        type: 'sfx',
        pageNumber: String(currentPageIndex || 1).padStart(2, '0'),
        panelNumber: panelCountInPage > 0 ? `${currentPageIndex || 1}.${panelCountInPage}` : undefined,
        content: sfxBody,
      });
      continue;
    }

    // 4. Nhận diện Caption: Lời dẫn truyện: ... hoặc Caption: ...
    const captionMatch =
      trimmed.match(/^(?:Lời dẫn truyện|Lời dẫn|Caption|Dẫn chuyện|Người dẫn chuyện)\s*:\s*(.*)/i) ||
      trimmed.match(/^\[(?:Lời dẫn truyện|Lời dẫn|Caption|Dẫn chuyện|Người dẫn chuyện)\s*:\s*(.*)\]$/i);

    if (captionMatch) {
      rawBlocks.push({
        type: 'caption',
        pageNumber: String(currentPageIndex || 1).padStart(2, '0'),
        panelNumber: panelCountInPage > 0 ? `${currentPageIndex || 1}.${panelCountInPage}` : undefined,
        content: captionMatch[1].trim(),
      });
      continue;
    }

    // 5. Nhận diện Thoại và Nhân vật:
    // Hỗ trợ cả:
    // - @Minh: "Thoại" hoặc @Minh: Thoại
    // - MINH: Thoại hoặc Minh: "Thoại"
    // - Minh (thì thầm): Thoại hoặc Minh / Hét: Thoại
    // - Minh nói: "Thoại"
    const dialogueWithAt = trimmed.match(/^@([\w\p{L}_-]+)\s*:\s*(?:["“]([^"”]+)["”]|(.+))$/u);
    if (dialogueWithAt) {
      const charName = dialogueWithAt[1].trim();
      const dialogueText = (dialogueWithAt[2] || dialogueWithAt[3] || '').trim();
      rawBlocks.push({
        type: 'dialogue',
        character: charName,
        pageNumber: String(currentPageIndex || 1).padStart(2, '0'),
        panelNumber: panelCountInPage > 0 ? `${currentPageIndex || 1}.${panelCountInPage}` : undefined,
        content: dialogueText,
      });
      continue;
    }

    const speakerDialogueMatch = trimmed.match(
      /^(?:@)?([a-zA-ZÀ-Ỹ0-9_\s]{2,30})(?:[\(\/]([a-zA-ZÀ-Ỹ0-9_\s]+)[\)])?\s*[:\-]\s*(.+)$/u
    );

    if (speakerDialogueMatch) {
      const candidateName = speakerDialogueMatch[1].trim();
      const lowerCandidate = candidateName.toLowerCase();

      if (!NON_SPEAKER_KEYWORDS.has(lowerCandidate) && !/^\d+$/.test(candidateName)) {
        let dialogueContent = speakerDialogueMatch[3].trim();
        // Làm sạch ngoặc kép nếu có
        dialogueContent = dialogueContent.replace(/^["“](.*)["”]$/, '$1').trim();

        rawBlocks.push({
          type: 'dialogue',
          character: candidateName,
          pageNumber: String(currentPageIndex || 1).padStart(2, '0'),
          panelNumber: panelCountInPage > 0 ? `${currentPageIndex || 1}.${panelCountInPage}` : undefined,
          content: dialogueContent,
        });
        continue;
      }
    }

    // Nhận diện kiểu văn xuôi: Minh nói: "..." hoặc Minh hét lên: "..."
    const speechVerbMatch = trimmed.match(
      /^([A-ZÀ-Ỹ][a-zà-ỹ0-9_\s]{1,25})\s+(?:nói|hét|bảo|thì thầm|gọi|kêu|hỏi|đáp|nghĩ)\s*:\s*["“]([^"”]+)["”]/u
    );
    if (speechVerbMatch) {
      rawBlocks.push({
        type: 'dialogue',
        character: speechVerbMatch[1].trim(),
        pageNumber: String(currentPageIndex || 1).padStart(2, '0'),
        panelNumber: panelCountInPage > 0 ? `${currentPageIndex || 1}.${panelCountInPage}` : undefined,
        content: speechVerbMatch[2].trim(),
      });
      continue;
    }

    // 6. Mặc định là đoạn văn mô tả hành động (Action / Stage Direction)
    rawBlocks.push({
      type: 'action',
      pageNumber: String(currentPageIndex || 1).padStart(2, '0'),
      panelNumber: panelCountInPage > 0 ? `${currentPageIndex || 1}.${panelCountInPage}` : undefined,
      content: trimmed,
    });
  }

  // ── AUTO-PAGINATION & AUTO-PANELING (Khi văn bản đầu vào không chia sẵn Trang/Panel) ──
  // Đảm bảo kết quả LUÔN LUÔN tuân thủ phân cấp: Trang -> 4 hoặc 5 Panel -> Nhân vật -> Thoại
  if (!hasExplicitPageOrPanel && rawBlocks.length > 0) {
    const targetPanelsPerPage = Math.max(3, Math.min(options?.targetPanelsPerPage || 4, 6));
    const structuredBlocks: ParsedScriptBlock[] = [];

    let curPage = options?.startingPageNumber || 1;
    let curPanel = 1;

    // Khởi tạo trang đầu tiên
    structuredBlocks.push({
      type: 'page',
      pageNumber: String(curPage).padStart(2, '0'),
      content: `Trang ${String(curPage).padStart(2, '0')}`,
    });

    const shots = ['Toàn cảnh', 'Trung cảnh', 'Cận cảnh', 'Góc đặc tả', 'Góc nhìn POV', 'Góc cao'];

    // Khởi tạo Panel đầu tiên
    structuredBlocks.push({
      type: 'panel',
      pageNumber: String(curPage).padStart(2, '0'),
      panelNumber: `${curPage}.${curPanel}`,
      cameraAngle: shots[0],
      content: `" Panel ${curPage}.${curPanel}: [${shots[0]}]`,
    });

    let itemsInCurrentPanel = 0;

    for (const item of rawBlocks) {
      // Đưa item vào panel hiện tại
      structuredBlocks.push({
        ...item,
        pageNumber: String(curPage).padStart(2, '0'),
        panelNumber: `${curPage}.${curPanel}`,
      });
      itemsInCurrentPanel++;

      // Ngắt Panel: Khi có 1 câu thoại kèm hành động, hoặc 2 câu thoại
      const shouldBreakPanel =
        itemsInCurrentPanel >= 2 || (item.type === 'dialogue' && itemsInCurrentPanel >= 1);

      if (shouldBreakPanel) {
        curPanel++;
        itemsInCurrentPanel = 0;

        // Nếu đã đủ số panel trong trang, ngắt sang trang mới
        if (curPanel > targetPanelsPerPage) {
          curPage++;
          curPanel = 1;
          structuredBlocks.push({
            type: 'page',
            pageNumber: String(curPage).padStart(2, '0'),
            content: `Trang ${String(curPage).padStart(2, '0')}`,
          });
        }

        const shot = shots[(curPanel - 1) % shots.length];
        structuredBlocks.push({
          type: 'panel',
          pageNumber: String(curPage).padStart(2, '0'),
          panelNumber: `${curPage}.${curPanel}`,
          cameraAngle: shot,
          content: `" Panel ${curPage}.${curPanel}: [${shot}]`,
        });
      }
    }

    return structuredBlocks;
  }

  return rawBlocks;
}

/**
 * Chuyển đổi văn bản kịch bản thành mảng TipTap Node JSON dành riêng cho ComicScriptEditor
 */
export function convertScriptTextToComicBlocks(
  scriptText: string,
  options?: ConverterAdapterOptions
): any[] {
  const parsed = parseScriptTextToBlocks(scriptText, options);
  const nodes: any[] = [];

  for (const block of parsed) {
    switch (block.type) {
      case 'page':
        nodes.push({
          type: 'pageBlock',
          attrs: {
            pageNumber: block.pageNumber || '01',
            label: `Trang ${block.pageNumber || '01'}`,
          },
          content: [{ type: 'text', text: `Trang ${block.pageNumber || '01'}` }],
        });
        break;

      case 'panel':
        nodes.push({
          type: 'panelBlock',
          attrs: {
            panelNumber: block.panelNumber || '1.1',
            cameraAngle: block.cameraAngle || 'Toàn cảnh',
          },
          content: [
            {
              type: 'text',
              text: `" Panel ${block.panelNumber || '1.1'}: [${block.cameraAngle || 'Toàn cảnh'}]`,
            },
          ],
        });
        break;

      case 'dialogue':
        nodes.push({
          type: 'dialogueBlock',
          attrs: {
            character: block.character || 'Nhân vật',
          },
          content: [{ type: 'text', text: block.content }],
        });
        break;

      case 'sfx':
        nodes.push({
          type: 'sfxBlock',
          content: [{ type: 'text', text: block.content }],
        });
        break;

      case 'caption':
        nodes.push({
          type: 'captionBlock',
          content: [{ type: 'text', text: block.content }],
        });
        break;

      case 'action':
      default:
        nodes.push({
          type: 'paragraph',
          content: [{ type: 'text', text: block.content }],
        });
        break;
    }
  }

  return nodes;
}

/**
 * Chuyển đổi văn bản kịch bản thành mảng TipTap Node JSON dành cho ScreenplayFlowEditor
 * (sử dụng scriptLineBlock với các thuộc tính blockType chuẩn, neo vào Page & Panel)
 */
export function convertScriptTextToScreenplayBlocks(
  scriptText: string,
  options?: ConverterAdapterOptions
): any[] {
  const parsed = parseScriptTextToBlocks(scriptText, options);
  const nodes: any[] = [];
  const defaultSceneId = options?.sceneId || null;
  const narrationMode = options?.defaultNarrationMode || 'Present';
  let order = 1;

  for (const block of parsed) {
    let blockType: MangaBlockType = 'stage_direction';
    let textToDisplay = block.content;
    let speakerName: string | null = null;

    const pageNum = block.pageNumber ? parseInt(block.pageNumber, 10) : undefined;
    const panelNum = block.panelNumber
      ? block.panelNumber.includes('.')
        ? parseInt(block.panelNumber.split('.')[1], 10)
        : parseInt(block.panelNumber, 10)
      : undefined;

    switch (block.type) {
      case 'page':
        blockType = 'page_heading';
        textToDisplay = `Trang ${block.pageNumber || '01'}`;
        break;

      case 'panel':
        blockType = 'panel_heading';
        textToDisplay = `" Panel ${block.panelNumber || '1.1'}: [${block.cameraAngle || 'Toàn cảnh'}]`;
        break;

      case 'dialogue':
        blockType = 'dialogue';
        speakerName = block.character || null;
        textToDisplay = `@${block.character || 'Nhân vật'} : "${block.content}"`;
        break;

      case 'sfx':
        blockType = 'sfx';
        textToDisplay = `* ${block.content} *`;
        break;

      case 'caption':
        blockType = 'caption';
        textToDisplay = `Caption: ${block.content}`;
        break;

      case 'action':
      default:
        blockType = 'stage_direction';
        textToDisplay = block.content;
        break;
    }

    nodes.push({
      type: 'scriptLineBlock',
      attrs: {
        scriptLineId: generateGuid(),
        sceneId: defaultSceneId,
        blockType,
        speakerName,
        narrationMode,
        lineOrder: order++,
        pageNumber: pageNum,
        panelNumber: panelNum,
        inPanel: blockType !== 'page_heading' && Boolean(panelNum),
      },
      content: [{ type: 'text', text: textToDisplay }],
    });
  }

  return nodes;
}

/**
 * Đếm số trang và số panel trong chuỗi kịch bản thuần
 */
export function countPagesAndPanels(scriptText: string): { pagesCount: number; panelsCount: number } {
  const blocks = parseScriptTextToBlocks(scriptText);
  const pagesCount = blocks.filter((b) => b.type === 'page').length || (blocks.length > 0 ? 1 : 0);
  const panelsCount = blocks.filter((b) => b.type === 'panel').length;
  return { pagesCount, panelsCount };
}

/**
 * Lọc nội dung kịch bản thuần theo dải trang (từ fromPage đến toPage)
 */
export function filterScriptTextByPageRange(
  scriptText: string,
  fromPage: number,
  toPage: number
): { filteredText: string; pagesCount: number; panelsCount: number } {
  const lines = scriptText.split(/\r?\n/);
  const selectedLines: string[] = [];

  let currentPageNum = 1;
  let isInTargetRange = false;
  let hasEncounteredAnyPage = false;
  let panelsCount = 0;
  let pagesCount = 0;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    const pageMatch =
      trimmed.match(/^(?:[!#📄]?\s*(?:Trang|Page)\s*(\d+))/i) ||
      trimmed.match(/^(?:Trang|Page)\s+(\d+)/i) ||
      trimmed.match(/^==+\s*(?:Trang|Page)?\s*(\d+)\s*==+/i);

    const isPageLine =
      trimmed.startsWith('!') ||
      trimmed.startsWith('#') ||
      /^Trang\s+\d+/i.test(trimmed) ||
      /^Page\s+\d+/i.test(trimmed) ||
      /^==+\s*(?:Trang|Page)?\s*\d+/i.test(trimmed);

    if (isPageLine && pageMatch) {
      hasEncounteredAnyPage = true;
      currentPageNum = parseInt(pageMatch[1], 10);
      isInTargetRange = currentPageNum >= fromPage && currentPageNum <= toPage;
      if (isInTargetRange) {
        pagesCount++;
        selectedLines.push(rawLine);
      }
      continue;
    }

    if (!hasEncounteredAnyPage) {
      isInTargetRange = fromPage <= 1;
    }

    if (isInTargetRange) {
      const isPanelLine =
        trimmed.startsWith('"') ||
        trimmed.startsWith('”') ||
        trimmed.startsWith('-') ||
        /^Panel\s*[\d.]+/i.test(trimmed) ||
        /^Khung(?:\s*tranh)?\s*[\d.]+/i.test(trimmed) ||
        /^Ô(?:\s*tranh|\s*số)?\s*[\d.]+/i.test(trimmed);

      if (isPanelLine) {
        panelsCount++;
      }

      selectedLines.push(rawLine);
    }
  }

  return {
    filteredText: selectedLines.join('\n').trim(),
    pagesCount: Math.max(pagesCount, hasEncounteredAnyPage ? 0 : selectedLines.length > 0 ? 1 : 0),
    panelsCount,
  };
}
