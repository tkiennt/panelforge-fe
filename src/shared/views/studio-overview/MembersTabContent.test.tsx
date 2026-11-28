import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MembersTabContent } from './MembersTabContent';

const pending = {
  id: 'u-pending',
  name: 'Kenji',
  email: 'kenji@studio.vn',
  role: 'MEMBER',
  status: 'Pending',
  isEmailConfirmed: false,
  invitationEmailSent: false,
  isOwner: false,
};
const active = {
  id: 'u-active',
  name: 'Mai',
  email: 'mai@studio.vn',
  role: 'MEMBER',
  status: 'Active',
  isEmailConfirmed: true,
  isOwner: false,
};

describe('MembersTabContent invitation resend', () => {
  it('lets the producer resend only to pending members and flags unsent emails', async () => {
    const user = userEvent.setup();
    const onResend = vi.fn();
    render(
      <MembersTabContent
        filteredMembers={[pending, active]}
        canCreateStudio={true}
        onResendInvitation={onResend}
        onOpenEditAccess={vi.fn()}
      />,
    );

    expect(screen.getByText('Chưa gửi được mail')).toBeInTheDocument();
    const resendButtons = screen.getAllByRole('button', { name: 'Gửi lại lời mời' });
    expect(resendButtons).toHaveLength(1);

    await user.click(resendButtons[0]);
    expect(onResend).toHaveBeenCalledWith('u-pending');
  });

  it('disables the button while resending and hides it for non-producers', () => {
    const { rerender } = render(
      <MembersTabContent
        filteredMembers={[pending]}
        canCreateStudio={true}
        onResendInvitation={vi.fn()}
        resendingMemberId='u-pending'
        onOpenEditAccess={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Đang gửi...' })).toBeDisabled();

    rerender(
      <MembersTabContent
        filteredMembers={[pending]}
        canCreateStudio={false}
        onResendInvitation={vi.fn()}
        onOpenEditAccess={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole('button', { name: /Gửi lại lời mời|Đang gửi/ }),
    ).not.toBeInTheDocument();
  });
});
