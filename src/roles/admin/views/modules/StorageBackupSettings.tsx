import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Clock,
  Save,
  CheckCircle2,
  RefreshCw,
  Building2,
  Users,
  BookOpen,
  Edit2,
  X,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { adminService, AdminWorkspaceDto } from '@/services/admin.service';

function formatStorage(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function bytesToGb(bytes: number): number {
  if (!bytes || bytes <= 0) return 0;
  return Number((bytes / (1024 * 1024 * 1024)).toFixed(1));
}

export const StorageBackupSettings: React.FC = () => {
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [storageQuotaGb, setStorageQuotaGb] = useState('250');
  const [retentionDays, setRetentionDays] = useState('90');
  const [backupSchedule, setBackupSchedule] = useState('daily');
  const [autoCleanTemp, setAutoCleanTemp] = useState(true);

  // BR-16: Admin Studio Workspaces & Quota State
  const [workspaces, setWorkspaces] = useState<AdminWorkspaceDto[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [editingWorkspace, setEditingWorkspace] = useState<AdminWorkspaceDto | null>(null);
  const [newQuotaGb, setNewQuotaGb] = useState<string>('10');
  const [updatingQuota, setUpdatingQuota] = useState(false);
  const [quotaToast, setQuotaToast] = useState<{ title: string; desc: string } | null>(null);

  const showToast = (title: string, desc: string) => {
    setQuotaToast({ title, desc });
    setTimeout(() => setQuotaToast(null), 3500);
  };

  const loadWorkspaces = React.useCallback(async () => {
    setLoadingWorkspaces(true);
    try {
      const data = await adminService.getWorkspaces();
      setWorkspaces(data);
    } catch (err: any) {
      console.error('Lỗi tải danh sách Workspace:', err);
      showToast('Lỗi tải Studios', err.message || 'Không thể tải danh sách Studio Workspace.');
    } finally {
      setLoadingWorkspaces(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const handleOpenEditQuota = (ws: AdminWorkspaceDto) => {
    setEditingWorkspace(ws);
    setNewQuotaGb(ws.storageQuotaBytes > 0 ? bytesToGb(ws.storageQuotaBytes).toString() : '10');
  };

  const handleUpdateQuota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkspace) return;

    const gbVal = parseFloat(newQuotaGb);
    if (isNaN(gbVal) || gbVal < 0) {
      showToast('Lỗi nhập liệu', 'Vui lòng nhập dung lượng Quota hợp lệ (>= 0 GB).');
      return;
    }

    const quotaBytes = Math.round(gbVal * 1024 * 1024 * 1024);
    setUpdatingQuota(true);

    try {
      const updated = await adminService.updateWorkspaceQuota(editingWorkspace.id, quotaBytes);
      setWorkspaces((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      setEditingWorkspace(null);
      showToast(
        'Cập nhật Quota thành công (BR-16)',
        `Studio "${updated.name}" đã được cập nhật hạn mức lưu trữ thành ${gbVal === 0 ? 'Không giới hạn' : `${gbVal} GB`}.`,
      );
    } catch (err: any) {
      showToast('Lỗi cập nhật Quota', err.message);
    } finally {
      setUpdatingQuota(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const totalUsedBytes = workspaces.reduce((acc, w) => acc + (w.usedStorageBytes || 0), 0);
  const totalQuotaBytes = workspaces.reduce((acc, w) => acc + (w.storageQuotaBytes || 0), 0);

  return (
    <div className='space-y-6 w-full'>
      {/* Toast Notification */}
      {quotaToast && (
        <div className='fixed bottom-6 right-6 z-50 bg-[#171717] text-white px-4 py-3 rounded-xl shadow-2xl border border-[#333333] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2'>
          <CheckCircle2 className='w-4 h-4 text-emerald-400 shrink-0' />
          <div>
            <div className='text-xs font-bold'>{quotaToast.title}</div>
            <div className='text-[11px] text-[#A3A3A3]'>{quotaToast.desc}</div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className='flex items-center justify-between bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs'>
        <div>
          <div className='flex items-center gap-2 mb-1'>
            <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-[10px] font-bold'>
              STORAGE // WORKSPACES // BR-16
            </span>
          </div>
          <h1 className='text-2xl font-serif font-bold text-[#171717] tracking-tight'>
            Quản Lý Studio Workspaces & Hạn Ngạch Lưu Trữ (BR-16)
          </h1>
          <p className='text-xs text-[#737373]'>
            Giám sát dung lượng thực tế, quản lý hạn ngạch Storage Quota cho từng Studio và chính
            sách sao lưu hệ thống.
          </p>
        </div>

        <div className='flex items-center gap-2'>
          <button
            onClick={loadWorkspaces}
            disabled={loadingWorkspaces}
            className='inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#555555] bg-[#F8F6F0] hover:bg-[#EAE6DF] hover:text-[#171717] border border-[#E7E7E7] rounded-xl transition-all cursor-pointer'
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingWorkspaces ? 'animate-spin' : ''}`} />
            <span>Làm mới danh sách</span>
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <div className='bg-white p-5 rounded-xl border border-[#E7E7E7] shadow-xs'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-medium text-[#737373]'>Tổng Số Studio Workspace</span>
            <div className='w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center'>
              <Building2 className='w-4 h-4' />
            </div>
          </div>
          <div className='mt-2 text-2xl font-serif font-bold text-[#171717]'>
            {workspaces.length} Studios
          </div>
          <p className='text-[11px] text-[#888888] mt-1'>Đang hoạt động trong hệ thống</p>
        </div>

        <div className='bg-white p-5 rounded-xl border border-[#E7E7E7] shadow-xs'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-medium text-[#737373]'>Dung Lượng Đã Dùng Thực Tế</span>
            <div className='w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center'>
              <HardDrive className='w-4 h-4' />
            </div>
          </div>
          <div className='mt-2 text-2xl font-serif font-bold text-[#171717]'>
            {formatStorage(totalUsedBytes)}
          </div>
          <p className='text-[11px] text-[#888888] mt-1'>Gồm bản vẽ Genga, Layers & assets</p>
        </div>

        <div className='bg-white p-5 rounded-xl border border-[#E7E7E7] shadow-xs'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-medium text-[#737373]'>Tổng Quota Đã Cấp Phát</span>
            <div className='w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center'>
              <Sparkles className='w-4 h-4' />
            </div>
          </div>
          <div className='mt-2 text-2xl font-serif font-bold text-[#171717]'>
            {formatStorage(totalQuotaBytes)}
          </div>
          <p className='text-[11px] text-[#888888] mt-1'>Hạn mức lưu trữ gán cho các Studio</p>
        </div>
      </div>

      {/* BR-16: Studio Workspaces & Quota Management Table */}
      <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-xs overflow-hidden'>
        <div className='p-5 border-b border-[#E7E7E7] flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
          <div className='flex items-center gap-2'>
            <Building2 className='w-4 h-4 text-[#F97316]' />
            <h3 className='text-sm font-bold text-[#171717]'>
              Danh Sách Studio & Hạn Mức Lưu Trữ (BR-16)
            </h3>
            <span className='px-2 py-0.5 rounded-full bg-[#FAF8F5] text-[10px] font-mono font-bold text-[#737373] border border-[#E7E7E7]'>
              {workspaces.length} studios
            </span>
          </div>
          <span className='text-xs text-[#737373]'>
            Administrator có thể tùy chỉnh Storage Quota cho từng Studio Workspace.
          </span>
        </div>

        {loadingWorkspaces ? (
          <div className='p-12 text-center text-xs text-[#888888] flex flex-col items-center justify-center gap-2'>
            <RefreshCw className='w-5 h-5 animate-spin text-[#F97316]' />
            <span>Đang tải danh sách Studio Workspace...</span>
          </div>
        ) : workspaces.length === 0 ? (
          <div className='p-12 text-center text-xs text-[#888888]'>
            Chưa có Studio Workspace nào trong hệ thống.
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-xs'>
              <thead>
                <tr className='bg-[#FAF8F5] border-b border-[#E7E7E7] text-[#737373] uppercase font-semibold text-[10px] tracking-wider'>
                  <th className='py-3 px-4'>Tên Studio</th>
                  <th className='py-3 px-4'>Chủ Sở Hữu (Producer)</th>
                  <th className='py-3 px-4 text-center'>Thành Viên</th>
                  <th className='py-3 px-4 text-center'>Dự Án Series</th>
                  <th className='py-3 px-4'>Dung Lượng / Hạn Mức Quota</th>
                  <th className='py-3 px-4'>Ngày Tạo</th>
                  <th className='py-3 px-4 text-right'>Thao Tác</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-[#E7E7E7]'>
                {workspaces.map((ws) => {
                  const usedBytes = ws.usedStorageBytes || 0;
                  const quotaBytes = ws.storageQuotaBytes || 0;
                  const percentUsed =
                    quotaBytes > 0 ? Math.min(100, Math.round((usedBytes / quotaBytes) * 100)) : 0;

                  const isHighUsage = percentUsed >= 90;
                  const isWarningUsage = percentUsed >= 70 && percentUsed < 90;

                  return (
                    <tr key={ws.id} className='hover:bg-[#FAF8F5]/60 transition-colors'>
                      <td className='py-3.5 px-4 font-bold text-[#171717]'>
                        <div className='flex items-center gap-2'>
                          <div className='w-7 h-7 rounded-lg bg-[#FAF8F5] border border-[#E7E7E7] flex items-center justify-center text-xs font-bold text-[#171717]'>
                            {ws.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span>{ws.name}</span>
                        </div>
                      </td>
                      <td className='py-3.5 px-4'>
                        <div className='font-medium text-[#171717]'>
                          {ws.ownerName || 'Chưa cập nhật'}
                        </div>
                        <div className='text-[11px] text-[#737373] font-mono'>{ws.ownerEmail}</div>
                      </td>
                      <td className='py-3.5 px-4 text-center'>
                        <span className='inline-flex items-center gap-1 font-semibold text-[#171717]'>
                          <Users className='w-3 h-3 text-[#737373]' />
                          {ws.memberCount}
                        </span>
                      </td>
                      <td className='py-3.5 px-4 text-center'>
                        <span className='inline-flex items-center gap-1 font-semibold text-[#171717]'>
                          <BookOpen className='w-3 h-3 text-[#737373]' />
                          {ws.seriesCount}
                        </span>
                      </td>
                      <td className='py-3.5 px-4 min-w-[200px]'>
                        <div className='space-y-1'>
                          <div className='flex items-center justify-between text-[11px] font-mono'>
                            <span className='text-[#171717] font-semibold'>
                              {formatStorage(usedBytes)}
                            </span>
                            <span className='text-[#737373]'>
                              {quotaBytes > 0 ? formatStorage(quotaBytes) : 'Không giới hạn'}
                            </span>
                          </div>
                          <div className='w-full bg-[#EAE6DF] h-1.5 rounded-full overflow-hidden'>
                            <div
                              className={`h-full rounded-full transition-all ${
                                isHighUsage
                                  ? 'bg-rose-500'
                                  : isWarningUsage
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                              }`}
                              style={{ width: `${percentUsed}%` }}
                            />
                          </div>
                          <div className='text-[10px] text-[#737373] text-right font-mono'>
                            {quotaBytes > 0 ? `${percentUsed}% sử dụng` : 'Chưa đặt hạn ngạch'}
                          </div>
                        </div>
                      </td>
                      <td className='py-3.5 px-4 text-[#737373] text-[11px]'>
                        {new Date(ws.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className='py-3.5 px-4 text-right'>
                        <button
                          onClick={() => handleOpenEditQuota(ws)}
                          className='inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#171717] bg-white hover:bg-[#FAF8F5] border border-[#E7E7E7] hover:border-[#F97316] rounded-lg transition-colors cursor-pointer shadow-xs'
                        >
                          <Edit2 className='w-3 h-3 text-[#F97316]' />
                          <span>Sửa Quota</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Quota Modal */}
      {editingWorkspace && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4'>
          <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95'>
            <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
              <div className='flex items-center gap-2'>
                <HardDrive className='w-4 h-4 text-[#F97316]' />
                <h3 className='text-sm font-bold text-[#171717]'>
                  Điều Chỉnh Storage Quota (BR-16)
                </h3>
              </div>
              <button
                onClick={() => setEditingWorkspace(null)}
                className='text-[#888888] hover:text-[#171717]'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            <form onSubmit={handleUpdateQuota} className='space-y-4 text-xs'>
              <div className='p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7] space-y-1.5'>
                <div className='font-bold text-[#171717] flex items-center justify-between'>
                  <span>Studio: {editingWorkspace.name}</span>
                  <span className='font-mono text-[10px] text-[#737373]'>
                    ID: {editingWorkspace.id.substring(0, 8)}...
                  </span>
                </div>
                <div className='text-[#737373] text-[11px]'>
                  Chủ sở hữu: {editingWorkspace.ownerName} ({editingWorkspace.ownerEmail})
                </div>
                <div className='text-[#737373] text-[11px] flex justify-between pt-1 border-t border-[#E7E7E7] font-mono'>
                  <span>Dung lượng đã dùng:</span>
                  <span className='font-bold text-[#171717]'>
                    {formatStorage(editingWorkspace.usedStorageBytes)}
                  </span>
                </div>
              </div>

              <div>
                <label className='block font-semibold text-[#171717] mb-1.5'>
                  Hạn Mức Lưu Trữ Mới (GB):
                </label>
                <Input
                  type='number'
                  min='0'
                  step='0.5'
                  value={newQuotaGb}
                  onChange={(e) => setNewQuotaGb(e.target.value)}
                  placeholder='Ví dụ: 10 (nhập 0 để không giới hạn)'
                  className='h-9 font-mono text-xs w-full'
                  required
                />
                <div className='flex items-center gap-1.5 mt-2'>
                  <span className='text-[10px] text-[#737373]'>Gợi ý nhanh:</span>
                  {[5, 10, 20, 50, 100].map((gb) => (
                    <button
                      key={gb}
                      type='button'
                      onClick={() => setNewQuotaGb(gb.toString())}
                      className='px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FAF8F5] hover:bg-[#F3F1EB] border border-[#E7E7E7] text-[#171717]'
                    >
                      {gb} GB
                    </button>
                  ))}
                  <button
                    type='button'
                    onClick={() => setNewQuotaGb('0')}
                    className='px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800'
                  >
                    Vô hạn (0)
                  </button>
                </div>
              </div>

              <div className='p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 space-y-1'>
                <div className='font-bold flex items-center gap-1.5'>
                  <AlertTriangle className='w-3.5 h-3.5 text-amber-600' />
                  <span>Quy tắc nghiệp vụ BR-16:</span>
                </div>
                <div>
                  • Nếu dung lượng đã sử dụng vượt quá Quota mới, Studio sẽ không thể upload thêm
                  bản vẽ mới cho đến khi dọn dẹp bộ nhớ hoặc được cấp thêm Quota.
                </div>
              </div>

              <div className='flex justify-end gap-2 pt-2 border-t border-[#E7E7E7]'>
                <button
                  type='button'
                  onClick={() => setEditingWorkspace(null)}
                  className='px-3 py-1.5 rounded-lg text-[#555555] hover:bg-[#F3F1EB]'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  disabled={updatingQuota}
                  className='px-4 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold disabled:opacity-50'
                >
                  {updatingQuota ? 'Đang lưu...' : 'Lưu Thay Đổi Quota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Data Retention & Backup Policies */}
      <form onSubmit={handleSave} className='space-y-6'>
        <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-4'>
          <h3 className='text-sm font-bold text-[#171717] flex items-center gap-2'>
            <Clock className='w-4 h-4 text-[#F97316]' />
            <span>Chính Sách Lưu Trữ Tự Động & Lịch Sao Lưu Cơ Sở Dữ Liệu</span>
          </h3>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-xs'>
            <div>
              <label className='block font-bold text-[#171717] mb-1.5'>
                Thời gian lưu vết bản nháp & lịch sử revision (Retention Days):
              </label>
              <Input
                type='number'
                value={retentionDays}
                onChange={(e) => setRetentionDays(e.target.value)}
                className='h-9 font-mono text-xs'
              />
              <p className='text-[10px] text-[#737373] mt-1'>
                Các bản nháp cũ quá số ngày này sẽ được lưu trữ tự động (Archive).
              </p>
            </div>

            <div>
              <label className='block font-bold text-[#171717] mb-1.5'>
                Tần suất tự động Sao Lưu Cơ Sở Dữ Liệu (Backup Schedule):
              </label>
              <select
                value={backupSchedule}
                onChange={(e) => setBackupSchedule(e.target.value)}
                className='w-full h-9 px-3 rounded-lg border border-[#E7E7E7] bg-[#FAF8F5] text-xs font-semibold text-[#171717] cursor-pointer'
              >
                <option value='hourly'>Mỗi giờ (Hourly Snapshot)</option>
                <option value='daily'>Hàng ngày (Daily Midnight Backup)</option>
                <option value='weekly'>Hàng tuần (Weekly Package)</option>
              </select>
            </div>
          </div>

          <div className='pt-2 border-t border-[#E7E7E7] flex items-center justify-between text-xs'>
            <div className='space-y-0.5'>
              <div className='font-bold text-[#171717]'>Tự động làm sạch file tạm cache</div>
              <div className='text-[11px] text-[#737373]'>
                Xóa các file preview nén tạm thời để duy trì hiệu năng đĩa đệm.
              </div>
            </div>
            <input
              type='checkbox'
              checked={autoCleanTemp}
              onChange={(e) => setAutoCleanTemp(e.target.checked)}
              className='w-4 h-4 accent-[#F97316] cursor-pointer'
            />
          </div>

          <div className='flex justify-end pt-2'>
            <Button
              type='submit'
              className='bg-[#F97316] hover:bg-[#EA580C] text-white px-6 py-2 rounded-xl font-bold text-xs shadow-md cursor-pointer'
            >
              <Save className='w-4 h-4 mr-1.5' /> Lưu Cấu Hình Backup
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
