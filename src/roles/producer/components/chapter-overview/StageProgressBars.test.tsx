import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StageProgressBars } from './StageProgressBars';
import type { StageProgressBreakdownDto } from '@/services/chapter.service';

describe('StageProgressBars', () => {
  const sampleStages: StageProgressBreakdownDto[] = [
    {
      stageId: 'stage-3',
      stageName: 'Coloring',
      stageOrder: 3,
      totalTasks: 10,
      approvedTasks: 10,
      submittedTasks: 0,
      inProgressTasks: 0,
      reworkTasks: 0,
      unassignedTasks: 0,
    },
    {
      stageId: 'stage-1',
      stageName: 'Layout / Storyboard',
      stageOrder: 1,
      totalTasks: 10,
      approvedTasks: 4,
      submittedTasks: 2,
      inProgressTasks: 2,
      reworkTasks: 1,
      unassignedTasks: 1,
    },
    {
      stageId: 'stage-2',
      stageName: 'Line Art / Inking',
      stageOrder: 2,
      totalTasks: 0,
      approvedTasks: 0,
      submittedTasks: 0,
      inProgressTasks: 0,
      reworkTasks: 0,
      unassignedTasks: 0,
    },
  ];

  it('renders stages sorted by stageOrder', () => {
    render(<StageProgressBars stages={sampleStages} />);

    const stageNames = screen.getAllByRole('img').map((el) => {
      return el.querySelector('span.w-36')?.textContent;
    });

    expect(stageNames).toEqual(['Layout / Storyboard', 'Line Art / Inking', 'Coloring']);
  });

  it('calculates segment widths correctly as percentages', () => {
    render(<StageProgressBars stages={sampleStages} />);

    // Stage 1 has totalTasks: 10
    // approved: 4 (40%), submitted: 2 (20%), inProgress: 2 (20%), rework: 1 (10%), unassigned: 1 (10%)
    const approvedSegment = screen.getByTitle(/^Đã duyệt: 4|^Approved: 4/);
    const submittedSegment = screen.getByTitle(/^Chờ duyệt: 2|^In review: 2/);
    const inProgressSegment = screen.getByTitle(/^Đang làm: 2|^In progress: 2/);
    const reworkSegment = screen.getByTitle(/^Cần sửa: 1|^Rework: 1/);
    const unassignedSegment = screen.getByTitle(/^Chưa giao: 1|^Unassigned: 1/);

    expect(approvedSegment).toHaveStyle({ width: '40%' });
    expect(approvedSegment).toHaveClass('bg-emerald-500');

    expect(submittedSegment).toHaveStyle({ width: '20%' });
    expect(submittedSegment).toHaveClass('bg-amber-400');

    expect(inProgressSegment).toHaveStyle({ width: '20%' });
    expect(inProgressSegment).toHaveClass('bg-blue-400');

    expect(reworkSegment).toHaveStyle({ width: '10%' });
    expect(reworkSegment).toHaveClass('bg-rose-500');

    expect(unassignedSegment).toHaveStyle({ width: '10%' });
    expect(unassignedSegment).toHaveClass('bg-stone-300');

    // Right side approved/total text
    expect(screen.getByText('4/10')).toBeInTheDocument();
  });

  it('displays empty tasks text when totalTasks is 0 without showing progress bar or 0/0', () => {
    render(<StageProgressBars stages={sampleStages} />);

    // Stage 2 has totalTasks: 0
    expect(screen.getByText('Chưa có công việc')).toBeInTheDocument();
    expect(screen.queryByText('0/0')).not.toBeInTheDocument();
  });

  it('provides accessible role="img" and aria-label summarizing task counts on each stage row', () => {
    render(<StageProgressBars stages={sampleStages} />);

    const rows = screen.getAllByRole('img');
    expect(rows).toHaveLength(3);

    // Row 1 (stage 1)
    expect(rows[0]).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Layout / Storyboard: 4/10'),
    );

    // Row 2 (stage 2 with 0 tasks)
    expect(rows[1]).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Line Art / Inking: Chưa có công việc'),
    );
  });

  it('renders legend with 5 status labels and dots', () => {
    render(<StageProgressBars stages={sampleStages} />);

    expect(screen.getByText('Đã duyệt')).toBeInTheDocument();
    expect(screen.getByText('Chờ duyệt')).toBeInTheDocument();
    expect(screen.getByText('Đang làm')).toBeInTheDocument();
    expect(screen.getByText('Cần sửa')).toBeInTheDocument();
    expect(screen.getByText('Chưa giao')).toBeInTheDocument();
  });

  it('returns null if stages list is empty', () => {
    const { container } = render(<StageProgressBars stages={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
