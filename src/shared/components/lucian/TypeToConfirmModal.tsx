/* Lucian UX/UI Prompt #269 · Type-the-name delete confirmation · (c) 2026 Seokwoo Lee · MIT License */
/* Adapted for PanelForge Editorial AI Studio Design System */

import React, { useState, useEffect, useRef, useId } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import './lucian-269.css';

export interface TypeToConfirmModalProps {
  isOpen: boolean;
  targetName: string;
  title?: string;
  description?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isDeleting?: boolean;
}

export const TypeToConfirmModal: React.FC<TypeToConfirmModalProps> = ({
  isOpen,
  targetName,
  title,
  description,
  confirmButtonText,
  cancelButtonText,
  onConfirm,
  onCancel,
  isDeleting = false,
}) => {
  const { t } = useTranslation();
  const [typedValue, setTypedValue] = useState('');
  const [isShake, setIsShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  // Reset khi mở modal
  useEffect(() => {
    if (isOpen) {
      setTypedValue('');
      setIsShake(false);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Đóng bằng phím Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onCancel]);

  if (!isOpen) return null;

  const isMatched = typedValue.trim() === targetName.trim();

  // Tính số ký tự trùng khớp từ đầu
  let matchIndex = 0;
  while (
    matchIndex < typedValue.length &&
    matchIndex < targetName.length &&
    typedValue[matchIndex] === targetName[matchIndex]
  ) {
    matchIndex++;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Kiểm tra nếu ký tự mới gõ bị sai lệch so với targetName
    if (val.length > typedValue.length && !targetName.startsWith(val)) {
      setIsShake(true);
      setTimeout(() => setIsShake(false), 400);
    }
    setTypedValue(val);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMatched || isDeleting) return;
    await onConfirm();
  };

  const modalTitle = title || t('common.dangerZone.confirmDeleteTitle', 'Xác nhận xóa vĩnh viễn');
  const modalDesc =
    description ||
    t(
      'common.dangerZone.confirmDeleteDesc',
      'Hành động này không thể hoàn tác. Vui lòng nhập chính xác tên bên dưới để xác nhận xóa:',
    );

  return (
    <div
      className="pf-delete-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="type-to-confirm-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onCancel();
      }}
    >
      <div className="pf-delete-card">
        <div className="pf-delete-header">
          <div className="pf-delete-icon-box" aria-hidden="true">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 id={titleId} className="pf-delete-title">
            {modalTitle}
          </h3>
        </div>

        <p className="pf-delete-desc">{modalDesc}</p>

        {/* Visual character stream from #269 */}
        <div
          className="pf-delete-target-preview"
          aria-hidden="true"
          data-testid="target-name-preview"
        >
          {targetName.split('').map((char, idx) => (
            <span
              key={idx}
              className={`pf-delete-char ${idx < matchIndex ? 'is-matched' : ''}`}
            >
              {char}
            </span>
          ))}
        </div>

        <form onSubmit={handleFormSubmit}>
          <input
            ref={inputRef}
            type="text"
            className={`pf-delete-input ${isShake ? 'is-shake' : ''}`}
            value={typedValue}
            onChange={handleInputChange}
            placeholder={targetName}
            disabled={isDeleting}
            autoComplete="off"
            spellCheck="false"
            aria-label={t('common.dangerZone.typeInputLabel', 'Nhập lại tên để xác nhận')}
            data-testid="confirm-delete-input"
          />

          <div className="pf-delete-actions">
            <button
              type="button"
              className="pf-delete-btn-cancel"
              onClick={onCancel}
              disabled={isDeleting}
              data-testid="confirm-delete-cancel-btn"
            >
              {cancelButtonText || t('common.actions.cancel', 'Hủy')}
            </button>
            <button
              type="submit"
              className="pf-delete-btn-confirm"
              disabled={!isMatched || isDeleting}
              data-testid="confirm-delete-submit-btn"
            >
              {isDeleting && <span className="pf-delete-spinner" aria-hidden="true" />}
              <span>
                {isDeleting
                  ? t('common.actions.deleting', 'Đang xóa...')
                  : confirmButtonText || t('common.actions.delete', 'Xóa vĩnh viễn')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
