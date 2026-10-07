import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasElement extends BoundingBox {
  id: string;
  type: 'artwork' | 'text_balloon';
  panelId: string;
  content?: string;
  color?: string;
  warning?: 'overflow' | 'overlap' | null;
}

export interface LockedCharacter {
  id: string;
  name: string;
  version: string;
  colorMode: string;
}

interface WorkspaceState {
  lockedCharacters: LockedCharacter[];
  canvasElements: CanvasElement[];
  addLockedCharacter: (char: LockedCharacter) => void;
  addCanvasElement: (el: CanvasElement) => void;
  updateCanvasElement: (id: string, updates: Partial<CanvasElement>) => void;
  removeCanvasElement: (id: string) => void;
  setCanvasElements: (elements: CanvasElement[]) => void;
}

const WorkspaceContext = createContext<WorkspaceState | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lockedCharacters, setLockedCharacters] = useState<LockedCharacter[]>([]);
  const [canvasElements, setCanvasElementsState] = useState<CanvasElement[]>([]);

  const addLockedCharacter = (char: LockedCharacter) => {
    setLockedCharacters((prev) => {
      // Prevent duplicates by ID
      if (prev.some((c) => c.id === char.id)) return prev;
      return [...prev, char];
    });
  };

  const addCanvasElement = (el: CanvasElement) => {
    setCanvasElementsState((prev) => [...prev, el]);
  };

  const updateCanvasElement = (id: string, updates: Partial<CanvasElement>) => {
    setCanvasElementsState((prev) =>
      prev.map((el) => (el.id === id ? { ...el, ...updates } : el))
    );
  };

  const removeCanvasElement = (id: string) => {
    setCanvasElementsState((prev) => prev.filter((el) => el.id !== id));
  };
  
  const setCanvasElements = (elements: CanvasElement[]) => {
    setCanvasElementsState(elements);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        lockedCharacters,
        canvasElements,
        addLockedCharacter,
        addCanvasElement,
        updateCanvasElement,
        removeCanvasElement,
        setCanvasElements,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
