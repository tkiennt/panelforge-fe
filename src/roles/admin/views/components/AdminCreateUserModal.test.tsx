import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminCreateUserModal } from './AdminCreateUserModal';
import { adminService } from '@/services/admin.service';

vi.mock('@/services/admin.service', () => ({
  adminService: { createUser: vi.fn() },
}));

const renderModal = (onCreated = vi.fn()) => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AdminCreateUserModal onClose={vi.fn()} onCreated={onCreated} />
    </QueryClientProvider>,
  );
  return onCreated;
};

const fill = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('AdminCreateUserModal', () => {
  beforeEach(() => {
    vi.mocked(adminService.createUser).mockReset();
  });

  it('creates an active Administrator account', async () => {
    const created = { id: 'u2', email: 'second@panelforge.vn' } as never;
    vi.mocked(adminService.createUser).mockResolvedValue(created);
    const onCreated = renderModal();

    fill(/^Email/, ' second@panelforge.vn ');
    fill(/Họ và tên/, 'Quản Trị 2');
    fill(/Mật khẩu tạm/, 'Secret#123');
    fireEvent.click(screen.getByRole('radio', { name: /Administrator/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    expect(adminService.createUser).toHaveBeenCalledWith({
      email: 'second@panelforge.vn',
      fullName: 'Quản Trị 2',
      password: 'Secret#123',
      role: 'Admin',
      isActive: true,
    });
  });

  it('blocks submit when the password is too short and shows server errors', async () => {
    vi.mocked(adminService.createUser).mockImplementation(async () => {
      throw new Error('Email đã tồn tại.');
    });
    renderModal();

    fill(/^Email/, 'a@panelforge.vn');
    fill(/Họ và tên/, 'A');
    fill(/Mật khẩu tạm/, '123');
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    expect(await screen.findByText('Mật khẩu phải có ít nhất 6 ký tự.')).toBeTruthy();
    expect(adminService.createUser).not.toHaveBeenCalled();

    fill(/Mật khẩu tạm/, '123456');
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    expect(await screen.findByText('Email đã tồn tại.')).toBeTruthy();
  });
});
