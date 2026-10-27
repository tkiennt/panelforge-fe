import React, { useState } from 'react';
import {
  Image as ImageIcon,
  UploadCloud,
  Layers,
  ShieldCheck,
  Download,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface ArtworkCanvasProps {
  isReadOnly?: boolean;
  initialImageUrl?: string;
}

export const ArtworkCanvas: React.FC<ArtworkCanvasProps> = ({ isReadOnly, initialImageUrl }) => {
  const [fileInfo, setFileInfo] = useState<{
    name: string;
    size: string;
    previewUrl?: string;
  } | null>(
    initialImageUrl
      ? {
          name: initialImageUrl.split('/').pop() || 'Artwork.png',
          size: 'Máy chủ',
          previewUrl: initialImageUrl,
        }
      : null,
  );
  const [scale, setScale] = useState(1);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isReadOnly && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setFileInfo({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        previewUrl: URL.createObjectURL(file),
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFileInfo({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        previewUrl: URL.createObjectURL(file),
      });
    }
  };

  return (
    <div className='flex-1 flex flex-col md:flex-row bg-[#FAF8F4] overflow-hidden'>
      {/* Left Panel: Canvas Area */}
      <div className='flex-1 flex flex-col p-6 overflow-hidden'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='font-display font-bold text-xl text-[#171717] flex items-center gap-2'>
            <ImageIcon className='w-5 h-5 text-[#3B82F6]' />
            Artwork Canvas
          </h3>
          <div className='flex items-center gap-3'>
            {isReadOnly && (
              <span className='px-2 py-1 bg-[#F3F3F3] text-[#737373] text-[10px] font-bold rounded uppercase'>
                Read-Only
              </span>
            )}
            <div className='flex bg-white border border-[#E7E7E7] rounded p-1'>
              <button
                onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
                className='p-1 hover:bg-[#F3F3F3] rounded'
              >
                <ZoomOut className='w-4 h-4 text-[#555]' />
              </button>
              <span className='text-xs font-mono px-2 py-1 flex items-center'>
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale((s) => Math.min(3, s + 0.25))}
                className='p-1 hover:bg-[#F3F3F3] rounded'
              >
                <ZoomIn className='w-4 h-4 text-[#555]' />
              </button>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type='file'
          accept='image/png,image/jpeg,image/webp'
          className='hidden'
          onChange={handleFileChange}
        />

        <div
          className={`flex-1 relative border-2 border-dashed ${fileInfo ? 'border-transparent bg-[#E0E0E0] shadow-inner' : 'border-[#D4D4D4] bg-white hover:border-[#3B82F6] hover:bg-[#EFF6FF] transition-colors cursor-pointer'} rounded-xl overflow-auto flex items-center justify-center`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => {
            if (!fileInfo && !isReadOnly) fileInputRef.current?.click();
          }}
        >
          {!fileInfo ? (
            <div className='flex flex-col items-center justify-center text-[#A3A3A3] p-6 text-center'>
              <div className='w-16 h-16 bg-[#F3F3F3] rounded-full flex items-center justify-center mb-4'>
                <UploadCloud className='w-8 h-8 text-[#555555]' />
              </div>
              <p className='font-bold text-[#171717] text-lg mb-1'>
                {isReadOnly ? 'Chưa có bản vẽ nào' : 'Kéo & Thả Bản Vẽ Vào Đây'}
              </p>
              {!isReadOnly && <p className='text-sm'>hoặc nhấp để chọn tệp từ máy tính</p>}
              <p className='text-[10px] font-mono mt-4 border border-[#E7E7E7] px-2 py-1 rounded bg-white'>
                PNG, JPG, WEBP (Tối đa 50MB)
              </p>
            </div>
          ) : (
            <div
              className='relative'
              style={{ transform: `scale(${scale})`, transition: 'transform 0.2s ease-out' }}
            >
              <div className='w-[600px] h-[800px] bg-white shadow-2xl flex flex-col items-center justify-center border border-[#E7E7E7] overflow-hidden'>
                {fileInfo.previewUrl ? (
                  <img
                    src={fileInfo.previewUrl}
                    alt={fileInfo.name}
                    className='w-full h-full object-contain'
                  />
                ) : (
                  <>
                    <ImageIcon className='w-24 h-24 text-[#D4D4D4] mb-4' />
                    <span className='font-mono text-[#A3A3A3]'>{fileInfo.name}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Tools & Layers */}
      <div className='w-full md:w-[280px] shrink-0 bg-white border-l border-[#E7E7E7] flex flex-col'>
        <div className='p-4 border-b border-[#E7E7E7] flex items-center gap-2'>
          <Layers className='w-4 h-4 text-[#3B82F6]' />
          <h4 className='font-bold text-sm uppercase tracking-wider text-[#171717]'>
            Thông Tin Bản Vẽ
          </h4>
        </div>

        {fileInfo ? (
          <div className='p-4 space-y-6'>
            <div>
              <h5 className='text-[10px] font-bold text-[#A3A3A3] uppercase mb-2'>Chi Tiết Tệp</h5>
              <div className='bg-[#F8F6F0] rounded-lg p-3 space-y-2 text-xs font-mono text-[#555555]'>
                <div className='flex justify-between'>
                  <span className='text-[#A3A3A3]'>Tên tệp</span>
                  <span className='font-bold text-[#171717] truncate max-w-[140px]'>
                    {fileInfo.name}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-[#A3A3A3]'>Dung lượng</span>
                  <span className='font-bold text-[#171717]'>{fileInfo.size}</span>
                </div>
              </div>
            </div>

            <div className='pt-4 border-t border-[#E7E7E7] flex gap-2'>
              {!isReadOnly && (
                <button
                  onClick={() => setFileInfo(null)}
                  className='w-full py-2 flex items-center justify-center gap-1.5 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#EF4444] rounded text-xs font-bold transition-colors cursor-pointer'
                  title='Xoá bản vẽ'
                >
                  <Trash2 className='w-3.5 h-3.5' /> Gỡ bản vẽ
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className='p-4 text-center text-sm text-[#A3A3A3]'>
            Chưa có tệp bản vẽ được tải lên.
          </div>
        )}
      </div>
    </div>
  );
};
