import { describe, expect, it } from 'vitest';
import type { ChangeRequestDto, PanelDto } from '@/types';
import {
  changeRequestMarksForPage,
  hasChangeRequestLocation,
  resolveChangeRequestLocation,
} from './changeRequestLocation';

const base: ChangeRequestDto = {
  id: 'cr-1',
  assignmentId: 'a-1',
  chapterId: 'ch-1',
  responsibleUserId: 'u-1',
  createdByUserId: 'e-1',
  description: 'Sửa tay nhân vật',
  status: 'Open',
  createdAt: '2026-11-11T00:00:00Z',
};
const panels = { 'page-2': [{ id: 'panel-9', pageId: 'page-2', panelNumber: 3 } as PanelDto] };

describe('changeRequestLocation', () => {
  it('dùng pageId, vùng khoanh và công đoạn BE trả về', () => {
    const loc = resolveChangeRequestLocation(
      {
        ...base,
        pageId: 'page-1',
        pipelineStageId: 'stage-ink',
        regionJson: JSON.stringify({ x: 0.1, y: 0.2, w: 0.3, h: 0.4 }),
      },
      panels,
    );
    expect(loc).toEqual({
      pageId: 'page-1',
      panelId: null,
      box: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 },
      stageId: 'stage-ink',
    });
  });

  it('dữ liệu cũ không có pageId: tìm trang theo khung', () => {
    expect(resolveChangeRequestLocation({ ...base, panelId: 'panel-9' }, panels)?.pageId).toBe(
      'page-2',
    );
    // panelId nằm trong regionJson kiểu cũ
    expect(
      resolveChangeRequestLocation({ ...base, regionJson: '{"panelId":"panel-9"}' }, panels)
        ?.panelId,
    ).toBe('panel-9');
  });

  it('không xác định được trang → null, không hiện nút', () => {
    expect(resolveChangeRequestLocation(base, panels)).toBeNull();
    expect(hasChangeRequestLocation(base)).toBe(false);
    expect(hasChangeRequestLocation({ ...base, pageId: 'page-1' })).toBe(true);
  });
});

describe('changeRequestMarksForPage', () => {
  const region = JSON.stringify({ x: 0.1, y: 0.1, w: 0.2, h: 0.2 });
  const crs: ChangeRequestDto[] = [
    {
      ...base,
      id: 'open-pencil',
      pageId: 'page-1',
      pipelineStageId: 'pencil',
      regionJson: region,
      assetReferenceId: 'art-v1',
    },
    {
      ...base,
      id: 'resolved',
      pageId: 'page-1',
      pipelineStageId: 'pencil',
      regionJson: region,
      status: 'Resolved',
    },
    { ...base, id: 'writer', pageId: 'page-1', pipelineStageId: 'script', regionJson: region },
    { ...base, id: 'other-page', pageId: 'page-2', pipelineStageId: 'pencil', regionJson: region },
    { ...base, id: 'no-region', pageId: 'page-1', pipelineStageId: 'pencil' },
    {
      ...base,
      id: 'numeric-open',
      pageId: 'page-1',
      pipelineStageId: 'pencil',
      regionJson: region,
      status: 0,
    },
  ];

  it('chỉ lấy yêu cầu còn Mở, đúng trang, của công đoạn Artist, có vùng / khung', () => {
    const marks = changeRequestMarksForPage(crs, 'page-1', {}, ['pencil', 'ink'], ['art-v1']);
    expect(marks.map((m) => m.id)).toEqual(['open-pencil', 'numeric-open']);
  });

  it('tải bản mới không xoá vùng, chỉ đánh dấu "khoanh trên bản cũ"', () => {
    const before = changeRequestMarksForPage(crs, 'page-1', {}, ['pencil'], ['art-v1']);
    const after = changeRequestMarksForPage(crs, 'page-1', {}, ['pencil'], ['art-v2']);
    expect(before[0].onOlderVersion).toBe(false);
    expect(after[0].id).toBe('open-pencil');
    expect(after[0].onOlderVersion).toBe(true);
  });
});
