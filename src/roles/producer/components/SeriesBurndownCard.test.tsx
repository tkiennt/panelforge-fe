import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SeriesBurndownCard } from './SeriesBurndownCard';
import type { BurndownPointDto } from '@/services/series.service';

describe('SeriesBurndownCard Component', () => {
  it('hiển thị skeleton khi đang tải (loading = true)', () => {
    const { container } = render(<SeriesBurndownCard loading={true} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('hiển thị trạng thái chưa có dữ liệu lịch sử khi burndown rỗng hoặc null', () => {
    render(<SeriesBurndownCard burndown={[]} />);
    expect(
      screen.getByText('Chưa có dữ liệu lịch sử trong khoảng thời gian này'),
    ).toBeInTheDocument();
    expect(screen.getByText('Còn: —')).toBeInTheDocument();
  });

  it('xử lý trường hợp chỉ có 1 mốc dữ liệu duy nhất mà không vẽ đường dốc giả', () => {
    const singleData: BurndownPointDto[] = [{ date: '2026-10-18', remaining: 12 }];
    render(<SeriesBurndownCard burndown={singleData} />);

    expect(screen.getByText('Còn: 12 việc')).toBeInTheDocument();
    expect(screen.getByText(/Chỉ có 1 mốc dữ liệu ghi nhận/i)).toBeInTheDocument();
    expect(screen.getByText('Khởi tạo')).toBeInTheDocument();
  });

  it('xử lý trường hợp toàn bộ mốc dữ liệu bằng 0 (đã hoàn tất mọi việc)', () => {
    const allZeroData: BurndownPointDto[] = [
      { date: '2026-10-10', remaining: 0 },
      { date: '2026-10-12', remaining: 0 },
      { date: '2026-10-15', remaining: 0 },
    ];
    render(<SeriesBurndownCard burndown={allZeroData} />);

    expect(screen.getByText('Còn: 0 việc')).toBeInTheDocument();
    expect(
      screen.getByText(/Tất cả các công việc trong giai đoạn này đã được hoàn tất phê duyệt/i),
    ).toBeInTheDocument();
    // Không hiển thị empty state
    expect(
      screen.queryByText('Chưa có dữ liệu lịch sử trong khoảng thời gian này'),
    ).not.toBeInTheDocument();
  });

  it('hiển thị đầy đủ thông số đầu kỳ, cuối kỳ, biến động giảm và bảng chi tiết', () => {
    const multiData: BurndownPointDto[] = [
      { date: '2026-10-01', remaining: 25 },
      { date: '2026-10-04', remaining: 18 },
      { date: '2026-10-07', remaining: 7 },
    ];
    render(<SeriesBurndownCard burndown={multiData} />);

    // Header & Badge
    expect(screen.getByText('Công việc còn lại theo thời gian')).toBeInTheDocument();
    expect(screen.getByText('(Biểu Đồ Burndown)')).toBeInTheDocument();
    expect(screen.getByText('Toàn bộ bộ truyện · Số công việc chưa hoàn tất')).toBeInTheDocument();
    expect(screen.getByText('Còn: 7 việc')).toBeInTheDocument();

    // Summary row
    expect(screen.getAllByText('25 việc').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('7 việc').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Giảm 18 việc')).toBeInTheDocument();

    // Collapsible table
    expect(screen.getByText(/Xem dữ liệu chi tiết/i)).toBeInTheDocument();
    expect(screen.getByText('01/10/2026')).toBeInTheDocument();
    expect(screen.getByText('07/10/2026')).toBeInTheDocument();
  });

  it('hiển thị biến động tăng khi có thêm việc mới trong kỳ', () => {
    const increasingData: BurndownPointDto[] = [
      { date: '2026-10-01', remaining: 5 },
      { date: '2026-10-05', remaining: 10 },
    ];
    render(<SeriesBurndownCard burndown={increasingData} />);

    expect(screen.getByText('Tăng 5 việc')).toBeInTheDocument();
  });

  it('hỗ trợ chuyển đổi khoảng thời gian lọc (7 ngày, 30 ngày, Tất cả) khi có hơn 7 ngày', () => {
    const manyDaysData: BurndownPointDto[] = Array.from({ length: 15 }, (_, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      remaining: 20 - i,
    }));

    render(<SeriesBurndownCard burndown={manyDaysData} />);

    // Kiểm tra có các nút lọc
    expect(screen.getByText('7 ngày')).toBeInTheDocument();
    expect(screen.getByText('30 ngày')).toBeInTheDocument();
    expect(screen.getByText('Tất cả')).toBeInTheDocument();

    // Bấm chọn 7 ngày
    fireEvent.click(screen.getByText('7 ngày'));
    expect(screen.getByText(/7 mốc ghi nhận/i)).toBeInTheDocument();
  });
});
