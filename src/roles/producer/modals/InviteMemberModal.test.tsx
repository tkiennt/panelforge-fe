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

  it('renders invite modal with email input and base role radio cards', () => {
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

    expect(screen.getByText('Mời thành viên mới vào Studio')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/vd: artist.kenji@mappa.jp/i)).toBeInTheDocument();
    expect(screen.getByText(/Họa sĩ chì \/ Name \(Lead Artist\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Biên kịch \(Writer\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gửi lời mời & Cấp quyền/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hủy bỏ/i })).toBeInTheDocument();
  });

  it('sends direct invitation with selected role', async () => {
    const user = userEvent.setup();
    vi.mocked(workspaceService.addMember).mockResolvedValue({
      userId: 'u-1',
      fullName: 'Kenji Sato',
      email: 'artist.kenji@mappa.jp',
      role: 'Artist',
      isOwner: false,
      joinedAt: new Date().toISOString(),
      isEmailConfirmed: false,
      invitationEmailSent: true,
    });

    const onInvited = vi.fn();
    const onShowToast = vi.fn();
    const onClose = vi.fn();

    render(
      <InviteMemberModal
        isOpen={true}
        workspaceId='ws-123'
        workspaceName='Manga Studio'
        onClose={onClose}
        onInvited={onInvited}
        onShowToast={onShowToast}
      />,
    );

    const input = screen.getByPlaceholderText(/vd: artist.kenji@mappa.jp/i);
    await user.type(input, 'artist.kenji@mappa.jp');

    // Select Writer role
    const writerRadio = screen.getByDisplayValue('Writer');
    await user.click(writerRadio);

    const submitBtn = screen.getByRole('button', { name: /Gửi lời mời & Cấp quyền/i });
    await user.click(submitBtn);

    expect(workspaceService.addMember).toHaveBeenCalledWith('ws-123', {
      email: 'artist.kenji@mappa.jp',
      role: 'Writer',
    });
    expect(onInvited).toHaveBeenCalled();
    expect(onShowToast).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('validates email format before submission', async () => {
    const user = userEvent.setup();
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

    const input = screen.getByPlaceholderText(/vd: artist.kenji@mappa.jp/i);
    await user.type(input, 'invalid-email');

    const submitBtn = screen.getByRole('button', { name: /Gửi lời mời & Cấp quyền/i });
    await user.click(submitBtn);

    expect(workspaceService.addMember).not.toHaveBeenCalled();
    expect(screen.getByText(/Vui lòng nhập định dạng email hợp lệ/i)).toBeInTheDocument();
  });
});
