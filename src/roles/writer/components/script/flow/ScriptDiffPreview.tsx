import React from 'react';
import { useTranslation } from '@/lib/i18n';
import type {
  AiSuggestionDto,
  LineRewriteSuggestion,
  NextLineSuggestion,
  ScriptDraft,
} from '@/services/aiAgents.service';
import type { SceneDetailDto } from '@/services/scriptLine.service';
import {
  diffScriptRows,
  draftRows,
  insertRows,
  newBibleNames,
  rewriteRows,
  sceneRows,
} from './scriptDiff';

/** Xem đề xuất AI trên trang script: dòng bỏ màu đỏ, dòng thêm màu xanh. Chỉ đọc, chưa ghi gì. */
export const ScriptDiffPreview: React.FC<{
  suggestion: AiSuggestionDto;
  scene: SceneDetailDto;
  nameById: Record<string, string>;
  appendScript?: boolean;
}> = ({ suggestion, scene, nameById, appendScript }) => {
  const { t } = useTranslation('writer');
  const labels: Record<string, string> = { caption: t('diffPreview.captionLabel'), sfx: 'SFX:' };
  const before = sceneRows(scene);
  const draft = suggestion.kind === 'Script' ? (suggestion.payload as ScriptDraft) : null;
  const isAppend =
    Boolean(appendScript) ||
    (suggestion.kind === 'Script' &&
      (scene.scriptLines ?? []).some((l) => l.panelId != null && l.panelId !== ''));
  const after = draft
    ? isAppend
      ? [...before, ...draftRows(draft, nameById)]
      : draftRows(draft, nameById)
    : suggestion.kind === 'ScriptLineInsert'
      ? insertRows(scene, suggestion.payload as NextLineSuggestion)
      : rewriteRows(scene, suggestion.payload as LineRewriteSuggestion);
  const rows = diffScriptRows(before, after);
  const newNames = draft ? newBibleNames(draft) : [];

  return (
    <div className='gn-diff' data-testid='script-diff-preview'>
      <div className='mb-6 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-stone-700'>
        <b>
          {t('diffPreview.header', {
            target: scene.heading || t('diffPreview.sceneFallback', { n: scene.sceneNumber }),
          })}
        </b>{' '}
        {t('diffPreview.unchangedNotice')}
        {newNames.length > 0 && (
          <div className='mt-1' data-testid='script-diff-new-bible'>
            {t('diffPreview.newBibleItems')} <b>{newNames.join(', ')}</b>
          </div>
        )}
      </div>
      <div className='ProseMirror'>
        {rows.map((r, i) => (
          <div
            key={i}
            className={`gn-line gn-${r.el}`}
            data-el={r.el}
            data-diff={r.status}
            data-label={labels[r.el]}
          >
            {r.text}
          </div>
        ))}
      </div>
    </div>
  );
};
