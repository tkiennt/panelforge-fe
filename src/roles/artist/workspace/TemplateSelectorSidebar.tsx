import React from 'react';
import { X, LayoutTemplate, Check, Sparkles, HelpCircle } from 'lucide-react';
import { FramePresetTemplate } from './workspace.types';

export const MANGA_FRAME_PRESETS: FramePresetTemplate[] = [
  {
    id: 'single-full',
    name: '1 Khung Toàn Trang',
    category: 'Đại cảnh',
    description: 'Một khung duy nhất bao trọn trang tranh cho splash-art hoặc vẽ hoàn chỉnh bên ngoài (CSP/Photoshop)',
    panelCount: 1,
    badge: 'Mặc định',
    panels: [{ panelNumber: 1, x: 4, y: 3, width: 92, height: 94 }],
  },
  {
    id: '2-panel-vert',
    name: '2 Khung Dọc (Webtoon/Đại Cảnh)',
    category: 'Kinh điển',
    description: '2 khung chia đều theo chiều dọc, tối ưu cho nhịp đọc nhanh hoặc chuyển cảnh thời gian',
    panelCount: 2,
    badge: '2 Khung',
    panels: [
      { panelNumber: 1, x: 4, y: 3, width: 92, height: 45 },
      { panelNumber: 2, x: 4, y: 52, width: 92, height: 45 },
    ],
  },
  {
    id: '2-panel-split',
    name: '2 Khung Song Song (Đối thoại)',
    category: 'Kinh điển',
    description: 'Chia đôi trang theo chiều ngang, lý tưởng cho phân cảnh đối đầu hoặc hai nhân vật đối thoại',
    panelCount: 2,
    badge: '2 Khung',
    panels: [
      { panelNumber: 1, x: 4, y: 3, width: 44, height: 94 },
      { panelNumber: 2, x: 52, y: 3, width: 44, height: 94 },
    ],
  },
  {
    id: '3-panel-shonen',
    name: '3 Khung Shonen Hành Động',
    category: 'Hành động',
    description: 'Bố cục 3 hàng kinh điển của manga Shonen: Mở màn - Hành động đỉnh điểm - Phản ứng',
    panelCount: 3,
    badge: 'Phổ biến',
    panels: [
      { panelNumber: 1, x: 4, y: 3, width: 92, height: 28 },
      { panelNumber: 2, x: 4, y: 34, width: 92, height: 28 },
      { panelNumber: 3, x: 4, y: 65, width: 92, height: 32 },
    ],
  },
  {
    id: '4-panel-yonkoma',
    name: '4 Khung Yonkoma (4-Koma)',
    category: 'Truyền thống',
    description: 'Quy chuẩn 4 khung Ki-shō-ten-ketsu (Khai - Thừa - Chuyển - Hợp) cho truyện 4 ô',
    panelCount: 4,
    badge: '4-Koma',
    panels: [
      { panelNumber: 1, x: 8, y: 3, width: 84, height: 21 },
      { panelNumber: 2, x: 8, y: 27, width: 84, height: 21 },
      { panelNumber: 3, x: 8, y: 51, width: 84, height: 21 },
      { panelNumber: 4, x: 8, y: 75, width: 84, height: 21 },
    ],
  },
  {
    id: 'action-dynamic',
    name: 'Shonen Dynamic (5 Khung)',
    category: 'Hành động',
    description: '1 khung cao trào lớn đầu trang kết hợp 4 khung nhỏ dồn dập cho các cảnh combat',
    panelCount: 5,
    badge: 'Cao trào',
    panels: [
      { panelNumber: 1, x: 4, y: 3, width: 92, height: 42 },
      { panelNumber: 2, x: 4, y: 48, width: 44, height: 22 },
      { panelNumber: 3, x: 52, y: 48, width: 44, height: 22 },
      { panelNumber: 4, x: 4, y: 73, width: 44, height: 24 },
      { panelNumber: 5, x: 52, y: 73, width: 44, height: 24 },
    ],
  },
  {
    id: 'cinematic-widescreen',
    name: 'Điện Ảnh Cinema (3 Khung)',
    category: 'Đại cảnh',
    description: '1 khung đại cảnh Cinematic tỉ lệ vàng ở trên cùng 2 khung phản ứng đối xứng ở dưới',
    panelCount: 3,
    badge: 'Cinematic',
    panels: [
      { panelNumber: 1, x: 4, y: 3, width: 92, height: 50 },
      { panelNumber: 2, x: 4, y: 56, width: 44, height: 41 },
      { panelNumber: 3, x: 52, y: 56, width: 44, height: 41 },
    ],
  },
];

interface TemplateSelectorSidebarProps {
  isOpen: boolean;
  activeTemplateId: string;
  onClose: () => void;
  onSelectTemplate: (templateId: string) => void;
}

export const TemplateSelectorSidebar: React.FC<TemplateSelectorSidebarProps> = ({
  isOpen,
  activeTemplateId,
  onClose,
  onSelectTemplate,
}) => {
  return (
    <>
      {/* Backdrop overlay khi mở sidebar trên màn hình nhỏ */}
      {isOpen && (
        <div
          data-testid='template-sidebar-backdrop'
          onClick={onClose}
          className='fixed inset-0 bg-stone-900/25 backdrop-blur-[1px] z-40 transition-opacity xl:hidden'
        />
      )}

      {/* Slide-over Right Sidebar (320px) */}
      <aside
        data-testid='template-selector-sidebar'
        className={`fixed top-0 right-0 h-full w-80 max-w-[90vw] bg-[#FAF8F5] border-l border-[#D8D2C5] shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className='p-4 border-b border-[#D8D2C5] flex items-center justify-between bg-white shrink-0'>
          <div className='flex items-center gap-2'>
            <div className='w-8 h-8 rounded-lg bg-orange-50 border border-orange-200/60 flex items-center justify-center text-[#F97316]'>
              <LayoutTemplate className='w-4 h-4' />
            </div>
            <div>
              <h3 className='font-bold text-sm text-[#1C1917]'>Mẫu Khung Trang</h3>
              <p className='text-[11px] text-[#57534E]'>Chọn bố cục phù hợp nhịp kịch bản</p>
            </div>
          </div>
          <button
            type='button'
            onClick={onClose}
            data-testid='close-template-sidebar-btn'
            className='p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer'
            title='Đóng thanh chọn mẫu khung'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Tip thông báo */}
        <div className='p-3 bg-amber-50/70 border-b border-amber-200/50 flex items-start gap-2 text-xs text-amber-900 shrink-0'>
          <Sparkles className='w-4 h-4 text-[#F97316] shrink-0 mt-0.5' />
          <p className='text-[11px] leading-relaxed'>
            Đổi mẫu khung sẽ áp dụng tức thì. Các tranh đã nạp vào khung sẽ được giữ nguyên theo số thứ tự khung tương ứng.
          </p>
        </div>

        {/* Danh sách Presets */}
        <div className='flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar'>
          {MANGA_FRAME_PRESETS.map((preset) => {
            const isSelected = activeTemplateId === preset.id;
            return (
              <div
                key={preset.id}
                role='button'
                tabIndex={0}
                data-testid={`preset-card-${preset.id}`}
                onClick={() => {
                  onSelectTemplate(preset.id);
                  onClose();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectTemplate(preset.id);
                    onClose();
                  }
                }}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all duration-150 relative group ${
                  isSelected
                    ? 'bg-[#FFF7ED] border-[#F97316] shadow-xs ring-1 ring-[#F97316]/30'
                    : 'bg-white border-[#E7E5E4] hover:border-orange-300 hover:bg-[#FAF8F5]'
                }`}
              >
                <div className='flex items-start gap-3'>
                  {/* Wireframe Thumbnail thu nhỏ (Tỷ lệ B5) */}
                  <div className='w-14 h-20 bg-stone-50 border border-[#D8D2C5] rounded-md relative shrink-0 overflow-hidden shadow-2xs group-hover:border-stone-400 transition-colors'>
                    {preset.panels.map((p) => (
                      <div
                        key={p.panelNumber}
                        className={`absolute border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'border-[#F97316] bg-orange-100/50'
                            : 'border-[#171717]/80 bg-white group-hover:border-[#171717]'
                        }`}
                        style={{
                          left: `${p.x}%`,
                          top: `${p.y}%`,
                          width: `${p.width}%`,
                          height: `${p.height}%`,
                        }}
                      >
                        <span className='text-[8px] font-mono font-bold text-stone-500'>
                          #{p.panelNumber}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Thông tin Preset */}
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center justify-between gap-1 mb-1'>
                      <h4 className='font-bold text-xs text-[#1C1917] truncate group-hover:text-[#F97316] transition-colors'>
                        {preset.name}
                      </h4>
                      {preset.badge && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            isSelected
                              ? 'bg-[#F97316] text-white'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {preset.badge}
                        </span>
                      )}
                    </div>
                    <p className='text-[11px] text-[#57534E] leading-snug line-clamp-2'>
                      {preset.description}
                    </p>
                    <div className='mt-2 flex items-center justify-between text-[10px] text-stone-500'>
                      <span>{preset.panelCount} Khung truyện</span>
                      {isSelected && (
                        <span className='font-bold text-[#F97316] flex items-center gap-1'>
                          <Check className='w-3 h-3' /> Đang dùng
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className='p-3 border-t border-[#D8D2C5] bg-white text-center shrink-0'>
          <p className='text-[11px] text-stone-500'>
            Manga Paper Studio · Chuẩn khung B5 Nhật Bản
          </p>
        </div>
      </aside>
    </>
  );
};
