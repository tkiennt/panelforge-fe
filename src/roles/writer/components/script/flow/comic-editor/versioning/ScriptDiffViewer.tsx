// src/roles/writer/components/script/flow/comic-editor/versioning/ScriptDiffViewer.tsx
import React, { useMemo, useState } from 'react';
import {
  X,
  GitCompare,
  Columns,
  ListFilter,
  PlusCircle,
  MinusCircle,
  HelpCircle,
  ArrowRight,
  Camera,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { ScriptVersion } from './types';
import { computeScriptDiff } from './scriptDiffEngine';

interface ScriptDiffViewerProps {
  baseVersion: ScriptVersion;
  compareVersion: ScriptVersion;
  allVersions?: ScriptVersion[];
  onSelectBaseVersion?: (versionId: string) => void;
  onSelectCompareVersion?: (versionId: string) => void;
  onClose: () => void;
}

export const ScriptDiffViewer: React.FC<ScriptDiffViewerProps> = ({
  baseVersion,
  compareVersion,
  allVersions = [],
  onSelectBaseVersion,
  onSelectCompareVersion,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');

  const diffResult = useMemo(() => {
    return computeScriptDiff(baseVersion.rawText, compareVersion.rawText);
  }, [baseVersion.rawText, compareVersion.rawText]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden text-[#1C1917]">
        {/* HEADER */}
        <header className="px-6 py-4 bg-white border-b border-[#EBE7DF] flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-[#C2410C]">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  So sánh khác biệt (Script Diff)
                </h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  v{baseVersion.versionNumber} → v{compareVersion.versionNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Đối chiếu chi tiết thay đổi góc máy, phân cảnh, thoại và hiệu ứng âm thanh
              </p>
            </div>
          </div>

          {/* ACTIONS & VIEW SWITCHER */}
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#F3F0E9] p-1 rounded-xl border border-[#E5E0D8]">
              <button
                type="button"
                onClick={() => setViewMode('unified')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'unified'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Thống nhất</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'split'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Song song</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* METRICS & VERSION SELECTOR TOOLBAR */}
        <div className="px-6 py-2.5 bg-[#FAF8F5] border-b border-[#EBE7DF] flex flex-wrap items-center justify-between gap-4 text-xs shrink-0">
          {/* Dropdowns chọn phiên bản so sánh */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 font-medium">Bản gốc:</span>
            <select
              value={baseVersion.id}
              onChange={(e) => onSelectBaseVersion?.(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-2xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
            >
              {allVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.versionNumber} ({v.status}) - {new Date(v.createdAt).toLocaleTimeString()}
                </option>
              ))}
            </select>

            <ArrowRight className="w-4 h-4 text-slate-400" />

            <span className="text-slate-500 font-medium">Bản so sánh:</span>
            <select
              value={compareVersion.id}
              onChange={(e) => onSelectCompareVersion?.(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-2xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
            >
              {allVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.versionNumber} ({v.status}) - {new Date(v.createdAt).toLocaleTimeString()}
                </option>
              ))}
            </select>
          </div>

          {/* Metrics summary */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              <PlusCircle className="w-3.5 h-3.5" />+{diffResult.addedCount} thêm mới
            </span>
            <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
              <MinusCircle className="w-3.5 h-3.5" />-{diffResult.removedCount} đã xóa
            </span>
            {diffResult.modifiedCount > 0 && (
              <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-full">
                <Sparkles className="w-3.5 h-3.5" />~{diffResult.modifiedCount} góc máy/thoại sửa đổi
              </span>
            )}
          </div>
        </div>

        {/* DIFF CONTENT DISPLAY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F3F0E9] font-mono text-xs">
          {viewMode === 'unified' ? (
            /* UNIFIED VIEW */
            <div className="bg-white rounded-xl border border-[#D8D2C5] shadow-sm divide-y divide-slate-100 overflow-hidden">
              {diffResult.lines.map((line, idx) => {
                if (line.type === 'removed') {
                  return (
                    <div
                      key={idx}
                      className="flex items-start px-4 py-1.5 bg-red-50 text-red-700 line-through border-l-4 border-red-500 group"
                    >
                      <span className="w-8 shrink-0 text-red-400 select-none text-[11px]">
                        {line.oldLineNumber || '-'}
                      </span>
                      <span className="w-6 shrink-0 text-red-500 font-bold select-none">-</span>
                      <span className="flex-1 whitespace-pre-wrap">{line.text || ' '}</span>
                    </div>
                  );
                }

                if (line.type === 'added') {
                  return (
                    <div
                      key={idx}
                      className="flex items-start px-4 py-1.5 bg-emerald-50 text-emerald-700 border-l-4 border-emerald-500 group"
                    >
                      <span className="w-8 shrink-0 text-emerald-500 select-none text-[11px]">
                        {line.newLineNumber || '+'}
                      </span>
                      <span className="w-6 shrink-0 text-emerald-600 font-bold select-none">+</span>
                      <span className="flex-1 whitespace-pre-wrap font-medium">{line.text || ' '}</span>
                    </div>
                  );
                }

                if (line.type === 'modified') {
                  return (
                    <div
                      key={idx}
                      className="flex items-start px-4 py-2 bg-amber-50/80 text-amber-900 border-l-4 border-amber-500 group"
                    >
                      <span className="w-8 shrink-0 text-amber-600 select-none text-[11px]">
                        {line.newLineNumber || '~'}
                      </span>
                      <span className="w-6 shrink-0 text-amber-600 font-bold select-none">~</span>
                      <div className="flex-1 flex flex-col gap-1">
                        <span className="font-semibold whitespace-pre-wrap">{line.text}</span>
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-sans font-medium bg-amber-100 text-amber-800 border border-amber-300 w-fit">
                          {line.changeCategory === 'camera' ? (
                            <Camera className="w-3 h-3 text-amber-700" />
                          ) : (
                            <MessageSquare className="w-3 h-3 text-amber-700" />
                          )}
                          <span>{line.changeDetail || 'Đã chỉnh sửa nội dung/góc máy'}</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Unchanged
                return (
                  <div
                    key={idx}
                    className="flex items-start px-4 py-1 text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <span className="w-8 shrink-0 text-slate-300 select-none text-[11px]">
                      {line.newLineNumber}
                    </span>
                    <span className="w-6 shrink-0 text-slate-300 select-none"> </span>
                    <span className="flex-1 whitespace-pre-wrap">{line.text || ' '}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            /* SIDE-BY-SIDE SPLIT VIEW */
            <div className="grid grid-cols-2 gap-3">
              {/* Cột trái: Base Version */}
              <div className="bg-white rounded-xl border border-[#D8D2C5] shadow-sm overflow-hidden flex flex-col">
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Bản gốc: v{baseVersion.versionNumber}</span>
                  <span className="text-[11px] font-normal text-slate-500">{baseVersion.status}</span>
                </div>
                <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
                  {diffResult.sideBySide.left.map((line, idx) => {
                    if (!line) {
                      return (
                        <div key={idx} className="h-6 bg-slate-50/50 select-none">
                          &nbsp;
                        </div>
                      );
                    }
                    if (line.type === 'removed') {
                      return (
                        <div
                          key={idx}
                          className="px-3 py-1 bg-red-50 text-red-700 line-through border-l-2 border-red-500 whitespace-pre-wrap"
                        >
                          {line.text || ' '}
                        </div>
                      );
                    }
                    return (
                      <div key={idx} className="px-3 py-1 text-slate-600 whitespace-pre-wrap">
                        {line.text || ' '}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cột phải: Compare Version */}
              <div className="bg-white rounded-xl border border-[#D8D2C5] shadow-sm overflow-hidden flex flex-col">
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Bản so sánh: v{compareVersion.versionNumber}</span>
                  <span className="text-[11px] font-normal text-slate-500">{compareVersion.status}</span>
                </div>
                <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
                  {diffResult.sideBySide.right.map((line, idx) => {
                    if (!line) {
                      return (
                        <div key={idx} className="h-6 bg-slate-50/50 select-none">
                          &nbsp;
                        </div>
                      );
                    }
                    if (line.type === 'added') {
                      return (
                        <div
                          key={idx}
                          className="px-3 py-1 bg-emerald-50 text-emerald-700 border-l-2 border-emerald-500 font-medium whitespace-pre-wrap"
                        >
                          {line.text || ' '}
                        </div>
                      );
                    }
                    if (line.type === 'modified') {
                      return (
                        <div
                          key={idx}
                          className="px-3 py-1 bg-amber-50 text-amber-900 border-l-2 border-amber-500 font-semibold whitespace-pre-wrap"
                        >
                          {line.text || ' '}
                        </div>
                      );
                    }
                    return (
                      <div key={idx} className="px-3 py-1 text-slate-600 whitespace-pre-wrap">
                        {line.text || ' '}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <footer className="px-6 py-3 bg-white border-t border-[#EBE7DF] flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Đỏ gạch: Xóa
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Xanh lá: Thêm mới
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Vàng: Chỉnh sửa góc máy/thoại
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 cursor-pointer shadow-xs"
          >
            Đóng so sánh
          </button>
        </footer>
      </div>
    </div>
  );
};

