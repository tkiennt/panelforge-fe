import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export const ReviewView = () => {
  return (
    <div className='flex flex-col items-center justify-center h-full text-[#888888] space-y-4'>
      <CheckCircle2 className='w-16 h-16 opacity-20' />
      <h2 className='text-xl font-display font-bold text-[#171717]'>
        Trung tâm Kiểm duyệt (Review & Approve)
      </h2>
      <p className='text-sm'>Nơi Biên tập viên so sánh các phiên bản và phê duyệt bản thảo.</p>
    </div>
  );
};
