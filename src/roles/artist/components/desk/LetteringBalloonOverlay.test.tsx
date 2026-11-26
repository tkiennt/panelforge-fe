import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    expect(text).toHaveTextContent(balloon.content!);
    expect(text.className).not.toMatch(/line-clamp/);
  });
});
