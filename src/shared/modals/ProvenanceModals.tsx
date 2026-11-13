import React from 'react';
import { X, History, Sparkles, User, FileDiff, Cpu, Lock } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VersionHistoryModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-[100] flex items-center justify-center bg-[#171717]/80 backdrop-blur-sm p-4 animate-in fade-in duration-200'>
      <div className='w-full max-w-2xl bg-[#FAF8F4] rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300'>
        <div className='flex items-center justify-between p-5 border-b border-[#E7E7E7] bg-white'>
          <div className='flex items-center gap-3 text-[#171717]'>
            <History className='w-5 h-5 text-[#888888]' />
            <h2 className='text-lg font-bold'>Version History</h2>
          </div>
          <button
            onClick={onClose}
            className='p-2 text-[#A3A3A3] hover:text-[#171717] rounded-full hover:bg-[#F3F3F3] transition-colors'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4'>
          <div className='border-l-2 border-[#D4D4D4] ml-4 pl-6 relative space-y-6'>
            {/* V1.2 */}
            <div className='relative'>
              <div className='absolute w-3 h-3 bg-[#171717] rounded-full -left-[30px] top-1.5 border-2 border-[#FAF8F4]'></div>
              <div className='text-sm font-bold text-[#171717]'>v1.2 (Latest)</div>
              <div className='text-xs text-[#737373] mb-2'>Today at 10:45 AM</div>
              <div className='p-3 bg-white border border-[#E7E7E7] rounded-lg'>
                <div className='flex items-center gap-2 mb-1'>
                  <User className='w-3.5 h-3.5 text-[#A3A3A3]' />
                  <span className='text-xs font-semibold'>Tatsuki F. (Artist)</span>
                </div>
                <p className='text-sm text-[#555555]'>
                  Updated the background shading and added screen tones.
                </p>
                <button className='mt-2 text-xs flex items-center gap-1 text-[#8B5CF6] hover:underline'>
                  <FileDiff className='w-3.5 h-3.5' /> View Changes
                </button>
              </div>
            </div>

            {/* V1.1 */}
            <div className='relative'>
              <div className='absolute w-3 h-3 bg-[#D4D4D4] rounded-full -left-[30px] top-1.5 border-2 border-[#FAF8F4]'></div>
              <div className='text-sm font-bold text-[#171717]'>v1.1</div>
              <div className='text-xs text-[#737373] mb-2'>Yesterday at 15:30 PM</div>
              <div className='p-3 bg-white border border-[#E7E7E7] rounded-lg'>
                <div className='flex items-center gap-2 mb-1'>
                  <User className='w-3.5 h-3.5 text-[#A3A3A3]' />
                  <span className='text-xs font-semibold'>Tatsuki F. (Artist)</span>
                </div>
                <p className='text-sm text-[#555555]'>Initial rough sketch uploaded.</p>
              </div>
            </div>

            {/* V1.0 */}
            <div className='relative'>
              <div className='absolute w-3 h-3 bg-[#D4D4D4] rounded-full -left-[30px] top-1.5 border-2 border-[#FAF8F4]'></div>
              <div className='text-sm font-bold text-[#171717]'>v1.0 (Script Approved)</div>
              <div className='text-xs text-[#737373] mb-2'>Sep 18, 2026 at 09:00 AM</div>
              <div className='p-3 bg-white border border-[#E7E7E7] rounded-lg'>
                <div className='flex items-center gap-2 mb-1'>
                  <User className='w-3.5 h-3.5 text-[#A3A3A3]' />
                  <span className='text-xs font-semibold'>Kien N. (Writer)</span>
                </div>
                <p className='text-sm text-[#555555]'>
                  Script finalization and hand-off to Artist.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AIProvenanceModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-[100] flex items-center justify-center bg-[#171717]/80 backdrop-blur-sm p-4 animate-in fade-in duration-200'>
      <div className='w-full max-w-2xl bg-[#FAF8F4] rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300'>
        <div className='flex items-center justify-between p-5 border-b border-[#E7E7E7] bg-white'>
          <div className='flex items-center gap-3 text-[#171717]'>
            <Sparkles className='w-5 h-5 text-[#8B5CF6]' />
            <h2 className='text-lg font-bold'>AI Provenance & Accountability</h2>
          </div>
          <button
            onClick={onClose}
            className='p-2 text-[#A3A3A3] hover:text-[#171717] rounded-full hover:bg-[#F3F3F3] transition-colors'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='p-6 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-6'>
          <div className='bg-[#F5F3FF] border border-[#DDD6FE] rounded-xl p-4 flex gap-4'>
            <Cpu className='w-8 h-8 text-[#8B5CF6] shrink-0' />
            <div>
              <h3 className='font-bold text-[#171717] mb-1'>Google Gemini 1.5 Pro (Vertex AI)</h3>
              <p className='text-sm text-[#555555]'>
                Mô hình AI đã tham gia hỗ trợ phân tích và đưa ra gợi ý (Suggestions) cho tài sản
                này.
              </p>
              <div className='mt-3 flex gap-2'>
                <span className='px-2.5 py-1 bg-white border border-[#DDD6FE] text-[#8B5CF6] text-xs font-semibold rounded'>
                  Bảo mật: Tiêu chuẩn Studio
                </span>
                <span className='px-2.5 py-1 bg-white border border-[#DDD6FE] text-[#8B5CF6] text-xs font-semibold rounded'>
                  Huấn luyện dữ liệu: Đã tắt
                </span>
              </div>
            </div>
          </div>

          <div className='space-y-4'>
            <h4 className='text-sm font-bold text-[#171717] border-b border-[#E7E7E7] pb-2'>
              AI Interactions on this Task
            </h4>

            <div className='bg-white border border-[#E7E7E7] rounded-lg p-4'>
              <div className='flex items-center justify-between mb-3'>
                <span className='text-xs font-bold uppercase tracking-wider text-[#737373]'>
                  Interaction #1
                </span>
                <span className='text-xs text-[#A3A3A3]'>Sep 18, 2026 - 09:12 AM</span>
              </div>
              <div className='space-y-3'>
                <div>
                  <div className='text-xs font-bold text-[#888888] uppercase mb-1'>
                    Input Prompt
                  </div>
                  <div className='text-sm font-mono bg-[#F3F3F3] p-2 rounded text-[#171717]'>
                    "Break down this script paragraph into 4 manga panels."
                  </div>
                </div>
                <div>
                  <div className='text-xs font-bold text-[#8B5CF6] uppercase mb-1'>
                    AI Output (Suggestion)
                  </div>
                  <div className='text-sm font-mono bg-[#F5F3FF] border border-[#DDD6FE] p-2 rounded text-[#555555]'>
                    Generated JSON structure with 4 panels, dialogue mapping, and character
                    positioning...
                  </div>
                </div>
                <div>
                  <div className='text-xs font-bold text-[#10B981] uppercase mb-1'>
                    Human Modification
                  </div>
                  <div className='text-sm font-mono bg-[#ECFCCB] border border-[#BEF264] p-2 rounded text-[#4D7C0F]'>
                    The writer accepted the suggestion but manually adjusted the camera angle on
                    Panel 3.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className='flex items-center gap-2 p-3 bg-[#F8F6F0] rounded-lg text-[#737373] text-xs'>
            <Lock className='w-4 h-4 shrink-0' />
            <p>
              Nhật ký hỗ trợ sáng tác này được lưu vết bảo toàn nhằm bảo vệ tính minh bạch và bản
              quyền tác phẩm.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
