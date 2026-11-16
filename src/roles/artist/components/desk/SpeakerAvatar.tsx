import React, { useState } from 'react';

/** Ảnh đại diện người nói (Series Bible); không có ảnh hoặc ảnh lỗi thì hiện chữ cái đầu trên nền màu nhân vật. */
export const SpeakerAvatar: React.FC<{
  name?: string;
  color?: string;
  url?: string;
  size?: number;
  testId?: string;
}> = ({ name, color, url, size = 40, testId }) => {
  const [failed, setFailed] = useState(false);
  if (url && !failed) {
    return (
      <img
        src={url}
        alt=''
        data-testid={testId}
        onError={() => setFailed(true)}
        className='rounded-full object-cover border border-stone-200 shrink-0'
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden='true'
      className='rounded-full text-white font-bold flex items-center justify-center shrink-0'
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        backgroundColor: color || '#78716C',
      }}
    >
      {(name || '?').charAt(0).toUpperCase()}
    </span>
  );
};
