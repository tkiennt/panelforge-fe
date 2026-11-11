// src/roles/writer/components/script/flow/converter/scriptConverterAdapter.test.ts
import { describe, it, expect } from 'vitest';
import {
  linkTypedSpeakers,
  parseScriptTextToBlocks,
  convertScriptTextToComicBlocks,
  convertScriptTextToScreenplayBlocks,
  countPagesAndPanels,
  filterScriptTextByPageRange,
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

  it('đếm chính xác số trang và số panel trong kịch bản thuần', () => {
    const multiPageScript = `
! Trang 01
" Panel 1.1: [Toàn cảnh]
Mưa rơi.
" Panel 1.2: [Cận cảnh]
Minh nhìn quanh.
! Trang 02
" Panel 2.1: [Trung cảnh]
Chiếc xe dừng lại.
! Trang 03
" Panel 3.1: [Toàn cảnh]
Đoàn người xuất hiện.
" Panel 3.2: [Cận cảnh]
" Panel 3.3: [Đặc tả]
    `.trim();

    const stats = countPagesAndPanels(multiPageScript);
    expect(stats.pagesCount).toBe(3);
    expect(stats.panelsCount).toBe(6);
  });

  it('lọc kịch bản theo dải trang (Staged Pagination Range)', () => {
    const multiPageScript = `
! Trang 01
" Panel 1.1: [Toàn cảnh]
Mưa rơi.
" Panel 1.2: [Cận cảnh]
Minh nhìn quanh.
! Trang 02
" Panel 2.1: [Trung cảnh]
Chiếc xe dừng lại.
! Trang 03
" Panel 3.1: [Toàn cảnh]
Đoàn người xuất hiện.
" Panel 3.2: [Cận cảnh]
    `.trim();

    // Lọc chỉ lấy Trang 02
    const page2Only = filterScriptTextByPageRange(multiPageScript, 2, 2);
    expect(page2Only.pagesCount).toBe(1);
    expect(page2Only.panelsCount).toBe(1);
    expect(page2Only.filteredText).toContain('! Trang 02');
    expect(page2Only.filteredText).toContain('" Panel 2.1: [Trung cảnh]');
    expect(page2Only.filteredText).not.toContain('! Trang 01');
    expect(page2Only.filteredText).not.toContain('! Trang 03');

    // Lọc lấy Trang 02 đến Trang 03
    const page2To3 = filterScriptTextByPageRange(multiPageScript, 2, 3);
    expect(page2To3.pagesCount).toBe(2);
    expect(page2To3.panelsCount).toBe(3);
    expect(page2To3.filteredText).toContain('! Trang 02');
    expect(page2To3.filteredText).toContain('! Trang 03');
    expect(page2To3.filteredText).not.toContain('! Trang 01');
  });

  it('nhận diện chính xác kịch bản plain text tiếng Việt tự nhiên (Khung, Ô, Tên: Thoại, SFX, Dẫn chuyện)', () => {
    const naturalScript = `
Trang 1
Khung 1: [Toàn cảnh]
Khu phố Shibuya lúc nửa đêm.
Dẫn chuyện: Một đêm mưa lạnh lẽo năm 2030.
Minh: Chúng ta phải hành động ngay!
Khung 2: [Cận cảnh]
Lan (thì thầm): "Nhưng ngoài kia có bảo vệ..."
(SFX: BÙM!)
Khung 3: [Góc đặc tả]
Khói bốc lên nghi ngút.
    `.trim();

    const blocks = parseScriptTextToBlocks(naturalScript);
    expect(blocks.some((b) => b.type === 'page' && b.pageNumber === '01')).toBe(true);
    expect(blocks.filter((b) => b.type === 'panel').length).toBe(3);

    const dialogues = blocks.filter((b) => b.type === 'dialogue');
    expect(dialogues.length).toBe(2);
    expect(dialogues[0].character).toBe('Minh');
    expect(dialogues[0].content).toBe('Chúng ta phải hành động ngay!');
    expect(dialogues[1].character).toBe('Lan');
    expect(dialogues[1].content).toBe('Nhưng ngoài kia có bảo vệ...');

    const sfxBlock = blocks.find((b) => b.type === 'sfx');
    expect(sfxBlock).toBeDefined();
    expect(sfxBlock?.content).toContain('BÙM');

    const captionBlock = blocks.find((b) => b.type === 'caption');
    expect(captionBlock).toBeDefined();
    expect(captionBlock?.content).toContain('Một đêm mưa lạnh lẽo');
  });

  it('tự động phân trang và phân panel (Auto-Pacing) khi plain text không có thẻ Trang hoặc Khung', () => {
    const rawProseWithoutPanels = `
Đêm đã về khuya trên ngã tư Shibuya.
Minh: "Cẩn thận đấy!"
Lan đáp: "Tôi biết rồi."
Khói đen bốc lên cuồn cuộn.
Minh: "Đi lối này nhanh lên!"
Tiếng còi cảnh sát vang lên từ xa.
    `.trim();

    const blocks = parseScriptTextToBlocks(rawProseWithoutPanels, { targetPanelsPerPage: 4 });
    // Phải tự động sinh Trang 01
    expect(blocks.some((b) => b.type === 'page' && b.pageNumber === '01')).toBe(true);
    // Phải tự động tạo các panel
    const panels = blocks.filter((b) => b.type === 'panel');
    expect(panels.length).toBeGreaterThanOrEqual(2);
    expect(panels[0].panelNumber).toBe('1.1');
    expect(panels[1].panelNumber).toBe('1.2');
  });

  it('tách tên nhân vật khỏi động từ nói, cảm xúc và dấu /', () => {
    const blocks = parseScriptTextToBlocks(
      ['Trang 1', 'Panel 1', 'Lan đáp: "Tôi biết rồi."', 'Minh / Hét: Đứng lại!', 'Minh nói: "Đi thôi"'].join('\n')
    );
    const dialogues = blocks.filter((b) => b.type === 'dialogue');
    expect(dialogues.map((d) => d.character)).toEqual(['Lan', 'Minh', 'Minh']);
    expect(dialogues[1].content).toBe('Đứng lại!');
  });

  it('không coi câu mô tả có dấu hai chấm là lời thoại', () => {
    const blocks = parseScriptTextToBlocks(
      ['Trang 1', 'Panel 1', 'Góc máy thấp: nhìn lên tòa tháp', 'Khói đen bốc lên nghi ngút khắp nơi: rất dày'].join('\n')
    );
    expect(blocks.filter((b) => b.type === 'dialogue')).toHaveLength(0);
  });

  it('gán speakerCharacterId theo tên Bible, không phân biệt hoa thường và dấu', () => {
    const nodes = convertScriptTextToScreenplayBlocks('Trang 1\nPanel 1\nMINH: Chạy mau!', {
      characters: [{ id: 'chr-minh', name: 'Minh', code: 'CHR-01' }],
    });
    const dialogue = nodes.find((n) => n.attrs.blockType === 'dialogue');
    expect(dialogue.attrs.speakerCharacterId).toBe('chr-minh');
    expect(dialogue.attrs.speakerName).toBe('Minh');
    expect(dialogue.attrs.pageNumber).toBe(1);
    expect(dialogue.attrs.panelNumber).toBe(1);
  });

  it('gán speaker theo Bible cho dòng thoại gõ tay, giữ nguyên dòng đã có speaker', () => {
    const base = { sceneId: 's', narrationMode: 'Present' as const, lineOrder: 1, stageDirection: null };
    const lines = linkTypedSpeakers(
      [
        { ...base, scriptLineId: 'a', dialogueText: 'NARUTO: "Tớ sẽ thành Hokage!"', speakerCharacterId: null },
        { ...base, scriptLineId: 'b', dialogueText: '@Sasuke : "..."', speakerCharacterId: 'chr-picked' },
        { ...base, scriptLineId: 'c', dialogueText: 'Ai đó: "Không có trong Bible"', speakerCharacterId: null },
      ],
      [
        { id: 'chr-naruto', name: 'Naruto' },
        { id: 'chr-sasuke', name: 'Sasuke' },
      ]
    );
    expect(lines.map((l) => l.speakerCharacterId)).toEqual(['chr-naruto', 'chr-picked', null]);
  });
});
