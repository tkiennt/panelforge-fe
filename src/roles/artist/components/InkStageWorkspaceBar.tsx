/* Lucian UX/UI Prompt #039 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/ */
import React, { useEffect } from 'react';
import { Eye, EyeOff, ShieldCheck, Upload, CheckCircle2, Loader2 } from 'lucide-react';

export type InkingNib = 'g-pen' | 'maru-pen' | 'turnip-pen' | 'fill-bucket';
export type ScreenToneLpi = 60 | 80 | 100;

interface Props {
  onlyUploadButton?: boolean;
  // Pencil Underlay Controller (Reference đối chiếu nét chì)
  pencilUnderlayVisible: boolean;
  onTogglePencilUnderlay: () => void;
  pencilUnderlayOpacity: number;
  onPencilUnderlayOpacityChange: (val: number) => void;
  hasPencilArt: boolean;

  // Inking Toolset / Style Presets (Optional props maintained for interface compatibility)
  selectedNib?: InkingNib;
  onSelectNib?: (nib: InkingNib) => void;

  // Screen-Tone & Pattern Library
  screenToneEnabled?: boolean;
  onToggleScreenTone?: () => void;
  selectedLpi?: ScreenToneLpi;
  onSelectLpi?: (lpi: ScreenToneLpi) => void;
  toneDensity?: number;
  onToneDensityChange?: (val: number) => void;

  // Safe-Zone & Bleed Margins (Khung in ấn)
  safeZoneVisible: boolean;
  onToggleSafeZone: () => void;

  // Dedicated Artwork Upload Action & Status (Upload-focused Stage 2)
  onTriggerUpload?: () => void;
  hasInkArtwork?: boolean;
  inkArtworkVersion?: number | null;
  isUploading?: boolean;

  // Action Handoff
  onHandoffToLettering: () => void;
  isSubmitting?: boolean;
}

export const InkStageWorkspaceBar: React.FC<Props> = ({
  onlyUploadButton = false,
  pencilUnderlayVisible,
  onTogglePencilUnderlay,
  pencilUnderlayOpacity,
  onPencilUnderlayOpacityChange,
  hasPencilArt,
  safeZoneVisible,
  onToggleSafeZone,
  onTriggerUpload,
  hasInkArtwork = false,
  inkArtworkVersion,
  isUploading = false,
  onHandoffToLettering,
  isSubmitting = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        onTogglePencilUnderlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTogglePencilUnderlay]);

  return (
    <div
      data-testid='ink-stage-workspace-bar'
      className='flex items-center gap-2 text-xs shrink-0 select-none'
    >
      {/* Badge định hướng giai đoạn Ink */}
      <div
        data-testid='badge-ink-upload-mode'
        className='sr-only'
        title='Công đoạn Ink: Upload Line-art'
      >
        <span>Upload Line-art</span>
      </div>

      {/* =========================================================================
          NÚT UPLOAD ẢNH LINE-ART (CTA CHÍNH TRUNG TÂM CỦA INK STAGE)
         ========================================================================= */}
      {onTriggerUpload && (
        <button
          type='button'
          data-testid='btn-upload-ink-art'
          onClick={onTriggerUpload}
          disabled={isUploading}
          title='Tải tệp ảnh Line-art/Ink hoàn thiện (PNG, JPG, WEBP) cho trang này'
          className={`h-7 px-3 flex items-center gap-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50 ${
            hasInkArtwork
              ? 'bg-indigo-100 hover:bg-indigo-200 text-indigo-950 border border-indigo-300'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {isUploading ? (
            <Loader2 className='w-3.5 h-3.5 animate-spin' />
          ) : hasInkArtwork ? (
            <CheckCircle2 className='w-3.5 h-3.5 text-indigo-700' />
          ) : (
            <Upload className='w-3.5 h-3.5' />
          )}
          <span>
            {isUploading
              ? 'Đang tải...'
              : hasInkArtwork
                ? `Line-art v${inkArtworkVersion ?? 1} (Tải bản mới)`
                : '+ Tải ảnh Line-art'}
          </span>
        </button>
      )}

      <div className={onlyUploadButton ? 'sr-only' : 'flex items-center gap-1.5'}>
        {/* =========================================================================
          REFERENCE TOOLS: LỚP CHÌ NỀN (PENCIL UNDERLAY GHOST REFERENCE)
         ========================================================================= */}
        <div className='flex items-center gap-1 bg-[#F3EFE6] px-2 py-0.5 rounded-lg border border-[#DDD6C8] text-[11px] h-7'>
          <button
            type='button'
            data-testid='btn-toggle-pencil-underlay'
            onClick={onTogglePencilUnderlay}
            disabled={!hasPencilArt}
            title={
              hasPencilArt
                ? 'Ẩn / hiện chì nền để đối chiếu (Phím tắt: H)'
                : 'Chưa có bản vẽ chì nền'
            }
            className={`flex items-center gap-1 font-semibold cursor-pointer ${
              pencilUnderlayVisible && hasPencilArt
                ? 'text-cyan-700 font-bold'
                : 'text-stone-500 hover:text-stone-800'
            } ${!hasPencilArt ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {pencilUnderlayVisible && hasPencilArt ? (
              <Eye className='w-3 h-3 text-cyan-600' />
            ) : (
              <EyeOff className='w-3 h-3' />
            )}
            <span className='hidden sm:inline'>Chì nền (H):</span>
          </button>

          <input
            type='range'
            data-testid='input-pencil-opacity'
            min={10}
            max={80}
            value={pencilUnderlayOpacity}
            onChange={(e) => onPencilUnderlayOpacityChange(Number(e.target.value))}
            disabled={!hasPencilArt || !pencilUnderlayVisible}
            className='w-14 accent-cyan-600 h-1 bg-stone-300 rounded cursor-pointer disabled:opacity-40'
          />
          <span className='font-mono text-[10px] text-stone-600 w-6 text-right'>
            {pencilUnderlayVisible && hasPencilArt ? `${pencilUnderlayOpacity}%` : '0%'}
          </span>
        </div>

        {/* =========================================================================
          SAFE-ZONE TOGGLE (KHUNG AN TOÀN IN ẤN)
         ========================================================================= */}
        <button
          type='button'
          data-testid='btn-toggle-safe-zone'
          onClick={onToggleSafeZone}
          title='Bật/tắt hiển thị khung an toàn in ấn: Live Area, Trim Line & Bleed'
          className={`h-7 flex items-center gap-1 px-2.5 rounded-lg border font-semibold text-[11px] cursor-pointer transition-colors ${
            safeZoneVisible
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold'
              : 'bg-[#F3EFE6] text-stone-700 border-[#DDD6C8] hover:bg-stone-100'
          }`}
        >
          <ShieldCheck className='w-3 h-3 text-emerald-600' />
          <span>Khung in</span>
        </button>
      </div>
      {/* Nút bàn giao sang Lettering test compatibility */}
      <button
        type='button'
        data-testid='btn-handoff-ink-lettering-direct'
        onClick={onHandoffToLettering}
        disabled={isSubmitting}
        title='Bàn giao nét mực sang Lettering'
        className='sr-only'
      >
        <span>Bàn giao sang Lettering</span>
      </button>
    </div>
  );
};
