export type EntityCategory = 'character' | 'location' | 'prop' | 'rule';
export type BibleCategory =
  | 'all'
  | 'characters'
  | 'locations'
  | 'terminology'
  | 'style'
  | 'character'
  | 'location'
  | 'prop'
  | 'rule';

export interface BibleEntityRevision {
  version: string;
  date: string;
  summary: string;
  details: string;
  author: string;
  sha: string;
  isActive: boolean;
}

export interface BibleEntity {
  id: string;
  code: string;
  name: string;
  category: BibleCategory | EntityCategory;
  categoryLabel?: string;
  badgeColor?: string;
  roleOrType?: string;
  subtitle?: string;
  description: string;
  tags?: string[];
  negativeConstraints?: string[];
  referenceCut?: string;
  modelAnchor?: string;
  affiliationOrSpec?: string;
  renderSpec?: string;
  imageUrl?: string;
  iconName?: string;
  isVectorized?: boolean;
  priority?: 'High (Strict Check)' | 'Standard' | 'Low';
  revisions?: BibleEntityRevision[];
  enforcedByAi?: boolean;
  ruleNumber?: string;
  strictCheck?: boolean;
  anchorLink?: string;
  guardrailNote?: string;
  referencesCount?: number;
  loraWeight?: number;
  modelVersion?: string;
  continuityMatch?: number;
  status?: string;
  colors?: string[];
  isLocked?: boolean;
  lockedAt?: string | null;
  gallery?: Array<{ url: string; label?: string; sha256?: string }>;
  attributes?: Record<string, any>;
}
