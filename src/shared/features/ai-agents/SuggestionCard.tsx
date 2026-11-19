import React, { useState } from 'react';
import {
  Check,
  Eye,
  EyeOff,
  FileText,
  GitCompare,
  Image as ImageIcon,
  LayoutTemplate,
  Lock,
  MessageSquareWarning,
  Scissors,
  BookOpen,
  Palette,
  Sparkles,
  X,
} from 'lucide-react';
import {
  AiSuggestionDto,
  AiSuggestionKind,
  AiSuggestionStatus,
  ArtistPromptSet,
  BibleStubCitation,
  BibleStubSuggestion,
  BubbleShortenSuggestion,
  ImpactRippleSuggestion,
  LetteringSuggestionSet,
  ScriptDraft,
  StoryboardLayout,
  LineRewriteSuggestion,
  SeriesMetadataSuggestion,
  ThumbnailSuggestion,
} from '@/services/aiAgents.service';
import { ArtistPromptsView, LetteringDiffView } from './AgentOutputViews';
import { LayoutPreview } from './LayoutPreview';
import { KIND_META } from './aiViewUtils';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';

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
  LineRewrite: Sparkles,
  SeriesMetadata: BookOpen,
  Thumbnail: Palette,
  BibleStub: BookOpen,
  ImpactRipple: GitCompare,
};

function isBubbleShortenPayload(payload: unknown): payload is BubbleShortenSuggestion {
  return (
    !!payload &&
    typeof payload === 'object' &&
    ('originalText' in payload || 'suggestedText' in payload) &&
    !('suggestions' in payload)
  );
}

function getBibleCitations(bs?: BibleStubSuggestion | null): BibleStubCitation[] {
  return bs?.draft?.citations ?? bs?.citations ?? [];
}

function formatImpactDecision(decision?: string | null): string {
  if (!decision) return '';
  const norm = decision.trim().toLowerCase();
  if (norm === 'keep' || norm === 'giữ nguyên') return 'Giữ nguyên';
  if (norm === 'rework' || norm === 'làm lại') return 'Làm lại';
  return decision;
}

interface Props {
  suggestion: AiSuggestionDto;
  seriesId?: string;
  /** Trạng thái đề xuất cha (Script) — chỉ có nghĩa khi suggestion.parentSuggestionId có giá trị. */
  parentStatus?: AiSuggestionStatus;
  busy: boolean;
  nameById?: Record<string, string>;
  hasPanels?: boolean;
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
    case 'LineRewrite': {
      const lr = s.payload as LineRewriteSuggestion | undefined;
      return lr?.task === 'letterer.shorten'
        ? `Rút gọn thoại (${lr.maxChars ? `tối đa ${lr.maxChars} ký tự` : 'theo khung'})`
        : 'Viết lại thoại theo giọng nhân vật';
    }
    case 'SeriesMetadata': {
      const sm = s.payload as SeriesMetadataSuggestion | undefined;
      return sm?.metadata?.genre
        ? `Thể loại: ${sm.metadata.genre} · Cập nhật tóm tắt & thể loại`
        : 'Gợi ý thông tin phát hành Series';
    }
    case 'Thumbnail': {
      const tn = s.payload as ThumbnailSuggestion | undefined;
      return tn?.provider ? `Model: ${tn.model} (${tn.provider})` : 'Ảnh thumbnail AI cho panel';
    }
    case 'ImagePrompt':
      return `${(s.payload as ArtistPromptSet | undefined)?.panels?.length ?? 0} prompt ảnh cho panel`;
    case 'BibleStub':
      return `${getBibleCitations(s.payload as BibleStubSuggestion | undefined).length} trích dẫn từ kịch bản`;
    case 'ImpactRipple': {
      const ir = s.payload as ImpactRippleSuggestion | undefined;
      return `${formatImpactDecision(ir?.decision)} · ${ir?.changes?.length ?? 0} thay đổi kịch bản`;
    }
    case 'Lettering': {
      if (isBubbleShortenPayload(s.payload)) {
        return s.payload.maxChars
          ? `Tối đa ${s.payload.maxChars} ký tự · Đổi chữ trên bóng thoại`
          : 'Rút gọn chữ trên bóng thoại';
      }
      return `${(s.payload as LetteringSuggestionSet | undefined)?.suggestions?.length ?? 0} dòng thoại được đề xuất rút gọn`;
    }
    default:
      return '';
  }
}

/**
 * Đề xuất của AI (Script / Layout / Prompt ảnh / Rút gọn thoại): chỉ người đúng vai trò mới được Accept / Reject / RequestChanges.
 * Quyền do Backend tính (canDecide); UI chỉ hiển thị, Backend vẫn kiểm lại khi nhận quyết định.
 */
export const SuggestionCard: React.FC<Props> = ({
  suggestion: s,
  seriesId,
  parentStatus,
  busy,
  nameById = {},
  hasPanels,
  onDecide,
}) => {
  const [form, setForm] = useState<'reject' | 'request-changes' | null>(null);
  const [reason, setReason] = useState('');
  const inlineOpenByDefault =
    s.kind === 'LineRewrite' ||
    s.kind === 'BibleStub' ||
    s.kind === 'ImpactRipple' ||
    (s.kind === 'Lettering' && isBubbleShortenPayload(s.payload));
  const [showContent, setShowContent] = useState(inlineOpenByDefault);

  const baseMeta = KIND_META[s.kind];
  const meta =
    s.kind === 'Lettering' && isBubbleShortenPayload(s.payload)
      ? {
          ...baseMeta,
          applyNote: 'Đổi chữ trên bóng thoại, không đổi dòng kịch bản.',
        }
      : baseMeta;
  const Icon = KIND_ICON[s.kind];
  const pending = s.status === 'Pending';
  // BE cũ không trả canDecide / canAccept → không ẩn nút (Backend vẫn là nơi chặn)
  const allowed = s.canDecide !== false;
  const canAccept = allowed && s.canAccept !== false;
  const needsParent = !!s.parentSuggestionId;
  const blockedByScript = needsParent && parentStatus !== 'Accepted';
  const acceptDisabledReason = !pending
    ? 'Đề xuất đã được quyết định'
    : s.hasBlockingFindings
      ? 'Còn finding chặn từ Continuity — chỉ được Reject hoặc Yêu cầu sửa'
      : blockedByScript
        ? 'Cần Accept đề xuất Script trước'
        : hasPanels && s.kind === 'Layout'
          ? 'Scene đã có Panel; không thể áp dụng layout AI. Hãy dùng Tự động phân bổ trên Bàn vẽ.'
          : '';
  const canPreview =
    s.kind === 'ImagePrompt' ||
    s.kind === 'Lettering' ||
    s.kind === 'LineRewrite' ||
    s.kind === 'SeriesMetadata' ||
    s.kind === 'Thumbnail' ||
    s.kind === 'Layout' ||
    s.kind === 'BibleStub' ||
    s.kind === 'ImpactRipple';

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
              {s.kind === 'SeriesMetadata' ? (
                (() => {
                  const sm = s.payload as SeriesMetadataSuggestion | undefined;
                  const md = sm?.metadata;
                  const logline = md?.logline?.trim();
                  const teaser = md?.teaser?.trim();
                  const ageRating = md?.ageRating?.trim();
                  const hasRefFields = Boolean(logline || teaser || ageRating);
                  return (
                    <div className='space-y-2 rounded border border-[#E7E7E7] bg-[#FAF8F5] p-3 text-xs'>
                      <div className='space-y-1'>
                        <div>
                          <span className='font-bold text-[#171717]'>Tóm tắt: </span>
                          <span className='text-[#404040]'>{md?.synopsis}</span>
                        </div>
                        <div className='text-[11px] text-[#525252]'>
                          Thể loại: <b>{md?.genre}</b>
                        </div>
                      </div>
                      {hasRefFields && (
                        <div
                          className='space-y-1 rounded border border-dashed border-[#D4D4D4] bg-white/80 p-2 text-[11px] text-[#525252]'
                          data-testid='series-metadata-reference-only'
                        >
                          <div className='font-semibold text-[#737373]'>
                            Chỉ tham khảo, không được lưu khi Accept
                          </div>
                          {logline && (
                            <div>
                              <span className='font-semibold text-[#525252]'>Logline: </span>
                              <span>{logline}</span>
                            </div>
                          )}
                          {teaser && (
                            <div>
                              <span className='font-semibold text-[#525252]'>Teaser: </span>
                              <span>{teaser}</span>
                            </div>
                          )}
                          {ageRating && (
                            <div>
                              <span className='font-semibold text-[#525252]'>Độ tuổi: </span>
                              <b>{ageRating}</b>
                            </div>
                          )}
                        </div>
                      )}
                      {sm?.reason && (
                        <div className='text-[11px] italic text-[#737373]'>Lý do: {sm.reason}</div>
                      )}
                    </div>
                  );
                })()
              ) : s.kind === 'Thumbnail' ? (
                <div className='rounded border border-[#E7E7E7] bg-[#FAF8F5] p-3 text-xs space-y-2'>
                  {(s.payload as ThumbnailSuggestion)?.sha256 && (
                    <div className='w-full max-w-xs h-40 bg-stone-900 rounded-lg overflow-hidden border border-stone-200 flex items-center justify-center mx-auto'>
                      <AuthenticatedImage
                        src={
                          seriesId
                            ? `/api/series/${seriesId}/bible/assets/${(s.payload as ThumbnailSuggestion).sha256}`
                            : ''
                        }
                        alt='Thumbnail Preview'
                        className='max-w-full max-h-full object-contain'
                      />
                    </div>
                  )}
                  <div className='font-medium text-[#171717]'>
                    Prompt: {(s.payload as ThumbnailSuggestion)?.prompt}
                  </div>
                  <div className='mt-1 text-[11px] text-[#737373]'>
                    Provider: {(s.payload as ThumbnailSuggestion)?.provider} · Model:{' '}
                    {(s.payload as ThumbnailSuggestion)?.model} · SHA-256:{' '}
                    {(s.payload as ThumbnailSuggestion)?.sha256?.slice(0, 12)}...
                  </div>
                </div>
              ) : s.kind === 'LineRewrite' ? (
                <div className='rounded border border-[#E7E7E7] bg-[#FAF8F5] p-3 text-xs'>
                  <div className='text-[11px] text-[#737373] line-through'>
                    {(s.payload as LineRewriteSuggestion)?.originalText}
                  </div>
                  <div className='mt-1 font-medium text-emerald-800'>
                    {(s.payload as LineRewriteSuggestion)?.suggestedText}
                  </div>
                  {(s.payload as LineRewriteSuggestion)?.reason && (
                    <div className='mt-2 text-[11px] italic text-[#525252]'>
                      Lý do: {(s.payload as LineRewriteSuggestion)?.reason}
                    </div>
                  )}
                </div>
              ) : s.kind === 'Layout' ? (
                <LayoutPreview
                  layout={s.payload as StoryboardLayout}
                  lines={{}}
                  nameById={nameById}
                />
              ) : s.kind === 'Lettering' ? (
                isBubbleShortenPayload(s.payload) ? (
                  <div className='space-y-1.5 rounded border border-[#E7E7E7] bg-[#FAF8F5] p-3 text-xs'>
                    <div>
                      <span className='text-[11px] font-semibold text-[#737373]'>Bản gốc: </span>
                      <span className='text-[11px] text-[#737373] line-through'>
                        {s.payload.originalText}
                      </span>
                    </div>
                    <div>
                      <span className='text-[11px] font-semibold text-emerald-800'>
                        Bản rút gọn:{' '}
                      </span>
                      <span className='font-medium text-emerald-800'>
                        {s.payload.suggestedText}
                      </span>
                    </div>
                    {s.payload.reason && (
                      <div className='text-[11px] italic text-[#525252]'>
                        Lý do: {s.payload.reason}
                      </div>
                    )}
                  </div>
                ) : (
                  <LetteringDiffView set={s.payload as LetteringSuggestionSet} />
                )
              ) : s.kind === 'BibleStub' ? (
                <div className='space-y-2 rounded border border-[#E7E7E7] bg-[#FAF8F5] p-3 text-xs'>
                  {(s.payload as BibleStubSuggestion)?.draft?.subtitle && (
                    <div className='font-bold text-[#171717]'>
                      {(s.payload as BibleStubSuggestion).draft.subtitle}
                    </div>
                  )}
                  <div className='whitespace-pre-line text-[#404040]'>
                    {(s.payload as BibleStubSuggestion)?.draft?.description}
                  </div>
                  {(s.payload as BibleStubSuggestion)?.reason && (
                    <div className='text-[11px] italic text-[#525252]'>
                      Lý do: {(s.payload as BibleStubSuggestion).reason}
                    </div>
                  )}
                  {getBibleCitations(s.payload as BibleStubSuggestion).length > 0 && (
                    <ul className='mt-2 space-y-1.5 border-t border-[#E7E7E7] pt-2'>
                      {getBibleCitations(s.payload as BibleStubSuggestion).map((c, idx) => (
                        <li
                          key={c.lineId ? `${c.lineId}-${idx}` : idx}
                          className='rounded border border-[#E7E7E7] bg-white p-2'
                        >
                          <div className='font-semibold text-[#171717]'>{c.claim}</div>
                          <blockquote className='mt-0.5 text-[11px] italic text-[#525252]'>
                            “{c.quote}”
                          </blockquote>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : s.kind === 'ImpactRipple' ? (
                <div className='space-y-2 rounded border border-[#E7E7E7] bg-[#FAF8F5] p-3 text-xs'>
                  <div className='flex items-center gap-2'>
                    <span className='font-bold text-[#171717]'>Quyết định:</span>
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[11px] font-bold ${
                        formatImpactDecision((s.payload as ImpactRippleSuggestion)?.decision) ===
                        'Làm lại'
                          ? 'border-amber-300 bg-amber-50 text-amber-800'
                          : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {formatImpactDecision((s.payload as ImpactRippleSuggestion)?.decision)}
                    </span>
                  </div>
                  {(s.payload as ImpactRippleSuggestion)?.reason && (
                    <div className='text-[#404040]'>
                      {(s.payload as ImpactRippleSuggestion).reason}
                    </div>
                  )}
                  {((s.payload as ImpactRippleSuggestion)?.changes?.length ?? 0) > 0 && (
                    <ul className='space-y-1.5 border-t border-[#E7E7E7] pt-2'>
                      {(s.payload as ImpactRippleSuggestion).changes.map((ch, idx) => {
                        const heading = [ch.type, ch.label].filter(Boolean).join(' · ');
                        return (
                          <li key={idx} className='rounded border border-[#E7E7E7] bg-white p-2'>
                            {heading && (
                              <div className='text-[11px] font-semibold text-[#525252]'>
                                {heading}
                              </div>
                            )}
                            {ch.before != null && ch.before !== '' && (
                              <div className='text-[11px] text-[#737373] line-through'>
                                {ch.before}
                              </div>
                            )}
                            {ch.after != null && ch.after !== '' && (
                              <div className='mt-0.5 font-medium text-emerald-800'>{ch.after}</div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
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
              {canAccept && (
                <button
                  type='button'
                  disabled={busy || !!acceptDisabledReason}
                  title={acceptDisabledReason || meta.applyNote}
                  onClick={() => onDecide('accept')}
                  className='flex items-center gap-1 rounded border-[1.5px] border-emerald-600 bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40'
                >
                  <Check size={13} /> {meta.applyLabel}
                </button>
              )}
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
          {canAccept && !!acceptDisabledReason && !form && (
            <p className='mt-1 text-[10px] text-[#737373]'>{acceptDisabledReason}</p>
          )}
          {canAccept && !acceptDisabledReason && !form && (
            <p className='mt-1 text-[10px] text-[#737373]'>{meta.applyNote}</p>
          )}
        </div>
      )}
    </div>
  );
};
