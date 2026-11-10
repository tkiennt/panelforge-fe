import React from 'react';

export interface ArtistDeskViewProps {
  workspaceRole?: string | null;
}

/**
 * ArtistDeskView - Minimal Primitive Shell
 * Giao diện bàn vẽ Artist ở trạng thái sơ khai nhất:
 * Chỉ có main shell và trang giấy trắng ở trung tâm (không header, không sidetab, không bottom dock).
 * Sẵn sàng để xây dựng lại kiến trúc từ đầu.
 */
export const ArtistDeskView: React.FC<ArtistDeskViewProps> = () => {
  return (
    <div
      className='flex-1 basis-0 min-h-0 w-full h-full flex flex-col items-center justify-center bg-[#F3F0E9] dark:bg-[#121214] overflow-auto p-6 sm:p-10 select-none relative'
      data-testid='artist-desk'
    >
      {/* Khung bàn vẽ trung tâm - Main Canvas Shell */}
      <main
        className='relative flex items-center justify-center w-full h-full'
        data-testid='artist-canvas-shell'
      >
        {/* Trang giấy trắng tinh bản vẽ chuẩn Manga (Tỷ lệ B5 Master 1:1.414) */}
        <div
          data-testid='artist-blank-sheet'
          className='w-full max-w-[580px] aspect-[1/1.414] bg-white rounded-xs shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-[#E7E2D6] relative flex flex-col items-center justify-center p-8 transition-shadow hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)]'
        >
          {/* Vùng vẽ trang giấy trắng (Empty Canvas Surface) */}
          <div
            className='w-full h-full border border-dashed border-[#D8D2C5]/60 rounded-xs flex flex-col items-center justify-center relative'
            data-testid='artist-canvas-surface'
          >
            {/* Dấu định vị góc vẽ (Registration Crop Marks) tinh tế */}
            <div className='absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#D8D2C5]/80 pointer-events-none' />
            <div className='absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#D8D2C5]/80 pointer-events-none' />
            <div className='absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#D8D2C5]/80 pointer-events-none' />
            <div className='absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#D8D2C5]/80 pointer-events-none' />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ArtistDeskView;
