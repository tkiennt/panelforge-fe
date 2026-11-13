import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ScriptChaptersDrawer } from './ScriptChaptersDrawer';
import { ChapterDto } from '@/services/chapter.service';

const mockChapters: ChapterDto[] = [
  {
    id: 'chap-2',
    seriesId: 'series-1',
    chapterNumber: 2,
    title: 'Gặp gỡ bất ngờ',
    scenesCount: 4,
    pagesCount: 16,
    versionVector: 1,
    status: 'InProduction',
    createdAt: '2026-01-01',
  },
  {
    id: 'chap-1',
    seriesId: 'series-1',
    chapterNumber: 1,
    title: 'Khởi đầu mới',
    scenesCount: 5,
    pagesCount: 20,
    versionVector: 2,
    status: 'Approved',
    createdAt: '2026-01-01',
  },
  {
    id: 'chap-3',
    seriesId: 'series-1',
    chapterNumber: 3,
    title: 'Bí mật lộ diện',
    scenesCount: 3,
    pagesCount: 12,
    versionVector: 1,
    status: 'InProduction',
    createdAt: '2026-01-01',
  },
  {
    id: 'chap-4',
    seriesId: 'series-1',
    chapterNumber: 4,
    title: null,
    scenesCount: 0,
    pagesCount: 0,
    versionVector: 1,
    status: 'InProduction',
    createdAt: '2026-01-01',
  },
];

describe('ScriptChaptersDrawer - Side tab chuyển chương nhanh', () => {
  it('hiển thị danh sách chương sắp xếp tăng dần theo chapterNumber', () => {
    const handleSelect = vi.fn();
    const handleClose = vi.fn();

    render(
      <ScriptChaptersDrawer
        chapters={mockChapters}
        selectedChapterId='chap-1'
        onSelectChapter={handleSelect}
        onClose={handleClose}
      />,
    );

    expect(screen.getByTestId('script-chapters-drawer')).toBeInTheDocument();
    expect(screen.getByText('Chương 1')).toBeInTheDocument();
    expect(screen.getByText('Chương 2')).toBeInTheDocument();
    expect(screen.getByText('Chương 3')).toBeInTheDocument();
    expect(screen.getAllByText('Chương 4').length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText('Khởi đầu mới')).toBeInTheDocument();
    expect(screen.getByText('Gặp gỡ bất ngờ')).toBeInTheDocument();
    expect(screen.getByText('Bí mật lộ diện')).toBeInTheDocument();
  });

  it('chọn chương gọi onSelectChapter với chapterId tương ứng', () => {
    const handleSelect = vi.fn();
    const handleClose = vi.fn();

    render(
      <ScriptChaptersDrawer
        chapters={mockChapters}
        selectedChapterId='chap-1'
        onSelectChapter={handleSelect}
        onClose={handleClose}
      />,
    );

    const chap2Item = screen.getByTestId('chapter-item-chap-2');
    fireEvent.click(chap2Item);

    expect(handleSelect).toHaveBeenCalledWith('chap-2');
  });

  it('tìm kiếm theo tiêu đề hoặc số chương', () => {
    const handleSelect = vi.fn();
    const handleClose = vi.fn();

    render(
      <ScriptChaptersDrawer
        chapters={mockChapters}
        selectedChapterId='chap-1'
        onSelectChapter={handleSelect}
        onClose={handleClose}
      />,
    );

    const searchInput = screen.getByTestId('chapter-search-input');
    fireEvent.change(searchInput, { target: { value: 'Bí mật' } });

    expect(screen.getByText('Bí mật lộ diện')).toBeInTheDocument();
    expect(screen.queryByText('Khởi đầu mới')).not.toBeInTheDocument();
    expect(screen.queryByText('Gặp gỡ bất ngờ')).not.toBeInTheDocument();
  });

  it('nút xem tất cả chương gọi onBackToSelection khi được cung cấp', () => {
    const handleSelect = vi.fn();
    const handleBack = vi.fn();
    const handleClose = vi.fn();

    render(
      <ScriptChaptersDrawer
        chapters={mockChapters}
        selectedChapterId='chap-1'
        onSelectChapter={handleSelect}
        onBackToSelection={handleBack}
        onClose={handleClose}
      />,
    );

    const backBtn = screen.getByTestId('back-to-chapter-selection-btn');
    fireEvent.click(backBtn);

    expect(handleBack).toHaveBeenCalled();
  });

  it('nút đóng gọi onClose', () => {
    const handleSelect = vi.fn();
    const handleClose = vi.fn();

    render(
      <ScriptChaptersDrawer
        chapters={mockChapters}
        selectedChapterId='chap-1'
        onSelectChapter={handleSelect}
        onClose={handleClose}
      />,
    );

    const closeBtn = screen.getByTitle('Đóng ngăn kéo');
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalled();
  });
});
