import React from 'react';
import { BookOpen, User, MapPin, BookMarked, Palette } from 'lucide-react';
import type { BibleCategory } from '@/types';

export const CATEGORIES: {
  key: string;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { key: 'all', label: 'Tất cả', icon: BookOpen },
  { key: 'characters', label: 'Nhân vật', icon: User },
  { key: 'locations', label: 'Bối cảnh & Địa điểm', icon: MapPin },
  { key: 'terminology', label: 'Thuật ngữ & Đạo cụ', icon: BookMarked },
  { key: 'style', label: 'Quy tắc mỹ thuật', icon: Palette },
];

export const mapCategoryToTab = (cat: any): BibleCategory => {
  if (typeof cat === 'string') {
    const s = cat.toLowerCase();
    if (s.includes('char')) return 'characters';
    if (s.includes('loc')) return 'locations';
    if (s.includes('style') || s.includes('rule')) return 'style';
    if (s.includes('prop') || s.includes('term') || s.includes('plot') || s.includes('lore'))
      return 'terminology';
  }
  switch (Number(cat)) {
    case 0:
    case 1:
      return 'characters';
    case 2:
      return 'locations';
    case 3:
    case 4:
    case 6:
      return 'terminology';
    case 5:
      return 'style';
    default:
      return 'characters';
  }
};

export const getCategoryLabel = (category: string | number): string => {
  const catStr = String(category).toLowerCase();
  switch (catStr) {
    case 'characters':
    case 'character':
    case '0':
    case '1':
      return 'Nhân vật';
    case 'locations':
    case 'location':
    case '2':
      return 'Bối cảnh & Địa điểm';
    case 'terminology':
    case 'prop':
    case '3':
    case '4':
    case '6':
      return 'Thuật ngữ & Đạo cụ';
    case 'style':
    case 'rule':
    case '5':
      return 'Quy tắc mỹ thuật';
    default:
      return 'Mục tri thức';
  }
};

export const getCategoryBadgeStyle = (category: string | number): string => {
  const catStr = String(category).toLowerCase();
  if (catStr.includes('char') || catStr === '1' || catStr === '0') {
    return 'bg-amber-50 text-amber-800 border-amber-300';
  }
  if (catStr.includes('loc') || catStr === '2') {
    return 'bg-emerald-50 text-emerald-800 border-emerald-300';
  }
  if (catStr.includes('term') || catStr.includes('prop') || ['3', '4', '6'].includes(catStr)) {
    return 'bg-blue-50 text-blue-800 border-blue-300';
  }
  if (catStr.includes('style') || catStr.includes('rule') || catStr === '5') {
    return 'bg-stone-100 text-stone-800 border-stone-300';
  }
  return 'bg-stone-50 text-stone-700 border-stone-200';
};

export const getCategoryIcon = (category: string, className = 'w-4 h-4') => {
  switch (category) {
    case 'characters':
    case 'character':
      return <User className={className} />;
    case 'locations':
    case 'location':
      return <MapPin className={className} />;
    case 'terminology':
    case 'prop':
      return <BookMarked className={className} />;
    case 'style':
    case 'rule':
      return <Palette className={className} />;
    default:
      return <BookOpen className={className} />;
  }
};

/** Category gốc của BE có vòng đời thiết kế hình & khoá Canon (BibleEntry.IsVisualDesign: Character, Location, Prop). */
export const isVisualDesignCategory = (category: unknown): boolean => {
  const s = String(category ?? '').toLowerCase();
  return ['0', '1', '2', '3'].includes(s) || /^(char|loc|prop)/.test(s);
};
