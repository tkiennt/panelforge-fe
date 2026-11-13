// src/roles/writer/components/script/flow/grammar/scriptGrammar.test.ts
import { describe, it, expect } from 'vitest';
import {
  completeCharacterName,
  isThoughtParens,
  onEnter,
  onShiftTab,
  onTab,
} from './scriptGrammar';

describe('scriptGrammar — luật gõ đo từ WriterSolo Graphic Novel', () => {
  it('Enter: Page → Panel → Action → Action; Character/Parens → Dialogue; Dialogue/Caption/SFX → Action', () => {
    expect(onEnter('page')).toEqual({ op: 'insert', to: 'panel' });
    expect(onEnter('panel')).toEqual({ op: 'insert', to: 'action' });
    expect(onEnter('action')).toEqual({ op: 'insert', to: 'action' });
    expect(onEnter('character')).toEqual({ op: 'insert', to: 'dialogue' });
    expect(onEnter('parens')).toEqual({ op: 'insert', to: 'dialogue' });
    expect(onEnter('dialogue')).toEqual({ op: 'insert', to: 'action' });
    expect(onEnter('caption')).toEqual({ op: 'insert', to: 'action' });
    expect(onEnter('sfx')).toEqual({ op: 'insert', to: 'action' });
  });

  it('Tab trên dòng trống đổi loại dòng tại chỗ', () => {
    expect(onTab('page', true)).toEqual({ op: 'morph', to: 'action' });
    expect(onTab('panel', true)).toEqual({ op: 'morph', to: 'character' });
    expect(onTab('action', true)).toEqual({ op: 'morph', to: 'character' });
    expect(onTab('character', true)).toEqual({ op: 'morph', to: 'action' });
    expect(onTab('dialogue', true)).toEqual({ op: 'morph', to: 'parens' });
    expect(onTab('parens', true)).toEqual({ op: 'morph', to: 'dialogue' });
  });

  it('Tab trên dòng có chữ chèn dòng mới bên dưới', () => {
    expect(onTab('action', false)).toEqual({ op: 'insert', to: 'character' });
    expect(onTab('dialogue', false)).toEqual({ op: 'insert', to: 'parens' });
    expect(onTab('character', false)).toEqual({ op: 'insert', to: 'dialogue' });
    expect(onTab('caption', false)).toEqual({ op: 'insert', to: 'character' });
  });

  it('Shift+Tab chỉ lùi loại dòng khi dòng trống', () => {
    expect(onShiftTab('character', true)).toEqual({ op: 'morph', to: 'action' });
    expect(onShiftTab('action', true)).toEqual({ op: 'morph', to: 'character' });
    expect(onShiftTab('dialogue', true)).toEqual({ op: 'morph', to: 'parens' });
    expect(onShiftTab('action', false)).toEqual({ op: 'none' });
  });

  it('gợi ý tên nhân vật theo tiền tố, không phân biệt hoa thường', () => {
    expect(completeCharacterName('k', ['KAI', 'MIA'])).toBe('KAI');
    expect(completeCharacterName('Mi', ['KAI', 'MIA'])).toBe('MIA');
    expect(completeCharacterName('KAI', ['KAI'])).toBeNull();
    expect(completeCharacterName('', ['KAI'])).toBeNull();
    expect(completeCharacterName('z', ['KAI'])).toBeNull();
  });

  it('Parens "nghĩ" / "thought" đánh dấu suy nghĩ', () => {
    expect(isThoughtParens('nghĩ')).toBe(true);
    expect(isThoughtParens('(Thought)')).toBe(true);
    expect(isThoughtParens('whisper')).toBe(false);
    expect(isThoughtParens(null)).toBe(false);
  });
});
