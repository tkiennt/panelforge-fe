import React from 'react';
import { FileText, Layers } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export interface ScriptHeaderProps {
  editorMode: 'flow' | 'cards';
  onSetEditorMode: (mode: 'flow' | 'cards') => void;
  className?: string;
}

export const ScriptHeader: React.FC<ScriptHeaderProps> = ({
  editorMode,
  onSetEditorMode,
  className = '',
}) => {
  const { t } = useTranslation('production');

  const viewModes = [
    {
      mode: 'flow',
      icon: FileText,
      label: t('scriptStudio.views.paper'),
      shortcut: 'Alt+1',
      testId: 'tab-flow',
    },
    {
      mode: 'cards',
      icon: Layers,
      label: t('scriptStudio.views.cards'),
      shortcut: 'Alt+2',
      testId: 'tab-cards',
    },
  ] as const;

  return (
    <div
      role='group'
      aria-label={t('scriptStudio.views.label')}
      className={`flex items-center gap-1 p-0.5 rounded-lg bg-stone-100 border border-stone-200/80 shrink-0 ${className}`}
    >
      {viewModes.map(({ mode, icon: Icon, label, shortcut, testId }) => {
        const isActive = editorMode === mode;
        return (
          <button
            key={mode}
            type='button'
            data-testid={testId}
            aria-pressed={isActive}
            title={`${label} (${shortcut})`}
            onClick={() => onSetEditorMode(mode)}
            aria-label={`${label} (${shortcut})`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              isActive
                ? 'bg-white text-stone-900 shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#C2410C]' : 'text-stone-500'}`} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
};
