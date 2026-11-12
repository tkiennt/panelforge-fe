// src/roles/writer/components/script/flow/scriptFlowAdapter.ts
import { Selection } from '@tiptap/pm/state';
import { SceneDetailDto, NarrationMode } from '@/services/scriptLine.service';
import { PageDto } from '@/services/page.service';
import { PanelDto } from '@/types/pipeline';
import { BibleEntryDto } from '@/services/bible.service';
import { saveTempBibleCode } from './tempBibleCodes';
import { MangaBlockType } from './types';

/**
 * Sinh UUID v4 chuẩn RFC 4122 (tương thích Backend Guid)
 */
export function generateGuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Tự động đánh số lại toàn bộ Trang và Panel theo thứ tự xuất hiện từ trên xuống dưới
 * - Trang: TRANG 1, TRANG 2, ...
 * - Panel: PANEL 1.1, PANEL 1.2, ..., PANEL 2.1, PANEL 2.2, ...
 */
export function renumberTipTapDoc(doc: any): any {
  if (!doc || !doc.content || !Array.isArray(doc.content)) return doc;

  const clonedDoc = JSON.parse(JSON.stringify(doc));
  let sceneCounter = 0;
  let pageCounter = 0;
  let panelCounter = 0;

  for (const block of clonedDoc.content) {
    if (!block.attrs) block.attrs = {};
    const bType = block.attrs.blockType;

    if (bType === 'scene_heading') {
      sceneCounter++;
      block.attrs.sceneNumber = sceneCounter;

      let existingText = '';
      if (block.content && Array.isArray(block.content)) {
        existingText = block.content
          .map((c: any) => c.text || '')
          .join('')
          .trim();
      }
      // Giữ lại phần tiêu đề sau dấu : hoặc - nếu có
      const noteMatch = existingText.match(
        /^(?:[!#\s]*)?(?:CẢNH|SCENE)?\s*\d*(?:\s*[:\-]\s*(.*))?$/i,
      );
      const note = noteMatch && noteMatch[1] ? `: ${noteMatch[1].trim()}` : '';
      block.content = [{ type: 'text', text: `CẢNH ${sceneCounter}${note}`.toUpperCase() }];
    } else if (bType === 'page_heading') {
      pageCounter++;
      panelCounter = 0;
      block.attrs.pageNumber = pageCounter;

      let existingText = '';
      if (block.content && Array.isArray(block.content)) {
        existingText = block.content
          .map((c: any) => c.text || '')
          .join('')
          .trim();
      }
      // Giữ lại phần ghi chú sau dấu : hoặc - nếu có
      const noteMatch = existingText.match(
        /^(?:[!#\s]*)?(?:Page|Trang)?\s*\d*(?:\.\d+)?(?:\s*[:\-]\s*(.*))?$/i,
      );
      const note = noteMatch && noteMatch[1] ? `: ${noteMatch[1].trim()}` : '';
      block.content = [{ type: 'text', text: `TRANG ${pageCounter}${note}` }];
    } else if (bType === 'panel_heading') {
      panelCounter++;
      const pNum = pageCounter > 0 ? pageCounter : 1;
      block.attrs.pageNumber = pNum;
      block.attrs.panelNumber = panelCounter;

      let existingText = '';
      if (block.content && Array.isArray(block.content)) {
        existingText = block.content
          .map((c: any) => c.text || '')
          .join('')
          .trim();
      }
      const noteMatch = existingText.match(
        /^(?:[-"”#\s]*)?(?:Panel|Khung)?\s*\d*(?:\.\d+)?(?:\s*[:\-]\s*(.*))?$/i,
      );
      const note = noteMatch && noteMatch[1] ? `: ${noteMatch[1].trim()}` : '';
      block.content = [{ type: 'text', text: `PANEL ${pNum}.${panelCounter}${note}` }];
    } else if (bType !== 'scene_heading') {
      block.attrs.inPanel = panelCounter > 0;
      block.attrs.pageNumber = pageCounter > 0 ? pageCounter : 1;
      block.attrs.panelNumber = panelCounter;
    }
  }

  return clonedDoc;
}

/**
 * Đánh số lại trực tiếp trên Editor mà không làm phát sinh sự kiện lặp vòng
 */
export function renumberEditorState(editor: any, preferredPos?: number): boolean {
  if (!editor || !editor.state || !editor.commands) return false;
  const currentJson = editor.getJSON();
  const renumberedJson = renumberTipTapDoc(currentJson);
  if (JSON.stringify(currentJson) !== JSON.stringify(renumberedJson)) {
    const sel = editor.state.selection;
    const currentDocSize = editor.state.doc.content.size;
    const from = typeof preferredPos === 'number' ? preferredPos : (sel?.from ?? 1);
    const to = typeof preferredPos === 'number' ? preferredPos : (sel?.to ?? 1);

    // Đảm bảo selection hiện tại không vượt quá kích thước tài liệu trước khi setContent
    try {
      if (sel && (sel.from >= currentDocSize || sel.to >= currentDocSize)) {
        const clampPos = Math.max(1, currentDocSize - 1);
        editor.commands.setTextSelection(clampPos);
      }
    } catch {}

    editor.commands.setContent(renumberedJson, { emitUpdate: false });
    try {
      const maxPos = editor.state.doc.content.size;
      if (maxPos > 2) {
        const safeFrom = Math.max(1, Math.min(from, maxPos - 1));
        const safeTo = Math.max(1, Math.min(to, maxPos - 1));
        editor.commands.setTextSelection({ from: safeFrom, to: safeTo });
      }
    } catch {}
    try {
      editor.commands.focus();
    } catch {}
    return true;
  }
  return false;
}

const PANEL_SHOTS_4 = ['Toàn cảnh', 'Trung cảnh', 'Cận cảnh', 'Góc đặc tả'];
const PANEL_SHOTS_5 = ['Toàn cảnh', 'Trung cảnh', 'Cận cảnh', 'Góc nghiêng', 'Góc đặc tả'];

function scriptBlock(attrs: Record<string, unknown>, text?: string): any {
  return {
    type: 'scriptLineBlock',
    attrs: { scriptLineId: generateGuid(), narrationMode: 'Present', ...attrs },
    ...(text ? { content: [{ type: 'text', text }] } : {}),
  };
}

/**
 * Một Panel = tiêu đề + ô mô tả hành động + 1 ô lời thoại.
 * Hai ô sau để trống (hiển thị placeholder) nên nếu Writer không điền thì không bị lưu thành ScriptLine rác.
 */
export function createPanelSlotBlocks(
  pageNumber: number,
  panelNumber: number,
  shot: string = 'Toàn cảnh',
  sceneId?: string | null,
): any[] {
  const base = { sceneId: sceneId || null, pageNumber, panelNumber };
  return [
    scriptBlock(
      { ...base, blockType: 'panel_heading' as MangaBlockType },
      `" Panel ${pageNumber}.${panelNumber}: [${shot}]`,
    ),
    scriptBlock({ ...base, blockType: 'stage_direction' as MangaBlockType, inPanel: true }),
    scriptBlock({ ...base, blockType: 'dialogue' as MangaBlockType, inPanel: true }),
  ];
}

export function getDefaultPanelShot(panelNumber: number, panelsCount: number = 4): string {
  const shots = panelsCount === 5 ? PANEL_SHOTS_5 : PANEL_SHOTS_4;
  return shots[(panelNumber - 1) % shots.length];
}

/** Trang mới có sẵn 4 hoặc 5 Panel trống (4-koma/webtoon hoặc manga shonen). */
export function createStructuredMangaPageBlocks(
  pageNumber: number = 1,
  panelsCount: 4 | 5 = 4,
  sceneId?: string | null,
): any[] {
  const pStr = String(pageNumber).padStart(2, '0');
  const blocks: any[] = [
    scriptBlock(
      {
        sceneId: sceneId || null,
        blockType: 'page_heading' as MangaBlockType,
        pageNumber,
        panelNumber: 0,
      },
      `Trang ${pStr}`,
    ),
  ];
  for (let pNum = 1; pNum <= panelsCount; pNum++) {
    blocks.push(
      ...createPanelSlotBlocks(pageNumber, pNum, getDefaultPanelShot(pNum, panelsCount), sceneId),
    );
  }
  return blocks;
}

/**
 * Suy ra danh mục Bible từ tiền tố của mã định danh (CHR -> Character, LOC -> Location, PRP -> Prop, TRM -> Term/Concept...)
 */
export function inferCategoryFromCode(code: string): string {
  const upper = (code || '').toUpperCase();
  if (upper.startsWith('LOC-')) return 'Location';
  if (upper.startsWith('PRP-')) return 'Prop';
  if (upper.startsWith('TRM-')) return 'Terminology';
  if (upper.startsWith('CHR-')) return 'Character';
  return 'Character';
}

export const BIBLE_CODE_REGEX = /\(([A-Z]{2,4}-[A-Z0-9]+(?:-[A-Z0-9]+)*)\)/g;

/**
 * Tách chuỗi văn bản thành danh sách TipTap inline nodes (text + bibleMention).
 * Nhận diện mã dạng (CODE) theo regex chuẩn, tra cứu trong allBibleEntries:
 * - Có trong Bible -> isStub: false
 * - Không có -> isStub: true + đưa vào danh sách gợi ý mã tạm tempBibleCodes
 */
export function parseTextWithBibleMentions(
  text: string,
  allBibleEntries?: BibleEntryDto[],
  chapterNumber?: number,
): any[] {
  if (!text) return [];

  const regex = new RegExp(BIBLE_CODE_REGEX.source, 'g');
  const nodes: any[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const matchStart = match.index;
    const matchEnd = match.index + match[0].length;
    const code = match[1];

    if (matchStart > lastIndex) {
      nodes.push({
        type: 'text',
        text: text.slice(lastIndex, matchStart),
      });
    }

    const entry = (allBibleEntries || []).find((e) => e.code?.toLowerCase() === code.toLowerCase());

    if (entry) {
      nodes.push({
        type: 'bibleMention',
        attrs: {
          id: entry.id,
          label: entry.name,
          code: entry.code,
          category: entry.category ? String(entry.category) : inferCategoryFromCode(code),
          isLocked: entry.effectiveRevision?.reviewStatus === 'CanonLocked',
          isStub: false,
        },
      });
    } else {
      const cat = inferCategoryFromCode(code);
      saveTempBibleCode({
        code,
        name: code,
        category: cat,
        chapterNumber,
      });
      nodes.push({
        type: 'bibleMention',
        attrs: {
          id: code,
          label: code,
          code: code,
          category: cat,
          isLocked: false,
          isStub: true,
        },
      });
    }

    lastIndex = matchEnd;
  }

  if (lastIndex < text.length) {
    nodes.push({
      type: 'text',
      text: text.slice(lastIndex),
    });
  }

  return nodes;
}

const SFX_PREFIX = /^SFX\s*:\s*(.+)$/i;
const CAPTION_PREFIX = /^(?:Lời dẫn truyện|Lời dẫn|Caption|Dẫn chuyện)\s*:\s*(.+)$/i;

function normalizeSpeakerKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[\s_-]+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Nhân vật trong Series Bible theo tên hoặc mã, không phân biệt hoa thường / dấu. */
export function findBibleCharacter(name: string, entries?: BibleEntryDto[]): BibleEntryDto | null {
  if (!entries?.length) return null;
  const key = normalizeSpeakerKey(name);
  return (
    entries.find(
      (e) =>
        String(e.category) === 'Character' &&
        (normalizeSpeakerKey(e.name) === key ||
          (e.code ? normalizeSpeakerKey(e.code) === key : false)),
    ) ?? null
  );
}

export interface SpeakerLine {
  speakerName: string;
  speakerCharacterId: string | null;
  text: string;
  quoted: boolean;
}

/**
 * Tách dòng thoại lưu dạng "Tên: \"lời thoại\"" (cũng nhận "@Tên : ..." và "(MÃ) : ...") thành người nói + lời thoại.
 * Chỉ coi là tên người nói khi có @, là mã (MÃ), khớp nhân vật Bible, hoặc viết HOA — để "Bối cảnh: ..." vẫn là hành động.
 */
export function splitSpeakerLine(raw: string, entries?: BibleEntryDto[]): SpeakerLine | null {
  // Tên có thể kèm chỉ dẫn diễn xuất như kịch bản truyện tranh: "MALANDRO (OFF):", "Lan (thì thầm):"
  const m = raw
    .trim()
    .match(
      /^(@)?(\()?([\p{L}0-9_][\p{L}0-9_ .'-]{0,38}?)(\))?(?:\s*\(([^()]{1,24})\))?\s*:\s*([\s\S]*)$/u,
    );
  if (!m) return null;
  const [, at, open, rawName, close, modifier, rest] = m;
  const name = rawName.trim();
  if (name.split(/\s+/).length > 4) return null;
  const isCode = Boolean(open && close);
  const entry = findBibleCharacter(name, entries);
  const isCaps = /\p{L}/u.test(name) && name === name.toUpperCase();
  if (!at && !isCode && !entry && !isCaps) return null;

  const body = rest.trim();
  const quotedMatch = body.match(/^["“]([\s\S]*)["”]$/);
  return {
    speakerName: modifier ? `${entry?.name ?? name} (${modifier.trim()})` : (entry?.name ?? name),
    speakerCharacterId: entry?.id ?? null,
    text: (quotedMatch ? quotedMatch[1] : body).trim(),
    quoted: Boolean(quotedMatch),
  };
}

/** Định dạng lưu dialogueText giữ tương thích Bàn vẽ / Chèn chữ: Tên: "lời thoại" */
export function composeSpeakerLine(speakerName: string, text: string): string {
  return `${speakerName}: "${text.replace(/^["“]|["”]$/g, '').trim()}"`;
}

/**
 * Chuyển đổi từ danh sách Scene + ScriptLine của PanelForge sang cấu trúc TipTap Document JSON
 */
export function scenesToTipTapDoc(
  scenes: SceneDetailDto[],
  getSpeakerName?: (speakerId?: string | null) => string | null,
  pages?: PageDto[],
  panels?: PanelDto[],
  allBibleEntries?: BibleEntryDto[],
  chapterNumber?: number,
) {
  const content: any[] = [];
  const panelMap = new Map<string, PanelDto>();
  if (panels) {
    panels.forEach((p) => panelMap.set(p.id, p));
  }

  scenes.forEach((scene) => {
    // 1. Thêm Scene Heading
    content.push({
      type: 'scriptLineBlock',
      attrs: {
        scriptLineId: `scene_heading_${scene.id}`,
        sceneId: scene.id,
        sceneNumber: scene.sceneNumber,
        blockType: 'scene_heading' as MangaBlockType,
        lineOrder: 0,
        panelId: null,
      },
      content: [
        {
          type: 'text',
          text: `CẢNH ${scene.sceneNumber}: ${scene.heading || 'PHÂN ĐOẠN KHÔNG TÊN'}`.toUpperCase(),
        },
      ],
    });

    // 2. Thêm từng ScriptLine trong Scene
    if (!scene.scriptLines || scene.scriptLines.length === 0) {
      content.push(...createStructuredMangaPageBlocks(1, 4, scene.id));
    } else {
      scene.scriptLines.forEach((line, index) => {
        const associatedPanel = line.panelId ? panelMap.get(line.panelId) : undefined;
        const hasThumb = associatedPanel
          ? !!((associatedPanel as any).hasArtwork || (associatedPanel as any).thumbnailUrl)
          : false;

        // 1a. Dữ liệu cũ: lời thoại có ngoặc kép bị lưu nhầm thành chỉ dẫn ("(MÃ) : \"...\"", "TÊN: \"...\"")
        const legacyDialogue =
          line.stageDirection && !line.dialogueText
            ? splitSpeakerLine(line.stageDirection, allBibleEntries)
            : null;
        if (legacyDialogue?.quoted && legacyDialogue.text) {
          content.push({
            type: 'scriptLineBlock',
            attrs: {
              scriptLineId: line.id,
              sceneId: scene.id,
              blockType: 'dialogue' as MangaBlockType,
              speakerName: legacyDialogue.speakerName,
              speakerCharacterId: line.speakerCharacterId || legacyDialogue.speakerCharacterId,
              narrationMode: line.narrationMode || 'Present',
              lineOrder: index + 1,
              panelId: line.panelId || null,
              inPanel: Boolean(line.panelId),
            },
            content: parseTextWithBibleMentions(
              legacyDialogue.text,
              allBibleEntries,
              chapterNumber,
            ),
          });
          return;
        }

        // 1. Chỉ dẫn sân khấu / Tiêu đề trang / Panel / Tên nhân vật đứng riêng
        if (line.stageDirection) {
          const trimmed = line.stageDirection.trim();
          let detectedType: MangaBlockType = 'stage_direction';
          let body = line.stageDirection;
          const sfxPrefix = trimmed.match(SFX_PREFIX) || trimmed.match(/^\*\s*(.+?)\s*\*$/);
          const captionPrefix = trimmed.match(CAPTION_PREFIX);
          if (sfxPrefix) {
            detectedType = 'sfx';
            body = sfxPrefix[1];
          } else if (captionPrefix) {
            detectedType = 'caption';
            body = captionPrefix[1];
          } else if (
            /^(?:[#!]\s*(?:Trang|Page)?\s*\d+(?:\.\d+)?|(?:Trang|Page)\s+\d+(?:\.\d+)?)/i.test(
              trimmed,
            )
          ) {
            detectedType = 'page_heading';
          } else if (
            /^(?:(?:[-"”]\s*)?(?:Panel|Khung)\s*\d+(?:\.\d+)?|[-"”]\s*\d+(?:\.\d+)?|#panel\s*\d+(?:\.\d+)?)/i.test(
              trimmed,
            )
          ) {
            detectedType = 'panel_heading';
          } else if (/^(?:CẢNH\s+\d+|INT\.|EXT\.|SCENE\s+\d+)/i.test(trimmed)) {
            detectedType = 'scene_heading';
          } else if (
            trimmed.length >= 2 &&
            trimmed.length <= 30 &&
            trimmed === trimmed.toUpperCase() &&
            !trimmed.includes('.') &&
            !trimmed.includes(':') &&
            !trimmed.includes('-') &&
            !/^\d+$/.test(trimmed)
          ) {
            detectedType = 'character';
          }

          const blockContent =
            detectedType === 'page_heading' ||
            detectedType === 'panel_heading' ||
            detectedType === 'scene_heading' ||
            detectedType === 'character'
              ? [
                  {
                    type: 'text',
                    text: line.stageDirection,
                  },
                ]
              : parseTextWithBibleMentions(body, allBibleEntries, chapterNumber);

          content.push({
            type: 'scriptLineBlock',
            attrs: {
              scriptLineId: line.id,
              sceneId: scene.id,
              blockType: detectedType,
              speakerName: detectedType === 'character' ? trimmed : null,
              narrationMode: line.narrationMode || 'Present',
              lineOrder: index + 1,
              panelId: line.panelId || null,
              hasThumbnail: hasThumb,
              inPanel:
                detectedType !== 'page_heading' &&
                detectedType !== 'panel_heading' &&
                Boolean(line.panelId),
            },
            content: blockContent,
          });
        }

        // 2. Dòng người nói đứng riêng — chỉ khi không có lời thoại. Dòng thoại đã mang tên người nói
        // ("@Tên : ..."); thêm khối riêng sẽ bị lưu lại thành một ScriptLine trùng ở lần lưu sau.
        const resolvedSpeaker = getSpeakerName ? getSpeakerName(line.speakerCharacterId) : null;
        if (line.speakerCharacterId && resolvedSpeaker && !line.dialogueText) {
          content.push({
            type: 'scriptLineBlock',
            attrs: {
              scriptLineId: `${line.id}_speaker`,
              sceneId: scene.id,
              blockType: 'character' as MangaBlockType,
              speakerCharacterId: line.speakerCharacterId,
              speakerName: resolvedSpeaker,
              lineOrder: index + 1,
              panelId: line.panelId || null,
              inPanel: Boolean(line.panelId),
            },
            content: [
              {
                type: 'text',
                text: resolvedSpeaker.toUpperCase(),
              },
            ],
          });
        }

        // 3. Dòng thoại: tên người nói thành nhãn của khối, nội dung chỉ còn lời thoại
        if (line.dialogueText) {
          const split = splitSpeakerLine(line.dialogueText, allBibleEntries);
          const body = split
            ? split.text
            : line.dialogueText.trim().replace(/^["“]([\s\S]*)["”]$/, '$1');
          content.push({
            type: 'scriptLineBlock',
            attrs: {
              scriptLineId: line.id,
              sceneId: scene.id,
              blockType: 'dialogue' as MangaBlockType,
              speakerCharacterId: line.speakerCharacterId || split?.speakerCharacterId || null,
              speakerName: split?.speakerName || resolvedSpeaker || null,
              narrationMode: line.narrationMode || 'Present',
              lineOrder: index + 1,
              panelId: line.panelId || null,
              inPanel: Boolean(line.panelId),
            },
            content: parseTextWithBibleMentions(body, allBibleEntries, chapterNumber),
          });
        }
      });
    }
  });

  if (content.length === 0) {
    // Văn bản kịch bản trống ban đầu
    content.push({
      type: 'scriptLineBlock',
      attrs: {
        scriptLineId: generateGuid(),
        blockType: 'scene_heading',
        panelId: null,
      },
      content: [
        {
          type: 'text',
          text: 'CẢNH 1: MỞ ĐẦU',
        },
      ],
    });
    content.push(...createStructuredMangaPageBlocks(1, 4, null));
  }

  return renumberTipTapDoc({
    type: 'doc',
    content,
  });
}

export interface ExtractedScriptLinePayload {
  scriptLineId: string;
  sceneId: string;
  dialogueText?: string | null;
  stageDirection?: string | null;
  speakerCharacterId?: string | null;
  narrationMode: NarrationMode;
  lineOrder: number;
  blockType?: MangaBlockType;
  panelId?: string | null;
  pageNumber?: number;
  panelNumber?: number;
}

/**
 * Phân tích TipTap Document JSON thành danh sách ScriptLine cập nhật cho backend.
 * Tự động bỏ qua các khối rỗng hoàn toàn để tuân thủ quy tắc toàn vẹn của ScriptLine Entity ở Backend.
 * Tự động gán panelId cho các dòng nằm bên dưới một panel_heading.
 */
export function extractScriptLinesFromDoc(
  doc: any,
  defaultSceneId: string,
): ExtractedScriptLinePayload[] {
  if (!doc || !doc.content || !Array.isArray(doc.content)) return [];

  const results: ExtractedScriptLinePayload[] = [];
  let currentSceneId = defaultSceneId;
  let currentSpeakerId: string | null = null;
  let currentPanelId: string | null = null;
  let currentPageNumber = 1;
  let currentPanelNumber = 0;
  let order = 1;

  for (const block of doc.content) {
    const attrs = block.attrs || {};
    let text = '';
    if (block.content && Array.isArray(block.content)) {
      text = block.content
        .map((c: any) => {
          if (c.type === 'bibleMention') {
            const isPanel =
              c.attrs?.category === 'Panel' ||
              (c.attrs?.category && String(c.attrs.category).toLowerCase().includes('panel')) ||
              Boolean(c.attrs?.panelId);
            if (isPanel) {
              return c.attrs?.label || c.attrs?.code || '';
            }
            const code = c.attrs?.code || c.attrs?.label || '';
            return code ? `(${code})` : '';
          }
          return c.text || '';
        })
        .join('');
    }
    const textTrimmed = text.trim();
    if (!textTrimmed) continue;

    // Thoại có nhãn người nói (gõ "Tên:" hoặc nạp từ dữ liệu): lưu lại đúng định dạng Tên: "lời thoại"
    if (attrs.blockType === 'dialogue' && attrs.speakerName) {
      results.push({
        scriptLineId: attrs.scriptLineId || generateGuid(),
        sceneId: currentSceneId,
        dialogueText: composeSpeakerLine(attrs.speakerName, textTrimmed),
        stageDirection: null,
        speakerCharacterId: attrs.speakerCharacterId || null,
        narrationMode: attrs.narrationMode || 'Present',
        lineOrder: order++,
        panelId: currentPanelId || attrs.panelId || null,
        pageNumber: currentPageNumber,
        panelNumber: currentPanelNumber,
      });
      continue;
    }

    let effectiveBlockType: MangaBlockType = attrs.blockType || 'stage_direction';

    // Nhận diện cú pháp gõ tay thủ công
    if (
      /^(?:[#!]\s*(?:Trang|Page)?\s*\d+(?:\.\d+)?|(?:Trang|Page)\s+\d+(?:\.\d+)?|^[#!]\s*$)/i.test(
        textTrimmed,
      )
    ) {
      effectiveBlockType = 'page_heading';
    } else if (
      /^(?:(?:[-"”]\s*)?(?:Panel|Khung)\s*\d+(?:\.\d+)?|[-"”]\s*\d+(?:\.\d+)?|#panel\s*\d+(?:\.\d+)?|^[-"”]\s*$)/i.test(
        textTrimmed,
      )
    ) {
      effectiveBlockType = 'panel_heading';
    } else if (
      /^(?:[#!]\s*(?:CẢNH|SCENE)\s*\d+|CẢNH\s+\d+|INT\.|EXT\.|SCENE\s+\d+)/i.test(textTrimmed)
    ) {
      effectiveBlockType = 'scene_heading';
    } else if (/^(?:\*|SFX\s*:)/i.test(textTrimmed)) {
      effectiveBlockType = 'sfx';
    } else if (/^(?:CUT TO:|FADE OUT:|CHUYỂN CẢNH:)/i.test(textTrimmed)) {
      effectiveBlockType = 'transition';
    }

    if (effectiveBlockType === 'scene_heading') {
      const sceneMatch = textTrimmed.match(/(?:CẢNH|SCENE)\s*(\d+)/i);
      const parsedSceneNum = sceneMatch ? parseInt(sceneMatch[1], 10) : null;
      if (parsedSceneNum !== null && attrs.sceneNumber && attrs.sceneNumber !== parsedSceneNum) {
        currentSceneId = `scene_num_${parsedSceneNum}`;
      } else if (attrs.sceneId) {
        currentSceneId = attrs.sceneId;
      } else if (parsedSceneNum !== null) {
        currentSceneId = `scene_num_${parsedSceneNum}`;
      } else {
        currentSceneId = generateGuid();
      }

      results.push({
        scriptLineId: attrs.scriptLineId || `scene_heading_${currentSceneId}`,
        sceneId: currentSceneId,
        dialogueText: null,
        stageDirection: textTrimmed,
        speakerCharacterId: null,
        narrationMode: 'Present',
        lineOrder: 0,
        blockType: 'scene_heading',
      });
      continue;
    }

    if (effectiveBlockType === 'page_heading') {
      currentPageNumber = attrs.pageNumber || currentPageNumber + 1;
      currentPanelNumber = 0;
      currentPanelId = null;
      results.push({
        scriptLineId: attrs.scriptLineId || generateGuid(),
        sceneId: currentSceneId,
        dialogueText: null,
        stageDirection: textTrimmed,
        speakerCharacterId: null,
        narrationMode: attrs.narrationMode || 'Present',
        lineOrder: order++,
        panelId: null,
        pageNumber: currentPageNumber,
        panelNumber: 0,
      });
      continue;
    }

    if (effectiveBlockType === 'panel_heading') {
      currentPanelNumber = attrs.panelNumber || currentPanelNumber + 1;
      currentPanelId = attrs.panelId || null;
      results.push({
        scriptLineId: attrs.scriptLineId || generateGuid(),
        sceneId: currentSceneId,
        dialogueText: null,
        stageDirection: textTrimmed,
        speakerCharacterId: null,
        narrationMode: attrs.narrationMode || 'Present',
        lineOrder: order++,
        panelId: currentPanelId,
        pageNumber: currentPageNumber,
        panelNumber: currentPanelNumber,
      });
      continue;
    }

    // C. Nhận diện Lời dẫn truyện (Caption): "Lời dẫn truyện: ...", "Caption: ..."
    if (/^(?:Lời dẫn truyện|Lời dẫn|Caption|Dẫn chuyện)\s*:\s*([^"“].*)$/i.test(textTrimmed)) {
      results.push({
        scriptLineId: attrs.scriptLineId || generateGuid(),
        sceneId: currentSceneId,
        dialogueText: null,
        stageDirection: textTrimmed,
        speakerCharacterId: null,
        narrationMode: 'Present',
        lineOrder: order++,
        panelId: currentPanelId || attrs.panelId || null,
        pageNumber: currentPageNumber,
        panelNumber: currentPanelNumber,
      });
      continue;
    }

    // 0. Thoại gõ bằng @mention nhân vật: [mention] : "LỜI THOẠI" -> text đã thành "(CODE) : \"...\"".
    // Không có nhánh này thì dòng thoại bị lưu thành StageDirection và mất SpeakerCharacterId.
    const leadingMention =
      block.content?.[0]?.type === 'bibleMention' ? block.content[0].attrs : null;
    const mentionDialogueMatch =
      leadingMention && (!leadingMention.category || leadingMention.category === 'Character')
        ? textTrimmed.match(/^\([^)]+\)\s*:\s*["“](.*?)["”]$/u)
        : null;
    if (mentionDialogueMatch) {
      if (!mentionDialogueMatch[1].trim()) continue;
      results.push({
        scriptLineId: attrs.scriptLineId || generateGuid(),
        sceneId: currentSceneId,
        dialogueText: textTrimmed,
        stageDirection: null,
        speakerCharacterId: leadingMention.id || attrs.speakerCharacterId || currentSpeakerId,
        narrationMode: attrs.narrationMode || 'Present',
        lineOrder: order++,
        panelId: currentPanelId || attrs.panelId || null,
        pageNumber: currentPageNumber,
        panelNumber: currentPanelNumber,
      });
      currentSpeakerId = null;
      continue;
    }

    // 1. Nhận diện Thoại có cú pháp @SeriesBible : "LỜI THOẠI" (Bắt buộc có @ VÀ đóng mở ngoặc kép)
    const quotedDialogueMatch = textTrimmed.match(/^@([\w\p{L}_-]+)\s*:\s*["“](.*?)["”]$/u);
    // Bóng thoại chưa điền chữ (@Tên : "") không được lưu thành ScriptLine
    if (quotedDialogueMatch && !quotedDialogueMatch[2].trim()) continue;
    if (quotedDialogueMatch) {
      results.push({
        scriptLineId: attrs.scriptLineId || generateGuid(),
        sceneId: currentSceneId,
        dialogueText: textTrimmed,
        stageDirection: null,
        speakerCharacterId: attrs.speakerCharacterId || currentSpeakerId,
        narrationMode: attrs.narrationMode || 'Present',
        lineOrder: order++,
        panelId: currentPanelId || attrs.panelId || null,
        pageNumber: currentPageNumber,
        panelNumber: currentPanelNumber,
      });
      currentSpeakerId = null;
      continue;
    }

    // 2. Nhận diện Lời dẫn chuyện / Kể chuyện có tên người dẫn: @NgườiDẫn : Lời dẫn không có ngoặc kép
    const unquotedNarrationMatch = textTrimmed.match(/^@([\w\p{L}_-]+)\s*:\s*([^"“\s].*)$/u);
    if (unquotedNarrationMatch) {
      results.push({
        scriptLineId: attrs.scriptLineId || generateGuid(),
        sceneId: currentSceneId,
        dialogueText: null,
        stageDirection: textTrimmed,
        speakerCharacterId: attrs.speakerCharacterId || currentSpeakerId,
        narrationMode: 'Present',
        lineOrder: order++,
        panelId: currentPanelId || attrs.panelId || null,
        pageNumber: currentPageNumber,
        panelNumber: currentPanelNumber,
      });
      currentSpeakerId = null;
      continue;
    }

    // 3. Cú pháp cũ dự phòng: NHÂN VẬT: Thoại
    const dialogueWithSpeakerMatch = textTrimmed.match(
      /^([A-ZÀ-Ỹ0-9_\s]{2,30})(?:\/([a-zA-ZÀ-ỹ]+))?:\s*(.+)$/,
    );
    if (dialogueWithSpeakerMatch) {
      results.push({
        scriptLineId: attrs.scriptLineId || generateGuid(),
        sceneId: currentSceneId,
        dialogueText: textTrimmed,
        stageDirection: null,
        speakerCharacterId: attrs.speakerCharacterId || currentSpeakerId,
        narrationMode: attrs.narrationMode || 'Present',
        lineOrder: order++,
        panelId: currentPanelId || attrs.panelId || null,
        pageNumber: currentPageNumber,
        panelNumber: currentPanelNumber,
      });
      currentSpeakerId = null;
      continue;
    }

    const singleSpeakerMatch = textTrimmed.match(/^@([a-zA-ZÀ-Ỹ0-9_\s]{2,30})$/);
    if (singleSpeakerMatch || effectiveBlockType === 'character') {
      results.push({
        scriptLineId: attrs.scriptLineId || generateGuid(),
        sceneId: currentSceneId,
        dialogueText: null,
        stageDirection: textTrimmed,
        speakerCharacterId: attrs.speakerCharacterId || null,
        narrationMode: attrs.narrationMode || 'Present',
        lineOrder: order++,
        panelId: currentPanelId || attrs.panelId || null,
        pageNumber: currentPageNumber,
        panelNumber: currentPanelNumber,
      });
      currentSpeakerId = attrs.speakerCharacterId || null;
      continue;
    }

    if (effectiveBlockType === 'dialogue') {
      results.push({
        scriptLineId: attrs.scriptLineId || generateGuid(),
        sceneId: currentSceneId,
        dialogueText: textTrimmed,
        stageDirection: null,
        speakerCharacterId: attrs.speakerCharacterId || currentSpeakerId,
        narrationMode: attrs.narrationMode || 'Present',
        lineOrder: order++,
        panelId: currentPanelId || attrs.panelId || null,
        pageNumber: currentPageNumber,
        panelNumber: currentPanelNumber,
      });
      currentSpeakerId = null;
    } else if (
      effectiveBlockType === 'sfx' ||
      effectiveBlockType === 'stage_direction' ||
      effectiveBlockType === 'transition' ||
      effectiveBlockType === 'caption'
    ) {
      // Giữ loại dòng khi lưu: "SFX: ..." / "Lời dẫn: ..." (Bàn vẽ và lần mở sau đọc lại được)
      const typedText =
        effectiveBlockType === 'sfx' &&
        !SFX_PREFIX.test(textTrimmed) &&
        !/^\*.+\*$/.test(textTrimmed)
          ? `SFX: ${textTrimmed}`
          : effectiveBlockType === 'caption' && !CAPTION_PREFIX.test(textTrimmed)
            ? `Lời dẫn: ${textTrimmed}`
            : textTrimmed;
      results.push({
        scriptLineId: attrs.scriptLineId || generateGuid(),
        sceneId: currentSceneId,
        dialogueText: null,
        stageDirection: typedText,
        speakerCharacterId: null,
        narrationMode: attrs.narrationMode || 'Present',
        lineOrder: order++,
        panelId: currentPanelId || attrs.panelId || null,
        pageNumber: currentPageNumber,
        panelNumber: currentPanelNumber,
      });
    }
  }

  return results;
}
