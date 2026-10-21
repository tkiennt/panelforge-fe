import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PanelLayoutToolbar, PanelReadout } from './PanelLayoutControls';

describe('PanelLayoutToolbar', () => {
  const defaultProps = {
    panelCount: 3,
    selectedCount: 0,
    issues: [],
    busy: false,
    canEdit: true,
    onRelayout: vi.fn(),
    onAlign: vi.fn(),
    onDistribute: vi.fn(),
    onStraighten: vi.fn(),
    onSelectAll: vi.fn(),
  };

  it('render thanh công cụ bố cục nền sáng, không còn chip công đoạn hay toạ độ', () => {
    render(<PanelLayoutToolbar {...defaultProps} leading={<button>Thêm Panel</button>} />);
    const toolbar = screen.getByTestId('panel-layout-toolbar');
    expect(toolbar.className).toContain('bg-white/95');
    expect(screen.getByRole('button', { name: 'Thêm Panel' })).toBeInTheDocument();
    expect(screen.queryByTestId('desk-stage-switcher')).not.toBeInTheDocument();
    expect(screen.queryByTestId('panel-readout')).not.toBeInTheDocument();
  });

  it('hiển thị gợi ý khi chưa chọn khung', () => {
    render(
      <PanelReadout
        selectedPanel={null}
        selectedPage={
          { id: 'page-1', pageNumber: 1, widthPx: 1200, heightPx: 1800, dpi: 600 } as any
        }
        panelRect={null}
      />,
    );
    const readout = screen.getByTestId('panel-readout');
    expect(readout).toHaveTextContent('Bấm vào một khung để xem vị trí & kích thước');
  });

  it('hiển thị đầy đủ thông tin toạ độ và kích thước khung khi đã chọn', () => {
    const selectedPanel = {
      id: 'p-1',
      pageId: 'page-1',
      panelNumber: 1,
      readingOrder: 1,
      sceneId: 'sc-10',
    } as any;
    const panelRect = { x: 5, y: 5, w: 90, h: 28.7 };

    render(
      <PanelReadout
        selectedPanel={selectedPanel}
        selectedPage={
          { id: 'page-1', pageNumber: 1, widthPx: 1200, heightPx: 1800, dpi: 600 } as any
        }
        panelRect={panelRect}
      />,
    );

    const readout = screen.getByTestId('panel-readout');
    expect(readout).toBeInTheDocument();
    expect(readout.className).not.toContain('bg-stone-900');
    expect(screen.getByText('Khung #1')).toBeInTheDocument();
    expect(readout).toHaveTextContent('Vị trí:');
    expect(readout).toHaveTextContent('X 5%');
    expect(readout).toHaveTextContent('(60px)');
    expect(readout).toHaveTextContent('Y 5%');
    expect(readout).toHaveTextContent('(90px)');
    expect(readout).toHaveTextContent('Kích thước:');
    expect(readout).toHaveTextContent('90% × 28.7%');
    expect(readout).toHaveTextContent('(1080 × 517px)');
    expect(readout).toHaveTextContent('Lề trái 5% · phải 5%');
    expect(readout).toHaveTextContent('Cân giữa');
    expect(readout).toHaveTextContent('Lề trên 5% · dưới 66.3%');
  });

  it('hiển thị chip "Lệch" khi khung không cân giữa', () => {
    const selectedPanel = {
      id: 'p-1',
      pageId: 'page-1',
      panelNumber: 1,
      readingOrder: 1,
    } as any;
    const panelRect = { x: 10, y: 5, w: 60, h: 30 }; // left=10%, right=30% -> diff=20%

    render(
      <PanelReadout
        selectedPanel={selectedPanel}
        selectedPage={
          { id: 'page-1', pageNumber: 1, widthPx: 1200, heightPx: 1800, dpi: 600 } as any
        }
        panelRect={panelRect}
      />,
    );

    const readout = screen.getByTestId('panel-readout');
    expect(readout).toHaveTextContent('Lề trái 10% · phải 30%');
    expect(readout).toHaveTextContent('Lệch 20%');
  });

  it('vô hiệu hoá các nút căn chỉnh khi chọn < 2 khung và phân bố đều khi < 3 khung', () => {
    render(<PanelLayoutToolbar {...defaultProps} selectedCount={1} />);

    const alignLeftBtn = screen.getByRole('button', { name: 'Căn trái' });
    expect(alignLeftBtn).toBeDisabled();

    const distHBtn = screen.getByRole('button', { name: 'Giãn đều ngang' });
    expect(distHBtn).toBeDisabled();
  });

  it('bật nút căn chỉnh khi chọn ≥ 2 khung và phân bố đều khi ≥ 3 khung', () => {
    const onAlign = vi.fn();
    const onDistribute = vi.fn();
    render(
      <PanelLayoutToolbar
        {...defaultProps}
        selectedCount={3}
        onAlign={onAlign}
        onDistribute={onDistribute}
      />,
    );

    const alignLeftBtn = screen.getByRole('button', { name: 'Căn trái' });
    expect(alignLeftBtn).not.toBeDisabled();
    fireEvent.click(alignLeftBtn);
    expect(onAlign).toHaveBeenCalledWith('left');

    const distHBtn = screen.getByRole('button', { name: 'Giãn đều ngang' });
    expect(distHBtn).not.toBeDisabled();
    fireEvent.click(distHBtn);
    expect(onDistribute).toHaveBeenCalledWith('x');
  });

  it('hiển thị huy hiệu "Bố cục cân đối" khi không có lỗi', () => {
    render(<PanelLayoutToolbar {...defaultProps} issues={[]} />);
    expect(screen.getByTestId('layout-ok')).toHaveTextContent('Bố cục cân đối');
  });

  it('hiển thị huy hiệu "Bố cục lệch" và danh sách lỗi khi có issue', () => {
    const onStraighten = vi.fn();
    const issues = [{ id: '1', message: 'Khung #1 và #2 lệch cạnh trái 0.8%' }] as any[];

    render(<PanelLayoutToolbar {...defaultProps} issues={issues} onStraighten={onStraighten} />);

    expect(screen.getByTestId('layout-issues-badge')).toHaveTextContent('Bố cục lệch (1)');
    expect(screen.getByTestId('layout-issues')).toHaveTextContent(
      'Khung #1 và #2 lệch cạnh trái 0.8%',
    );

    const straightenBtn = screen.getByTestId('layout-straighten');
    fireEvent.click(straightenBtn);
    expect(onStraighten).toHaveBeenCalled();
  });

  it('mở form "Chia lại thành N khung" và gửi tham số khi áp dụng', () => {
    const onRelayout = vi.fn();
    render(<PanelLayoutToolbar {...defaultProps} onRelayout={onRelayout} />);

    const toggleBtn = screen.getByTestId('layout-relayout-toggle');
    fireEvent.click(toggleBtn);

    expect(screen.getByTestId('layout-relayout-form')).toBeInTheDocument();

    const applyBtn = screen.getByTestId('layout-relayout-apply');
    fireEvent.click(applyBtn);

    expect(onRelayout).toHaveBeenCalledWith('vertical', 3, expect.any(Number), expect.any(Number));
  });
});
