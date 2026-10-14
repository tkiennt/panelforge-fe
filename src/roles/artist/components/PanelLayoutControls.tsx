import React, { useEffect, useState } from 'react';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceBetween,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalSpaceBetween,
  AlertTriangle,
  CheckCircle2,
  Grid2x2,
  Wand2,
} from 'lucide-react';
import {
  DEFAULT_GAP,
  DEFAULT_MARGIN,
  type AlignMode,
  type DragMode,
  type GapLabel,
  type Guide,
  type LayoutIssue,
  type SplitPreset,
} from '@/shared/utils/panelLayout';

const HANDLES: Array<{
  id: Exclude<DragMode, 'move'>;
  style: React.CSSProperties;
  cursor: string;
}> = [
  { id: 'nw', style: { left: 0, top: 0 }, cursor: 'nwse-resize' },
  { id: 'n', style: { left: '50%', top: 0, marginLeft: -4 }, cursor: 'ns-resize' },
  { id: 'ne', style: { right: 0, top: 0 }, cursor: 'nesw-resize' },
  { id: 'e', style: { right: 0, top: '50%', marginTop: -4 }, cursor: 'ew-resize' },
  { id: 'se', style: { right: 0, bottom: 0 }, cursor: 'nwse-resize' },
  { id: 's', style: { left: '50%', bottom: 0, marginLeft: -4 }, cursor: 'ns-resize' },
  { id: 'sw', style: { left: 0, bottom: 0 }, cursor: 'nesw-resize' },
  { id: 'w', style: { left: 0, top: '50%', marginTop: -4 }, cursor: 'ew-resize' },
];

/** 8 tay nắm đổi kích thước hiện quanh khung đang chọn. */
export const PanelResizeHandles: React.FC<{
  onStart: (mode: Exclude<DragMode, 'move'>, e: React.PointerEvent) => void;
}> = ({ onStart }) => (
  <>
    {HANDLES.map((h) => (
      <span
        key={h.id}
        data-testid={`panel-handle-${h.id}`}
        onPointerDown={(e) => {
          e.stopPropagation();
          onStart(h.id, e);
        }}
        className='absolute w-2 h-2 bg-white border border-orange-500 rounded-sm z-30'
        style={{ ...h.style, cursor: h.cursor, touchAction: 'none' }}
      />
    ))}
  </>
);

/** Đường dóng + nhãn khoảng cách (%) phủ lên trang khi đang kéo. */
export const LayoutGuidesOverlay: React.FC<{ guides: Guide[]; gaps: GapLabel[] }> = ({
  guides,
  gaps,
}) => (
  <div className='absolute inset-0 pointer-events-none z-40' data-testid='layout-guides'>
    {guides.map((g, i) => (
      <div
        key={`g-${i}`}
        className='absolute bg-fuchsia-500/80'
        style={
          g.axis === 'x'
            ? { left: `${g.pos}%`, top: 0, bottom: 0, width: 1 }
            : { top: `${g.pos}%`, left: 0, right: 0, height: 1 }
        }
      />
    ))}
    {gaps.map((g, i) => (
      <div
        key={`gap-${i}`}
        className='absolute flex items-center justify-center'
        style={
          g.axis === 'y'
            ? { left: `${g.at}%`, top: `${g.from}%`, height: `${g.to - g.from}%`, width: 0 }
            : { top: `${g.at}%`, left: `${g.from}%`, width: `${g.to - g.from}%`, height: 0 }
        }
      >
        <span className='bg-fuchsia-600 text-white text-[8px] font-mono px-1 rounded whitespace-nowrap'>
          {g.value}%
        </span>
      </div>
    ))}
  </div>
);

interface ToolbarProps {
  panelCount: number;
  selectedCount: number;
  issues: LayoutIssue[];
  busy: boolean;
  onRelayout: (preset: SplitPreset, count: number, margin: number, gap: number) => void;
  onAlign: (mode: AlignMode) => void;
  onDistribute: (axis: 'x' | 'y') => void;
  onStraighten: () => void;
  onSelectAll: () => void;
}

const PRESET_LABEL: Record<SplitPreset, string> = {
  vertical: 'Xếp dọc (mỗi khung 1 dải)',
  horizontal: 'Xếp ngang (1 hàng)',
  grid: 'Lưới (2 cột; N lẻ → 2/3)',
};

const ALIGN_BUTTONS: Array<{ mode: AlignMode; label: string; Icon: React.ElementType }> = [
  { mode: 'left', label: 'Căn trái', Icon: AlignStartVertical },
  { mode: 'centerX', label: 'Căn giữa ngang', Icon: AlignCenterVertical },
  { mode: 'right', label: 'Căn phải', Icon: AlignEndVertical },
  { mode: 'top', label: 'Căn trên', Icon: AlignStartHorizontal },
  { mode: 'centerY', label: 'Căn giữa dọc', Icon: AlignCenterHorizontal },
  { mode: 'bottom', label: 'Căn dưới', Icon: AlignEndHorizontal },
];

/** Thanh công cụ bố cục: chia lại N khung, căn chỉnh, phân bố đều, danh sách cảnh báo lệch. */
export const PanelLayoutToolbar: React.FC<ToolbarProps> = ({
  panelCount,
  selectedCount,
  issues,
  busy,
  onRelayout,
  onAlign,
  onDistribute,
  onStraighten,
  onSelectAll,
}) => {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(Math.max(panelCount, 1));
  const [preset, setPreset] = useState<SplitPreset>('vertical');
  const [margin, setMargin] = useState(DEFAULT_MARGIN);
  const [gap, setGap] = useState(DEFAULT_GAP);

  useEffect(() => {
    setCount((c) => Math.max(c, panelCount, 1));
  }, [panelCount]);

  const canAlign = selectedCount >= 2 && !busy;
  const canDistribute = selectedCount >= 3 && !busy;

  return (
    <div
      className='mb-3 p-2.5 bg-white border border-[#E7E7E7] rounded-xl space-y-2'
      data-testid='panel-layout-toolbar'
    >
      <div className='flex items-center gap-1.5 flex-wrap'>
        <button
          type='button'
          data-testid='layout-relayout-toggle'
          onClick={() => setOpen((v) => !v)}
          disabled={busy}
          className='px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 flex items-center gap-1 cursor-pointer disabled:opacity-50'
          title='Chia lại bố cục thành N khung đều nhau, giữ khung và ảnh đã có'
        >
          <Grid2x2 className='w-3.5 h-3.5' /> Chia lại thành N khung
        </button>
        <button
          type='button'
          onClick={onSelectAll}
          className='px-2 py-1 text-[11px] font-semibold rounded-lg border border-[#E7E7E7] hover:bg-zinc-50 cursor-pointer'
          title='Chọn tất cả khung (hoặc Shift + bấm từng khung)'
        >
          Chọn tất cả
        </button>
        <span className='w-px h-5 bg-[#E7E7E7] mx-0.5' />
        {ALIGN_BUTTONS.map(({ mode, label, Icon }) => (
          <button
            key={mode}
            type='button'
            title={label}
            aria-label={label}
            disabled={!canAlign}
            onClick={() => onAlign(mode)}
            className='p-1.5 rounded-md border border-[#E7E7E7] hover:bg-zinc-50 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed'
          >
            <Icon className='w-3.5 h-3.5' />
          </button>
        ))}
        <span className='w-px h-5 bg-[#E7E7E7] mx-0.5' />
        <button
          type='button'
          title='Phân bố đều khoảng cách theo chiều dọc (chọn ≥ 3 khung)'
          aria-label='Phân bố đều dọc'
          disabled={!canDistribute}
          onClick={() => onDistribute('y')}
          className='p-1.5 rounded-md border border-[#E7E7E7] hover:bg-zinc-50 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed'
        >
          <AlignVerticalSpaceBetween className='w-3.5 h-3.5' />
        </button>
        <button
          type='button'
          title='Phân bố đều khoảng cách theo chiều ngang (chọn ≥ 3 khung)'
          aria-label='Phân bố đều ngang'
          disabled={!canDistribute}
          onClick={() => onDistribute('x')}
          className='p-1.5 rounded-md border border-[#E7E7E7] hover:bg-zinc-50 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed'
        >
          <AlignHorizontalSpaceBetween className='w-3.5 h-3.5' />
        </button>
        <span className='text-[10px] text-zinc-500 ml-auto'>
          Đang chọn {selectedCount} khung · Shift+bấm để chọn nhiều · phím mũi tên để nhích
        </span>
      </div>

      {open && (
        <div
          className='p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-lg grid grid-cols-2 gap-2 text-[11px]'
          data-testid='layout-relayout-form'
        >
          <label className='flex flex-col gap-0.5'>
            <span className='text-zinc-600'>Số khung (≥ {panelCount})</span>
            <input
              type='number'
              min={Math.max(panelCount, 1)}
              max={12}
              value={count}
              data-testid='layout-count'
              onChange={(e) => setCount(parseInt(e.target.value, 10) || panelCount || 1)}
              className='px-2 py-1 bg-white border border-[#E7E7E7] rounded font-mono'
            />
          </label>
          <label className='flex flex-col gap-0.5'>
            <span className='text-zinc-600'>Kiểu chia</span>
            <select
              value={preset}
              data-testid='layout-preset'
              onChange={(e) => setPreset(e.target.value as SplitPreset)}
              className='px-2 py-1 bg-white border border-[#E7E7E7] rounded'
            >
              {(Object.keys(PRESET_LABEL) as SplitPreset[]).map((k) => (
                <option key={k} value={k}>
                  {PRESET_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label className='flex flex-col gap-0.5'>
            <span className='text-zinc-600'>Lề trang (%)</span>
            <input
              type='number'
              step={0.5}
              min={0}
              max={15}
              value={margin}
              onChange={(e) => setMargin(Math.max(0, parseFloat(e.target.value) || 0))}
              className='px-2 py-1 bg-white border border-[#E7E7E7] rounded font-mono'
            />
          </label>
          <label className='flex flex-col gap-0.5'>
            <span className='text-zinc-600'>Khoảng cách giữa khung (%)</span>
            <input
              type='number'
              step={0.5}
              min={0}
              max={10}
              value={gap}
              onChange={(e) => setGap(Math.max(0, parseFloat(e.target.value) || 0))}
              className='px-2 py-1 bg-white border border-[#E7E7E7] rounded font-mono'
            />
          </label>
          <p className='col-span-2 text-[10px] text-zinc-500'>
            Khung đã có giữ nguyên ảnh, Scene và thứ tự đọc; khung mới được thêm vào cuối và cần tải
            ảnh riêng.
          </p>
          <button
            type='button'
            data-testid='layout-relayout-apply'
            disabled={busy || count < panelCount}
            onClick={() => onRelayout(preset, count, margin, gap)}
            className='col-span-2 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-50 cursor-pointer'
          >
            {busy ? 'Đang áp dụng…' : `Chia lại thành ${count} khung`}
          </button>
        </div>
      )}

      {panelCount >= 2 &&
        (issues.length === 0 ? (
          <p
            className='text-[10px] text-emerald-700 flex items-center gap-1'
            data-testid='layout-ok'
          >
            <CheckCircle2 className='w-3 h-3' /> Bố cục cân đối: thẳng hàng, khoảng cách đều.
          </p>
        ) : (
          <div
            className='p-2 bg-amber-50 border border-amber-200 rounded-lg space-y-1'
            data-testid='layout-issues'
          >
            {issues.map((i, idx) => (
              <p key={idx} className='text-[10px] text-amber-800 flex items-start gap-1'>
                <AlertTriangle className='w-3 h-3 mt-px shrink-0' /> {i.message}
              </p>
            ))}
            <button
              type='button'
              data-testid='layout-straighten'
              onClick={onStraighten}
              disabled={busy}
              className='mt-1 px-2 py-1 text-[10px] font-semibold rounded bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 cursor-pointer disabled:opacity-50'
              title='Gom các cạnh lệch nhẹ về cùng một đường'
            >
              <Wand2 className='w-3 h-3' /> Tự căn thẳng các cạnh lệch
            </button>
          </div>
        ))}
    </div>
  );
};
