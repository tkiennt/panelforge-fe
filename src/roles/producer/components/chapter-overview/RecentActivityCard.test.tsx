import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RecentActivityCard } from './RecentActivityCard';
import type { ChapterReviewDto } from '@/services/chapter.service';

describe('RecentActivityCard', () => {
  const sampleReviews: ChapterReviewDto[] = [
    {
      id: 'rev-1',
      chapterId: 'chap-1',
      action: 'ProducerApproved',
      actorUserId: 'user-1',
      comment: 'Kịch bản phân cảnh đã chuẩn chỉnh',
      chapterVersion: 1,
      createdAt: '2026-11-28T11:55:00.000Z',
    },
    {
      id: 'rev-2',
      chapterId: 'chap-1',
      action: 'ProductionStarted' as unknown as ChapterReviewDto['action'],
      actorUserId: 'user-2',
      comment: null,
      chapterVersion: 1,
      createdAt: '2026-11-28T09:00:00.000Z',
    },
    {
      id: 'rev-3',
      chapterId: 'chap-1',
      action: 'ScriptFrozen' as unknown as ChapterReviewDto['action'],
      actorUserId: 'user-1',
      comment: 'Khóa kịch bản để artist bắt đầu vẽ storyboard',
      chapterVersion: 1,
      createdAt: '2026-11-26T12:00:00.000Z',
    },
    {
      id: 'rev-4',
      chapterId: 'chap-1',
      action: 'ChangesRequested' as unknown as ChapterReviewDto['action'],
      actorUserId: 'user-3',
      comment: 'Cần sửa biểu cảm nhân vật ở trang 3',
      chapterVersion: 1,
      createdAt: '2026-11-25T12:00:00.000Z',
    },
    {
      id: 'rev-5',
      chapterId: 'chap-1',
      action: 'ChapterReopened' as unknown as ChapterReviewDto['action'],
      actorUserId: 'user-1',
      comment: 'Mục thứ 5 không được hiện vì tối đa 4 mục',
      chapterVersion: 1,
      createdAt: '2026-11-24T12:00:00.000Z',
    },
    {
      id: 'rev-6',
      chapterId: 'chap-1',
      action: 'ChapterPublished' as unknown as ChapterReviewDto['action'],
      actorUserId: 'user-4',
      comment: 'Mục thứ 6',
      chapterVersion: 1,
      createdAt: '2026-11-23T12:00:00.000Z',
    },
  ];

  it('renders section with data-testid="overview-recent-activity"', () => {
    render(<RecentActivityCard reviews={[]} />);
    expect(screen.getByTestId('overview-recent-activity')).toBeInTheDocument();
  });

  it('renders empty message when reviews is empty', () => {
    render(<RecentActivityCard reviews={[]} />);
    expect(
      screen.getByText('Chưa có hoạt động kiểm duyệt hoặc bàn giao cho chương này.'),
    ).toBeInTheDocument();
  });

  it('limits display to at most 4 items', () => {
    render(<RecentActivityCard reviews={sampleReviews} />);
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(4);

    expect(screen.queryByText('Mục thứ 5 không được hiện vì tối đa 4 mục')).not.toBeInTheDocument();
  });

  it('renders single-line items with bold action, truncated comment, and relative time with full date tooltip', () => {
    render(<RecentActivityCard reviews={sampleReviews} />);

    // First review: ProducerApproved
    expect(screen.getByText('Duyệt chương')).toHaveClass('font-semibold');
    expect(screen.getByText('Kịch bản phân cảnh đã chuẩn chỉnh')).toBeInTheDocument();

    // Check tooltip title on timestamp
    const timestamps = screen.getAllByTitle(/2026/);
    expect(timestamps).toHaveLength(4);
    expect(timestamps[0]).toHaveClass('font-mono', 'tabular-nums');
  });

  it('handles item without comment without rendering separator', () => {
    const reviewsWithoutComment: ChapterReviewDto[] = [
      {
        id: 'rev-single',
        chapterId: 'chap-1',
        action: 'ProductionStarted' as unknown as ChapterReviewDto['action'],
        actorUserId: 'user-1',
        comment: null,
        chapterVersion: 1,
        createdAt: '2026-11-28T10:00:00.000Z',
      },
    ];

    render(<RecentActivityCard reviews={reviewsWithoutComment} />);
    expect(screen.getByText('Bắt đầu sản xuất')).toBeInTheDocument();
    expect(screen.queryByText('·')).not.toBeInTheDocument();
  });

  it('falls back to raw action when no translation mapping exists', () => {
    const unknownActionReview: ChapterReviewDto[] = [
      {
        id: 'rev-unknown',
        chapterId: 'chap-1',
        action: 'CustomWorkflowAction' as unknown as ChapterReviewDto['action'],
        actorUserId: 'user-1',
        comment: 'Hoạt động tùy chỉnh',
        chapterVersion: 1,
        createdAt: '2026-11-28T10:00:00.000Z',
      },
    ];

    render(<RecentActivityCard reviews={unknownActionReview} />);
    expect(screen.getByText('CustomWorkflowAction')).toBeInTheDocument();
  });
});
