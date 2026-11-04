import { describe, it, expect } from 'vitest';
import { scenesToTipTapDoc, extractScriptLinesFromDoc, renumberTipTapDoc } from './scriptFlowAdapter';
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

    // Block 2: Character
    expect(doc.content[1].attrs.blockType).toBe('character');
    expect(doc.content[1].content[0].text).toBe('ANH HÙNG');

    // Block 3: Dialogue
    expect(doc.content[2].attrs.blockType).toBe('dialogue');
    expect(doc.content[2].content[0].text).toContain('Cuối cùng ta cũng đã tìm thấy ngươi!');

    // Block 4: Stage direction
    expect(doc.content[3].attrs.blockType).toBe('stage_direction');
    expect(doc.content[3].content[0].text).toBe('Gió rít dữ dội qua khung cửa sổ vỡ vụn.');
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
  });
});
