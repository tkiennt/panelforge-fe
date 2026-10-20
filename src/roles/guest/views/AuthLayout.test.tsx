import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';

vi.mock('./LandingPageView', () => ({ LandingPageView: () => <div /> }));
vi.mock('../components/VersionedBlueprintVisual', () => ({ VersionedBlueprintVisual: () => null }));

const Where = () => <div data-testid='where'>{useLocation().pathname + useLocation().search}</div>;

const renderAt = (entries: string[]) =>
  render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <Routes>
        <Route
          path='/login'
          element={
            <AuthLayout mode='login'>
              <div>form</div>
            </AuthLayout>
          }
        />
        <Route path='*' element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

describe('AuthLayout đóng dialog', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
  });

  it('bị đẩy từ trang cần đăng nhập (?redirect) thì đóng về trang chủ, không quay lại trang riêng tư', async () => {
    renderAt([
      '/workspaces/ws-1/series/se-1/workspace',
      '/login?redirect=%2Fworkspaces%2Fws-1%2Fseries%2Fse-1%2Fworkspace',
    ]);
    await userEvent.click(screen.getByTestId('auth-close-btn'));
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/$/);
  });

  it('redirect tới trang công khai (catalog) thì quay về đó', async () => {
    renderAt(['/login?redirect=%2Fcatalog']);
    await userEvent.keyboard('{Escape}');
    expect(screen.getByTestId('where')).toHaveTextContent('/catalog');
  });
});
