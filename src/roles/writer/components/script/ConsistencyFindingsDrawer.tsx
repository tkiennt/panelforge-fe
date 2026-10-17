import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  X,
  RefreshCw,
  Info,
  ArrowRight,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { ConsistencyFindingDto } from '@/services/assignment.service';

interface ConsistencyFindingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  findings: ConsistencyFindingDto[];
  loadingConsistency: boolean;
  onRunCheck: () => Promise<void>;
  onScrollToLine: (scriptLineId?: string | null) => Promise<void>;
  disabledCheck?: boolean;
}

export const ConsistencyFindingsDrawer: React.FC<ConsistencyFindingsDrawerProps> = ({
  isOpen,
  onClose,
  findings,
  loadingConsistency,
  onRunCheck,
  onScrollToLine,
  disabledCheck = false,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'open' | 'stale'>('all');

  if (!isOpen) return null;

  const openFindings = findings.filter(
    (f) => f.status === 'Open' || f.status === 'NeedsClarification',
  );
  const staleFindings = findings.filter((f) => f.status === 'Stale');
  const blockingCount = findings.filter(
    (f) => f.severity === 'Blocking' && (f.status === 'Open' || f.status === 'NeedsClarification'),
  ).length;

  const displayedFindings = findings.filter((f) => {
    if (filterTab === 'open') return f.status === 'Open' || f.status === 'NeedsClarification';
    if (filterTab === 'stale') return f.status === 'Stale';
    return true;
  });

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'Blocking':
        return {
          label: 'Lỗi chặn',
          badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
        };
      case 'Warning':
        return {
          label: 'Cảnh báo',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
        };
      default:
        return {
          label: 'Thông tin',
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 font-bold',
        };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Open':
        return 'Đang mở';
      case 'NeedsClarification':
        return 'Cần làm rõ';
      case 'Stale':
        return 'Đã cũ (Stale)';
      case 'Resolved':
        return 'Đã giải quyết';
      case 'Ignored':
        return 'Đã bỏ qua';
      default:
        return status;
    }
  };

  return (
    <div
      data-testid='consistency-findings-panel'
      className='w-full xl:w-[460px] 2xl:w-[500px] shrink-0 border-l border-[#E5DFD7] bg-white flex flex-col h-full shadow-lg z-20 animate-in slide-in-from-right duration-200'
    >
      {/* Drawer Header */}
      <div className='p-4 border-b border-[#E5DFD7] bg-[#FAF8F5] flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2.5 min-w-0'>
          <div className='p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0'>
            <AlertTriangle className='w-4 h-4' />
          </div>
          <div className='min-w-0'>
            <div className='flex items-center gap-2 flex-wrap'>
              <h3 className='text-sm font-bold text-zinc-900 truncate font-serif'>
                Vấn đề nhất quán ({findings.length})
              </h3>
              {blockingCount > 0 && (
                <span className='px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-mono text-xs font-bold animate-pulse'>
                  {blockingCount} lỗi chặn
                </span>
              )}
            </div>
            <p className='text-xs text-zinc-500 truncate'>
              {openFindings.length} cần xử lý · {staleFindings.length} đã cũ
            </p>
          </div>
        </div>

        <div className='flex items-center gap-1.5 shrink-0'>
          {/* Re-run button */}
          <button
            type='button'
            onClick={onRunCheck}
            disabled={loadingConsistency || disabledCheck}
            className='p-1.5 text-orange-700 hover:bg-orange-50 rounded-lg cursor-pointer transition-colors disabled:opacity-40'
            title='Chạy lại kiểm tra nhất quán'
          >
            <RefreshCw className={`w-4 h-4 ${loadingConsistency ? 'animate-spin' : ''}`} />
          </button>
          {/* Close button */}
          <button
            type='button'
            onClick={onClose}
            className='p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 rounded-lg cursor-pointer transition-colors'
            title='Đóng bảng cảnh báo'
          >
            <X className='w-4 h-4' />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className='px-4 pt-3 pb-2 border-b border-zinc-100 flex items-center justify-between gap-2 bg-zinc-50/50'>
        <div className='flex items-center p-1 bg-zinc-200/70 rounded-xl text-xs font-semibold'>
          <button
            type='button'
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterTab === 'all'
                ? 'bg-white text-zinc-900 shadow-xs font-bold'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Tất cả ({findings.length})
          </button>
          <button
            type='button'
            onClick={() => setFilterTab('open')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'open'
                ? 'bg-white text-rose-900 shadow-xs font-bold'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <span>Cần xử lý ({openFindings.length})</span>
          </button>
          <button
            type='button'
            onClick={() => setFilterTab('stale')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterTab === 'stale'
                ? 'bg-white text-zinc-900 shadow-xs font-bold'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Đã cũ ({staleFindings.length})
          </button>
        </div>

        <span className='text-xs text-zinc-500 hidden sm:inline'>
          Bấm &ldquo;Xem dòng&rdquo; để cuộn tới vị trí
        </span>
      </div>

      {/* Findings List */}
      <div className='flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#FAF8F5]/30'>
        {displayedFindings.length === 0 ? (
          <div className='p-8 text-center text-zinc-400 border border-dashed border-zinc-200 rounded-2xl bg-white'>
            <CheckCircle2 className='w-8 h-8 text-emerald-500 mx-auto mb-2' />
            <p className='text-xs font-semibold text-zinc-700'>
              {filterTab === 'open'
                ? 'Không có vấn đề nào cần xử lý!'
                : 'Chưa phát hiện vấn đề nhất quán nào.'}
            </p>
            <p className='text-xs text-zinc-500 mt-1'>
              Kịch bản đồng bộ hoàn toàn với dữ liệu Series Bible.
            </p>
          </div>
        ) : (
          displayedFindings.map((f) => {
            const sevInfo = getSeverityBadge(f.severity);
            return (
              <div
                key={f.id}
                data-testid={`finding-card-${f.id}`}
                onClick={() => onScrollToLine(f.scriptLineId)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-xs space-y-2.5 ${
                  f.severity === 'Blocking'
                    ? 'bg-rose-50/70 border-rose-200 hover:border-rose-300 text-rose-950'
                    : f.severity === 'Warning'
                      ? 'bg-amber-50/70 border-amber-200 hover:border-amber-300 text-amber-950'
                      : 'bg-blue-50/70 border-blue-200 hover:border-blue-300 text-blue-950'
                }`}
              >
                {/* Meta row */}
                <div className='flex items-center justify-between gap-2 flex-wrap'>
                  <div className='flex items-center gap-1.5 flex-wrap'>
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${sevInfo.badgeClass}`}
                    >
                      {sevInfo.label}
                    </span>
                    <span className='font-mono text-xs px-2 py-0.5 rounded-md bg-black/5 text-zinc-700 font-semibold'>
                      {f.ruleCode}
                    </span>
                  </div>

                  <span className='text-xs text-zinc-500 font-medium'>
                    Trạng thái: <strong>{getStatusLabel(f.status)}</strong>
                  </span>
                </div>

                {/* Message */}
                <p className='text-xs md:text-sm font-semibold text-zinc-900 leading-snug break-words'>
                  {f.message}
                </p>

                {/* Evidence */}
                {f.evidence && (
                  <p className='font-mono text-xs bg-white/90 p-2.5 rounded-xl border border-black/5 text-zinc-700 leading-relaxed break-words'>
                    Bằng chứng: &ldquo;{f.evidence}&rdquo;
                  </p>
                )}

                {/* Action footer */}
                <div className='flex items-center justify-between pt-1'>
                  <span className='text-xs text-zinc-500 font-mono'>
                    {f.scriptLineId ? `Dòng #${f.scriptLineId.slice(0, 8)}` : 'Cấp chương'}
                  </span>
                  {f.scriptLineId && (
                    <button
                      type='button'
                      onClick={(e) => {
                        e.stopPropagation();
                        void onScrollToLine(f.scriptLineId);
                      }}
                      className='inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-orange-800 bg-orange-100 hover:bg-orange-200 rounded-lg transition-colors cursor-pointer'
                    >
                      <span>Xem dòng</span>
                      <ArrowRight className='w-3 h-3' />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
