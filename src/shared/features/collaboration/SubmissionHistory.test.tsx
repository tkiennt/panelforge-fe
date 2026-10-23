import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubmissionHistory } from './SubmissionHistory';
import type { SubmissionDto } from '@/types';

describe('SubmissionHistory', () => {
  it('hiển thị thông báo khi chưa có lần nộp nào', () => {
    render(<SubmissionHistory submissions={[]} />);
    expect(screen.getByTestId('submission-history-empty')).toHaveTextContent('Chưa có lần nộp nào');
  });

  it('hiển thị danh sách lần nộp và scriptRevisionIds', () => {
    const mockSubs: SubmissionDto[] = [
      {
        id: 'sub-1',
        assignmentId: 'asg-1',
        chapterId: 'chap-1',
        submittedByUserId: 'user-writer-001',
        attemptNumber: 1,
        status: 'Rejected',
        submittedAt: '2026-10-22T08:00:00Z',
        decidedAt: '2026-10-22T09:00:00Z',
        decisionComment: 'Thoại tràn khỏi balloon',
        artworkReferenceIds: [],
        scriptRevisionIds: ['rev-scene-1-v2', 'rev-scene-2-v1'],
      },
      {
        id: 'sub-2',
        assignmentId: 'asg-1',
        chapterId: 'chap-1',
        submittedByUserId: 'user-writer-001',
        attemptNumber: 2,
        status: 'Pending',
        submittedAt: '2026-10-22T10:00:00Z',
        artworkReferenceIds: [],
      },
    ];

    render(<SubmissionHistory submissions={mockSubs} />);

    expect(screen.getByText('Lần 1')).toBeInTheDocument();
    expect(screen.getByText('Bị trả về')).toBeInTheDocument();
    expect(screen.getByText(/Thoại tràn khỏi balloon/)).toBeInTheDocument();

    const revContainer = screen.getByTestId('submission-script-revisions');
    expect(revContainer).toBeInTheDocument();
    expect(revContainer).toHaveTextContent('Revisions kịch bản:');
    expect(revContainer).toHaveTextContent('rev-scen…');

    expect(screen.getByText('Lần 2')).toBeInTheDocument();
    expect(screen.getByText('Chờ duyệt')).toBeInTheDocument();
  });
});
