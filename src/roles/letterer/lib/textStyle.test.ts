import { describe, it, expect } from 'vitest';
import {
  TEXT_PRESETS,
  clampFontSize,
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
});
