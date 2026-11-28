import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LetteringBalloonOverlay } from './LetteringBalloonOverlay';
import { pageUnit } from '@/shared/lib/lettering/textStyle';
import type { ElementSnapshotDto } from '@/services/element.service';

const balloon: ElementSnapshotDto = {
  elementId: 'el-1',
  elementType: 'SPEECH_BALLOON',
  x: 100,
  y: 100,
  width: 260,
  height: 160,
  zIndex: 1,
  content: 'Ngươi hãy bỏ cuộc đi, ngươi không có cơ hội thắng!',
  isRemoved: false,
};

const noop = vi.fn();

describe('LetteringBalloonOverlay – cỡ chữ theo tỉ lệ trang', () => {
  it('quy đổi px của trang sang cqw theo bề rộng trang', () => {
    expect(pageUnit(24, 1200)).toBe('calc(100cqw * 0.02000)');
    expect(pageUnit(48, 600)).toBe('calc(100cqw * 0.08000)');
  });

  it('không cắt chữ theo số dòng cố định: hiện đủ nội dung bóng', () => {
    render(
      <LetteringBalloonOverlay
        elements={[balloon]}
        pageWidth={1200}
        pageHeight={1800}
        selectedId={null}
        activeGestureId={null}
        onSelect={noop}
        onScale={noop}
        onCopy={noop}
        onDelete={noop}
        onDragStart={noop}
        onDragMove={noop}
        onDragEnd={noop}
        onResizeStart={noop}
        onResizeMove={noop}
        onResizeEnd={noop}
      />,
    );
    const text = screen.getByTestId('lettering-text-el-1');
    expect(text.textContent!.replace(/\s+/g, ' ')).toBe(balloon.content);
    expect(text.className).not.toMatch(/line-clamp/);
  });

  const props = {
    pageWidth: 1200,
    pageHeight: 1800,
    activeGestureId: null,
    onSelect: noop,
    onScale: noop,
    onCopy: noop,
    onDelete: noop,
    onDragStart: noop,
    onDragMove: noop,
    onDragEnd: noop,
    onResizeStart: noop,
    onResizeMove: noop,
    onResizeEnd: noop,
  };

  it('bản EN hiển thị chữ in hoa; bản gốc giữ nguyên', () => {
    const el = { ...balloon, texts: { en: 'Give up, you cannot win!' } };
    const { rerender } = render(
      <LetteringBalloonOverlay {...props} elements={[el]} selectedId={null} activeLang='en' />,
    );
    expect(screen.getByTestId('lettering-text-el-1').textContent!.replace(/\s+/g, ' ')).toBe(
      'GIVE UP, YOU CANNOT WIN!',
    );
    rerender(
      <LetteringBalloonOverlay {...props} elements={[el]} selectedId={null} activeLang='vi' />,
    );
    expect(screen.getByTestId('lettering-text-el-1').textContent).toContain('Ngươi');
  });

  it('bóng oval đang chọn có tay nắm đuôi; thả ra thì báo toạ độ đuôi mới', () => {
    const onTailChange = vi.fn();
    render(
      <LetteringBalloonOverlay
        {...props}
        elements={[
          { ...balloon, style: { fontFamily: 'Mali', fontSize: 26, tailX: 130, tailY: 195 } },
        ]}
        selectedId='el-1'
        onTailChange={onTailChange}
      />,
    );
    const handle = screen.getByTestId('lettering-tail-el-1');
    expect(handle.style.left).toBe('50%');
    const box = handle.parentElement!;
    box.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 260, height: 160, right: 260, bottom: 160 }) as DOMRect;
    fireEvent.pointerDown(handle, { clientX: 130, clientY: 195, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 20, clientY: 220, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientX: 20, clientY: 220, pointerId: 1 });
    expect(onTailChange).toHaveBeenCalledWith('el-1', { x: 20, y: 220 });
  });

  it('không có tay nắm đuôi khi chỉ xem hoặc bóng không phải oval', () => {
    render(
      <LetteringBalloonOverlay
        {...props}
        elements={[{ ...balloon, elementType: 'NARRATION_BOX' }]}
        selectedId='el-1'
        onTailChange={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('lettering-tail-el-1')).toBeNull();
  });

  it('chỉ mở phần chỉnh thoại khi click, không mở sau thao tác kéo', () => {
    const element: ElementSnapshotDto = {
      elementId: 'balloon-1',
      elementType: 'SPEECH_BALLOON',
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      zIndex: 1,
      content: 'Xin chào',
      isRemoved: false,
      version: 1,
    };

    const clickedSelect = vi.fn();
    const clicked = render(
      <LetteringBalloonOverlay
        {...props}
        elements={[element]}
        selectedId={null}
        onSelect={clickedSelect}
      />,
    );
    fireEvent.click(clicked.getByTestId('lettering-element-balloon-1'));
    expect(clickedSelect).toHaveBeenCalledWith('balloon-1');
    cleanup();

    const draggedSelect = vi.fn();
    const dragged = render(
      <LetteringBalloonOverlay
        {...props}
        elements={[element]}
        selectedId={null}
        onSelect={draggedSelect}
      />,
    );
    const target = dragged.getByTestId('lettering-element-balloon-1');
    fireEvent.pointerDown(target, { clientX: 10, clientY: 10, button: 0 });
    fireEvent.pointerMove(target, { clientX: 30, clientY: 10 });
    fireEvent.pointerUp(target, { clientX: 30, clientY: 10 });
    fireEvent.click(target);
    expect(draggedSelect).not.toHaveBeenCalled();
  });

  it('badge "#" thứ tự đọc ẩn khi showOrder là false (hoặc mặc định), hiện khi true', () => {
    const { rerender } = render(
      <LetteringBalloonOverlay {...props} elements={[balloon]} selectedId={null} />,
    );
    expect(screen.queryByText('#1')).toBeNull();

    rerender(
      <LetteringBalloonOverlay
        {...props}
        elements={[balloon]}
        selectedId={null}
        showOrder={false}
      />,
    );
    expect(screen.queryByText('#1')).toBeNull();

    rerender(
      <LetteringBalloonOverlay
        {...props}
        elements={[balloon]}
        selectedId={null}
        showOrder={true}
      />,
    );
    expect(screen.getByText('#1')).not.toBeNull();
  });

  it('menu ⋮ dùng Popover API (popover="auto", popovertarget), đóng sau khi sao chép và xoá, giữ mở khi phóng/thu', () => {
    const onCopy = vi.fn();
    const onDelete = vi.fn();
    const onScale = vi.fn();

    render(
      <LetteringBalloonOverlay
        {...props}
        elements={[balloon]}
        selectedId='el-1'
        onCopy={onCopy}
        onDelete={onDelete}
        onScale={onScale}
      />,
    );

    const menuBtn = screen.getByTestId('lettering-menu-el-1');
    const popover = screen.getByTestId('lettering-toolbar-el-1');

    expect(popover).toHaveAttribute('popover', 'auto');
    expect(menuBtn).toHaveAttribute('popovertarget', 'lettering-toolbar-el-1');
    expect(menuBtn).toHaveAttribute('aria-expanded', 'false');

    // Mở menu
    fireEvent.click(menuBtn);
    expect(menuBtn).toHaveAttribute('aria-expanded', 'true');

    // Phóng to giữ menu mở
    fireEvent.click(screen.getByTestId('btn-zoom-in-el-1'));
    expect(onScale).toHaveBeenCalledWith('el-1', 1.15);
    expect(menuBtn).toHaveAttribute('aria-expanded', 'true');

    // Thu nhỏ giữ menu mở
    fireEvent.click(screen.getByTestId('btn-zoom-out-el-1'));
    expect(onScale).toHaveBeenCalledWith('el-1', 0.85);
    expect(menuBtn).toHaveAttribute('aria-expanded', 'true');

    // Sao chép đóng menu
    fireEvent.click(screen.getByTestId('btn-copy-el-1'));
    expect(onCopy).toHaveBeenCalledWith(balloon);
    expect(menuBtn).toHaveAttribute('aria-expanded', 'false');

    // Mở lại rồi Xoá đóng menu
    fireEvent.click(menuBtn);
    expect(menuBtn).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByTestId('btn-delete-el-1'));
    expect(onDelete).toHaveBeenCalledWith('el-1');
    expect(menuBtn).toHaveAttribute('aria-expanded', 'false');
  });
});
