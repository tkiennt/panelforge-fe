// src/roles/writer/components/script/flow/comic-editor/versioning/useScriptVersionStore.ts
import { create } from 'zustand';
import { ScriptVersion } from './types';
import {
  createInitialVersion,
  autosaveDraftAction,
  submitScriptAction,
  requestChangesAction,
  approveScriptAction,
  unlockScriptAction,
  restoreVersionAction,
} from './scriptVersionActions';

const STORAGE_PREFIX = 'panelforge_script_versions_';

function getStorageKey(chapterId: string): string {
  return `${STORAGE_PREFIX}${chapterId || 'default'}`;
}

function loadVersionsFromStorage(chapterId: string): ScriptVersion[] | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = localStorage.getItem(getStorageKey(chapterId));
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('Lỗi đọc lịch sử phiên bản từ localStorage:', err);
  }
  return null;
}

function saveVersionsToStorage(chapterId: string, versions: ScriptVersion[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(getStorageKey(chapterId), JSON.stringify(versions));
    }
  } catch (err) {
    console.warn('Lỗi lưu lịch sử phiên bản vào localStorage:', err);
  }
}

export interface ScriptVersionState {
  chapterId: string;
  versions: ScriptVersion[];
  currentVersionId: string;
  activeDiffVersionId: string | null;
  previewVersionId: string | null;
  isDrawerOpen: boolean;
  isDiffViewerOpen: boolean;
  userRole: 'WRITER' | 'PRODUCER';
  currentUserId: string;

  // Actions
  initialize: (
    chapterId: string,
    initialRawText?: string,
    initialAST?: any,
    userRole?: 'WRITER' | 'PRODUCER',
    userId?: string
  ) => void;
  updateDraftText: (rawText: string, snapshotAST?: any) => void;
  submitForReview: () => void;
  requestChanges: (feedbackNotes: string) => void;
  approveScript: () => void;
  unlockScript: () => void;
  restoreVersion: (targetVersionId: string) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  openDiff: (targetVersionId?: string) => void;
  closeDiff: () => void;
  setPreviewVersion: (versionId: string | null) => void;
  setUserRole: (role: 'WRITER' | 'PRODUCER') => void;
  getCurrentVersion: () => ScriptVersion | undefined;
  getActiveDiffVersion: () => ScriptVersion | undefined;
  getPreviewVersion: () => ScriptVersion | undefined;
}

export const useScriptVersionStore = create<ScriptVersionState>((set, get) => ({
  chapterId: 'default',
  versions: [],
  currentVersionId: '',
  activeDiffVersionId: null,
  previewVersionId: null,
  isDrawerOpen: false,
  isDiffViewerOpen: false,
  userRole: 'WRITER',
  currentUserId: 'writer-user',

  initialize: (
    chapterId: string,
    initialRawText: string = '',
    initialAST: any = null,
    userRole: 'WRITER' | 'PRODUCER' = 'WRITER',
    userId: string = 'writer-user'
  ) => {
    const existing = loadVersionsFromStorage(chapterId);
    let versions: ScriptVersion[];
    let currentId: string;

    if (existing && existing.length > 0) {
      versions = existing;
      // Chọn bản mới nhất (hoặc bản DRAFT cuối cùng)
      currentId = versions[versions.length - 1].id;
    } else {
      const initial = createInitialVersion(chapterId, initialRawText, initialAST, userId);
      versions = [initial];
      currentId = initial.id;
      saveVersionsToStorage(chapterId, versions);
    }

    set({
      chapterId,
      versions,
      currentVersionId: currentId,
      userRole,
      currentUserId: userId,
      activeDiffVersionId: null,
      previewVersionId: null,
      isDrawerOpen: false,
      isDiffViewerOpen: false,
    });
  },

  updateDraftText: (rawText: string, snapshotAST?: any) => {
    const { versions, currentVersionId, chapterId } = get();
    if (!currentVersionId) return;

    try {
      const result = autosaveDraftAction(versions, currentVersionId, rawText, snapshotAST);
      saveVersionsToStorage(chapterId, result.versions);
      set({ versions: result.versions });
    } catch {
      // Bỏ qua nếu không cho phép ghi đè
    }
  },

  submitForReview: () => {
    const { versions, currentVersionId, chapterId } = get();
    if (!currentVersionId) return;

    const result = submitScriptAction(versions, currentVersionId);
    saveVersionsToStorage(chapterId, result.versions);
    set({ versions: result.versions });
  },

  requestChanges: (feedbackNotes: string) => {
    const { versions, currentVersionId, chapterId, currentUserId } = get();
    if (!currentVersionId) return;

    const result = requestChangesAction(versions, currentVersionId, feedbackNotes, currentUserId);
    saveVersionsToStorage(chapterId, result.versions);
    set({
      versions: result.versions,
      currentVersionId: result.newDraftVersion.id,
    });
  },

  approveScript: () => {
    const { versions, currentVersionId, chapterId, currentUserId } = get();
    if (!currentVersionId) return;

    const result = approveScriptAction(versions, currentVersionId, currentUserId);
    saveVersionsToStorage(chapterId, result.versions);
    set({ versions: result.versions });
  },

  unlockScript: () => {
    const { versions, currentVersionId, chapterId, currentUserId } = get();
    if (!currentVersionId) return;

    const result = unlockScriptAction(versions, currentVersionId, currentUserId);
    saveVersionsToStorage(chapterId, result.versions);
    set({
      versions: result.versions,
      currentVersionId: result.newMajorDraftVersion.id,
    });
  },

  restoreVersion: (targetVersionId: string) => {
    const { versions, currentVersionId, chapterId } = get();
    if (!currentVersionId) return;

    const result = restoreVersionAction(versions, currentVersionId, targetVersionId);
    saveVersionsToStorage(chapterId, result.versions);
    set({ versions: result.versions });
  },

  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),

  openDiff: (targetVersionId?: string) => {
    const { versions, currentVersionId } = get();
    // Mặc định chọn bản trước đó nếu không chỉ định
    let target = targetVersionId;
    if (!target) {
      const curIdx = versions.findIndex((v) => v.id === currentVersionId);
      if (curIdx > 0) {
        target = versions[curIdx - 1].id;
      } else if (versions.length > 1) {
        target = versions[0].id;
      } else {
        target = currentVersionId;
      }
    }
    set({ activeDiffVersionId: target, isDiffViewerOpen: true });
  },

  closeDiff: () => set({ isDiffViewerOpen: false, activeDiffVersionId: null }),

  setPreviewVersion: (versionId: string | null) => set({ previewVersionId: versionId }),

  setUserRole: (userRole: 'WRITER' | 'PRODUCER') => set({ userRole }),

  getCurrentVersion: () => {
    const { versions, currentVersionId } = get();
    return versions.find((v) => v.id === currentVersionId);
  },

  getActiveDiffVersion: () => {
    const { versions, activeDiffVersionId } = get();
    return versions.find((v) => v.id === activeDiffVersionId);
  },

  getPreviewVersion: () => {
    const { versions, previewVersionId } = get();
    return versions.find((v) => v.id === previewVersionId);
  },
}));

