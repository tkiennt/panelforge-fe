import React from 'react';
import { BookOpen } from 'lucide-react';

export const ScriptView = () => {
  return (
    <div className='flex flex-col items-center justify-center h-full text-[#888888] space-y-4'>
      <BookOpen className='w-16 h-16 opacity-20' />
      <h2 className='text-xl font-display font-bold text-[#171717]'>
        Không gian Biên kịch (Script & Story)
      </h2>
      <p className='text-sm'>Nơi biên kịch viết nội dung và dùng AI phân tách khung truyện.</p>
    </div>
  );
};
