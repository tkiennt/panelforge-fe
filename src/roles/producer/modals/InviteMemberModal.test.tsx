import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InviteMemberModal } from './InviteMemberModal';
import { workspaceService } from '@/services/workspace.service';

vi.mock('@/services/workspace.service', () => ({
  workspaceService: {
    addMember: vi.fn(),
  },
}));

describe('InviteMemberModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('render form mời với hỗ trợ nhập nhiều email', () => {
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

    expect(screen.getByText('Mời Thành Viên Vào Studio')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/artist1@studio.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thêm vào danh sách/i })).toBeInTheDocument();
  });

  it('phân tích và hiển thị danh sách nhiều email khi bấm Thêm', async () => {
    const user = userEvent.setup();
    render(
      <InviteMemberModal
        isOpen={true}
        workspaceId='ws-123'
        onClose={vi.fn()}
        onInvited={vi.fn()}
        onShowToast={vi.fn()}
      />,
    );

    const textarea = screen.getByPlaceholderText(/artist1@studio.com/i);
    await user.type(textarea, 'oda@studio.com, kishi@studio.com');

    const addBtn = screen.getByRole('button', { name: /Thêm vào danh sách/i });
    await user.click(addBtn);

    expect(screen.getByText('oda@studio.com')).toBeInTheDocument();
    expect(screen.getByText('kishi@studio.com')).toBeInTheDocument();
    expect(screen.getByText(/Danh sách chuẩn bị gửi \(2\)/i)).toBeInTheDocument();
  });

  it('gửi lời mời hàng loạt và hiển thị modal báo cáo kết quả', async () => {
    const user = userEvent.setup();
    vi.mocked(workspaceService.addMember).mockResolvedValue({
      userId: 'u-1',
      fullName: 'Oda',
      email: 'oda@studio.com',
      role: 'Artist',
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
        onClose={vi.fn()}
        onInvited={onInvited}
        onShowToast={vi.fn()}
      />,
    );

    const textarea = screen.getByPlaceholderText(/artist1@studio.com/i);
    await user.type(textarea, 'oda@studio.com');
    await user.click(screen.getByRole('button', { name: /Thêm vào danh sách/i }));

    const submitBtn = screen.getByRole('button', { name: /Gửi Lời Mời/i });
    await user.click(submitBtn);

    expect(workspaceService.addMember).toHaveBeenCalledWith('ws-123', {
      email: 'oda@studio.com',
      role: 'Artist',
    });
    expect(onInvited).toHaveBeenCalled();

    // Xác nhận modal kết quả xuất hiện
    expect(await screen.findByText('Báo Cáo Kết Quả Mời Thành Viên')).toBeInTheDocument();
    expect(screen.getByText('Gửi thành công')).toBeInTheDocument();
  });
});
