// src/shared/utils/tempBibleCodes.ts

export interface TempBibleCodeItem {
  code: string;
  name: string;
  category: string;
  chapterId?: string;
  chapterNumber?: number;
  count: number;
  lastUsedAt: number;
}

const STORAGE_KEY = 'panelforge_temp_bible_codes';

/**
 * Loại bỏ dấu tiếng Việt để sinh mã định danh không dấu
 */
export function removeVietnameseAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Tự sinh mã định danh Bible chuẩn từ Tên thực thể:
 * Ví dụ: "Lâm Du" -> "CHR-LAM-DU"
 *        "Vân Khê" -> "LOC-VAN-KHE"
 *        "Tân Đăng" -> "PRP-TAN-DANG"
 */
export function generateTempCode(name: string, category: string = 'Character'): string {
  const cleanName = removeVietnameseAccents(name.trim())
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  let prefix = 'CHR';
  const catLower = category.toLowerCase();
  if (catLower.includes('loc') || catLower.includes('địa danh')) {
    prefix = 'LOC';
  } else if (
    catLower.includes('prop') ||
    catLower.includes('đạo cụ') ||
    catLower.includes('vật phẩm')
  ) {
    prefix = 'PRP';
  } else if (
    catLower.includes('term') ||
    catLower.includes('thuật ngữ') ||
    catLower.includes('khái niệm')
  ) {
    prefix = 'TRM';
  }

  // Nếu người dùng đã gõ sẵn prefix thì giữ nguyên
  if (/^(CHR|LOC|PRP|TRM|ENT)-/.test(cleanName)) {
    return cleanName;
  }

  return `${prefix}-${cleanName || 'MOI'}`;
}

/**
 * Lấy danh sách các mã tạm đang được dùng trong kịch bản
 */
export function getTempBibleCodes(): TempBibleCodeItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: TempBibleCodeItem[] = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Lưu hoặc tăng tần suất xuất hiện của mã tạm
 */
export function saveTempBibleCode(item: {
  code: string;
  name: string;
  category?: string;
  chapterId?: string;
  chapterNumber?: number;
}): void {
  try {
    const codes = getTempBibleCodes();
    const existingIndex = codes.findIndex((c) => c.code === item.code);
    if (existingIndex >= 0) {
      codes[existingIndex].count = (codes[existingIndex].count || 1) + 1;
      codes[existingIndex].lastUsedAt = Date.now();
      if (item.name) codes[existingIndex].name = item.name;
      if (item.chapterId) codes[existingIndex].chapterId = item.chapterId;
      if (item.chapterNumber) codes[existingIndex].chapterNumber = item.chapterNumber;
    } else {
      codes.push({
        code: item.code,
        name: item.name || item.code,
        category: item.category || 'Character',
        chapterId: item.chapterId,
        chapterNumber: item.chapterNumber,
        count: 1,
        lastUsedAt: Date.now(),
      });
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
  } catch {
    // Bỏ qua lỗi quota
  }
}

/**
 * Xóa một mã tạm khi mục đó đã được tạo chính thức trong Bible
 */
export function removeTempBibleCode(code: string): void {
  try {
    const codes = getTempBibleCodes().filter((c) => c.code !== code);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
  } catch {
    // Bỏ qua
  }
}
