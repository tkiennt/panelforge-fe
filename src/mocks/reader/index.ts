import axiosClient from '@/api/axiosClient';
import { installReaderMockAdapter } from './mockReaderAdapter';

export { resetMockState } from './mockReaderData';

/** Gọi một lần lúc khởi động khi `isReaderMockEnabled()` (xem ./config.ts). */
export function installReaderMock(): void {
  installReaderMockAdapter(axiosClient);
}
