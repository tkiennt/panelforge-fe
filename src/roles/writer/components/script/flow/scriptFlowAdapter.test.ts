// src/roles/writer/components/script/flow/scriptFlowAdapter.test.ts
import { describe, it, expect } from 'vitest';
import { scenesToTipTapDoc, extractScriptLinesFromDoc } from './scriptFlowAdapter';
import { SceneDetailDto } from '@/services/scriptLine.service';

describe('scriptFlowAdapter (Dual-Mode Single Source of Truth)', () => {
  const mockScenes: SceneDetailDto[] = [
    {
      id: 'scene-1111',
      chapterId: 'chap-1',
      sceneNumber: 1,
      heading: 'LÂU ĐÀI BÓNG ĐÊM',
      createdAt: '2026-11-02T12:00:00Z',
      scriptLines: [
        {
          id: 'line-1',
          lineOrder: 1,
          speakerCharacterId: 'char-hero',
          dialogueText: 'Cuối cùng ta cũng đã tìm thấy ngươi!',
          stageDirection: null,
          narrationMode: 'Present',
          panelId: null,
        },
        {
          id: 'line-2',
          lineOrder: 2,
          speakerCharacterId: null,
          dialogueText: null,
          stageDirection: 'Gió rít dữ dội qua khung cửa sổ vỡ vụn.',
          narrationMode: 'Present',
          panelId: null,
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
    expect(doc.content[2].content[0].text).toBe('Cuối cùng ta cũng đã tìm thấy ngươi!');

    // Block 4: Stage direction
    expect(doc.content[3].attrs.blockType).toBe('stage_direction');
    expect(doc.content[3].content[0].text).toBe('Gió rít dữ dội qua khung cửa sổ vỡ vụn.');
  });

  it('trích xuất ngược từ TipTap JSON doc thành danh sách ScriptLinePayload chuẩn xác', () => {
    const doc = scenesToTipTapDoc(mockScenes, (id) => (id === 'char-hero' ? 'Anh Hùng' : null));
    const extracted = extractScriptLinesFromDoc(doc, 'scene-1111');

    expect(extracted.length).toBe(2);

    expect(extracted[0].dialogueText).toBe('Cuối cùng ta cũng đã tìm thấy ngươi!');
    expect(extracted[0].sceneId).toBe('scene-1111');

    expect(extracted[1].stageDirection).toBe('Gió rít dữ dội qua khung cửa sổ vỡ vụn.');
    expect(extracted[1].dialogueText).toBeNull();
  });
});
