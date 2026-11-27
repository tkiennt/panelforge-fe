import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MyWorkHubView } from './MyWorkHubView';
import { flattenMyWork, lotHref } from './myWorkItems';
import { assignmentService } from '@/services/assignment.service';

vi.mock('@/services/assignment.service', () => ({ assignmentService: { getMyWork: vi.fn() } }));

const lot = (id: string, role: string, statuses: string[]) =>
  ({
    id,
    seriesId: 's1',
    seriesTitle: 'Brainrot',
    chapterId: 'c1',
    chapterNumber: 2,
    stageName: role === 'WRITER' ? 'Script' : 'Pencil',
    assignedRole: role,
    isOverdue: false,
    tasks: statuses.map((status, i) => ({ id: `${id}-t${i}`, pageNumber: i + 1, status })),
  }) as any;

const studios = [
  {
    workspaceId: 'w1',
    workspaceName: 'GG',
    lots: [lot('a', 'ARTIST', ['InProgress']), lot('b', 'ARTIST', ['ReworkRequired'])],
    reviewQueue: [
      {
        taskId: 'rv1',
        seriesId: 's1',
        seriesTitle: 'Brainrot',
        chapterId: 'c1',
        chapterNumber: 2,
        stageName: 'Color',
        pageNumber: 3,
        status: 'Submitted',
      },
    ],
  },
  {
    workspaceId: 'w2',
    workspaceName: 'Moonlight',
    lots: [lot('c', 'WRITER', ['Assigned'])],
    reviewQueue: [],
  },
] as any;

describe('MyWorkHubView helpers', () => {
  it('groups lots into in-progress / needs-fixes and review items into to-review', () => {
    const items = flattenMyWork(studios);
    expect(items.map((i) => [i.key, i.bucket])).toEqual([
      ['lot-a', 'inProgress'],
      ['lot-b', 'rework'],
      ['review-rv1', 'toReview'],
      ['lot-c', 'inProgress'],
    ]);
  });

  it('opens the desk that matches the role', () => {
    expect(lotHref('w1', lot('a', 'ARTIST', ['InProgress']))).toContain(
      '/workspaces/w1/series/s1/artist/desk',
    );
    expect(lotHref('w2', lot('c', 'WRITER', ['Assigned']))).toContain(
      '/workspaces/w2/series/s1/script/editor',
    );
  });
});

describe('MyWorkHubView', () => {
  it('shows the studio directory header with a way back to the studio list and logout', async () => {
    vi.mocked(assignmentService.getMyWork).mockResolvedValue([]);
    const onLogout = vi.fn();
    render(
      <MemoryRouter>
        <MyWorkHubView currentUser={{ name: 'Alex Producer', role: 'USER' }} onLogout={onLogout} />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('link', { name: /Workspaces/ })).toHaveAttribute(
      'href',
      '/workspaces',
    );
    expect(screen.getByText('Alex Producer')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Đăng xuất|Log out|Logout/i }));
    expect(onLogout).toHaveBeenCalled();
  });

  it('lists work across studios and filters by studio', async () => {
    vi.mocked(assignmentService.getMyWork).mockResolvedValue(studios);
    render(
      <MemoryRouter>
        <MyWorkHubView />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('my-work-item-lot-a')).toBeInTheDocument();
    expect(screen.getByTestId('my-work-item-lot-c')).toBeInTheDocument();

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'w2' } });
    expect(screen.queryByTestId('my-work-item-lot-a')).toBeNull();
    expect(screen.getByTestId('my-work-item-lot-c')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('my-work-bucket-toReview'));
    expect(screen.queryByTestId('my-work-item-review-rv1')).toBeNull(); // đang lọc Studio Moonlight
  });
});
