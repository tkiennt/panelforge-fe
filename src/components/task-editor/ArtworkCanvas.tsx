import React from 'react';

export const ArtworkCanvas: React.FC = () => {
  return (
    <div className="flex-1 p-4 bg-white border border-[#E7E7E7] rounded-lg flex flex-col">
      <h3 className="font-serif font-bold text-[#171717] mb-4">Artwork Canvas</h3>
      <div className="flex-1 border-2 border-dashed border-[#D4D4D4] rounded-xl flex items-center justify-center bg-[#F9F9F9]">
        <div className="text-center">
          <p className="text-[#737373] text-sm mb-2">Kéo thả file ảnh vào đây, hoặc click để upload</p>
          <button className="px-4 py-2 bg-[#171717] text-white text-sm font-bold rounded hover:bg-[#404040] transition-colors">
            Upload File (SHA-256 Hashing)
          </button>
        </div>
      </div>
    </div>
  );
};
