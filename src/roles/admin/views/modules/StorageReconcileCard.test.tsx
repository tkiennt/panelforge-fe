import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StorageReconcileCard } from './StorageReconcileCard';
import { quotaService, type StorageReconcileReportDto } from '@/services/quota.service';

vi.mock('@/services/quota.service', () => ({
  quotaService: { reconcileStorage: vi.fn() },
}));

const report = (applied: boolean): StorageReconcileReportDto => ({
  scannedAt: '2026-11-28T04:00:00Z',
  applied,
  scannedFiles: 4,
  scannedBytes: 4096,
  workspaces: [
    {
      workspaceId: 'ws-1',
      name: 'Studio Sakura',
      recordedBytes: 9999,
      computedBytes: applied ? 9999 : 2048,
      orphanFiles: 2,
      orphanBytes: 1024,
      derivedBytes: 0,
      missingFiles: 0,
    },
    {
      workspaceId: 'ws-2',
      name: 'Studio Khớp',
      recordedBytes: 100,
      computedBytes: 100,
      orphanFiles: 0,
      orphanBytes: 0,
      derivedBytes: 0,
      missingFiles: 0,
    },
  ],
  unattributedFiles: 0,
  unattributedBytes: 0,
  orphanSamples: [{ key: 'covers/abc/old', sizeBytes: 512, workspaceId: 'ws-1' }],
  orphanSamplesTruncated: false,
});

describe('StorageReconcileCard (OPS-22)', () => {
  beforeEach(() => vi.mocked(quotaService.reconcileStorage).mockReset());

  it('scans read-only first and lists only studios that need attention', async () => {
    vi.mocked(quotaService.reconcileStorage).mockResolvedValueOnce(report(false));
    render(<StorageReconcileCard onApplied={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Quét kho' }));

    expect(await screen.findByText('Studio Sakura')).toBeInTheDocument();
    expect(quotaService.reconcileStorage).toHaveBeenCalledWith(false);
    expect(screen.queryByText('Studio Khớp')).not.toBeInTheDocument();
    expect(screen.getByText('covers/abc/old')).toBeInTheDocument();
  });

  it('writes the recalculated usage only after the admin confirms', async () => {
    const onApplied = vi.fn();
    vi.mocked(quotaService.reconcileStorage)
      .mockResolvedValueOnce(report(false))
      .mockResolvedValueOnce(report(true));
    render(<StorageReconcileCard onApplied={onApplied} />);

    fireEvent.click(screen.getByRole('button', { name: 'Quét kho' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cập nhật dung lượng' }));
    expect(quotaService.reconcileStorage).toHaveBeenCalledTimes(1);

    const confirmButtons = await screen.findAllByRole('button', { name: 'Cập nhật dung lượng' });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(onApplied).toHaveBeenCalled());
    expect(quotaService.reconcileStorage).toHaveBeenLastCalledWith(true);
    expect(screen.getByText('Đã cập nhật dung lượng')).toBeInTheDocument();
  });
});
