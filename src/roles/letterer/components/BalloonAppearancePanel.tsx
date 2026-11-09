import { BALLOON_SHAPES, type BalloonAppearance } from '../lib/balloonRender';

interface Props {
  appearance: BalloonAppearance;
  defaultShapeLabel: string;
  /** Đã lưu hình bóng/nền/viền/đuôi khác mặc định theo loại. */
  isCustom: boolean;
  disabled?: boolean;
  onChange: (patch: Partial<BalloonAppearance>) => void;
  onReset: () => void;
  onFitBox: () => void;
  onFitText: () => void;
  /** Kéo góc bóng thì cỡ chữ tự co theo (không lớn hơn cỡ lúc bắt đầu kéo). */
  autoFitText: boolean;
  onToggleAutoFit: (on: boolean) => void;
}

const BORDER_WIDTHS = [0, 1.5, 2.5, 4, 6];

/** Hình bóng, nền, viền của một element chữ + hai thao tác vừa chữ/vừa bóng. */
export function BalloonAppearancePanel({
  appearance: ap,
  defaultShapeLabel,
  isCustom,
  disabled,
  onChange,
  onReset,
  onFitBox,
  onFitText,
  autoFitText,
  onToggleAutoFit,
}: Props) {
  return (
    <div
      data-testid='balloon-appearance-panel'
      className='p-3 bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl space-y-2 text-xs'
    >
      <div className='flex items-center justify-between font-bold text-[#1C1917]'>
        <span>Hình bóng thoại</span>
        {isCustom && !disabled && (
          <button
            onClick={onReset}
            data-testid='appearance-reset'
            title={`Về hình bóng mặc định: ${defaultShapeLabel}`}
            className='text-[#57534E] hover:text-[#1C1917] font-normal cursor-pointer transition-colors'
          >
            Đặt lại chuẩn
          </button>
        )}
      </div>
      <select
        value={ap.shape}
        disabled={disabled}
        onChange={(e) => onChange({ shape: e.target.value as BalloonAppearance['shape'] })}
        data-testid='balloon-shape-select'
        aria-label='Hình bóng'
        className='w-full border border-[#D8D2C5] bg-[#FCFBF8] text-[#1C1917] rounded-lg px-2 py-1.5 focus:border-[#F97316] focus:outline-none'
      >
        {BALLOON_SHAPES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      {ap.shape !== 'none' && (
        <div className='grid grid-cols-2 gap-2 text-[#57534E]'>
          <label className='flex items-center gap-1.5'>
            Nền
            <input
              type='color'
              value={ap.fillColor}
              disabled={disabled}
              onChange={(e) => onChange({ fillColor: e.target.value })}
              aria-label='Màu nền bóng'
            />
          </label>
          <label className='flex items-center gap-1.5'>
            Độ đục
            <input
              type='range'
              min={0}
              max={100}
              step={5}
              value={Math.round(ap.fillOpacity * 100)}
              disabled={disabled}
              onChange={(e) => onChange({ fillOpacity: Number(e.target.value) / 100 })}
              data-testid='balloon-fill-opacity'
              aria-label='Độ đục nền bóng'
              className='w-16 accent-[#F97316]'
            />
          </label>
          <label className='flex items-center gap-1.5'>
            Viền
            <input
              type='color'
              value={ap.borderColor}
              disabled={disabled}
              onChange={(e) => onChange({ borderColor: e.target.value })}
              aria-label='Màu viền bóng'
            />
          </label>
          <label className='flex items-center gap-1.5'>
            Dày
            <select
              value={ap.borderWidth}
              disabled={disabled}
              onChange={(e) => onChange({ borderWidth: Number(e.target.value) })}
              data-testid='balloon-border-width'
              aria-label='Độ dày viền bóng'
              className='border border-[#D8D2C5] bg-[#FCFBF8] text-[#1C1917] rounded px-1'
            >
              {BORDER_WIDTHS.map((w) => (
                <option key={w} value={w}>
                  {w === 0 ? 'Không' : `${w}px`}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {!disabled && (
        <label className='flex items-center gap-2 text-[#57534E] hover:text-[#1C1917] cursor-pointer'>
          <input
            type='checkbox'
            checked={autoFitText}
            onChange={(e) => onToggleAutoFit(e.target.checked)}
            data-testid='auto-fit-text'
            className='accent-[#F97316]'
          />
          Tự co chữ khi kéo góc bóng
        </label>
      )}
      {!disabled && (
        <div className='grid grid-cols-2 gap-1.5 pt-1'>
          <button
            onClick={onFitBox}
            data-testid='fit-box-to-text'
            title='Giữ cỡ chữ và bề rộng, đổi chiều cao bóng cho vừa chữ'
            className='py-1.5 border border-[#D8D2C5] rounded-lg bg-[#FCFBF8] hover:bg-[#F3F0E9] text-[#1C1917] font-medium cursor-pointer transition-colors'
          >
            Khớp bóng chữ
          </button>
          <button
            onClick={onFitText}
            data-testid='fit-text-to-box'
            title='Giữ kích thước bóng, chọn cỡ chữ lớn nhất còn vừa (14–160px)'
            className='py-1.5 border border-[#D8D2C5] rounded-lg bg-[#FCFBF8] hover:bg-[#F3F0E9] text-[#1C1917] font-medium cursor-pointer transition-colors'
          >
            Khớp chữ bóng
          </button>
        </div>
      )}
    </div>
  );
}
