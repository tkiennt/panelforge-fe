import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChangePasswordModal } from './ChangePasswordModal';
import { authService } from '../../services/auth.service';

vi.mock('../../services/auth.service', () => ({
  authService: {
    changePassword: vi.fn(),
  },
}));

describe('ChangePasswordModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'mock-token-xyz');
  });

  it('renders all fields in English when 2FA is disabled', () => {
    render(
      <ChangePasswordModal
        isOpen={true}
        onClose={mockOnClose}
        twoFactorEnabled={false}
      />
    );

    expect(screen.getByText('Change Password')).toBeInTheDocument();
    expect(screen.getByText('Current Password')).toBeInTheDocument();
    expect(screen.getByText('New Password')).toBeInTheDocument();
    expect(screen.getByText('Confirm New Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();

    // 2FA warning and OTP input should NOT be present
    expect(
      screen.queryByText('2FA is enabled. Please enter the 6-digit code from your Authenticator app.')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Authenticator Code (6 digits)')).not.toBeInTheDocument();
  });

  it('renders 2FA red warning and OTP input when twoFactorEnabled is true', () => {
    render(
      <ChangePasswordModal
        isOpen={true}
        onClose={mockOnClose}
        twoFactorEnabled={true}
      />
    );

    expect(
      screen.getByText('2FA is enabled. Please enter the 6-digit code from your Authenticator app.')
    ).toBeInTheDocument();
    expect(screen.getByText('Authenticator Code (6 digits)')).toBeInTheDocument();
  });

  it('submits form with currentPassword, newPassword, confirmPassword and otpCode', async () => {
    const user = userEvent.setup();
    vi.mocked(authService.changePassword).mockResolvedValueOnce({
      success: true,
      message: 'Password changed successfully.',
    });

    render(
      <ChangePasswordModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        twoFactorEnabled={true}
      />
    );

    const inputs = screen.getAllByPlaceholderText('••••••••');
    const currentPassInput = inputs[0];
    const newPassInput = inputs[1];
    const confirmPassInput = inputs[2];
    const otpInput = screen.getByPlaceholderText('000000');
    const submitBtn = screen.getByRole('button', { name: /Save Changes/i });

    await user.type(currentPassInput, 'OldPass123!');
    await user.type(newPassInput, 'NewPass123!');
    await user.type(confirmPassInput, 'NewPass123!');
    await user.type(otpInput, '123456');

    await user.click(submitBtn);

    expect(authService.changePassword).toHaveBeenCalledWith(
      {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!',
        confirmPassword: 'NewPass123!',
        otpCode: '123456',
      },
      'mock-token-xyz'
    );
  });
});
