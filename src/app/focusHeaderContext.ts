import type React from 'react';
import { createContext, useContext } from 'react';

export interface FocusStageItem {
  id: string;
  label: string;
  key?: string;
}

export interface FocusChapterOption {
  id: string;
  chapterNumber: number;
  title?: string | null;
}

export interface FocusHeaderConfig {
  seriesTitle?: string;
  seriesPath?: string;
  chapters?: FocusChapterOption[];
  currentChapterId?: string | null;
  chapterPath?: string;
  onSelectChapter?: (chapterId: string) => void;
  stages?: FocusStageItem[];
  currentStageIndex?: number;
  isStageFlowCompleted?: boolean;
  isSubmittingStage?: boolean;
  onSubmitStage?: () => void;
  submitButtonLabel?: string;
  onWithdrawStage?: () => void;
  showWithdrawButton?: boolean;
  isWithdrawDisabled?: boolean;
  withdrawDisabledReason?: string;
  isWithdrawingStage?: boolean;
  withdrawButtonLabel?: string;
}

export interface FocusHeaderContextValue {
  isInsideFocusLayout: boolean;
  setHeaderConfig: React.Dispatch<React.SetStateAction<FocusHeaderConfig | null>>;
}

export const FocusHeaderContext = createContext<FocusHeaderContextValue | null>(null);

export const useFocusHeaderContext = () => useContext(FocusHeaderContext);
