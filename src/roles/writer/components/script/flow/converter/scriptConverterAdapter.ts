// src/roles/writer/components/script/flow/converter/scriptConverterAdapter.ts
import { generateGuid } from '../scriptFlowAdapter';
import { MangaBlockType } from '../types';

export interface ConverterAdapterOptions {
  startingPageNumber?: number;
  sceneId?: string;
  defaultNarrationMode?: 'Present' | 'VoiceOver' | 'Flashback';
}

interface ParsedScriptBlock {
  type: 'page' | 'panel' | 'dialogue' | 'sfx' | 'caption' | 'action';
  pageNumber?: string;
  panelNumber?: string;
  cameraAngle?: string;
  character?: string;
  content: string;
}

/**
 * Phân tích chuỗi kịch bản văn bản thuần thành danh sách các khối logic có cấu trúc
 */
export function parseScriptTextToBlocks(
  scriptText: string,
  options?: ConverterAdapterOptions
): ParsedScriptBlock[] {
  const lines = scriptText.split('\n');
  const blocks: ParsedScriptBlock[] = [];

  let currentPageIndex = 0;
  let panelCountInPage = 0;
  let pageOffset = options?.startingPageNumber ?? 1;
  let hasSetFirstPage = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // 1. Nhận diện Trang: "! Trang 1", "# Page 1", "Trang 01", "# 1"
    const pageMatch =
      trimmed.match(/^(?:[!#📄]?\s*(?:Trang|Page)?\s*(\d+))/i) ||
      trimmed.match(/^(?:Trang|Page)\s+(\d+)/i);

    const isPageLine =
      trimmed.startsWith('!') ||
      trimmed.startsWith('#') ||
      /^Trang\s+\d+/i.test(trimmed) ||
      /^Page\s+\d+/i.test(trimmed);

    if (isPageLine && pageMatch) {
      const parsedNum = parseInt(pageMatch[1], 10);
      if (!hasSetFirstPage) {
        // Nếu người dùng chọn startingPageNumber (ví dụ 3) mà text bắt đầu từ 1, áp dụng offset
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
      blocks.push({
        type: 'page',
        pageNumber: formattedPage,
        content: `Trang ${formattedPage}`,
      });
      continue;
    }

    // 2. Nhận diện Panel: '" Panel 1.1: [Toàn cảnh]', '- Panel 1.1: [Shot]', 'Panel 1.1'
    const panelMatch = trimmed.match(
      /^(?:[-"”]\s*)?(?:Panel|Khung|#panel)\s*(\d+(?:\.\d+)?)(?:\s*[:.-]?\s*\[(.*?)\]|\s*[:.-]?\s*(.*?))?$/i
    );

    const isPanelLine =
      trimmed.startsWith('"') ||
      trimmed.startsWith('”') ||
      trimmed.startsWith('-') ||
      /^Panel\s*[\d.]+/i.test(trimmed) ||
      /^Khung\s*[\d.]+/i.test(trimmed);

    if (isPanelLine && panelMatch) {
      panelCountInPage++;
      const pIdx = panelCountInPage;
      const pPage = currentPageIndex > 0 ? currentPageIndex : (options?.startingPageNumber || 1);
      const angle = (panelMatch[2] || panelMatch[3] || 'Toàn cảnh').trim().replace(/^[\[\(]|[\]\)]$/g, '') || 'Toàn cảnh';
      const pNumber = `${pPage}.${pIdx}`;

      blocks.push({
        type: 'panel',
        panelNumber: pNumber,
        cameraAngle: angle,
        content: `" Panel ${pNumber}: [${angle}]`,
      });
      continue;
    }

    // 3. Nhận diện Thoại: @Character: "Spoken line"
    const dialogueMatch = trimmed.match(/^@([\w\p{L}_-]+)\s*:\s*["“]([^"”]+)["”]$/u);
    if (dialogueMatch) {
      blocks.push({
        type: 'dialogue',
        character: dialogueMatch[1].trim(),
        content: dialogueMatch[2].trim(),
      });
      continue;
    }

    // 4. Nhận diện SFX: SFX: ... hoặc * BÙM *
    const sfxMatch = trimmed.match(/^(?:SFX:|\*)\s*(.*)/i);
    if (sfxMatch) {
      const sfxBody = sfxMatch[1].replace(/\*$/, '').trim().toUpperCase() || 'TIẾNG ĐỘNG';
      blocks.push({
        type: 'sfx',
        content: sfxBody,
      });
      continue;
    }

    // 5. Nhận diện Caption: Lời dẫn truyện: ... hoặc Caption: ...
    const captionMatch = trimmed.match(/^(?:Lời dẫn truyện|Lời dẫn|Caption|Dẫn chuyện):\s*(.*)/i);
    if (captionMatch) {
      blocks.push({
        type: 'caption',
        content: captionMatch[1].trim(),
      });
      continue;
    }

    // 6. Mặc định là đoạn văn mô tả hành động (Action / Stage Direction)
    blocks.push({
      type: 'action',
      content: trimmed,
    });
  }

  return blocks;
}

/**
 * Chuyển đổi văn bản kịch bản thành mảng TipTap Node JSON dành riêng cho ComicScriptEditor
 * (sử dụng pageBlock, panelBlock, dialogueBlock, sfxBlock, captionBlock, paragraph)
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
 * (sử dụng scriptLineBlock với các thuộc tính blockType chuẩn)
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
      },
      content: [{ type: 'text', text: textToDisplay }],
    });
  }

  return nodes;
}

