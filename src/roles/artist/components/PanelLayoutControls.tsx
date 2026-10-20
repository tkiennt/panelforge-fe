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
  Check,
  CheckCircle2,
  Grid2x2,
  Lock,
  MousePointerClick,
  Wand2,
} from 'lucide-react';
import {
  DEFAULT_GAP,
  DEFAULT_MARGIN,
  round1,
  type AlignMode,
  type DragMode,
  type GapLabel,
  type Guide,
  type LayoutIssue,
  type Rect,
  type SplitPreset,
} from '@/shared/utils/panelLayout';
import type { PipelineStageDto } from '@/services/pipeline.service';
import type { PanelDto } from '@/types/pipeline';
import type { PageDto } from '@/services/page.service';
import { GutterSpacingRuler } from '@/shared/components/lucian';

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
        className='absolute bg-orange-500/80'
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
        <span className='bg-orange-600 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow-2xs whitespace-nowrap'>
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
  canEdit?: boolean;
  onRelayout: (preset: SplitPreset, count: number, margin: number, gap: number) => void;
  onAlign: (mode: AlignMode) => void;
  onDistribute: (axis: 'x' | 'y') => void;
  onStraighten: () => void;
  onSelectAll: () => void;
  stages?: PipelineStageDto[];
  viewStageId?: string;
  onSelectStage?: (stageId: string) => void;
  activeStageName?: string;
  selectedPanel?: PanelDto | null;
  selectedPage?: PageDto | null;
  panelRect?: Rect | null;
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

/**
 * Thanh điều khiển phía trên Canvas của Bàn vẽ:
 * Gộp công cụ bố cục, căn chỉnh, xem ảnh công đoạn và thông tin toạ độ khung vào 1 thanh nền sáng, dính trên đầu (sticky).
 */
export const PanelLayoutToolbar: React.FC<ToolbarProps> = ({
  panelCount,
  selectedCount,
  issues,
  busy,
  canEdit = true,
  onRelayout,
  onAlign,
  onDistribute,
  onStraighten,
  onSelectAll,
  stages = [],
  viewStageId = 'AUTO',
  onSelectStage,
  activeStageName,
  selectedPanel,
  selectedPage,
  panelRect,
}) => {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(Math.max(panelCount, 1));
  const [preset, setPreset] = useState<SplitPreset>('vertical');
  const [margin, setMargin] = useState(DEFAULT_MARGIN);
  const [gap, setGap] = useState(DEFAULT_GAP);

  useEffect(() => {
    setCount((c) => Math.max(c, panelCount, 1));
  }, [panelCount]);

  const canAlign = canEdit && selectedCount >= 2 && !busy;
  const canDistribute = canEdit && selectedCount >= 3 && !busy;

  return (
    <div
      className='sticky top-0 z-[45] bg-white/95 backdrop-blur-xs border border-[#E7E7E7] rounded-xl p-3 shadow-xs mb-3 space-y-2.5'
      data-testid='panel-layout-toolbar'
    >
      {/* Hàng 1 — "Công cụ" */}
      <div className='flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 overflow-x-auto pb-0.5 custom-scrollbar'>
        {/* Trái: nhóm Bố cục + nhóm Căn chỉnh */}
        <div className='flex items-center gap-1.5 shrink-0 flex-nowrap'>
          {canEdit && (
            <>
              <button
                type='button'
                data-testid='layout-relayout-toggle'
                onClick={() => setOpen((v) => !v)}
                disabled={busy}
                className='px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-orange-50 text-orange-900 border border-orange-200/80 hover:bg-orange-100 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs'
                title='Chia lại bố cục thành N khung đều nhau, giữ khung và ảnh đã có'
              >
                <Grid2x2 className='w-3.5 h-3.5 text-orange-600' />
                <span>Chia lại thành N khung</span>
              </button>
              <button
                type='button'
                onClick={onSelectAll}
                className='px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-[#E7E7E7] text-stone-700 hover:bg-stone-50 cursor-pointer transition-colors shadow-2xs'
                title='Chọn tất cả khung (hoặc Shift + bấm từng khung)'
              >
                Chọn tất cả
              </button>
              <span className='w-px h-5 bg-[#E7E7E7] mx-0.5' />
            </>
          )}

          {/* Nhóm Căn chỉnh */}
          {ALIGN_BUTTONS.map(({ mode, label, Icon }) => (
            <button
              key={mode}
              type='button'
              title={`${label}${!canAlign ? ' (chọn ≥ 2 khung)' : ''}`}
              aria-label={label}
              disabled={!canAlign}
              onClick={() => onAlign(mode)}
              className='p-1.5 rounded-lg border border-[#E7E7E7] text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs'
            >
              <Icon className='w-3.5 h-3.5' />
            </button>
          ))}
          <span className='w-px h-5 bg-[#E7E7E7] mx-0.5' />
          <button
            type='button'
            title={`Giãn đều ngang${!canDistribute ? ' (chọn ≥ 3 khung)' : ''}`}
            aria-label='Giãn đều ngang'
            disabled={!canDistribute}
            onClick={() => onDistribute('x')}
            className='p-1.5 rounded-lg border border-[#E7E7E7] text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs'
          >
            <AlignHorizontalSpaceBetween className='w-3.5 h-3.5' />
          </button>
          <button
            type='button'
            title={`Giãn đều dọc${!canDistribute ? ' (chọn ≥ 3 khung)' : ''}`}
            aria-label='Giãn đều dọc'
            disabled={!canDistribute}
            onClick={() => onDistribute('y')}
            className='p-1.5 rounded-lg border border-[#E7E7E7] text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs'
          >
            <AlignVerticalSpaceBetween className='w-3.5 h-3.5' />
          </button>
        </div>

        {/* Phải: Dòng trạng thái ngắn + Huy hiệu */}
        <div className='flex items-center gap-2 shrink-0 flex-nowrap ml-auto'>
          <span className='text-xs text-stone-500 font-medium'>
            Đang chọn {selectedCount} khung · Shift+bấm để chọn nhiều
          </span>
          {panelCount >= 2 &&
            (issues.length === 0 ? (
              <span
                className='inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs whitespace-nowrap'
                data-testid='layout-ok'
              >
                <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' />
                Bố cục cân đối
              </span>
            ) : (
              <span
                className='inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs whitespace-nowrap'
                data-testid='layout-issues-badge'
              >
                <AlertTriangle className='w-3.5 h-3.5 text-amber-600' />
                Bố cục lệch ({issues.length})
              </span>
            ))}
        </div>
      </div>

      {/* Form chia lại N khung */}
      {open && canEdit && (
        <div
          className='p-3.5 bg-orange-50/40 border border-orange-200/80 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs'
          data-testid='layout-relayout-form'
        >
          <label className='flex flex-col gap-1'>
            <span className='text-stone-700 font-semibold'>Số khung (≥ {panelCount})</span>
            <input
              type='number'
              min={Math.max(panelCount, 1)}
              max={12}
              value={count}
              data-testid='layout-count'
              onChange={(e) => setCount(parseInt(e.target.value, 10) || panelCount || 1)}
              className='px-2.5 py-1.5 bg-white border border-[#E7E7E7] rounded-lg font-mono text-xs focus:outline-none focus:border-orange-500'
            />
          </label>
          <label className='flex flex-col gap-1'>
            <span className='text-stone-700 font-semibold'>Kiểu chia</span>
            <select
              value={preset}
              data-testid='layout-preset'
              onChange={(e) => setPreset(e.target.value as SplitPreset)}
              className='px-2.5 py-1.5 bg-white border border-[#E7E7E7] rounded-lg text-xs font-medium focus:outline-none focus:border-orange-500'
            >
              {(Object.keys(PRESET_LABEL) as SplitPreset[]).map((k) => (
                <option key={k} value={k}>
                  {PRESET_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label className='flex flex-col gap-1'>
            <span className='text-stone-700 font-semibold'>Lề trang (%)</span>
            <input
              type='number'
              step={0.5}
              min={0}
              max={15}
              value={margin}
              onChange={(e) => setMargin(Math.max(0, parseFloat(e.target.value) || 0))}
              className='px-2.5 py-1.5 bg-white border border-[#E7E7E7] rounded-lg font-mono text-xs focus:outline-none focus:border-orange-500'
            />
          </label>
          <div className='col-span-1 sm:col-span-2'>
            <GutterSpacingRuler
              value={gap}
              onChange={(val) => setGap(val)}
              min={0}
              max={10}
              step={0.5}
              unit='%'
            />
          </div>
          <p className='col-span-1 sm:col-span-2 text-xs text-stone-500'>
            Khung đã có giữ nguyên ảnh, Scene và thứ tự đọc; khung mới được thêm vào cuối và cần tải
            ảnh riêng.
          </p>
          <button
            type='button'
            data-testid='layout-relayout-apply'
            disabled={busy || count < panelCount}
            onClick={() => onRelayout(preset, count, margin, gap)}
            className='col-span-1 sm:col-span-2 py-2 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold text-xs shadow-soft-sm disabled:opacity-50 cursor-pointer transition-all'
          >
            {busy ? 'Đang áp dụng…' : `Chia lại thành ${count} khung`}
          </button>
        </div>
      )}

      {/* Danh sách cảnh báo lệch (nếu có) */}
      {panelCount >= 2 && issues.length > 0 && (
        <div
          className='p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1.5'
          data-testid='layout-issues'
        >
          {issues.map((i, idx) => (
            <p key={idx} className='text-xs text-amber-800 flex items-start gap-1 font-medium'>
              <AlertTriangle className='w-3.5 h-3.5 mt-px shrink-0 text-amber-600' /> {i.message}
            </p>
          ))}
          {canEdit && (
            <button
              type='button'
              data-testid='layout-straighten'
              onClick={onStraighten}
              disabled={busy}
              className='mt-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs'
              title='Gom các cạnh lệch nhẹ về cùng một đường'
            >
              <Wand2 className='w-3.5 h-3.5' /> Tự căn thẳng các cạnh lệch
            </button>
          )}
        </div>
      )}

      {/* Hàng 2 — chia 2 cột */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch pt-2 border-t border-[#E7E7E7]'>
        {/* Trái: Segmented control "Xem ảnh công đoạn" */}
        <div className='flex flex-col justify-center min-w-0'>
          <div className='flex items-center justify-between gap-2 mb-1.5'>
            <span className='text-xs font-semibold text-stone-600'>Xem ảnh công đoạn:</span>
            {viewStageId === 'AUTO' && activeStageName && (
              <span className='text-[11px] text-stone-500 font-mono'>
                (Theo việc: {activeStageName})
              </span>
            )}
          </div>
          <div
            className='p-1 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl flex items-center gap-1 overflow-x-auto max-w-full custom-scrollbar'
            data-testid='desk-stage-switcher'
            role='radiogroup'
            aria-label='Xem ảnh công đoạn'
          >
            <button
              type='button'
              onClick={() => onSelectStage?.('AUTO')}
              className={`px-3 py-1.5 rounded-lg text-xs shrink-0 cursor-pointer transition-all ${
                viewStageId === 'AUTO'
                  ? 'bg-white text-orange-950 shadow-2xs border border-orange-200/80 font-bold'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/60 font-medium'
              }`}
              title='Công đoạn bạn đang làm trên trang này; không có thì công đoạn cao nhất đã có ảnh'
            >
              Tự động
              {viewStageId === 'AUTO' && activeStageName ? ` (${activeStageName})` : ''}
            </button>
            {stages.map((s) => {
              const isSelected = viewStageId === s.id;
              const isDisabled = s.isEnabled === false;
              return (
                <button
                  key={s.id}
                  type='button'
                  onClick={() => onSelectStage?.(s.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs shrink-0 flex items-center gap-1.5 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-white text-orange-950 shadow-2xs border border-orange-200/80 font-bold'
                      : isDisabled
                        ? 'text-stone-400 hover:text-stone-500 hover:bg-stone-100/50'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-white/60 font-medium'
                  }`}
                  title={
                    isDisabled ? 'Producer đã tắt công đoạn này' : `Xem ảnh ở công đoạn ${s.name}`
                  }
                >
                  <span>
                    {s.stageOrder}. {s.name}
                    {isDisabled ? ' đã tắt' : ''}
                  </span>
                  {isDisabled && <Lock className='w-3 h-3 text-stone-400 shrink-0 inline' />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Phải: Thẻ thông tin khung đang chọn (Nền sáng, không nền đen) */}
        <div className='min-w-0'>
          {selectedPanel && panelRect && selectedPage ? (
            (() => {
              const pw = selectedPage.widthPx || 1200;
              const ph = selectedPage.heightPx || 1800;
              const px = (v: number, total: number) => Math.round((v / 100) * total);
              const left = round1(panelRect.x);
              const rightM = round1(100 - panelRect.x - panelRect.w);
              const topM = round1(panelRect.y);
              const bottomM = round1(100 - panelRect.y - panelRect.h);
              const diffM = round1(Math.abs(left - rightM));
              const symmetric = diffM <= 0.2;

              return (
                <div
                  className='bg-white sm:bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl p-3 shadow-2xs flex flex-col justify-between gap-2 min-h-[88px]'
                  data-testid='panel-readout'
                >
                  <div className='flex items-center justify-between gap-2 flex-wrap'>
                    <div className='flex items-center gap-2'>
                      <span className='px-2 py-0.5 rounded-md bg-orange-100/80 text-orange-900 border border-orange-200/80 font-bold text-xs shadow-2xs'>
                        Khung #{selectedPanel.panelNumber}
                      </span>
                      {selectedPanel.sceneId && (
                        <span className='text-xs text-stone-500 font-medium'>
                          Scene #{selectedPanel.sceneId}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Lưới 2x2 chữ thường dễ đọc */}
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-xs'>
                    <div>
                      <span className='text-stone-500 font-medium'>Vị trí: </span>
                      <span className='text-stone-800 font-medium font-mono'>
                        X {left}%{' '}
                        <span className='text-stone-500 font-normal'>
                          ({px(panelRect.x, pw)}px)
                        </span>{' '}
                        · Y {topM}%{' '}
                        <span className='text-stone-500 font-normal'>
                          ({px(panelRect.y, ph)}px)
                        </span>
                      </span>
                    </div>
                    <div>
                      <span className='text-stone-500 font-medium'>Kích thước: </span>
                      <span className='text-stone-800 font-medium font-mono'>
                        {round1(panelRect.w)}% × {round1(panelRect.h)}%{' '}
                        <span className='text-stone-500 font-normal'>
                          ({px(panelRect.w, pw)} × {px(panelRect.h, ph)}px)
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Dòng lề: Lề trái, phải kèm chip cân giữa/lệch và lề trên, dưới */}
                  <div className='pt-1.5 border-t border-[#E7E7E7] flex items-center justify-between flex-wrap gap-2 text-xs'>
                    <div className='flex items-center gap-1.5 flex-wrap'>
                      <span className='font-mono text-stone-700'>
                        Lề trái {left}% · phải {rightM}%
                      </span>
                      {symmetric ? (
                        <span className='inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium'>
                          <Check className='w-3 h-3 text-emerald-600' /> Cân giữa
                        </span>
                      ) : (
                        <span className='inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-medium'>
                          Lệch {diffM}%
                        </span>
                      )}
                    </div>
                    <div className='font-mono text-stone-700'>
                      Lề trên {topM}% · dưới {bottomM}%
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div
              className='bg-[#FAF8F5]/80 border border-dashed border-[#E7E7E7] rounded-xl p-3 flex items-center justify-center text-xs text-stone-400 min-h-[88px]'
              data-testid='panel-readout'
            >
              <span className='flex items-center gap-2 text-stone-500 font-medium'>
                <MousePointerClick className='w-4 h-4 text-stone-400 shrink-0' />
                Bấm vào một khung để xem vị trí &amp; kích thước
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
