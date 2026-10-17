// src/views/admin/modules/SessionPolicySettings.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Clock,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Save,
  RefreshCw,
  Info,
  ShieldCheck,
  Building2,
  SlidersHorizontal,
} from 'lucide-react';
import {
  adminService,
  WorkspaceSessionPolicyDto,
  UpdateWorkspaceSessionPolicyRequest,
  AiUsageReportItemDto,
} from '@/services/admin.service';

export const SessionPolicySettings: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [loadingPolicy, setLoadingPolicy] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Policy Form State
  const [lifetimeEnabled, setLifetimeEnabled] = useState(false);
  const [sessionLifetimeMinutes, setSessionLifetimeMinutes] = useState<number>(1440); // 24h default

  const [idleEnabled, setIdleEnabled] = useState(false);
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState<number>(60); // 1h default

  const [maxSessionsEnabled, setMaxSessionsEnabled] = useState(false);
  const [maxConcurrentSessions, setMaxConcurrentSessions] = useState<number>(3); // 3 devices default

  // Feedback State
  const [toast, setToast] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // 1. Fetch available workspaces
  useEffect(() => {
    const fetchWorkspaces = async () => {
      setLoadingWorkspaces(true);
      try {
        const usageList: AiUsageReportItemDto[] = await adminService.getAiUsage();
        if (usageList && usageList.length > 0) {
          const list = usageList.map((item) => ({
            id: item.workspaceId,
            name: item.workspaceName || `Studio ${item.workspaceId.substring(0, 6)}`,
          }));
          setWorkspaces(list);
          setSelectedWorkspaceId(list[0].id);
        }
      } catch (err: any) {
        showToast('Không thể tải danh sách Workspace: ' + err.message, 'warning');
      } finally {
        setLoadingWorkspaces(false);
      }
    };

    fetchWorkspaces();
  }, []);

  // 2. Fetch Session Policy for selected workspace
  const fetchPolicy = useCallback(async (wsId: string) => {
    if (!wsId) return;
    setLoadingPolicy(true);
    try {
      const policy: WorkspaceSessionPolicyDto = await adminService.getWorkspaceSessionPolicy(wsId);
      if (policy.sessionLifetimeMinutes !== null && policy.sessionLifetimeMinutes !== undefined) {
        setLifetimeEnabled(true);
        setSessionLifetimeMinutes(policy.sessionLifetimeMinutes);
      } else {
        setLifetimeEnabled(false);
        setSessionLifetimeMinutes(1440);
      }

      if (policy.idleTimeoutMinutes !== null && policy.idleTimeoutMinutes !== undefined) {
        setIdleEnabled(true);
        setIdleTimeoutMinutes(policy.idleTimeoutMinutes);
      } else {
        setIdleEnabled(false);
        setIdleTimeoutMinutes(60);
      }

      if (policy.maxConcurrentSessions !== null && policy.maxConcurrentSessions !== undefined) {
        setMaxSessionsEnabled(true);
        setMaxConcurrentSessions(policy.maxConcurrentSessions);
      } else {
        setMaxSessionsEnabled(false);
        setMaxConcurrentSessions(3);
      }
    } catch (err: any) {
      showToast('Lỗi tải Session Policy: ' + err.message, 'error');
    } finally {
      setLoadingPolicy(false);
    }
  }, []);

  useEffect(() => {
    if (selectedWorkspaceId) {
      fetchPolicy(selectedWorkspaceId);
    }
  }, [selectedWorkspaceId, fetchPolicy]);

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspaceId) return;

    // Validation rules according to BE contract
    const lifetimeVal = lifetimeEnabled ? sessionLifetimeMinutes : null;
    const idleVal = idleEnabled ? idleTimeoutMinutes : null;
    const maxSessionsVal = maxSessionsEnabled ? maxConcurrentSessions : null;

    if (lifetimeVal !== null) {
      if (lifetimeVal < 5 || lifetimeVal > 43200) {
        showToast('Thời gian sống phiên phải từ 5 phút đến 43.200 phút (30 ngày).', 'warning');
        return;
      }
    }

    if (idleVal !== null) {
      if (idleVal < 1) {
        showToast(
          'Thời gian chờ không hoạt động (idle timeout) phải từ 1 phút trở lên.',
          'warning',
        );
        return;
      }
      if (lifetimeVal !== null && idleVal > lifetimeVal) {
        showToast('Idle timeout không được lớn hơn thời gian sống tối đa của phiên.', 'warning');
        return;
      }
    }

    if (maxSessionsVal !== null) {
      if (maxSessionsVal < 1 || maxSessionsVal > 100) {
        showToast('Số phiên đồng thời tối đa phải từ 1 đến 100 phiên.', 'warning');
        return;
      }
    }

    setSavingPolicy(true);
    try {
      // Backend PUT rule: Phải gửi đủ 3 field (null nghĩa là xoá giới hạn đó)
      const payload: UpdateWorkspaceSessionPolicyRequest = {
        sessionLifetimeMinutes: lifetimeVal,
        idleTimeoutMinutes: idleVal,
        maxConcurrentSessions: maxSessionsVal,
      };

      const updated = await adminService.updateWorkspaceSessionPolicy(selectedWorkspaceId, payload);

      showToast(
        `Đã lưu chính sách phiên làm việc cho Workspace thành công! (Áp dụng từ phiên kế tiếp)`,
        'success',
      );

      // Đồng bộ state sau khi lưu
      if (updated.sessionLifetimeMinutes !== null) {
        setLifetimeEnabled(true);
        setSessionLifetimeMinutes(updated.sessionLifetimeMinutes);
      } else {
        setLifetimeEnabled(false);
      }

      if (updated.idleTimeoutMinutes !== null) {
        setIdleEnabled(true);
        setIdleTimeoutMinutes(updated.idleTimeoutMinutes);
      } else {
        setIdleEnabled(false);
      }

      if (updated.maxConcurrentSessions !== null) {
        setMaxSessionsEnabled(true);
        setMaxConcurrentSessions(updated.maxConcurrentSessions);
      } else {
        setMaxSessionsEnabled(false);
      }
    } catch (err: any) {
      showToast(err.message || 'Không thể cập nhật chính sách phiên làm việc.', 'error');
    } finally {
      setSavingPolicy(false);
    }
  };

  return (
    <div className='space-y-6 w-full'>
      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-lg animate-in fade-in slide-in-from-top duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : toast.type === 'warning'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <div className='flex items-center gap-2'>
            {toast.type === 'success' ? (
              <CheckCircle2 className='w-4 h-4 text-emerald-600' />
            ) : (
              <AlertTriangle className='w-4 h-4 text-amber-600' />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className='hover:opacity-75 font-bold cursor-pointer text-xs ml-4'
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs'>
        <div>
          <div className='flex items-center gap-2 mb-1'>
            <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-[10px] font-bold'>
              ADMIN // SECURITY // V1.2
            </span>
            <span className='text-xs font-mono text-[#888888]'>Workspace Session Policy</span>
          </div>
          <h1 className='text-2xl font-serif font-bold text-[#171717] tracking-tight'>
            Chính Sách Phiên Làm Việc (Session Policy)
          </h1>
          <p className='text-xs text-[#737373] mt-1'>
            Quản trị thời gian sống JWT/Session, kiểm soát idle timeout tự động ngắt kết nối và hạn
            chế số thiết bị truy cập đồng thời theo từng Studio Workspace.
          </p>
        </div>

        {/* Workspace Selector */}
        <div className='flex items-center gap-2 bg-[#FAF8F5] p-2 rounded-xl border border-[#E7E7E7]'>
          <Building2 className='w-4 h-4 text-[#F97316] shrink-0' />
          <div className='text-xs'>
            <label className='block text-[10px] font-mono text-[#888888] uppercase'>
              Chọn Studio Workspace:
            </label>
            <select
              value={selectedWorkspaceId}
              onChange={(e) => setSelectedWorkspaceId(e.target.value)}
              disabled={loadingWorkspaces}
              className='bg-transparent font-semibold text-xs text-[#171717] focus:outline-none cursor-pointer max-w-[200px] truncate'
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
              {workspaces.length === 0 && (
                <option value=''>
                  {loadingWorkspaces ? 'Đang tải danh sách...' : 'Chưa có Workspace'}
                </option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Main Configuration Form */}
      <form onSubmit={handleSave} className='space-y-6'>
        <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
          {/* Card 1: Session Lifetime */}
          <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-4'>
            <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
              <div className='flex items-center gap-2.5'>
                <div className='w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#E7E7E7] flex items-center justify-center text-[#F97316]'>
                  <Clock className='w-4 h-4' />
                </div>
                <div>
                  <h3 className='text-sm font-bold text-[#171717]'>
                    1. Thời Gian Sống Tối Đa Của Phiên (Session Lifetime)
                  </h3>
                  <p className='text-[11px] text-[#737373]'>
                    Hạn tối đa từ khi đăng nhập. Quá thời gian này, phiên hết hạn và buộc người dùng
                    đăng nhập lại.
                  </p>
                </div>
              </div>

              <label className='relative inline-flex items-center cursor-pointer'>
                <input
                  type='checkbox'
                  checked={lifetimeEnabled}
                  onChange={(e) => setLifetimeEnabled(e.target.checked)}
                  className='sr-only peer'
                />
                <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#059669]"></div>
                <span className='ml-2 text-xs font-semibold text-[#171717]'>
                  {lifetimeEnabled ? 'Bật giới hạn' : 'Không giới hạn (Mặc định 30 ngày)'}
                </span>
              </label>
            </div>

            {lifetimeEnabled && (
              <div className='space-y-3 pt-2 animate-in fade-in duration-150'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='text-xs text-[#737373]'>Gợi ý nhanh:</span>
                  {[
                    { label: '2 giờ', mins: 120 },
                    { label: '8 giờ', mins: 480 },
                    { label: '24 giờ (1 ngày)', mins: 1440 },
                    { label: '7 ngày', mins: 10080 },
                    { label: '30 ngày', mins: 43200 },
                  ].map((preset) => (
                    <button
                      key={preset.mins}
                      type='button'
                      onClick={() => setSessionLifetimeMinutes(preset.mins)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                        sessionLifetimeMinutes === preset.mins
                          ? 'bg-[#171717] text-white font-bold'
                          : 'bg-[#FAF8F5] border border-[#E7E7E7] text-[#555555] hover:bg-[#F3F1EB]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className='flex items-center gap-4'>
                  <input
                    type='number'
                    min={5}
                    max={43200}
                    value={sessionLifetimeMinutes}
                    onChange={(e) =>
                      setSessionLifetimeMinutes(
                        Math.max(5, Math.min(43200, parseInt(e.target.value, 10) || 5)),
                      )
                    }
                    className='w-36 px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl text-xs font-mono text-[#171717] focus:outline-none focus:border-[#F97316]'
                  />
                  <span className='text-xs text-[#737373]'>
                    phút (tương đương {(sessionLifetimeMinutes / 60).toFixed(1)} giờ hoặc{' '}
                    {(sessionLifetimeMinutes / 1440).toFixed(1)} ngày)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Idle Timeout */}
          <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-4'>
            <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
              <div className='flex items-center gap-2.5'>
                <div className='w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#E7E7E7] flex items-center justify-center text-[#F97316]'>
                  <SlidersHorizontal className='w-4 h-4' />
                </div>
                <div>
                  <h3 className='text-sm font-bold text-[#171717]'>
                    2. Thời Gian Chờ Không Hoạt Động (Idle Timeout)
                  </h3>
                  <p className='text-[11px] text-[#737373]'>
                    Tự động thu hồi phiên nếu không có thao tác refresh token trong khoảng thời gian
                    này.
                  </p>
                </div>
              </div>

              <label className='relative inline-flex items-center cursor-pointer'>
                <input
                  type='checkbox'
                  checked={idleEnabled}
                  onChange={(e) => setIdleEnabled(e.target.checked)}
                  className='sr-only peer'
                />
                <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#059669]"></div>
                <span className='ml-2 text-xs font-semibold text-[#171717]'>
                  {idleEnabled ? 'Bật giới hạn' : 'Không giới hạn'}
                </span>
              </label>
            </div>

            {idleEnabled && (
              <div className='space-y-3 pt-2 animate-in fade-in duration-150'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='text-xs text-[#737373]'>Gợi ý nhanh:</span>
                  {[
                    { label: '15 phút', mins: 15 },
                    { label: '30 phút', mins: 30 },
                    { label: '60 phút (1 giờ)', mins: 60 },
                    { label: '120 phút (2 giờ)', mins: 120 },
                  ].map((preset) => (
                    <button
                      key={preset.mins}
                      type='button'
                      onClick={() => setIdleTimeoutMinutes(preset.mins)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                        idleTimeoutMinutes === preset.mins
                          ? 'bg-[#171717] text-white font-bold'
                          : 'bg-[#FAF8F5] border border-[#E7E7E7] text-[#555555] hover:bg-[#F3F1EB]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className='flex items-center gap-4'>
                  <input
                    type='number'
                    min={1}
                    max={lifetimeEnabled ? sessionLifetimeMinutes : 43200}
                    value={idleTimeoutMinutes}
                    onChange={(e) =>
                      setIdleTimeoutMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))
                    }
                    className='w-36 px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl text-xs font-mono text-[#171717] focus:outline-none focus:border-[#F97316]'
                  />
                  <span className='text-xs text-[#737373]'>
                    phút không hoạt động trước khi đăng xuất
                  </span>
                </div>

                <div className='p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-800 flex items-start gap-2'>
                  <Info className='w-4 h-4 text-amber-600 shrink-0 mt-0.5' />
                  <span>
                    <strong>Đặc thù kỹ thuật:</strong> Do Access Token (JWT) có hiệu lực 30 phút,
                    việc kiểm tra idle timeout được thực thi ở lần gọi Refresh Token tiếp theo. Nếu
                    đặt dưới 30 phút, người dùng vẫn có thể thao tác đến khi Access Token hiện tại
                    hết hạn.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Max Concurrent Sessions */}
        <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-4'>
          <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
            <div className='flex items-center gap-2.5'>
              <div className='w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#E7E7E7] flex items-center justify-center text-[#F97316]'>
                <Laptop className='w-4 h-4' />
              </div>
              <div>
                <h3 className='text-sm font-bold text-[#171717]'>
                  3. Số Phiên / Thiết Bị Đồng Thời (Max Concurrent Sessions)
                </h3>
                <p className='text-[11px] text-[#737373]'>
                  Hạn chế số lượng thiết bị đăng nhập đồng thời của mỗi thành viên trong Workspace.
                </p>
              </div>
            </div>

            <label className='relative inline-flex items-center cursor-pointer'>
              <input
                type='checkbox'
                checked={maxSessionsEnabled}
                onChange={(e) => setMaxSessionsEnabled(e.target.checked)}
                className='sr-only peer'
              />
              <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#059669]"></div>
              <span className='ml-2 text-xs font-semibold text-[#171717]'>
                {maxSessionsEnabled ? 'Bật giới hạn' : 'Không giới hạn'}
              </span>
            </label>
          </div>

          {maxSessionsEnabled && (
            <div className='space-y-3 pt-2 animate-in fade-in duration-150'>
              <div className='flex flex-wrap items-center gap-2'>
                <span className='text-xs text-[#737373]'>Gợi ý nhanh:</span>
                {[
                  { label: '1 thiết bị (Độc quyền)', count: 1 },
                  { label: '2 thiết bị', count: 2 },
                  { label: '3 thiết bị', count: 3 },
                  { label: '5 thiết bị', count: 5 },
                ].map((preset) => (
                  <button
                    key={preset.count}
                    type='button'
                    onClick={() => setMaxConcurrentSessions(preset.count)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                      maxConcurrentSessions === preset.count
                        ? 'bg-[#171717] text-white font-bold'
                        : 'bg-[#FAF8F5] border border-[#E7E7E7] text-[#555555] hover:bg-[#F3F1EB]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className='flex items-center gap-4'>
                <input
                  type='number'
                  min={1}
                  max={100}
                  value={maxConcurrentSessions}
                  onChange={(e) =>
                    setMaxConcurrentSessions(
                      Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)),
                    )
                  }
                  className='w-36 px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl text-xs font-mono text-[#171717] focus:outline-none focus:border-[#F97316]'
                />
                <span className='text-xs text-[#737373]'>
                  phiên làm việc đồng thời tối đa cho mỗi thành viên (1 - 100)
                </span>
              </div>

              <div className='p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-[11px] text-zinc-700 flex items-start gap-2'>
                <ShieldCheck className='w-4 h-4 text-emerald-600 shrink-0 mt-0.5' />
                <span>
                  <strong>Nguyên tắc thu hồi:</strong> Khi vượt quá số phiên quy định, phiên đăng
                  nhập <em>cũ nhất</em> sẽ tự động bị thu hồi. Người dùng ở thiết bị cũ sẽ nhận mã
                  401 và được chuyển hướng về màn hình đăng nhập ở lần tương tác tiếp theo.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Enforce Notice Box */}
        <div className='p-4 bg-[#FAF8F5] rounded-2xl border border-[#E7E7E7] text-xs text-[#737373] space-y-2'>
          <div className='font-bold text-[#171717] flex items-center gap-1.5'>
            <Shield className='w-4 h-4 text-[#F97316]' />
            <span>Quy Tắc Áp Dụng Đa Workspace (Multi-Workspace Enforce Rule)</span>
          </div>
          <p>
            • Nếu người dùng thuộc nhiều Workspace khác nhau, hệ thống tự động áp dụng giá trị{' '}
            <strong>nghiêm ngặt nhất</strong> (thời gian sống ngắn nhất, thời gian idle ngắn nhất,
            số phiên ít nhất).
          </p>
          <p>
            • Người dùng không thuộc Workspace nào (hoặc chỉ mang quyền Administrator) không bị ràng
            buộc bởi Session Policy này.
          </p>
          <p>
            • Thay đổi chính sách sẽ áp dụng ngay ở lượt đăng nhập hoặc làm mới token (refresh) tiếp
            theo, không cắt ngang các phiên đang thao tác hợp lệ.
          </p>
        </div>

        {/* Action Buttons */}
        <div className='flex items-center justify-end gap-3 pt-2'>
          <button
            type='button'
            disabled={loadingPolicy || savingPolicy}
            onClick={() => selectedWorkspaceId && fetchPolicy(selectedWorkspaceId)}
            className='px-4 py-2.5 rounded-xl border border-[#E7E7E7] bg-white hover:bg-[#F3F1EB] text-xs font-semibold text-[#555555] flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50'
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingPolicy ? 'animate-spin' : ''}`} />
            <span>Tải lại</span>
          </button>

          <button
            type='submit'
            disabled={savingPolicy || loadingPolicy || !selectedWorkspaceId}
            className='px-6 py-2.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50'
          >
            <Save className='w-4 h-4' />
            <span>{savingPolicy ? 'Đang lưu chính sách...' : 'Lưu Chính Sách Session Policy'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
