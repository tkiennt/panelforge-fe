import type { CrStatus } from '../review-shared/reviewModel';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CanvasRegion {
  id: string;
  box: Box;
  label: string;
  kind: 'draft' | CrStatus;
}

export const parseRegion = (json?: string | null): Box | null => {
  if (!json) return null;
  try {
    const r = JSON.parse(json);
    return [r.x, r.y, r.w, r.h].every((n) => typeof n === 'number') ? r : null;
  } catch {
    return null;
  }
};
