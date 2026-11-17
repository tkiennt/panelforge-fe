import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LetteringScriptPanel } from './LetteringScriptPanel';
import type { ScriptLineItem } from './ArtistCanvaSidebar';
import type { ElementSnapshotDto } from '@/services/element.service';

const LINES: ScriptLineItem[] = [
  {
    id: 'l-speech',
    pageNumber: 1,
    panelNumber: 1,
    characterName: 'Luffy',
    dialogueText: 'Thêm tiêu đề!',
  },
  { id: 'l-dir', pageNumber: 1, panelNumber: 1, stageDirection: 'Toàn cảnh làng' },
  { id: 'l-narr', pageNumber: 1, panelNumber: 2, dialogueText: 'Ba năm sau…' },
  { id: 'l-sfx', pageNumber: 2, panelNumber: 1, dialogueText: 'SFX: RẦM' },
];

const balloon = (over: Partial<ElementSnapshotDto> = {}): ElementSnapshotDto =>
  ({
    elementId: 'el-1',
    elementType: 'SPEECH_BALLOON',
    x: 10,
    y: 10,
    width: 200,
    height: 120,
    zIndex: 1,
    readingOrder: 1,
    content: 'Thêm tiêu đề!',
    scriptLineId: 'l-speech',
    isRemoved: false,
    ...over,
  }) as ElementSnapshotDto;

const renderPanel = (props: Partial<React.ComponentProps<typeof LetteringScriptPanel>> = {}) =>
  render(
    <LetteringScriptPanel
      chapterTitle='Chương 1 - Khởi đầu hành trình'
      scriptLines={LINES}
      activePageNumber={1}
      elements={[]}
      selectedElementId={null}
      {...props}
    />,
  );

describe('LetteringScriptPanel – Script truyện & Liên kết thoại (BR-05)', () => {
  it('đánh số dòng có chữ theo thứ tự kịch bản, bỏ dòng chỉ dẫn', () => {
    renderPanel();
    expect(screen.getByTestId('lettering-script-total')).toHaveTextContent('Tổng: 3 dòng');
    expect(screen.queryByTestId('lettering-script-line-l-dir')).not.toBeInTheDocument();
    expect(screen.getByTestId('lettering-script-line-l-sfx')).toHaveTextContent('3');
    expect(screen.getByTestId('lettering-script-kind-l-sfx')).toHaveTextContent('SFX');
    expect(screen.getByText('Chương 1 - Khởi đầu hành trình')).toBeInTheDocument();
  });

  it('bấm dòng tạo bóng đúng loại, gắn dòng kịch bản', () => {
    const onAdd = vi.fn();
    renderPanel({ onAddElement: onAdd });
    fireEvent.click(screen.getByTestId('lettering-script-line-l-sfx'));
    expect(onAdd).toHaveBeenCalledWith('SOUND_EFFECT', expect.objectContaining({ id: 'l-sfx' }));
    fireEvent.click(screen.getByTestId('lettering-script-line-l-narr'));
    expect(onAdd).toHaveBeenCalledWith('NARRATION_BOX', expect.objectContaining({ id: 'l-narr' }));
  });

  it('thêm bóng trống (SFX) không gắn kịch bản', () => {
    const onAdd = vi.fn();
    renderPanel({ onAddElement: onAdd });
    fireEvent.click(screen.getByTestId('lettering-drag-sfx'));
    expect(onAdd).toHaveBeenCalledWith('SOUND_EFFECT');
  });

  it('lọc Chưa liên kết / Đã liên kết theo toàn chương', () => {
    renderPanel({ linkedScriptLineIds: new Set(['l-speech']) });

    fireEvent.click(screen.getByTestId('lettering-link-filter-unlinked'));
    expect(screen.queryByTestId('lettering-script-line-l-speech')).not.toBeInTheDocument();
    expect(screen.getByTestId('lettering-script-line-l-narr')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lettering-link-filter-linked'));
    expect(screen.getByTestId('lettering-script-line-l-speech')).toBeInTheDocument();
    expect(screen.getByTestId('lettering-script-linked-l-speech')).toBeInTheDocument();
    expect(screen.queryByTestId('lettering-script-line-l-narr')).not.toBeInTheDocument();
  });

  it('Liên kết thoại trên trang: số dòng đã liên kết, bóng chưa liên kết, chọn bóng', () => {
    const onSelect = vi.fn();
    renderPanel({
      elements: [balloon(), balloon({ elementId: 'el-2', readingOrder: 2, scriptLineId: null })],
      selectedElementId: 'el-1',
      onSelectElementId: onSelect,
    });
    expect(screen.getByTestId('lettering-item-el-1')).toHaveTextContent('Đã liên kết với dòng 1');
    expect(screen.getByTestId('lettering-item-el-2')).toHaveTextContent('Chưa liên kết');
    expect(screen.getByTestId('lettering-script-line-l-speech')).toHaveAttribute('data-selected');

    fireEvent.click(screen.getByTestId('lettering-item-el-2'));
    expect(onSelect).toHaveBeenCalledWith('el-2');
  });

  it('đếm bóng thiếu bản dịch khi soạn ngôn ngữ dịch', () => {
    renderPanel({
      elements: [balloon(), balloon({ elementId: 'el-2', texts: { en: 'Hi' } })],
      activeLang: 'en',
      originalLang: 'vi',
    });
    expect(screen.getByTestId('lettering-missing-translations')).toHaveTextContent('1');
  });
});
