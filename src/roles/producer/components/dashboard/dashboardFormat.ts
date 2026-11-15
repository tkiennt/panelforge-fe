export const CHAPTER_STATUS_STYLE: Record<string, { label: string; className: string }> = {
  PreProduction: { label: 'Tiền kỳ (viết kịch bản)', className: 'bg-stone-50 text-stone-700 border-stone-200' },
  InProduction: { label: 'Đang sản xuất', className: 'bg-blue-50 text-blue-800 border-blue-200' },
  ChapterApproved: { label: 'Đã nghiệm thu (Gate 3)', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  Approved: { label: 'Đã nghiệm thu (Gate 3)', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  HandedOffAndPublished: { label: 'Đã bàn giao & phát hành', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  Published: { label: 'Đã xuất bản', className: 'bg-purple-50 text-purple-700 border-purple-200' },
};

export const NEUTRAL_BADGE = 'bg-stone-100 text-stone-700 border-stone-200';

export const formatViDate = (dateStr?: string | null): string | null => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const clampPercent = (value: number | undefined | null): number =>
  Math.min(100, Math.max(0, value || 0));
