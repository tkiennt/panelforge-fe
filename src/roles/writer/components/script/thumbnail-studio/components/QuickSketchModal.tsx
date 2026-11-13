// src/roles/writer/components/script/thumbnail-studio/components/QuickSketchModal.tsx
import React, { useRef, useState, useEffect } from 'react';
import { X, Eraser, Check, Trash2, Edit3, Upload } from 'lucide-react';

interface QuickSketchModalProps {
  isOpen: boolean;
  panelTitle: string;
  initialDataUrl?: string;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
  onClear: () => void;
}

export const QuickSketchModal: React.FC<QuickSketchModalProps> = ({
  isOpen,
  panelTitle,
  initialDataUrl,
  onClose,
  onSave,
  onClear,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [lineWidth, setLineWidth] = useState(3);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Thiết lập nền trắng mặc định
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (initialDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = initialDataUrl;
    }
  }, [isOpen, initialDataUrl]);

  if (!isOpen) return null;

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : '#1C1917';
    ctx.lineWidth = tool === 'eraser' ? 16 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onClear();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    onClose();
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result as string;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = data;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className='fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in'>
      <div className='bg-[#FCFBF8] rounded-2xl border border-[#D8D2C5] shadow-2xl max-w-lg w-full p-5 space-y-4'>
        <div className='flex items-center justify-between pb-3 border-b border-[#D8D2C5]'>
          <div>
            <h3 className='text-sm font-bold font-serif text-[#1C1917] flex items-center gap-2'>
              <Edit3 className='w-4 h-4 text-[#C2410C]' /> Phác Thảo Nhanh: {panelTitle}
            </h3>
            <p className='text-[11px] text-[#57534E]'>
              Vẽ nét người que nhanh hoặc tải ảnh phác thảo cho ô truyện
            </p>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='p-1 rounded-lg text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3F0E9] cursor-pointer'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Toolbar vẽ */}
        <div className='flex items-center justify-between gap-2 flex-wrap'>
          <div className='flex items-center gap-1.5 bg-[#F3F0E9] p-1 rounded-xl'>
            <button
              type='button'
              onClick={() => setTool('pen')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                tool === 'pen'
                  ? 'bg-[#C2410C] text-white shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              <Edit3 className='w-3.5 h-3.5' /> Bút vẽ
            </button>
            <button
              type='button'
              onClick={() => setTool('eraser')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                tool === 'eraser'
                  ? 'bg-[#C2410C] text-white shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              <Eraser className='w-3.5 h-3.5' /> Tẩy
            </button>
          </div>

          <div className='flex items-center gap-2'>
            <input
              type='file'
              ref={fileInputRef}
              accept='image/*'
              className='hidden'
              onChange={handleUploadImage}
            />
            <button
              type='button'
              onClick={() => fileInputRef.current?.click()}
              className='flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-[#57534E] bg-white border border-[#D8D2C5] hover:bg-[#F3F0E9] cursor-pointer shadow-xs'
            >
              <Upload className='w-3.5 h-3.5' /> Tải ảnh
            </button>
            <button
              type='button'
              onClick={handleClear}
              className='flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer'
            >
              <Trash2 className='w-3.5 h-3.5' /> Xoá hết
            </button>
          </div>
        </div>

        {/* Canvas vẽ */}
        <div className='relative border-2 border-[#D8D2C5] rounded-xl overflow-hidden bg-white shadow-inner flex items-center justify-center'>
          <canvas
            ref={canvasRef}
            width={400}
            height={260}
            className='cursor-crosshair touch-none'
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        <div className='flex items-center justify-end gap-2 pt-2 border-t border-[#D8D2C5]'>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-1.5 text-xs font-semibold text-[#57534E] hover:bg-[#F3F0E9] rounded-xl cursor-pointer'
          >
            Đóng
          </button>
          <button
            type='button'
            onClick={handleSave}
            className='flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#C2410C] hover:bg-[#EA580C] rounded-xl shadow-xs cursor-pointer'
          >
            <Check className='w-4 h-4' /> Lưu phác thảo
          </button>
        </div>
      </div>
    </div>
  );
};
