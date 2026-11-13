// src/roles/writer/components/script/flow/grammar/scriptGrammar.test.ts
import { describe, it, expect } from 'vitest';
import {
  ScriptLineKind,
  ScriptFocusLocation,
  nextKindOnEnter,
  nextKindOnTab,
  slotOf,
  getKindFromNumberShortcut,
  H1_SHORTCUTS,
} from './scriptGrammar';

describe('SCR-25: Bảng luật gõ kịch bản Graphic Novel (scriptGrammar.ts)', () => {
  describe('1. Luật chuyển đổi khi nhấn Enter (H.1: nextKindOnEnter)', () => {
    it('ở Page: Enter sinh Panel mới', () => {
      const transition = nextKindOnEnter('page', false);
      expect(transition).toEqual({
        action: 'new_block',
        target: 'panel',
        hint: 'Tạo Panel mới (số kế tiếp)',
      });

      // Page trống không làm gì
      expect(nextKindOnEnter('page', true)).toBeNull();
    });

    it('ở Panel (ô mô tả): Enter luôn tạo Action mô tả hình ảnh (cả có chữ lẫn trống)', () => {
      expect(nextKindOnEnter('panel', false)).toEqual({
        action: 'new_block',
        target: 'action',
        hint: 'Tạo dòng Action mô tả hình ảnh',
      });

      expect(nextKindOnEnter('panel', true)).toEqual({
        action: 'new_block',
        target: 'action',
        hint: 'Tạo dòng Action mô tả hình ảnh',
      });
    });

    it('ở Action: Enter khi có chữ tạo Action tiếp theo, Enter trên dòng trống tạo Panel mới', () => {
      // Có chữ -> Action mới
      expect(nextKindOnEnter('action', false)).toEqual({
        action: 'new_block',
        target: 'action',
        hint: 'Tạo dòng Action mới',
      });

      // Dòng trống -> Panel mới (H.1: Enter trên dòng trống -> Panel mới)
      expect(nextKindOnEnter('action', true)).toEqual({
        action: 'new_block',
        target: 'panel',
        hint: 'Tạo Panel mới (số kế tiếp)',
      });
    });

    it('ở Ô người nói (Speaker): Enter khi có chữ chuyển sang ô thoại cùng dòng, trống đổi về Action', () => {
      expect(nextKindOnEnter('speaker', false)).toEqual({
        action: 'move_slot',
        target: 'dialogue',
        hint: 'Chuyển sang ô thoại cùng dòng',
      });

      expect(nextKindOnEnter('speaker', true)).toEqual({
        action: 'morph_block',
        target: 'action',
        hint: 'Đổi về Action',
      });
    });

    it('ở Dialogue: Enter khi có chữ tạo dòng thoại mới (gợi ý luân phiên), trống đổi về Action', () => {
      expect(nextKindOnEnter('dialogue', false)).toEqual({
        action: 'new_block',
        target: 'speaker',
        hint: 'Tạo dòng thoại mới, ô người nói gợi ý luân phiên',
      });

      expect(nextKindOnEnter('dialogue', true)).toEqual({
        action: 'morph_block',
        target: 'action',
        hint: 'Đổi về Action',
      });
    });

    it('ở Thought: Enter khi có chữ tạo dòng thoại mới, trống đổi về Action', () => {
      expect(nextKindOnEnter('thought', false)).toEqual({
        action: 'new_block',
        target: 'speaker',
        hint: 'Tạo dòng thoại mới, ô người nói gợi ý luân phiên',
      });

      expect(nextKindOnEnter('thought', true)).toEqual({
        action: 'morph_block',
        target: 'action',
        hint: 'Đổi về Action',
      });
    });

    it('ở Narration: Enter khi có chữ tạo Narration mới, trống đổi về Action', () => {
      expect(nextKindOnEnter('narration', false)).toEqual({
        action: 'new_block',
        target: 'narration',
        hint: 'Tạo dòng dẫn truyện mới',
      });

      expect(nextKindOnEnter('narration', true)).toEqual({
        action: 'morph_block',
        target: 'action',
        hint: 'Đổi về Action',
      });
    });

    it('ở SFX: Enter khi có chữ tạo SFX mới, trống đổi về Action', () => {
      expect(nextKindOnEnter('sfx', false)).toEqual({
        action: 'new_block',
        target: 'sfx',
        hint: 'Tạo dòng SFX mới',
      });

      expect(nextKindOnEnter('sfx', true)).toEqual({
        action: 'morph_block',
        target: 'action',
        hint: 'Đổi về Action',
      });
    });
  });

  describe('2. Luật chuyển đổi khi nhấn Tab / Shift+Tab (H.1: nextKindOnTab)', () => {
    it('ở Page và Panel: Tab và Shift+Tab không can thiệp', () => {
      expect(nextKindOnTab('page', 'forward')).toBeNull();
      expect(nextKindOnTab('page', 'backward')).toBeNull();
      expect(nextKindOnTab('panel', 'forward')).toBeNull();
      expect(nextKindOnTab('panel', 'backward')).toBeNull();
    });

    it('ở Action: Tab chuyển sang ô người nói (Dialogue), Shift+Tab không làm gì', () => {
      expect(nextKindOnTab('action', 'forward')).toEqual({
        action: 'morph_block',
        target: 'speaker',
        hint: 'Chuyển thành ô người nói (Dialogue)',
      });

      expect(nextKindOnTab('action', 'backward')).toBeNull();
    });

    it('ở Ô người nói: Tab chuyển sang ô thoại cùng dòng, Shift+Tab lùi về Action', () => {
      expect(nextKindOnTab('speaker', 'forward')).toEqual({
        action: 'move_slot',
        target: 'dialogue',
        hint: 'Chuyển sang ô thoại cùng dòng',
      });

      expect(nextKindOnTab('speaker', 'backward')).toEqual({
        action: 'morph_block',
        target: 'action',
        hint: 'Đổi về Action',
      });
    });

    it('ở Dialogue / Thought: Tab chuyển sang Narration, Shift+Tab lùi về ô người nói', () => {
      expect(nextKindOnTab('dialogue', 'forward')).toEqual({
        action: 'morph_block',
        target: 'narration',
        hint: 'Chuyển thành Narration (Dẫn truyện)',
      });

      expect(nextKindOnTab('dialogue', 'backward')).toEqual({
        action: 'move_slot',
        target: 'speaker',
        hint: 'Lùi về ô người nói',
      });

      expect(nextKindOnTab('thought', 'forward')).toEqual({
        action: 'morph_block',
        target: 'narration',
        hint: 'Chuyển thành Narration (Dẫn truyện)',
      });

      expect(nextKindOnTab('thought', 'backward')).toEqual({
        action: 'move_slot',
        target: 'speaker',
        hint: 'Lùi về ô người nói',
      });
    });

    it('ở Narration: Tab chuyển sang SFX, Shift+Tab chuyển về Dialogue', () => {
      expect(nextKindOnTab('narration', 'forward')).toEqual({
        action: 'morph_block',
        target: 'sfx',
        hint: 'Chuyển thành SFX (Hiệu ứng âm thanh)',
      });

      expect(nextKindOnTab('narration', 'backward')).toEqual({
        action: 'morph_block',
        target: 'dialogue',
        hint: 'Chuyển thành Dialogue (Lời thoại)',
      });
    });

    it('ở SFX: Tab chuyển sang Action, Shift+Tab chuyển về Narration', () => {
      expect(nextKindOnTab('sfx', 'forward')).toEqual({
        action: 'morph_block',
        target: 'action',
        hint: 'Chuyển thành Action (Hành động)',
      });

      expect(nextKindOnTab('sfx', 'backward')).toEqual({
        action: 'morph_block',
        target: 'narration',
        hint: 'Chuyển thành Narration (Dẫn truyện)',
      });
    });
  });

  describe('3. Định nghĩa các Slot (slotOf)', () => {
    it('Panel có 2 ô: heading và direction (mặc định focus direction)', () => {
      const def = slotOf('panel');
      expect(def.slots).toEqual(['heading', 'direction']);
      expect(def.defaultFocusSlot).toBe('direction');
    });

    it('Dialogue / Thought có 2 ô: speaker và text', () => {
      const dialogueDef = slotOf('dialogue');
      expect(dialogueDef.slots).toEqual(['speaker', 'text']);
      expect(dialogueDef.defaultFocusSlot).toBe('text');

      const speakerDef = slotOf('speaker');
      expect(speakerDef.defaultFocusSlot).toBe('speaker');

      const thoughtDef = slotOf(ScriptLineKind.Thought);
      expect(thoughtDef.slots).toEqual(['speaker', 'text']);
      expect(thoughtDef.lineKind).toBe(ScriptLineKind.Thought);
    });

    it('Action, Narration, Sfx có ô text', () => {
      expect(slotOf(ScriptLineKind.Action).slots).toEqual(['text']);
      expect(slotOf(ScriptLineKind.Narration).slots).toEqual(['text']);
      expect(slotOf(ScriptLineKind.Sfx).slots).toEqual(['text']);
    });
  });

  describe('4. Phím tắt số (Ctrl+1..5 theo H.1)', () => {
    it('ánh xạ đúng Ctrl+1..5 sang ScriptLineKind', () => {
      expect(getKindFromNumberShortcut(1)).toBe(ScriptLineKind.Action);
      expect(getKindFromNumberShortcut(2)).toBe(ScriptLineKind.Dialogue);
      expect(getKindFromNumberShortcut(3)).toBe(ScriptLineKind.Thought);
      expect(getKindFromNumberShortcut(4)).toBe(ScriptLineKind.Narration);
      expect(getKindFromNumberShortcut(5)).toBe(ScriptLineKind.Sfx);
      expect(getKindFromNumberShortcut(6)).toBeNull();
    });

    it('khai báo đầy đủ các phím tắt H1_SHORTCUTS', () => {
      expect(H1_SHORTCUTS.NEW_PANEL).toBe('Ctrl+Enter');
      expect(H1_SHORTCUTS.NEW_PAGE).toBe('Ctrl+Shift+Enter');
      expect(H1_SHORTCUTS.KIND_ACTION).toBe('Ctrl+1');
      expect(H1_SHORTCUTS.KIND_DIALOGUE).toBe('Ctrl+2');
      expect(H1_SHORTCUTS.SLASH_MENU).toBe('/');
    });
  });
});
