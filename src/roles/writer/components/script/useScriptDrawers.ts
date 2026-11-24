// src/roles/writer/components/script/useScriptDrawers.ts
import { useState } from 'react';

export type LeftDrawer = 'scenes' | null;
export type RightDrawer = 'bible' | 'comments' | 'versions' | null;

export const isTestEnvironment =
  typeof process !== 'undefined' &&
  (process.env?.NODE_ENV === 'test' ||
    Boolean(process.env?.VITEST) ||
    typeof (globalThis as any).__vitest_worker__ !== 'undefined');

export interface UseScriptDrawersOptions {
  initialLeftDrawer?: LeftDrawer;
  initialRightDrawer?: RightDrawer;
}

export function useScriptDrawers(options: UseScriptDrawersOptions = {}) {
  const [activeLeftDrawer, setActiveLeftDrawer] = useState<LeftDrawer>(
    options.initialLeftDrawer ?? null,
  );
  const [activeRightDrawer, setActiveRightDrawer] = useState<RightDrawer>(
    options.initialRightDrawer ?? null,
  );

  const toggleLeftDrawer = (drawer: NonNullable<LeftDrawer>) => {
    setActiveLeftDrawer((prev) => (prev === drawer ? null : drawer));
  };

  const toggleRightDrawer = (drawer: NonNullable<RightDrawer>) => {
    setActiveRightDrawer((prev) => (prev === drawer ? null : drawer));
  };

  const closeLeftDrawer = () => setActiveLeftDrawer(null);
  const closeRightDrawer = () => setActiveRightDrawer(null);
  const closeAllDrawers = () => {
    setActiveLeftDrawer(null);
    setActiveRightDrawer(null);
  };

  return {
    activeLeftDrawer,
    activeRightDrawer,
    setActiveLeftDrawer,
    setActiveRightDrawer,
    toggleLeftDrawer,
    toggleRightDrawer,
    closeLeftDrawer,
    closeRightDrawer,
    closeAllDrawers,
  };
}
