// src/roles/writer/components/script/storyboard/PanelThumbnailCard.tsx
import React, { useRef, useState } from 'react';
import {
  ImagePlus,
  Upload,
  Eye,
  Trash2,
  Camera,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  Link2,
  X,
  Maximize2,
  RotateCcw,
} from 'lucide-react';
import { StoryboardPanel, CameraAngle } from './scriptThumbnail.types';

const CAMERA_ANGLES: CameraAngle[] = [
  'Toàn cảnh (Wide Shot)',
  'Trung cảnh (Medium Shot)',
  'Cận cảnh (Close-Up)',
  'Đặc tả (Extreme Close-Up)',
  'Góc cao (High Angle / Bird-Eye)',
  'Góc thấp (Low Angle / Worm-Eye)',
  'Ngang vai (Over-the-Shoulder)',
  'Góc nghiêng (Dutch Angle)',
];

interface PanelThumbnailCardProps {
  panel: StoryboardPanel;
  canEdit: boolean;
  onUpdatePanel: (updated: StoryboardPanel) => void;
  onDeletePanel: (panelId: string) => void;
  onPreviewImage: (url: string, title: string) => void;
  onShowToast?: (title: string, desc: string) => void;
}

export const PanelThumbnailCard: React.FC<PanelThumbnailCardProps> = ({
  panel,
  canEdit,
  onUpdatePanel,
  onDeletePanel,
  onPreviewImage,
  onShowToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [newSpeaker, setNewSpeaker] = useState('');
  const [newDialogue, setNewDialogue] = useState('');
  const [showAddDialogue, setShowAddDialogue] = useState(false);

  // Xử lý nạp file ảnh cục bộ
  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      onShowToast?.('Định dạng không hỗ trợ', 'Vui lòng chọn tệp hình ảnh (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      onUpdatePanel({
        ...panel,
        thumbnailUrl: dataUrl,
        thumbnailName: file.name,
        thumbnailFile: file,
      });
      onShowToast?.('Đã chèn thumbnail', `Đã tải ảnh lên cho Panel ${panel.panelKey}.`);
    };
    reader.readAsDataURL(file);
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!canEdit) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  // Áp dụng link URL ảnh
  const handleApplyUrl = () => {
    if (!imageUrlInput.trim()) return;
    onUpdatePanel({
      ...panel,
      thumbnailUrl: imageUrlInput.trim(),
      thumbnailName: 'Hình ảnh liên kết',
    });
    setImageUrlInput('');
    setShowUrlInput(false);
    onShowToast?.('Đã chèn thumbnail', `Đã liên kết ảnh cho Panel ${panel.panelKey}.`);
  };

  // Gỡ bỏ thumbnail
  const handleRemoveThumbnail = () => {
    onUpdatePanel({
      ...panel,
      thumbnailUrl: null,
      thumbnailName: null,
      thumbnailFile: null,
    });
    onShowToast?.('Đã xoá thumbnail', `Đã gỡ bỏ thumbnail khỏi Panel ${panel.panelKey}.`);
  };

  // Thêm thoại mới vào panel
  const handleAddDialogue = () => {
    if (!newDialogue.trim()) return;
    const updatedDialogues = [
      ...panel.dialogues,
      {
        id: `dlg_${Date.now()}`,
        speaker: newSpeaker.trim() || 'Nhân vật',
        text: newDialogue.trim(),
      },
    ];
    onUpdatePanel({
      ...panel,
      dialogues: updatedDialogues,
    });
    setNewSpeaker('');
    setNewDialogue('');
    setShowAddDialogue(false);
  };

  // Xóa một dòng thoại khỏi panel
  const handleDeleteDialogue = (dlgId: string) => {
    const updatedDialogues = panel.dialogues.filter((d) => d.id !== dlgId);
    onUpdatePanel({
      ...panel,
      dialogues: updatedDialogues,
    });
  };

  return (
    <div className='flex flex-col rounded-2xl border border-[#D8D2C5] bg-[#FCFBF8] shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden'>
      {/* 1. Header Khung Panel */}
      <div className='flex items-center justify-between px-4 py-2.5 bg-[#F7F5EE] border-b border-[#EBE7DF]'>
        <div className='flex items-center gap-2 flex-wrap'>
          <span className='px-2.5 py-0.5 rounded-md bg-[#1C1917] text-[#FCFBF8] font-mono text-xs font-bold tracking-wider'>
            #panel {panel.panelKey}
          </span>

          {/* Chọn góc máy camera */}
          <div className='flex items-center gap-1 text-[11px] text-[#57534E]'>
            <Camera className='w-3.5 h-3.5 text-amber-700 shrink-0' />
            <select
              value={panel.cameraAngle || ''}
              disabled={!canEdit}
              onChange={(e) =>
                onUpdatePanel({
                  ...panel,
                  cameraAngle: (e.target.value as CameraAngle) || undefined,
                })
              }
              className='bg-white/80 border border-gray-200 rounded px-1.5 py-0.5 text-[11px] font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer disabled:opacity-50'
            >
              <option value=''>Góc máy tự do</option>
              {CAMERA_ANGLES.map((cam) => (
                <option key={cam} value={cam}>
                  {cam}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Trạng thái Thumbnail & Nút hành động */}
        <div className='flex items-center gap-2'>
          {panel.thumbnailUrl ? (
            <span className='inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full'>
              <CheckCircle2 className='w-3 h-3 text-emerald-600' />
              Đã có thumbnail
            </span>
          ) : (
            <span className='inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full'>
              <AlertCircle className='w-3 h-3 text-amber-600' />
              Chờ thumbnail
            </span>
          )}

          {canEdit && (
            <button
              type='button'
              onClick={() => onDeletePanel(panel.id)}
              className='p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer'
              title='Xoá panel này'
            >
              <Trash2 className='w-3.5 h-3.5' />
            </button>
          )}
        </div>
      </div>

      {/* 2. Khu vực Chèn / Hiển thị Thumbnail */}
      <div className='p-4 bg-white border-b border-[#EBE7DF]'>
        <input
          type='file'
          ref={fileInputRef}
          accept='image/*'
          className='hidden'
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileChange(f);
          }}
        />

        {panel.thumbnailUrl ? (
          /* Đã có thumbnail: Hiển thị hình ảnh với các nút thao tác */
          <div className='relative group rounded-xl overflow-hidden border border-gray-200 bg-[#1C1917]/5 aspect-video flex items-center justify-center'>
            <img
              src={panel.thumbnailUrl}
              alt={`Thumbnail panel ${panel.panelKey}`}
              className='w-full h-full object-cover cursor-pointer'
              onClick={() =>
                onPreviewImage(panel.thumbnailUrl!, `Thumbnail #panel ${panel.panelKey}`)
              }
            />

            {/* Overlay nút bấm khi hover */}
            <div className='absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2'>
              <button
                type='button'
                onClick={() =>
                  onPreviewImage(panel.thumbnailUrl!, `Thumbnail #panel ${panel.panelKey}`)
                }
                className='p-2 bg-white/90 hover:bg-white text-gray-800 rounded-xl shadow-lg transition-transform hover:scale-110 cursor-pointer'
                title='Phóng to xem thumbnail'
              >
                <Maximize2 className='w-4 h-4' />
              </button>

              {canEdit && (
                <>
                  <button
                    type='button'
                    onClick={() => fileInputRef.current?.click()}
                    className='p-2 bg-white/90 hover:bg-white text-amber-700 rounded-xl shadow-lg transition-transform hover:scale-110 cursor-pointer'
                    title='Thay đổi ảnh thumbnail'
                  >
                    <Upload className='w-4 h-4' />
                  </button>
                  <button
                    type='button'
                    onClick={handleRemoveThumbnail}
                    className='p-2 bg-white/90 hover:bg-white text-rose-600 rounded-xl shadow-lg transition-transform hover:scale-110 cursor-pointer'
                    title='Gỡ bỏ thumbnail'
                  >
                    <Trash2 className='w-4 h-4' />
                  </button>
                </>
              )}
            </div>

            {panel.thumbnailName && (
              <span className='absolute bottom-2 left-2 max-w-[80%] truncate px-2 py-0.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono rounded-md pointer-events-none'>
                {panel.thumbnailName}
              </span>
            )}
          </div>
        ) : (
          /* Chưa có thumbnail: Khung Dropzone chèn ảnh */
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
              isDragging
                ? 'border-amber-500 bg-amber-50/80 scale-[0.99]'
                : 'border-[#D8D2C5] hover:border-amber-400 bg-[#FCFBF8]'
            } flex flex-col items-center justify-center min-h-[140px]`}
          >
            <div className='w-10 h-10 rounded-full bg-amber-100/70 text-amber-700 flex items-center justify-center mb-2'>
              <ImagePlus className='w-5 h-5' />
            </div>

            <p className='text-xs font-semibold text-gray-700'>
              Kéo thả bản vẽ hoặc bấm để chèn thumbnail
            </p>
            <p className='text-[11px] text-gray-500 mt-0.5'>
              Hỗ trợ PNG, JPG, WebP phác thảo bố cục
            </p>

            {canEdit && (
              <div className='flex items-center gap-2 mt-3'>
                <button
                  type='button'
                  onClick={() => fileInputRef.current?.click()}
                  className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-2xs transition-colors cursor-pointer'
                >
                  <Upload className='w-3.5 h-3.5' />
                  <span>Tải ảnh lên</span>
                </button>

                <button
                  type='button'
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-2xs transition-colors cursor-pointer'
                >
                  <Link2 className='w-3.5 h-3.5' />
                  <span>Dán URL</span>
                </button>
              </div>
            )}

            {/* Input dán URL */}
            {showUrlInput && (
              <div className='flex items-center gap-1.5 mt-3 w-full max-w-sm'>
                <input
                  type='text'
                  placeholder='https://... ảnh thumbnail'
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className='flex-1 px-2.5 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white'
                />
                <button
                  type='button'
                  onClick={handleApplyUrl}
                  className='px-2.5 py-1 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 cursor-pointer'
                >
                  Gán
                </button>
                <button
                  type='button'
                  onClick={() => setShowUrlInput(false)}
                  className='p-1 text-gray-400 hover:text-gray-600 cursor-pointer'
                >
                  <X className='w-4 h-4' />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Nội dung Kịch bản của Panel (@nhanvat: loi thoại) */}
      <div className='p-4 flex-1 flex flex-col justify-between space-y-3'>
        {/* Chỉ dẫn sân khấu / bối cảnh */}
        {panel.stageDirection && (
          <div className='text-xs italic text-gray-600 bg-[#F7F5EE] border-l-2 border-amber-600/60 p-2.5 rounded-r-lg'>
            {panel.stageDirection}
          </div>
        )}

        {/* Danh sách thoại theo cú pháp @nhanvat: loi thoại */}
        <div className='space-y-2'>
          {panel.dialogues.length > 0 ? (
            panel.dialogues.map((dlg) => (
              <div
                key={dlg.id}
                className='group flex items-start justify-between gap-2 p-2 rounded-xl bg-orange-50/50 border border-orange-100 text-xs'
              >
                <div className='min-w-0'>
                  <span className='font-bold text-amber-800 font-mono inline-flex items-center gap-0.5 mr-1.5'>
                    @{dlg.speaker}:
                  </span>
                  <span className='text-gray-800 leading-relaxed'>{dlg.text}</span>
                </div>

                {canEdit && (
                  <button
                    type='button'
                    onClick={() => handleDeleteDialogue(dlg.id)}
                    className='opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-rose-600 rounded transition-opacity cursor-pointer shrink-0'
                    title='Xoá dòng thoại này'
                  >
                    <X className='w-3 h-3' />
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className='text-xs text-gray-400 italic'>Chưa có lời thoại trong panel này.</p>
          )}
        </div>

        {/* Thêm thoại nhanh */}
        {canEdit && (
          <div>
            {showAddDialogue ? (
              <div className='space-y-2 pt-2 border-t border-gray-100'>
                <div className='flex gap-2'>
                  <input
                    type='text'
                    placeholder='Tên nhân vật (ví dụ: Ren)'
                    value={newSpeaker}
                    onChange={(e) => setNewSpeaker(e.target.value)}
                    className='w-1/3 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white'
                  />
                  <input
                    type='text'
                    placeholder='Lời thoại...'
                    value={newDialogue}
                    onChange={(e) => setNewDialogue(e.target.value)}
                    className='flex-1 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white'
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddDialogue();
                    }}
                  />
                </div>
                <div className='flex justify-end gap-1.5'>
                  <button
                    type='button'
                    onClick={() => setShowAddDialogue(false)}
                    className='px-2 py-1 text-xs text-gray-500 hover:text-gray-700 cursor-pointer'
                  >
                    Hủy
                  </button>
                  <button
                    type='button'
                    onClick={handleAddDialogue}
                    className='px-2.5 py-1 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md cursor-pointer'
                  >
                    Thêm thoại
                  </button>
                </div>
              </div>
            ) : (
              <button
                type='button'
                onClick={() => setShowAddDialogue(true)}
                className='inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer'
              >
                <Plus className='w-3 h-3' />
                <span>+ Thêm lời thoại (@)</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
