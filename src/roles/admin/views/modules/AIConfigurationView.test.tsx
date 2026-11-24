import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AIConfigurationView } from './AIConfigurationView';
import { adminService } from '@/services/admin.service';

vi.mock('@/services/admin.service', () => ({
  adminService: {
    getWorkspaces: vi.fn(),
    getWorkspaceAiConfig: vi.fn(),
    updateWorkspaceAiConfig: vi.fn(),
    getAiUsageReport: vi.fn(),
    getAiUsageRecords: vi.fn(),
    exportAiUsageRecordsCsv: vi.fn(),
  },
  downloadBlob: vi.fn(),
}));

describe('AIConfigurationView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    expect(await screen.findByText('gemini-3.8-flash')).toBeInTheDocument();
    expect(screen.getByText('gemini-3.1-pro-preview')).toBeInTheDocument();
    expect(screen.getByText('gemini-2.5-flash')).toBeInTheDocument();
    expect(screen.getByText('gemini-2.5-pro')).toBeInTheDocument();
    expect(screen.getByText('gemini-2.5-flash-image')).toBeInTheDocument();

    expect(screen.queryByText('gemini-1.5-pro')).not.toBeInTheDocument();
    expect(screen.queryByText('gemini-1.5-flash')).not.toBeInTheDocument();
    expect(screen.queryByText('claude-3-5-sonnet')).not.toBeInTheDocument();
    expect(screen.queryByText('gpt-4o')).not.toBeInTheDocument();
  });
});
