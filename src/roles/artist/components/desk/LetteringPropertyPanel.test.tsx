import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LetteringPropertyPanel } from './LetteringPropertyPanel';
import type { ElementSnapshotDto } from '@/services/element.service';

const balloon = (over: Partial<ElementSnapshotDto> = {}): ElementSnapshotDto =>
  ({
    elementId: 'el-1',
    elementType: 'SPEECH_BALLOON',
    x: 0,
    y: 0,
    width: 200,
    height: 120,
    zIndex: 1,
    readingOrder: 3,
    content: 'Đi thôi!',
    currentLineText: 'Đi thôi!',
    scriptLineId: 'l-1',
    version: 2,
    isRemoved: false,
    ...over,
  }) as ElementSnapshotDto;

const line = {
  id: 'l-1',
  pageNumber: 2,
  panelNumber: 1,
  characterName: 'Kaito',
  dialogueText: 'Đi thôi!',
};

describe('LetteringPropertyPanel (BR-05, BR-34)', () => {
  it('hiện tên phần tử, dòng kịch bản đang gắn và người nói', () => {
    render(
      <LetteringPropertyPanel
        element={balloon()}
        scriptLine={line}
        onCommitText={vi.fn()}
        onChangeStyle={vi.fn()}
      />,
    );
    expect(screen.getByTestId('lettering-property-name')).toHaveTextContent('Thoại 3');
    expect(screen.getByTestId('lettering-property-link-status')).toHaveTextContent('Đã liên kết');
    expect(screen.getByTestId('lettering-property-speaker')).toHaveTextContent('Kaito');
    expect(screen.getByTestId('lettering-property-script')).toHaveTextContent('Trang 2');
  });

  it('bóng gắn kịch bản: chữ gốc chỉ đọc (không sửa dữ liệu Writer)', () => {
    const onCommit = vi.fn();
    render(
      <LetteringPropertyPanel
        element={balloon()}
        scriptLine={line}
        onCommitText={onCommit}
        onChangeStyle={vi.fn()}
      />,
    );
    const input = screen.getByTestId('lettering-text-input');
    expect(input).toHaveAttribute('readonly');
    fireEvent.blur(input);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('ngôn ngữ dịch: hiện chữ gốc tham chiếu, lưu bản dịch khi rời ô', () => {
    const onCommit = vi.fn();
    render(
      <LetteringPropertyPanel
        element={balloon()}
        scriptLine={line}
        activeLang='en'
        originalLang='vi'
        onCommitText={onCommit}
        onChangeStyle={vi.fn()}
      />,
    );
    expect(screen.getByTestId('lettering-original-reference')).toHaveTextContent('Đi thôi!');
    const input = screen.getByTestId('lettering-text-input');
    fireEvent.change(input, { target: { value: "Let's go!" } });
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith("Let's go!");
  });

  it('đổi hình bóng gửi patch balloonShape', () => {
    const onStyle = vi.fn();
    render(
      <LetteringPropertyPanel
        element={balloon({ scriptLineId: null })}
        onCommitText={vi.fn()}
        onChangeStyle={onStyle}
      />,
    );
    fireEvent.change(screen.getByTestId('lettering-property-shape'), {
      target: { value: 'cloud' },
    });
    expect(onStyle).toHaveBeenCalledWith({ balloonShape: 'cloud' });
  });
});

describe('LetteringPropertyPanel – kiểu chữ & xóa', () => {
  it('cỡ chữ kẹp 14–160, đổi font, xóa thoại', () => {
    const onStyle = vi.fn();
    const onDelete = vi.fn();
    render(
      <LetteringPropertyPanel
        element={balloon({ scriptLineId: null })}
        onCommitText={vi.fn()}
        onChangeStyle={onStyle}
        onDelete={onDelete}
      />,
    );
    const size = screen.getByTestId('lettering-font-size-input');
    fireEvent.change(size, { target: { value: '999' } });
    fireEvent.blur(size);
    expect(onStyle).toHaveBeenLastCalledWith({ fontSize: 160 });
    fireEvent.change(screen.getByTestId('lettering-font-family'), { target: { value: 'Bangers' } });
    expect(onStyle).toHaveBeenLastCalledWith({ fontFamily: 'Bangers' });
    fireEvent.click(screen.getByTestId('lettering-property-delete'));
    expect(onDelete).toHaveBeenCalled();
  });

  it('hiển thị cảnh báo khi bóng thoại che vùng cấm và gọi gợi ý vị trí', () => {
    const onSuggest = vi.fn();
    render(
      <LetteringPropertyPanel
        element={balloon({ scriptLineId: null })}
        onCommitText={vi.fn()}
        onChangeStyle={vi.fn()}
        keepOutCollision={{
          id: 'kz-1',
          x: 0,
          y: 0,
          width: 120,
          height: 120,
          label: 'Mặt nhân vật',
        }}
        onSuggestPosition={onSuggest}
      />,
    );
    expect(screen.getByTestId('keepout-callout')).toHaveTextContent('Mặt nhân vật');
    fireEvent.click(screen.getByTestId('suggest-position-btn-collision'));
    expect(onSuggest).toHaveBeenCalledTimes(1);
  });
});
