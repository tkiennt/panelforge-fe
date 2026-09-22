import React from 'react';

export const LetteringWorkspace: React.FC = () => {
  return (
    <div className="flex-1 p-4 bg-white border border-[#E7E7E7] rounded-lg flex flex-col">
      <h3 className="font-serif font-bold text-[#171717] mb-4">Lettering Workspace</h3>
      <div className="flex-1 border border-[#D4D4D4] rounded-xl relative overflow-hidden bg-[#F3F3F3]">
        {/* Placeholder for canvas */}
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-[#A3A3A3] text-sm">Canvas chèn Text / Balloon (Có cảnh báo Overflow)</p>
        </div>
      </div>
    </div>
  );
};
