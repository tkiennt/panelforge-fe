import { describe, it, expect } from 'vitest';
import {
  normalizeRegionBox,
  parseRegionBox,
  findIntersectingPanelId,
  isRegionOverlappingText,
  suggestTargetAssignment,
  buildReturnWorkPayload,
  parse409AwaitingReview,
} from './chapterReviewViewUtils';
import type { AssignmentDto, PanelDto } from '@/types';
import type { ElementSnapshotDto } from '@/services/element.service';
import type { PipelineStageDto } from '@/services/pipeline.service';

describe('chapterReviewViewUtils', () => {
  describe('normalizeRegionBox', () => {
    it('chuyển toạ độ kéo chuột từ góc trên trái xuống góc dưới phải sang 0..1', () => {
      const box = normalizeRegionBox(120, 180, 480, 720, 1200, 1800);
      expect(box).toEqual({
        x: 0.1,
        y: 0.1,
        w: 0.3,
        h: 0.3,
      });
    });

    it('xử lý kéo ngược từ dưới phải lên trên trái đúng toạ độ x, y và w, h dương', () => {
      const box = normalizeRegionBox(600, 900, 300, 450, 1200, 1800);
      expect(box).toEqual({
        x: 0.25,
        y: 0.25,
        w: 0.25,
        h: 0.25,
      });
    });

    it('giới hạn nghiêm ngặt trong khoảng [0, 1] khi kéo vượt biên ảnh', () => {
      const box = normalizeRegionBox(-100, -50, 1500, 2000, 1200, 1800);
      expect(box.x).toBe(0);
      expect(box.y).toBe(0);
      expect(box.w).toBe(1);
      expect(box.h).toBe(1);
    });
  });

  describe('parseRegionBox', () => {
    it('parse được định dạng chuẩn {x, y, w, h}', () => {
      const box = parseRegionBox('{"x":0.15,"y":0.2,"w":0.35,"h":0.4}');
      expect(box).toEqual({ x: 0.15, y: 0.2, w: 0.35, h: 0.4 });
    });

    it('parse được định dạng cũ {x, y, width, height}', () => {
      const box = parseRegionBox('{"x":0.05,"y":0.1,"width":0.5,"height":0.6}');
      expect(box).toEqual({ x: 0.05, y: 0.1, w: 0.5, h: 0.6 });
    });

    it('trả về null khi JSON sai cú pháp hoặc thiếu toạ độ', () => {
      expect(parseRegionBox(null)).toBeNull();
      expect(parseRegionBox('invalid')).toBeNull();
      expect(parseRegionBox('{"x":0.1}')).toBeNull();
    });
  });

  describe('findIntersectingPanelId', () => {
    const panels: PanelDto[] = [
      {
        id: 'panel-top',
        pageId: 'page-1',
        panelNumber: 1,
        readingOrder: 1,
        boundingBox: JSON.stringify({
          x: 0,
          y: 0,
          width: 1200,
          height: 600,
          unit: 'px',
          pageWidthPx: 1200,
          pageHeightPx: 1800,
        }),
        createdAt: '2026-10-17T00:00:00Z',
      },
      {
        id: 'panel-bottom',
        pageId: 'page-1',
        panelNumber: 2,
        readingOrder: 2,
        boundingBox: JSON.stringify({
          x: 0,
          y: 600,
          width: 1200,
          height: 1200,
          unit: 'px',
          pageWidthPx: 1200,
          pageHeightPx: 1800,
        }),
        createdAt: '2026-10-17T00:00:00Z',
      },
    ];

    it('tìm đúng panel có diện tích giao lớn nhất', () => {
      // Vùng ở nửa trên (y: 0.1 đến 0.2) -> panel-top
      const topBox = { x: 0.1, y: 0.1, w: 0.2, h: 0.1 };
      expect(findIntersectingPanelId(topBox, panels)).toBe('panel-top');

      // Vùng ở nửa dưới (y: 0.5 đến 0.8) -> panel-bottom
      const bottomBox = { x: 0.1, y: 0.5, w: 0.3, h: 0.3 };
      expect(findIntersectingPanelId(bottomBox, panels)).toBe('panel-bottom');
    });

    it('trả về undefined khi vùng không giao với panel nào', () => {
      const box = { x: 0.1, y: 0.1, w: 0, h: 0 };
      expect(findIntersectingPanelId(box, panels)).toBeUndefined();
    });
  });

  describe('isRegionOverlappingText và suggestTargetAssignment', () => {
    const elements: ElementSnapshotDto[] = [
      {
        elementId: 'el-bubble-1',
        elementType: 'SPEECH_BALLOON',
        x: 600, // 0.5
        y: 180, // 0.1
        width: 240, // 0.2
        height: 180, // 0.1
        zIndex: 10,
        version: 1,
        isRemoved: false,
      },
    ];

    const stages: PipelineStageDto[] = [
      {
        id: 'st-pencil',
        name: 'Pencil',
        stageOrder: 3,
        slug: 'pencil',
        isApprovalGate: false,
        isInitial: false,
        isTerminal: false,
      },
      {
        id: 'st-ink',
        name: 'Ink',
        stageOrder: 4,
        slug: 'ink',
        isApprovalGate: false,
        isInitial: false,
        isTerminal: false,
      },
      {
        id: 'st-color',
        name: 'Color',
        stageOrder: 5,
        slug: 'color',
        isApprovalGate: false,
        isInitial: false,
        isTerminal: false,
      },
      {
        id: 'st-letter',
        name: 'Letter',
        stageOrder: 6,
        slug: 'letter',
        isApprovalGate: false,
        isInitial: false,
        isTerminal: false,
      },
    ];

    const assignments: AssignmentDto[] = [
      {
        id: 'as-ink',
        seriesId: 's1',
        chapterId: 'c1',
        entityType: 'Page',
        targetEntityId: 'page-1',
        pipelineStageId: 'st-ink',
        assigneeUserId: 'artist-1',
        assignedRole: 'ARTIST',
        brief: 'Vẽ mực trang 1',
        priority: 'Medium',
        status: 'Approved',
        createdAt: '2026-10-17T00:00:00Z',
      },
      {
        id: 'as-color',
        seriesId: 's1',
        chapterId: 'c1',
        entityType: 'Page',
        targetEntityId: 'page-1',
        pipelineStageId: 'st-color',
        assigneeUserId: 'colorist-1',
        assignedRole: 'ARTIST',
        brief: 'Tô màu trang 1',
        priority: 'Medium',
        status: 'Approved',
        createdAt: '2026-10-17T00:00:00Z',
      },
      {
        id: 'as-letter',
        seriesId: 's1',
        chapterId: 'c1',
        entityType: 'Page',
        targetEntityId: 'page-1',
        pipelineStageId: 'st-letter',
        assigneeUserId: 'letterer-1',
        assignedRole: 'LETTERER',
        brief: 'Chèn chữ trang 1',
        priority: 'Medium',
        status: 'Approved',
        createdAt: '2026-10-17T00:00:00Z',
      },
    ];

    it('nhận diện vùng đè lên bóng thoại và gợi ý stage Letter', () => {
      // Vùng trùng toạ độ bóng thoại (x: 0.55, y: 0.12)
      const textOverlapBox = { x: 0.52, y: 0.11, w: 0.1, h: 0.08 };
      expect(isRegionOverlappingText(textOverlapBox, elements, 1200, 1800)).toBe(true);

      const targetId = suggestTargetAssignment(
        textOverlapBox,
        assignments,
        elements,
        stages,
        1200,
        1800,
      );
      expect(targetId).toBe('as-letter');
    });

    it('khi không đè bóng thoại thì gợi ý stage Color (hoặc Ink)', () => {
      // Vùng ở góc khác không có chữ
      const artBox = { x: 0.1, y: 0.7, w: 0.2, h: 0.2 };
      expect(isRegionOverlappingText(artBox, elements, 1200, 1800)).toBe(false);

      const targetId = suggestTargetAssignment(artBox, assignments, elements, stages, 1200, 1800);
      expect(targetId).toBe('as-color');
    });
  });

  describe('buildReturnWorkPayload', () => {
    const pageAssignment: AssignmentDto = {
      id: 'as-page-letter',
      seriesId: 's1',
      chapterId: 'c1',
      entityType: 'Page',
      targetEntityId: 'page-1',
      pipelineStageId: 'st-letter',
      assigneeUserId: 'letterer-1',
      assignedRole: 'LETTERER',
      brief: 'Letter trang 1',
      priority: 'Medium',
      status: 'Approved',
      createdAt: '2026-10-17T00:00:00Z',
    };

    const panelAssignment: AssignmentDto = {
      id: 'as-panel-ink',
      seriesId: 's1',
      chapterId: 'c1',
      entityType: 'Panel',
      targetEntityId: 'panel-2',
      pipelineStageId: 'st-ink',
      assigneeUserId: 'artist-1',
      assignedRole: 'ARTIST',
      brief: 'Ink khung 2',
      priority: 'Medium',
      status: 'Approved',
      createdAt: '2026-10-17T00:00:00Z',
    };

    it('tạo payload chuẩn với regionJson {x,y,w,h} và panelId thuộc Page task', () => {
      const payload = buildReturnWorkPayload({
        targetAssignmentId: pageAssignment.id,
        description: 'Bóng thoại che mắt nhân vật',
        box: { x: 0.21234, y: 0.34567, w: 0.15555, h: 0.12222 },
        panelId: 'panel-1',
        targetAssignment: pageAssignment,
      });

      expect(payload.targetAssignmentId).toBe('as-page-letter');
      expect(payload.description).toBe('Bóng thoại che mắt nhân vật');
      expect(payload.panelId).toBe('panel-1');
      expect(payload.regionJson).toBe(
        JSON.stringify({ x: 0.2123, y: 0.3457, w: 0.1556, h: 0.1222 }),
      );
    });

    it('loại trừ panelId khi khung không khớp targetEntityId của Panel task', () => {
      const payload = buildReturnWorkPayload({
        targetAssignmentId: panelAssignment.id,
        description: 'Sửa nét vẽ khung 1',
        box: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 },
        panelId: 'panel-1', // Khung 1 khác với targetEntityId panel-2
        targetAssignment: panelAssignment,
      });

      expect(payload.panelId).toBeUndefined();
    });

    it('giữ panelId khi khung khớp targetEntityId của Panel task', () => {
      const payload = buildReturnWorkPayload({
        targetAssignmentId: panelAssignment.id,
        description: 'Sửa nét vẽ khung 2',
        box: { x: 0.1, y: 0.6, w: 0.2, h: 0.2 },
        panelId: 'panel-2',
        targetAssignment: panelAssignment,
      });

      expect(payload.panelId).toBe('panel-2');
    });
  });

  describe('parse409AwaitingReview', () => {
    it('nhận diện lỗi 409 việc đang chờ duyệt', () => {
      const error = {
        response: {
          status: 409,
          data: {
            error: 'Việc này đang chờ duyệt: hãy trả về qua cổng duyệt của chính việc đó.',
          },
        },
      };

      const result = parse409AwaitingReview(error, 'target-as-1');
      expect(result.isAwaitingReview).toBe(true);
      expect(result.message).toContain('đang chờ duyệt');
      expect(result.targetAssignmentId).toBe('target-as-1');
    });

    it('trả về isAwaitingReview = false với các lỗi khác', () => {
      const error = {
        response: {
          status: 409,
          data: {
            error: 'Trang 2 chưa được duyệt ở stage Letter.',
          },
        },
      };

      const result = parse409AwaitingReview(error, 'target-as-1');
      expect(result.isAwaitingReview).toBe(false);
      expect(result.message).toContain('Trang 2');
    });
  });
});
