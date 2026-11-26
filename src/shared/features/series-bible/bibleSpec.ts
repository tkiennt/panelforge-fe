import { translate } from '@/lib/i18n';

/**
 * Đặc tả tạo hình Series Bible V2.6:
 * - age: string? (chỉ cho Character, theo biến thể)
 * - artistNotes: string? (ghi chú ngoại hình, trang phục, nét vẽ tự do)
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
    if (key === 'age') return translate('bible.spec.fields.age.label', 'Tuổi');
    if (key === 'artistNotes')
      return translate('bible.spec.fields.artistNotes.label', 'Ghi chú cho Artist (Artist Notes)');
    return translate(`bible.spec.fields.${key}.label`, key);
  },
  get placeholder() {
    if (!options?.hasPlaceholder) return undefined;
    if (key === 'age') return translate('bible.spec.fields.age.placeholder', 'VD: 17 tuổi, 25–28');
    if (key === 'artistNotes')
      return translate(
        'bible.spec.fields.artistNotes.placeholder',
        'Mô tả ngoại hình, kiểu tóc, màu mắt, vết sẹo đặc trưng, trang phục, phong cách nét vẽ và các chi tiết cấm vẽ sai...',
      );
    return translate(`bible.spec.fields.${key}.placeholder`);
  },
});

const makeGroup = (key: string, fields: SpecField[]): SpecGroup => ({
  key,
  get title() {
    return translate(`bible.spec.groups.${key}`, 'Đặc tả tạo hình & Ghi chú');
  },
  fields,
});

export const SPEC_SCHEMA: Record<SpecCategory, SpecGroup[]> = {
  character: [
    makeGroup('notes', [
      makeField('age', { hasPlaceholder: true }),
      makeField('artistNotes', { hasPlaceholder: true, multiline: true }),
    ]),
  ],
  location: [
    makeGroup('notes', [makeField('artistNotes', { hasPlaceholder: true, multiline: true })]),
  ],
  prop: [makeGroup('notes', [makeField('artistNotes', { hasPlaceholder: true, multiline: true })])],
  terminology: [
    makeGroup('notes', [makeField('artistNotes', { hasPlaceholder: true, multiline: true })]),
  ],
  style: [
    makeGroup('notes', [makeField('artistNotes', { hasPlaceholder: true, multiline: true })]),
  ],
};

/** Đã loại bỏ SPEC_DELIVERABLES theo quy tắc nộp 01 ảnh concept duy nhất */
export const SPEC_DELIVERABLES: Partial<Record<SpecCategory, string[]>> = {};

export const LEGACY_FIELD_LABELS: Record<string, string> = {
  height: 'Chiều cao',
  build: 'Vóc dáng / Thể chất',
  hair: 'Kiểu tóc / Màu tóc',
  eyes: 'Màu mắt / Ánh mắt',
  marks: 'Vết sẹo / Dấu vết đặc trưng',
  appearance: 'Đặc điểm ngoại hình',
  outfit: 'Trang phục',
  accessories: 'Phụ kiện đi kèm',
  inkTone: 'Tông mực / Đổ bóng',
  expressions: 'Biểu cảm đặc trưng',
  forbidden: 'Lưu ý cấm kỵ / Tránh vẽ sai',
  environmentType: 'Loại bối cảnh / Môi trường',
  scale: 'Quy mô / Diện tích',
  atmosphere: 'Không khí / Bầu không khí',
  architecture: 'Kiến trúc đặc trưng',
  layout: 'Bố cục / Góc nhìn',
  cameraAngles: 'Góc máy gợi ý',
  propType: 'Loại đạo cụ',
  sizeWeight: 'Kích thước / Trọng lượng',
  material: 'Chất liệu',
  owner: 'Chủ sở hữu',
  stateByChapter: 'Biến đổi theo chương',
  termType: 'Phân loại thuật ngữ',
  origin: 'Nguồn gốc / Khái niệm',
  usage: 'Cách dùng trong thế giới',
  colorPalette: 'Bảng màu',
  lineArtRules: 'Quy chuẩn nét vẽ',
};

/**
 * Một số bản ghi cũ lưu cả DTO vào Artist Notes. Chỉ giữ phần mô tả mà người dùng
 * đã nhập; không để UUID, tên trường hay JSON kỹ thuật lọt vào Workbench.
 */
export const sanitizeArtistNotes = (value: unknown): string => {
  const note = typeof value === 'string' ? value.trim() : '';
  if (!note) return '';

  const looksLikeDtoDump = /(?:^|\s*-\s*)(?:artistNotes|Id|Name|Description|DetailsJson)\s*:/i.test(
    note,
  );
  if (!looksLikeDtoDump) return note;

  const description = note.match(
    /(?:^|\s*-\s*)Description\s*:\s*([\s\S]*?)(?=\s*-\s*(?:artistNotes|Id|Name|DetailsJson)\s*:|$)/i,
  )?.[1];

  return description?.trim() || '';
};

/**
 * Trích xuất an toàn từ dữ liệu cũ (4 nhóm hoặc attributes phẳng) sang 2 trường mới gọn nhẹ.
 */
export const parseBibleDetails = (
  rawDetailsJson?: string | null,
  rawAttributes?: Record<string, any> | null,
): { age: string; artistNotes: string } => {
  let age = '';
  let artistNotes = '';
  const bullets: string[] = [];

  const processObject = (obj: Record<string, any>) => {
    for (const [k, v] of Object.entries(obj)) {
      if (v === null || v === undefined) continue;
      const strVal = typeof v === 'string' ? v.trim() : String(v).trim();
      if (!strVal || strVal === '{}') continue;

      const lower = k.toLowerCase();
      if (lower === 'age') {
        if (!age) age = strVal;
      } else if (lower === 'artistnotes' || lower === 'artist_notes') {
        if (!artistNotes) artistNotes = sanitizeArtistNotes(strVal);
      } else if (LEGACY_FIELD_LABELS[k]) {
        bullets.push(`- ${LEGACY_FIELD_LABELS[k]}: ${strVal}`);
      } else if (typeof v === 'object' && !Array.isArray(v)) {
        processObject(v);
      }
    }
  };

  if (rawAttributes && typeof rawAttributes === 'object') {
    processObject(rawAttributes);
  }

  if (rawDetailsJson && typeof rawDetailsJson === 'string') {
    try {
      const parsed = JSON.parse(rawDetailsJson);
      if (parsed && typeof parsed === 'object') {
        processObject(parsed);
      }
    } catch {
      if (!artistNotes && rawDetailsJson.trim() !== '{}') {
        artistNotes = sanitizeArtistNotes(rawDetailsJson);
      }
    }
  }

  if (bullets.length > 0) {
    artistNotes = artistNotes ? `${artistNotes}\n\n${bullets.join('\n')}` : bullets.join('\n');
  }

  return { age, artistNotes: sanitizeArtistNotes(artistNotes) };
};

export const specFields = (category: SpecCategory): SpecField[] =>
  SPEC_SCHEMA[category].flatMap((g) => g.fields);

/** Tỉ lệ trường đã điền */
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
  if (t) return t(`bible.spec.fields.${field.key}.label`, field.label);
  return field.label;
};

export const getFieldPlaceholder = (
  field: SpecField,
  t?: (k: string, fb?: string) => string,
): string | undefined => {
  if (!field.hasPlaceholder) return undefined;
  if (t) return t(`bible.spec.fields.${field.key}.placeholder`, field.placeholder);
  return field.placeholder;
};

export const getGroupTitle = (groupKey: string, t?: (k: string, fb?: string) => string): string => {
  if (t) return t(`bible.spec.groups.${groupKey}`, 'Ghi chú & Đặc tả');
  return translate(`bible.spec.groups.${groupKey}`, 'Ghi chú & Đặc tả');
};

export const getDeliverableLabel = (
  deliverableKey: string,
  t?: (k: string, fb?: string) => string,
): string => {
  if (t) return t(`bible.spec.deliverables.${deliverableKey}`, deliverableKey);
  return translate(`bible.spec.deliverables.${deliverableKey}`, deliverableKey);
};
