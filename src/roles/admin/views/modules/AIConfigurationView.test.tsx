import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AIConfigurationView } from './AIConfigurationView';
import { adminService } from '@/services/admin.service';

vi.mock('@/services/admin.service', () => ({
  adminService: {
    getWorkspaces: vi.fn(),
    getWorkspaceAiConfig: vi.fn(),
    updateWorkspaceAiConfig: vi.fn(),
    getAiProviders: vi.fn(),
    createAiProvider: vi.fn(),
    updateAiProvider: vi.fn(),
    deleteAiProvider: vi.fn(),
    testAiProvider: vi.fn(),
    setWorkspaceAiProvider: vi.fn(),
    getAiUsage: vi.fn(),
    getAiUsageRecords: vi.fn(),
    exportAiUsage: vi.fn(),
  },
  downloadBlob: vi.fn(),
}));

const MOCK_PROVIDERS = [
  {
    id: 'cred-gemini-1',
    name: 'Gemini Chính',
    providerType: 'Gemini',
    accountId: null,
    keyHint: '••••9a1f',
    textModel: 'gemini-3.8-flash',
    imageModel: 'gemini-2.5-flash-image',
    isEnabled: true,
    workspaceCount: 2,
    createdAt: '2026-11-25T00:00:00Z',
  },
  {
    id: 'cred-cf-1',
    name: 'Cloudflare Dự phòng',
    providerType: 'Cloudflare',
    accountId: 'cf-acc-123',
    keyHint: '••••77bc',
    textModel: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    imageModel: null,
    isEnabled: true,
    workspaceCount: 0,
    createdAt: '2026-11-25T00:00:00Z',
  },
];

describe('AIConfigurationView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminService.getAiProviders).mockResolvedValue(MOCK_PROVIDERS);
    vi.mocked(adminService.getWorkspaces).mockResolvedValue([
      {
        id: 'ws-1',
        name: 'Studio Moonlight',
        ownerId: 'u-1',
        createdAt: '2026-11-01T00:00:00Z',
        memberCount: 5,
        seriesCount: 1,
      } as any,
    ]);
    vi.mocked(adminService.getWorkspaceAiConfig).mockResolvedValue({
      id: 'cfg-1',
      workspaceId: 'ws-1',
      provider: 'Google Gemini',
      hasApiKey: false,
      providerCredentialId: null,
      isEnabled: true,
      monthlyTokenQuota: 1000000,
      usedTokensCurrentMonth: 0,
      monthlyImageQuota: 0,
      usedImagesCurrentMonth: 0,
      allowedModels: [],
      createdAt: '2026-11-01T00:00:00Z',
    });
  });

  it('hiển thị đúng bộ KNOWN_MODELS mặc định (dòng 3.x trước, giữ dòng 2.5 cho key cũ)', async () => {
    render(<AIConfigurationView />);

    expect(await screen.findByText('gemini-3.8-flash', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('gemini-3.1-pro-preview')).toBeInTheDocument();
    expect(screen.getByText('gemini-2.5-flash')).toBeInTheDocument();
    expect(screen.getByText('gemini-2.5-pro')).toBeInTheDocument();
    expect(screen.getByText('gemini-2.5-flash-image', { selector: 'span' })).toBeInTheDocument();

    expect(screen.queryByText('gemini-1.5-pro')).not.toBeInTheDocument();
    expect(screen.queryByText('gemini-1.5-flash')).not.toBeInTheDocument();
    expect(screen.queryByText('claude-3-5-sonnet')).not.toBeInTheDocument();
    expect(screen.queryByText('gpt-4o')).not.toBeInTheDocument();
  });

  it('hiển thị danh sách API AI với keyHint (không lộ key) và gọi POST /test khi bấm Kiểm tra', async () => {
    vi.mocked(adminService.testAiProvider).mockResolvedValue({ ok: true });
    render(<AIConfigurationView />);

    expect(await screen.findByText('Gemini Chính')).toBeInTheDocument();
    expect(screen.getByText('••••9a1f')).toBeInTheDocument();
    expect(screen.getByText('Cloudflare Dự phòng')).toBeInTheDocument();
    expect(screen.getByText('cf-acc-123')).toBeInTheDocument();

    const testButtons = screen.getAllByRole('button', { name: /Kiểm tra|Test/i });
    fireEvent.click(testButtons[0]);

    await waitFor(() => {
      expect(adminService.testAiProvider).toHaveBeenCalledWith('cred-gemini-1');
    });
  });

  it('bắt buộc Account ID khi thêm API Cloudflare và hiện lỗi 400 nếu key sai', async () => {
    vi.mocked(adminService.createAiProvider).mockRejectedValue(
      new Error('Cloudflare token không hợp lệ.'),
    );
    render(<AIConfigurationView />);

    await screen.findByText('Gemini Chính');
    fireEvent.click(screen.getByRole('button', { name: /Thêm API|Add API/i }));

    fireEvent.change(screen.getByLabelText(/Tên hiển thị|Display name/i), {
      target: { value: 'CF Workers Mới' },
    });
    fireEvent.change(screen.getByLabelText(/Loại nhà cung cấp|Provider type/i), {
      target: { value: 'Cloudflare' },
    });
    fireEvent.change(screen.getByLabelText(/API Key \/ Token/i), {
      target: { value: 'bad-cf-token' },
    });

    // Chưa nhập Account ID -> chặn tại client
    fireEvent.click(screen.getByRole('button', { name: /Lưu API|Save API/i }));
    expect(adminService.createAiProvider).not.toHaveBeenCalled();

    // Nhập Account ID rồi gửi -> gọi BE và hiện lỗi 400 trong modal
    fireEvent.change(screen.getByLabelText(/Cloudflare Account ID/i), {
      target: { value: 'acc-999' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Lưu API|Save API/i }));

    expect(await screen.findByText('Cloudflare token không hợp lệ.')).toBeInTheDocument();
    expect(adminService.createAiProvider).toHaveBeenCalledWith({
      name: 'CF Workers Mới',
      providerType: 'Cloudflare',
      accountId: 'acc-999',
      apiKey: 'bad-cf-token',
      textModel: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      imageModel: null,
    });
  });

  it('xử lý lỗi 409 khi xoá API vẫn còn Studio đang sử dụng', async () => {
    vi.mocked(adminService.deleteAiProvider).mockRejectedValue(
      new Error('Còn 2 Workspace đang dùng API này.'),
    );
    render(<AIConfigurationView />);

    await screen.findByText('Gemini Chính');
    const deleteButtons = screen.getAllByRole('button', { name: /^Xoá$|^Delete$/i });
    fireEvent.click(deleteButtons[0]);

    fireEvent.click(screen.getByRole('button', { name: /Xoá API|Delete API/i }));

    expect(await screen.findByText('Còn 2 Workspace đang dùng API này.')).toBeInTheDocument();
    expect(adminService.deleteAiProvider).toHaveBeenCalledWith('cred-gemini-1');
  });

  it('gán API AI dùng chung cho Studio qua PUT /workspaces/{id}/ai-provider khi lưu cấu hình', async () => {
    vi.mocked(adminService.setWorkspaceAiProvider).mockResolvedValue({
      id: 'cfg-1',
      workspaceId: 'ws-1',
      provider: 'Google Gemini',
      hasApiKey: false,
      providerCredentialId: 'cred-cf-1',
      isEnabled: true,
      monthlyTokenQuota: 1000000,
      usedTokensCurrentMonth: 0,
      monthlyImageQuota: 0,
      usedImagesCurrentMonth: 0,
      allowedModels: [],
      createdAt: '2026-11-01T00:00:00Z',
    });
    vi.mocked(adminService.updateWorkspaceAiConfig).mockResolvedValue({
      id: 'cfg-1',
      workspaceId: 'ws-1',
      provider: 'Google Gemini',
      hasApiKey: false,
      providerCredentialId: 'cred-cf-1',
      isEnabled: true,
      monthlyTokenQuota: 1000000,
      usedTokensCurrentMonth: 0,
      monthlyImageQuota: 0,
      usedImagesCurrentMonth: 0,
      allowedModels: [],
      createdAt: '2026-11-01T00:00:00Z',
    });

    render(<AIConfigurationView />);

    const select = await screen.findByLabelText(/Nguồn API sử dụng|API source/i);
    fireEvent.change(select, { target: { value: 'cred-cf-1' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu cấu hình|Save configuration/i }));

    await waitFor(() => {
      expect(adminService.setWorkspaceAiProvider).toHaveBeenCalledWith('ws-1', 'cred-cf-1');
      expect(adminService.updateWorkspaceAiConfig).toHaveBeenCalled();
    });
  });
});
