// src/roles/writer/components/script/flow/writesolo/writeSolo.test.ts
import { describe, it, expect } from 'vitest';
import {
  WRITESOLO_CYCLE_TYPES,
  getRecentSpeakers,
  countPanelsForPage,
  shouldAddContd,
} from './writeSoloExtensions';
import { INITIAL_WRITESOLO_DOC } from './sampleScript';

describe('WriteSolo Screenplay & Graphic Novel Architecture', () => {
  it('định nghĩa đầy đủ 10 kiểu dòng Screenplay & Graphic Novel chuẩn WriteSolo', () => {
    expect(WRITESOLO_CYCLE_TYPES).toContain('scene_heading');
    expect(WRITESOLO_CYCLE_TYPES).toContain('action');
    expect(WRITESOLO_CYCLE_TYPES).toContain('character');
    expect(WRITESOLO_CYCLE_TYPES).toContain('dialogue');
    expect(WRITESOLO_CYCLE_TYPES).toContain('parenthetical');
    expect(WRITESOLO_CYCLE_TYPES).toContain('transition');
    expect(WRITESOLO_CYCLE_TYPES).toContain('page_heading');
    expect(WRITESOLO_CYCLE_TYPES).toContain('panel_heading');
  });

  it('đếm chuẩn xác số lượng Panel trong Trang', () => {
    const mockDoc = {
      descendants: (cb: (node: any) => void) => {
        INITIAL_WRITESOLO_DOC.content.forEach((node) => cb(node));
      },
    };

    const panelsOnPage1 = countPanelsForPage(mockDoc, 1);
    expect(panelsOnPage1).toBe(1);
  });

  it('trích xuất nhân vật đối thoại gần nhất (Alternating Speakers Ping-Pong)', () => {
    const mockDoc = {
      descendants: (cb: (node: any, pos: number) => boolean | void) => {
        let pos = 0;
        for (const node of INITIAL_WRITESOLO_DOC.content) {
          const res = cb(node, pos);
          if (res === false) break;
          pos += 10;
        }
      },
    };

    const recent = getRecentSpeakers(mockDoc, 9999);
    expect(recent).toContain('FRED');
    expect(recent).toContain('NANCY');
    expect(recent[0]).toBe('NANCY'); // Nancy nói sau Fred nên ở đầu
  });

  it('xác định chính xác nhân vật nói liên tiếp để thêm CONT\'D', () => {
    const mockDoc = {
      descendants: (cb: (node: any, pos: number) => boolean | void) => {
        let pos = 0;
        for (const node of INITIAL_WRITESOLO_DOC.content) {
          const res = cb(node, pos);
          if (res === false) break;
          pos += 10;
        }
      },
    };

    const isNancyContd = shouldAddContd(mockDoc, 9999, 'NANCY');
    expect(isNancyContd).toBe(true);

    const isFredContd = shouldAddContd(mockDoc, 9999, 'FRED');
    expect(isFredContd).toBe(false);
  });

  it('khởi tạo mẫu kịch bản với đầy đủ Scene Heading, Action, Character, Dialogue, Parenthetical', () => {
    expect(INITIAL_WRITESOLO_DOC.type).toBe('doc');
    expect(INITIAL_WRITESOLO_DOC.content.length).toBeGreaterThanOrEqual(10);

    const hasScene = INITIAL_WRITESOLO_DOC.content.some(
      (b) => b.attrs.blockType === 'scene_heading',
    );
    const hasAction = INITIAL_WRITESOLO_DOC.content.some((b) => b.attrs.blockType === 'action');
    const hasCharacter = INITIAL_WRITESOLO_DOC.content.some(
      (b) => b.attrs.blockType === 'character',
    );
    const hasDialogue = INITIAL_WRITESOLO_DOC.content.some(
      (b) => b.attrs.blockType === 'dialogue',
    );
    const hasParenthetical = INITIAL_WRITESOLO_DOC.content.some(
      (b) => b.attrs.blockType === 'parenthetical',
    );

    expect(hasScene).toBe(true);
    expect(hasAction).toBe(true);
    expect(hasCharacter).toBe(true);
    expect(hasDialogue).toBe(true);
    expect(hasParenthetical).toBe(true);
  });
});
