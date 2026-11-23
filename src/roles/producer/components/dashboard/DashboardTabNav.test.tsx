import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardTabNav } from './DashboardTabNav';

describe('DashboardTabNav Component', () => {
  it('hiển thị đầy đủ 10 tabs khi là Producer (isProducer=true)', () => {
    const onChange = vi.fn();
    render(
      <DashboardTabNav
        activeTab='all'
        onChange={onChange}
        counts={{ chapters: 5, team: 3 }}
        isProducer={true}
      />,
    );

    expect(screen.getByText('Tổng quan toàn diện')).toBeInTheDocument();
    expect(screen.getByText('Chương & Công đoạn')).toBeInTheDocument();
    expect(screen.getByText('Ma trận tiến độ')).toBeInTheDocument();
    expect(screen.getByText('Kịch bản')).toBeInTheDocument();
    expect(screen.getByText('Đọc thử & Duyệt trang')).toBeInTheDocument();
    expect(screen.getByText('Bàn giao xuất bản')).toBeInTheDocument();
    expect(screen.getByText('Series Bible')).toBeInTheDocument();
    expect(screen.getByText('Doanh thu & Độc giả')).toBeInTheDocument();
    expect(screen.getByText('Đội ngũ & Phân công')).toBeInTheDocument();
    expect(screen.getByText('Báo cáo Burndown')).toBeInTheDocument();
  });

  it('ẩn hoàn toàn tab Doanh thu và Đội ngũ khi là Editor (isProducer=false)', () => {
    const onChange = vi.fn();
    render(
      <DashboardTabNav
        activeTab='all'
        onChange={onChange}
        counts={{ chapters: 5 }}
        isProducer={false}
      />,
    );

    // Bị ẩn
    expect(screen.queryByText('Doanh thu & Độc giả')).not.toBeInTheDocument();
    expect(screen.queryByText('Đội ngũ & Phân công')).not.toBeInTheDocument();

    // Vẫn hiển thị các tab sản xuất thông thường
    expect(screen.getByText('Tổng quan toàn diện')).toBeInTheDocument();
    expect(screen.getByText('Chương & Công đoạn')).toBeInTheDocument();
    expect(screen.getByText('Ma trận tiến độ')).toBeInTheDocument();
    expect(screen.getByText('Kịch bản')).toBeInTheDocument();
    expect(screen.getByText('Đọc thử & Duyệt trang')).toBeInTheDocument();
    expect(screen.getByText('Bàn giao xuất bản')).toBeInTheDocument();
    expect(screen.getByText('Series Bible')).toBeInTheDocument();
    expect(screen.getByText('Báo cáo Burndown')).toBeInTheDocument();
  });

  it('gọi hàm onChange khi click vào một tab hợp lệ', () => {
    const onChange = vi.fn();
    render(<DashboardTabNav activeTab='all' onChange={onChange} counts={{}} isProducer={true} />);

    fireEvent.click(screen.getByText('Kịch bản'));
    expect(onChange).toHaveBeenCalledWith('script');
  });
});
