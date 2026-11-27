import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChapterReadingMode } from './ChapterReadingMode';
import { pageStepForKey, toReadingDirection } from './readingDirection';

vi.mock('@/services/pipeline.service', () => ({
  pipelineService: { getSeriesPipeline: vi.fn().mockResolvedValue({ stages: [] }) },
}));
vi.mock('@/services/panel.service', () => ({
  panelService: { getPanelsByPage: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/services/element.service', () => ({
  elementService: { getPageSnapshot: vi.fn().mockResolvedValue({ elements: [] }) },
}));
vi.mock('@/shared/utils/stageArtworks', () => ({
  loadPreviousStageArtworks: vi.fn().mockResolvedValue([]),
}));

const pages = [3, 1, 2].map((n) => ({ id: `p${n}`, pageNumber: n }) as any);

describe('reading direction helpers', () => {
  it('maps backend enum names and numbers', () => {
    expect(toReadingDirection('Vertical')).toBe('Vertical');
    expect(toReadingDirection(1)).toBe('LeftToRight');
    expect(toReadingDirection(0)).toBe('RightToLeft');
    expect(toReadingDirection(undefined)).toBe('RightToLeft');
  });

  it('right-to-left: left arrow goes forward', () => {
    expect(pageStepForKey('ArrowLeft', 'RightToLeft')).toBe(1);
    expect(pageStepForKey('ArrowRight', 'RightToLeft')).toBe(-1);
    expect(pageStepForKey('ArrowRight', 'LeftToRight')).toBe(1);
    expect(pageStepForKey('ArrowRight', 'Vertical')).toBe(0);
  });
});

describe('ChapterReadingMode', () => {
  beforeEach(() => vi.clearAllMocks());

  it('vertical series scrolls every page in page-number order', async () => {
    render(
      <ChapterReadingMode
        chapterId='c1'
        seriesId='s1'
        readingDirection='Vertical'
        pages={pages}
        onClose={vi.fn()}
        onReviewPage={vi.fn()}
      />,
    );
    const ids = [
      ...screen.getByTestId('reading-vertical').querySelectorAll('[data-testid^="reading-page-"]'),
    ].map((el) => el.getAttribute('data-testid'));
    expect(ids).toEqual(['reading-page-1', 'reading-page-2', 'reading-page-3']);
    // Trang chưa có tranh/chữ hiện ô trống thay vì bị bỏ qua
    await waitFor(() =>
      expect(screen.getAllByText(/chưa có bản vẽ|has no artwork/i)).toHaveLength(3),
    );
  });

  it('right-to-left: the left button turns to the next page; clicking a page returns to review', async () => {
    const onReviewPage = vi.fn();
    render(
      <ChapterReadingMode
        chapterId='c1'
        seriesId='s1'
        readingDirection='RightToLeft'
        pages={pages}
        onClose={vi.fn()}
        onReviewPage={onReviewPage}
      />,
    );
    expect(screen.getByTestId('reading-page-1')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reading-left'));
    expect(await screen.findByTestId('reading-page-2')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(await screen.findByTestId('reading-page-1')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reading-page-1'));
    expect(onReviewPage).toHaveBeenCalledWith('p1');
  });
});
