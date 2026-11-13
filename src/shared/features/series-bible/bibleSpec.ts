/**
 * Trường đặc tả theo danh mục Series Bible. Mỗi trường phải kiểm tra được bằng mắt trên bản vẽ
 * (Writer/Editor đối chiếu khi xác nhận WriterEndorsed, spec V2.6 §5.2). Lưu ở `detailsJson.attributes`;
 * khoá cũ (age, height, appearance, environmentType, scale, atmosphere, architecture, propType, sizeWeight,
 * material, termType, origin, colorPalette, lineArtRules) giữ nguyên để dữ liệu đã có vẫn hiện.
 */
export type SpecCategory = 'character' | 'location' | 'prop' | 'terminology' | 'style';

export interface SpecField {
  key: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
}

export interface SpecGroup {
  title: string;
  fields: SpecField[];
}

const FORBIDDEN: SpecField = {
  key: 'forbidden',
  label: 'Không được vẽ',
  placeholder: 'Những điểm Artist tuyệt đối tránh, vd. không có râu, không đeo kính',
  multiline: true,
};

export const SPEC_SCHEMA: Record<SpecCategory, SpecGroup[]> = {
  character: [
    {
      title: 'Hình thể',
      fields: [
        { key: 'age', label: 'Độ tuổi', placeholder: 'vd. 17' },
        { key: 'height', label: 'Chiều cao', placeholder: 'vd. 168 cm' },
        { key: 'build', label: 'Dáng người', placeholder: 'vd. gầy, vai hẹp' },
      ],
    },
    {
      title: 'Khuôn mặt & nhận dạng',
      fields: [
        { key: 'hair', label: 'Kiểu tóc', placeholder: 'vd. tóc ngắn rối, mái lệch trái' },
        { key: 'eyes', label: 'Mắt', placeholder: 'vd. mắt một mí, đuôi xếch' },
        { key: 'marks', label: 'Đặc điểm nhận dạng', placeholder: 'Sẹo, nốt ruồi, kính...' },
        { key: 'appearance', label: 'Diện mạo tổng quát', multiline: true },
      ],
    },
    {
      title: 'Trang phục',
      fields: [
        { key: 'outfit', label: 'Trang phục mặc định', multiline: true },
        { key: 'accessories', label: 'Phụ kiện luôn mang' },
      ],
    },
    {
      title: 'Mỹ thuật',
      fields: [
        {
          key: 'inkTone',
          label: 'Tông đen trắng / screentone',
          placeholder: 'vd. tóc tô đen, áo screentone 30%',
        },
        { key: 'expressions', label: 'Biểu cảm & tư thế đặc trưng', multiline: true },
        FORBIDDEN,
      ],
    },
  ],
  location: [
    {
      title: 'Không gian',
      fields: [
        {
          key: 'environmentType',
          label: 'Loại không gian',
          placeholder: 'vd. tiệm sửa đồng hồ, trong nhà',
        },
        { key: 'scale', label: 'Quy mô', placeholder: 'vd. 20 m², trần thấp' },
        {
          key: 'atmosphere',
          label: 'Thời điểm & ánh sáng',
          placeholder: 'vd. chiều mưa, đèn vàng',
        },
      ],
    },
    {
      title: 'Chi tiết cố định',
      fields: [
        { key: 'architecture', label: 'Kiến trúc & vật cố định', multiline: true },
        {
          key: 'layout',
          label: 'Bố trí / sơ đồ',
          placeholder: 'Cửa ở đâu, quầy ở đâu',
          multiline: true,
        },
        {
          key: 'cameraAngles',
          label: 'Góc máy chuẩn',
          placeholder: 'vd. toàn cảnh từ cửa, cận quầy',
        },
        FORBIDDEN,
      ],
    },
  ],
  prop: [
    {
      title: 'Đạo cụ',
      fields: [
        { key: 'propType', label: 'Loại đạo cụ', placeholder: 'vd. chìa khoá, vũ khí' },
        {
          key: 'sizeWeight',
          label: 'Kích thước so với người',
          placeholder: 'vd. dài bằng bàn tay',
        },
        { key: 'material', label: 'Chất liệu', placeholder: 'vd. bạc, gỉ ở răng' },
        { key: 'owner', label: 'Chủ sở hữu', placeholder: 'Mã nhân vật, vd. AN' },
        {
          key: 'stateByChapter',
          label: 'Trạng thái theo chương',
          placeholder: 'vd. gãy từ Ch.12',
          multiline: true,
        },
        FORBIDDEN,
      ],
    },
  ],
  terminology: [
    {
      title: 'Thuật ngữ',
      fields: [
        { key: 'termType', label: 'Phân loại', placeholder: 'vd. địa danh, chiêu thức' },
        { key: 'origin', label: 'Nguồn gốc' },
        { key: 'usage', label: 'Cách dùng trong thoại', multiline: true },
      ],
    },
  ],
  style: [
    {
      title: 'Quy tắc mỹ thuật',
      fields: [
        { key: 'colorPalette', label: 'Tông / screentone' },
        { key: 'lineArtRules', label: 'Quy tắc nét', multiline: true },
      ],
    },
  ],
};

/** Bản vẽ Artist phải nộp cho mục có thiết kế hình (Model Sheet). */
export const SPEC_DELIVERABLES: Partial<Record<SpecCategory, string[]>> = {
  character: ['Turnaround trước / nghiêng / sau', 'Bảng biểu cảm chính'],
  location: ['Toàn cảnh (wide shot)', 'Cận cảnh chi tiết cố định'],
  prop: ['Hình chính', 'Cận chi tiết / chất liệu'],
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
