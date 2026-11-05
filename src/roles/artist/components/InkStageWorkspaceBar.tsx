import React, { useState, useEffect } from 'react';
import {
  PenTool,
  PaintBucket,
  Grid,
  Crop,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Zap,
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

  // Phím tắt H để bật/tắt nhanh lớp Pencil Underlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bỏ qua nếu đang gõ trong input / textarea
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
      className='bg-[#FCFBF8] border-b border-[#E7E2D7] px-3 py-2 flex flex-wrap items-center justify-between gap-3 shadow-2xs'
    >
      {/* Khối bên trái: Bút mực, Trame, Nền chì phác thảo & Khung an toàn */}
      <div className='flex items-center gap-3 flex-wrap'>
        {/* Badge nhận diện Stage */}
        <div className='flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-950 text-xs font-bold tracking-wide uppercase font-mono'>
          <span className='w-2 h-2 rounded-full bg-indigo-600 animate-pulse' />
          [INK STAGE] Đi nét mực hoàn thiện, Đổ mảng &amp; Screen-tone
        </div>

        {/* Inking Toolset */}
        <div className='flex items-center gap-1 bg-[#F5F2EB] p-1 rounded-lg border border-[#E0D9CC] text-xs font-semibold'>
          <button
            type='button'
            data-testid='btn-nib-gpen'
            onClick={() => onSelectNib('g-pen')}
            title='G-Pen: Biến thiên lực nhấn dày mỏng, đi nét nhân vật chính'
            className={`flex items-center gap-1 px-2 py-1 rounded transition-all cursor-pointer ${
              selectedNib === 'g-pen'
                ? 'bg-stone-900 text-white shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <PenTool className='w-3.5 h-3.5' />
            <span>G-Pen</span>
          </button>
          <button
            type='button'
            data-testid='btn-nib-maru'
            onClick={() => onSelectNib('maru-pen')}
            title='Maru Pen: Nét mảnh chuẩn xác, vẽ mắt, tóc & chi tiết nhỏ'
            className={`flex items-center gap-1 px-2 py-1 rounded transition-all cursor-pointer ${
              selectedNib === 'maru-pen'
                ? 'bg-stone-900 text-white shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <PenTool className='w-3 h-3 stroke-[2.5]' />
            <span>Maru Pen</span>
          </button>
          <button
            type='button'
            data-testid='btn-nib-turnip'
            onClick={() => onSelectNib('turnip-pen')}
            title='Turnip Pen: Nét đều, đi viền khung tranh và bối cảnh'
            className={`flex items-center gap-1 px-2 py-1 rounded transition-all cursor-pointer ${
              selectedNib === 'turnip-pen'
                ? 'bg-stone-900 text-white shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <PenTool className='w-3.5 h-3.5 stroke-[1.5]' />
            <span>Turnip</span>
          </button>
          <button
            type='button'
            data-testid='btn-nib-bucket'
            onClick={() => onSelectNib('fill-bucket')}
            title='Solid Black Fill Bucket: Đổ mảng đen Beta-flashing chống lem viền'
            className={`flex items-center gap-1 px-2 py-1 rounded transition-all cursor-pointer ${
              selectedNib === 'fill-bucket'
                ? 'bg-stone-900 text-white shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <PaintBucket className='w-3.5 h-3.5' />
            <span>Đổ đen (Beta)</span>
          </button>
        </div>

        {/* Screen-Tone & Pattern Library */}
        <div className='relative'>
          <button
            type='button'
            data-testid='btn-screentone-toggle'
            onClick={() => setToneMenuOpen(!toneMenuOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
              screenToneEnabled || toneMenuOpen
                ? 'bg-stone-900 text-white border-stone-800'
                : 'bg-[#F5F2EB] text-stone-700 border-[#E0D9CC] hover:bg-stone-100'
            }`}
          >
            <Grid className='w-3.5 h-3.5 text-stone-400' />
            <span>Hạt Trame ({selectedLpi} Lpi · {toneDensity}%)</span>
          </button>

          {toneMenuOpen && (
            <div
              data-testid='screentone-dropdown'
              className='absolute top-full left-0 mt-1 w-64 bg-white border border-stone-200 rounded-xl shadow-lg p-3 z-50 space-y-3'
            >
              <div className='flex items-center justify-between border-b border-stone-100 pb-2'>
                <span className='text-xs font-bold text-stone-800'>Thư viện Screen-Tone</span>
                <label className='flex items-center gap-1.5 text-xs text-stone-600 cursor-pointer'>
                  <input
                    type='checkbox'
                    data-testid='checkbox-enable-screentone'
                    checked={screenToneEnabled}
                    onChange={onToggleScreenTone}
                    className='rounded text-orange-600 focus:ring-orange-500'
                  />
                  <span>Áp dụng</span>
                </label>
              </div>

              {/* Lpi Selector */}
              <div>
                <label className='text-[11px] font-semibold text-stone-500 block mb-1'>
                  Mật độ hạt (LPI):
                </label>
                <div className='grid grid-cols-3 gap-1'>
                  {([60, 80, 100] as ScreenToneLpi[]).map((lpi) => (
                    <button
                      key={lpi}
                      type='button'
                      data-testid={`btn-lpi-${lpi}`}
                      onClick={() => onSelectLpi(lpi)}
                      className={`py-1 text-xs rounded border cursor-pointer font-mono font-bold ${
                        selectedLpi === lpi
                          ? 'bg-orange-50 text-orange-800 border-orange-300'
                          : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {lpi} Lpi
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone Density Slider */}
              <div>
                <div className='flex items-center justify-between text-[11px] text-stone-600 mb-1'>
                  <span>Độ đậm sắc độ (Density):</span>
                  <span className='font-mono font-bold'>{toneDensity}%</span>
                </div>
                <input
                  type='range'
                  data-testid='input-tone-density'
                  min={10}
                  max={70}
                  step={5}
                  value={toneDensity}
                  onChange={(e) => onToneDensityChange(Number(e.target.value))}
                  className='w-full accent-orange-600 h-1.5 bg-stone-200 rounded-lg cursor-pointer'
                />
              </div>
            </div>
          )}
        </div>

        {/* Pencil Underlay Controller */}
        <div className='flex items-center gap-2 bg-[#F5F2EB] px-2.5 py-1 rounded-lg border border-[#E0D9CC] text-xs'>
          <button
            type='button'
            data-testid='btn-toggle-pencil-underlay'
            onClick={onTogglePencilUnderlay}
            disabled={!hasPencilArt}
            title='Ẩn / Hiện lớp phác thảo chì Cyan nền dưới (Phím tắt: H)'
            className={`flex items-center gap-1 font-semibold cursor-pointer ${
              pencilUnderlayVisible && hasPencilArt
                ? 'text-cyan-800'
                : 'text-stone-500 hover:text-stone-800'
            } ${!hasPencilArt ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {pencilUnderlayVisible && hasPencilArt ? (
              <Eye className='w-3.5 h-3.5 text-cyan-600' />
            ) : (
              <EyeOff className='w-3.5 h-3.5' />
            )}
            <span>Lớp Chì Nền (H):</span>
          </button>

          <input
            type='range'
            data-testid='input-pencil-underlay-opacity'
            min={10}
            max={80}
            value={pencilUnderlayOpacity}
            onChange={(e) => onPencilUnderlayOpacityChange(Number(e.target.value))}
            disabled={!hasPencilArt || !pencilUnderlayVisible}
            className='w-16 accent-cyan-600 h-1.5 bg-stone-200 rounded-lg cursor-pointer disabled:opacity-40'
          />
          <span className='font-mono text-[11px] text-stone-600 w-8 text-right'>
            {pencilUnderlayVisible && hasPencilArt ? `${pencilUnderlayOpacity}%` : 'Ẩn'}
          </span>
        </div>

        {/* Safe-Zone & Bleed Margins Viewer */}
        <button
          type='button'
          data-testid='btn-toggle-safe-zone'
          onClick={onToggleSafeZone}
          title='Khung viền an toàn in ấn: Live Area, Trim Line, Bleed Margins'
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
            safeZoneVisible
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold'
              : 'bg-[#F5F2EB] text-stone-600 border-[#E0D9CC] hover:bg-stone-100'
          }`}
        >
          <Crop className='w-3.5 h-3.5 text-emerald-600' />
          <span>Khung in an toàn</span>
        </button>
      </div>

      {/* Khối bên phải: Bàn giao sang Lettering */}
      <div className='flex items-center gap-2'>
        <button
          type='button'
          data-testid='btn-handoff-ink-lettering-direct'
          onClick={onHandoffToLettering}
          disabled={isSubmitting}
          title='Hoàn tất nét vẽ mực & Tự động đẩy Line-art sang Lettering Stage kèm Kịch bản khóa'
          className='flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold tracking-tight shadow-soft-sm cursor-pointer transition-all active:scale-95 disabled:opacity-50'
        >
          <span>Hoàn tất nét vẽ ➔ Lettering</span>
          <ArrowRight className='w-3.5 h-3.5' />
        </button>
      </div>
    </div>
  );
};
