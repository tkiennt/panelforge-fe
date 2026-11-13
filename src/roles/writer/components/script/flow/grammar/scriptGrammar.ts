// src/roles/writer/components/script/flow/grammar/scriptGrammar.ts
/**
 * Luật gõ kịch bản Graphic Novel, đo trực tiếp trên WriterSolo (template Graphic Novel, 2026-11-13).
 * Hàm thuần, không phụ thuộc TipTap, để test riêng và làm nguồn sự thật duy nhất cho keymap.
 */

export type GnElement =
  'page' | 'panel' | 'action' | 'character' | 'parens' | 'dialogue' | 'caption' | 'sfx';

/** Thứ tự nút trên thanh loại dòng (cũng là thứ tự phím tắt Ctrl+1..8). */
export const GN_ELEMENTS: readonly GnElement[] = [
  'page',
  'panel',
  'action',
  'character',
  'parens',
  'dialogue',
  'caption',
  'sfx',
];

/** Kết quả của một phím: đổi loại dòng hiện tại, hoặc chèn dòng mới bên dưới. */
export type GnMove =
  { op: 'morph'; to: GnElement } | { op: 'insert'; to: GnElement } | { op: 'none' };

/**
 * Enter. WriterSolo luôn tạo dòng mới (kể cả khi dòng đang trống):
 * Page → Panel → Action → Action; Character → Dialogue; Parens → Dialogue; Dialogue / Caption / SFX → Action.
 */
export function onEnter(el: GnElement): GnMove {
  switch (el) {
    case 'page':
      return { op: 'insert', to: 'panel' };
    case 'character':
    case 'parens':
      return { op: 'insert', to: 'dialogue' };
    default:
      return { op: 'insert', to: 'action' };
  }
}

/**
 * Tab.
 * - Dòng trống: đổi loại dòng tại chỗ (Page → Action, Panel / Action / Caption / SFX → Character,
 *   Character → Action, Dialogue → Parens, Parens → Dialogue).
 * - Dòng có chữ: chèn dòng mới bên dưới (Action / Panel / Caption / SFX → Character, Dialogue → Parens,
 *   Character / Parens → Dialogue, Page → Action).
 *
 * WriterSolo còn xoay qua Transition và Scene heading của chế độ screenplay; hai loại này không có trong
 * mô hình dữ liệu truyện tranh nên bỏ khỏi vòng.
 */
export function onTab(el: GnElement, isEmpty: boolean): GnMove {
  if (isEmpty) {
    switch (el) {
      case 'page':
      case 'character':
        return { op: 'morph', to: 'action' };
      case 'dialogue':
        return { op: 'morph', to: 'parens' };
      case 'parens':
        return { op: 'morph', to: 'dialogue' };
      default:
        return { op: 'morph', to: 'character' };
    }
  }
  switch (el) {
    case 'page':
      return { op: 'insert', to: 'action' };
    case 'dialogue':
      return { op: 'insert', to: 'parens' };
    case 'character':
    case 'parens':
      return { op: 'insert', to: 'dialogue' };
    default:
      return { op: 'insert', to: 'character' };
  }
}

/** Shift+Tab: chiều ngược của Tab trên dòng trống; dòng có chữ giữ nguyên. */
export function onShiftTab(el: GnElement, isEmpty: boolean): GnMove {
  if (!isEmpty) return { op: 'none' };
  switch (el) {
    case 'character':
      return { op: 'morph', to: 'action' };
    case 'action':
      return { op: 'morph', to: 'character' };
    case 'parens':
      return { op: 'morph', to: 'dialogue' };
    case 'dialogue':
      return { op: 'morph', to: 'parens' };
    default:
      return { op: 'none' };
  }
}

/** Gợi ý tên nhân vật kiểu WriterSolo: tên đã dùng trong kịch bản, khớp tiền tố, không phân biệt hoa thường. */
export function completeCharacterName(
  prefix: string,
  knownNames: readonly string[],
): string | null {
  const p = prefix.trim().toUpperCase();
  if (!p) return null;
  const match = knownNames.find((n) => n.length > p.length && n.toUpperCase().startsWith(p));
  return match ? match.toUpperCase() : null;
}

/** Hậu tố Parens biến lời thoại thành Suy nghĩ (Thought). */
export function isThoughtParens(parens: string | null | undefined): boolean {
  return /^\s*\(?\s*(nghĩ|suy nghĩ|thought|thinking|thinks)\s*\)?\s*$/i.test(parens ?? '');
}
