import { describe, it, expect } from 'vitest';
import { scenesToTipTapDoc, extractScriptLinesFromDoc } from './scriptFlowAdapter';
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
});
