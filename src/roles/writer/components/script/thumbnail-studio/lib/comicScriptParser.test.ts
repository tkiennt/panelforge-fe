// src/roles/writer/components/script/thumbnail-studio/lib/comicScriptParser.test.ts
import { describe, it, expect } from 'vitest';
import { parseComicScript, insertTransitionPageStub, normalizeCameraShot } from './comicScriptParser';

describe('comicScriptParser (Lean Script-to-Thumbnail Two-Way AST)', () => {
  const sampleScript = `
EXT. SHIBUYA CROSSING - NIGHT (RAIN)

# Page 1
- Panel 1: Extreme Wide
Tokyo mưa đêm ngập trong ánh đèn neon mờ ảo. Minh đứng im giữa dòng người qua lại.
MINH: Đêm nay dường như đã chết...

- Panel 2: Close-up
Màn hình điện thoại vỡ nát dưới vũng nước mưa.
* BZZZZ... BZZZZ... *

- Panel 3: Low angle
Ánh đèn pha xe tải rọi chói lòa từ xa.
MINH/Shout: Hả?! Cái quái gì thế này?!
* KÍTTTTTT! *

# Page 2
- Panel 1: Medium shot
Tiếng còi xe inh ỏi khắp ngã tư.
MINH (thì thầm): Không kịp rồi.
  `.trim();

  it('phân tích chuẩn xác Scene Header và thông tin môi trường', () => {
    const ast = parseComicScript(sampleScript);

    expect(ast.scenes.length).toBe(1);
    expect(ast.scenes[0].slugline).toContain('EXT. SHIBUYA CROSSING - NIGHT (RAIN)');
    expect(ast.scenes[0].environment?.weather).toBe('RAIN');
  });

  it('phân tách chính xác các Page và gán LexoRank tuần tự', () => {
    const ast = parseComicScript(sampleScript);

    expect(ast.pages.length).toBe(2);
    expect(ast.pages[0].pageNumber).toBe(1);
    expect(ast.pages[1].pageNumber).toBe(2);

    // Kiểm tra LexoRank của 2 trang hợp lệ và có thứ tự
    expect(ast.pages[0].orderRank).toBeDefined();
    expect(ast.pages[1].orderRank).toBeDefined();
    expect(ast.pages[0].orderRank < ast.pages[1].orderRank).toBe(true);
  });

  it('phân tách chính xác các Panel, loại góc máy (Shot Type) và mô tả hành động', () => {
    const ast = parseComicScript(sampleScript);

    const page1 = ast.pages[0];
    expect(page1.panels.length).toBe(3);

    // Panel 1: Extreme Wide
    expect(page1.panels[0].panelNumber).toBe(1);
    expect(page1.panels[0].shotType).toBe('extreme_wide');
    expect(page1.panels[0].actionDescription).toContain('Tokyo mưa đêm ngập trong ánh đèn neon');
    expect(page1.panels[0].dialogues.length).toBe(1);
    expect(page1.panels[0].dialogues[0].character).toBe('MINH');
    expect(page1.panels[0].dialogues[0].text).toBe('Đêm nay dường như đã chết...');

    // Panel 2: Close-up & SFX
    expect(page1.panels[1].panelNumber).toBe(2);
    expect(page1.panels[1].shotType).toBe('close_up');
    expect(page1.panels[1].sfx.length).toBe(1);
    expect(page1.panels[1].sfx[0].text).toBe('BZZZZ... BZZZZ...');

    // Panel 3: Low angle & Dialogue Modifier
    expect(page1.panels[2].panelNumber).toBe(3);
    expect(page1.panels[2].dialogues[0].modifier).toBe('shout');
    expect(page1.panels[2].dialogues[0].text).toBe('Hả?! Cái quái gì thế này?!');
  });

  it('xử lý linh hoạt cả cú pháp modifier / và ()', () => {
    const ast = parseComicScript(sampleScript);
    const page2 = ast.pages[1];

    expect(page2.panels[0].dialogues[0].modifier).toBe('whisper');
    expect(page2.panels[0].dialogues[0].text).toBe('Không kịp rồi.');
  });

  it('chèn trang đệm chuyển tiếp (Bridge Page / Page 1.5) dùng LexoRank mà không làm hỏng thứ tự', () => {
    const ast = parseComicScript(sampleScript);
    const page1 = ast.pages[0];
    const page2 = ast.pages[1];

    const result = insertTransitionPageStub(sampleScript, 1, page1.orderRank, page2.orderRank);

    expect(result.newPageNumber).toBe(1.5);
    expect(result.newScript).toContain('# Page 1.5 [Transition]');

    // Phân tích lại kịch bản mới sau khi chèn
    const updatedAst = parseComicScript(result.newScript);
    expect(updatedAst.pages.length).toBe(3);
    expect(updatedAst.pages[1].pageNumber).toBe(1.5);
    expect(updatedAst.pages[0].orderRank < updatedAst.pages[1].orderRank).toBe(true);
    expect(updatedAst.pages[1].orderRank < updatedAst.pages[2].orderRank).toBe(true);
  });

  it('chống chịu lỗi hoàn hảo với chuỗi rỗng và định dạng lộn xộn', () => {
    expect(() => parseComicScript('')).not.toThrow();
    const emptyAst = parseComicScript('');
    expect(emptyAst.pages.length).toBe(0);

    const malformed = 'Random messy thoughts without headers or panels\nJust typing...';
    expect(() => parseComicScript(malformed)).not.toThrow();
    const malformedAst = parseComicScript(malformed);
    expect(malformedAst.pages.length).toBe(1);
    expect(malformedAst.pages[0].panels[0].actionDescription).toContain('Random messy thoughts');
  });

  it('chuẩn hóa chính xác các shot góc máy phổ biến', () => {
    expect(normalizeCameraShot('Cận cảnh')).toBe('close_up');
    expect(normalizeCameraShot('Toàn cảnh')).toBe('wide');
    expect(normalizeCameraShot('Đặc tả mắt')).toBe('extreme_close_up');
    expect(normalizeCameraShot('Trung cảnh')).toBe('medium');
    expect(normalizeCameraShot('Góc nhìn POV')).toBe('pov');
    expect(normalizeCameraShot('Góc quay lạ')).toBe('unknown');
  });

  it('phân tích chính xác cú pháp "! Trang" và \'" Panel\' từ ScreenplayFlowEditor', () => {
    const screenplayScript = `
! Trang 01
" Panel 1.1: [Toàn cảnh]
Mưa đêm xối xả trên ngã tư.
@Minh: "Cẩn thận đấy!"

" Panel 1.2: [Cận cảnh]
Ánh mắt ngỡ ngàng nhìn về phía trước.

! Trang 02
" Panel 2.1: [Trung cảnh]
Chiếc xe dừng bánh đột ngột.
    `.trim();

    const ast = parseComicScript(screenplayScript);
    expect(ast.pages.length).toBe(2);
    expect(ast.pages[0].pageNumber).toBe(1);
    expect(ast.pages[0].panels.length).toBe(2);
    expect(ast.pages[0].panels[0].panelNumber).toBe(1);
    expect(ast.pages[0].panels[0].shotType).toBe('wide');
    expect(ast.pages[0].panels[0].dialogues.length).toBe(1);
    expect(ast.pages[0].panels[0].dialogues[0].character).toBe('Minh');
    expect(ast.pages[0].panels[0].dialogues[0].text).toBe('Cẩn thận đấy!');

    expect(ast.pages[1].pageNumber).toBe(2);
    expect(ast.pages[1].panels.length).toBe(1);
    expect(ast.pages[1].panels[0].panelNumber).toBe(1);
    expect(ast.pages[1].panels[0].shotType).toBe('medium');
  });
});
