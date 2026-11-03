// src/roles/writer/components/script/chapter-selection/ChapterSelectionView.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ChapterSelectionView } from './ChapterSelectionView';
import { ChapterDto } from '@/services/chapter.service';

const mockChapters: ChapterDto[] = [
  {
    id: 'chap-1',
    seriesId: 'series-1',
    chapterNumber: 1,
    title: 'Khởi Đầu Mới',
    outline: 'Minh bắt đầu hành trình tại Tokyo.',
    status: 'InProduction',
    isScriptFrozen: false,
    versionVector: 1,
    createdAt: '2026-11-03T00:00:00Z',
    scenesCount: 2,
    pagesCount: 5,
  },
  {
    id: 'chap-2',
    seriesId: 'series-1',
    chapterNumber: 2,
    title: 'Đêm Tại Shibuya',
    outline: 'Gặp gỡ người đưa tin bí ẩn.',
    status: 'Approved',
    isScriptFrozen: true,
    versionVector: 2,
    createdAt: '2026-11-03T00:00:00Z',
    scenesCount: 3,
    pagesCount: 6,
  },
];

describe('ChapterSelectionView Component', () => {
  it('renders chapter selection header and cards', () => {
    const onSelectChapter = vi.fn();
    render(
      <ChapterSelectionView
        chapters={mockChapters}
        onSelectChapter={onSelectChapter}
      />
    );

    expect(screen.getByText('Chọn Chương Để Thực Hiện Kịch Bản')).toBeInTheDocument();
    expect(screen.getByText(/Khởi Đầu Mới/i)).toBeInTheDocument();
    expect(screen.getByText(/Đêm Tại Shibuya/i)).toBeInTheDocument();
    expect(screen.getByText(/Kịch bản đã khóa/i)).toBeInTheDocument();
  });

  it('calls onSelectChapter when clicking a chapter card', () => {
    const onSelectChapter = vi.fn();
    render(
      <ChapterSelectionView
        chapters={mockChapters}
        onSelectChapter={onSelectChapter}
      />
    );

    const card1 = screen.getByTestId('chapter-card-1');
    fireEvent.click(card1);

    expect(onSelectChapter).toHaveBeenCalledWith(mockChapters[0]);
  });

  it('allows Producer to open create modal and submit new chapter', async () => {
    const onCreateChapter = vi.fn().mockResolvedValue(undefined);
    const onShowToast = vi.fn();

    render(
      <ChapterSelectionView
        chapters={mockChapters}
        canCreateChapter={true}
        onSelectChapter={vi.fn()}
        onCreateChapter={onCreateChapter}
        onShowToast={onShowToast}
      />
    );

    const createBtn = screen.getByTestId('create-chapter-btn');
    fireEvent.click(createBtn);

    expect(screen.getByText('Khởi Tạo Chương Mới (Producer)')).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText(/Khởi Đầu Mới/i);
    fireEvent.change(titleInput, { target: { value: 'Chương Mới Thử Nghiệm' } });

    const submitBtn = screen.getByRole('button', { name: /Khởi tạo chương/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onCreateChapter).toHaveBeenCalledWith(
        expect.objectContaining({
          chapterNumber: 3,
          title: 'Chương Mới Thử Nghiệm',
        })
      );
    });
  });

  it('hides create chapter button when user is a Writer without create permissions', () => {
    render(
      <ChapterSelectionView
        chapters={mockChapters}
        canCreateChapter={false}
        onSelectChapter={vi.fn()}
      />
    );

    expect(screen.queryByTestId('create-chapter-btn')).not.toBeInTheDocument();
  });

  it('renders appropriate empty state for Writer when chapters list is empty', () => {
    render(
      <ChapterSelectionView
        chapters={[]}
        canCreateChapter={false}
        onSelectChapter={vi.fn()}
      />
    );

    expect(screen.getByText('Chưa có chương nào trong series này')).toBeInTheDocument();
    expect(
      screen.getByText(/Producer phụ trách dự án sẽ khởi tạo chương và giao việc/i)
    ).toBeInTheDocument();
  });
});
