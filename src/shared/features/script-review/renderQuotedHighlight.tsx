import React from 'react';

/** Render văn bản có highlight đoạn trích màu vàng giống Google Docs / mẫu thiết kế */
export function renderQuotedHighlight(
  fullText: string,
  quotedText?: string | null,
): React.ReactNode {
  if (!quotedText || !quotedText.trim() || !fullText.includes(quotedText.trim())) {
    return fullText;
  }
  const needle = quotedText.trim();
  const idx = fullText.indexOf(needle);
  if (idx === -1) return fullText;

  const before = fullText.slice(0, idx);
  const match = fullText.slice(idx, idx + needle.length);
  const after = fullText.slice(idx + needle.length);

  return (
    <>
      {before}
      <mark className='bg-[#FDE047] text-stone-900 px-0.5 rounded-xs font-inherit select-text'>
        {match}
      </mark>
      {after}
    </>
  );
}
