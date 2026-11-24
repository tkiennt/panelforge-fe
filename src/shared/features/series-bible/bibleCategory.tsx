import React from 'react';
import { BookOpen, User, MapPin, BookMarked, Palette, ShieldCheck } from 'lucide-react';
import type { BibleCategory } from '@/types';
import { translate } from '@/lib/i18n';

export const CATEGORIES: {
  key: string;
  labelKey: string;
  readonly label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  {
    key: 'all',
    labelKey: 'bible.categories.all',
    get label() {
      return translate('bible.categories.all');
    },
    icon: BookOpen,
  },
  {
    key: 'review',
    labelKey: 'bible.categories.review',
    get label() {
      return translate('bible.categories.review');
    },
    icon: ShieldCheck,
  },
  {
    key: 'characters',
    labelKey: 'bible.categories.characters',
    get label() {
      return translate('bible.categories.characters');
    },
    icon: User,
  },
  {
    key: 'locations',
    labelKey: 'bible.categories.locations',
    get label() {
      return translate('bible.categories.locations');
    },
    icon: MapPin,
  },
  {
    key: 'terminology',
    labelKey: 'bible.categories.terminology',
    get label() {
      return translate('bible.categories.terminology');
    },
    icon: BookMarked,
  },
  {
    key: 'style',
    labelKey: 'bible.categories.style',
    get label() {
      return translate('bible.categories.style');
    },
    icon: Palette,
  },
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

export const getCategoryLabel = (
  category: string | number,
  t?: (key: string) => string,
): string => {
  const resolve = (key: string) => (t ? t(key) : translate(key));
  const catStr = String(category).toLowerCase();
  switch (catStr) {
    case 'characters':
    case 'character':
    case '0':
    case '1':
      return resolve('bible.categories.character');
    case 'locations':
    case 'location':
    case '2':
      return resolve('bible.categories.location');
    case 'terminology':
    case 'prop':
    case '3':
    case '4':
    case '6':
      return resolve('bible.categories.terminology');
    case 'style':
    case 'rule':
    case '5':
      return resolve('bible.categories.style');
    default:
      return resolve('bible.categories.knowledgeItem');
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
