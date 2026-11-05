/* Lucian UX/UI Prompt #039 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/ */
import React, { useState, useEffect } from 'react';
import {
  PenTool,
  PaintBucket,
  Grid,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export type InkingNib = 'g-pen' | 'maru-pen' | 'turnip-pen' | 'fill-bucket';
export type ScreenToneLpi = 60 | 80 | 100;

interface Props {
  // Pencil Underlay Controller
  pencilUnderlayVisible: boolean;
  onTogglePencilUnderlay: () => void;
  pencilUnderlayOpacity: number;
  onPencilUnderlayOpacityChange: (val: number) => void;
  hasPencilArt: boolean;

  // Inking Toolset
  selectedNib: InkingNib;
  onSelectNib: (nib: InkingNib) => void;

  // Screen-Tone & Pattern Library
  screenToneEnabled: boolean;
  onToggleScreenTone: () => void;
  selectedLpi: ScreenToneLpi;
  onSelectLpi: (lpi: ScreenToneLpi) => void;
  toneDensity: number;
  onToneDensityChange: (val: number) => void;

  // Safe-Zone & Bleed Margins
  safeZoneVisible: boolean;
  onToggleSafeZone: () => void;

  // Action Handoff
  onHandoffToLettering: () => void;
  isSubmitting?: boolean;
}

export const InkStageWorkspaceBar: React.FC<Props> = ({
  pencilUnderlayVisible,
  onTogglePencilUnderlay,
  pencilUnderlayOpacity,
  onPencilUnderlayOpacityChange,
  hasPencilArt,
  selectedNib,
  onSelectNib,
  screenToneEnabled,
  onToggleScreenTone,
  selectedLpi,
  onSelectLpi,
  toneDensity,
  onToneDensityChange,
  safeZoneVisible,
  onToggleSafeZone,
  onHandoffToLettering,
  isSubmitting = false,
}) => {
  const [toneMenuOpen, setToneMenuOpen] = useState(false);

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
      className='bg-[#FCFBF8] border-b border-[#E8E3D8] px-3 py-1 flex items-center justify-between gap-2 shadow-2xs text-xs overflow-x-auto no-scrollbar'
    >
      {/* Khối công cụ Ink tinh gọn */}
      <div className='flex items-center gap-2 shrink-0'>
        {/* Bộ ngòi mực Inking */}
        <div className='flex items-center gap-0.5 bg-[#F3EFE6] p-0.5 rounded-lg border border-[#DDD6C8] font-semibold'>
          <button
            type='button'
            data-testid='btn-nib-gpen'
            onClick={() => onSelectNib('g-pen')}
            title='G-Pen: Nét biến thiên lực nhấn'
            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              selectedNib === 'g-pen'
                ? 'bg-stone-900 text-white shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            G-Pen
          </button>
          <button
            type='button'
            data-testid='btn-nib-maru'
            onClick={() => onSelectNib('maru-pen')}
            title='Maru Pen: Chi tiết mảnh & tóc'
            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              selectedNib === 'maru-pen'
                ? 'bg-stone-900 text-white shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Maru
          </button>
          <button
            type='button'
            data-testid='btn-nib-turnip'
            onClick={() => onSelectNib('turnip-pen')}
            title='Turnip Pen: Nét đều đặn'
            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              selectedNib === 'turnip-pen'
                ? 'bg-stone-900 text-white shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Kabura
          </button>
          <button
            type='button'
            data-testid='btn-nib-bucket'
            onClick={() => onSelectNib('fill-bucket')}
            title='Thùng sơn đổ mảng đen (Beta)'
            className={`p-1 rounded-md transition-all cursor-pointer ${
              selectedNib === 'fill-bucket'
                ? 'bg-stone-900 text-white shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <PaintBucket className='w-3.5 h-3.5' />
          </button>
        </div>

        <span className='w-px h-4 bg-stone-300 mx-0.5' />

        {/* Lớp phác thảo chì nền (Underlay) */}
        <div className='flex items-center gap-1.5 bg-[#F3EFE6] px-2 py-0.5 rounded-lg border border-[#DDD6C8]'>
          <button
            type='button'
            data-testid='btn-toggle-pencil-underlay'
            onClick={onTogglePencilUnderlay}
            disabled={!hasPencilArt}
            title={hasPencilArt ? 'Ẩn / hiện chì nền (Phím H)' : 'Chưa có bản chì'}
            className={`flex items-center gap-1 font-semibold cursor-pointer ${
              pencilUnderlayVisible && hasPencilArt
                ? 'text-cyan-700 font-bold'
                : 'text-stone-500 hover:text-stone-800'
            } ${!hasPencilArt ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {pencilUnderlayVisible && hasPencilArt ? (
              <Eye className='w-3.5 h-3.5 text-cyan-600' />
            ) : (
              <EyeOff className='w-3.5 h-3.5' />
            )}
            <span>Chì nền (H):</span>
          </button>

          <input
            type='range'
            data-testid='input-pencil-opacity'
            min={10}
            max={80}
            value={pencilUnderlayOpacity}
            onChange={(e) => onPencilUnderlayOpacityChange(Number(e.target.value))}
            disabled={!hasPencilArt || !pencilUnderlayVisible}
            className='w-14 accent-cyan-600 h-1 bg-stone-200 rounded cursor-pointer disabled:opacity-40'
          />
          <span className='font-mono text-[10px] text-stone-600 w-6 text-right'>
            {pencilUnderlayVisible && hasPencilArt ? `${pencilUnderlayOpacity}%` : '0%'}
          </span>
        </div>

        {/* Screen-Tone Popover */}
        <div className='relative'>
          <button
            type='button'
            data-testid='btn-screentone-toggle'
            onClick={() => {
              if (!screenToneEnabled) onToggleScreenTone();
              setToneMenuOpen(!toneMenuOpen);
            }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border font-semibold cursor-pointer transition-colors ${
              screenToneEnabled
                ? 'bg-indigo-50 text-indigo-900 border-indigo-300'
                : 'bg-[#F3EFE6] text-stone-700 border-[#DDD6C8] hover:bg-stone-100'
            }`}
          >
            <Grid className='w-3.5 h-3.5 text-indigo-600' />
            <span>Trame {screenToneEnabled ? `(${selectedLpi}L / ${toneDensity}%)` : ''}</span>
          </button>

          {toneMenuOpen && (
            <div
              data-testid='screentone-popover'
              className='absolute top-full left-0 mt-1 w-56 bg-white border border-stone-200 rounded-xl shadow-lg p-2.5 z-50 space-y-2'
            >
              <div className='flex items-center justify-between text-xs font-bold border-b border-stone-100 pb-1'>
                <span>Dán hạt Screen-Tone</span>
                <button
                  type='button'
                  onClick={onToggleScreenTone}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                    screenToneEnabled ? 'bg-indigo-600 text-white' : 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {screenToneEnabled ? 'Bật' : 'Tắt'}
                </button>
              </div>

              {screenToneEnabled && (
                <>
                  <div className='space-y-1'>
                    <label className='text-[10px] font-bold text-stone-500 uppercase'>Mật độ hạt (Lpi)</label>
                    <div className='flex gap-1'>
                      {([60, 80, 100] as ScreenToneLpi[]).map((lpi) => (
                        <button
                          key={lpi}
                          type='button'
                          data-testid={`btn-tone-lpi-${lpi}`}
                          onClick={() => onSelectLpi(lpi)}
                          className={`flex-1 py-1 text-xs rounded border cursor-pointer font-mono ${
                            selectedLpi === lpi
                              ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                              : 'bg-stone-50 text-stone-700 border-stone-200'
                          }`}
                        >
                          {lpi}L
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className='space-y-1'>
                    <div className='flex justify-between text-[10px] font-bold text-stone-500 uppercase'>
                      <span>Độ đậm sắc độ:</span>
                      <span className='font-mono text-indigo-600'>{toneDensity}%</span>
                    </div>
                    <input
                      type='range'
                      data-testid='input-tone-density'
                      min={10}
                      max={70}
                      step={5}
                      value={toneDensity}
                      onChange={(e) => onToneDensityChange(Number(e.target.value))}
                      className='w-full accent-indigo-600 h-1.5 bg-stone-200 rounded cursor-pointer'
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Safe-Zone Toggle */}
        <button
          type='button'
          data-testid='btn-toggle-safe-zone'
          onClick={onToggleSafeZone}
          title='Khung an toàn in ấn: Live Area, Trim Line & Bleed'
          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border font-semibold cursor-pointer transition-colors ${
            safeZoneVisible
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-[#F3EFE6] text-stone-700 border-[#DDD6C8] hover:bg-stone-100'
          }`}
        >
          <ShieldCheck className='w-3.5 h-3.5 text-emerald-600' />
          <span>Khung in</span>
        </button>
      </div>

      {/* Nút hoàn tất nét vẽ & chuyển giao sang Lettering */}
      <button
        type='button'
        data-testid='btn-handoff-ink-lettering-direct'
        onClick={onHandoffToLettering}
        disabled={isSubmitting}
        title='Hoàn tất nét mực và mở việc ráp thoại cho Letterer'
        className='flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs cursor-pointer transition-all active:scale-95 disabled:opacity-50 shrink-0 ml-auto'
      >
        <span>Hoàn tất nét ➔ Lettering</span>
        <ArrowRight className='w-3 h-3' />
      </button>
    </div>
  );
};
