// src/shared/features/script-review/ScriptCommentCard.tsx
import React, { useEffect, useRef, useState } from 'react';
import { translate, useTranslation } from '@/lib/i18n';
import { Check, CheckCircle2, MessageSquare, X } from 'lucide-react';
import type { ScriptCommentDto } from '@/services/chapter.service';

/** Lấy chữ cái đầu làm avatar */
function getAuthorInitial(name?: string | null): string {
  if (!name || !name.trim()) return 'U';
  const parts = name.trim().split(/\s+/);
  const lastPart = parts[parts.length - 1];
  return (lastPart[0] || parts[0][0] || 'U').toUpperCase();
}

/** Lấy tên hiển thị của người dùng hiện tại */
function getCurrentUserName(): string {
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const u = JSON.parse(raw);
      const n = u.fullName || u.name || u.displayName || u.email?.split('@')[0];
      if (n && typeof n === 'string') return n.trim();
    }
  } catch {
    // fallback
  }
  return translate('features.scriptReview.comment.editorFallback');
}

export interface ScriptCommentComposerProps {
  initialText?: string;
  quotedText?: string | null;
  authorName?: string;
  onSave: (text: string) => void;
  onCancel: () => void;
  className?: string;
}

/**
 * Thẻ soạn nhận xét nổi (Comment Composer) theo đúng mẫu thiết kế:
 * - Avatar tròn màu cam với chữ cái đầu
 * - Tên tác giả (vd "Trung Kiên")
 * - Ô nhập bo tròn (capsule) viền xanh dương
 * - Nút "Hủy" và nút "Nhận xét" bo tròn màu xanh dương
 */
export const ScriptCommentComposer: React.FC<ScriptCommentComposerProps> = ({
  initialText = '',
  quotedText,
  authorName = getCurrentUserName(),
  onSave,
  onCancel,
  className = '',
}) => {
  const { t } = useTranslation('features');
  const [text, setText] = useState(initialText);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSave = () => {
    if (text.trim()) {
      onSave(text.trim());
    }
  };

  const initial = getAuthorInitial(authorName);

  return (
    <div
      data-testid='script-comment-composer'
      className={`bg-white rounded-2xl border border-stone-200/90 shadow-xl p-4 w-full max-w-sm transition-all select-none ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Tác giả */}
      <div className='flex items-center gap-2.5 mb-3'>
        <div className='w-8 h-8 rounded-full bg-[#EA580C] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs'>
          {initial}
        </div>
        <span className='font-semibold text-stone-900 text-sm'>{authorName}</span>
      </div>

      {quotedText && (
        <div className='mb-2 text-xs text-stone-600 bg-amber-50/90 border-l-2 border-amber-400 px-2 py-1 rounded-r'>
          <span className='italic bg-[#FDE047] text-stone-900 px-1 py-0.5 rounded text-xs font-medium'>
            {quotedText}
          </span>
        </div>
      )}

      {/* Ô nhập bo góc capsule viền xanh */}
      <div className='mb-3'>
        <input
          ref={inputRef}
          type='text'
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('scriptReview.comment.inputPlaceholder')}
          className='w-full rounded-2xl border-2 border-[#1976D2] bg-white px-3.5 py-2 text-sm text-stone-800 outline-none focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-stone-400 select-text'
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (e.nativeEvent?.isComposing || (e as any).keyCode === 229) return;
              e.preventDefault();
              handleSave();
            }
            if (e.key === 'Escape') onCancel();
          }}
        />
      </div>

      {/* Nút hành động */}
      <div className='flex items-center justify-end gap-3 pt-0.5'>
        <button
          type='button'
          onClick={onCancel}
          className='text-sm font-medium text-blue-600 hover:text-blue-800 px-2 py-1 cursor-pointer transition-colors'
        >
          {t('scriptReview.comment.cancel')}
        </button>
        <button
          type='button'
          data-testid='comment-submit-btn'
          onClick={handleSave}
          disabled={!text.trim()}
          className='rounded-full bg-[#0066FF] hover:bg-blue-700 text-white font-medium text-xs px-5 py-2 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all'
        >
          {t('scriptReview.comment.submit')}
        </button>
      </div>
    </div>
  );
};

export interface ScriptCommentItemCardProps {
  comment: ScriptCommentDto;
  canResolve?: boolean;
  onResolve?: (commentId: string) => void;
  onSelect?: (comment: ScriptCommentDto) => void;
  isSelected?: boolean;
  className?: string;
}

/**
 * Thẻ hiển thị nhận xét đã gửi theo mẫu thiết kế
 */
export const ScriptCommentItemCard: React.FC<ScriptCommentItemCardProps> = ({
  comment,
  canResolve = false,
  onResolve,
  onSelect,
  isSelected = false,
  className = '',
}) => {
  const { t } = useTranslation('features');
  const authorName = comment.authorName || t('scriptReview.comment.editorFallback');
  const initial = getAuthorInitial(authorName);
  const isResolved = Boolean(comment.resolvedAt);

  return (
    <div
      data-testid='script-comment-card'
      onClick={() => onSelect?.(comment)}
      className={`bg-white rounded-2xl border transition-all p-3.5 w-full ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-100 shadow-md'
          : 'border-stone-200/90 shadow-sm hover:shadow-md'
      } ${className}`}
    >
      <div className='flex items-start justify-between gap-2 mb-2'>
        <div className='flex items-center gap-2.5'>
          <div className='w-8 h-8 rounded-full bg-[#EA580C] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs'>
            {initial}
          </div>
          <div>
            <p className='font-semibold text-stone-900 text-sm leading-tight'>{authorName}</p>
            <p className='text-xs text-stone-400 mt-0.5'>
              {new Date(comment.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              · {new Date(comment.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        {isResolved && (
          <span className='inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0'>
            <CheckCircle2 className='w-3 h-3' />
            {t('scriptReview.comment.resolved')}
          </span>
        )}
      </div>

      {comment.quotedText && (
        <div className='mb-2 text-xs text-stone-600 bg-amber-50/80 border-l-2 border-amber-400 px-2.5 py-1.5 rounded-r'>
          <span className='italic bg-[#FDE047] text-stone-900 px-1 py-0.5 rounded text-xs font-medium'>
            {comment.quotedText}
          </span>
        </div>
      )}

      <p className='text-sm text-stone-800 whitespace-pre-wrap leading-relaxed py-0.5 select-text'>
        {comment.body}
      </p>

      {canResolve && !isResolved && onResolve && (
        <div className='mt-3 pt-2 border-t border-stone-100 flex items-center justify-end'>
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              onResolve(comment.id);
            }}
            className='inline-flex items-center gap-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-3.5 py-1 shadow-xs cursor-pointer transition-colors'
          >
            <Check className='w-3.5 h-3.5' />
            {t('scriptReview.comment.resolve')}
          </button>
        </div>
      )}
    </div>
  );
};
