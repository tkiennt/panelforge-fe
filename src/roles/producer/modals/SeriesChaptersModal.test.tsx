import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SeriesChaptersModal } from './SeriesChaptersModal';
import { chapterService } from '@/services/chapter.service';
import { ConfirmProvider } from '@/shared/context/ConfirmContext';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/services/chapter.service', () => ({
  chapterService: {
    getChaptersBySeries: vi.fn(),
    createChapter: vi.fn(),
    updateChapter: vi.fn(),
    deleteChapter: vi.fn(),
    approveChapter: vi.fn(),
    reopenChapter: vi.fn(),
  },
}));

describe('SeriesChaptersModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(chapterService.getChaptersBySeries).mockResolvedValue({
      items: [],
      totalCount: 0,
      pageIndex: 1,
      pageSize: 10,
      totalPages: 1,
    });
  });

  it('crashes if localStorage activeWorkspace is "null"', () => {
    localStorage.setItem('activeWorkspace', 'null');

    expect(() => {
      render(
        <MemoryRouter>
          <ConfirmProvider>
            <SeriesChaptersModal
              isOpen={true}
              seriesId='series-1'
              seriesTitle='Test Series'
              onClose={vi.fn()}
            />
          </ConfirmProvider>
        </MemoryRouter>
      );
    }).toThrow();
  });
});
