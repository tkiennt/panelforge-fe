// src/roles/writer/components/script/flow/converter/scriptConverterAdapter.test.ts
import { describe, it, expect } from 'vitest';
import {
  linkTypedSpeakers,
  parseScriptTextToBlocks,
  convertScriptTextToScreenplayBlocks,
  convertScriptTextToEditorNodes,
  convertBlocksToEditorNodes,
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
      [
        'Trang 1',
        'Panel 1',
        'Lan đáp: "Tôi biết rồi."',
        'Minh / Hét: Đứng lại!',
        'Minh nói: "Đi thôi"',
      ].join('\n'),
    );
    const dialogues = blocks.filter((b) => b.type === 'dialogue');
    expect(dialogues.map((d) => d.character)).toEqual(['Lan', 'Minh', 'Minh']);
    expect(dialogues[1].content).toBe('Đứng lại!');
  });

  it('không coi câu mô tả có dấu hai chấm là lời thoại', () => {
    const blocks = parseScriptTextToBlocks(
      [
        'Trang 1',
        'Panel 1',
        'Góc máy thấp: nhìn lên tòa tháp',
        'Khói đen bốc lên nghi ngút khắp nơi: rất dày',
      ].join('\n'),
    );
    expect(blocks.filter((b) => b.type === 'dialogue')).toHaveLength(0);
  });

  it('gán speakerName theo tên Bible, không phân biệt hoa thường và dấu', () => {
    const nodes = convertScriptTextToScreenplayBlocks('Trang 1\nPanel 1\nMINH: Chạy mau!', {
      characters: [{ id: 'chr-minh', name: 'Minh', code: 'CHR-01' }],
    });
    const dialogue = nodes.find((n) => n.attrs.blockType === 'dialogue');
    expect(dialogue.attrs.speakerName).toBe('Minh');
    expect(dialogue.attrs.pageNumber).toBe(1);
    expect(dialogue.attrs.panelNumber).toBe(1);
  });

  it('gán speaker theo Bible cho dòng thoại gõ tay, giữ nguyên dòng đã có speaker', () => {
    const base = {
      sceneId: 's',
      narrationMode: 'Present' as const,
      lineOrder: 1,
      stageDirection: null,
    };
    const lines = linkTypedSpeakers(
      [
        {
          ...base,
          scriptLineId: 'a',
          dialogueText: 'NARUTO: "Tớ sẽ thành Hokage!"',
          speakerLabel: null,
        },
        {
          ...base,
          scriptLineId: 'b',
          dialogueText: '@Sasuke : "..."',
          speakerLabel: 'Sasuke',
        },
        {
          ...base,
          scriptLineId: 'c',
          dialogueText: 'Ai đó: "Không có trong Bible"',
          speakerLabel: null,
        },
      ],
      [
        { id: 'chr-naruto', name: 'Naruto' },
        { id: 'chr-sasuke', name: 'Sasuke' },
      ],
    );
    expect(lines.map((l) => l.speakerLabel)).toEqual(['Naruto', 'Sasuke', null]);
  });

  it('nhận diện chính xác kịch bản tiếng Anh: NARRATOR và Location thành caption, không nhầm thành character', () => {
    const englishScript = `
Page 1
Panel 1: [Wide shot]
Location: Neon-lit alleyway, Downtown Tokyo - Midnight.
NARRATOR: "In a city that never sleeps, some secrets are best left buried."
Panel 2: [Close-up]
Arthur: "It's still intact."
ARTHUR (THINKING): "They have no idea what they unleashed."
Panel 3: [High angle]
SFX: CRASH!
LANCELOT: "Hand it over, Arthur! There is nowhere left to run!"
    `.trim();

    const blocks = parseScriptTextToBlocks(englishScript);

    // Kiểm tra Trang và Panel
    expect(blocks.some((b) => b.type === 'page' && b.pageNumber === '01')).toBe(true);
    expect(blocks.filter((b) => b.type === 'panel')).toHaveLength(3);

    // NARRATOR và Location phải là caption, tuyệt đối KHÔNG phải là character trong dialogue
    const captions = blocks.filter((b) => b.type === 'caption');
    expect(captions.length).toBeGreaterThanOrEqual(2);
    expect(captions.some((c) => c.content.includes('Neon-lit alleyway'))).toBe(true);
    expect(captions.some((c) => c.content.includes('In a city that never sleeps'))).toBe(true);

    const dialogues = blocks.filter((b) => b.type === 'dialogue');
    expect(dialogues.some((d) => d.character === 'NARRATOR' || d.character === 'Location')).toBe(
      false,
    );

    // Thoại của Arthur và Lancelot
    expect(dialogues.some((d) => d.character === 'Arthur' && d.content.includes('intact'))).toBe(
      true,
    );
    const thinkingDialogue = dialogues.find(
      (d) => d.character === 'ARTHUR' && d.parens === 'THINKING',
    );
    expect(thinkingDialogue).toBeDefined();
    expect(thinkingDialogue?.content).toContain('They have no idea');

    expect(
      dialogues.some((d) => d.character === 'LANCELOT' && d.content.includes('Hand it over')),
    ).toBe(true);

    // SFX
    const sfxBlock = blocks.find((b) => b.type === 'sfx');
    expect(sfxBlock).toBeDefined();
    expect(sfxBlock?.content).toBe('CRASH!');
  });

  it('nhận diện sluglines INT./EXT. thành action và VOICEOVER thành caption', () => {
    const screenScript = `
Page 1
Panel 1: [Wide]
INT. WAREHOUSE - NIGHT
VOICEOVER: "The drop was supposed to be simple."
JOHN: "Are they here yet?"
EXT. STREET - CONTINUOUS
Rain keeps falling.
    `.trim();

    const blocks = parseScriptTextToBlocks(screenScript);
    const actions = blocks.filter((b) => b.type === 'action');
    expect(actions.some((a) => a.content.includes('INT. WAREHOUSE - NIGHT'))).toBe(true);
    expect(actions.some((a) => a.content.includes('EXT. STREET - CONTINUOUS'))).toBe(true);

    const captions = blocks.filter((b) => b.type === 'caption');
    expect(captions.some((c) => c.content.includes('The drop was supposed to be simple'))).toBe(
      true,
    );

    const dialogues = blocks.filter((b) => b.type === 'dialogue');
    expect(dialogues).toHaveLength(1);
    expect(dialogues[0].character).toBe('JOHN');
  });

  it('chuyển đổi chuẩn xác sang TipTap scriptLine nodes cho WriterSolo ScreenplayFlowEditor', () => {
    const sampleScript = `
! Trang 01
" Panel 1.1: [Toàn cảnh]
Thành phố ngập trong ánh đèn neon.
@Minh (thì thầm): "Mọi thứ đã sẵn sàng."
SFX: TIẾNG NỔ!
Caption: Một đêm mưa lạnh giá.
    `.trim();

    const nodes = convertScriptTextToEditorNodes(sampleScript, {
      characters: [{ id: 'chr-minh', name: 'Minh' }],
    });

    expect(nodes.length).toBeGreaterThanOrEqual(6);

    // Page line
    const pageNode = nodes.find((n) => n.attrs?.el === 'page');
    expect(pageNode).toBeDefined();
    expect(pageNode?.type).toBe('scriptLine');

    // Panel line
    const panelNode = nodes.find((n) => n.attrs?.el === 'panel');
    expect(panelNode).toBeDefined();
    expect(panelNode?.content?.[0]?.text).toBe('[Toàn cảnh]');

    // Action line
    const actionNode = nodes.find((n) => n.attrs?.el === 'action');
    expect(actionNode).toBeDefined();
    expect(actionNode?.content?.[0]?.text).toContain('Thành phố ngập trong ánh đèn neon');

    // Character line
    const charNode = nodes.find((n) => n.attrs?.el === 'character');
    expect(charNode).toBeDefined();
    expect(charNode?.content?.[0]?.text).toBe('MINH:');

    // Parens line
    const parensNode = nodes.find((n) => n.attrs?.el === 'parens');
    expect(parensNode).toBeDefined();
    expect(parensNode?.content?.[0]?.text).toBe('thì thầm');

    // Dialogue line
    const dialNode = nodes.find((n) => n.attrs?.el === 'dialogue');
    expect(dialNode).toBeDefined();
    expect(dialNode?.content?.[0]?.text).toBe('Mọi thứ đã sẵn sàng.');

    // SFX line
    const sfxNode = nodes.find((n) => n.attrs?.el === 'sfx');
    expect(sfxNode).toBeDefined();
    expect(sfxNode?.content?.[0]?.text).toBe('TIẾNG NỔ!');

    // Caption line
    const captionNode = nodes.find((n) => n.attrs?.el === 'caption');
    expect(captionNode).toBeDefined();
    expect(captionNode?.content?.[0]?.text).toBe('Một đêm mưa lạnh giá.');
  });
});
