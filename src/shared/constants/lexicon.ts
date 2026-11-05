/**
 * PanelForge System Domain Lexicon & Contextual Copywriting Standard.
 * 
 * Enforces two-tier contextual layering:
 * 1. Creative Viewport (Writer, Artist, Letterer): Focus on story, art, dialogue, pacing.
 * 2. Governance / Provenance Viewport (Editor, Producer, Admin): Preserves W3C PROV, CAS SHA-256 chips, and Canon Lock invariants.
 */

export type UILanguageContext = 'creative' | 'governance';

export const DOMAIN_LEXICON = {
  creative: {
    // Integrity & Storage
    contentHash: 'Mã toàn vẹn',
    originalImage: 'Ảnh gốc',
    storageCode: 'Mã lưu trữ',
    
    // Canon & Locking (BR-01, BR-07)
    canonLocked: '🔒 Đã khóa chuẩn',
    supersedeRevision: 'Tạo bản chuẩn mới',
    supersedeExplanation: 'Tạo phiên bản kế thừa tiếp theo mà không ghi đè bản gốc đã khóa chuẩn.',
    
    // Versioning & Sync
    versionVector: 'Mốc đồng bộ',
    effectiveFromChapter: (ch: number) => `Áp dụng từ Ch. ${ch}`,
    
    // Workflow & Assignments
    carveOutAssignment: 'Tách giao việc riêng',
    changeRequest: 'Yêu cầu chỉnh sửa',
    
    // Editorial & Consistency
    consistencyFinding: 'Lỗi rà soát',
    staleDialogue: 'Lời thoại đã đổi',
    staleAction: 'Cập nhật theo kịch bản',
    
    // Canvas & Layout
    frameTemplate: 'Mẫu khung trang',
    compositePage: 'Trang dựng hoàn chỉnh',
  },
  governance: {
    // Integrity & Storage (CAS W3C PROV)
    contentHash: 'Mã băm SHA-256 (CAS)',
    originalImage: 'Bản vẽ chính thức',
    storageCode: 'Định danh đối tượng (ID)',
    
    // Canon & Locking (BR-01, BR-07)
    canonLocked: '🔒 Canon Locked (Bất biến)',
    supersedeRevision: 'Thay thế bản khóa (Supersede)',
    supersedeExplanation: 'Kích hoạt phiên bản sửa đổi v(N+1) bảo toàn chuỗi lịch sử nguồn gốc.',
    
    // Versioning & Sync
    versionVector: 'Phiên bản đồng thời (Version Vector)',
    effectiveFromChapter: (ch: number) => `Hiệu lực mốc chương Ch. ${ch} (BR-15)`,
    
    // Workflow & Assignments
    carveOutAssignment: 'Ủy thác khung độc lập (Carve-out)',
    changeRequest: 'Yêu cầu sửa đổi (Change Request)',
    
    // Editorial & Consistency
    consistencyFinding: 'Lỗi bất nhất (Consistency Finding)',
    staleDialogue: 'Sai lệch văn bản (Stale Dialogue)',
    staleAction: 'Đồng bộ lại lời thoại kịch bản',
    
    // Canvas & Layout
    frameTemplate: 'Khung lưới toạ độ (Frame Layout)',
    compositePage: 'Bản ghép Composite 1200×1800',
  },
} as const;

/**
 * System Error Code UX Copy Mapping.
 * Translates backend domain error codes into 3-part structured user notifications:
 * [Nguyên nhân / Tình trạng] + [Giải thích ngắn] + [Chỉ dẫn hành động]
 */
export const SYSTEM_ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  // 409 Race Condition & Version Conflicts
  'ELEMENT_VERSION_CONFLICT': {
    title: 'Xung đột phiên bản đồng thời',
    description: 'Đã có chỉnh sửa mới hơn trên máy chủ; vui lòng làm mới hoặc chọn phương án xử lý an toàn.',
  },
  'BLOCKING_FINDINGS_EXIST': {
    title: 'Chưa thể phê duyệt chương',
    description: 'Còn lỗi bất nhất mức Chặn (Blocking) chưa xử lý. Vui lòng rà soát lại kịch bản hoặc bản vẽ.',
  },
  'CHARACTER_NOT_LOCKED': {
    title: 'Thiết lập chưa khóa chuẩn',
    description: 'Nhân vật chưa có bản thiết kế Canon được khóa duyệt. Hãy hoàn thiện trước khi đưa vào sản xuất.',
  },
  'SCRIPT_FROZEN': {
    title: 'Kịch bản đã đóng băng',
    description: 'Chương truyện này đã chuyển sang giai đoạn vẽ, kịch bản được niêm phong để tránh sai lệch.',
  },
  'CANON_LOCKED_CANNOT_MODIFY': {
    title: 'Thiết kế đã khóa chuẩn (Canon)',
    description: 'Không thể chỉnh sửa đè lên thiết kế đã khóa chuẩn. Vui lòng dùng lệnh "Thay thế bản khóa (Supersede)".',
  },
};

/**
 * Format dynamic entity short ID for clean UI representation (<= 10 chars).
 */
export function formatShortId(id?: string | null): string {
  if (!id) return '—';
  const clean = id.trim();
  if (clean.length <= 8) return `#${clean}`;
  return `#${clean.slice(0, 8)}`;
}

/**
 * Format CAS SHA-256 hash for governance compact chips (ab7f...3c9d).
 */
export function formatShortHash(hash?: string | null, prefixLen = 4, suffixLen = 4): string {
  if (!hash) return '—';
  const clean = hash.trim();
  if (clean.length <= prefixLen + suffixLen + 3) return clean;
  return `${clean.slice(0, prefixLen)}...${clean.slice(-suffixLen)}`;
}

/**
 * Helper to get contextual lexicon based on role.
 */
export function getContextualLexicon(role?: string | null): typeof DOMAIN_LEXICON.creative | typeof DOMAIN_LEXICON.governance {
  const norm = (role || '').toUpperCase();
  if (['EDITOR', 'PRODUCER', 'ADMIN', 'ADMINISTRATOR', 'LEAD', 'PUBLISHER'].includes(norm)) {
    return DOMAIN_LEXICON.governance;
  }
  return DOMAIN_LEXICON.creative;
}
