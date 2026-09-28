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
}

export const ArtworkCanvas: React.FC<ArtworkCanvasProps> = ({ isReadOnly }) => {
  const [hasImage, setHasImage] = useState(false);
  const [scale, setScale] = useState(1);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isReadOnly) setHasImage(true);
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

        <div
          className={`flex-1 relative border-2 border-dashed ${hasImage ? 'border-transparent bg-[#E0E0E0] shadow-inner' : 'border-[#D4D4D4] bg-white hover:border-[#3B82F6] hover:bg-[#EFF6FF] transition-colors cursor-pointer'} rounded-xl overflow-auto flex items-center justify-center`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => {
            if (!hasImage && !isReadOnly) setHasImage(true);
          }}
        >
          {!hasImage ? (
            <div className='flex flex-col items-center justify-center text-[#A3A3A3] p-6 text-center'>
              <div className='w-16 h-16 bg-[#F3F3F3] rounded-full flex items-center justify-center mb-4'>
                <UploadCloud className='w-8 h-8 text-[#555555]' />
              </div>
              <p className='font-bold text-[#171717] text-lg mb-1'>
                {isReadOnly ? 'No Artwork Uploaded' : 'Drag & Drop Artwork Here'}
              </p>
              {!isReadOnly && <p className='text-sm'>or click to browse from your computer</p>}
              <p className='text-[10px] font-mono mt-4 border border-[#E7E7E7] px-2 py-1 rounded bg-white'>
                PSD, CLIP, PNG, JPG (Max 50MB)
              </p>
            </div>
          ) : (
            <div
              className='relative'
              style={{ transform: `scale(${scale})`, transition: 'transform 0.2s ease-out' }}
            >
              <div className='w-[600px] h-[800px] bg-white shadow-2xl flex flex-col items-center justify-center border border-[#E7E7E7]'>
                <ImageIcon className='w-24 h-24 text-[#D4D4D4] mb-4' />
                <span className='font-mono text-[#A3A3A3]'>Manga_Panel_Draft.png</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Tools & Layers */}
      <div className='w-full md:w-[280px] shrink-0 bg-white border-l border-[#E7E7E7] flex flex-col'>
        <div className='p-4 border-b border-[#E7E7E7] flex items-center gap-2'>
          <Layers className='w-4 h-4 text-[#3B82F6]' />
          <h4 className='font-bold text-sm uppercase tracking-wider text-[#171717]'>Asset Info</h4>
        </div>

        {hasImage ? (
          <div className='p-4 space-y-6'>
            <div>
              <h5 className='text-[10px] font-bold text-[#A3A3A3] uppercase mb-2'>File Details</h5>
              <div className='bg-[#F8F6F0] rounded-lg p-3 space-y-2 text-xs font-mono text-[#555555]'>
                <div className='flex justify-between'>
                  <span className='text-[#A3A3A3]'>Resolution</span>
                  <span className='font-bold text-[#171717]'>3508 x 4960</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-[#A3A3A3]'>DPI</span>
                  <span className='font-bold text-[#171717]'>600</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-[#A3A3A3]'>Size</span>
                  <span className='font-bold text-[#171717]'>12.4 MB</span>
                </div>
              </div>
            </div>

            <div>
              <h5 className='text-[10px] font-bold text-[#A3A3A3] uppercase mb-2'>
                Digital Signature
              </h5>
              <div className='flex items-start gap-2 bg-[#ECFCCB] border border-[#BEF264] p-3 rounded-lg'>
                <ShieldCheck className='w-4 h-4 text-[#65A30D] shrink-0 mt-0.5' />
                <div>
                  <p className='text-[10px] font-bold text-[#4D7C0F] leading-tight'>
                    SHA-256 HASH VERIFIED
                  </p>
                  <p className='text-[9px] font-mono text-[#65A30D] mt-1 break-all'>
                    e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                  </p>
                </div>
              </div>
            </div>

            <div className='pt-4 border-t border-[#E7E7E7] flex gap-2'>
              <button className='flex-1 py-2 flex items-center justify-center gap-1.5 bg-[#F3F3F3] hover:bg-[#E7E7E7] rounded text-xs font-bold transition-colors'>
                <Download className='w-3.5 h-3.5' /> Download
              </button>
              {!isReadOnly && (
                <button
                  onClick={() => setHasImage(false)}
                  className='p-2 flex items-center justify-center bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#EF4444] rounded transition-colors'
                >
                  <Trash2 className='w-3.5 h-3.5' />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className='p-4 text-center text-sm text-[#A3A3A3]'>
            No asset loaded. Upload an image to view details.
          </div>
        )}
      </div>
    </div>
  );
};
