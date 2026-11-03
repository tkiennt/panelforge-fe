import React from 'react';

export const RouteFallback: React.FC = () => (
  <div
    className='flex h-full min-h-[40vh] w-full items-center justify-center gap-3 text-zinc-500 font-sans'
    role='status'
    aria-label='Loading'
  >
    <div className='w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin' />
    <span className='text-xs font-medium'>Đang tải giao diện...</span>
  </div>
);

