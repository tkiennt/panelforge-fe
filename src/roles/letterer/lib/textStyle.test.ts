import { describe, it, expect } from 'vitest';
import {
  TEXT_PRESETS,
  clampFontSize,
  classifyScriptLine,
  patchTextStyle,
  resolveTextStyle,
  textStyleCss,
} from './textStyle';

describe('kiểu chữ Letterer', () => {
  it('mặc định theo loại element khi chưa chọn kiểu riêng', () => {
    expect(resolveTextStyle({ elementType: 'SPEECH_BALLOON' }).preset).toBe('Thoại thường');
    expect(resolveTextStyle({ elementType: 'NARRATION_BOX' }).preset).toBe('Dẫn truyện');
    expect(resolveTextStyle({ elementType: 'SOUND_EFFECT' }).preset).toBe('SFX');
    const custom = { fontFamily: 'Mali', fontSize: 30 };
    expect(resolveTextStyle({ elementType: 'SPEECH_BALLOON', style: custom })).toBe(custom);
  });

  it('cỡ chữ không xuống dưới mức tối thiểu khi in và không quá lớn', () => {
    expect(clampFontSize(8)).toBe(14);
    expect(clampFontSize(500)).toBe(160);
    expect(clampFontSize(26.6)).toBe(27);
  });

  it('sửa tay một thông số thì bỏ nhãn kiểu có sẵn', () => {
    const shout = TEXT_PRESETS.find((p) => p.name === 'Hét')!.style;
    const next = patchTextStyle(shout, { italic: true, fontSize: 4 });
    expect(next).toMatchObject({
      fontFamily: 'Bangers',
      bold: true,
      italic: true,
      fontSize: 14,
      preset: null,
    });
  });

  it('mọi kiểu có sẵn dùng font Backend cho phép và cỡ hợp lệ', () => {
    const allowed = ['Be Vietnam Pro', 'Mali', 'Patrick Hand', 'Bangers'];
    for (const p of TEXT_PRESETS) {
      expect(allowed).toContain(p.style.fontFamily);
      expect(clampFontSize(p.style.fontSize)).toBe(p.style.fontSize);
      expect(p.style.preset).toBe(p.name);
    }
  });

  it('CSS có viền chữ khi đặt viền, không có khi độ dày 0', () => {
    expect(
      textStyleCss({ fontFamily: 'Bangers', fontSize: 40, strokeColor: '#FFFFFF', strokeWidth: 4 })
        .WebkitTextStroke,
    ).toBe('4px #FFFFFF');
    expect(
      textStyleCss({ fontFamily: 'Mali', fontSize: 26, strokeWidth: 0 }).WebkitTextStroke,
    ).toBeUndefined();
  });

  describe('classifyScriptLine', () => {
    it('dòng chỉ có stageDirection -> kind: DIRECTION, không kéo được và không phải chữ Letterer', () => {
      const res = classifyScriptLine({
        dialogueText: '',
        stageDirection: 'Lâm Dư cẩn thận tìm kiếm thảo dược...',
      });
      expect(res.kind).toBe('DIRECTION');
      expect(res.isLetterable).toBe(false);
      expect(res.label).toBe('Chỉ dẫn');
      expect(res.cleanText).toBe('');
      expect(res.suggestedElementType).toBe('');
    });

    it('dòng có dialogueText và không có người nói -> kind: NARRATION, loại NARRATION_BOX', () => {
      const res = classifyScriptLine({
        dialogueText: 'Đêm đó trời đổ mưa lớn...',
        speakerCharacterId: null,
      });
      expect(res.kind).toBe('NARRATION');
      expect(res.isLetterable).toBe(true);
      expect(res.label).toBe('Dẫn truyện');
      expect(res.suggestedElementType).toBe('NARRATION_BOX');
      expect(res.cleanText).toBe('Đêm đó trời đổ mưa lớn...');
    });

    it('dòng có dialogueText và có người nói -> kind: SPEECH, nhãn Thoại', () => {
      const res = classifyScriptLine({
        dialogueText: 'Cậu phát hiện ra điều gì rồi?',
        speakerCharacterId: 'char-1',
      });
      expect(res.kind).toBe('SPEECH');
      expect(res.isLetterable).toBe(true);
      expect(res.label).toBe('Thoại');
      expect(res.suggestedElementType).toBe('SPEECH_BALLOON');
      expect(res.cleanText).toBe('Cậu phát hiện ra điều gì rồi?');
    });

    it('dòng SFX bắt đầu bằng "SFX:" -> loại SFX, bỏ tiền tố khi đặt chữ', () => {
      const res = classifyScriptLine({
        dialogueText: 'SFX: BÙM!',
      });
      expect(res.kind).toBe('SFX');
      expect(res.isLetterable).toBe(true);
      expect(res.label).toBe('SFX');
      expect(res.suggestedElementType).toBe('SOUND_EFFECT');
      expect(res.cleanText).toBe('BÙM!');

      const resLower = classifyScriptLine({
        dialogueText: 'sfx:  Rắc...  ',
      });
      expect(resLower.cleanText).toBe('Rắc...');
    });
  });
});
