// src/roles/writer/components/script/flow/scriptFlowAdapter.ts
import { SceneDetailDto, NarrationMode } from '@/services/scriptLine.service';
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
 * Chuyển đổi từ danh sách Scene + ScriptLine của PanelForge sang cấu trúc TipTap Document JSON
 */
export function scenesToTipTapDoc(
  scenes: SceneDetailDto[],
  getSpeakerName?: (speakerId?: string | null) => string | null
) {
  const content: any[] = [];

  scenes.forEach((scene) => {
    // 1. Thêm Scene Heading
    content.push({
      type: 'scriptLineBlock',
      attrs: {
        scriptLineId: `scene_heading_${scene.id}`,
        sceneId: scene.id,
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
      content.push({
        type: 'scriptLineBlock',
        attrs: {
          scriptLineId: generateGuid(),
          sceneId: scene.id,
          blockType: 'page_heading' as MangaBlockType,
          narrationMode: 'Present',
          lineOrder: 1,
          panelId: null,
        },
        content: [
          {
            type: 'text',
            text: '# Page 1',
          },
        ],
      });
      content.push({
        type: 'scriptLineBlock',
        attrs: {
          scriptLineId: generateGuid(),
          sceneId: scene.id,
          blockType: 'panel_heading' as MangaBlockType,
          narrationMode: 'Present',
          lineOrder: 2,
          panelId: null,
        },
        content: [
          {
            type: 'text',
            text: '- Panel 1.1: Toàn cảnh',
          },
        ],
      });
      content.push({
        type: 'scriptLineBlock',
        attrs: {
          scriptLineId: generateGuid(),
          sceneId: scene.id,
          blockType: 'stage_direction' as MangaBlockType,
          narrationMode: 'Present',
          lineOrder: 3,
          panelId: null,
        },
        content: [
          {
            type: 'text',
            text: 'Mô tả bối cảnh và hành động của khung hình 1.1...',
          },
        ],
      });
    } else {
      scene.scriptLines.forEach((line, index) => {
        // 1. Chỉ dẫn sân khấu / Tiêu đề trang / Panel / Tên nhân vật đứng riêng
        if (line.stageDirection) {
          const trimmed = line.stageDirection.trim();
          let detectedType: MangaBlockType = 'stage_direction';
          if (/^(?:#\s*(?:Page\s*)?\d+(?:\.\d+)?|(?:Trang|Page)\s+\d+(?:\.\d+)?)/i.test(trimmed)) {
            detectedType = 'page_heading';
          } else if (/^(?:(?:-\s*)?(?:Panel|Khung)\s*\d+(?:\.\d+)?|-\s*\d+(?:\.\d+)?|#panel\s*\d+(?:\.\d+)?)/i.test(trimmed)) {
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
            },
            content: [
              {
                type: 'text',
                text: line.stageDirection,
              },
            ],
          });
        }

        // 2. Dòng người nói (nếu có speaker liên kết)
        const resolvedSpeaker = getSpeakerName ? getSpeakerName(line.speakerCharacterId) : null;
        if (line.speakerCharacterId && resolvedSpeaker) {
          content.push({
            type: 'scriptLineBlock',
            attrs: {
              scriptLineId: `${line.id}_speaker`,
              sceneId: scene.id,
              blockType: 'character' as MangaBlockType,
              speakerCharacterId: line.speakerCharacterId,
              speakerName: resolvedSpeaker,
              lineOrder: index + 1,
              panelId: null,
            },
            content: [
              {
                type: 'text',
                text: resolvedSpeaker.toUpperCase(),
              },
            ],
          });
        }

        // 3. Dòng thoại chính
        if (line.dialogueText) {
          let formattedDialogue = line.dialogueText;
          if (resolvedSpeaker && !formattedDialogue.includes(':') && !formattedDialogue.startsWith('@')) {
            formattedDialogue = `@${resolvedSpeaker} : "${formattedDialogue}"`;
          }
          content.push({
            type: 'scriptLineBlock',
            attrs: {
              scriptLineId: line.id,
              sceneId: scene.id,
              blockType: 'dialogue' as MangaBlockType,
              speakerCharacterId: line.speakerCharacterId || null,
              speakerName: resolvedSpeaker || null,
              narrationMode: line.narrationMode || 'Present',
              lineOrder: index + 1,
              panelId: line.panelId || null,
            },
            content: [
              {
                type: 'text',
                text: formattedDialogue || line.dialogueText,
              },
            ],
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
    content.push({
      type: 'scriptLineBlock',
      attrs: {
        scriptLineId: generateGuid(),
        blockType: 'page_heading',
        panelId: null,
      },
      content: [
        {
          type: 'text',
          text: '# Page 1',
        },
      ],
    });
    content.push({
      type: 'scriptLineBlock',
      attrs: {
        scriptLineId: generateGuid(),
        blockType: 'panel_heading',
        panelId: null,
      },
      content: [
        {
          type: 'text',
          text: '- Panel 1.1: Toàn cảnh',
        },
      ],
    });
  }

  return {
    type: 'doc',
    content,
  };
}

export interface ExtractedScriptLinePayload {
  scriptLineId: string;
  sceneId: string;
  dialogueText?: string | null;
  stageDirection?: string | null;
  speakerCharacterId?: string | null;
  narrationMode: NarrationMode;
  lineOrder: number;
}

/**
 * Phân tích TipTap Document JSON thành danh sách ScriptLine cập nhật cho backend.
 * Tự động bỏ qua các khối rỗng hoàn toàn để tuân thủ quy tắc toàn vẹn của ScriptLine Entity ở Backend.
 * Tự động nhận diện cú pháp khi người dùng gõ tay mà chưa chọn loại khối từ bảng công cụ.
 */
export function extractScriptLinesFromDoc(doc: any, defaultSceneId: string): ExtractedScriptLinePayload[] {
  if (!doc || !doc.content || !Array.isArray(doc.content)) return [];

  const results: ExtractedScriptLinePayload[] = [];
  let currentSceneId = defaultSceneId;
  let currentSpeakerId: string | null = null;
  let order = 1;

  for (const block of doc.content) {
    // Trích xuất toàn bộ khối có văn bản, không bỏ sót paragraph hay block tự gõ
    const attrs = block.attrs || {};
    let text = '';
    if (block.content && Array.isArray(block.content)) {
      text = block.content.map((c: any) => c.text || c.attrs?.label || '').join('');
    }
    const textTrimmed = text.trim();
    if (!textTrimmed) continue;

    let effectiveBlockType: MangaBlockType = attrs.blockType || 'dialogue';

    // Nhận diện tự động dự phòng nếu người dùng gõ thuần mà chưa đổi blockType
    if (/^(?:#\s*(?:Page\s*)?\d+(?:\.\d+)?|(?:Trang|Page)\s+\d+(?:\.\d+)?)/i.test(textTrimmed)) {
      effectiveBlockType = 'page_heading';
    } else if (/^(?:(?:-\s*)?(?:Panel|Khung)\s*\d+(?:\.\d+)?|-\s*\d+(?:\.\d+)?|#panel\s*\d+(?:\.\d+)?)/i.test(textTrimmed)) {
      effectiveBlockType = 'panel_heading';
    } else if (/^(?:CẢNH\s+\d+|INT\.|EXT\.|SCENE\s+\d+)/i.test(textTrimmed)) {
      effectiveBlockType = 'scene_heading';
    } else if (/^(?:\*|SFX\s*:)/i.test(textTrimmed)) {
      effectiveBlockType = 'stage_direction';
    } else if (/^(?:CUT TO:|FADE OUT:|CHUYỂN CẢNH:)/i.test(textTrimmed)) {
      effectiveBlockType = 'transition';
    }

    if (effectiveBlockType === 'scene_heading') {
      if (attrs.sceneId) currentSceneId = attrs.sceneId;
      continue;
    }

    if (effectiveBlockType === 'page_heading' || effectiveBlockType === 'panel_heading') {
      results.push({
        scriptLineId: attrs.scriptLineId || generateGuid(),
        sceneId: attrs.sceneId || currentSceneId,
        dialogueText: null,
        stageDirection: textTrimmed,
        speakerCharacterId: null,
        narrationMode: attrs.narrationMode || 'Present',
        lineOrder: order++,
      });
      continue;
    }

    // 1. Nhận diện Thoại có cú pháp @SeriesBible : "LỜI THOẠI" hoặc TÊN : "LỜI THOẠI" (Bắt buộc có dấu ngoặc kép)
    const quotedDialogueMatch = textTrimmed.match(/^@?([a-zA-ZÀ-Ỹ0-9_\s]{2,30})\s*:\s*["“](.*?)["”]?$/);
    if (quotedDialogueMatch) {
      results.push({
        scriptLineId: attrs.scriptLineId || generateGuid(),
        sceneId: attrs.sceneId || currentSceneId,
        dialogueText: textTrimmed,
        stageDirection: null,
        speakerCharacterId: attrs.speakerCharacterId || currentSpeakerId,
        narrationMode: attrs.narrationMode || 'Present',
        lineOrder: order++,
      });
      currentSpeakerId = null;
      continue;
    }

    // 2. Nhận diện Lời dẫn chuyện / Kể chuyện có tên người dẫn: @NgườiDẫn : Lời dẫn không có ngoặc kép
    const unquotedNarrationMatch = textTrimmed.match(/^@?([a-zA-ZÀ-Ỹ0-9_\s]{2,30})\s*:\s*([^"“\s].*)$/);
    if (unquotedNarrationMatch) {
      results.push({
        scriptLineId: attrs.scriptLineId || generateGuid(),
        sceneId: attrs.sceneId || currentSceneId,
        dialogueText: null,
        stageDirection: textTrimmed,
        speakerCharacterId: attrs.speakerCharacterId || currentSpeakerId,
        narrationMode: 'Voiceover',
        lineOrder: order++,
      });
      currentSpeakerId = null;
      continue;
    }

    // 3. Cú pháp cũ dự phòng: NHÂN VẬT: Thoại
    const dialogueWithSpeakerMatch = textTrimmed.match(/^([A-ZÀ-Ỹ0-9_\s]{2,30})(?:\/([a-zA-ZÀ-ỹ]+))?:\s*(.+)$/);
    if (dialogueWithSpeakerMatch) {
      results.push({
        scriptLineId: attrs.scriptLineId || generateGuid(),
        sceneId: attrs.sceneId || currentSceneId,
        dialogueText: textTrimmed, // Giữ nguyên toàn bộ cú pháp để khi nạp lại không bị mất tên nhân vật
        stageDirection: null,
        speakerCharacterId: attrs.speakerCharacterId || currentSpeakerId,
        narrationMode: attrs.narrationMode || 'Present',
        lineOrder: order++,
      });
      currentSpeakerId = null;
      continue;
    }

    const singleSpeakerMatch = textTrimmed.match(/^@([a-zA-ZÀ-Ỹ0-9_\s]{2,30})$/);
    if (singleSpeakerMatch || effectiveBlockType === 'character') {
      results.push({
        scriptLineId: attrs.scriptLineId || generateGuid(),
        sceneId: attrs.sceneId || currentSceneId,
        dialogueText: null,
        stageDirection: textTrimmed,
        speakerCharacterId: attrs.speakerCharacterId || null,
        narrationMode: attrs.narrationMode || 'Present',
        lineOrder: order++,
      });
      currentSpeakerId = attrs.speakerCharacterId || null;
      continue;
    }

    if (effectiveBlockType === 'dialogue') {
      results.push({
        scriptLineId: attrs.scriptLineId || generateGuid(),
        sceneId: attrs.sceneId || currentSceneId,
        dialogueText: textTrimmed,
        stageDirection: null,
        speakerCharacterId: attrs.speakerCharacterId || currentSpeakerId,
        narrationMode: attrs.narrationMode || 'Present',
        lineOrder: order++,
      });
      currentSpeakerId = null;
    } else if (effectiveBlockType === 'stage_direction' || effectiveBlockType === 'transition') {
      results.push({
        scriptLineId: attrs.scriptLineId || generateGuid(),
        sceneId: attrs.sceneId || currentSceneId,
        dialogueText: null,
        stageDirection: textTrimmed,
        speakerCharacterId: null,
        narrationMode: attrs.narrationMode || 'Present',
        lineOrder: order++,
      });
    }
  }

  return results;
}
