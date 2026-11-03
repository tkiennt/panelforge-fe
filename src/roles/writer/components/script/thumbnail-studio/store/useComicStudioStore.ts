// src/roles/writer/components/script/thumbnail-studio/store/useComicStudioStore.ts
import { create } from 'zustand';
import { ComicScriptAST } from '../types';
import { parseComicScript, insertTransitionPageStub } from '../lib/comicScriptParser';

export interface ComicStudioState {
  rawScript: string;
  ast: ComicScriptAST;
  isDrawerOpen: boolean;
  activePanelId: string | null;
  activePageNumber: number | null;
  activePanelNumber: number | null;
  sketches: Record<string, string>; // panelId -> base64 dataUrl

  // Actions
  setRawScript: (text: string) => void;
  toggleDrawer: () => void;
  openDrawer: (panelId?: string) => void;
  closeDrawer: () => void;
  setActivePanel: (panelId: string | null, pageNum?: number | null, panelNum?: number | null) => void;
  insertTransitionPage: (afterPageNumber: number, prevRank: string, nextRank?: string) => number;
  saveSketch: (panelId: string, dataUrl: string) => void;
  clearSketch: (panelId: string) => void;
}

export const useComicStudioStore = create<ComicStudioState>((set, get) => ({
  rawScript: '',
  ast: { scenes: [], pages: [] },
  isDrawerOpen: false,
  activePanelId: null,
  activePageNumber: 1,
  activePanelNumber: 1,
  sketches: {},

  setRawScript: (text: string) => {
    const ast = parseComicScript(text);
    set({ rawScript: text, ast });
  },

  toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),

  openDrawer: (panelId?: string) =>
    set({
      isDrawerOpen: true,
      ...(panelId ? { activePanelId: panelId } : {}),
    }),

  closeDrawer: () => set({ isDrawerOpen: false }),

  setActivePanel: (panelId, pageNum = null, panelNum = null) =>
    set({
      activePanelId: panelId,
      activePageNumber: pageNum,
      activePanelNumber: panelNum,
    }),

  insertTransitionPage: (afterPageNumber, prevRank, nextRank) => {
    const state = get();
    const result = insertTransitionPageStub(
      state.rawScript,
      afterPageNumber,
      prevRank,
      nextRank
    );
    const updatedAst = parseComicScript(result.newScript);
    set({
      rawScript: result.newScript,
      ast: updatedAst,
      isDrawerOpen: true,
    });
    return result.newPageNumber;
  },

  saveSketch: (panelId: string, dataUrl: string) =>
    set((state) => ({
      sketches: {
        ...state.sketches,
        [panelId]: dataUrl,
      },
    })),

  clearSketch: (panelId: string) =>
    set((state) => {
      const copy = { ...state.sketches };
      delete copy[panelId];
      return { sketches: copy };
    }),
}));
