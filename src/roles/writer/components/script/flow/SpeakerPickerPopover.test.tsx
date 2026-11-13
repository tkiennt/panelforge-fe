// src/roles/writer/components/script/flow/SpeakerPickerPopover.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SpeakerPickerPopover } from './SpeakerPickerPopover';
import { BibleEntryDto } from '@/services/bible.service';

const mockBibleEntries: BibleEntryDto[] = [
  {
    id: 'chr-naruto',
    name: 'Naruto',
    code: 'CHR_NARUTO',
    category: 'Character',
    subtitle: 'Nhẫn giả Làng Lá',
  } as any,
  {
    id: 'chr-sasuke',
    name: 'Sasuke',
    code: 'CHR_SASUKE',
    category: 'Character',
    subtitle: 'Gia tộc Uchiha',
  } as any,
];

const mockRecentSpeakers = [
  { name: 'Kakashi', characterId: 'chr-kakashi' },
];

describe('SpeakerPickerPopover - WriteSolo Interactive Speaker Slot (SCR-27 & D7)', () => {
  it('hiển thị ô gõ tìm kiếm và danh sách gợi ý từ Series Bible & Recent Speakers', () => {
    const handleSelect = vi.fn();
    const handleClose = vi.fn();

    render(
      <SpeakerPickerPopover
        anchorRect={{ top: 100, left: 100, bottom: 120, right: 200, width: 100, height: 20 } as DOMRect}
        allBibleEntries={mockBibleEntries}
        recentSpeakers={mockRecentSpeakers}
        onSelect={handleSelect}
        onClose={handleClose}
      />,
    );

    expect(screen.getByPlaceholderText(/Nhập tên nhân vật/i)).toBeInTheDocument();
    expect(screen.getByText('Naruto')).toBeInTheDocument();
    expect(screen.getByText('Sasuke')).toBeInTheDocument();
    expect(screen.getByText('Kakashi')).toBeInTheDocument();
  });

  it('cho phép gõ tên nhân vật quần chúng tự do không có trong Bible', () => {
    const handleSelect = vi.fn();
    const handleClose = vi.fn();

    render(
      <SpeakerPickerPopover
        anchorRect={{ top: 100, left: 100, bottom: 120, right: 200, width: 100, height: 20 } as DOMRect}
        allBibleEntries={mockBibleEntries}
        recentSpeakers={mockRecentSpeakers}
        onSelect={handleSelect}
        onClose={handleClose}
      />,
    );

    const input = screen.getByPlaceholderText(/Nhập tên nhân vật/i);
    fireEvent.change(input, { target: { value: 'Lính gác 1' } });

    expect(screen.getByText('Lính gác 1')).toBeInTheDocument();
    expect(screen.getByText('Nhân vật quần chúng')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(handleSelect).toHaveBeenCalledWith({
      name: 'LÍNH GÁC 1',
      characterId: null,
      blockType: 'dialogue',
    });
  });

  it('D7: gõ hậu tố (nghĩ) hoặc (thought) tự động chuyển blockType thành thought', () => {
    const handleSelect = vi.fn();
    const handleClose = vi.fn();

    render(
      <SpeakerPickerPopover
        anchorRect={{ top: 100, left: 100, bottom: 120, right: 200, width: 100, height: 20 } as DOMRect}
        allBibleEntries={mockBibleEntries}
        recentSpeakers={mockRecentSpeakers}
        onSelect={handleSelect}
        onClose={handleClose}
      />,
    );

    const input = screen.getByPlaceholderText(/Nhập tên nhân vật/i);
    // Gõ Naruto (nghĩ)
    fireEvent.change(input, { target: { value: 'Naruto (nghĩ)' } });

    expect(screen.getByText('Nghĩ')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(handleSelect).toHaveBeenCalledWith({
      name: 'NARUTO',
      characterId: 'chr-naruto',
      blockType: 'thought',
    });
  });

  it('Shift+Tab gọi onMorphToAction theo bảng H.1', () => {
    const handleSelect = vi.fn();
    const handleClose = vi.fn();
    const handleMorph = vi.fn();

    render(
      <SpeakerPickerPopover
        anchorRect={{ top: 100, left: 100, bottom: 120, right: 200, width: 100, height: 20 } as DOMRect}
        allBibleEntries={mockBibleEntries}
        recentSpeakers={mockRecentSpeakers}
        onSelect={handleSelect}
        onClose={handleClose}
        onMorphToAction={handleMorph}
      />,
    );

    const input = screen.getByPlaceholderText(/Nhập tên nhân vật/i);
    fireEvent.keyDown(input, { key: 'Tab', shiftKey: true });

    expect(handleMorph).toHaveBeenCalled();
  });
});
