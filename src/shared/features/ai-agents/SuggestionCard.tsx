import React, { useState } from 'react';
import {
  Check,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  LayoutTemplate,
  Lock,
  MessageSquareWarning,
  Scissors,
  X,
} from 'lucide-react';
import {
  AiSuggestionDto,
  AiSuggestionKind,
  AiSuggestionStatus,
  ArtistPromptSet,
  LetteringSuggestionSet,
  ScriptDraft,
  StoryboardLayout,
} from '@/services/aiAgents.service';
import { ArtistPromptsView, LetteringDiffView } from './AgentOutputViews';
import { KIND_META } from './aiViewUtils';

const STATUS_STYLE: Record<AiSuggestionStatus, string> = {
  Pending: 'border-amber-300 bg-amber-50 text-amber-700',
  Accepted: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  Rejected: 'border-red-300 bg-red-50 text-red-700',
  ChangesRequested: 'border-sky-300 bg-sky-50 text-sky-700',
};
const STATUS_LABEL: Record<AiSuggestionStatus, string> = {
  Pending: 'Chờ quyết định',
  Accepted: 'Đã Accept',
  Rejected: 'Đã Reject',
  ChangesRequested: 'Yêu cầu sửa',
};
const KIND_ICON: Record<AiSuggestionKind, React.ElementType> = {
  Script: FileText,
  Layout: LayoutTemplate,
  ImagePrompt: ImageIcon,
  Lettering: Scissors,
};

interface Props {
  suggestion: AiSuggestionDto;
  /** Trạng thái đề xuất cha (Script) — chỉ có nghĩa khi suggestion.parentSuggestionId có giá trị. */
  parentStatus?: AiSuggestionStatus;
  busy: boolean;
  nameById?: Record<string, string>;
  onDecide: (decision: 'accept' | 'reject' | 'request-changes', reason?: string) => void;
}

/** Số liệu tóm tắt của payload theo loại đề xuất. */
function detailOf(s: AiSuggestionDto): string {
  switch (s.kind) {
    case 'Script':
      return `${(s.payload as ScriptDraft | undefined)?.lines?.length ?? 0} dòng script`;
    case 'Layout': {
      const l = s.payload as StoryboardLayout | undefined;
      return `${l?.pages?.length ?? 0} trang · ${l?.pages?.reduce((n, p) => n + p.panels.length, 0) ?? 0} panel`;
    }
    case 'ImagePrompt':
      return `${(s.payload as ArtistPromptSet | undefined)?.panels?.length ?? 0} prompt ảnh cho panel`;
    default:
      return `${(s.payload as LetteringSuggestionSet | undefined)?.suggestions?.length ?? 0} dòng thoại được đề xuất rút gọn`;
  }
}

/**
 * Đề xuất của AI (Script / Layout / Prompt ảnh / Rút gọn thoại): chỉ người đúng vai trò mới được Accept / Reject / RequestChanges.
 * Quyền do Backend tính (canDecide); UI chỉ hiển thị, Backend vẫn kiểm lại khi nhận quyết định.
 */
export const SuggestionCard: React.FC<Props> = ({
  suggestion: s,
  parentStatus,
  busy,
  nameById = {},
  onDecide,
}) => {
  const [form, setForm] = useState<'reject' | 'request-changes' | null>(null);
  const [reason, setReason] = useState('');
  const [showContent, setShowContent] = useState(false);

  const meta = KIND_META[s.kind];
  const Icon = KIND_ICON[s.kind];
  const pending = s.status === 'Pending';
  // BE cũ không trả canDecide → không ẩn nút (Backend vẫn là nơi chặn)
  const allowed = s.canDecide !== false;
  const needsParent = !!s.parentSuggestionId;
  const blockedByScript = needsParent && parentStatus !== 'Accepted';
  const acceptDisabledReason = !pending
    ? 'Đề xuất đã được quyết định'
    : s.hasBlockingFindings
      ? 'Còn finding chặn từ Continuity — chỉ được Reject hoặc Yêu cầu sửa'
      : blockedByScript
        ? 'Cần Accept đề xuất Script trước'
        : '';
  const canPreview = s.kind === 'ImagePrompt' || s.kind === 'Lettering';

  const submit = () => {
    if (!form) return;
    if (form === 'request-changes' && !reason.trim()) return;
    onDecide(form, reason.trim() || undefined);
    setForm(null);
    setReason('');
  };

  return (
    <div className='rounded-xl border-[1.5px] border-[#171717] bg-white p-4' data-kind={s.kind}>
      <div className='flex flex-wrap items-center gap-2'>
        <Icon size={16} />
        <h4 className='text-sm font-bold'>Đề xuất {meta.title}</h4>
        <span
          className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${STATUS_STYLE[s.status]}`}
        >
          {STATUS_LABEL[s.status]}
        </span>
        <span className='ml-auto font-mono text-[10px] text-[#737373]'>
          hash {s.payloadHash.slice(0, 10)} · base v{s.baseChapterVersion}
        </span>
      </div>
      <p className='mt-1 text-xs text-[#404040]'>{s.summary}</p>
      <p className='mt-0.5 text-[11px] text-[#737373]'>{detailOf(s)}</p>

      {canPreview && s.payload != null && (
        <div className='mt-2'>
          <button
            type='button'
            onClick={() => setShowContent((v) => !v)}
            className='flex items-center gap-1 text-[11px] font-semibold text-[#525252] hover:text-[#171717]'
          >
            {showContent ? <EyeOff size={12} /> : <Eye size={12} />}
            {showContent ? 'Ẩn nội dung đề xuất' : 'Xem nội dung đề xuất trước khi quyết định'}
          </button>
          {showContent && (
            <div className='mt-2'>
              {s.kind === 'Lettering' ? (
                <LetteringDiffView set={s.payload as LetteringSuggestionSet} />
              ) : (
                <ArtistPromptsView set={s.payload as ArtistPromptSet} nameById={nameById} />
              )}
            </div>
          )}
        </div>
      )}

      {s.hasBlockingFindings && (
        <div className='mt-2 flex items-start gap-1.5 rounded border border-red-300 bg-red-50 p-2 text-[11px] text-red-700'>
          <MessageSquareWarning size={13} className='mt-0.5 shrink-0' />
          Còn lỗi nhất quán chặn sau 2 lượt sửa. Hãy Reject hoặc Yêu cầu sửa rồi chạy lại.
        </div>
      )}

      {s.decisions.map((d) => (
        <div key={d.id} className='mt-2 rounded bg-[#FAF8F5] p-2 text-[11px] text-[#525252]'>
          <b>{STATUS_LABEL[d.decision]}</b> lúc {new Date(d.decidedAtUtc).toLocaleString('vi-VN')}
          {d.reason ? ` — “${d.reason}”` : ''}
          {d.resultRevisionId && (
            <div className='font-mono text-[10px]'>
              → tạo content revision {d.resultRevisionId.slice(0, 8)} (chapter v
              {d.chapterVersionAtDecision} → v{d.chapterVersionAtDecision + 1})
            </div>
          )}
        </div>
      ))}

      {pending && !allowed && (
        <div
          className='mt-3 flex items-start gap-1.5 rounded border border-[#E7E7E7] bg-[#FAF8F5] p-2 text-[11px] text-[#525252]'
          data-testid='no-decision-rights'
        >
          <Lock size={12} className='mt-0.5 shrink-0' />
          <span>
            Bạn không có quyền quyết định đề xuất {meta.title}
            {s.decisionRoles?.length ? ` (cần vai trò: ${s.decisionRoles.join(', ')})` : ''}. Người
            đúng vai trò sẽ Accept hoặc Reject.
          </span>
        </div>
      )}

      {pending && allowed && (
        <div className='mt-3'>
          {form ? (
            <div className='space-y-2'>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder={
                  form === 'request-changes'
                    ? 'Lý do yêu cầu sửa (bắt buộc)'
                    : 'Lý do (không bắt buộc)'
                }
                className='w-full rounded border-[1.5px] border-[#171717] p-2 text-xs outline-none focus:border-[#F97316]'
              />
              <div className='flex gap-2'>
                <button
                  type='button'
                  disabled={busy || (form === 'request-changes' && !reason.trim())}
                  onClick={submit}
                  className='rounded border-[1.5px] border-[#171717] bg-[#171717] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50'
                >
                  Xác nhận {form === 'reject' ? 'Reject' : 'Yêu cầu sửa'}
                </button>
                <button
                  type='button'
                  onClick={() => setForm(null)}
                  className='rounded border-[1.5px] border-[#171717] px-3 py-1 text-xs font-semibold'
                >
                  Huỷ
                </button>
              </div>
            </div>
          ) : (
            <div className='flex flex-wrap gap-2'>
              <button
                type='button'
                disabled={busy || !!acceptDisabledReason}
                title={acceptDisabledReason || meta.applyNote}
                onClick={() => onDecide('accept')}
                className='flex items-center gap-1 rounded border-[1.5px] border-emerald-600 bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40'
              >
                <Check size={13} /> {meta.applyLabel}
              </button>
              <button
                type='button'
                disabled={busy}
                onClick={() => setForm('request-changes')}
                className='rounded border-[1.5px] border-[#171717] px-3 py-1 text-xs font-semibold hover:bg-[#FAF8F5] disabled:opacity-50'
              >
                Yêu cầu sửa
              </button>
              <button
                type='button'
                disabled={busy}
                onClick={() => setForm('reject')}
                className='flex items-center gap-1 rounded border-[1.5px] border-red-500 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50'
              >
                <X size={13} /> Reject
              </button>
            </div>
          )}
          {!!acceptDisabledReason && !form && (
            <p className='mt-1 text-[10px] text-[#737373]'>{acceptDisabledReason}</p>
          )}
          {!acceptDisabledReason && !form && (
            <p className='mt-1 text-[10px] text-[#737373]'>{meta.applyNote}</p>
          )}
        </div>
      )}
    </div>
  );
};
