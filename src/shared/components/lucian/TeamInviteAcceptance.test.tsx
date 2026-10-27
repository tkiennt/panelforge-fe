import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamInviteAcceptance } from './TeamInviteAcceptance';

describe('TeamInviteAcceptance Component (Lucian UX/UI Prompt #285)', () => {
  it('renders initial members and active counter badge correctly', () => {
    const initialMembers = [
      {
        id: '1',
        name: 'Eiichiro Oda',
        email: 'oda@shonen.com',
        role: 'Artist',
        status: 'Active' as const,
        isOwner: true,
      },
      {
        id: '2',
        name: 'Masashi Kishimoto',
        email: 'kishi@shonen.com',
        role: 'Writer',
        status: 'Joined' as const,
      },
    ];

    render(
      <TeamInviteAcceptance workspaceName='Grand Line Studio' initialMembers={initialMembers} />,
    );

    expect(screen.getByText('Thành viên')).toBeInTheDocument();
    expect(screen.getByText('Eiichiro Oda')).toBeInTheDocument();
    expect(screen.getByText('Masashi Kishimoto')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // active counter badge
  });

  it('lets the inviter pick any role from a dropdown and invites with that role', async () => {
    const user = userEvent.setup();
    const onInvite = vi.fn().mockResolvedValue(undefined);

    render(
      <TeamInviteAcceptance
        workspaceName='Grand Line Studio'
        availableRoles={['Artist', 'Writer', 'Editor']}
        onInvite={onInvite}
      />,
    );

    const roleSelect = screen.getByRole('combobox', { name: 'Vai trò mời' });
    expect(roleSelect).toHaveValue('Artist');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Artist',
      'Writer',
      'Editor',
    ]);

    // Chọn thẳng vai trò thứ ba, không phải bấm xoay vòng
    await user.selectOptions(roleSelect, 'Editor');
    expect(roleSelect).toHaveValue('Editor');

    await user.type(screen.getByPlaceholderText(/Nhập email/i), 'oda@shonen.com');
    await user.click(screen.getByRole('button', { name: /^Mời$/i }));

    expect(onInvite).toHaveBeenCalledWith('oda@shonen.com', 'Editor');
  });

  it('submits a new member invitation and displays pending state', async () => {
    const user = userEvent.setup();
    const onInvite = vi.fn().mockResolvedValue(undefined);

    render(<TeamInviteAcceptance workspaceName='Grand Line Studio' onInvite={onInvite} />);

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
      {
        id: 'mem-1',
        name: 'Tite Kubo',
        email: 'kubo@bleach.com',
        role: 'Artist',
        status: 'Joined' as const,
      },
    ];

    render(
      <TeamInviteAcceptance
        initialMembers={initialMembers}
        availableRoles={['Artist', 'Writer', 'Editor']}
        onRoleChange={onRoleChange}
      />,
    );

    const memberRole = screen.getByRole('combobox', { name: /Tite Kubo/i });
    await user.selectOptions(memberRole, 'Editor');

    expect(onRoleChange).toHaveBeenCalledWith('mem-1', 'kubo@bleach.com', 'Editor');
    expect(memberRole).toHaveValue('Editor');

    // Chọn lại đúng vai trò đang có thì không gọi API
    await user.selectOptions(memberRole, 'Editor');
    expect(onRoleChange).toHaveBeenCalledTimes(1);
  });

  it('keeps the owner fixed and shows a member role that is outside the list', () => {
    render(
      <TeamInviteAcceptance
        initialMembers={[
          {
            id: 'o',
            name: 'Owner',
            email: 'o@x.com',
            role: 'Producer',
            isOwner: true,
            status: 'Active' as const,
          },
          { id: 'p', name: 'Phó', email: 'p@x.com', role: 'Producer', status: 'Joined' as const },
        ]}
        availableRoles={['Artist', 'Writer']}
      />,
    );

    expect(screen.getByText('Chủ phòng')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /Owner/i })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Phó/i })).toHaveValue('Producer');
  });
});
