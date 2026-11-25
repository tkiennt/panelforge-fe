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
    setDefaultAiProvider: vi.fn(),
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
      provider: '',
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

  it('gọn màn Studio khi chưa gán API: bỏ key Gemini riêng, mô tả checkbox theo trạng thái hiện tại và cảnh báo Chưa chọn API', async () => {
    render(<AIConfigurationView />);

    // Không còn ô Nhà cung cấp, API key riêng hay option Key Gemini riêng; mặc định đầu tiên là Theo mặc định
    const textSelect = (await screen.findByLabelText(/API cho chữ|Text API/i)) as HTMLSelectElement;
    const optionTexts = Array.from(textSelect.options).map((o) => o.textContent || '');
    expect(optionTexts.some((t) => /Key Gemini riêng|dedicated Gemini key/i.test(t))).toBe(false);
    expect(optionTexts[0]).toMatch(/Theo mặc định|Use default/i);
    expect(screen.queryByLabelText(/^Nhà cung cấp$|^Provider$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^API key$/i)).not.toBeInTheDocument();

    // Trạng thái key: hiện 'Chưa chọn API' (cảnh báo) khi Studio bật AI nhưng chưa gán API
    const keyStatus = screen.getByTestId('ai-key-status');
    expect(keyStatus).toHaveTextContent(/Chưa chọn API|No API selected/i);
    expect(keyStatus.querySelector('span')?.className).toMatch(/amber/);

    // Mô tả checkbox phản ánh trạng thái hiện tại thay vì 'Khi tắt...'
    expect(
      screen.getByText(
        /Đang bật: thành viên Studio dùng được AI|Enabled: Studio members can use AI/i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Khi tắt, mọi yêu cầu AI/i)).not.toBeInTheDocument();

    // Tắt checkbox -> mô tả đổi sang Đang tắt và badge không còn cảnh báo amber
    const enableCheckbox = screen.getByRole('checkbox', {
      name: /Bật AI cho Studio|Enable AI for Studio/i,
    });
    fireEvent.click(enableCheckbox);
    expect(
      screen.getByText(
        /Đang tắt: thành viên Studio không dùng được AI|Disabled: Studio members cannot use AI/i,
      ),
    ).toBeInTheDocument();
    expect(keyStatus.querySelector('span')?.className).not.toMatch(/amber/);
  });

  it('lấy danh sách Model được phép theo API Gemini đã chọn (dòng 3.x trước, giữ dòng 2.5)', async () => {
    vi.mocked(adminService.getWorkspaceAiConfig).mockResolvedValue({
      id: 'cfg-1',
      workspaceId: 'ws-1',
      provider: 'Gemini',
      hasApiKey: true,
      apiKeyUsable: true,
      providerCredentialId: 'cred-gemini-1',
      isEnabled: true,
      monthlyTokenQuota: 1000000,
      usedTokensCurrentMonth: 0,
      monthlyImageQuota: 0,
      usedImagesCurrentMonth: 0,
      allowedModels: ['gemini-3.8-flash', 'gemini-2.5-flash-image'],
      createdAt: '2026-11-01T00:00:00Z',
    });

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

    const keyStatus = screen.getByTestId('ai-key-status');
    expect(keyStatus).toHaveTextContent('Gemini Chính · ••••9a1f · Đang bật');
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

  it('gán API cho chữ qua PUT /workspaces/{id}/ai-provider và PUT /ai-config không gửi provider/apiKey', async () => {
    vi.mocked(adminService.setWorkspaceAiProvider).mockResolvedValue({
      id: 'cfg-1',
      workspaceId: 'ws-1',
      provider: 'Cloudflare',
      hasApiKey: true,
      apiKeyUsable: true,
      providerCredentialId: 'cred-cf-1',
      isEnabled: true,
      monthlyTokenQuota: 1000000,
      usedTokensCurrentMonth: 0,
      monthlyImageQuota: 0,
      usedImagesCurrentMonth: 0,
      allowedModels: ['@cf/meta/llama-3.3-70b-instruct-fp8-fast'],
      createdAt: '2026-11-01T00:00:00Z',
    });
    vi.mocked(adminService.updateWorkspaceAiConfig).mockResolvedValue({
      id: 'cfg-1',
      workspaceId: 'ws-1',
      provider: 'Cloudflare',
      hasApiKey: true,
      apiKeyUsable: true,
      providerCredentialId: 'cred-cf-1',
      isEnabled: true,
      monthlyTokenQuota: 1000000,
      usedTokensCurrentMonth: 0,
      monthlyImageQuota: 0,
      usedImagesCurrentMonth: 0,
      allowedModels: ['@cf/meta/llama-3.3-70b-instruct-fp8-fast'],
      createdAt: '2026-11-01T00:00:00Z',
    });

    render(<AIConfigurationView />);

    const select = await screen.findByLabelText(/API cho chữ|Text API/i);
    fireEvent.change(select, { target: { value: 'cred-cf-1' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu cấu hình|Save configuration/i }));

    await waitFor(() => {
      expect(adminService.setWorkspaceAiProvider).toHaveBeenCalledWith('ws-1', 'cred-cf-1');
      expect(adminService.updateWorkspaceAiConfig).toHaveBeenCalledWith('ws-1', {
        isEnabled: true,
        monthlyTokenQuota: 1000000,
        monthlyImageQuota: 0,
        allowedModels: ['@cf/meta/llama-3.3-70b-instruct-fp8-fast'],
      });
    });
  });

  it('hiển thị Model được phép và Trạng thái key theo API Cloudflare đã chọn (không lẫn model Gemini)', async () => {
    vi.mocked(adminService.getWorkspaceAiConfig).mockResolvedValue({
      id: 'cfg-1',
      workspaceId: 'ws-1',
      provider: 'Cloudflare',
      hasApiKey: true,
      apiKeyUsable: true,
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

    expect(
      await screen.findByText('@cf/meta/llama-3.3-70b-instruct-fp8-fast', { selector: 'span' }),
    ).toBeInTheDocument();
    expect(screen.getByText('[Miễn phí]')).toBeInTheDocument();
    expect(screen.queryByText('gemini-3.1-pro-preview')).not.toBeInTheDocument();

    // Không có Nhà cung cấp hay API key riêng
    expect(screen.queryByLabelText(/^Nhà cung cấp$|^Provider$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^API key$/i)).not.toBeInTheDocument();

    // Giữ nguyên 2 ô quota
    expect(screen.getByLabelText(/Quota token mỗi tháng|Monthly token quota/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Quota sinh ảnh mỗi tháng|Monthly image quota/i),
    ).toBeInTheDocument();

    // Dòng Trạng thái key hiện theo API đã chọn
    const keyStatus = screen.getByTestId('ai-key-status');
    expect(keyStatus).toHaveTextContent('Cloudflare Dự phòng · ••••77bc · Đang bật');
    expect(keyStatus).not.toHaveTextContent(/Chưa chọn API|No API selected/i);
  });

  it('cho phép chọn nhiều Studio khi Thêm API và báo lỗi riêng nếu gán Studio thất bại sau khi đã tạo API', async () => {
    vi.mocked(adminService.getWorkspaces).mockResolvedValue([
      {
        id: 'ws-1',
        name: 'Studio Moonlight',
        ownerId: 'u-1',
        createdAt: '2026-11-01T00:00:00Z',
      } as any,
      {
        id: 'ws-2',
        name: 'Studio Sunrise',
        ownerId: 'u-2',
        createdAt: '2026-11-01T00:00:00Z',
      } as any,
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
      /API cho ảnh|Image API/i,
    )) as HTMLSelectElement;
    const optionTexts = Array.from(imageSelect.options).map((o) => o.textContent || '');

    // Có lựa chọn Theo mặc định (giống API chữ) + các API đang bật có imageModel
    expect(
      optionTexts.some((t) =>
        /Theo mặc định.*giống API chữ|Use default.*same as text API/i.test(t),
      ),
    ).toBe(true);
    expect(optionTexts.some((t) => t.includes('Gemini Chính'))).toBe(true);
    expect(optionTexts.some((t) => t.includes('Cloudflare FLUX'))).toBe(true);
    // Không liệt kê Cloudflare Dự phòng (imageModel: null) và Ảnh Đang Tắt (isEnabled: false)
    expect(optionTexts.some((t) => t.includes('Cloudflare Dự phòng'))).toBe(false);
    expect(optionTexts.some((t) => t.includes('Ảnh Đang Tắt'))).toBe(false);

    // Chọn Cloudflare FLUX cho ảnh -> Model được phép hiện model ảnh Cloudflare kèm [Miễn phí]
    fireEvent.change(imageSelect, { target: { value: 'cred-cf-flux' } });
    expect(
      await screen.findByText('@cf/black-forest-labs/flux-1-schnell', { selector: 'span' }),
    ).toBeInTheDocument();
    expect(screen.getByText('[Miễn phí]')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^API key$/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Lưu cấu hình|Save configuration/i }));

    await waitFor(() => {
      expect(adminService.setWorkspaceAiImageProvider).toHaveBeenCalledWith('ws-1', 'cred-cf-flux');
      expect(adminService.setWorkspaceAiProvider).not.toHaveBeenCalled();
      expect(adminService.updateWorkspaceAiConfig).toHaveBeenCalledWith('ws-1', {
        isEnabled: true,
        monthlyTokenQuota: 1000000,
        monthlyImageQuota: 0,
        allowedModels: ['@cf/black-forest-labs/flux-1-schnell'],
      });
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

  it('đặt API AI mặc định cho chữ và ảnh qua PUT /ai-providers/default và hiển thị Theo mặc định cho Studio chưa chọn API', async () => {
    const updatedWithDefaults = [
      { ...MOCK_PROVIDERS[0], isDefaultText: true, isDefaultImage: true },
      { ...MOCK_PROVIDERS[1], isDefaultText: false, isDefaultImage: false },
    ];
    vi.mocked(adminService.setDefaultAiProvider).mockResolvedValueOnce(updatedWithDefaults);
    vi.mocked(adminService.getWorkspaceAiConfig)
      .mockResolvedValueOnce({
        id: 'cfg-1',
        workspaceId: 'ws-1',
        provider: '',
        hasApiKey: false,
        providerCredentialId: null,
        imageProviderCredentialId: null,
        isEnabled: true,
        monthlyTokenQuota: 1000000,
        usedTokensCurrentMonth: 0,
        monthlyImageQuota: 0,
        usedImagesCurrentMonth: 0,
        allowedModels: [],
        createdAt: '2026-11-01T00:00:00Z',
      })
      .mockResolvedValueOnce({
        id: 'cfg-1',
        workspaceId: 'ws-1',
        provider: 'Gemini',
        hasApiKey: true,
        apiKeyUsable: true,
        providerCredentialId: null,
        imageProviderCredentialId: null,
        isEnabled: true,
        monthlyTokenQuota: 1000000,
        usedTokensCurrentMonth: 0,
        monthlyImageQuota: 0,
        usedImagesCurrentMonth: 0,
        allowedModels: ['gemini-3.8-flash'],
        createdAt: '2026-11-01T00:00:00Z',
      });

    render(<AIConfigurationView />);

    const defaultTextSelect = await screen.findByLabelText(
      /API mặc định cho chữ|Default text API/i,
    );
    fireEvent.change(defaultTextSelect, { target: { value: 'cred-gemini-1' } });

    await waitFor(() => {
      expect(adminService.setDefaultAiProvider).toHaveBeenCalledWith('text', 'cred-gemini-1');
    });

    // Hiển thị badge trên bảng Danh sách API AI
    expect(await screen.findByText(/Mặc định chữ|Default text/i)).toBeInTheDocument();
    expect(screen.getByText(/Mặc định ảnh|Default image/i)).toBeInTheDocument();

    // Studio có providerCredentialId = null -> dropdown hiện Theo mặc định kèm tên API, Trạng thái key xanh (không còn Chưa chọn API)
    const studioTextSelect = (await screen.findByLabelText(
      /API cho chữ|Text API/i,
    )) as HTMLSelectElement;
    expect(studioTextSelect.value).toBe('');
    expect(studioTextSelect.options[0].textContent).toMatch(/Theo mặc định.*Gemini Chính/i);

    const studioImageSelect = screen.getByLabelText(/API cho ảnh|Image API/i) as HTMLSelectElement;
    expect(studioImageSelect.value).toBe('');
    expect(studioImageSelect.options[0].textContent).toMatch(
      /Theo mặc định.*Gemini Chính.*gemini-2\.5-flash-image/i,
    );

    const keyStatus = screen.getByTestId('ai-key-status');
    expect(keyStatus).toHaveTextContent(/Theo mặc định: Gemini Chính · ••••9a1f/i);
    expect(keyStatus).not.toHaveTextContent(/Chưa chọn API/i);

    // Model được phép của Studio tự lấy theo API mặc định
    expect(screen.getByText('gemini-3.8-flash', { selector: 'span' })).toBeInTheDocument();
  });

  it('không làm tràn ngang thẻ Tháng này khi tên API AI dài (vd Gemini – PanelForge_FA26SE251)', async () => {
    vi.mocked(adminService.getAiProviders).mockResolvedValue([
      {
        id: 'cred-long',
        name: 'Gemini – PanelForge_FA26SE251',
        providerType: 'Gemini',
        accountId: null,
        keyHint: '••••q7CA',
        textModel: 'gemini-3.8-flash',
        imageModel: 'gemini-2.5-flash-image',
        isEnabled: true,
        workspaceCount: 1,
        createdAt: '2026-11-25T00:00:00Z',
      },
    ]);
    vi.mocked(adminService.getWorkspaceAiConfig).mockResolvedValue({
      id: 'cfg-1',
      workspaceId: 'ws-1',
      provider: 'Gemini',
      hasApiKey: true,
      apiKeyUsable: true,
      providerCredentialId: 'cred-long',
      isEnabled: true,
      monthlyTokenQuota: 1000000,
      usedTokensCurrentMonth: 62813,
      monthlyImageQuota: 0,
      usedImagesCurrentMonth: 3,
      allowedModels: ['gemini-3.8-flash'],
      createdAt: '2026-11-01T00:00:00Z',
    });

    render(<AIConfigurationView />);

    const badges = await screen.findAllByText(
      /Gemini – PanelForge_FA26SE251 · ••••q7CA · Đang bật/i,
    );
    expect(badges.length).toBeGreaterThanOrEqual(2);
    // Badge trong thẻ Tháng này cho phép xuống dòng trong khung 320px thay vì whitespace-nowrap gây tràn
    const summaryBadge = badges[badges.length - 1].closest('span.inline-flex')!;
    expect(summaryBadge.className).toContain('max-w-full');
    expect(summaryBadge.className).toContain('whitespace-normal');
    expect(summaryBadge.className).not.toContain('whitespace-nowrap');
  });

  it('hiển thị cảnh báo đỏ "Lỗi giải mã khóa" khi API mất key ring Data Protection (keyDecryptable = false)', async () => {
    vi.mocked(adminService.getAiProviders).mockResolvedValue([
      {
        id: 'cred-broken',
        name: 'Gemini Mất Khóa',
        providerType: 'Gemini',
        keyHint: '',
        keyDecryptable: false,
        textModel: 'gemini-3.8-flash',
        imageModel: null,
        isEnabled: true,
        isDefaultText: true,
        isDefaultImage: false,
        workspaceCount: 1,
        createdAt: '2026-11-25T00:00:00Z',
      },
    ]);
    vi.mocked(adminService.getWorkspaceAiConfig).mockResolvedValue({
      id: 'cfg-1',
      workspaceId: 'ws-1',
      provider: 'Gemini',
      hasApiKey: true,
      apiKeyUsable: false,
      providerCredentialId: 'cred-broken',
      isEnabled: true,
      monthlyTokenQuota: 1000000,
      usedTokensCurrentMonth: 0,
      monthlyImageQuota: 0,
      usedImagesCurrentMonth: 0,
      allowedModels: ['gemini-3.8-flash'],
      createdAt: '2026-11-25T00:00:00Z',
    });

    render(<AIConfigurationView />);

    await waitFor(() => {
      expect(screen.getAllByText(/Lỗi giải mã khóa/i).length).toBeGreaterThanOrEqual(2);
    });
  });

  it('chặn lưu API key chứa chuỗi gợi ý ••••, khoảng trắng hoặc ký tự ngoài ASCII ngay trên form', async () => {
    render(<AIConfigurationView />);
    await screen.findByText('Gemini Chính');

    fireEvent.click(screen.getByRole('button', { name: /Thêm API|Add API/i }));
    fireEvent.change(screen.getByLabelText(/Tên hiển thị|Display name/i), {
      target: { value: 'Gemini Kiểm Tra Key' },
    });

    const keyInput = screen.getByLabelText(/API Key \/ Token/i);

    // 1. Dán nhầm chuỗi mask ••••
    fireEvent.change(keyInput, { target: { value: '••••9a1f' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu API|Save API/i }));
    expect(await screen.findByText(/Không thể lưu chuỗi gợi ý ••••/i)).toBeInTheDocument();
    expect(adminService.createAiProvider).not.toHaveBeenCalled();

    // 2. Dán key có khoảng trắng / ký tự ngoài ASCII
    fireEvent.change(keyInput, { target: { value: 'AIzaSy co khoang trang' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu API|Save API/i }));
    expect(
      await screen.findByText(/không được chứa khoảng trắng hoặc ký tự ngoài ASCII/i),
    ).toBeInTheDocument();
    expect(adminService.createAiProvider).not.toHaveBeenCalled();
  });

  it('khoá nút Xoá, không cho tắt trạng thái bật và không cho xoá model ảnh đối với API đang làm mặc định', async () => {
    vi.mocked(adminService.getAiProviders).mockResolvedValue([
      {
        ...MOCK_PROVIDERS[0],
        isDefaultText: true,
        isDefaultImage: true,
      },
      MOCK_PROVIDERS[1],
    ]);

    render(<AIConfigurationView />);
    await screen.findByText('Gemini Chính');

    const deleteButtons = screen.getAllByRole('button', { name: /^Xoá$|^Delete$/i });
    expect(deleteButtons[0]).toBeDisabled();
    expect(deleteButtons[1]).not.toBeDisabled();

    // Mở Sửa trên API đang làm mặc định cả chữ lẫn ảnh
    const editButtons = screen.getAllByRole('button', { name: /^Sửa$|^Edit$/i });
    fireEvent.click(editButtons[0]);

    const enabledCheckbox = screen.getByRole('checkbox', {
      name: /Cho phép sử dụng API này|Enable this API/i,
    });
    expect(enabledCheckbox).toBeDisabled();
    expect(
      screen.getByText(/Đang là API mặc định — hãy đổi mặc định ở trên trước khi tắt/i),
    ).toBeInTheDocument();

    // Xoá trống model sinh ảnh khi đang là Mặc định ảnh -> báo lỗi tại chỗ, không gọi PUT
    const imageModelInput = screen.getByLabelText(/Model sinh ảnh|Image model/i);
    fireEvent.change(imageModelInput, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu API|Save API/i }));

    expect(await screen.findByText(/không thể để trống model sinh ảnh/i)).toBeInTheDocument();
    expect(adminService.updateAiProvider).not.toHaveBeenCalled();
  });

  it('vô hiệu hoá chọn mới API bị lỗi giải mã khóa ở các ô chọn và nhắc nhập lại key khi Sửa', async () => {
    vi.mocked(adminService.getAiProviders).mockResolvedValue([
      MOCK_PROVIDERS[0],
      {
        id: 'cred-cf-broken',
        name: 'Cloudflare Mất Khóa',
        providerType: 'Cloudflare',
        accountId: 'cf-acc-broken',
        keyHint: '',
        keyDecryptable: false,
        textModel: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        imageModel: '@cf/black-forest-labs/flux-1-schnell',
        isEnabled: true,
        isDefaultText: false,
        isDefaultImage: false,
        workspaceCount: 0,
        createdAt: '2026-11-25T00:00:00Z',
      },
    ]);

    render(<AIConfigurationView />);
    await screen.findByText('Cloudflare Mất Khóa');

    // Ô chọn Mặc định chữ & API chữ của Studio: option bị khoá kèm hậu tố (lỗi giải mã khóa)
    const defaultTextSelect = screen.getByLabelText(
      /API mặc định cho chữ|Default text API/i,
    ) as HTMLSelectElement;
    const brokenDefaultOpt = Array.from(defaultTextSelect.options).find(
      (o) => o.value === 'cred-cf-broken',
    );
    expect(brokenDefaultOpt?.disabled).toBe(true);
    expect(brokenDefaultOpt?.textContent).toMatch(/lỗi giải mã khóa/i);

    const studioTextSelect = (await screen.findByLabelText(
      /API cho chữ|Text API/i,
    )) as HTMLSelectElement;
    const brokenStudioOpt = Array.from(studioTextSelect.options).find(
      (o) => o.value === 'cred-cf-broken',
    );
    expect(brokenStudioOpt?.disabled).toBe(true);

    // Ô chọn Mặc định ảnh & API ảnh của Studio: không liệt kê API lỗi giải mã khóa
    const defaultImageSelect = screen.getByLabelText(
      /API mặc định cho ảnh|Default image API/i,
    ) as HTMLSelectElement;
    expect(Array.from(defaultImageSelect.options).some((o) => o.value === 'cred-cf-broken')).toBe(
      false,
    );

    const studioImageSelect = screen.getByLabelText(/API cho ảnh|Image API/i) as HTMLSelectElement;
    expect(Array.from(studioImageSelect.options).some((o) => o.value === 'cred-cf-broken')).toBe(
      false,
    );

    // Mở Sửa trên Cloudflare Mất Khóa -> hiện nhắc nhập lại key mới và không gọi GET /models vô ích
    const editButtons = screen.getAllByRole('button', { name: /^Sửa$|^Edit$/i });
    fireEvent.click(editButtons[1]);
    expect(
      screen.getByText(/Khóa hiện tại không giải mã được — hãy nhập lại API key mới để khôi phục/i),
    ).toBeInTheDocument();
    expect(adminService.getAiProviderModels).not.toHaveBeenCalled();
  });
});
