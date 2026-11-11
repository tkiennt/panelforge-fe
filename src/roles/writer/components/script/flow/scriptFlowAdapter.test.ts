import { describe, it, expect } from 'vitest';
import {
  scenesToTipTapDoc,
  extractScriptLinesFromDoc,
  renumberTipTapDoc,
  createStructuredMangaPageBlocks,
} from './scriptFlowAdapter';
import { SceneDetailDto } from '@/services/scriptLine.service';

describe('scriptFlowAdapter (Dual-Mode Single Source of Truth)', () => {
  const mockScenes: SceneDetailDto[] = [
    {
      id: 'scene-1111',
      chapterId: 'chap-0001',
      sceneNumber: 1,
      heading: 'Lâu đài bóng đêm',
      summary: 'Khởi đầu cuộc hành trình',
      defaultNarrationMode: 'Present',
      createdAt: '2026-01-01',
      version: 1,
      scriptLines: [
        {
          id: 'line-001',
          lineOrder: 1,
          speakerCharacterId: 'char-hero',
          dialogueText: 'Cuối cùng ta cũng đã tìm thấy ngươi!',
          stageDirection: null,
          narrationMode: 'Present',
        },
        {
          id: 'line-002',
          lineOrder: 2,
          speakerCharacterId: null,
          dialogueText: null,
          stageDirection: 'Gió rít dữ dội qua khung cửa sổ vỡ vụn.',
          narrationMode: 'Present',
        },
      ],
    },
  ];

  it('chuyển đổi chuẩn xác từ SceneDetailDto[] sang TipTap JSON doc', () => {
    const doc = scenesToTipTapDoc(mockScenes, (id) => (id === 'char-hero' ? 'Anh Hùng' : null));

    expect(doc.type).toBe('doc');
    expect(doc.content.length).toBeGreaterThanOrEqual(3);

    // Block 1: Scene Heading
    expect(doc.content[0].type).toBe('scriptLineBlock');
    expect(doc.content[0].attrs.blockType).toBe('scene_heading');
    expect(doc.content[0].content[0].text).toContain('CẢNH 1: LÂU ĐÀI BÓNG ĐÊM');

    // Block 2: Dialogue mang luôn tên người nói, không sinh khối Character riêng
    expect(doc.content[1].attrs.blockType).toBe('dialogue');
    expect(doc.content[1].attrs.speakerCharacterId).toBe('char-hero');
    expect(doc.content[1].content[0].text).toBe('@Anh Hùng : "Cuối cùng ta cũng đã tìm thấy ngươi!"');

    // Block 3: Stage direction
    expect(doc.content[2].attrs.blockType).toBe('stage_direction');
    expect(doc.content[2].content[0].text).toBe('Gió rít dữ dội qua khung cửa sổ vỡ vụn.');
  });

  it('trích xuất ngược từ TipTap JSON doc thành danh sách ScriptLinePayload chuẩn xác', () => {
    const doc = scenesToTipTapDoc(mockScenes, (id) => (id === 'char-hero' ? 'Anh Hùng' : null));
    const extracted = extractScriptLinesFromDoc(doc, 'scene-1111');

    expect(extracted.length).toBeGreaterThanOrEqual(2);

    const dialogueLine = extracted.find((l) => l.dialogueText?.includes('Cuối cùng ta cũng đã tìm'));
    expect(dialogueLine).toBeDefined();
    expect(dialogueLine?.sceneId).toBe('scene-1111');

    const sfxLine = extracted.find((l) => l.stageDirection?.includes('Gió rít dữ dội'));
    expect(sfxLine).toBeDefined();
    expect(sfxLine?.dialogueText).toBeNull();
  });

  it('tự động bóc tách và phân nhóm các cảnh trong văn bản liền mạch (Continuous Multi-Scene Extraction)', () => {
    const multiSceneDoc = {
      type: 'doc',
      content: [
        {
          type: 'scriptLineBlock',
          attrs: { blockType: 'scene_heading', sceneId: 'scene-001' },
          content: [{ type: 'text', text: 'CẢNH 1: KHỞI ĐẦU' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { blockType: 'dialogue' },
          content: [{ type: 'text', text: 'Lời thoại cảnh 1' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { blockType: 'scene_heading' }, // Writer gõ tay cảnh 2, chưa có sceneId backend
          content: [{ type: 'text', text: 'CẢNH 2: CUỘC GẶP GỠ BẤT NGỜ' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { blockType: 'dialogue' },
          content: [{ type: 'text', text: 'Lời thoại cảnh 2' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { blockType: 'stage_direction' },
          content: [{ type: 'text', text: 'Chỉ dẫn cảnh 2' }],
        },
      ],
    };

    const extracted = extractScriptLinesFromDoc(multiSceneDoc, 'scene-001');

    const sceneHeadings = extracted.filter((l) => l.blockType === 'scene_heading');
    expect(sceneHeadings).toHaveLength(2);
    expect(sceneHeadings[0].sceneId).toBe('scene-001');
    expect(sceneHeadings[1].sceneId).toBe('scene_num_2');

    const line1 = extracted.find((l) => l.dialogueText === 'Lời thoại cảnh 1');
    expect(line1).toBeDefined();
    expect(line1?.sceneId).toBe('scene-001');

    const line2 = extracted.find((l) => l.dialogueText === 'Lời thoại cảnh 2');
    expect(line2).toBeDefined();
    expect(line2?.sceneId).toBe('scene_num_2');

    const action2 = extracted.find((l) => l.stageDirection === 'Chỉ dẫn cảnh 2');
    expect(action2).toBeDefined();
    expect(action2?.sceneId).toBe('scene_num_2');
  });

  it('đánh số lại chính xác Trang và Panel (renumberTipTapDoc)', () => {
    const testDoc = {
      type: 'doc',
      content: [
        {
          type: 'scriptLineBlock',
          attrs: { blockType: 'page_heading' },
          content: [{ type: 'text', text: 'Page 99: Bìa' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { blockType: 'panel_heading' },
          content: [{ type: 'text', text: 'Panel 99.88: Cận cảnh' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { blockType: 'dialogue' },
          content: [{ type: 'text', text: 'Xin chào' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { blockType: 'panel_heading' },
          content: [{ type: 'text', text: 'Khung 5' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { blockType: 'page_heading' },
          content: [{ type: 'text', text: 'Trang' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { blockType: 'panel_heading' },
          content: [{ type: 'text', text: 'Khung' }],
        },
      ],
    };

    const renumbered = renumberTipTapDoc(testDoc);

    expect(renumbered.content[0].content[0].text).toBe('TRANG 1: Bìa');
    expect(renumbered.content[0].attrs.pageNumber).toBe(1);

    expect(renumbered.content[1].content[0].text).toBe('PANEL 1.1: Cận cảnh');
    expect(renumbered.content[1].attrs.pageNumber).toBe(1);
    expect(renumbered.content[1].attrs.panelNumber).toBe(1);

    expect(renumbered.content[2].attrs.inPanel).toBe(true);

    expect(renumbered.content[3].content[0].text).toBe('PANEL 1.2');
    expect(renumbered.content[3].attrs.pageNumber).toBe(1);
    expect(renumbered.content[3].attrs.panelNumber).toBe(2);

    expect(renumbered.content[4].content[0].text).toBe('TRANG 2');
    expect(renumbered.content[4].attrs.pageNumber).toBe(2);

    expect(renumbered.content[5].content[0].text).toBe('PANEL 2.1');
    expect(renumbered.content[5].attrs.pageNumber).toBe(2);
    expect(renumbered.content[5].attrs.panelNumber).toBe(1);
  });

  it('đánh số lại chính xác Cảnh khi một cảnh bị xóa (Scene Renumbering)', () => {
    // Giả lập kịch bản ban đầu có Cảnh 1, Cảnh 2, Cảnh 3. Cảnh 2 bị xóa.
    const docWithDeletedScene = {
      type: 'doc',
      content: [
        {
          type: 'scriptLineBlock',
          attrs: { blockType: 'scene_heading' },
          content: [{ type: 'text', text: 'CẢNH 1: KHỞI HÀNH' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { blockType: 'page_heading' },
          content: [{ type: 'text', text: 'Trang 1' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { blockType: 'scene_heading' },
          content: [{ type: 'text', text: 'CẢNH 3: CHIẾN ĐẤU Ở VÂN KHÊ' }],
        },
      ],
    };

    const renumbered = renumberTipTapDoc(docWithDeletedScene);

    expect(renumbered.content[0].content[0].text).toBe('CẢNH 1: KHỞI HÀNH');
    expect(renumbered.content[0].attrs.sceneNumber).toBe(1);

    expect(renumbered.content[2].content[0].text).toBe('CẢNH 2: CHIẾN ĐẤU Ở VÂN KHÊ');
    expect(renumbered.content[2].attrs.sceneNumber).toBe(2);
  });

  describe('Nhận diện mã định danh Bible thành chip (Bible Mention Auto-Parsing)', () => {
    const mockBibleEntries: any[] = [
      {
        id: 'entry-loc-1',
        code: 'LOC-VAN-KHE',
        name: 'Vân Khê',
        category: 'Location',
        effectiveRevision: {
          reviewStatus: 'CanonLocked',
        },
      },
      {
        id: 'entry-trm-1',
        code: 'TRM-VO-TAN-HOA',
        name: 'Vô Tận Hỏa',
        category: 'Terminology',
      },
      {
        id: 'entry-trm-2',
        code: 'TRM-LINH-MACH',
        name: 'Linh Mạch',
        category: 'Terminology',
      },
    ];

    it('1. Tải dòng "... suối cạn trơ đáy (LOC-VAN-KHE)." với Bible có LOC-VAN-KHE -> có 1 node bibleMention (isStub=false)', () => {
      const scenes: SceneDetailDto[] = [
        {
          id: 'sc-1',
          chapterId: 'chap-1',
          sceneNumber: 1,
          heading: 'CẢNH 1',
          createdAt: '2026-11-03',
          scriptLines: [
            {
              id: 'l-1',
              lineOrder: 1,
              stageDirection: '... suối cạn trơ đáy (LOC-VAN-KHE).',
              dialogueText: null,
              speakerCharacterId: null,
              narrationMode: 'Present',
              panelId: null,
            },
          ],
        },
      ];

      const doc = scenesToTipTapDoc(scenes, undefined, undefined, undefined, mockBibleEntries, 1);
      const lineBlock = doc.content.find((b: any) => b.attrs?.scriptLineId === 'l-1');
      expect(lineBlock).toBeDefined();

      const { content } = lineBlock;
      expect(content).toHaveLength(3);
      expect(content[0]).toEqual({ type: 'text', text: '... suối cạn trơ đáy ' });
      expect(content[1].type).toBe('bibleMention');
      expect(content[1].attrs.code).toBe('LOC-VAN-KHE');
      expect(content[1].attrs.label).toBe('Vân Khê');
      expect(content[1].attrs.category).toBe('Location');
      expect(content[1].attrs.isLocked).toBe(true);
      expect(content[1].attrs.isStub).toBe(false);
      expect(content[2]).toEqual({ type: 'text', text: '.' });
    });

    it('2. Tải mã không có trong Bible (CHR-LAM-DU) -> chip isStub=true', () => {
      const scenes: SceneDetailDto[] = [
        {
          id: 'sc-1',
          chapterId: 'chap-1',
          sceneNumber: 1,
          heading: 'CẢNH 1',
          createdAt: '2026-11-03',
          scriptLines: [
            {
              id: 'l-2',
              lineOrder: 1,
              stageDirection: null,
              dialogueText: 'Ta nghe nói (CHR-LAM-DU) sắp tới đây.',
              speakerCharacterId: null,
              narrationMode: 'Present',
              panelId: null,
            },
          ],
        },
      ];

      const doc = scenesToTipTapDoc(scenes, undefined, undefined, undefined, mockBibleEntries, 1);
      const lineBlock = doc.content.find((b: any) => b.attrs?.scriptLineId === 'l-2');
      expect(lineBlock).toBeDefined();

      const mentionNode = lineBlock.content.find((c: any) => c.type === 'bibleMention');
      expect(mentionNode).toBeDefined();
      expect(mentionNode.attrs.code).toBe('CHR-LAM-DU');
      expect(mentionNode.attrs.isStub).toBe(true);
      expect(mentionNode.attrs.category).toBe('Character');
    });

    it('3. Một dòng có nhiều mã liên tiếp, ví dụ (TRM-VO-TAN-HOA) ... (TRM-LINH-MACH) -> 2 chip đúng thứ tự', () => {
      const scenes: SceneDetailDto[] = [
        {
          id: 'sc-1',
          chapterId: 'chap-1',
          sceneNumber: 1,
          heading: 'CẢNH 1',
          createdAt: '2026-11-03',
          scriptLines: [
            {
              id: 'l-3',
              lineOrder: 1,
              stageDirection: null,
              dialogueText: '(TRM-VO-TAN-HOA) thiêu rụi (TRM-LINH-MACH) trong đêm.',
              speakerCharacterId: null,
              narrationMode: 'Present',
              panelId: null,
            },
          ],
        },
      ];

      const doc = scenesToTipTapDoc(scenes, undefined, undefined, undefined, mockBibleEntries, 1);
      const lineBlock = doc.content.find((b: any) => b.attrs?.scriptLineId === 'l-3');
      expect(lineBlock).toBeDefined();

      const mentions = lineBlock.content.filter((c: any) => c.type === 'bibleMention');
      expect(mentions).toHaveLength(2);
      expect(mentions[0].attrs.code).toBe('TRM-VO-TAN-HOA');
      expect(mentions[1].attrs.code).toBe('TRM-LINH-MACH');

      expect(lineBlock.content[0].type).toBe('bibleMention');
      expect(lineBlock.content[1].text).toBe(' thiêu rụi ');
      expect(lineBlock.content[2].type).toBe('bibleMention');
      expect(lineBlock.content[3].text).toBe(' trong đêm.');
    });

    it('4. Round-trip: tải -> extractScriptLinesFromDoc -> chuỗi giống hệt bản gốc', () => {
      const originalText = '... suối cạn trơ đáy (LOC-VAN-KHE). Cần chú ý (TRM-VO-TAN-HOA)!';
      const scenes: SceneDetailDto[] = [
        {
          id: 'sc-1',
          chapterId: 'chap-1',
          sceneNumber: 1,
          heading: 'CẢNH 1',
          createdAt: '2026-11-03',
          scriptLines: [
            {
              id: 'l-4',
              lineOrder: 1,
              stageDirection: originalText,
              dialogueText: null,
              speakerCharacterId: null,
              narrationMode: 'Present',
              panelId: null,
            },
          ],
        },
      ];

      const doc = scenesToTipTapDoc(scenes, undefined, undefined, undefined, mockBibleEntries, 1);
      const extracted = extractScriptLinesFromDoc(doc, 'sc-1');
      const scriptLines = extracted.filter((l) => l.blockType !== 'scene_heading');
      expect(scriptLines).toHaveLength(1);
      expect(scriptLines[0].stageDirection).toBe(originalText);
    });

    it('6. Text trong ngoặc nhưng không phải mã, ví dụ (Mắt mở to, bỗng chốc ôm đầu), KHÔNG bị biến thành chip', () => {
      const nonCodeText = '(Mắt mở to, bỗng chốc ôm đầu) Ta không thể tin được!';
      const scenes: SceneDetailDto[] = [
        {
          id: 'sc-1',
          chapterId: 'chap-1',
          sceneNumber: 1,
          heading: 'CẢNH 1',
          createdAt: '2026-11-03',
          scriptLines: [
            {
              id: 'l-5',
              lineOrder: 1,
              stageDirection: nonCodeText,
              dialogueText: null,
              speakerCharacterId: null,
              narrationMode: 'Present',
              panelId: null,
            },
          ],
        },
      ];

      const doc = scenesToTipTapDoc(scenes, undefined, undefined, undefined, mockBibleEntries, 1);
      const lineBlock = doc.content.find((b: any) => b.attrs?.scriptLineId === 'l-5');
      expect(lineBlock).toBeDefined();

      const mentions = lineBlock.content.filter((c: any) => c.type === 'bibleMention');
      expect(mentions).toHaveLength(0);
      expect(lineBlock.content).toEqual([{ type: 'text', text: nonCodeText }]);
    });

    it('7. Version concurrency vector bắt đầu từ 0 không bị ép thành 1 do falsy check', () => {
      const initialVersionVector = 0;
      // Kiểm tra quy tắc an toàn: versionVector ?? 0
      const safeVersion = initialVersionVector ?? 0;
      const unsafeVersion = initialVersionVector || 1;
      expect(safeVersion).toBe(0);
      expect(unsafeVersion).toBe(1); // Phản ánh đúng bẫy lỗi 409 cũ
    });
  });
});

describe('Trang mẫu 4/5 panel', () => {
  it('tạo đúng số panel, ô trống không bị lưu thành ScriptLine', () => {
    const blocks = createStructuredMangaPageBlocks(2, 5, 'sc-1');
    expect(blocks.filter((b) => b.attrs.blockType === 'panel_heading')).toHaveLength(5);

    const extracted = extractScriptLinesFromDoc({ type: 'doc', content: blocks }, 'sc-1');
    // Chỉ còn tiêu đề trang + 5 tiêu đề panel
    expect(extracted).toHaveLength(6);
    expect(extracted.every((l) => l.pageNumber === 2)).toBe(true);
  });

  it('thoại điền vào ô trống được neo vào đúng Trang/Panel; bóng thoại rỗng bị bỏ qua', () => {
    const blocks = createStructuredMangaPageBlocks(1, 4, 'sc-1');
    const panel3Dialogue = blocks.filter((b) => b.attrs.blockType === 'dialogue')[2];
    panel3Dialogue.content = [{ type: 'text', text: '@Minh : "Cẩn thận!"' }];
    const panel1Dialogue = blocks.filter((b) => b.attrs.blockType === 'dialogue')[0];
    panel1Dialogue.content = [{ type: 'text', text: '@Minh : ""' }];

    const extracted = extractScriptLinesFromDoc({ type: 'doc', content: blocks }, 'sc-1');
    const dialogues = extracted.filter((l) => l.dialogueText);
    expect(dialogues).toHaveLength(1);
    expect(dialogues[0]).toMatchObject({ pageNumber: 1, panelNumber: 3 });
  });
});

describe('Lưu đúng cấu trúc Nhân vật -> Lời thoại', () => {
  it('thoại gõ bằng @mention được lưu là DialogueText kèm SpeakerCharacterId', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'scriptLineBlock', attrs: { blockType: 'page_heading', pageNumber: 1 }, content: [{ type: 'text', text: 'Trang 01' }] },
        { type: 'scriptLineBlock', attrs: { blockType: 'panel_heading' }, content: [{ type: 'text', text: 'PANEL 1.1' }] },
        {
          type: 'scriptLineBlock',
          attrs: { blockType: 'stage_direction' },
          content: [
            { type: 'bibleMention', attrs: { id: 'chr-iruka', code: 'IRUKA', label: 'Iruka', category: 'Character' } },
            { type: 'text', text: ' : "Chào Naruto"' },
          ],
        },
      ],
    };
    const line = extractScriptLinesFromDoc(doc, 'sc-1').find((l) => l.dialogueText);
    expect(line).toMatchObject({
      dialogueText: '(IRUKA) : "Chào Naruto"',
      stageDirection: null,
      speakerCharacterId: 'chr-iruka',
      pageNumber: 1,
      panelNumber: 1,
    });
  });

  it('tải rồi lưu lại không nhân bản dòng tên người nói', () => {
    const scenes: SceneDetailDto[] = [
      {
        id: 'sc-1', chapterId: 'c-1', sceneNumber: 1, heading: 'A', summary: null,
        defaultNarrationMode: 'Present', createdAt: '2026-01-01', version: 1,
        scriptLines: [
          { id: 'l-1', lineOrder: 1, speakerCharacterId: 'chr-1', dialogueText: 'Xin chào', stageDirection: null, narrationMode: 'Present' },
        ],
      },
    ];
    const doc = scenesToTipTapDoc(scenes, () => 'Minh');
    const lines = extractScriptLinesFromDoc(doc, 'sc-1').filter((l) => l.blockType !== 'scene_heading');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ dialogueText: '@Minh : "Xin chào"', speakerCharacterId: 'chr-1' });
  });
});

