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
    scene.scriptLines.forEach((line, index) => {
      // Nếu có chỉ dẫn sân khấu (Stage Direction) mà không có thoại
      if (line.stageDirection && !line.dialogueText) {
        content.push({
          type: 'scriptLineBlock',
          attrs: {
            scriptLineId: line.id,
            sceneId: scene.id,
            blockType: 'stage_direction' as MangaBlockType,
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
      } else {
        const resolvedSpeaker =
          (getSpeakerName ? getSpeakerName(line.speakerCharacterId) : null) || 'NHÂN VẬT';

        // Có người nói hoặc thoại
        if (line.speakerCharacterId) {
          content.push({
            type: 'scriptLineBlock',
            attrs: {
              scriptLineId: `${line.id}_speaker`,
              sceneId: scene.id,
              blockType: 'character' as MangaBlockType,
              speakerCharacterId: line.speakerCharacterId || null,
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

        // Dòng thoại chính
        if (line.dialogueText) {
          content.push({
            type: 'scriptLineBlock',
            attrs: {
              scriptLineId: line.id,
              sceneId: scene.id,
              blockType: 'dialogue' as MangaBlockType,
              speakerCharacterId: line.speakerCharacterId || null,
              speakerName: line.speakerCharacterId ? resolvedSpeaker : null,
              narrationMode: line.narrationMode || 'Present',
              lineOrder: index + 1,
              panelId: line.panelId || null,
            },
            content: [
              {
                type: 'text',
                text: line.dialogueText,
              },
            ],
          });
        }
      }
    });
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
 */
export function extractScriptLinesFromDoc(doc: any, defaultSceneId: string): ExtractedScriptLinePayload[] {
  if (!doc || !doc.content || !Array.isArray(doc.content)) return [];

  const results: ExtractedScriptLinePayload[] = [];
  let currentSceneId = defaultSceneId;
  let currentSpeakerId: string | null = null;
  let order = 1;

  for (const block of doc.content) {
    if (block.type !== 'scriptLineBlock') continue;

    const attrs = block.attrs || {};
    const text = block.content ? block.content.map((c: any) => c.text || '').join('') : '';

    if (attrs.blockType === 'scene_heading') {
      if (attrs.sceneId) currentSceneId = attrs.sceneId;
      continue;
    }

    if (attrs.blockType === 'character') {
      currentSpeakerId = attrs.speakerCharacterId || null;
      continue;
    }

    if (attrs.blockType === 'dialogue') {
      const dialogueText = text.trim();
      // Bỏ qua nếu dòng thoại rỗng để tránh lỗi ArgumentException ở Backend
      if (!dialogueText) continue;

      results.push({
        scriptLineId: attrs.scriptLineId || generateGuid(),
        sceneId: attrs.sceneId || currentSceneId,
        dialogueText,
        stageDirection: null,
        speakerCharacterId: attrs.speakerCharacterId || currentSpeakerId,
        narrationMode: attrs.narrationMode || 'Present',
        lineOrder: order++,
      });
      currentSpeakerId = null; // Reset speaker sau thoại
    } else if (attrs.blockType === 'stage_direction') {
      const stageDirection = text.trim();
      // Bỏ qua nếu chỉ dẫn sân khấu rỗng
      if (!stageDirection) continue;

      results.push({
        scriptLineId: attrs.scriptLineId || generateGuid(),
        sceneId: attrs.sceneId || currentSceneId,
        dialogueText: null,
        stageDirection,
        speakerCharacterId: null,
        narrationMode: attrs.narrationMode || 'Present',
        lineOrder: order++,
      });
    }
  }

  return results;
}
