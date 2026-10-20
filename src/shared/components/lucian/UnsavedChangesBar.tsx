/* Lucian UX/UI Prompt #250 · Unsaved changes bar · (c) 2026 Seokwoo Lee · MIT License */
/* Adapted for PanelForge Editorial AI Studio Design System */

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import './lucian-250.css';

export interface UnsavedChangesBarProps {
  isDirty: boolean;
  count?: number;
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
  isSaving?: boolean;
  isWarn?: boolean;
  message?: string;
  className?: string;
}

export const UnsavedChangesBar: React.FC<UnsavedChangesBarProps> = ({
  isDirty,
  count = 1,
  onSave,
  onDiscard,
  isSaving = false,
  isWarn = false,
  message,
  className = '',
}) => {
  const { t } = useTranslation();
  const [justSaved, setJustSaved] = useState(false);

  // Khi bấm save thành công từ ngoài
  useEffect(() => {
    if (!isDirty && justSaved) {
      const timer = setTimeout(() => setJustSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isDirty, justSaved]);

  if (!isDirty && !justSaved) {
    return null;
  }

  const handleSaveClick = async () => {
    if (isSaving) return;
    try {
      await onSave();
      setJustSaved(true);
    } catch {
      // Error handled by caller
    }
  };

  const displayText = justSaved
    ? t('common.unsaved.saved')
    : message ||
      (count > 1
        ? t('common.unsaved.plural', { count })
        : t('common.unsaved.title'));

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label={displayText}
      data-testid="unsaved-changes-bar"
      className={`pf-unsaved-bar is-visible ${isWarn ? 'is-warn' : ''} ${
        justSaved ? 'is-saved' : ''
      } ${className}`}
    >
      <div className="pf-unsaved-tx">
        <span className="pf-unsaved-dot" aria-hidden="true" />
        <span>{displayText}</span>
      </div>

      {!justSaved && (
        <div className="pf-unsaved-actions">
          <button
            type="button"
            className="pf-unsaved-btn-discard"
            onClick={onDiscard}
            disabled={isSaving}
            data-testid="unsaved-discard-btn"
          >
            {t('common.unsaved.discard')}
          </button>
          <button
            type="button"
            className="pf-unsaved-btn-save"
            onClick={handleSaveClick}
            disabled={isSaving}
            data-testid="unsaved-save-btn"
          >
            {isSaving && <span className="pf-unsaved-spinner" aria-hidden="true" />}
            <span>{isSaving ? t('common.unsaved.saving') : t('common.unsaved.save')}</span>
          </button>
        </div>
      )}
    </aside>
  );
};
