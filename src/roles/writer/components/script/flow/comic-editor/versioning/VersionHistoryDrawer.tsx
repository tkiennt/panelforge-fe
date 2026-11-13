// src/roles/writer/components/script/flow/comic-editor/versioning/VersionHistoryDrawer.tsx
import React, { useState } from 'react';
import {
  X,
  History,
  GitCompare,
  RotateCcw,
  Eye,
  CheckCircle2,
  Clock,
  User,
  ShieldCheck,
  AlertCircle,
  FileText,
  Lock,
} from 'lucide-react';
import { ScriptVersion } from './types';

interface VersionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  versions: ScriptVersion[];
  currentVersionId: string;
  onViewVersion: (version: ScriptVersion) => void;
  onCompareVersion: (version: ScriptVersion) => void;
  onRestoreVersion: (version: ScriptVersion) => void;
  canRestore?: boolean;
}

export const VersionHistoryDrawer: React.FC<VersionHistoryDrawerProps> = ({
  isOpen,
  onClose,
  versions,
  currentVersionId,
  onViewVersion,
  onCompareVersion,
  onRestoreVersion,
  canRestore = true,
}) => {
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Sắp xếp phiên bản mới nhất ở trên cùng
  const sortedVersions = [...versions].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const getStatusBadge = (version: ScriptVersion) => {
    switch (version.status) {
      case 'APPROVED':
        return (
          <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300'>
            <ShieldCheck className='w-3 h-3 text-emerald-600' />
            Đã duyệt (Khóa)
          </span>
        );
      case 'IN_REVIEW':
        return (
          <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300'>
            <Clock className='w-3 h-3 text-blue-600' />
            Chờ Producer duyệt
          </span>
        );
      case 'DRAFT':
        return (
          <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300'>
            <FileText className='w-3 h-3 text-amber-600' />
            Bản nháp
          </span>
        );
      case 'DEPRECATED':
      default:
        return (
          <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300'>
            Bản cũ
          </span>
        );
    }
  };

  return (
    <div className='fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-2xs flex justify-end animate-in fade-in duration-150'>
      <div className='w-full max-w-lg bg-[#FCFBF8] border-l border-[#D8D2C5] shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200 text-[#1C1917]'>
        {/* DRAWER HEADER */}
        <header className='px-6 py-4 bg-white border-b border-[#EBE7DF] flex items-center justify-between shrink-0'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-[#C2410C]'>
              <History className='w-5 h-5' />
            </div>
            <div>
              <h2 className='text-base font-bold text-slate-900'>Lịch sử phiên bản kịch bản</h2>
              <p className='text-xs text-slate-500'>
                Lịch sử các mốc lưu và tiến trình phê duyệt kịch bản (v1.0 → v2.0)
              </p>
            </div>
          </div>

          <button
            type='button'
            onClick={onClose}
            className='p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer'
          >
            <X className='w-5 h-5' />
          </button>
        </header>

        {/* VERSION LIST */}
        <div className='flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#F3F0E9]'>
          {sortedVersions.length === 0 ? (
            <div className='text-center py-12 text-slate-400'>
              <History className='w-12 h-12 mx-auto mb-2 opacity-50' />
              <p>Chưa có phiên bản nào được ghi nhận.</p>
            </div>
          ) : (
            sortedVersions.map((version) => {
              const isCurrent = version.id === currentVersionId;
              const isConfirming = confirmRestoreId === version.id;

              return (
                <div
                  key={version.id}
                  className={`bg-white rounded-xl border p-4 transition-all shadow-sm flex flex-col gap-3 ${
                    isCurrent
                      ? 'border-[#C2410C] ring-2 ring-[#C2410C]/20'
                      : 'border-[#E5E0D8] hover:border-slate-300'
                  }`}
                >
                  {/* Top card info */}
                  <div className='flex items-start justify-between gap-2'>
                    <div className='flex items-center gap-2'>
                      <span className='text-base font-black font-mono text-slate-900'>
                        v{version.versionNumber}
                      </span>
                      {getStatusBadge(version)}
                      {isCurrent && (
                        <span className='text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-[#C2410C] border border-[#C2410C]/30 px-1.5 py-0.5 rounded'>
                          Đang mở
                        </span>
                      )}
                    </div>
                    <span className='text-xs text-slate-400 font-mono'>
                      {new Date(version.createdAt).toLocaleString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Authors & Lock status */}
                  <div className='flex items-center gap-3 text-xs text-slate-500 flex-wrap'>
                    <div className='flex items-center gap-1'>
                      <User className='w-3.5 h-3.5 text-slate-400' />
                      <span>Tác giả: {version.createdBy || 'Biên kịch'}</span>
                    </div>
                    {version.approvedBy && (
                      <div className='flex items-center gap-1 text-emerald-700'>
                        <ShieldCheck className='w-3.5 h-3.5' />
                        <span>Duyệt bởi: {version.approvedBy}</span>
                      </div>
                    )}
                    {version.isLocked && (
                      <div className='flex items-center gap-1 text-slate-600 font-medium'>
                        <Lock className='w-3 h-3' />
                        <span>Đã khóa sản xuất</span>
                      </div>
                    )}
                  </div>

                  {/* Feedback / Changelog */}
                  {version.changeLog && (
                    <div className='bg-[#FFF9F3] border border-[#FDBA74]/50 rounded-lg p-2.5 text-xs text-amber-950 flex items-start gap-2'>
                      <AlertCircle className='w-4 h-4 text-amber-600 shrink-0 mt-0.5' />
                      <div className='flex-1'>
                        <span className='font-bold text-amber-900'>Ghi chú phản hồi: </span>
                        <span>{version.changeLog}</span>
                      </div>
                    </div>
                  )}

                  {/* Preview lines count */}
                  <div className='text-[11px] text-slate-400 font-mono'>
                    Độ dài kịch bản: {version.rawText.length} ký tự ·{' '}
                    {version.rawText.split('\n').filter(Boolean).length} dòng
                  </div>

                  {/* Actions */}
                  <div className='pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap'>
                    <div className='flex items-center gap-2'>
                      {/* Xem bản này */}
                      <button
                        type='button'
                        onClick={() => onViewVersion(version)}
                        className='inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer'
                        title='Xem nội dung chi tiết của bản ghi này'
                      >
                        <Eye className='w-3.5 h-3.5' />
                        <span>Xem bản này</span>
                      </button>

                      {/* So sánh với bản hiện tại */}
                      {!isCurrent && (
                        <button
                          type='button'
                          onClick={() => onCompareVersion(version)}
                          className='inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer'
                          title='So sánh khác biệt với bản kịch bản hiện tại'
                        >
                          <GitCompare className='w-3.5 h-3.5' />
                          <span>So sánh (Diff)</span>
                        </button>
                      )}
                    </div>

                    {/* Khôi phục bản này */}
                    {!isCurrent && canRestore && (
                      <div>
                        {isConfirming ? (
                          <div className='flex items-center gap-1 animate-in fade-in'>
                            <button
                              type='button'
                              onClick={() => {
                                onRestoreVersion(version);
                                setConfirmRestoreId(null);
                              }}
                              className='px-2 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-md cursor-pointer'
                            >
                              Xác nhận nạp lại
                            </button>
                            <button
                              type='button'
                              onClick={() => setConfirmRestoreId(null)}
                              className='px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-md cursor-pointer'
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            type='button'
                            onClick={() => setConfirmRestoreId(version.id)}
                            className='inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer'
                            title='Khôi phục nội dung kịch bản từ phiên bản này'
                          >
                            <RotateCcw className='w-3.5 h-3.5' />
                            <span>Khôi phục bản này</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DRAWER FOOTER */}
        <footer className='px-6 py-3 bg-white border-t border-[#EBE7DF] text-xs text-slate-500 flex items-center justify-between shrink-0'>
          <span>{versions.length} phiên bản đã lưu trữ</span>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 cursor-pointer shadow-xs'
          >
            Đóng
          </button>
        </footer>
      </div>
    </div>
  );
};
