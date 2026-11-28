import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProductionMetricsList } from './ProductionMetricsList';
import type { ChapterProductionProgressDto } from '@/services/chapter.service';

describe('ProductionMetricsList', () => {
  const sampleProduction: ChapterProductionProgressDto = {
    totalTasks: 9,
    approvedTasks: 4,
    submittedTasks: 2,
    inProgressTasks: 2,
    reworkTasks: 1,
    unassignedTasks: 0,
    overdueTasks: 1,
    taskProgressPercent: 44,
    totalPages: 3,
    completedPages: 1,
    pageProgressPercent: 33,
    totalPanels: 12,
    approvedPanels: 0,
    panelProgressPercent: 0,
    stages: [],
  };

  it('renders all 3 rows with proper data-testid and formatted metrics', () => {
    render(<ProductionMetricsList production={sampleProduction} />);

    const taskRow = screen.getByTestId('metric-task-progress');
    const pageRow = screen.getByTestId('metric-page-progress');
    const panelRow = screen.getByTestId('metric-panel-progress');

    expect(taskRow).toBeInTheDocument();
    expect(pageRow).toBeInTheDocument();
    expect(panelRow).toBeInTheDocument();

    expect(taskRow).toHaveTextContent('4/9 (44%)');
    expect(pageRow).toHaveTextContent('1/3 (33%)');
    expect(panelRow).toHaveTextContent('0/12 (0%)');
  });

  it('renders tooltips for page and panel labels from completed hint keys', () => {
    render(<ProductionMetricsList production={sampleProduction} />);

    const pageLabel = screen.getByTitle(
      /^Đạt đủ duyệt ở mọi công đoạn của trang|^Approved across all stages/,
    );
    const panelLabel = screen.getByTitle(
      /^Khung tranh đã duyệt tại công đoạn cuối|^Panels approved at the final stage/,
    );

    expect(pageLabel).toBeInTheDocument();
    expect(panelLabel).toBeInTheDocument();
  });

  it('renders chips for pending and in-progress tasks, and only renders rework/overdue when > 0', () => {
    const { rerender } = render(<ProductionMetricsList production={sampleProduction} />);

    // When rework > 0 and overdue > 0
    expect(screen.getByText(/^Chờ duyệt: 2|^In review: 2/)).toBeInTheDocument();
    expect(screen.getByText(/^Đang làm: 2|^In progress: 2/)).toBeInTheDocument();
    expect(screen.getByText(/^Cần sửa: 1|^Rework: 1/)).toBeInTheDocument();
    expect(screen.getByText(/^Quá hạn: 1|^Overdue: 1/)).toBeInTheDocument();

    // When rework = 0 and overdue = 0
    const zeroIssuesProduction: ChapterProductionProgressDto = {
      ...sampleProduction,
      reworkTasks: 0,
      overdueTasks: 0,
    };

    rerender(<ProductionMetricsList production={zeroIssuesProduction} />);

    expect(screen.getByText(/^Chờ duyệt: 2|^In review: 2/)).toBeInTheDocument();
    expect(screen.getByText(/^Đang làm: 2|^In progress: 2/)).toBeInTheDocument();
    expect(screen.queryByText(/^Cần sửa|^Rework/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Quá hạn|^Overdue/)).not.toBeInTheDocument();
  });

  it('renders empty fallback text when totals are 0 and handles production=null', () => {
    const emptyProduction: ChapterProductionProgressDto = {
      totalTasks: 0,
      approvedTasks: 0,
      submittedTasks: 0,
      inProgressTasks: 0,
      reworkTasks: 0,
      unassignedTasks: 0,
      overdueTasks: 0,
      taskProgressPercent: 0,
      totalPages: 0,
      completedPages: 0,
      pageProgressPercent: 0,
      totalPanels: 0,
      approvedPanels: 0,
      panelProgressPercent: 0,
      stages: [],
    };

    const { rerender } = render(<ProductionMetricsList production={emptyProduction} />);

    expect(screen.getByTestId('metric-task-progress')).toHaveTextContent(
      /Chưa có công việc|No tasks yet/,
    );
    expect(screen.getByTestId('metric-page-progress')).toHaveTextContent(
      /Chưa có trang|No pages yet/,
    );
    expect(screen.getByTestId('metric-panel-progress')).toHaveTextContent(
      /Chưa có khung tranh|No panels yet/,
    );
    expect(screen.queryByText(/0\/0/)).not.toBeInTheDocument();

    // Graceful handling of null production
    rerender(<ProductionMetricsList production={null} />);

    expect(screen.getByTestId('metric-task-progress')).toHaveTextContent(
      /Chưa có công việc|No tasks yet/,
    );
    expect(screen.getByTestId('metric-page-progress')).toHaveTextContent(
      /Chưa có trang|No pages yet/,
    );
    expect(screen.getByTestId('metric-panel-progress')).toHaveTextContent(
      /Chưa có khung tranh|No panels yet/,
    );
    expect(screen.queryByText(/0\/0/)).not.toBeInTheDocument();
  });
});
