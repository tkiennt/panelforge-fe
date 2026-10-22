import React, { useState, useMemo } from 'react';
import { TrendingUp, Info, ChevronRight, Calendar } from 'lucide-react';
import type { BurndownPointDto } from '@/services/series.service';

export interface SeriesBurndownCardProps {
  burndown?: BurndownPointDto[] | null;
  loading?: boolean;
}

/**
 * Thuật toán tính thang đo nguyên (Integer Ticks) cho trục Y:
 * Bắt đầu từ 0, không có số lẻ, không có tick trùng, tối đa 4-5 mốc.
 */
function getNiceYScale(maxVal: number): { scaleMax: number; ticks: number[] } {
  if (maxVal <= 0) {
    return { scaleMax: 4, ticks: [0, 2, 4] };
  }
  if (maxVal === 1) {
    return { scaleMax: 1, ticks: [0, 1] };
  }
  if (maxVal === 2) {
    return { scaleMax: 2, ticks: [0, 1, 2] };
  }
  if (maxVal === 3) {
    return { scaleMax: 3, ticks: [0, 1, 2, 3] };
  }
  if (maxVal === 4) {
    return { scaleMax: 4, ticks: [0, 2, 4] };
  }

  // Với số lớn hơn, tìm bước nhảy đẹp (nice step: 2, 5, 10, 20, 25...)
  const roughStep = maxVal / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;

  let step: number;
  if (normalized <= 1) step = 1 * magnitude;
  else if (normalized <= 2) step = 2 * magnitude;
  else if (normalized <= 5) step = 5 * magnitude;
  else step = 10 * magnitude;

  step = Math.max(1, Math.round(step));

  const ticks: number[] = [0];
  let current = 0;
  while (current < maxVal) {
    current += step;
    ticks.push(current);
  }

  return { scaleMax: current, ticks };
}

/** Format YYYY-MM-DD sang DD/MM */
function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

/** Format YYYY-MM-DD sang DD/MM/YYYY */
function formatFullDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/** Kiểm tra xem chuỗi ngày có trùng với hôm nay (UTC hoặc Local) không */
function checkIsToday(dateStr: string): boolean {
  if (!dateStr) return false;
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const localToday = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const utcToday = now.toISOString().slice(0, 10);
  return dateStr === localToday || dateStr === utcToday;
}

export const SeriesBurndownCard: React.FC<SeriesBurndownCardProps> = ({
  burndown,
  loading = false,
}) => {
  const [timeframe, setTimeframe] = useState<'all' | '30d' | '7d'>('all');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Sắp xếp dữ liệu ngày tăng dần
  const sortedRawList = useMemo(() => {
    if (!burndown || burndown.length === 0) return [];
    return [...burndown].sort((a, b) => a.date.localeCompare(b.date));
  }, [burndown]);

  // Áp dụng bộ lọc thời gian
  const filteredList = useMemo(() => {
    if (sortedRawList.length === 0) return [];
    if (timeframe === '7d') return sortedRawList.slice(-7);
    if (timeframe === '30d') return sortedRawList.slice(-30);
    return sortedRawList;
  }, [sortedRawList, timeframe]);

  // Thống kê đầu kỳ, cuối kỳ, biến động
  const stats = useMemo(() => {
    if (filteredList.length === 0) return null;
    const startVal = filteredList[0].remaining;
    const endVal = filteredList[filteredList.length - 1].remaining;
    const netChange = endVal - startVal; // âm = giảm việc, dương = tăng việc
    return {
      startVal,
      endVal,
      netChange,
      startDate: filteredList[0].date,
      endDate: filteredList[filteredList.length - 1].date,
      isSinglePoint: filteredList.length === 1,
      isAllZero: filteredList.every((p) => p.remaining === 0),
    };
  }, [filteredList]);

  // Kích thước chuẩn cho SVG viewBox
  const width = 640;
  const height = 230;
  const padLeft = 46;
  const padRight = 24;
  const padTop = 22;
  const padBottom = 32;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // Tính toán tọa độ và đường vẽ
  const chartModel = useMemo(() => {
    if (filteredList.length === 0) return null;

    const maxVal = Math.max(...filteredList.map((p) => p.remaining), 0);
    const { scaleMax, ticks } = getNiceYScale(maxVal);

    const points = filteredList.map((item, idx) => {
      const x =
        filteredList.length === 1
          ? padLeft + plotW / 2
          : padLeft + (idx / (filteredList.length - 1)) * plotW;
      const y = padTop + (1 - item.remaining / scaleMax) * plotH;
      return { x, y, ...item };
    });

    const pathD = points.reduce((acc, pt, idx) => {
      return idx === 0
        ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`
        : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    }, '');

    const areaD =
      points.length > 0
        ? `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${padTop + plotH} L ${points[0].x.toFixed(1)} ${
            padTop + plotH
          } Z`
        : '';

    // Lựa chọn các nhãn cho trục X (4-5 nhãn phân bố đều)
    const xLabels: { x: number; text: string; isToday: boolean }[] = [];
    if (points.length === 1) {
      xLabels.push({
        x: points[0].x,
        text: checkIsToday(points[0].date) ? 'Hôm nay' : formatShortDate(points[0].date),
        isToday: checkIsToday(points[0].date),
      });
    } else {
      const stepIdx = Math.max(1, Math.floor((points.length - 1) / 3));
      const chosenIndices = new Set<number>();
      chosenIndices.add(0);
      for (let i = stepIdx; i < points.length - 1; i += stepIdx) {
        chosenIndices.add(i);
      }
      chosenIndices.add(points.length - 1);

      Array.from(chosenIndices)
        .sort((a, b) => a - b)
        .forEach((idx) => {
          const pt = points[idx];
          const isLast = idx === points.length - 1;
          const isToday = isLast && checkIsToday(pt.date);
          xLabels.push({
            x: pt.x,
            text: isToday ? 'Hôm nay' : formatShortDate(pt.date),
            isToday,
          });
        });
    }

    return {
      points,
      pathD,
      areaD,
      scaleMax,
      ticks,
      xLabels,
    };
  }, [filteredList, plotW, plotH, padLeft, padTop]);

  // Loading skeleton
  if (loading) {
    return (
      <div className='bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4'>
        <div className='animate-pulse space-y-3'>
          <div className='h-4 bg-zinc-200 rounded w-1/3' />
          <div className='h-3 bg-zinc-100 rounded w-1/2' />
          <div className='h-60 bg-zinc-50 rounded-xl mt-4 border border-zinc-200' />
        </div>
      </div>
    );
  }

  const latestPoint = sortedRawList.length > 0 ? sortedRawList[sortedRawList.length - 1] : null;
  const isLatestToday = latestPoint ? checkIsToday(latestPoint.date) : false;

  return (
    <div className='bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 font-sans text-zinc-700'>
      {/* 1. Header & Quick Summary */}
      <div className='flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-zinc-100 pb-3'>
        <div className='space-y-0.5'>
          <h2 className='text-sm font-bold text-zinc-900 flex items-center gap-2'>
            <TrendingUp className='w-4 h-4 text-[#F97316]' />
            <span>Công việc còn lại theo thời gian</span>
            <span className='text-xs font-normal text-zinc-500'>(Biểu Đồ Burndown)</span>
          </h2>
          <p className='text-xs text-zinc-500'>Toàn bộ bộ truyện · Số công việc chưa hoàn tất</p>
        </div>

        <div className='flex items-center gap-2.5 flex-wrap sm:flex-nowrap'>
          {/* Timeframe pill selector */}
          {sortedRawList.length > 7 && (
            <div className='inline-flex p-0.5 bg-zinc-100 rounded-lg text-xs font-medium border border-zinc-200'>
              {(['all', '30d', '7d'] as const).map((mode) => (
                <button
                  key={mode}
                  type='button'
                  onClick={() => setTimeframe(mode)}
                  className={`px-2 py-0.5 rounded-md text-[11px] transition-colors cursor-pointer ${
                    timeframe === mode
                      ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  {mode === 'all' ? 'Tất cả' : mode === '30d' ? '30 ngày' : '7 ngày'}
                </button>
              ))}
            </div>
          )}

          {/* Badge Số còn lại */}
          <span
            className='px-2.5 py-1 rounded-md bg-orange-50 text-[#C2410C] border border-orange-200 text-xs font-medium shrink-0 flex items-center gap-1.5'
            title='Số lượng nhiệm vụ chưa được Approved'
          >
            <span className='font-bold'>
              Còn: {latestPoint ? `${latestPoint.remaining} việc` : '—'}
            </span>
            {latestPoint && !isLatestToday && (
              <span className='text-[10px] text-[#EA580C] font-normal'>
                (Đến {formatShortDate(latestPoint.date)})
              </span>
            )}
          </span>
        </div>
      </div>

      {/* 2. Dòng tóm tắt biến động (Summary row) */}
      {stats && (
        <div className='grid grid-cols-3 gap-2 py-2 px-3 bg-zinc-50/70 rounded-xl border border-zinc-200 text-xs text-center'>
          <div>
            <span className='text-zinc-500 block text-[11px]'>
              Đầu kỳ ({formatShortDate(stats.startDate)})
            </span>
            <span className='font-bold text-zinc-900 text-xs'>{stats.startVal} việc</span>
          </div>
          <div>
            <span className='text-zinc-500 block text-[11px]'>
              Cuối kỳ ({formatShortDate(stats.endDate)})
            </span>
            <span className='font-bold text-zinc-900 text-xs'>{stats.endVal} việc</span>
          </div>
          <div>
            <span className='text-zinc-500 block text-[11px]'>Thay đổi ròng</span>
            {stats.isSinglePoint ? (
              <span className='font-medium text-zinc-500 text-xs'>Khởi tạo</span>
            ) : stats.netChange < 0 ? (
              <span className='font-bold text-emerald-700 text-xs'>
                Giảm {Math.abs(stats.netChange)} việc
              </span>
            ) : stats.netChange > 0 ? (
              <span className='font-bold text-amber-700 text-xs'>Tăng {stats.netChange} việc</span>
            ) : (
              <span className='font-bold text-zinc-500 text-xs'>Không đổi</span>
            )}
          </div>
        </div>
      )}

      {/* 3. Vùng biểu đồ (Chart area) */}
      {!chartModel || filteredList.length === 0 ? (
        <div className='py-12 text-center text-xs text-zinc-500 bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200 space-y-2 p-6'>
          <div className='w-10 h-10 rounded-full bg-orange-50 text-[#F97316] flex items-center justify-center mx-auto'>
            <Calendar className='w-5 h-5' />
          </div>
          <p className='font-semibold text-zinc-900 text-xs'>
            Chưa có dữ liệu lịch sử trong khoảng thời gian này
          </p>
          <p className='text-xs text-zinc-500 max-w-sm mx-auto'>
            Khi các nhiệm vụ được tạo và duyệt hoàn tất trong Series, tiến trình sẽ được ghi nhận
            hàng ngày.
          </p>
        </div>
      ) : (
        <div className='space-y-2'>
          <div className='relative w-full h-[230px] sm:h-[260px] bg-zinc-50/50 rounded-xl border border-zinc-200 p-2 overflow-hidden select-none'>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className='w-full h-full text-xs'
              aria-label='Biểu đồ công việc còn lại theo thời gian'
            >
              <defs>
                <linearGradient id='burndownGradientWarm' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor='#F97316' stopOpacity='0.12' />
                  <stop offset='100%' stopColor='#F97316' stopOpacity='0.0' />
                </linearGradient>
              </defs>

              {/* Trục Y: Đơn vị nhãn */}
              <text x='10' y='14' fill='#57534E' fontSize='10' fontWeight='500'>
                (Việc)
              </text>

              {/* Horizontal Gridlines & Y-axis Ticks */}
              {chartModel.ticks.map((val) => {
                const y = padTop + (1 - val / chartModel.scaleMax) * plotH;
                return (
                  <g key={val}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={width - padRight}
                      y2={y}
                      stroke='#EAE5DC'
                      strokeDasharray='3 3'
                      strokeWidth='1'
                    />
                    <text x={padLeft - 8} y={y + 3.5} fill='#57534E' fontSize='11' textAnchor='end'>
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Area gradient fill */}
              {chartModel.areaD && chartModel.scaleMax > 0 && (
                <path d={chartModel.areaD} fill='url(#burndownGradientWarm)' />
              )}

              {/* Trendline: đường thẳng giữa các điểm thật, không làm cong sai lệch */}
              {chartModel.pathD && (
                <path
                  d={chartModel.pathD}
                  fill='none'
                  stroke='#F97316'
                  strokeWidth='2.25'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              )}

              {/* Data points (Markers) */}
              {chartModel.points.map((pt, idx) => {
                const isHovered = hoveredIndex === idx;
                const isLast = idx === chartModel.points.length - 1;
                const r = isHovered ? 6 : isLast ? 4.5 : 3;

                return (
                  <circle
                    key={pt.date + idx}
                    cx={pt.x}
                    cy={pt.y}
                    r={r}
                    fill={isHovered ? '#C2410C' : isLast ? '#EA580C' : '#F97316'}
                    stroke='#FCFBF8'
                    strokeWidth={isHovered ? '2' : '1.5'}
                    className='transition-all duration-150 cursor-pointer focus:outline-none'
                    tabIndex={0}
                    role='button'
                    aria-label={`Ngày ${formatFullDate(pt.date)}: ${pt.remaining} việc còn lại`}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onFocus={() => setHoveredIndex(idx)}
                    onBlur={() => setHoveredIndex(null)}
                  />
                );
              })}

              {/* X-axis labels */}
              {chartModel.xLabels.map((lbl, idx) => (
                <text
                  key={idx}
                  x={lbl.x}
                  y={height - padBottom + 16}
                  fill={lbl.isToday ? '#EA580C' : '#57534E'}
                  fontWeight={lbl.isToday ? '600' : '400'}
                  fontSize='11'
                  textAnchor='middle'
                >
                  {lbl.text}
                </text>
              ))}
            </svg>

            {/* Interactive Tooltip Card */}
            {hoveredIndex !== null &&
              chartModel.points[hoveredIndex] &&
              (() => {
                const pt = chartModel.points[hoveredIndex];
                const prevPt = hoveredIndex > 0 ? chartModel.points[hoveredIndex - 1] : null;
                const diff = prevPt ? pt.remaining - prevPt.remaining : null;
                const leftPercent = (pt.x / width) * 100;
                const isRightSide = leftPercent > 65;

                return (
                  <div
                    className='absolute z-20 pointer-events-none transition-all duration-150 shadow-md bg-[#1C1917] text-[#FCFBF8] rounded-lg p-2.5 text-xs space-y-1'
                    style={{
                      left: `${Math.min(Math.max(12, leftPercent), 88)}%`,
                      top: `${Math.max(10, Math.min(pt.y - 10, height - 70))}px`,
                      transform: isRightSide ? 'translate(-100%, -50%)' : 'translate(0, -50%)',
                    }}
                  >
                    <div className='font-semibold text-[#FAF8F5] border-b border-stone-700 pb-1 flex items-center justify-between gap-3'>
                      <span>{formatFullDate(pt.date)}</span>
                      {checkIsToday(pt.date) && (
                        <span className='px-1 py-0.2 rounded bg-orange-500/30 text-orange-300 text-[10px]'>
                          Hôm nay
                        </span>
                      )}
                    </div>
                    <div className='flex items-center justify-between gap-3 pt-0.5'>
                      <span className='text-stone-400'>Còn lại:</span>
                      <span className='font-bold text-orange-300'>{pt.remaining} việc</span>
                    </div>
                    {diff !== null && (
                      <div className='flex items-center justify-between gap-3 text-[11px] text-stone-300'>
                        <span className='text-stone-400'>So mốc trước:</span>
                        <span
                          className={
                            diff < 0
                              ? 'text-emerald-400 font-medium'
                              : diff > 0
                                ? 'text-amber-400 font-medium'
                                : 'text-stone-400'
                          }
                        >
                          {diff < 0
                            ? `↓ Giảm ${Math.abs(diff)}`
                            : diff > 0
                              ? `↑ Tăng ${diff}`
                              : 'Không đổi'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
          </div>

          {/* Trường hợp đặc biệt: Tất cả giá trị bằng 0 */}
          {stats?.isAllZero && (
            <p className='text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-lg text-center'>
              Tất cả các công việc trong giai đoạn này đã được hoàn tất phê duyệt (0 việc tồn đọng).
            </p>
          )}

          {/* Trường hợp đặc biệt: Chỉ có 1 mốc dữ liệu */}
          {stats?.isSinglePoint && (
            <p className='text-xs text-[#57534E] text-center italic'>
              Chỉ có 1 mốc dữ liệu ghi nhận ({formatShortDate(stats.startDate)}). Cần thêm thời gian
              sản xuất để hiển thị đường xu hướng hoàn chỉnh.
            </p>
          )}
        </div>
      )}

      {/* 4. Ghi chú minh bạch về định nghĩa dữ liệu (Chống hiểu lầm) */}
      <div className='text-[11px] text-[#57534E] bg-[#FAF8F5] p-3 rounded-lg border border-[#D8D2C5] space-y-1.5'>
        <div className='flex items-start gap-1.5'>
          <Info className='w-3.5 h-3.5 text-[#F97316] mt-0.5 shrink-0' />
          <div className='space-y-0.5'>
            <p className='text-[#1C1917]'>
              <strong>Định nghĩa số liệu:</strong> Số việc còn lại = Tổng nhiệm vụ được tạo trừ đi
              nhiệm vụ đã được duyệt (Approved) tính đến cuối mỗi ngày (UTC).
            </p>
            <p className='text-[#57534E] text-[10px] leading-relaxed'>
              Số công việc có thể tăng khi giao việc mới hoặc mở lại việc cần sửa. Khối phân công
              bên cạnh phản ánh số việc thành viên đang phụ trách trực tiếp.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Khả năng truy cập: Xem dữ liệu chi tiết dạng bảng thu gọn */}
      {filteredList.length > 0 && (
        <details className='border-t border-[#D8D2C5] pt-2 text-xs group'>
          <summary className='cursor-pointer text-[#57534E] hover:text-[#1C1917] flex items-center gap-1.5 font-medium py-1 select-none focus:outline-none focus:ring-1 focus:ring-orange-500 rounded'>
            <ChevronRight className='w-3.5 h-3.5 transition-transform group-open:rotate-90 text-stone-400' />
            <span>Xem dữ liệu chi tiết ({filteredList.length} mốc ghi nhận)</span>
          </summary>
          <div className='mt-2 max-h-44 overflow-y-auto border border-[#D8D2C5] rounded-lg'>
            <table className='w-full text-left text-xs'>
              <thead className='bg-[#FAF8F5] text-[#57534E] border-b border-[#D8D2C5] sticky top-0'>
                <tr>
                  <th className='py-1.5 px-3 font-semibold'>Ngày (UTC)</th>
                  <th className='py-1.5 px-3 font-semibold text-right'>Việc còn lại</th>
                  <th className='py-1.5 px-3 font-semibold text-right'>Trạng thái</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-[#EAE5DC] bg-[#FCFBF8] tabular-nums'>
                {filteredList.map((pt, idx) => (
                  <tr key={pt.date + idx} className='hover:bg-stone-50/60'>
                    <td className='py-1.5 px-3 text-stone-700'>
                      {formatFullDate(pt.date)} {checkIsToday(pt.date) ? '(Hôm nay)' : ''}
                    </td>
                    <td className='py-1.5 px-3 font-bold text-stone-900 text-right'>
                      {pt.remaining} việc
                    </td>
                    <td className='py-1.5 px-3 text-right'>
                      {idx === 0 ? (
                        <span className='text-stone-400 text-[11px]'>Đầu kỳ</span>
                      ) : (
                        (() => {
                          const diff = pt.remaining - filteredList[idx - 1].remaining;
                          if (diff < 0)
                            return (
                              <span className='text-emerald-600 font-medium text-[11px]'>
                                Giảm {Math.abs(diff)}
                              </span>
                            );
                          if (diff > 0)
                            return (
                              <span className='text-amber-600 font-medium text-[11px]'>
                                Tăng {diff}
                              </span>
                            );
                          return <span className='text-stone-400 text-[11px]'>—</span>;
                        })()
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
};
