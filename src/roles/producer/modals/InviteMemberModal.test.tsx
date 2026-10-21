import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InviteMemberModal } from './InviteMemberModal';
import { workspaceService } from '@/services/workspace.service';

vi.mock('@/services/workspace.service', () => ({
  workspaceService: {
    getMembers: vi.fn().mockResolvedValue([]),
    addMember: vi.fn(),
    updateMemberRole: vi.fn().mockResolvedValue({}),
  },
}));

describe('InviteMemberModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders interactive invite mode by default with clean tabs', () => {
    render(
      <InviteMemberModal
        isOpen={true}
        workspaceId='ws-123'
        workspaceName='Manga Studio'
        onClose={vi.fn()}
        onInvited={vi.fn()}
        onShowToast={vi.fn()}
      />,
    );

    expect(screen.getByText('Mời thành viên')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Từng người/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nhiều email/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Nhập email/i)).toBeInTheDocument();
  });

  it('sends direct invitation in single invite mode', async () => {
    const user = userEvent.setup();
    vi.mocked(workspaceService.addMember).mockResolvedValue({
      userId: 'u-1',
      fullName: 'Oda Eiichiro',
      email: 'oda@studio.com',
      role: 'Artist',
      isOwner: false,
      joinedAt: new Date().toISOString(),
      isEmailConfirmed: false,
      invitationEmailSent: true,
    });

    const onInvited = vi.fn();
    const onShowToast = vi.fn();

    render(
      <InviteMemberModal
        isOpen={true}
        workspaceId='ws-123'
        workspaceName='Manga Studio'
        onClose={vi.fn()}
        onInvited={onInvited}
        onShowToast={onShowToast}
      />,
    );

    const input = screen.getByPlaceholderText(/Nhập email/i);
    await user.type(input, 'oda@studio.com');

    const inviteBtn = screen.getByRole('button', { name: /^Mời$/i });
    await user.click(inviteBtn);

    expect(workspaceService.addMember).toHaveBeenCalledWith('ws-123', {
      email: 'oda@studio.com',
      role: 'Writer',
    });
    expect(onInvited).toHaveBeenCalled();
    expect(onShowToast).toHaveBeenCalledWith(
      'Đã gửi lời mời',
      expect.stringContaining('oda@studio.com'),
    );
  });

  it('switches to Batch mode, adds multiple emails, and submits batch', async () => {
    const user = userEvent.setup();
    vi.mocked(workspaceService.addMember).mockResolvedValue({
      userId: 'u-2',
      fullName: 'Kishimoto',
      email: 'kishi@studio.com',
      role: 'Writer',
      isOwner: false,
      joinedAt: new Date().toISOString(),
      isEmailConfirmed: false,
      invitationEmailSent: true,
    });

    const onInvited = vi.fn();
    render(
      <InviteMemberModal
        isOpen={true}
        workspaceId='ws-123'
        workspaceName='Manga Studio'
        initialMode='batch'
        onClose={vi.fn()}
        onInvited={onInvited}
        onShowToast={vi.fn()}
      />,
    );

    const textarea = screen.getByPlaceholderText(/artist@studio.com/i);
    await user.type(textarea, 'kishi@studio.com, kubo@studio.com');

    const addBtn = screen.getByRole('button', { name: /Thêm vào danh sách/i });
    await user.click(addBtn);

    expect(screen.getByText('kishi@studio.com')).toBeInTheDocument();
    expect(screen.getByText('kubo@studio.com')).toBeInTheDocument();
    expect(screen.getByText(/Danh sách mời \(2\)/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Gửi lời mời/i });
    await user.click(submitBtn);

    expect(workspaceService.addMember).toHaveBeenCalled();
    expect(onInvited).toHaveBeenCalled();

    // Confirm result modal appears with clean title
    expect(await screen.findByText('Kết quả gửi lời mời')).toBeInTheDocument();
    expect(screen.getByText('Gửi thành công')).toBeInTheDocument();
  });
});
