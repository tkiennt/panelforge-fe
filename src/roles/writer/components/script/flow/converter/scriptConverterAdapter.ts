// src/roles/writer/components/script/flow/converter/scriptConverterAdapter.ts
import type { JSONContent } from '@tiptap/core';
import { generateGuid, splitSpeakerLabel } from '../scriptFlowAdapter';
import type { ExtractedScriptLinePayload } from '../scriptFlowAdapter';
import type { GnElement } from '../grammar/scriptGrammar';
import { MangaBlockType } from '../types';

export interface ConverterAdapterOptions {
  startingPageNumber?: number;
  sceneId?: string;
  defaultNarrationMode?: 'Present' | 'VoiceOver' | 'Flashback';
  targetPanelsPerPage?: number;
  /** Nhân vật trong Series Bible để chuẩn hóa speakerName theo tên/mã khi import */
  characters?: { id: string; name: string; code?: string | null }[];
}

const SPEECH_VERB_SUFFIX =
  /\s+(?:nói|hét(?:\s+lên)?|bảo|thì thầm|gọi|kêu(?:\s+lên)?|hỏi|đáp|trả lời|nghĩ|tự nhủ|ngẫm nghĩ|lẩm bẩm|quát(?:\s+lên)?|says?|said|shouts?|shouted|whispers?|whispered|asks?|asked|replies|replied|thinks?|thought|yells?|yelled)$/iu;

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[\s_-]+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Tách "Minh (thì thầm)", "Minh / Hét", "Minh nói" về tên nhân vật "Minh"; null nếu không giống tên người nói */
export function extractSpeakerName(rawSpeaker: string): string | null {
  let name = rawSpeaker
    .replace(/^@/, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s*\/.*$/, '')
    .trim();
  name = name.replace(SPEECH_VERB_SUFFIX, '').trim();
  if (name.length < 2 || name.split(/\s+/).length > 4) return null;
  if (!/^[\p{L}0-9_ ]+$/u.test(name) || /^\d+$/.test(name)) return null;
  const lower = name.toLowerCase();
  for (const keyword of NON_SPEAKER_KEYWORDS) {
    if (lower === keyword || lower.startsWith(`${keyword} `)) return null;
  }
  return name;
}

/**
 * Dòng thoại gõ tay "MINH: ..." / "@Minh : ..." chưa có speakerLabel → gán theo tên trong Series Bible.
 */
export function linkTypedSpeakers(
  lines: ExtractedScriptLinePayload[],
  characters: ConverterAdapterOptions['characters'],
): ExtractedScriptLinePayload[] {
  if (!characters?.length) return lines;
  return lines.map((line) => {
    if (line.speakerLabel || !line.dialogueText) return line;
    const colon = line.dialogueText.indexOf(':');
    if (colon <= 0) return line;
    const name = extractSpeakerName(line.dialogueText.slice(0, colon));
    const match = name ? matchBibleCharacter(name, characters) : null;
    return match ? { ...line, speakerLabel: match.name } : line;
  });
}

export function matchBibleCharacter(
  speaker: string,
  characters: ConverterAdapterOptions['characters'],
): { id: string; name: string } | null {
  if (!characters?.length) return null;
  const key = normalizeName(speaker);
  const found = characters.find(
    (c) => normalizeName(c.name) === key || (c.code ? normalizeName(c.code) === key : false),
  );
  return found ? { id: found.id, name: found.name } : null;
}

export interface ParsedScriptBlock {
  type: 'page' | 'panel' | 'dialogue' | 'sfx' | 'caption' | 'action';
  pageNumber?: string;
  panelNumber?: string;
  cameraAngle?: string;
  character?: string;
  parens?: string;
  content: string;
}

const NON_SPEAKER_KEYWORDS = new Set([
  // Tiếng Việt - Dẫn chuyện, Bối cảnh & Kỹ thuật
  'trang',
  'page',
  'panel',
  'khung',
  'khung tranh',
  'ô',
  'ô tranh',
  'sfx',
  'fx',
  'sound',
  'caption',
  'captions',
  'lời dẫn',
  'lời dẫn truyện',
  'dẫn chuyện',
  'dẫn',
  'người dẫn',
  'người dẫn chuyện',
  'người kể',
  'người kể chuyện',
  'lời người kể',
  'thuyết minh',
  'hộp dẫn',
  'hộp thoại',
  'hộp chữ',
  'bảng chữ',
  'bối cảnh',
  'thời gian',
  'địa điểm',
  'góc máy',
  'camera',
  'camera angle',
  'ghi chú',
  'cảnh',
  'phân cảnh',
  'scene',
  'âm thanh',
  'tiếng',
  'tiếng động',
  'note',
  'tiêu đề',
  'ngày',
  // Tiếng Anh - Narration, Sluglines & Technical cues
  'narrator',
  'narration',
  'narrative',
  'voiceover',
  'voice over',
  'voice-over',
  'vo',
  'v.o.',
  'os',
  'o.s.',
  'box',
  'text box',
  'textbox',
  'caption box',
  'title',
  'title card',
  'location',
  'time',
  'setting',
  'date',
  'shot',
  'angle',
  'establishing shot',
  'int',
  'ext',
  'int.',
  'ext.',
  'int/ext',
  'cut to',
  'fade in',
  'fade out',
  // Đại từ nhân xưng & Mạo từ không phải tên riêng nhân vật
  'the',
  'he',
  'she',
  'they',
  'it',
  'we',
  'you',
  'someone',
  'anyone',
  'everyone',
  'nobody',
  'there',
  'người',
  'anh',
  'cô',
  'bọn',
  'hắn',
  'gã',
  'y',
  'thị',
  'tôi',
  'cậu',
  'bà',
  'ông',
  'chúng',
  'ai đó',
  'mọi người',
]);

/**
 * Chuẩn hóa góc máy từ chuỗi mô tả
 */
function normalizeCameraAngle(rawAngle?: string): string {
  if (!rawAngle) return 'Toàn cảnh';
  const clean = rawAngle
    .trim()
    .replace(/^[[(]|[\])]$/g, '')
    .trim();
  if (!clean) return 'Toàn cảnh';

  const lower = clean.toLowerCase();
  if (lower.includes('toàn cảnh') || lower.includes('wide')) return 'Toàn cảnh';
  if (lower.includes('trung cảnh') || lower.includes('medium')) return 'Trung cảnh';
  if (lower.includes('cận cảnh') || lower.includes('close-up') || lower.includes('close up'))
    return 'Cận cảnh';
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
  options?: ConverterAdapterOptions,
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
      trimmed.match(/^(?:[!#📄]?\s*(?:Trang|Page)\s*(\d+))/iu) ||
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
        /^(?:[-"”]\s*)?(?:Panel|Khung(?:\s*tranh)?|Ô(?:\s*tranh|\s*số)?|#panel)\s*(\d+(?:\.\d+)?)(?:\s*[:.-]?\s*\[(.*?)\]|\s*[:.-]\s*(.*?))?$/i,
      ) ||
      trimmed.match(/^\[(?:Panel|Khung(?:\s*tranh)?|Ô)\s*(\d+(?:\.\d+)?)(?:\s*[:.-]\s*(.*?))?\]$/i);

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
      const pPage = currentPageIndex > 0 ? currentPageIndex : options?.startingPageNumber || 1;

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
      trimmed.match(/^[[(]\s*(?:SFX|Âm\s*thanh)\s*:\s*(.*?)\s*[\])]$/i) ||
      trimmed.match(/^\(((?:Tiếng\s*[^)]+)|[A-ZÀ-Ỹ0-9_! -]{2,20}!)\)$/i);

    if (sfxMatch) {
      const sfxBody =
        (sfxMatch[1] || trimmed)
          .replace(/^\*|\*$/g, '')
          .trim()
          .toUpperCase() || 'TIẾNG ĐỘNG';
      rawBlocks.push({
        type: 'sfx',
        pageNumber: String(currentPageIndex || 1).padStart(2, '0'),
        panelNumber:
          panelCountInPage > 0 ? `${currentPageIndex || 1}.${panelCountInPage}` : undefined,
        content: sfxBody,
      });
      continue;
    }

    // 4. Nhận diện Caption, Lời dẫn, Bối cảnh, Slugline (INT./EXT.):
    // Tiếng Việt: Lời dẫn, Dẫn chuyện, Người dẫn, Bối cảnh, Thời gian, Địa điểm
    // Tiếng Anh: Caption, Narrator, Narration, Voiceover, V.O., Location, Time, Setting
    const captionMatch =
      trimmed.match(
        /^(?:Lời dẫn truyện|Lời dẫn|Caption|Captions|Dẫn chuyện|Dẫn|Người dẫn chuyện|Người dẫn|Người kể|Người kể chuyện|Lời người kể|Thuyết minh|Hộp dẫn|Narrator|Narration|Narrative|Voiceover|Voice-over|Voice over|V\.O\.|VO|Bối cảnh|Thời gian|Địa điểm|Location|Setting|Time)\s*:\s*(.*)/i,
      ) ||
      trimmed.match(
        /^\[(?:Lời dẫn truyện|Lời dẫn|Caption|Captions|Dẫn chuyện|Dẫn|Người dẫn chuyện|Người dẫn|Người kể|Người kể chuyện|Lời người kể|Thuyết minh|Hộp dẫn|Narrator|Narration|Narrative|Voiceover|Voice-over|Voice over|V\.O\.|VO|Bối cảnh|Thời gian|Địa điểm|Location|Setting|Time)\s*:\s*(.*)\]$/i,
      );

    if (captionMatch) {
      rawBlocks.push({
        type: 'caption',
        pageNumber: String(currentPageIndex || 1).padStart(2, '0'),
        panelNumber:
          panelCountInPage > 0 ? `${currentPageIndex || 1}.${panelCountInPage}` : undefined,
        content: captionMatch[1].trim(),
      });
      continue;
    }

    // Sluglines (INT./EXT.) -> Chuyển thành Action/Stage direction, KHÔNG nhầm thành thoại
    if (/^(?:INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s+/i.test(trimmed)) {
      rawBlocks.push({
        type: 'action',
        pageNumber: String(currentPageIndex || 1).padStart(2, '0'),
        panelNumber:
          panelCountInPage > 0 ? `${currentPageIndex || 1}.${panelCountInPage}` : undefined,
        content: trimmed,
      });
      continue;
    }

    // 5. Nhận diện Thoại và Nhân vật:
    // Hỗ trợ cả:
    // - @Minh: "Thoại" hoặc @Minh: Thoại
    // - @Minh (thì thầm): "Thoại"
    // - MINH: Thoại hoặc Minh: "Thoại"
    // - Minh (thì thầm): Thoại hoặc Minh / Hét: Thoại
    // - Minh nói: "Thoại"
    // - John (thinking): "What's that?"
    const dialogueWithAt = trimmed.match(/^@([^:"“”]+?)\s*:\s*(?:["“]([^"”]+)["”]|(.+))$/u);
    if (dialogueWithAt) {
      const rawChar = dialogueWithAt[1].trim();
      const speakerName = extractSpeakerName(rawChar) || rawChar;
      const parensMatch = rawChar.match(/\(([^()]*)\)/);
      const dialogueText = (dialogueWithAt[2] || dialogueWithAt[3] || '').trim();
      rawBlocks.push({
        type: 'dialogue',
        character: speakerName,
        parens: parensMatch ? parensMatch[1].trim() : undefined,
        pageNumber: String(currentPageIndex || 1).padStart(2, '0'),
        panelNumber:
          panelCountInPage > 0 ? `${currentPageIndex || 1}.${panelCountInPage}` : undefined,
        content: dialogueText,
      });
      continue;
    }

    // TÊN: thoại | Tên (cảm xúc): "thoại" | Tên / Hét: thoại | Tên nói: "thoại"
    const speakerDialogueMatch = trimmed.match(/^([^:"“”]{2,60}?)\s*:\s*(.+)$/u);
    const rawSpeaker = speakerDialogueMatch ? speakerDialogueMatch[1].trim().replace(/^@/, '') : '';
    const speakerName = extractSpeakerName(rawSpeaker);
    if (speakerDialogueMatch && speakerName) {
      const dialogueContent = speakerDialogueMatch[2]
        .trim()
        .replace(/^["“](.*)["”]$/u, '$1')
        .trim();
      if (dialogueContent) {
        const parensMatch = rawSpeaker.match(/\(([^()]*)\)/);
        rawBlocks.push({
          type: 'dialogue',
          character: speakerName,
          parens: parensMatch ? parensMatch[1].trim() : undefined,
          pageNumber: String(currentPageIndex || 1).padStart(2, '0'),
          panelNumber:
            panelCountInPage > 0 ? `${currentPageIndex || 1}.${panelCountInPage}` : undefined,
          content: dialogueContent,
        });
        continue;
      }
    }

    // Hội thoại bắt đầu bằng gạch đầu dòng (vd: - "Chúng ta phải đi thôi!") hoặc ngoặc kép đứng riêng
    const quoteDialogueMatch = trimmed.match(/^(?:[-–—]\s*)?["“]([^"”]+)["”](?:\s*[-–—]\s*(.+))?$/u);
    if (quoteDialogueMatch) {
      const speech = quoteDialogueMatch[1].trim();
      const narrationOrAttribution = quoteDialogueMatch[2]?.trim();
      let speaker: string | undefined;
      let parens: string | undefined;

      if (narrationOrAttribution) {
        const attributionMatch = narrationOrAttribution.match(
          /\b([A-ZÀ-Ỹ][\w\p{L}'-]+(?:\s+[A-ZÀ-Ỹ][\w\p{L}'-]+)*)\s+(?:nói|hét|bảo|thì thầm|gọi|hỏi|đáp|trả lời|nghĩ|tự nhủ|quát|said|says|shouted|whispered|asked|replied)\b/iu,
        );
        if (attributionMatch && !NON_SPEAKER_KEYWORDS.has(attributionMatch[1].toLowerCase())) {
          speaker = attributionMatch[1].trim();
          if (/(?:nghĩ|tự nhủ|ngẫm nghĩ|thought|thinks?)/i.test(narrationOrAttribution)) {
            parens = 'suy nghĩ';
          }
        }
      }

      rawBlocks.push({
        type: 'dialogue',
        character: speaker,
        parens,
        pageNumber: String(currentPageIndex || 1).padStart(2, '0'),
        panelNumber:
          panelCountInPage > 0 ? `${currentPageIndex || 1}.${panelCountInPage}` : undefined,
        content: speech,
      });
      continue;
    }

    // 6. Mặc định là đoạn văn mô tả hành động (Action / Stage Direction)
    rawBlocks.push({
      type: 'action',
      pageNumber: String(currentPageIndex || 1).padStart(2, '0'),
      panelNumber:
        panelCountInPage > 0 ? `${currentPageIndex || 1}.${panelCountInPage}` : undefined,
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
 * Chuyển đổi văn bản kịch bản thành mảng TipTap Node JSON dành cho ScreenplayFlowEditor
 * (sử dụng scriptLineBlock với các thuộc tính blockType chuẩn, neo vào Page & Panel)
 */
export function convertScriptTextToScreenplayBlocks(
  scriptText: string,
  options?: ConverterAdapterOptions,
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

      case 'dialogue': {
        blockType = 'dialogue';
        const matched = block.character
          ? matchBibleCharacter(block.character, options?.characters)
          : null;
        speakerName = matched?.name || block.character || null;
        textToDisplay = `@${speakerName || 'Nhân vật'} : "${block.content}"`;
        break;
      }

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
export function countPagesAndPanels(scriptText: string): {
  pagesCount: number;
  panelsCount: number;
} {
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
  toPage: number,
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
      trimmed.match(/^(?:[!#📄]?\s*(?:Trang|Page)\s*(\d+))/iu) ||
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

/**
 * Chuyển đổi danh sách ParsedScriptBlock sang TipTap JSON nodes (node scriptLine mang attrs.el: GnElement).
 * Đây là schema chuẩn của PanelForge ScreenplayFlowEditor (WriterSolo Graphic Novel).
 */
export function convertBlocksToEditorNodes(
  blocks: ParsedScriptBlock[],
  options?: ConverterAdapterOptions,
): JSONContent[] {
  const nodes: JSONContent[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'page':
        nodes.push({
          type: 'scriptLine',
          attrs: { el: 'page' as GnElement },
          content: [],
        });
        break;

      case 'panel': {
        const direction = block.cameraAngle ? `[${block.cameraAngle}]` : '';
        nodes.push({
          type: 'scriptLine',
          attrs: { el: 'panel' as GnElement },
          content: direction ? [{ type: 'text', text: direction }] : [],
        });
        break;
      }

      case 'dialogue': {
        const rawChar = block.character || 'NHÂN VẬT';
        const { name, parens: labelParens } = splitSpeakerLabel(rawChar);
        const matched = matchBibleCharacter(name, options?.characters);
        const speakerName = (matched?.name || name).trim().toUpperCase();
        const parensText = block.parens || labelParens;

        nodes.push({
          type: 'scriptLine',
          attrs: { el: 'character' as GnElement },
          content: [{ type: 'text', text: `${speakerName}:` }],
        });

        if (parensText) {
          nodes.push({
            type: 'scriptLine',
            attrs: { el: 'parens' as GnElement },
            content: [{ type: 'text', text: parensText }],
          });
        }

        nodes.push({
          type: 'scriptLine',
          attrs: { el: 'dialogue' as GnElement },
          content: [{ type: 'text', text: block.content }],
        });
        break;
      }

      case 'sfx':
        nodes.push({
          type: 'scriptLine',
          attrs: { el: 'sfx' as GnElement },
          content: [{ type: 'text', text: block.content }],
        });
        break;

      case 'caption':
        nodes.push({
          type: 'scriptLine',
          attrs: { el: 'caption' as GnElement },
          content: [{ type: 'text', text: block.content }],
        });
        break;

      case 'action':
      default:
        nodes.push({
          type: 'scriptLine',
          attrs: { el: 'action' as GnElement },
          content: [{ type: 'text', text: block.content }],
        });
        break;
    }
  }

  if (nodes.length === 0) {
    nodes.push(
      { type: 'scriptLine', attrs: { el: 'page' as GnElement }, content: [] },
      { type: 'scriptLine', attrs: { el: 'panel' as GnElement }, content: [] },
    );
  }

  return nodes;
}

/**
 * Phân tích và chuyển đổi chuỗi kịch bản hoặc văn bản thô trực tiếp thành danh sách các node scriptLine của TipTap editor
 */
export function convertScriptTextToEditorNodes(
  scriptText: string,
  options?: ConverterAdapterOptions,
): JSONContent[] {
  const blocks = parseScriptTextToBlocks(scriptText, options);
  return convertBlocksToEditorNodes(blocks, options);
}
