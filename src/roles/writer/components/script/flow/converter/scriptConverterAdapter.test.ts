// src/roles/writer/components/script/flow/converter/scriptConverterAdapter.test.ts
import { describe, it, expect } from 'vitest';
import {
  parseScriptTextToBlocks,
  convertScriptTextToComicBlocks,
  convertScriptTextToScreenplayBlocks,
} from './scriptConverterAdapter';
import { convertRawTextHeuristically } from './regexScriptParser';

describe('scriptConverterAdapter & Regex Heuristic Parser', () => {
  const sampleRawNovel = `
Đêm đã về khuya, những hạt mưa phùn lạnh buốt bắt đầu trút xuống ngã tư Shibuya. Minh nhìn ra ngoài cửa sổ đầy lo lắng.
"Chúng ta phải rời khỏi đây ngay lập tức!" - Minh quay sang nói với Lan.
Lan siết chặt chiếc cặp tài liệu trong tay, ánh mắt hoảng sợ: "Nhưng ngoài kia có quá nhiều kẻ bám đuôi!"
Bỗng nhiên một tiếng nổ lớn vang lên! (BÙM!)
Khói đen bốc lên cuồn cuộn từ phía đầu hẻm.
  `.trim();

  it('chuyển đổi đoạn văn xuôi tiểu thuyết thành kịch bản truyện tranh chuẩn hóa', () => {
    const result = convertRawTextHeuristically({
      mode: 'convert_raw_text',
      inputContent: sampleRawNovel,
      startingPageNumber: 1,
      targetPanelsPerPage: 4,
      seriesBibleContext: {
        characters: [{ name: 'Minh' }, { name: 'Lan' }],
        locations: ['Ngã tư Shibuya'],
      },
    });

    expect(result.scriptText).toContain('! Trang 01');
    expect(result.scriptText).toContain('" Panel 1.1: [Toàn cảnh]');
    expect(result.scriptText).toContain('@Minh: "Chúng ta phải rời khỏi đây ngay lập tức!"');
    expect(result.scriptText).toContain('@Lan: "Nhưng ngoài kia có quá nhiều kẻ bám đuôi!"');
    expect(result.scriptText).toContain('SFX: BÙM!');
    expect(result.panelsCount).toBeGreaterThanOrEqual(2);
  });

  it('áp dụng chính xác startingPageNumber offset khi bắt đầu từ trang N (ví dụ Trang 3)', () => {
    const sampleScript = `
! Trang 01
" Panel 1.1: [Toàn cảnh]
Mưa rơi tầm tã.
@Minh: "Đi thôi!"
" Panel 1.2: [Cận cảnh]
@Lan: "Được rồi!"
! Trang 02
" Panel 2.1: [Trung cảnh]
Chiếc xe lao vút qua màn đêm.
    `.trim();

    const blocks = parseScriptTextToBlocks(sampleScript, { startingPageNumber: 3 });

    // Trang đầu tiên phải được re-index thành Trang 03
    const pages = blocks.filter((b) => b.type === 'page');
    expect(pages[0]?.pageNumber).toBe('03');
    expect(pages[1]?.pageNumber).toBe('04');

    // Panel phải re-index thành 3.1, 3.2 và 4.1
    const panels = blocks.filter((b) => b.type === 'panel');
    expect(panels[0]?.panelNumber).toBe('3.1');
    expect(panels[1]?.panelNumber).toBe('3.2');
    expect(panels[2]?.panelNumber).toBe('4.1');
  });

  it('chuyển đổi chuẩn xác sang Tiptap Comic Blocks cho ComicScriptEditor', () => {
    const sampleScript = `
! Trang 01
" Panel 1.1: [Toàn cảnh]
Ngã tư Shibuya nửa đêm.
@Minh: "Nhanh lên nào!"
SFX: TIẾNG SẤM NỔ
Caption: Màn đêm dần buông xuống.
    `.trim();

    const nodes = convertScriptTextToComicBlocks(sampleScript);

    expect(nodes.some((n) => n.type === 'pageBlock')).toBe(true);
    expect(nodes.some((n) => n.type === 'panelBlock')).toBe(true);
    expect(nodes.some((n) => n.type === 'dialogueBlock')).toBe(true);
    expect(nodes.some((n) => n.type === 'sfxBlock')).toBe(true);
    expect(nodes.some((n) => n.type === 'captionBlock')).toBe(true);

    const dialogueNode = nodes.find((n) => n.type === 'dialogueBlock');
    expect(dialogueNode?.attrs?.character).toBe('Minh');
    expect(dialogueNode?.content?.[0]?.text).toBe('Nhanh lên nào!');
  });

  it('chuyển đổi chuẩn xác sang Screenplay Flow Blocks cho ScreenplayFlowEditor', () => {
    const sampleScript = `
! Trang 01
" Panel 1.1: [Toàn cảnh]
Thành phố ngập trong ánh đèn neon.
@Lan : "Mọi thứ đã sẵn sàng."
    `.trim();

    const nodes = convertScriptTextToScreenplayBlocks(sampleScript, { sceneId: 'scene-test-123' });

    expect(nodes.length).toBeGreaterThanOrEqual(4);
    expect(nodes[0].type).toBe('scriptLineBlock');
    expect(nodes[0].attrs.blockType).toBe('page_heading');
    expect(nodes[0].attrs.sceneId).toBe('scene-test-123');

    const dialogueLine = nodes.find((n) => n.attrs.blockType === 'dialogue');
    expect(dialogueLine).toBeDefined();
    expect(dialogueLine?.attrs?.speakerName).toBe('Lan');
    expect(dialogueLine?.content?.[0]?.text).toContain('@Lan : "Mọi thứ đã sẵn sàng."');
  });
});

