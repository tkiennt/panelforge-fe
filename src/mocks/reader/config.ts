// Công tắc chế độ dữ liệu mẫu của khu độc giả (test UI khi chưa có BE).
// Bật: VITE_READER_MOCK=true, hoặc mở bất kỳ trang nào với `?mock=1` (nhớ trong localStorage). Tắt: `?mock=0`.
const FLAG_KEY = 'pf_reader_mock';

export function syncReaderMockFlagFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const value = new URLSearchParams(window.location.search).get('mock');
    if (value === '1') localStorage.setItem(FLAG_KEY, '1');
    if (value === '0') localStorage.removeItem(FLAG_KEY);
  } catch {
    // localStorage bị chặn: chỉ còn biến môi trường quyết định.
  }
}

export function isReaderMockEnabled(): boolean {
  if (import.meta.env.VITE_READER_MOCK === 'true') return true;
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

/** Tắt chế độ dữ liệu mẫu rồi tải lại trang để gọi API thật. */
export function disableReaderMock(): void {
  try {
    localStorage.removeItem(FLAG_KEY);
  } catch {
    // bỏ qua
  }
  const url = new URL(window.location.href);
  url.searchParams.delete('mock');
  window.location.replace(url.toString());
}
