import React from 'react';
import type {
  AiSuggestionDto,
  LineRewriteSuggestion,
  ScriptDraft,
} from '@/services/aiAgents.service';
import type { SceneDetailDto } from '@/services/scriptLine.service';
import { diffScriptRows, draftRows, newBibleNames, rewriteRows, sceneRows } from './scriptDiff';

const LABELS: Record<string, string> = { caption: 'DẪN TRUYỆN:', sfx: 'SFX:' };

/** Xem đề xuất AI trên trang script: dòng bỏ màu đỏ, dòng thêm màu xanh. Chỉ đọc, chưa ghi gì. */
export const ScriptDiffPreview: React.FC<{
  suggestion: AiSuggestionDto;
  scene: SceneDetailDto;
  nameById: Record<string, string>;
}> = ({ suggestion, scene, nameById }) => {
  const draft = suggestion.kind === 'Script' ? (suggestion.payload as ScriptDraft) : null;
  const after = draft
    ? draftRows(draft, nameById)
    : rewriteRows(scene, suggestion.payload as LineRewriteSuggestion);
  const rows = diffScriptRows(sceneRows(scene), after);
  const newNames = draft ? newBibleNames(draft) : [];

  return (
    <div className='gn-diff' data-testid='script-diff-preview'>
      <div className='mb-6 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-stone-700'>
        <b>Đề xuất AI cho {scene.heading || `phân cảnh ${scene.sceneNumber}`}.</b> Kịch bản chưa đổi
        cho đến khi bạn Accept.
        {newNames.length > 0 && (
          <div className='mt-1' data-testid='script-diff-new-bible'>
            Mục Bible mới, tạo nháp khi Accept: <b>{newNames.join(', ')}</b>
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
            data-label={LABELS[r.el]}
          >
            {r.text}
          </div>
        ))}
      </div>
    </div>
  );
};
