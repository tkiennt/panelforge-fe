import { describe, expect, it } from 'vitest';
import {
  defaultAppearance,
  fitBoxHeight,
  fitFontSize,
  layoutText,
  resolveAppearance,
  textSafeArea,
  wrapLines,
  appearanceFromStyle,
  mergeTextStyle,
  tailFromStyle,
  withAppearance,
  resizeFromCorner,
  type Measure,
} from './balloonRender';
import type { TextStyleDto } from '@/services/element.service';

// Đo giả định: mỗi ký tự rộng 0.5em (đủ để kiểm quy tắc, không phụ thuộc font thật)
const measure: Measure = (s, font) => Array.from(s).length * Number(/(\d+)px/.exec(font)![1]) * 0.5;
const style: TextStyleDto = { fontFamily: 'Mali', fontSize: 20, lineHeight: 1.3, align: 'center' };

describe('balloonRender', () => {
  it('giao diện mặc định theo loại; ghi đè từng phần độc lập với loại', () => {
    expect(defaultAppearance('SPEECH_BALLOON').shape).toBe('oval');
    expect(defaultAppearance('THOUGHT_BALLOON').shape).toBe('cloud');
    expect(defaultAppearance('NARRATION_BOX').shape).toBe('box');
    expect(defaultAppearance('SOUND_EFFECT').shape).toBe('spiky');
    const sfxTextOnly = resolveAppearance('SOUND_EFFECT', { shape: 'none' });
    expect(sfxTextOnly.shape).toBe('none');
    expect(sfxTextOnly.borderColor).toBe('#DC2626');
  });

  it('ngắt dòng: giữ xuống dòng thủ công, tiếng Việt có dấu theo từ, từ quá dài cắt theo ký tự', () => {
    const m = (s: string) => Array.from(s).length;
    expect(wrapLines('Đêm thứ tư\nliên tiếp', 100, m)).toEqual(['Đêm thứ tư', 'liên tiếp']);
    expect(wrapLines('Mọi người tập trung', 10, m)).toEqual(['Mọi người', 'tập trung']);
    expect(wrapLines('aaaaaaaaaaaa', 5, m)).toEqual(['aaaaa', 'aaaaa', 'aa']);
    expect(wrapLines('a\n\nb', 10, m)).toEqual(['a', '', 'b']);
  });

  it('vùng chữ của oval nằm trọn trong elip (góc không chạm đường cong)', () => {
    const w = 300;
    const h = 200;
    const a = textSafeArea('oval', w, h);
    for (const [x, y] of [
      [a.x, a.y],
      [a.x + a.w, a.y + a.h],
    ]) {
      expect(((x - w / 2) / (w / 2)) ** 2 + ((y - h / 2) / (h / 2)) ** 2).toBeLessThanOrEqual(1);
    }
    // Hộp/chỉ chữ: lề cố định
    expect(textSafeArea('box', w, h)).toEqual({ x: 12, y: 12, w: 276, h: 176 });
  });

  it('không tự thu nhỏ chữ: giữ cỡ đã chọn và báo tràn', () => {
    const long = 'Một câu thoại rất dài cần nhiều dòng để hiển thị hết nội dung trong bóng nhỏ';
    const l = layoutText(long, style, 'oval', 200, 100, measure);
    expect(l.fontSize).toBe(20);
    expect(l.overflow).toBe(true);
    expect(layoutText('Ngắn', style, 'oval', 200, 100, measure).overflow).toBe(false);
  });

  it('vừa chữ trong bóng: cỡ lớn nhất còn vừa; vừa bóng theo chữ: đủ cao để hết tràn', () => {
    const text = 'Sprint cuối cùng\ncòn đúng 3 ngày';
    const size = fitFontSize(text, style, 'oval', 300, 200, measure);
    expect(layoutText(text, style, 'oval', 300, 200, measure, size).overflow).toBe(false);
    expect(layoutText(text, style, 'oval', 300, 200, measure, size + 1).overflow).toBe(true);

    const h = fitBoxHeight(text, style, 'oval', 300, 40, measure);
    expect(layoutText(text, style, 'oval', 300, h, measure).overflow).toBe(false);
    expect(layoutText(text, style, 'oval', 300, h, measure).fontSize).toBe(20);
  });

  it('lưu bóng vào TextStyle: thanh định dạng giữ phần bóng; về mặc định bỏ bóng; đuôi làm tròn px', () => {
    const defaults: TextStyleDto = { fontFamily: 'Mali', fontSize: 26, preset: 'Thoại thường' };
    const saved: TextStyleDto = {
      fontFamily: 'Mali',
      fontSize: 30,
      balloonShape: 'none',
      tailX: -40,
      tailY: 260,
    };

    // Đổi preset / reset chữ không làm mất hình bóng và đuôi
    expect(mergeTextStyle({ fontFamily: 'Bangers', fontSize: 40 }, saved, defaults)).toMatchObject({
      fontFamily: 'Bangers',
      balloonShape: 'none',
      tailX: -40,
    });
    expect(mergeTextStyle(null, saved, defaults)).toMatchObject({
      fontSize: 26,
      balloonShape: 'none',
    });
    expect(mergeTextStyle(null, { fontFamily: 'Mali', fontSize: 30 }, defaults)).toBeNull();

    // Đổi hình bóng khi chưa có kiểu riêng → kiểu mặc định + bóng; bỏ hết bóng → null
    const boxed = withAppearance(null, defaults, { shape: 'box', fillOpacity: 0.5 });
    expect(boxed).toMatchObject({ fontFamily: 'Mali', balloonShape: 'box', fillOpacity: 0.5 });
    expect(withAppearance(null, defaults, null)).toBeNull();
    expect(withAppearance(saved, defaults, null)).toEqual({ fontFamily: 'Mali', fontSize: 30 });
    expect(withAppearance(saved, defaults, { tail: { x: 10.6, y: -3.2 } })).toMatchObject({
      tailX: 11,
      tailY: -3,
    });

    expect(resolveAppearance('SPEECH_BALLOON', appearanceFromStyle(saved)).shape).toBe('none');
    expect(tailFromStyle(saved)).toEqual({ x: -40, y: 260 });
    expect(tailFromStyle(defaults)).toBeNull();
  });

  it('kéo góc: góc đối diện đứng yên, giữ kích thước tối thiểu, không ra khỏi trang', () => {
    const box = { x: 100, y: 100, w: 300, h: 200 };
    const page = { width: 1200, height: 1800 };
    const min = { w: 80, h: 60 };
    expect(resizeFromCorner(box, 'nw', 50, 40, min, page)).toEqual({
      x: 150,
      y: 140,
      w: 250,
      h: 160,
    });
    expect(resizeFromCorner(box, 'se', -50, 20, min, page)).toEqual({
      x: 100,
      y: 100,
      w: 250,
      h: 220,
    });
    expect(resizeFromCorner(box, 'ne', 1000, -500, min, page)).toEqual({
      x: 100,
      y: 0,
      w: 1100,
      h: 300,
    });
    expect(resizeFromCorner(box, 'sw', 500, -500, min, page)).toEqual({
      x: 320,
      y: 100,
      w: 80,
      h: 60,
    });
  });
});
