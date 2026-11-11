import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Eye,
  Hash,
  PenTool,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import type { ChapterProgressDto } from '@/services/series.service';

type CellTone =
  'notStarted' | 'inProgress' | 'submitted' | 'inReview' | 'changesRequested' | 'approved';

const CELL_STYLE: Record<CellTone, string> = {
  notStarted: 'text-stone-700 font-semibold',
  inProgress: 'bg-blue-50 text-blue-800 border border-blue-200',
  submitted: 'bg-amber-50 text-amber-800 border border-amber-200',
  inReview: 'bg-amber-100 text-amber-900 border border-amber-300',
  changesRequested: 'bg-rose-50 text-rose-800 border border-rose-300',
  approved: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
};

const COLUMNS: { key: CellTone; label: string; headTone: string }[] = [
  { key: 'notStarted', label: 'Chưa làm', headTone: 'text-stone-600' },
  { key: 'inProgress', label: 'Đang làm', headTone: 'text-blue-800' },
  { key: 'submitted', label: 'Đã nộp', headTone: 'text-amber-800' },
  { key: 'inReview', label: 'Đang duyệt', headTone: 'text-amber-900' },
  { key: 'changesRequested', label: 'Yêu cầu sửa', headTone: 'text-rose-800' },
  { key: 'approved', label: 'Đã duyệt', headTone: 'text-emerald-800' },
];

const CellCount: React.FC<{ count: number; tone: CellTone }> = ({ count, tone }) => {
  if (count === 0) return <span className='text-stone-400 select-none'>0</span>;
  if (tone === 'notStarted') return <span className={CELL_STYLE.notStarted}>{count}</span>;
  return (
    <span
      className={`inline-flex items-center justify-center min-w-6 px-1.5 py-0.5 rounded-md text-xs font-bold ${CELL_STYLE[tone]}`}
    >
      {count}
    </span>
  );
};

const PulseTile: React.FC<{
  label: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  className: string;
}> = ({ label, value, unit, icon, className }) => (
  <div className={`p-2.5 rounded-lg border flex items-center justify-between ${className}`}>
    <div>
      <span className='text-xs block font-medium'>{label}</span>
      <span className='text-lg font-bold font-mono'>
        {value} <span className='text-xs font-normal opacity-80'>{unit}</span>
      </span>
    </div>
    <span aria-hidden='true'>{icon}</span>
  </div>
);

const sumStages = (
  chapter: ChapterProgressDto,
  pick: (s: ChapterProgressDto['stages'][number]) => number,
) => (chapter.stages || []).reduce((sum, st) => sum + (pick(st) || 0), 0);

interface StageMatrixSectionProps {
  chapter: ChapterProgressDto;
  chapters: ChapterProgressDto[];
  onSelectChapter: (chapterId: string) => void;
  onOpenPipeline?: () => void;
}

export const StageMatrixSection: React.FC<StageMatrixSectionProps> = ({
  chapter,
  chapters,
  onSelectChapter,
  onOpenPipeline,
}) => {
  const totalPanels = chapter.panelCount || 0;
  const inProgress = sumStages(chapter, (st) => st.inProgress);
  const inReview = sumStages(chapter, (st) => st.submitted + st.inReview);
  const changes = sumStages(chapter, (st) => st.changesRequested);
  const approved = sumStages(chapter, (st) => st.approved);
  const stages = chapter.stages || [];

  return (
    <section
      aria-label='Ma trận công đoạn'
      className='bg-white border border-stone-200/80 rounded-xl p-5 sm:p-6 shadow-xs space-y-4'
    >
      <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-100 pb-4'>
        <div className='space-y-1.5'>
          <div className='flex items-center gap-2.5 flex-wrap'>
            <h2 className='text-lg font-bold text-stone-900 flex items-center gap-2'>
              <Sliders className='w-4 h-4 text-orange-600' aria-hidden='true' />
              <span>Tiến độ công đoạn · Chương {chapter.chapterNumber}</span>
            </h2>
            {chapters.length > 1 && (
              <div className='flex flex-wrap items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200'>
                {chapters.map((ch) => {
                  const isSelected = ch.chapterId === chapter.chapterId;
                  return (
                    <button
                      key={ch.chapterId}
                      type='button'
                      onClick={() => onSelectChapter(ch.chapterId)}
                      aria-pressed={isSelected}
                      className={`focus-ring min-h-8 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-studio-accent text-white font-semibold'
                          : 'text-stone-700 hover:text-stone-900 hover:bg-white'
                      }`}
                    >
                      Chương {ch.chapterNumber}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <p className='text-xs text-stone-600'>
            {totalPanels === 0
              ? 'Chương hiện chưa có panel phân rã · Các công đoạn sẵn sàng cho phân bổ kịch bản & vẽ'
              : `Bảng đối chiếu trạng thái ${totalPanels} Panel theo từng công đoạn sản xuất`}
          </p>
        </div>

        {onOpenPipeline && (
          <button
            type='button'
            onClick={onOpenPipeline}
            className='btn-cta-primary focus-ring h-9 px-3.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 self-start'
          >
            <ExternalLink className='w-3.5 h-3.5' aria-hidden='true' />
            <span>Mở Pipeline</span>
          </button>
        )}
      </div>

      <div className='grid grid-cols-2 sm:grid-cols-4 gap-2.5'>
        <PulseTile
          label='Tổng Panel'
          value={totalPanels}
          unit='khung'
          icon={<Hash className='w-4 h-4 text-stone-500' />}
          className='bg-stone-50 border-stone-200 text-stone-900'
        />
        <PulseTile
          label='Đang Sản Xuất'
          value={inProgress}
          unit='panel'
          icon={<PenTool className='w-4 h-4 text-blue-700' />}
          className='bg-blue-50/60 border-blue-200 text-blue-900'
        />
        <PulseTile
          label='Chờ Kiểm Duyệt'
          value={inReview}
          unit='panel'
          icon={<Eye className='w-4 h-4 text-amber-700' />}
          className='bg-amber-50/60 border-amber-200 text-amber-900'
        />
        {changes > 0 ? (
          <PulseTile
            label='Yêu Cầu Sửa Đổi'
            value={changes}
            unit='panel'
            icon={<RotateCcw className='w-4 h-4 text-rose-700' />}
            className='bg-rose-50/60 border-rose-200 text-rose-900'
          />
        ) : (
          <PulseTile
            label='Đã Duyệt Đạt Chuẩn'
            value={approved}
            unit='panel'
            icon={<CheckCircle2 className='w-4 h-4 text-emerald-700' />}
            className='bg-emerald-50/60 border-emerald-200 text-emerald-900'
          />
        )}
      </div>

      {totalPanels === 0 && (
        <div className='flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-orange-50/50 border border-orange-200 text-stone-800 text-xs'>
          <span>
            Chương {chapter.chapterNumber} chưa phân rã trang thành Panel. Các cột công đoạn đang ở
            trạng thái chuẩn bị.
          </span>
          {onOpenPipeline && (
            <button
              type='button'
              onClick={onOpenPipeline}
              className='focus-ring shrink-0 min-h-9 px-2 rounded-lg text-xs font-bold text-orange-700 hover:text-orange-800 hover:bg-orange-100 flex items-center gap-1 cursor-pointer'
            >
              <span>Mở Pipeline chia khung</span>
              <ArrowRight className='w-3.5 h-3.5' aria-hidden='true' />
            </button>
          )}
        </div>
      )}

      {stages.length === 0 ? (
        <div className='py-8 text-center text-xs text-stone-600 bg-stone-50 rounded-xl border border-dashed border-stone-300'>
          Chưa có công đoạn nào được thiết lập cho Series này.
        </div>
      ) : (
        <div className='overflow-x-auto rounded-lg border border-stone-200 bg-white'>
          <table className='w-full text-xs text-left border-collapse'>
            <thead>
              <tr className='border-b border-stone-200 bg-stone-50'>
                <th className='py-3 px-3.5 font-semibold text-stone-800'>Công Đoạn</th>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={`py-3 px-2 text-center font-semibold ${col.headTone}`}
                  >
                    {col.label}
                  </th>
                ))}
                <th className='py-3 px-3.5 text-right font-semibold text-stone-800'>Tiến độ</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-stone-100 font-mono tabular-nums'>
              {stages.map((st) => {
                const pct = totalPanels > 0 ? Math.round((st.approved / totalPanels) * 100) : 0;
                return (
                  <tr key={st.stageId} className='hover:bg-orange-50/30 transition-colors'>
                    <td className='py-3 px-3.5 font-sans'>
                      <div className='flex items-center gap-2'>
                        <span className='w-5 h-5 rounded bg-stone-900 text-white text-xs font-mono flex items-center justify-center shrink-0'>
                          {st.stageOrder}
                        </span>
                        <span className='font-medium text-stone-900'>{st.name}</span>
                      </div>
                    </td>
                    {COLUMNS.map((col) => (
                      <td key={col.key} className='py-3 px-2 text-center'>
                        <CellCount count={st[col.key]} tone={col.key} />
                      </td>
                    ))}
                    <td className='py-3 px-3.5 text-right'>
                      {totalPanels === 0 ? (
                        <span className='text-stone-500 italic select-none'>0%</span>
                      ) : (
                        <div className='flex items-center justify-end gap-2.5'>
                          <div className='w-16 bg-stone-100 h-1.5 rounded-full overflow-hidden'>
                            <div
                              className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-studio-accent'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className='text-stone-700 font-medium whitespace-nowrap'>
                            {st.approved}/{totalPanels} ({pct}%)
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
