import { describe, it, expect } from 'vitest';
import {
  ChapterStatus,
  RoleInProject,
  VALID_CHAPTER_TRANSITIONS,
  canTransitionChapterStatus,
  isScriptEditable,
  generatePageOrderRank,
  analyzePageSceneTransitions,
  type Chapter,
  type ChapterScript,
  type Panel,
} from './schema';

describe('Core Production Architecture - Schema & Domain Rules', () => {
  describe('Chapter State Machine Transitions', () => {
    it('should follow strict linear state progression', () => {
      expect(canTransitionChapterStatus(ChapterStatus.PLANNING, ChapterStatus.SCRIPTING)).toBe(
        true,
      );
      expect(canTransitionChapterStatus(ChapterStatus.SCRIPTING, ChapterStatus.IN_REVIEW)).toBe(
        true,
      );
      expect(canTransitionChapterStatus(ChapterStatus.IN_REVIEW, ChapterStatus.APPROVED)).toBe(
        true,
      );
      expect(canTransitionChapterStatus(ChapterStatus.APPROVED, ChapterStatus.STORYBOARDING)).toBe(
        true,
      );
      expect(canTransitionChapterStatus(ChapterStatus.STORYBOARDING, ChapterStatus.DRAWING)).toBe(
        true,
      );
      expect(canTransitionChapterStatus(ChapterStatus.DRAWING, ChapterStatus.PUBLISHED)).toBe(true);
    });

    it('should allow review rejection back to scripting', () => {
      expect(canTransitionChapterStatus(ChapterStatus.IN_REVIEW, ChapterStatus.SCRIPTING)).toBe(
        true,
      );
    });

    it('should disallow invalid or skipped transitions', () => {
      // Cannot jump from PLANNING directly to APPROVED
      expect(canTransitionChapterStatus(ChapterStatus.PLANNING, ChapterStatus.APPROVED)).toBe(
        false,
      );
      // Cannot jump from SCRIPTING to DRAWING
      expect(canTransitionChapterStatus(ChapterStatus.SCRIPTING, ChapterStatus.DRAWING)).toBe(
        false,
      );
      // PUBLISHED is a terminal state
      expect(canTransitionChapterStatus(ChapterStatus.PUBLISHED, ChapterStatus.SCRIPTING)).toBe(
        false,
      );
    });
  });

  describe('Script Editing Authorization & Locking Guards', () => {
    const baseChapter: Chapter = {
      id: 'chap-1',
      seriesId: 'series-1',
      chapterNumber: 1,
      title: 'Episode 1: The Beginning',
      status: ChapterStatus.SCRIPTING,
      deadline: '2026-12-01',
      targetPanels: 60,
      producerId: 'producer-user-1',
      writerId: 'writer-user-1',
      artistId: 'artist-user-1',
      createdAt: '2026-11-03T00:00:00Z',
      updatedAt: '2026-11-03T00:00:00Z',
    };

    const unlockedScript: ChapterScript = {
      id: 'script-1',
      chapterId: 'chap-1',
      version: 1,
      rawText: 'INT. COFFEE SHOP - DAY\nAction text...',
      isLocked: false,
      lockedAt: null,
      lockedById: null,
      createdAt: '2026-11-03T00:00:00Z',
      updatedAt: '2026-11-03T00:00:00Z',
    };

    it('should allow assigned Writer to edit while in SCRIPTING status', () => {
      const result = isScriptEditable(baseChapter, unlockedScript, 'writer-user-1');
      expect(result.allowed).toBe(true);
    });

    it('should allow assigned Producer to edit while in SCRIPTING status', () => {
      const result = isScriptEditable(baseChapter, unlockedScript, 'producer-user-1');
      expect(result.allowed).toBe(true);
    });

    it('should reject unauthorized user edits (e.g. Artist or unassigned user)', () => {
      const resultArtist = isScriptEditable(baseChapter, unlockedScript, 'artist-user-1');
      expect(resultArtist.allowed).toBe(false);
      expect(resultArtist.reason).toContain('Only the assigned Writer or the Producer');

      const resultStranger = isScriptEditable(baseChapter, unlockedScript, 'random-user-99');
      expect(resultStranger.allowed).toBe(false);
    });

    it('should strictly reject edits when script is locked (e.g. after approval)', () => {
      const lockedScript: ChapterScript = {
        ...unlockedScript,
        isLocked: true,
        lockedAt: '2026-11-03T12:00:00Z',
        lockedById: 'producer-user-1',
      };

      const result = isScriptEditable(baseChapter, lockedScript, 'writer-user-1');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Script is locked and cannot be edited');
    });

    it('should reject edits when Chapter status is not SCRIPTING (e.g. IN_REVIEW or STORYBOARDING)', () => {
      const inReviewChapter: Chapter = { ...baseChapter, status: ChapterStatus.IN_REVIEW };
      const reviewResult = isScriptEditable(inReviewChapter, unlockedScript, 'writer-user-1');
      expect(reviewResult.allowed).toBe(false);
      expect(reviewResult.reason).toContain('status is SCRIPTING');

      const storyboardingChapter: Chapter = { ...baseChapter, status: ChapterStatus.STORYBOARDING };
      const sbResult = isScriptEditable(storyboardingChapter, unlockedScript, 'writer-user-1');
      expect(sbResult.allowed).toBe(false);
    });
  });

  describe('Intra-Page Scene Transitions (panel.sceneId)', () => {
    it('should detect and analyze intra-page scene transitions across panels', () => {
      const panels: Panel[] = [
        {
          id: 'p-1',
          pageId: 'page-1',
          sceneId: 'scene-present-1',
          panelNumber: 1,
          cameraShot: 'WIDE',
          actionText: 'Ryu stands in the rain at Shibuya crossing.',
          isFlashback: false,
          dialogues: [{ character: 'RYU', text: 'It started on that day...' }],
          sfx: [{ text: 'RUMBLE' }],
        },
        {
          id: 'p-2',
          pageId: 'page-1',
          sceneId: 'scene-flashback-1', // Transition to Flashback scene on the SAME page
          panelNumber: 2,
          cameraShot: 'CLOSE UP',
          actionText: 'Memory of the burning dojo five years ago.',
          isFlashback: true,
          dialogues: [{ character: 'MASTER', modifier: '(WHISPERING)', text: 'Never look back.' }],
          sfx: [{ text: 'CRACKLE' }],
        },
        {
          id: 'p-3',
          pageId: 'page-1',
          sceneId: 'scene-flashback-1',
          panelNumber: 3,
          cameraShot: 'MEDIUM',
          actionText: 'The flames consume the wooden gate.',
          isFlashback: true,
          dialogues: null,
          sfx: null,
        },
      ];

      const analysis = analyzePageSceneTransitions(panels);
      expect(analysis.isMultiScene).toBe(true);
      expect(analysis.sceneIds).toHaveLength(2);
      expect(analysis.sceneIds).toContain('scene-present-1');
      expect(analysis.sceneIds).toContain('scene-flashback-1');
      expect(analysis.transitions).toHaveLength(1);
      expect(analysis.transitions[0]).toEqual({
        fromSceneId: 'scene-present-1',
        toSceneId: 'scene-flashback-1',
        atPanelNumber: 2,
      });
    });

    it('should handle single-scene pages correctly', () => {
      const singleScenePanels: Panel[] = [
        {
          id: 'p-1',
          pageId: 'page-2',
          sceneId: 'scene-present-1',
          panelNumber: 1,
          cameraShot: 'WIDE',
          actionText: 'Action 1',
          isFlashback: false,
          dialogues: null,
          sfx: null,
        },
        {
          id: 'p-2',
          pageId: 'page-2',
          sceneId: 'scene-present-1',
          panelNumber: 2,
          cameraShot: 'MEDIUM',
          actionText: 'Action 2',
          isFlashback: false,
          dialogues: null,
          sfx: null,
        },
      ];

      const analysis = analyzePageSceneTransitions(singleScenePanels);
      expect(analysis.isMultiScene).toBe(false);
      expect(analysis.sceneIds).toEqual(['scene-present-1']);
      expect(analysis.transitions).toHaveLength(0);
    });
  });

  describe('LexoRank Fractional Indexing for Pages', () => {
    it('should generate valid ordered ranks for page insertion', () => {
      const rank1 = generatePageOrderRank();
      const rank3 = generatePageOrderRank(rank1, undefined);
      const rank2 = generatePageOrderRank(rank1, rank3);

      expect(rank1 < rank2).toBe(true);
      expect(rank2 < rank3).toBe(true);
    });
  });
});
