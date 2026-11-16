/**
 * Điểm import dùng chung cho kiểu chữ bóng thoại (Artist Desk + Letterer Desk + trình ghép trang).
 * Nguồn thật vẫn ở roles/letterer/lib; role khác import qua đây để không import chéo role.
 */
export * from '@/roles/letterer/lib/textStyle';
export { MIN_LETTERING_FONT_PX } from '@/roles/letterer/lib/lettererView';
