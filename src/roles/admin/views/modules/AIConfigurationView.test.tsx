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
    getAiProviderModels: vi.fn(),
    testAiProvider: vi.fn(),
    setWorkspaceAiProvider: vi.fn(),
    setWorkspaceAiImageProvider: vi.fn(),
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
      imageModel: '@cf/black-forest-labs/flux-1-schnell',
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

  it('ẩn các ô Gemini riêng, hiện khung Đang dùng và Trạng thái key theo API dùng chung khi providerCredentialId khác null', async () => {
    vi.mocked(adminService.getWorkspaceAiConfig).mockResolvedValue({
      id: 'cfg-1',
      workspaceId: 'ws-1',
      provider: 'Google Gemini',
      hasApiKey: false,
      providerCredentialId: 'cred-cf-1',
      isEnabled: true,
      monthlyTokenQuota: 1000000,
      usedTokensCurrentMonth: 0,
      monthlyImageQuota: 50,
      usedImagesCurrentMonth: 0,
      allowedModels: ['gemini-3.8-flash'],
      createdAt: '2026-11-01T00:00:00Z',
    });

    render(<AIConfigurationView />);

    const banner = await screen.findByTestId('studio-shared-api-banner');
    expect(banner).toHaveTextContent('Đang dùng: Cloudflare Dự phòng · Cloudflare · ••••77bc');
    expect(banner).toHaveTextContent('Chữ:');
    expect(banner).toHaveTextContent('@cf/meta/llama-3.3-70b-instruct-fp8-fast');
    expect(banner).toHaveTextContent('[Miễn phí]');
    expect(banner).toHaveTextContent('Ảnh:');
    expect(banner).toHaveTextContent('mặc định');

    // Ẩn Nhà cung cấp, API key riêng và Model được phép
    expect(screen.queryByLabelText(/^Nhà cung cấp$|^Provider$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^API key$/i)).not.toBeInTheDocument();
    expect(screen.queryByText('gemini-3.1-pro-preview')).not.toBeInTheDocument();

    // Giữ nguyên 2 ô quota
    expect(screen.getByLabelText(/Quota token mỗi tháng|Monthly token quota/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Quota sinh ảnh mỗi tháng|Monthly image quota/i)).toBeInTheDocument();

    // Dòng Trạng thái key hiện theo API dùng chung (tên + keyHint + Bật/Tắt), không hiện Chưa có API key
    const keyStatus = screen.getByTestId('ai-key-status');
    expect(keyStatus).toHaveTextContent('Cloudflare Dự phòng · ••••77bc · Đang bật');
    expect(keyStatus).not.toHaveTextContent(/Chưa có API key|No API key/i);
  });

  it('cho phép chọn nhiều Studio khi Thêm API và báo lỗi riêng nếu gán Studio thất bại sau khi đã tạo API', async () => {
    vi.mocked(adminService.getWorkspaces).mockResolvedValue([
      { id: 'ws-1', name: 'Studio Moonlight', ownerId: 'u-1', createdAt: '2026-11-01T00:00:00Z' } as any,
      { id: 'ws-2', name: 'Studio Sunrise', ownerId: 'u-2', createdAt: '2026-11-01T00:00:00Z' } as any,
    ]);
    vi.mocked(adminService.createAiProvider).mockResolvedValue({
      id: 'cred-new',
      name: 'Gemini Mới',
      providerType: 'Gemini',
      accountId: null,
      keyHint: '••••1234',
      textModel: 'gemini-3.8-flash',
      imageModel: null,
      isEnabled: true,
      workspaceCount: 0,
      createdAt: '2026-11-25T00:00:00Z',
    });
    vi.mocked(adminService.setWorkspaceAiProvider)
      .mockResolvedValueOnce({} as any)
      .mockRejectedValueOnce(new Error('Workspace không tồn tại'));

    render(<AIConfigurationView />);

    await screen.findByText('Gemini Chính');
    fireEvent.click(screen.getByRole('button', { name: /Thêm API|Add API/i }));

    fireEvent.change(screen.getByLabelText(/Tên hiển thị|Display name/i), {
      target: { value: 'Gemini Mới' },
    });
    fireEvent.change(screen.getByLabelText(/API Key \/ Token/i), {
      target: { value: 'valid-gemini-key-1234' },
    });

    // Chọn cả 2 Studio trong mục Gán cho Studio
    fireEvent.click(screen.getByRole('checkbox', { name: 'Studio Moonlight' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Studio Sunrise' }));

    fireEvent.click(screen.getByRole('button', { name: /Lưu API|Save API/i }));

    await waitFor(() => {
      expect(adminService.createAiProvider).toHaveBeenCalledTimes(1);
      expect(adminService.setWorkspaceAiProvider).toHaveBeenCalledWith('ws-1', 'cred-new');
      expect(adminService.setWorkspaceAiProvider).toHaveBeenCalledWith('ws-2', 'cred-new');
    });

    // Báo lỗi riêng cho Studio Sunrise trong khi API Gemini Mới vẫn đã được tạo
    expect(
      await screen.findByText(/Đã tạo API “Gemini Mới”.*Studio Sunrise.*Workspace không tồn tại/i),
    ).toBeInTheDocument();
  });

  it('chỉ liệt kê API đang bật có imageModel trong ô API sinh ảnh và gọi PUT /ai-image-provider khi lưu', async () => {
    vi.mocked(adminService.getAiProviders).mockResolvedValue([
      ...MOCK_PROVIDERS,
      {
        id: 'cred-cf-flux',
        name: 'Cloudflare FLUX',
        providerType: 'Cloudflare',
        accountId: 'cf-acc-flux',
        keyHint: '••••f10x',
        textModel: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        imageModel: '@cf/black-forest-labs/flux-1-schnell',
        isEnabled: true,
        workspaceCount: 0,
        createdAt: '2026-11-25T00:00:00Z',
      },
      {
        id: 'cred-disabled-img',
        name: 'Ảnh Đang Tắt',
        providerType: 'Gemini',
        accountId: null,
        keyHint: '••••0000',
        textModel: 'gemini-3.8-flash',
        imageModel: 'gemini-2.5-flash-image',
        isEnabled: false,
        workspaceCount: 0,
        createdAt: '2026-11-25T00:00:00Z',
      },
    ]);
    vi.mocked(adminService.setWorkspaceAiImageProvider).mockResolvedValue({
      id: 'cfg-1',
      workspaceId: 'ws-1',
      provider: 'Google Gemini',
      hasApiKey: true,
      providerCredentialId: null,
      imageProviderCredentialId: 'cred-cf-flux',
      isEnabled: true,
      monthlyTokenQuota: 1000000,
      usedTokensCurrentMonth: 0,
      monthlyImageQuota: 100,
      usedImagesCurrentMonth: 0,
      allowedModels: ['gemini-3.8-flash'],
      createdAt: '2026-11-01T00:00:00Z',
    });
    vi.mocked(adminService.updateWorkspaceAiConfig).mockResolvedValue({
      id: 'cfg-1',
      workspaceId: 'ws-1',
      provider: 'Google Gemini',
      hasApiKey: true,
      providerCredentialId: null,
      imageProviderCredentialId: 'cred-cf-flux',
      isEnabled: true,
      monthlyTokenQuota: 1000000,
      usedTokensCurrentMonth: 0,
      monthlyImageQuota: 100,
      usedImagesCurrentMonth: 0,
      allowedModels: ['gemini-3.8-flash'],
      createdAt: '2026-11-01T00:00:00Z',
    });

    render(<AIConfigurationView />);

    const imageSelect = (await screen.findByLabelText(
      /API sinh ảnh|Image generation API/i,
    )) as HTMLSelectElement;
    const optionTexts = Array.from(imageSelect.options).map((o) => o.textContent || '');

    // Có lựa chọn Giống API chữ + các API đang bật có imageModel
    expect(optionTexts.some((t) => /Giống API chữ|Same as text API/i.test(t))).toBe(true);
    expect(optionTexts.some((t) => t.includes('Gemini Chính'))).toBe(true);
    expect(optionTexts.some((t) => t.includes('Cloudflare FLUX'))).toBe(true);
    // Không liệt kê Cloudflare Dự phòng (imageModel: null) và Ảnh Đang Tắt (isEnabled: false)
    expect(optionTexts.some((t) => t.includes('Cloudflare Dự phòng'))).toBe(false);
    expect(optionTexts.some((t) => t.includes('Ảnh Đang Tắt'))).toBe(false);

    // Chữ giữ nguyên key Gemini riêng, ảnh chọn Cloudflare FLUX -> 1 khung gộp duy nhất
    fireEvent.change(imageSelect, { target: { value: 'cred-cf-flux' } });
    const unifiedBanner = await screen.findByTestId('studio-shared-api-banner');
    expect(unifiedBanner).toHaveTextContent('Chữ:');
    expect(unifiedBanner).toHaveTextContent('Key Gemini riêng của Studio');
    expect(unifiedBanner).toHaveTextContent('Ảnh:');
    expect(unifiedBanner).toHaveTextContent('Cloudflare FLUX (Cloudflare · ••••f10x)');
    expect(unifiedBanner).toHaveTextContent('@cf/black-forest-labs/flux-1-schnell');
    expect(unifiedBanner).toHaveTextContent('[Miễn phí]');
    expect(screen.getByLabelText(/^API key$/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Lưu cấu hình|Save configuration/i }));

    await waitFor(() => {
      expect(adminService.setWorkspaceAiImageProvider).toHaveBeenCalledWith('ws-1', 'cred-cf-flux');
      expect(adminService.setWorkspaceAiProvider).not.toHaveBeenCalled();
      expect(adminService.updateWorkspaceAiConfig).toHaveBeenCalled();
    });
  });

  it('Modal Sửa API Cloudflare tải model từ GET /models, nhóm Miễn phí (@cf) trước Cần credit, tìm kiếm được và tự rơi về gõ tay khi lỗi', async () => {
    vi.mocked(adminService.getAiProviderModels).mockResolvedValueOnce([
      {
        id: '@hf/nousresearch/hermes-2-pro-mistral-7b',
        kind: 'text',
        free: false,
        description: 'Partner model needing credit',
      },
      {
        id: '@cf/qwen/qwen2.5-coder-32b-instruct',
        kind: 'text',
        free: true,
        description: 'Qwen free coder',
      },
      {
        id: '@cf/black-forest-labs/flux-1-schnell',
        kind: 'image',
        free: true,
        description: 'Fast FLUX image model',
      },
    ]);
    vi.mocked(adminService.updateAiProvider).mockResolvedValue({
      ...MOCK_PROVIDERS[1],
      textModel: '@cf/qwen/qwen2.5-coder-32b-instruct',
      imageModel: '@cf/black-forest-labs/flux-1-schnell',
    });

    render(<AIConfigurationView />);

    await screen.findByText('Cloudflare Dự phòng');
    const editButtons = screen.getAllByRole('button', { name: /^Sửa$|^Edit$/i });
    fireEvent.click(editButtons[1]); // Sửa Cloudflare Dự phòng

    await waitFor(() => {
      expect(adminService.getAiProviderModels).toHaveBeenCalledWith('cred-cf-1');
    });

    // Mở ô chọn Model văn bản (role=combobox)
    const textCombo = await screen.findByRole('combobox', { name: /Model văn bản|Text model/i });
    fireEvent.click(textCombo);

    // Nhóm Miễn phí (@cf) đứng trước nhóm Cần credit trong DOM
    const listbox = screen.getByRole('listbox');
    const html = listbox.innerHTML;
    expect(html.indexOf('Miễn phí (@cf)')).toBeGreaterThan(-1);
    expect(html.indexOf('Cần credit')).toBeGreaterThan(html.indexOf('Miễn phí (@cf)'));

    // Tìm kiếm theo từ khoá "qwen" và chọn model
    fireEvent.change(screen.getByPlaceholderText(/Tìm theo mã|Search by model/i), {
      target: { value: 'qwen' },
    });
    expect(screen.queryByText('@hf/nousresearch/hermes-2-pro-mistral-7b')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: /qwen2\.5-coder-32b-instruct/i }));

    fireEvent.click(screen.getByRole('button', { name: /Lưu API|Save API/i }));
    await waitFor(() => {
      expect(adminService.updateAiProvider).toHaveBeenCalledWith(
        'cred-cf-1',
        expect.objectContaining({ textModel: '@cf/qwen/qwen2.5-coder-32b-instruct' }),
      );
    });

    // Mở lại khi GET /models lỗi -> vẫn cho gõ tay qua input text
    vi.mocked(adminService.getAiProviderModels).mockRejectedValueOnce(new Error('Network error'));
    fireEvent.click(screen.getAllByRole('button', { name: /^Sửa$|^Edit$/i })[1]);
    expect(
      await screen.findByText(/Không tải được danh sách model|Could not load model list/i),
    ).toBeInTheDocument();
    const fallbackInput = screen.getByLabelText(/Model văn bản|Text model/i);
    expect(fallbackInput.tagName).toBe('INPUT');
  });
});
