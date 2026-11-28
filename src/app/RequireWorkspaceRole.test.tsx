import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequireWorkspaceRole } from './RequireWorkspaceRole';
import { resolveCurrentWorkspaceRole, isRoleAllowed } from './workspaceRoleGuard';

describe('RequireWorkspaceRole', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('resolveCurrentWorkspaceRole helper', () => {
    it('ưu tiên propRole nếu được cung cấp', () => {
      const role = resolveCurrentWorkspaceRole('EDITOR', ['WRITER'], 'USER');
      expect(role).toBe('EDITOR');
    });

    it('dùng activeRoles[0] nếu propRole không có', () => {
      const role = resolveCurrentWorkspaceRole(null, ['ARTIST', 'LETTERER'], 'USER');
      expect(role).toBe('ARTIST');
    });

    it('đọc từ localStorage workspaceRole nếu không có prop', () => {
      localStorage.setItem('workspaceRole', 'WRITER');
      const role = resolveCurrentWorkspaceRole();
      expect(role).toBe('WRITER');
    });

    it('đọc từ localStorage activeWorkspace nếu có currentUserRole', () => {
      localStorage.setItem(
        'activeWorkspace',
        JSON.stringify({ id: 'ws-1', currentUserRole: 'LETTERER' }),
      );
      const role = resolveCurrentWorkspaceRole();
      expect(role).toBe('LETTERER');
    });

    it('chuẩn hóa ADMINISTRATOR khi có system role', () => {
      const role = resolveCurrentWorkspaceRole(null, [], 'ADMINISTRATOR');
      expect(role).toBe('ADMINISTRATOR');
    });

    it('chuẩn hóa PUBLISHER khi có system role', () => {
      const role = resolveCurrentWorkspaceRole(null, [], 'PUBLISHER');
      expect(role).toBe('PUBLISHER');
    });

    it('mặc định trả về PRODUCER nếu không có thông tin', () => {
      const role = resolveCurrentWorkspaceRole();
      expect(role).toBe('PRODUCER');
    });
  });

  describe('isRoleAllowed helper', () => {
    it('cho phép role khớp chính xác (case-insensitive)', () => {
      expect(isRoleAllowed('writer', ['WRITER', 'PRODUCER'])).toBe(true);
      expect(isRoleAllowed('PRODUCER', ['WRITER', 'PRODUCER'])).toBe(true);
    });

    it('chặn role không nằm trong danh sách cho phép', () => {
      expect(isRoleAllowed('ARTIST', ['WRITER', 'PRODUCER'])).toBe(false);
      expect(isRoleAllowed('EDITOR', ['PUBLISHER'])).toBe(false);
    });

    it('coi ADMIN và ADMINISTRATOR tương đương nhau', () => {
      expect(isRoleAllowed('ADMIN', ['ADMINISTRATOR'])).toBe(true);
      expect(isRoleAllowed('ADMINISTRATOR', ['ADMIN'])).toBe(true);
    });

    it('cho phép khi một trong các activeRoles khớp với allowedRoles', () => {
      expect(isRoleAllowed('ARTIST', ['EDITOR'], ['ARTIST', 'EDITOR'])).toBe(true);
      expect(isRoleAllowed('WRITER', ['LETTERER'], ['WRITER', 'LETTERER'])).toBe(true);
      expect(isRoleAllowed('ARTIST', ['PUBLISHER'], ['ARTIST', 'LETTERER'])).toBe(false);
    });

    it('từ chối ADMIN và ADMINISTRATOR trên các màn sản xuất không liệt kê ADMIN (BR-07)', () => {
      expect(isRoleAllowed('ADMINISTRATOR', ['ARTIST', 'WRITER'])).toBe(false);
      expect(isRoleAllowed('ADMIN', ['PRODUCER'])).toBe(false);
      expect(isRoleAllowed('USER', ['ARTIST'], [], 'ADMINISTRATOR')).toBe(false);
      expect(isRoleAllowed('PRODUCER', ['WRITER'], [], 'ADMINISTRATOR')).toBe(false);
      expect(isRoleAllowed('USER', ['ADMINISTRATOR'], [], 'ADMINISTRATOR')).toBe(true);
    });

    it('cho phép PRODUCER truy cập các màn sản xuất', () => {
      expect(isRoleAllowed('PRODUCER', ['ARTIST'])).toBe(true);
      expect(isRoleAllowed('PRODUCER', ['WRITER', 'EDITOR'])).toBe(true);
      expect(isRoleAllowed('PRODUCER', ['PUBLISHER'])).toBe(false);
    });
  });

  describe('Component rendering & Route guard', () => {
    const renderWithGuard = (
      allowedRoles: string[],
      currentWorkspaceRole?: any,
      currentRole?: any,
      activeRoles?: string[],
    ) => {
      return render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route path='/admin' element={<div data-testid='admin-home'>Admin Dashboard</div>} />
            <Route
              path='/protected'
              element={
                <RequireWorkspaceRole
                  allowedRoles={allowedRoles}
                  currentWorkspaceRole={currentWorkspaceRole}
                  currentRole={currentRole}
                  activeRoles={activeRoles}
                >
                  <div data-testid='protected-content'>Nội dung bảo vệ</div>
                </RequireWorkspaceRole>
              }
            />
          </Routes>
        </MemoryRouter>,
      );
    };

    it('hiển thị nội dung khi vai trò nằm trong allowedRoles', () => {
      renderWithGuard(['WRITER', 'PRODUCER'], 'WRITER');
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('workspace-role-forbidden')).not.toBeInTheDocument();
    });

    it('chuyển hướng Admin về /admin khi bị từ chối ở route sản xuất (BR-07)', () => {
      renderWithGuard(['WRITER', 'ARTIST', 'PRODUCER'], null, 'ADMINISTRATOR');
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.queryByTestId('workspace-role-forbidden')).not.toBeInTheDocument();
      expect(screen.getByTestId('admin-home')).toBeInTheDocument();
    });

    it('vẫn cho phép Admin mở route dành riêng cho Admin', () => {
      renderWithGuard(['ADMINISTRATOR'], null, 'ADMINISTRATOR');
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('admin-home')).not.toBeInTheDocument();
    });

    it('giữ nguyên hành vi cho phép Producer mở route sản xuất', () => {
      renderWithGuard(['WRITER'], 'PRODUCER');
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('workspace-role-forbidden')).not.toBeInTheDocument();
    });

    it('hiển thị 403 Forbidden Alert khi vai trò không được phép', () => {
      renderWithGuard(['PUBLISHER'], 'ARTIST');
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      const forbidden = screen.getByTestId('workspace-role-forbidden');
      expect(forbidden).toBeInTheDocument();
      expect(screen.getByText(/403 - Không có quyền truy cập/i)).toBeInTheDocument();
      expect(screen.getByText(/ARTIST/)).toBeInTheDocument();
    });

    it('hoạt động như layout route với <Outlet /> khi được phép', () => {
      render(
        <MemoryRouter initialEntries={['/parent/child']}>
          <Routes>
            <Route
              path='/parent'
              element={
                <RequireWorkspaceRole
                  allowedRoles={['EDITOR', 'PRODUCER']}
                  currentWorkspaceRole='EDITOR'
                />
              }
            >
              <Route
                path='child'
                element={<div data-testid='nested-child'>Trang con Editor</div>}
              />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
      expect(screen.getByTestId('nested-child')).toBeInTheDocument();
      expect(screen.queryByTestId('workspace-role-forbidden')).not.toBeInTheDocument();
    });

    it('chặn <Outlet /> và hiển thị 403 khi layout route bị từ chối quyền', () => {
      render(
        <MemoryRouter initialEntries={['/parent/child']}>
          <Routes>
            <Route
              path='/parent'
              element={
                <RequireWorkspaceRole allowedRoles={['PUBLISHER']} currentWorkspaceRole='WRITER' />
              }
            >
              <Route
                path='child'
                element={<div data-testid='nested-child'>Trang con Publisher</div>}
              />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
      expect(screen.queryByTestId('nested-child')).not.toBeInTheDocument();
      expect(screen.getByTestId('workspace-role-forbidden')).toBeInTheDocument();
    });
  });
});
