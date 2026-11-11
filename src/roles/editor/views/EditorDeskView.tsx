import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ShieldCheck,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Layers,
  Sparkles,
  Lock,
} from 'lucide-react';
import { WorkspaceRole } from '@/types';

export interface EditorDeskViewProps {
  workspaceRole?: WorkspaceRole | null;
  onShowToast?: (title: string, desc: string) => void;
}

export const EditorDeskView: React.FC<EditorDeskViewProps> = ({
  workspaceRole,
  onShowToast,
}) => {
  const navigate = useNavigate();
  const { workspaceId, seriesId } = useParams<{ workspaceId: string; seriesId: string }>();
  const [activeGate, setActiveGate] = useState<'all' | 'gate1' | 'gate2'>('all');

  return (
    <div className='flex flex-col h-full bg-[#090D16] text-[#F8FAFC]'>
      {/* Top Header */}
      <header className='h-14 border-b border-[#334155] bg-[#0F172A] px-6 flex items-center justify-between shrink-0'>
        <div className='flex items-center gap-3'>
          <button
            type='button'
            onClick={() => navigate(`/workspaces/${workspaceId}/series`)}
            className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#94A3B8] hover:text-white hover:bg-[#1E293B] border border-[#334155] transition-colors'
          >
            <ArrowLeft className='w-4 h-4' />
            <span>Về danh sách Series</span>
          </button>
          <div className='h-4 w-[1px] bg-[#334155]' />
          <div className='flex items-center gap-2'>
            <span className='w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold text-xs'>
              ED
            </span>
            <div>
              <h1 className='text-sm font-bold text-white flex items-center gap-2'>
                Bàn Thẩm Định Biên Tập (Editor Desk)
                <span className='px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 uppercase'>
                  Quality Gates
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Gate Switcher */}
        <div className='flex items-center gap-1.5 bg-[#090E1A] p-1 rounded-xl border border-[#334155]'>
          <button
            type='button'
            onClick={() => setActiveGate('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeGate === 'all'
                ? 'bg-[#1E293B] text-white shadow-xs'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Tất cả cổng
          </button>
          <button
            type='button'
            onClick={() => setActiveGate('gate1')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeGate === 'gate1'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Gate 1: Storyboard
          </button>
          <button
            type='button'
            onClick={() => setActiveGate('gate2')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeGate === 'gate2'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Gate 2: Quality & Composite
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className='flex-1 p-6 overflow-y-auto max-w-6xl mx-auto w-full'>
        {/* Metric Badges */}
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6'>
          <div className='bg-[#0F172A] border border-[#334155] rounded-xl p-4 flex items-center justify-between'>
            <div>
              <p className='text-xs text-[#94A3B8] font-medium'>Đang chờ thẩm định</p>
              <p className='text-2xl font-bold text-amber-400 mt-1'>0</p>
            </div>
            <Clock className='w-8 h-8 text-amber-400/30' />
          </div>

          <div className='bg-[#0F172A] border border-[#334155] rounded-xl p-4 flex items-center justify-between'>
            <div>
              <p className='text-xs text-[#94A3B8] font-medium'>Đang trong nấc kiểm tra</p>
              <p className='text-2xl font-bold text-sky-400 mt-1'>0</p>
            </div>
            <Eye className='w-8 h-8 text-sky-400/30' />
          </div>

          <div className='bg-[#0F172A] border border-[#334155] rounded-xl p-4 flex items-center justify-between'>
            <div>
              <p className='text-xs text-[#94A3B8] font-medium'>Đã đạt chuẩn Gate</p>
              <p className='text-2xl font-bold text-emerald-400 mt-1'>0</p>
            </div>
            <ShieldCheck className='w-8 h-8 text-emerald-400/30' />
          </div>
        </div>

        {/* Empty state / Review Queue list placeholder */}
        <div className='bg-[#0F172A]/80 border border-[#334155] rounded-2xl p-10 text-center'>
          <ShieldCheck className='w-12 h-12 text-rose-400 mx-auto mb-3 opacity-80' />
          <h2 className='text-base font-bold text-white mb-1'>Hàng Đợi Thẩm Định Biên Tập</h2>
          <p className='text-xs text-[#94A3B8] max-w-md mx-auto leading-relaxed'>
            Chuyên trách kiểm soát chất lượng tại Gate 1 (Storyboard/Name) và Gate 2 (Trang hoàn thiện tổng thể).
            Các bài nộp của Artist và Letterer sẽ xuất hiện tại đây khi sẵn sàng để kiểm duyệt.
          </p>
        </div>
      </main>
    </div>
  );
};
