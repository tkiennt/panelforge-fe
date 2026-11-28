/**
 * Helper tính toán chỉ số RPM (Revenue Per Mille - Doanh thu trên 1.000 lượt đọc).
 */

/**
 * Tính Doanh thu / 1.000 lượt đọc (RPM) cho một chương hoặc thực thể:
 * views > 0 ? Math.round((revenueVnd / views) * 1000) : 0
 */
export function calculateRpm(revenueVnd: number, views: number): number {
  if (!Number.isFinite(views) || views <= 0 || !Number.isFinite(revenueVnd) || revenueVnd <= 0) {
    return 0;
  }
  return Math.round((revenueVnd / views) * 1000);
}
