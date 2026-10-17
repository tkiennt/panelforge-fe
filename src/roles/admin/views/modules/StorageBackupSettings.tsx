import React, { useState } from 'react';
import {
  HardDrive,
  Database,
  Clock,
  Save,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  FileCheck,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';

export const StorageBackupSettings: React.FC = () => {
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [storageQuotaGb, setStorageQuotaGb] = useState('250');
  const [retentionDays, setRetentionDays] = useState('90');
  const [backupSchedule, setBackupSchedule] = useState('daily');
  const [autoCleanTemp, setAutoCleanTemp] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className='space-y-6 w-full'>
      <div className='flex items-center justify-between bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs'>
        <div>
          <div className='flex items-center gap-2 mb-1'>
            <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-[10px] font-bold'>
              STORAGE // BACKUP
            </span>
          </div>
          <h1 className='text-2xl font-serif font-bold text-[#171717] tracking-tight'>
            Quản Lý Lưu Trữ, Hạn Ngạch & Lịch Sao Lưu (Backup)
          </h1>
          <p className='text-xs text-[#737373]'>
            Thiết lập giới hạn dung lượng đĩa đệm, chính sách lưu giữ bản nháp truyện tranh và sao
            lưu định kỳ.
          </p>
        </div>

        {savedSuccess && (
          <div className='inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold animate-in fade-in'>
            <CheckCircle2 className='w-4 h-4' />
            <span>Đã lưu Storage Settings!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className='space-y-6'>
        <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
          {/* Storage Quotas & Limits */}
          <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-4'>
            <h3 className='text-sm font-bold text-[#171717] flex items-center gap-2'>
              <HardDrive className='w-4 h-4 text-[#F97316]' />
              <span>Hạn Ngạch Lưu Trữ Studio (Storage Quotas)</span>
            </h3>

            <div className='space-y-4 text-xs'>
              <div>
                <label className='block font-bold text-[#171717] mb-1.5 flex items-center justify-between'>
                  <span>Giới hạn dung lượng toàn Studio (GB):</span>
                  <span className='font-mono font-bold text-[#F97316]'>{storageQuotaGb} GB</span>
                </label>
                <input
                  type='range'
                  min='50'
                  max='1000'
                  step='50'
                  value={storageQuotaGb}
                  onChange={(e) => setStorageQuotaGb(e.target.value)}
                  className='w-full accent-[#F97316] cursor-pointer'
                />
                <div className='flex justify-between text-[10px] text-[#737373] font-mono mt-1'>
                  <span>50 GB (Basic)</span>
                  <span>500 GB (Standard)</span>
                  <span>1000 GB (Enterprise)</span>
                </div>
              </div>

              <div className='p-4 rounded-xl border border-[#E7E7E7] bg-[#FAF8F5] flex items-center justify-between'>
                <div>
                  <div className='font-bold text-[#171717]'>Dung lượng đang sử dụng thực tế</div>
                  <div className='text-[#737373] text-[11px] mt-0.5'>
                    Bao gồm Genga PSD, PNG Screentone & Continuity Vectors
                  </div>
                </div>
                <div className='text-right'>
                  <div className='text-xl font-serif font-bold text-[#171717]'>48.5 GB</div>
                  <div className='text-[10px] font-mono text-emerald-600 font-bold'>
                    19.4% Quota Used
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Data Retention & Backup Schedules */}
          <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-4'>
            <h3 className='text-sm font-bold text-[#171717] flex items-center gap-2'>
              <Clock className='w-4 h-4 text-[#F97316]' />
              <span>Thời Gian Lưu Trữ & Lịch Tự Động Sao Lưu</span>
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
          </div>
        </div>

        <div className='flex justify-end'>
          <Button
            type='submit'
            className='bg-[#F97316] hover:bg-[#EA580C] text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md cursor-pointer'
          >
            <Save className='w-4 h-4 mr-1.5' /> Lưu Storage Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
