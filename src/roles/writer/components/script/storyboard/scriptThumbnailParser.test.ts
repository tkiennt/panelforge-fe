// src/roles/writer/components/script/storyboard/scriptThumbnailParser.test.ts
import { describe, it, expect } from 'vitest';
import {
  parseScriptToStoryboard,
  serializeStoryboardToScript,
  SAMPLE_SCRIPT_TEXT,
} from './scriptThumbnailParser';

describe('scriptThumbnailParser', () => {
  it('phân giải chính xác cấu trúc script: Trang 1, #panel 1.1, @nhanvat: loi thoại', () => {
    const raw = `Trang 1
#panel 1.1
[Góc máy: Toàn cảnh (Wide Shot)]
@nhanvat: loi thoại
#panel 1.2
Chỉ dẫn sân khấu
@Ren: Chào cậu`;

    const pages = parseScriptToStoryboard(raw);
    expect(pages).toHaveLength(1);
    expect(pages[0].pageNumber).toBe(1);
    expect(pages[0].panels).toHaveLength(2);

    // Panel 1.1
    const p1 = pages[0].panels[0];
    expect(p1.panelKey).toBe('1.1');
    expect(p1.cameraAngle).toBe('Toàn cảnh (Wide Shot)');
    expect(p1.dialogues).toHaveLength(1);
    expect(p1.dialogues[0].speaker).toBe('nhanvat');
    expect(p1.dialogues[0].text).toBe('loi thoại');

    // Panel 1.2
    const p2 = pages[0].panels[1];
    expect(p2.panelKey).toBe('1.2');
    expect(p2.stageDirection).toBe('Chỉ dẫn sân khấu');
    expect(p2.dialogues).toHaveLength(1);
    expect(p2.dialogues[0].speaker).toBe('Ren');
    expect(p2.dialogues[0].text).toBe('Chào cậu');
  });

  it('tuần tự hóa StoryboardPage ngược lại định dạng kịch bản văn bản', () => {
    const pages = parseScriptToStoryboard(SAMPLE_SCRIPT_TEXT);
    const serialized = serializeStoryboardToScript(pages);

    expect(serialized).toContain('Trang 1');
    expect(serialized).toContain('#panel 1.1');
    expect(serialized).toContain('@Ren: Cuối cùng cũng tìm thấy dấu vết của tổ chức...');
    expect(serialized).toContain('#panel 1.2');
    expect(serialized).toContain('Trang 2');
    expect(serialized).toContain('#panel 2.1');
  });
});
