import { describe, it, expect, vi, beforeEach } from 'vitest';
import axiosClient from '../api/axiosClient';
import { scriptLineService } from './scriptLine.service';

vi.mock('../api/axiosClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('scriptLineService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Scenes', () => {
    it('getScenesByChapter calls GET /chapters/{id}/scenes', async () => {
      const mockScenes = [
        {
          id: 's1',
          chapterId: 'c1',
          sceneNumber: 1,
          heading: 'Scene 1',
          scriptLinesCount: 2,
          pagesCount: 1,
        },
      ];
      vi.mocked(axiosClient.get).mockResolvedValueOnce({ data: mockScenes });

      const res = await scriptLineService.getScenesByChapter('c1');
      expect(axiosClient.get).toHaveBeenCalledWith('/chapters/c1/scenes');
      expect(res).toEqual(mockScenes);
    });

    it('getSceneById calls GET /scenes/{id}', async () => {
      const mockDetail = {
        id: 's1',
        chapterId: 'c1',
        sceneNumber: 1,
        heading: 'Scene 1',
        scriptLines: [{ id: 'l1', lineOrder: 1, dialogueText: 'Hello' }],
      };
      vi.mocked(axiosClient.get).mockResolvedValueOnce({ data: mockDetail });

      const res = await scriptLineService.getSceneById('s1');
      expect(axiosClient.get).toHaveBeenCalledWith('/scenes/s1');
      expect(res).toEqual(mockDetail);
    });

    it('createScene calls POST /chapters/{id}/scenes', async () => {
      const req = { sceneNumber: 1, heading: 'Scene 1', summary: 'Intro' };
      const created = { id: 's1', chapterId: 'c1', ...req, scriptLinesCount: 0, pagesCount: 0 };
      vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: created });

      const res = await scriptLineService.createScene('c1', req);
      expect(axiosClient.post).toHaveBeenCalledWith('/chapters/c1/scenes', req);
      expect(res).toEqual(created);
    });

    it('updateScene calls PUT /scenes/{id}', async () => {
      const req = { heading: 'Updated Scene', summary: 'New summary' };
      const updated = { id: 's1', ...req };
      vi.mocked(axiosClient.put).mockResolvedValueOnce({ data: updated });

      const res = await scriptLineService.updateScene('s1', req);
      expect(axiosClient.put).toHaveBeenCalledWith('/scenes/s1', req);
      expect(res).toEqual(updated);
    });

    it('deleteScene calls DELETE /scenes/{id}', async () => {
      vi.mocked(axiosClient.delete).mockResolvedValueOnce({ data: { message: 'Deleted' } });

      const res = await scriptLineService.deleteScene('s1');
      expect(axiosClient.delete).toHaveBeenCalledWith('/scenes/s1');
      expect(res.message).toBe('Deleted');
    });

    it('reorderScenes calls PUT /chapters/{id}/scenes/reorder', async () => {
      const scenes = [{ sceneId: 's1', newSceneNumber: 2 }];
      vi.mocked(axiosClient.put).mockResolvedValueOnce({ data: { message: 'Reordered' } });

      const res = await scriptLineService.reorderScenes('c1', scenes);
      expect(axiosClient.put).toHaveBeenCalledWith('/chapters/c1/scenes/reorder', { scenes });
      expect(res.message).toBe('Reordered');
    });
  });

  describe('ScriptLines (UC-06)', () => {
    it('createScriptLine calls POST /chapters/{cId}/scenes/{sId}/script-lines', async () => {
      const req = {
        dialogueText: 'Hello world',
        speakerCharacterId: 'char-1',
        lineOrder: 1,
        expectedChapterVersion: 5,
      };
      const created = {
        id: 'l1',
        sceneId: 's1',
        lineOrder: 1,
        dialogueText: 'Hello world',
        speakerCharacterId: 'char-1',
        chapterVersion: 6,
        revisionId: 'rev-1',
      };
      vi.mocked(axiosClient.post).mockResolvedValueOnce({ data: created });

      const res = await scriptLineService.createScriptLine('c1', 's1', req);
      expect(axiosClient.post).toHaveBeenCalledWith('/chapters/c1/scenes/s1/script-lines', req);
      expect(res).toEqual(created);
    });

    it('updateScriptLine calls PUT /chapters/{cId}/script-lines/{lId}', async () => {
      const req = {
        dialogueText: 'Modified line',
        stageDirection: 'Looking surprised',
        speakerCharacterId: 'char-1',
        expectedChapterVersion: 6,
      };
      const updated = {
        id: 'l1',
        sceneId: 's1',
        lineOrder: 1,
        ...req,
        chapterVersion: 7,
        revisionId: 'rev-2',
      };
      vi.mocked(axiosClient.put).mockResolvedValueOnce({ data: updated });

      const res = await scriptLineService.updateScriptLine('c1', 'l1', req);
      expect(axiosClient.put).toHaveBeenCalledWith('/chapters/c1/script-lines/l1', req);
      expect(res).toEqual(updated);
    });

    it('deleteScriptLine calls DELETE /chapters/{cId}/script-lines/{lId} with expectedChapterVersion param', async () => {
      const deleteResult = { chapterVersion: 8, revisionId: 'rev-3' };
      vi.mocked(axiosClient.delete).mockResolvedValueOnce({ data: deleteResult });

      const res = await scriptLineService.deleteScriptLine('c1', 'l1', 7);
      expect(axiosClient.delete).toHaveBeenCalledWith('/chapters/c1/script-lines/l1', {
        params: { expectedChapterVersion: 7 },
      });
      expect(res).toEqual(deleteResult);
    });

    it('extracts CONFLICT error code and message on 409', async () => {
      const conflictError = {
        response: {
          status: 409,
          data: {
            error: 'Xung đột phiên bản: Chapter đã thay đổi (vector 8 != expected 7).',
            code: 'CONFLICT',
          },
        },
      };
      vi.mocked(axiosClient.put).mockRejectedValueOnce(conflictError);

      try {
        await scriptLineService.updateScriptLine('c1', 'l1', { expectedChapterVersion: 7 });
        expect.fail('Should throw error');
      } catch (err: any) {
        expect(err.message).toBe(
          'Xung đột phiên bản: Chapter đã thay đổi (vector 8 != expected 7).',
        );
        expect(err.code).toBe('CONFLICT');
        expect(err.status).toBe(409);
      }
    });
  });
});
