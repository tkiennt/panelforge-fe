import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LetteringScriptPanel } from './LetteringScriptPanel';
import type { ScriptLineItem } from './ArtistCanvaSidebar';
import type { ElementSnapshotDto } from '@/services/element.service';
import { translateText } from '@/services/translation.service';

vi.mock('@/services/translation.service', async (orig) => {
  const actual = await orig<typeof import('@/services/translation.service')>();
  return {
    ...actual,
    translateText: vi.fn(),
    translationService: { ...actual.translationService, translateText: vi.fn() },
  };
});

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('không hiển thị nút dịch khi activeLang trùng originalLang hoặc chưa chọn', () => {
    renderPanel({ activeLang: 'vi', originalLang: 'vi' });
    expect(screen.queryByTestId('lettering-batch-translate-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lettering-translate-line-l-speech')).not.toBeInTheDocument();
  });

  it('hiển thị nút Dịch trên từng dòng và nút Dịch toàn bộ thoại của trang khi activeLang !== originalLang', () => {
    renderPanel({ activeLang: 'en', originalLang: 'vi' });
    expect(screen.getByTestId('lettering-batch-translate-page')).toBeInTheDocument();
    expect(screen.getByTestId('lettering-translate-line-l-speech')).toBeInTheDocument();
    expect(screen.getByTestId('lettering-translate-line-l-narr')).toBeInTheDocument();
  });

  it('bấm [🌐 Dịch] gọi translateText, hiển thị ô xem trước, sửa nội dung và bấm [📥 Đổ vào bóng thoại]', async () => {
    vi.mocked(translateText).mockResolvedValueOnce({ text: 'Add title!', isFallback: false });
    const onUpdate = vi.fn();

    renderPanel({
      activeLang: 'en',
      originalLang: 'vi',
      elements: [balloon({ scriptLineId: 'l-speech', elementId: 'el-speech-1' })],
      onUpdateElementTranslation: onUpdate,
      pageId: 'page-123',
    });

    const translateBtn = screen.getByTestId('lettering-translate-line-l-speech');
    fireEvent.click(translateBtn);

    await waitFor(() => {
      expect(translateText).toHaveBeenCalledWith('Thêm tiêu đề!', 'vi', 'en');
    });

    // Sau khi dịch, ô preview input xuất hiện
    const previewInput = await screen.findByTestId('lettering-preview-input-l-speech');
    expect(previewInput).toHaveValue('Add title!');

    // Sửa nội dung bản dịch trong input
    fireEvent.change(previewInput, { target: { value: 'Add title edited!' } });
    expect(previewInput).toHaveValue('Add title edited!');

    // Bấm đổ vào bóng thoại
    const applyBtn = screen.getByTestId('lettering-apply-line-l-speech');
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith('page-123', 'el-speech-1', 'en', 'Add title edited!');
    });

    // Hiển thị trạng thái đã đổ
    expect(await screen.findByTestId('lettering-apply-success-l-speech')).toHaveTextContent(
      'Đã đổ',
    );
  });

  it('bấm Dịch toàn bộ thoại của trang dịch hàng loạt các dòng kịch bản thuộc trang hiện tại', async () => {
    vi.mocked(translateText).mockImplementation(async (text) => {
      if (text.includes('tiêu đề')) return { text: 'Add title translated', isFallback: false };
      if (text.includes('Ba năm'))
        return { text: 'Three years later translated', isFallback: false };
      return { text, isFallback: false };
    });

    renderPanel({
      activeLang: 'en',
      originalLang: 'vi',
      activePageNumber: 1,
    });

    const batchBtn = screen.getByTestId('lettering-batch-translate-page');
    fireEvent.click(batchBtn);

    await waitFor(() => {
      expect(translateText).toHaveBeenCalledWith('Thêm tiêu đề!', 'vi', 'en');
      expect(translateText).toHaveBeenCalledWith('Ba năm sau…', 'vi', 'en');
      // Dòng l-sfx ở trang 2 không được dịch trong batch của trang 1
      expect(translateText).not.toHaveBeenCalledWith('SFX: RẦM', 'vi', 'en');
    });

    expect(await screen.findByTestId('lettering-preview-input-l-speech')).toHaveValue(
      'Add title translated',
    );
    expect(await screen.findByTestId('lettering-preview-input-l-narr')).toHaveValue(
      'Three years later translated',
    );
  });

  it('hiển thị thông báo lỗi khi gọi translateText thất bại', async () => {
    vi.mocked(translateText).mockRejectedValueOnce(new Error('Translation service unavailable'));

    renderPanel({
      activeLang: 'en',
      originalLang: 'vi',
    });

    const translateBtn = screen.getByTestId('lettering-translate-line-l-speech');
    fireEvent.click(translateBtn);

    expect(await screen.findByTestId('lettering-translate-error-l-speech')).toHaveTextContent(
      'Translation service unavailable',
    );
  });

  it('vô hiệu hóa nút dịch kèm tooltip khi cặp ngôn ngữ không thuộc {en, vi} (ví dụ JA)', () => {
    renderPanel({
      activeLang: 'ja',
      originalLang: 'vi',
    });

    const batchBtn = screen.getByTestId('lettering-batch-translate-page');
    const lineBtn = screen.getByTestId('lettering-translate-line-l-speech');

    expect(batchBtn).toBeDisabled();
    expect(batchBtn).toHaveAttribute('title', 'Dịch tự động chỉ hỗ trợ Anh ↔ Việt');
    expect(lineBtn).toBeDisabled();
    expect(lineBtn).toHaveAttribute('title', 'Dịch tự động chỉ hỗ trợ Anh ↔ Việt');
  });

  it('hiển thị cảnh báo màu hổ phách và không điền câu gốc vào preview khi LibreTranslate trả về isFallback: true', async () => {
    vi.mocked(translateText).mockResolvedValueOnce({
      text: 'Thêm tiêu đề!',
      isFallback: true,
    });

    renderPanel({
      activeLang: 'en',
      originalLang: 'vi',
    });

    fireEvent.click(screen.getByTestId('lettering-translate-line-l-speech'));

    const warning = await screen.findByTestId('lettering-translate-fallback-l-speech');
    expect(warning).toHaveTextContent(
      'Dịch vụ dịch chưa sẵn sàng — chưa dịch được, hãy thử lại sau',
    );
    expect(screen.queryByTestId('lettering-preview-input-l-speech')).not.toBeInTheDocument();
  });

  it('dịch hàng loạt bỏ qua các dòng fallback và chỉ hiển thị một cảnh báo dịch vụ chưa sẵn sàng', async () => {
    vi.mocked(translateText).mockImplementation(async (text) => {
      if (text.includes('tiêu đề')) return { text, isFallback: true };
      return { text: 'Three years later...', isFallback: false };
    });

    renderPanel({
      activeLang: 'en',
      originalLang: 'vi',
      activePageNumber: 1,
    });

    fireEvent.click(screen.getByTestId('lettering-batch-translate-page'));

    const batchFallback = await screen.findByTestId('lettering-batch-translate-fallback');
    expect(batchFallback).toHaveTextContent(
      'Dịch vụ dịch chưa sẵn sàng — chưa dịch được, hãy thử lại sau',
    );
    expect(screen.queryByTestId('lettering-preview-input-l-speech')).not.toBeInTheDocument();
    expect(await screen.findByTestId('lettering-preview-input-l-narr')).toHaveValue(
      'Three years later...',
    );
  });
});
