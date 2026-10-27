import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Camera, Check, Loader2, RotateCcw, Upload, X } from 'lucide-react';
import { workspaceService } from '@/services/workspace.service';
import { WorkspaceDto } from '@/types';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { StudioCoverFallback } from '@/shared/components/StudioCoverFallback';
import { useTranslation } from '@/lib/i18n';

interface WorkspaceCoverPickerDialogProps {
  isOpen: boolean;
  workspace: WorkspaceDto;
  tone?: string;
  onClose: () => void;
  onSuccess: (newCoverUrl: string | null) => void;
}

type CoverChoice = { type: 'upload'; file: File } | { type: 'remove' } | null;

const MAX_COVER_BYTES = 5 * 1024 * 1024; // 5 MB (matching Backend SetWorkspaceCoverCommandHandler.MaxBytes)
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export const WorkspaceCoverPickerDialog: React.FC<WorkspaceCoverPickerDialogProps> = ({
  isOpen,
  workspace,
  tone = '#F97316',
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [choice, setChoice] = useState<CoverChoice>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    returnFocusRef.current = document.activeElement;
    setChoice(null);
    setFilePreview(null);
    setFileError(null);
    setSaveError(null);
    setSaving(false);

    // Auto-focus first interactive element
    const timer = setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>('button, input')?.focus();
    }, 50);

    return () => {
      clearTimeout(timer);
      (returnFocusRef.current as HTMLElement | null)?.focus?.();
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  if (!isOpen) return null;

  const handleFileChange = (file: File | undefined) => {
    setFileError(null);
    setSaveError(null);
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError('Chỉ nhận ảnh PNG, JPEG hoặc WebP.');
      return;
    }

    if (file.size > MAX_COVER_BYTES) {
      setFileError(
        `Ảnh dung lượng ${(file.size / 1024 / 1024).toFixed(1)} MB vượt quá giới hạn 5 MB.`,
      );
      return;
    }

    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }

    setFilePreview(URL.createObjectURL(file));
    setChoice({ type: 'upload', file });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChange(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleApply = async () => {
    if (!choice || saving) return;
    setSaving(true);
    setSaveError(null);

    try {
      if (choice.type === 'upload') {
        const newUrl = await workspaceService.setWorkspaceCover(workspace.id, choice.file);
        onSuccess(newUrl);
        onClose();
      } else if (choice.type === 'remove') {
        await workspaceService.clearWorkspaceCover(workspace.id);
        onSuccess(null);
        onClose();
      }
    } catch (err: any) {
      setSaveError(err.message || 'Lỗi khi lưu ảnh bìa Studio.');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (!saving) onClose();
      return;
    }
    if (e.key === 'Tab' && dialogRef.current) {
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled])',
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  // Preview content
  const renderPreview = () => {
    if (choice?.type === 'remove') {
      return (
        <div className='relative w-full h-full'>
          <StudioCoverFallback name={workspace.name} tone={tone} id={workspace.id} />
          <div className='absolute inset-0 bg-[#1C1917]/20 flex items-center justify-center'>
            <span className='px-3 py-1 rounded-full text-xs font-semibold bg-[#FCFBF8] text-[#1C1917] shadow-sm'>
              {t('workspace.shelf.willUseDefault')}
            </span>
          </div>
        </div>
      );
    }

    if (choice?.type === 'upload' && filePreview) {
      return <img src={filePreview} alt={workspace.name} className='w-full h-full object-cover' />;
    }

    if (workspace.coverUrl) {
      return (
        <AuthenticatedImage
          src={workspace.coverUrl}
          alt={workspace.name}
          className='w-full h-full object-cover'
          fallback={<StudioCoverFallback name={workspace.name} tone={tone} id={workspace.id} />}
        />
      );
    }

    return <StudioCoverFallback name={workspace.name} tone={tone} id={workspace.id} />;
  };

  const hasExistingCover = !!workspace.coverUrl;
  const canRevert = hasExistingCover || choice?.type === 'upload';

  return createPortal(
    <div
      className='fixed inset-0 z-50 bg-[#1C1917]/60 backdrop-blur-xs flex items-center justify-center p-4'
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
      role='dialog'
      aria-modal='true'
      aria-labelledby='cover-picker-title'
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dialogRef}
        className='relative w-full max-w-lg bg-[#FCFBF8] rounded-2xl border border-[#D8D2C5] shadow-xl overflow-hidden text-[#1C1917] flex flex-col font-sans'
      >
        {/* Header */}
        <div className='flex items-center justify-between px-6 py-4 border-b border-[#ECE7DD] bg-[#FAF8F5]'>
          <div className='min-w-0 pr-3'>
            <h2
              id='cover-picker-title'
              className='font-serif font-bold text-lg text-[#1C1917] truncate'
            >
              {t('workspace.shelf.changeCoverTitle')}
            </h2>
            <p className='text-xs text-[#57534E] truncate mt-0.5'>
              Studio: <strong className='font-semibold text-[#1C1917]'>{workspace.name}</strong>
            </p>
          </div>
          <button
            type='button'
            onClick={onClose}
            disabled={saving}
            title={t('workspace.shelf.cancel')}
            aria-label={t('workspace.shelf.cancel')}
            className='ws-focus p-1.5 rounded-lg text-[#78716C] hover:text-[#1C1917] hover:bg-[#F3F0E9] transition-colors disabled:opacity-50'
          >
            <X className='w-5 h-5' aria-hidden='true' />
          </button>
        </div>

        {/* Body */}
        <div className='p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-140px)]'>
          {/* Live Preview (2:1 aspect ratio) */}
          <div>
            <div className='flex items-center justify-between mb-2'>
              <span className='text-xs font-semibold text-[#44403C] uppercase tracking-wider'>
                {t('workspace.shelf.coverPreview') || 'Xem trước (Tỷ lệ 2:1)'}
              </span>
              {choice && (
                <span className='inline-flex items-center gap-1 text-xs font-medium text-[#C2410C]'>
                  <Check className='w-3.5 h-3.5' aria-hidden='true' />
                  <span>Đã có thay đổi</span>
                </span>
              )}
            </div>
            <div className='relative aspect-[2/1] w-full rounded-xl overflow-hidden border border-[#D8D2C5] bg-[#F3F0E9] shadow-inner'>
              {renderPreview()}
            </div>
          </div>

          {/* Upload Dropzone */}
          <div>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/png,image/jpeg,image/webp'
              className='sr-only'
              onChange={(e) => handleFileChange(e.target.files?.[0])}
              disabled={saving}
            />

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className='cursor-pointer border-2 border-dashed border-[#D8D2C5] hover:border-[#F97316] rounded-xl p-5 text-center bg-[#FAF8F5] hover:bg-[#FFF7ED]/40 transition-colors group'
            >
              <div className='w-10 h-10 rounded-full bg-[#F3F0E9] group-hover:bg-[#FFEDD5] text-[#78716C] group-hover:text-[#C2410C] mx-auto flex items-center justify-center mb-2.5 transition-colors'>
                <Upload className='w-5 h-5' aria-hidden='true' />
              </div>
              <p className='text-xs font-semibold text-[#1C1917] mb-1'>
                {choice?.type === 'upload'
                  ? t('workspace.shelf.chooseDifferent')
                  : t('workspace.shelf.coverDropzone')}
              </p>
              <p className='text-[11px] text-[#78716C] leading-normal'>
                {t('workspace.shelf.coverHint')}
              </p>
            </div>
          </div>

          {/* Option to revert to default */}
          {canRevert && (
            <div className='flex items-center justify-between pt-1'>
              <button
                type='button'
                onClick={() => {
                  setFileError(null);
                  setSaveError(null);
                  if (filePreview) {
                    URL.revokeObjectURL(filePreview);
                    setFilePreview(null);
                  }
                  setChoice({ type: 'remove' });
                }}
                disabled={saving || choice?.type === 'remove'}
                className='ws-focus inline-flex items-center gap-1.5 text-xs font-semibold text-[#B45309] hover:text-[#9A3412] hover:underline disabled:opacity-40 disabled:no-underline'
              >
                <RotateCcw className='w-3.5 h-3.5' aria-hidden='true' />
                <span>{t('workspace.shelf.removeCover')}</span>
              </button>
            </div>
          )}

          {/* Error messages */}
          {fileError && (
            <div
              role='alert'
              className='flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700'
            >
              <AlertCircle className='w-4 h-4 shrink-0 mt-0.5' aria-hidden='true' />
              <span>{fileError}</span>
            </div>
          )}
          {saveError && (
            <div
              role='alert'
              className='flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700'
            >
              <AlertCircle className='w-4 h-4 shrink-0 mt-0.5' aria-hidden='true' />
              <span>{saveError}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className='flex items-center justify-end gap-3 px-6 py-4 border-t border-[#ECE7DD] bg-[#FAF8F5]'>
          <button
            type='button'
            onClick={onClose}
            disabled={saving}
            className='ws-btn-secondary px-4 h-9 text-xs font-semibold ws-focus'
          >
            {t('workspace.shelf.cancel')}
          </button>
          <button
            type='button'
            onClick={handleApply}
            disabled={saving || choice === null}
            className='ws-btn-primary inline-flex items-center gap-2 px-5 h-9 text-xs font-semibold ws-focus disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {saving ? (
              <>
                <Loader2 className='w-3.5 h-3.5 animate-spin' aria-hidden='true' />
                <span>{t('workspace.shelf.saving')}</span>
              </>
            ) : (
              <span>{t('workspace.shelf.apply')}</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
