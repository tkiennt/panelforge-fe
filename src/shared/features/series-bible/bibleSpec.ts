import { translate } from '@/lib/i18n';

/**
 * Trường đặc tả theo danh mục Series Bible. Mỗi trường phải kiểm tra được bằng mắt trên bản vẽ
 * (Writer/Editor đối chiếu khi xác nhận WriterEndorsed, spec V2.6 §5.2). Lưu ở `detailsJson.attributes`;
 * khoá cũ (age, height, appearance, environmentType, scale, atmosphere, architecture, propType, sizeWeight,
 * material, termType, origin, colorPalette, lineArtRules) giữ nguyên để dữ liệu đã có vẫn hiện.
 */
export type SpecCategory = 'character' | 'location' | 'prop' | 'terminology' | 'style';

export interface SpecField {
  key: string;
  readonly label: string;
  readonly placeholder?: string;
  hasPlaceholder?: boolean;
  multiline?: boolean;
}

export interface SpecGroup {
  key: string;
  readonly title: string;
  fields: SpecField[];
}

const makeField = (
  key: string,
  options?: { hasPlaceholder?: boolean; multiline?: boolean },
): SpecField => ({
  key,
  hasPlaceholder: options?.hasPlaceholder,
  multiline: options?.multiline,
  get label() {
    return translate(`bible.spec.fields.${key}.label`);
  },
  get placeholder() {
    return options?.hasPlaceholder ? translate(`bible.spec.fields.${key}.placeholder`) : undefined;
  },
});

const makeGroup = (key: string, fields: SpecField[]): SpecGroup => ({
  key,
  get title() {
    return translate(`bible.spec.groups.${key}`);
  },
  fields,
});

const FORBIDDEN: SpecField = makeField('forbidden', { hasPlaceholder: true, multiline: true });

export const SPEC_SCHEMA: Record<SpecCategory, SpecGroup[]> = {
  character: [
    makeGroup('body', [
      makeField('age', { hasPlaceholder: true }),
      makeField('height', { hasPlaceholder: true }),
      makeField('build', { hasPlaceholder: true }),
    ]),
    makeGroup('face', [
      makeField('hair', { hasPlaceholder: true }),
      makeField('eyes', { hasPlaceholder: true }),
      makeField('marks', { hasPlaceholder: true }),
      makeField('appearance', { multiline: true }),
    ]),
    makeGroup('costume', [makeField('outfit', { multiline: true }), makeField('accessories')]),
    makeGroup('art', [
      makeField('inkTone', { hasPlaceholder: true }),
      makeField('expressions', { multiline: true }),
      FORBIDDEN,
    ]),
  ],
  location: [
    makeGroup('space', [
      makeField('environmentType', { hasPlaceholder: true }),
      makeField('scale', { hasPlaceholder: true }),
      makeField('atmosphere', { hasPlaceholder: true }),
    ]),
    makeGroup('fixedDetails', [
      makeField('architecture', { multiline: true }),
      makeField('layout', { hasPlaceholder: true, multiline: true }),
      makeField('cameraAngles', { hasPlaceholder: true }),
      FORBIDDEN,
    ]),
  ],
  prop: [
    makeGroup('prop', [
      makeField('propType', { hasPlaceholder: true }),
      makeField('sizeWeight', { hasPlaceholder: true }),
      makeField('material', { hasPlaceholder: true }),
      makeField('owner', { hasPlaceholder: true }),
      makeField('stateByChapter', { hasPlaceholder: true, multiline: true }),
      FORBIDDEN,
    ]),
  ],
  terminology: [
    makeGroup('terminology', [
      makeField('termType', { hasPlaceholder: true }),
      makeField('origin'),
      makeField('usage', { multiline: true }),
    ]),
  ],
  style: [
    makeGroup('style', [makeField('colorPalette'), makeField('lineArtRules', { multiline: true })]),
  ],
};

/** Bản vẽ Artist phải nộp cho mục có thiết kế hình (Model Sheet). */
export const SPEC_DELIVERABLES: Partial<Record<SpecCategory, string[]>> = {
  character: ['charTurnaround', 'charExpressions'],
  location: ['locWide', 'locClose'],
  prop: ['propMain', 'propDetail'],
};

export const specFields = (category: SpecCategory): SpecField[] =>
  SPEC_SCHEMA[category].flatMap((g) => g.fields);

/** Tỉ lệ trường đã điền, để Writer biết đặc tả đã đủ cho Artist vẽ chưa. */
export const specCompleteness = (
  category: SpecCategory,
  attributes: Record<string, unknown>,
): { filled: number; total: number } => {
  const fields = specFields(category);
  const filled = fields.filter((f) => String(attributes[f.key] ?? '').trim() !== '').length;
  return { filled, total: fields.length };
};

/** Gộp giá trị form vào attributes cũ: trường để trống bị xoá, khoá ngoài schema được giữ nguyên. */
export const mergeSpecAttributes = (
  category: SpecCategory,
  previous: Record<string, unknown>,
  values: Record<string, string>,
): Record<string, unknown> => {
  const next: Record<string, unknown> = { ...previous };
  for (const f of specFields(category)) {
    const v = (values[f.key] ?? '').trim();
    if (v) next[f.key] = v;
    else delete next[f.key];
  }
  return next;
};

/** Danh mục của BE (số hoặc tên) hoặc tab FE → nhóm schema. */
export const toSpecCategory = (category: unknown): SpecCategory => {
  const c = String(category ?? '').toLowerCase();
  if (c === '2' || c.startsWith('loc')) return 'location';
  if (c === '3' || c.startsWith('prop')) return 'prop';
  if (c === '5' || c.startsWith('style') || c.startsWith('rule')) return 'style';
  if (
    ['4', '6'].includes(c) ||
    c.startsWith('term') ||
    c.startsWith('plot') ||
    c.startsWith('lore')
  )
    return 'terminology';
  return 'character';
};

/**
 * Nhóm schema của một mục. Tab FE gộp Đạo cụ vào "terminology", nên dùng category gốc của BE nếu có,
 * hoặc cờ isVisualDesign (chỉ Nhân vật/Bối cảnh/Đạo cụ có) để nhận ra Đạo cụ.
 */
export const specCategoryOf = (
  entity: { category?: unknown; isVisualDesign?: boolean },
  rawCategory?: unknown,
): SpecCategory => {
  if (rawCategory !== undefined && rawCategory !== null) return toSpecCategory(rawCategory);
  const tab = toSpecCategory(entity.category);
  return tab === 'terminology' && entity.isVisualDesign ? 'prop' : tab;
};

export const getFieldLabel = (field: SpecField, t?: (k: string, fb?: string) => string): string => {
  if (t) return t(`bible.spec.fields.${field.key}.label`);
  return translate(`bible.spec.fields.${field.key}.label`);
};

export const getFieldPlaceholder = (
  field: SpecField,
  t?: (k: string, fb?: string) => string,
): string | undefined => {
  if (!field.hasPlaceholder) return undefined;
  if (t) return t(`bible.spec.fields.${field.key}.placeholder`);
  return translate(`bible.spec.fields.${field.key}.placeholder`);
};

export const getGroupTitle = (groupKey: string, t?: (k: string, fb?: string) => string): string => {
  if (t) return t(`bible.spec.groups.${groupKey}`);
  return translate(`bible.spec.groups.${groupKey}`);
};

export const getDeliverableLabel = (
  deliverableKey: string,
  t?: (k: string, fb?: string) => string,
): string => {
  if (t) return t(`bible.spec.deliverables.${deliverableKey}`);
  return translate(`bible.spec.deliverables.${deliverableKey}`);
};
