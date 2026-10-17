import React, { useState } from 'react';
import {
  Cpu,
  Database,
  Shield,
  Save,
  HardDrive,
  Key,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Server,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from 'lucide-react';
import { adminService } from '@/services/admin.service';

export const AdminSystemSettingsView: React.FC = () => {
  const [geminiQuota, setGeminiQuota] = useState('500000');
  const [imageQuota, setImageQuota] = useState('0');
  const [claudeQuota, setClaudeQuota] = useState('200000');
  const [storageLimitGb, setStorageLimitGb] = useState('100');
  const [enforce2FAForAdmin, setEnforce2FAForAdmin] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aiWorkspaces, setAiWorkspaces] = useState<any[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');

  React.useEffect(() => {
    const fetchAiConfigs = async () => {
      try {
        const usageList = await adminService.getAiUsage();
        if (usageList && usageList.length > 0) {
          setAiWorkspaces(usageList);
          const first = usageList[0];
          setSelectedWorkspaceId(first.workspaceId);
          if (first.monthlyTokenQuota) {
            setGeminiQuota(String(first.monthlyTokenQuota));
          }
        }
      } catch (err) {
        console.warn('Không thể tải AI usage configs từ API:', err);
      }
    };
    fetchAiConfigs();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (selectedWorkspaceId) {
        await adminService.updateWorkspaceAiConfig(selectedWorkspaceId, {
          provider: 'Google Gemini',
          monthlyTokenQuota: parseInt(geminiQuota, 10) || 500000,
          monthlyImageQuota: parseInt(imageQuota, 10) || 0,
          isEnabled: true,
          allowedModels: ['gemini-1.5-pro', 'gemini-1.5-flash'],
        });
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      console.error('Lỗi lưu cấu hình AI:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className='flex-1 bg-[#FAF8F5] min-h-screen p-6 md:p-8 space-y-6'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs'>
        <div>
          <div className='flex items-center gap-2 mb-1'>
            <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-[10px] font-bold'>
              ADMIN // CONFIG
            </span>
            <span className='text-xs text-[#888888] font-mono'>System Configuration & Quotas</span>
          </div>
          <h1 className='text-2xl font-serif font-bold text-[#171717] tracking-tight'>
            Cấu Hình Hệ Thống & Hạn Ngạch AI Engine
          </h1>
          <p className='text-xs text-[#737373]'>
            Quản trị token LLM, bộ nhớ pgvector Continuity Cache, giới hạn lưu trữ và chính sách bảo
            mật toàn studio.
          </p>
        </div>

        {savedSuccess && (
          <div className='inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold animate-in fade-in'>
            <CheckCircle2 className='w-4 h-4' />
            <span>Đã lưu cấu hình hệ thống!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className='space-y-6 w-full'>
        {/* AI Provider & Token Quotas */}
        <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-4'>
          <div className='flex items-center gap-2.5 border-b border-[#E7E7E7] pb-3'>
            <div className='w-8 h-8 rounded-lg bg-[#F3E8FF] text-[#8B5CF6] flex items-center justify-center'>
              <Cpu className='w-4 h-4' />
            </div>
            <div>
              <h3 className='text-sm font-bold text-[#171717]'>
                Hạn Ngạch AI Model Engine (Token Quotas)
              </h3>
              <p className='text-[11px] text-[#737373]'>
                Cấu hình số lượng token tối đa cấp phát cho tác vụ Script Breakdown & Dialogue
                Refinement hàng tháng.
              </p>
            </div>
          </div>

          {aiWorkspaces.length > 0 && (
            <div>
              <label className='block text-xs font-semibold text-[#171717] mb-1'>
                Studio Workspace áp dụng hạn ngạch
              </label>
              <select
                value={selectedWorkspaceId}
                onChange={(e) => {
                  setSelectedWorkspaceId(e.target.value);
                  const found = aiWorkspaces.find((w) => w.workspaceId === e.target.value);
                  if (found && found.monthlyTokenQuota) {
                    setGeminiQuota(String(found.monthlyTokenQuota));
                  }
                }}
                className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs font-mono text-[#171717] focus:outline-none focus:border-[#F97316]'
              >
                {aiWorkspaces.map((ws) => (
                  <option key={ws.workspaceId} value={ws.workspaceId}>
                    {ws.workspaceName || ws.workspaceId} (
                    {ws.usedTokensCurrentMonth?.toLocaleString() || 0} /{' '}
                    {ws.monthlyTokenQuota?.toLocaleString() || 0} tokens)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
            <div>
              <label className='block text-xs font-semibold text-[#171717] mb-1'>
                Google Gemini 1.5 Flash (Tokens/Tháng)
              </label>
              <input
                type='number'
                value={geminiQuota}
                onChange={(e) => setGeminiQuota(e.target.value)}
                className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs font-mono text-[#171717] focus:outline-none focus:border-[#F97316]'
              />
              <span className='text-[10px] text-[#888888]'>
                Dùng cho AI Script Breakdown & Lore Check
              </span>
            </div>

            <div>
              <label className='block text-xs font-semibold text-[#171717] mb-1'>
                Anthropic Claude 3.5 Sonnet (Tokens/Tháng)
              </label>
              <input
                type='number'
                value={claudeQuota}
                onChange={(e) => setClaudeQuota(e.target.value)}
                className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs font-mono text-[#171717] focus:outline-none focus:border-[#F97316]'
              />
              <span className='text-[10px] text-[#888888]'>
                Dùng cho Editorial Polish & Dialogue Fit
              </span>
            </div>

            <div>
              <label className='block text-xs font-semibold text-[#171717] mb-1'>
                Hạn Ngạch Sinh Ảnh AI (Ảnh/Tháng)
              </label>
              <input
                type='number'
                value={imageQuota}
                onChange={(e) => setImageQuota(e.target.value)}
                placeholder='0 (Không giới hạn)'
                className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs font-mono text-[#171717] focus:outline-none focus:border-[#F97316]'
              />
              <span className='text-[10px] text-[#888888]'>0 = không giới hạn số ảnh sinh ra</span>
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
          {/* Cloud Storage & pgvector Cache */}
          <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-4'>
            <div className='flex items-center gap-2.5 border-b border-[#E7E7E7] pb-3'>
              <div className='w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center'>
                <HardDrive className='w-4 h-4' />
              </div>
              <div>
                <h3 className='text-sm font-bold text-[#171717]'>
                  Lưu Trữ Đám Mây & Continuity Cache
                </h3>
                <p className='text-[11px] text-[#737373]'>
                  Giới hạn dung lượng tệp đồ họa gốc 600 DPI TIFF và vector embeddings nhân vật.
                </p>
              </div>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div>
                <label className='block text-xs font-semibold text-[#171717] mb-1'>
                  Giới hạn tổng dung lượng Cloud Storage (GB)
                </label>
                <input
                  type='number'
                  value={storageLimitGb}
                  onChange={(e) => setStorageLimitGb(e.target.value)}
                  className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs font-mono text-[#171717] focus:outline-none focus:border-[#F97316]'
                />
              </div>

              <div className='p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7] text-xs space-y-1'>
                <div className='font-semibold text-[#171717] flex items-center gap-1.5'>
                  <Database className='w-3.5 h-3.5 text-blue-600' />
                  <span>PostgreSQL pgvector Lore Index</span>
                </div>
                <p className='text-[11px] text-[#737373]'>
                  Kích thước vector dimension: <strong>1536</strong> • Index type: HNSW
                </p>
                <span className='inline-block text-[10px] font-mono text-emerald-600 font-bold'>
                  Synced & Healthy
                </span>
              </div>
            </div>
          </div>

          {/* Security & Maintenance Policies */}
          <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-4'>
            <div className='flex items-center gap-2.5 border-b border-[#E7E7E7] pb-3'>
              <div className='w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center'>
                <Shield className='w-4 h-4' />
              </div>
              <div>
                <h3 className='text-sm font-bold text-[#171717]'>Chính Sách Bảo Mật & Hệ Thống</h3>
                <p className='text-[11px] text-[#737373]'>
                  Bảo vệ tài khoản quản trị và duy trì độ tin cậy của manga studio.
                </p>
              </div>
            </div>

            <div className='space-y-3 text-xs'>
              {/* 2FA Mandatory Toggle */}
              <div className='flex items-center justify-between p-3 rounded-xl border border-[#E7E7E7] hover:bg-[#FAF8F5] transition-colors'>
                <div>
                  <div className='font-bold text-[#171717]'>
                    Bắt buộc 2FA (RFC 6238 TOTP) cho Administrator & Producer
                  </div>
                  <div className='text-[11px] text-[#737373]'>
                    Yêu cầu kích hoạt Google Authenticator trước khi truy cập bảng điều khiển nhạy
                    cảm.
                  </div>
                </div>
                <button
                  type='button'
                  onClick={() => setEnforce2FAForAdmin(!enforce2FAForAdmin)}
                  className='cursor-pointer text-[#171717]'
                >
                  {enforce2FAForAdmin ? (
                    <ToggleRight className='w-8 h-8 text-emerald-600' />
                  ) : (
                    <ToggleLeft className='w-8 h-8 text-gray-400' />
                  )}
                </button>
              </div>

              {/* Maintenance Mode Toggle */}
              <div className='flex items-center justify-between p-3 rounded-xl border border-[#E7E7E7] hover:bg-[#FAF8F5] transition-colors'>
                <div>
                  <div className='font-bold text-[#171717]'>Chế độ Bảo Trì (Maintenance Mode)</div>
                  <div className='text-[11px] text-[#737373]'>
                    Tạm thời khóa quyền ghi đối với mọi role khác trừ Administrator.
                  </div>
                </div>
                <button
                  type='button'
                  onClick={() => setMaintenanceMode(!maintenanceMode)}
                  className='cursor-pointer text-[#171717]'
                >
                  {maintenanceMode ? (
                    <ToggleRight className='w-8 h-8 text-amber-600' />
                  ) : (
                    <ToggleLeft className='w-8 h-8 text-gray-400' />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className='flex items-center justify-end gap-3'>
          <button
            type='submit'
            className='inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer'
          >
            <Save className='w-4 h-4' />
            <span>Lưu Cấu Hình Hệ Thống</span>
          </button>
        </div>
      </form>
    </div>
  );
};
