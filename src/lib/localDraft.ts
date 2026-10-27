// Bản nháp cục bộ cho ô văn bản lưu thủ công (Story Arc, Đề cương): giữ chữ đang gõ khi hết phiên,
// rớt mạng hoặc đóng tab. Không xoá khi đăng xuất — mục đích là khôi phục sau khi đăng nhập lại.
// Mỗi khoá gắn với id thực thể (series/chapter), nên chỉ hiện lại đúng nơi đã gõ.
export interface LocalDraft {
  text: string;
  savedAt: string; // ISO 8601
}

const PREFIX = 'pf.draft.';

export function saveDraft(key: string, text: string): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ text, savedAt: new Date().toISOString() }));
  } catch {
    // localStorage đầy / bị chặn: bỏ qua, ô nhập vẫn hoạt động bình thường
  }
}

export function readDraft(key: string): LocalDraft | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    const d = raw ? (JSON.parse(raw) as LocalDraft) : null;
    return d && typeof d.text === 'string' ? d : null;
  } catch {
    return null;
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

/** Bản nháp đáng khôi phục: tồn tại và khác nội dung đã lưu trên server. */
export function readRestorableDraft(key: string, serverText: string | null | undefined) {
  const d = readDraft(key);
  return d && d.text.trim() !== (serverText ?? '').trim() ? d : null;
}
