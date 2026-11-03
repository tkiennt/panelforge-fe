// src/roles/writer/components/script/thumbnail-studio/lib/comicScriptParser.ts
import { LexoRank } from 'lexorank';
import {
  CameraShotType,
  ComicScriptAST,
  DialogueItem,
  PageNode,
  PanelNode,
  SceneNode,
  SoundEffectItem,
} from '../types';

/**
 * Phân tích chuỗi shot / camera hint thành CameraShotType chuẩn
 */
export function normalizeCameraShot(shotHint?: string | null): CameraShotType {
  if (!shotHint) return 'unknown';
  const clean = shotHint.toLowerCase().trim();

  if (
    clean.includes('extreme wide') ||
    clean.includes('extreme_wide') ||
    clean.includes('cực rộng') ||
    clean.includes('đại toàn cảnh')
  ) {
    return 'extreme_wide';
  }
  if (
    clean.includes('wide') ||
    clean.includes('toàn cảnh') ||
    clean.includes('rộng') ||
    clean.includes('long shot')
  ) {
    return 'wide';
  }
  if (
    clean.includes('extreme close') ||
    clean.includes('extreme_close_up') ||
    clean.includes('siêu cận') ||
    clean.includes('đặc tả')
  ) {
    return 'extreme_close_up';
  }
  if (
    clean.includes('close up') ||
    clean.includes('close-up') ||
    clean.includes('close_up') ||
    clean.includes('cận cảnh') ||
    clean.includes('gần')
  ) {
    return 'close_up';
  }
  if (
    clean.includes('medium') ||
    clean.includes('trung cảnh') ||
    clean.includes('vừa') ||
    clean.includes('mid shot')
  ) {
    return 'medium';
  }
  if (
    clean.includes('pov') ||
    clean.includes('point of view') ||
    clean.includes('góc nhìn')
  ) {
    return 'pov';
  }

  return 'unknown';
}

/**
 * Phân tích modifier của lời thoại (ví dụ: shout, thought, whisper, v.v.)
 */
export function parseDialogueModifier(
  rawMod?: string | null
): DialogueItem['modifier'] {
  if (!rawMod) return undefined;
  const mod = rawMod.toLowerCase().trim();

  if (mod.includes('thought') || mod.includes('nghĩ') || mod.includes('suy nghĩ')) {
    return 'thought';
  }
  if (mod.includes('shout') || mod.includes('hét') || mod.includes('la lớn') || mod.includes('yell')) {
    return 'shout';
  }
  if (mod.includes('whisper') || mod.includes('thì thầm') || mod.includes('nói nhỏ')) {
    return 'whisper';
  }
  if (mod.includes('off_panel') || mod.includes('off-panel') || mod.includes('ngoài khung') || mod.includes('os') || mod.includes('o.s.')) {
    return 'off_panel';
  }
  if (mod.includes('filter') || mod.includes('điện thoại') || mod.includes('radio') || mod.includes('loa')) {
    return 'filter';
  }

  return undefined;
}

/**
 * Trình phân tích cú pháp kịch bản Comic/Manga/Webtoon hai chiều (AST Parser)
 * Không bao giờ crash khi gặp đầu vào bất thường hoặc dòng chưa gõ xong.
 */
export function parseComicScript(rawText: string): ComicScriptAST {
  const scenes: SceneNode[] = [];
  const pages: PageNode[] = [];

  if (!rawText || typeof rawText !== 'string') {
    return { scenes, pages };
  }

  const lines = rawText.split(/\r?\n/);

  let currentScene: SceneNode | null = null;
  let currentPage: PageNode | null = null;
  let currentPanel: PanelNode | null = null;
  let actionLinesBuffer: string[] = [];

  let rankCursor = LexoRank.middle();

  const flushActionBuffer = () => {
    if (currentPanel && actionLinesBuffer.length > 0) {
      const merged = actionLinesBuffer.join('\n').trim();
      if (merged) {
        currentPanel.actionDescription = currentPanel.actionDescription
          ? `${currentPanel.actionDescription}\n${merged}`
          : merged;
      }
      actionLinesBuffer = [];
    }
  };

  lines.forEach((rawLine, lineIndex) => {
    const line = rawLine.trim();

    // Dòng trống: nếu đang trong panel, phân tách các đoạn mô tả
    if (!line) {
      if (actionLinesBuffer.length > 0) {
        flushActionBuffer();
      }
      return;
    }

    // 1. SCENE HEADER: EXT. hoặc INT. hoặc SCENE <title>
    const sceneMatch = line.match(/^(?:(EXT\.|INT\.|EXT\/INT\.|I\/E\.)\s*(.*)|SCENE\s+(.*))$/i);
    if (sceneMatch) {
      flushActionBuffer();

      const slug = sceneMatch[1] ? `${sceneMatch[1].toUpperCase()} ${sceneMatch[2]}` : sceneMatch[3];
      const sceneId = `scene-${scenes.length + 1}-${lineIndex}`;

      // Tách location và time of day nếu có dấu "-"
      let location = slug;
      let timeOfDay: string | undefined;
      let weather: string | undefined;

      const dashParts = slug.split('-');
      if (dashParts.length > 1) {
        location = dashParts[0].trim();
        timeOfDay = dashParts[1].trim();
      }

      // Nhận diện thời tiết nếu có ngoặc đơn (e.g. RAIN)
      const weatherMatch = slug.match(/\((.*?)\)/);
      if (weatherMatch) {
        weather = weatherMatch[1].trim();
      }

      currentScene = {
        id: sceneId,
        title: slug.trim(),
        slugline: slug.trim(),
        environment: {
          location,
          timeOfDay,
          weather,
        },
        startLineIndex: lineIndex,
      };
      scenes.push(currentScene);
      return;
    }

    // 2. PAGE BREAK: # Page <number> hoặc # <number>
    const pageMatch = line.match(/^#\s*(?:Page\s*)?(\d+(?:\.\d+)?)(.*)$/i);
    if (pageMatch) {
      flushActionBuffer();

      const parsedPageNum = parseFloat(pageMatch[1]) || (pages.length + 1);
      const pageId = `page-${parsedPageNum}-${lineIndex}`;

      // Sinh LexoRank tăng dần
      const pageRank = pages.length === 0 ? rankCursor.toString() : (rankCursor = rankCursor.genNext()).toString();

      currentPage = {
        id: pageId,
        pageNumber: parsedPageNum,
        orderRank: pageRank,
        sceneId: currentScene?.id,
        panels: [],
        startLineIndex: lineIndex,
      };
      pages.push(currentPage);
      currentPanel = null;
      return;
    }

    // 3. PANEL BREAK: - Panel <number>[: optional shot/camera] hoặc - <number>
    // Regex: /^-\s*(?:Panel\s*)?(\d+)?(?:\s*:\s*(.*))?$/i
    const panelMatch = line.match(/^-\s*(?:Panel\s*)?(\d+(?:\.\d+)?)?(?:\s*:\s*(.*))?$/i);
    if (panelMatch) {
      flushActionBuffer();

      // Nếu chưa có Page nào được khai báo trước đó, tự động tạo Page 1 ảo để chứa panel
      if (!currentPage) {
        currentPage = {
          id: `page-1-auto`,
          pageNumber: 1,
          orderRank: rankCursor.toString(),
          sceneId: currentScene?.id,
          panels: [],
          startLineIndex: lineIndex,
        };
        pages.push(currentPage);
      }

      const pNum = panelMatch[1]
        ? parseInt(panelMatch[1], 10)
        : currentPage.panels.length + 1;
      const cameraHint = panelMatch[2]?.trim() || undefined;
      const shotType = normalizeCameraShot(cameraHint);

      currentPanel = {
        id: `panel-${currentPage.pageNumber}-${pNum}-${lineIndex}`,
        panelNumber: pNum,
        shotType,
        actionDescription: '',
        dialogues: [],
        sfx: [],
        cameraNote: cameraHint,
        startLineIndex: lineIndex,
      };

      currentPage.panels.push(currentPanel);
      return;
    }

    // 4. SOUND EFFECT (SFX): Bắt đầu bằng * hoặc SFX:
    const sfxMatch = line.match(/^(?:\*\s*(.+?)\*?|SFX\s*:\s*(.+))$/i);
    if (sfxMatch) {
      flushActionBuffer();

      const sfxText = (sfxMatch[1] || sfxMatch[2] || '').trim();
      const sfxItem: SoundEffectItem = {
        id: `sfx-${lineIndex}`,
        text: sfxText,
      };

      // Đảm bảo có panel hiện tại để gắn vào
      if (!currentPanel) {
        if (!currentPage) {
          currentPage = {
            id: `page-1-auto`,
            pageNumber: 1,
            orderRank: rankCursor.toString(),
            sceneId: currentScene?.id,
            panels: [],
            startLineIndex: lineIndex,
          };
          pages.push(currentPage);
        }
        currentPanel = {
          id: `panel-${currentPage.pageNumber}-1-auto`,
          panelNumber: 1,
          shotType: 'unknown',
          actionDescription: '',
          dialogues: [],
          sfx: [],
          startLineIndex: lineIndex,
        };
        currentPage.panels.push(currentPanel);
      }

      currentPanel.sfx.push(sfxItem);
      return;
    }

    // 5. DIALOGUE: Line pattern <CHARACTER_NAME>(/<MODIFIER>)?:\s*<DIALOGUE_TEXT>
    // Hỗ trợ cả MINH/Shout: ... và MINH (thì thầm): ...
    const dialogueMatch = line.match(/^([A-ZÀ-Ỹ0-9_\s]+)(?:[\/\(]([A-Za-zÀ-ỹ\s]+)[\)]?)?:\s*(.+)$/);
    if (dialogueMatch) {
      flushActionBuffer();

      const charName = dialogueMatch[1].trim();
      const rawModifier = dialogueMatch[2]?.trim();
      const dialogueText = dialogueMatch[3].trim();
      const modifier = parseDialogueModifier(rawModifier);

      const dialogueItem: DialogueItem = {
        id: `diag-${lineIndex}`,
        character: charName,
        modifier,
        text: dialogueText,
      };

      if (!currentPanel) {
        if (!currentPage) {
          currentPage = {
            id: `page-1-auto`,
            pageNumber: 1,
            orderRank: rankCursor.toString(),
            sceneId: currentScene?.id,
            panels: [],
            startLineIndex: lineIndex,
          };
          pages.push(currentPage);
        }
        currentPanel = {
          id: `panel-${currentPage.pageNumber}-1-auto`,
          panelNumber: 1,
          shotType: 'unknown',
          actionDescription: '',
          dialogues: [],
          sfx: [],
          startLineIndex: lineIndex,
        };
        currentPage.panels.push(currentPanel);
      }

      currentPanel.dialogues.push(dialogueItem);
      return;
    }

    // 6. ACTION / DESCRIPTION: Bất kỳ đoạn văn nào bên trong Panel không trùng các mẫu trên
    if (!currentPanel) {
      if (!currentPage) {
        currentPage = {
          id: `page-1-auto`,
          pageNumber: 1,
          orderRank: rankCursor.toString(),
          sceneId: currentScene?.id,
          panels: [],
          startLineIndex: lineIndex,
        };
        pages.push(currentPage);
      }
      currentPanel = {
        id: `panel-${currentPage.pageNumber}-1-auto`,
        panelNumber: 1,
        shotType: 'unknown',
        actionDescription: '',
        dialogues: [],
        sfx: [],
        startLineIndex: lineIndex,
      };
      currentPage.panels.push(currentPanel);
    }

    actionLinesBuffer.push(line);
  });

  // Flush buffer dòng hành động cuối cùng
  flushActionBuffer();

  return {
    scenes,
    pages,
  };
}

/**
 * Tính toán LexoRank và chèn một Transition Page (Bridge Page) trung gian
 * Giúp chèn trang đệm (ví dụ Page 1.5) mà không phải đánh chỉ mục lại toàn bộ các trang sau!
 */
export function insertTransitionPageStub(
  rawScript: string,
  afterPageNumber: number,
  prevRankStr: string,
  nextRankStr?: string
): { newScript: string; newRank: string; newPageNumber: number } {
  let newRank: LexoRank;
  try {
    const prevRank = LexoRank.parse(prevRankStr);
    if (nextRankStr) {
      const nextRank = LexoRank.parse(nextRankStr);
      newRank = prevRank.between(nextRank);
    } else {
      newRank = prevRank.genNext();
    }
  } catch {
    newRank = LexoRank.middle();
  }

  const newPageNumber = afterPageNumber + 0.5;

  const stub = `\n\n# Page ${newPageNumber} [Transition]\n- Panel 1: Medium shot\nKhung cảnh chuyển tiếp nhịp điệu câu chuyện.\n`;

  // Tìm vị trí của trang sau đó hoặc chèn vào cuối kịch bản
  const pageRegex = new RegExp(`^#\\s*(?:Page\\s*)?${afterPageNumber}(?:\\s|$)`, 'im');
  const lines = rawScript.split(/\r?\n/);
  let insertLineIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    if (pageRegex.test(lines[i])) {
      // Tìm trang tiếp theo để chèn vào trước trang tiếp theo
      let foundNextPage = false;
      for (let j = i + 1; j < lines.length; j++) {
        if (/^#\s*(?:Page\s*)?\d+/i.test(lines[j])) {
          insertLineIdx = j;
          foundNextPage = true;
          break;
        }
      }
      if (!foundNextPage) {
        insertLineIdx = lines.length;
      }
      break;
    }
  }

  if (insertLineIdx === -1) {
    return {
      newScript: `${rawScript.trim()}${stub}`,
      newRank: newRank.toString(),
      newPageNumber,
    };
  }

  lines.splice(insertLineIdx, 0, stub.trim());
  return {
    newScript: lines.join('\n'),
    newRank: newRank.toString(),
    newPageNumber,
  };
}


/**
 * Chuyển đổi từ cấu trúc Scene + ScriptLine của PanelForge sang văn bản Comic Script chuẩn cho parser
 */
export function scenesToComicScriptText(
  scenes: Array<{
    id: string;
    sceneNumber: number;
    heading?: string | null;
    scriptLines?: Array<{
      id: string;
      lineOrder: number;
      dialogueText?: string | null;
      stageDirection?: string | null;
      speakerCharacterId?: string | null;
      narrationMode?: string;
    }>;
  }>,
  getSpeakerName?: (id?: string | null) => string | null
): string {
  const result: string[] = [];

  scenes.forEach((scene) => {
    result.push(`EXT. CẢNH ${scene.sceneNumber}: ${scene.heading || 'PHÂN ĐOẠN KHÔNG TÊN'}`);
    result.push('');

    let currentPage = 1;
    result.push(`# Page ${currentPage}`);

    const lines = scene.scriptLines || [];
    if (lines.length === 0) {
      result.push(`- Panel 1: Toàn cảnh`);
      result.push(`Khởi đầu phân cảnh ${scene.sceneNumber}.`);
      result.push('');
    } else {
      lines.forEach((l, idx) => {
        const shotHint = l.narrationMode || 'Trung cảnh';
        result.push(`- Panel ${idx + 1}: ${shotHint}`);

        if (l.stageDirection) {
          result.push(l.stageDirection);
        }

        if (l.dialogueText) {
          const speaker = (getSpeakerName ? getSpeakerName(l.speakerCharacterId) : null) || 'NHÂN VẬT';
          result.push(`${speaker}: ${l.dialogueText}`);
        }
        result.push('');
      });
    }
  });

  return result.join('\n');
}
