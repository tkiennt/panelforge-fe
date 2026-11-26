import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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
});
