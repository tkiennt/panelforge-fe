import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

  it('bóng gắn kịch bản ở ngôn ngữ gốc không có lettering-text-input', () => {
    render(
      <LetteringPropertyPanel
        element={balloon()}
        scriptLine={line}
        onCommitText={vi.fn()}
        onChangeStyle={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('lettering-text-input')).toBeNull();
  });

  it('bóng tự do ở ngôn ngữ gốc vẫn có lettering-text-input', () => {
    render(
      <LetteringPropertyPanel
        element={balloon({ scriptLineId: null })}
        onCommitText={vi.fn()}
        onChangeStyle={vi.fn()}
      />,
    );
    expect(screen.getByTestId('lettering-text-input')).toBeInTheDocument();
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

  it('hiện diff lời thoại lỗi thời và đồng bộ theo kịch bản bằng một lần bấm', async () => {
    const onSync = vi.fn().mockResolvedValue(undefined);
    render(
      <LetteringPropertyPanel
        element={balloon({
          content: 'Bản thoại cũ',
          renderedText: 'Bản thoại cũ',
          currentLineText: 'Bản thoại mới',
          isStale: true,
        })}
        scriptLine={{ ...line, dialogueText: 'Bản thoại mới' }}
        onCommitText={vi.fn()}
        onSyncScriptText={onSync}
        onChangeStyle={vi.fn()}
      />,
    );

    expect(screen.getByText('Lời thoại đã đổi')).toBeInTheDocument();
    expect(screen.getByTestId('lettering-stale-diff')).toHaveTextContent('Bản thoại cũ');
    expect(screen.getByTestId('lettering-stale-diff')).toHaveTextContent('Bản thoại mới');
    fireEvent.click(screen.getByRole('button', { name: 'Cập nhật theo kịch bản' }));
    await waitFor(() => expect(onSync).toHaveBeenCalledTimes(1));
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

  it('long text in a 160x90 SPEECH_BALLOON shows lettering-font-shown and clicking lettering-fit-balloon calls onFitBalloon; short text shows neither', () => {
    const onFitBalloon = vi.fn();
    const { rerender } = render(
      <LetteringPropertyPanel
        element={balloon({
          width: 160,
          height: 90,
          elementType: 'SPEECH_BALLOON',
          content:
            'Đây là đoạn thoại rất dài vượt quá kích thước bóng thoại 160x90 khiến cỡ chữ bị tự thu nhỏ để vừa bóng',
          scriptLineId: null,
        })}
        onFitBalloon={onFitBalloon}
        onCommitText={vi.fn()}
        onChangeStyle={vi.fn()}
      />,
    );

    const fontShown = screen.getByTestId('lettering-font-shown');
    expect(fontShown).toBeInTheDocument();
    const fitBtn = screen.getByTestId('lettering-fit-balloon');
    expect(fitBtn).toBeInTheDocument();
    fireEvent.click(fitBtn);
    expect(onFitBalloon).toHaveBeenCalledTimes(1);

    rerender(
      <LetteringPropertyPanel
        element={balloon({
          width: 160,
          height: 90,
          elementType: 'SPEECH_BALLOON',
          content: 'Hi',
          scriptLineId: null,
        })}
        onFitBalloon={onFitBalloon}
        onCommitText={vi.fn()}
        onChangeStyle={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('lettering-font-shown')).toBeNull();
    expect(screen.queryByTestId('lettering-fit-balloon')).toBeNull();
  });

  it('styleReadOnly disable lettering-property-shape, lettering-font-family, lettering-btn-bold và ẩn nút vừa khung', () => {
    render(
      <LetteringPropertyPanel
        element={balloon({
          width: 160,
          height: 90,
          elementType: 'SPEECH_BALLOON',
          content:
            'Đây là đoạn thoại rất dài vượt quá kích thước bóng thoại 160x90 khiến cỡ chữ bị tự thu nhỏ để vừa bóng',
          scriptLineId: null,
        })}
        styleReadOnly={true}
        onFitBalloon={vi.fn()}
        onCommitText={vi.fn()}
        onChangeStyle={vi.fn()}
      />,
    );

    expect(screen.getByTestId('lettering-property-shape')).toBeDisabled();
    expect(screen.getByTestId('lettering-font-family')).toBeDisabled();
    expect(screen.getByTestId('lettering-btn-bold')).toBeDisabled();
    expect(screen.queryByTestId('lettering-fit-balloon')).toBeNull();
  });
});
