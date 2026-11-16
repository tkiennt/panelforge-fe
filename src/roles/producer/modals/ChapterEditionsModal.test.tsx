import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChapterEditionsModal } from './ChapterEditionsModal';
import { chapterEditionService } from '@/services/chapter-edition.service';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (_key: string, defaultValue?: string) => defaultValue || _key,
  }),
}));

vi.mock('@/services/chapter-edition.service', () => ({
  chapterEditionService: {
    getChapterEditions: vi.fn(),
    approveEdition: vi.fn(),
    publishEdition: vi.fn(),
    reopenEdition: vi.fn(),
  },
}));

describe('ChapterEditionsModal', () => {
  const mockChapter = {
    id: 'chap-1',
    chapterNumber: 1,
    title: 'Khởi đầu',
    status: 'ChapterApproved',
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders editions list for chapter', async () => {
    (chapterEditionService.getChapterEditions as any).mockResolvedValue([
      {
        id: 'ed-1',
        chapterId: 'chap-1',
        languageCode: 'vi',
        status: 'Approved',
        version: 1,
        createdAt: '2026-11-14T00:00:00Z',
      },
      {
        id: 'ed-2',
        chapterId: 'chap-1',
        languageCode: 'en',
        status: 'EditorApproved',
        version: 2,
        createdAt: '2026-11-14T00:00:00Z',
      },
    ]);

    render(
      <ChapterEditionsModal
        isOpen={true}
        chapter={mockChapter}
        onClose={() => {}}
      />
    );

    expect(screen.getByTestId('chapter-editions-modal')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('edition-row-vi')).toBeInTheDocument();
      expect(screen.getByTestId('edition-row-en')).toBeInTheDocument();
    });

    expect(screen.getByTestId('publish-edition-vi')).toBeInTheDocument();
    expect(screen.getByTestId('approve-edition-en')).toBeInTheDocument();
  });

  it('triggers approve edition when clicked', async () => {
    (chapterEditionService.getChapterEditions as any).mockResolvedValue([
      {
        id: 'ed-2',
        chapterId: 'chap-1',
        languageCode: 'en',
        status: 'EditorApproved',
        version: 1,
        createdAt: '2026-11-14T00:00:00Z',
      },
    ]);
    (chapterEditionService.approveEdition as any).mockResolvedValue({});

    render(
      <ChapterEditionsModal
        isOpen={true}
        chapter={mockChapter}
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('approve-edition-en')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('approve-edition-en'));
    expect(chapterEditionService.approveEdition).toHaveBeenCalledWith('chap-1', 'en');
  });
});
