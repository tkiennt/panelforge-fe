// src/roles/writer/components/script/thumbnail-studio/store/useComicStudioStore.ts
import { create } from 'zustand';
import { ComicScriptAST } from '../types';
import { parseComicScript, insertTransitionPageStub } from '../lib/comicScriptParser';

export const DEFAULT_DEMO_SCRIPT = `
EXT. SHIBUYA CROSSING - NIGHT (RAIN)

# Page 1
- Panel 1: Extreme Wide
Tokyo mưa đêm ngập trong ánh đèn neon mờ ảo. Minh đứng im giữa dòng người qua lại.
MINH: Đêm nay dường như đã chết...

- Panel 2: Close-up
Màn hình điện thoại vỡ nát dưới vũng nước mưa.
* BZZZZ... BZZZZ... *

- Panel 3: Low angle
Ánh đèn pha xe tải rọi chói lòa từ xa.
MINH/Shout: Hả?! Cái quái gì thế này?!
* KÍTTTTTT! *

# Page 2
- Panel 1: Medium shot
Tiếng còi xe inh ỏi khắp ngã tư.
MINH (thì thầm): Không kịp rồi.
`.trim();

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

const initialAst = parseComicScript(DEFAULT_DEMO_SCRIPT);

export const useComicStudioStore = create<ComicStudioState>((set, get) => ({
  rawScript: DEFAULT_DEMO_SCRIPT,
  ast: initialAst,
  isDrawerOpen: false,
  activePanelId: initialAst.pages[0]?.panels[0]?.id || null,
  activePageNumber: 1,
  activePanelNumber: 1,
  sketches: {},

  setRawScript: (text: string) => {
    const scriptToParse = text?.trim() ? text : DEFAULT_DEMO_SCRIPT;
    const ast = parseComicScript(scriptToParse);
    set({ rawScript: scriptToParse, ast });
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
