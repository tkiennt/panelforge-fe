import React from 'react';

export const ScriptEditor: React.FC = () => {
  return (
    <div className="flex-1 p-4 bg-white border border-[#E7E7E7] rounded-lg">
      <h3 className="font-serif font-bold text-[#171717] mb-4">Script Editor</h3>
      <textarea
        className="w-full h-64 p-3 border border-[#D4D4D4] rounded focus:outline-none focus:ring-1 focus:ring-[#171717]"
        placeholder="Nhập kịch bản tại đây..."
      />
      <div className="mt-4 flex justify-end">
        <button className="px-4 py-2 bg-[#8B5CF6] text-white text-sm font-bold rounded hover:bg-[#7C3AED] transition-colors">
          Gọi AI Breakdown
        </button>
      </div>
    </div>
  );
};
