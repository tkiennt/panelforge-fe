import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamInviteAcceptance } from './TeamInviteAcceptance';

describe('TeamInviteAcceptance Component (Lucian UX/UI Prompt #285)', () => {
  it('renders initial members and active counter badge correctly', () => {
    const initialMembers = [
      { id: '1', name: 'Eiichiro Oda', email: 'oda@shonen.com', role: 'Artist', status: 'Active' as const, isOwner: true },
      { id: '2', name: 'Masashi Kishimoto', email: 'kishi@shonen.com', role: 'Writer', status: 'Joined' as const },
    ];

    render(
      <TeamInviteAcceptance
        workspaceName='Grand Line Studio'
        initialMembers={initialMembers}
      />,
    );

    expect(screen.getByText('Thành viên')).toBeInTheDocument();
    expect(screen.getByText('Eiichiro Oda')).toBeInTheDocument();
    expect(screen.getByText('Masashi Kishimoto')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // active counter badge
  });

  it('cycles through available roles on role pill button click', async () => {
    const user = userEvent.setup();
    const availableRoles = ['Artist', 'Writer', 'Editor'];

    render(
      <TeamInviteAcceptance
        workspaceName='Grand Line Studio'
        availableRoles={availableRoles}
      />,
    );

    const roleBtn = screen.getByTitle(/Đổi vai trò mặc định/i);
    expect(roleBtn).toHaveTextContent('Artist');

    await user.click(roleBtn);
    expect(roleBtn).toHaveTextContent('Writer');

    await user.click(roleBtn);
    expect(roleBtn).toHaveTextContent('Editor');

    await user.click(roleBtn);
    expect(roleBtn).toHaveTextContent('Artist');
  });

  it('submits a new member invitation and displays pending state', async () => {
    const user = userEvent.setup();
    const onInvite = vi.fn().mockResolvedValue(undefined);

    render(
      <TeamInviteAcceptance
        workspaceName='Grand Line Studio'
        onInvite={onInvite}
      />,
    );

    const input = screen.getByPlaceholderText(/Nhập email/i);
    const submitBtn = screen.getByRole('button', { name: /^Mời$/i });

    // Submit button should be disabled when empty/invalid
    expect(submitBtn).toBeDisabled();

    await user.type(input, 'editor@shonen.com');
    expect(submitBtn).toBeEnabled();

    await user.click(submitBtn);

    expect(onInvite).toHaveBeenCalledWith('editor@shonen.com', 'Artist');
    expect(await screen.findByText('editor@shonen.com')).toBeInTheDocument();
    expect(screen.getByText(/Chờ duyệt/i)).toBeInTheDocument();
  });

  it('cycles member role and notifies onRoleChange callback', async () => {
    const user = userEvent.setup();
    const onRoleChange = vi.fn();
    const initialMembers = [
      { id: 'mem-1', name: 'Tite Kubo', email: 'kubo@bleach.com', role: 'Artist', status: 'Joined' as const },
    ];

    render(
      <TeamInviteAcceptance
        initialMembers={initialMembers}
        availableRoles={['Artist', 'Writer', 'Editor']}
        onRoleChange={onRoleChange}
      />,
    );

    const memberRoleBtn = screen.getByRole('button', { name: /Tite Kubo/i });
    await user.click(memberRoleBtn);

    expect(onRoleChange).toHaveBeenCalledWith('mem-1', 'kubo@bleach.com', 'Writer');
    expect(memberRoleBtn).toHaveTextContent('Writer');
  });
});
