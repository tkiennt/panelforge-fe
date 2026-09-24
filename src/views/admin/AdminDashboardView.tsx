import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Server,
  Cpu,
  Database,
  Activity,
  Layers,
  RefreshCw,
  Clock,
  ArrowUpRight,
  Settings,
  AlertTriangle,
  HardDrive,
  Lock,
} from 'lucide-react';
import { adminService, SystemStatsResponse } from '../../services/admin.service';

interface AdminDashboardViewProps {
  onNavigateToUsers?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToAudit?: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  onNavigateToUsers,
  onNavigateToSettings,
  onNavigateToAudit,
}) => {
  const [stats, setStats] = useState<SystemStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await adminService.getSystemStats();
      setStats(data);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Lỗi khi tải thống kê admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className='flex-1 bg-[#FAF8F5] min-h-screen p-6 md:p-8 space-y-6'>
      {/* Header Bar */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs'>
        <div className='space-y-1'>
          <div className='flex items-center gap-2.5'>
            <span className='px-2.5 py-0.5 rounded-md bg-[#171717] text-white text-[10px] font-mono font-bold uppercase tracking-wider'>
              SYS-ROOT // RBAC
            </span>
            <span className='inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200'>
              <span className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse'></span>
              Operational
            </span>
          </div>
          <h1 className='text-2xl font-serif font-bold text-[#171717] tracking-tight'>
            PanelForge System Administration Console
          </h1>
          <p className='text-xs text-[#737373]'>
            Trung tâm điều hành cấp hệ thống, giám sát tài nguyên, phân quyền RBAC và bảo mật người
            dùng.
          </p>
        </div>

        <div className='flex items-center gap-2.5 shrink-0'>
          <button
            onClick={fetchStats}
            disabled={loading}
            className='inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#555555] bg-[#F8F6F0] hover:bg-[#EAE6DF] hover:text-[#171717] border border-[#E7E7E7] rounded-xl transition-all cursor-pointer'
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
          <button
            onClick={onNavigateToUsers}
            className='inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-xl shadow-xs transition-all cursor-pointer'
          >
            <Users className='w-3.5 h-3.5' />
            <span>Quản lý Người Dùng</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        {/* Total Users */}
        <div className='bg-white p-5 rounded-xl border border-[#E7E7E7] shadow-xs relative overflow-hidden group hover:border-[#F97316]/50 transition-all'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-medium text-[#737373]'>Tổng người dùng</span>
            <div className='w-8 h-8 rounded-lg bg-[#FFF7ED] text-[#F97316] flex items-center justify-center'>
              <Users className='w-4 h-4' />
            </div>
          </div>
          <div className='mt-3 flex items-baseline gap-2'>
            <span className='text-2xl font-serif font-bold text-[#171717]'>
              {stats ? stats.totalUsers.toLocaleString() : '—'}
            </span>
            <span className='text-[10px] font-mono text-emerald-600 font-semibold'>+12% mo</span>
          </div>
          <p className='text-[11px] text-[#888888] mt-1'>Đã đăng ký tài khoản trong hệ thống</p>
        </div>

        {/* Administrators */}
        <div className='bg-white p-5 rounded-xl border border-[#E7E7E7] shadow-xs relative overflow-hidden group hover:border-[#171717]/50 transition-all'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-medium text-[#737373]'>Quản trị viên (Admin)</span>
            <div className='w-8 h-8 rounded-lg bg-[#171717] text-white flex items-center justify-center'>
              <Shield className='w-4 h-4' />
            </div>
          </div>
          <div className='mt-3 flex items-baseline gap-2'>
            <span className='text-2xl font-serif font-bold text-[#171717]'>
              {stats ? stats.admins : '—'}
            </span>
            <span className='text-[10px] font-mono text-[#737373]'>Root Access</span>
          </div>
          <p className='text-[11px] text-[#888888] mt-1'>Đặc quyền toàn diện hệ thống</p>
        </div>

        {/* Studio Workspaces */}
        <div className='bg-white p-5 rounded-xl border border-[#E7E7E7] shadow-xs relative overflow-hidden group hover:border-violet-400 transition-all'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-medium text-[#737373]'>Studio Workspaces</span>
            <div className='w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center'>
              <Layers className='w-4 h-4' />
            </div>
          </div>
          <div className='mt-3 flex items-baseline gap-2'>
            <span className='text-2xl font-serif font-bold text-[#171717]'>
              {stats ? stats.totalWorkspaces : '—'}
            </span>
            <span className='text-[10px] font-mono text-violet-600 font-semibold'>
              {stats ? `${stats.totalWorkspaceMembers} members` : ''}
            </span>
          </div>
          <p className='text-[11px] text-[#888888] mt-1'>Studio đang hoạt động trong hệ thống</p>
        </div>

        {/* Server Time & Status */}
        <div className='bg-white p-5 rounded-xl border border-[#E7E7E7] shadow-xs relative overflow-hidden group hover:border-emerald-400 transition-all'>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-medium text-[#737373]'>Server Node</span>
            <div className='w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center'>
              <Server className='w-4 h-4' />
            </div>
          </div>
          <div className='mt-3 flex items-baseline gap-2'>
            <span className='text-sm font-mono font-bold text-[#171717] truncate'>
              {stats?.serverTimeUtc ? new Date(stats.serverTimeUtc).toLocaleTimeString() : 'Online'}
            </span>
            <span className='text-[10px] font-mono text-emerald-600 font-bold'>UTC+0</span>
          </div>
          <p className='text-[11px] text-[#888888] mt-1'>ASP.NET Core 9 • Postgres pgvector</p>
        </div>
      </div>

      {/* Central Section: Quick Tools & Health status */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Left 2 Cols: System Capabilities & Quick Links */}
        <div className='lg:col-span-2 space-y-6'>
          {/* Quick Admin Actions */}
          <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs'>
            <h3 className='text-sm font-bold text-[#171717] mb-4 flex items-center gap-2'>
              <Activity className='w-4 h-4 text-[#F97316]' />
              <span>Thao Tác Quản Trị Nhanh</span>
            </h3>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <button
                onClick={onNavigateToUsers}
                className='p-4 rounded-xl border border-[#E7E7E7] hover:border-[#F97316] hover:bg-[#FFF7ED]/30 text-left transition-all group cursor-pointer'
              >
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2.5'>
                    <div className='w-8 h-8 rounded-lg bg-[#FFF7ED] text-[#F97316] flex items-center justify-center'>
                      <Users className='w-4 h-4' />
                    </div>
                    <div>
                      <div className='text-xs font-bold text-[#171717] group-hover:text-[#F97316] transition-colors'>
                        Danh Sách Người Dùng & RBAC
                      </div>
                      <div className='text-[10px] text-[#737373]'>
                        Gán vai trò, quản lý phân quyền & 2FA
                      </div>
                    </div>
                  </div>
                  <ArrowUpRight className='w-4 h-4 text-[#888888] group-hover:text-[#F97316] group-hover:translate-x-0.5 transition-transform' />
                </div>
              </button>

              <button
                onClick={onNavigateToSettings}
                className='p-4 rounded-xl border border-[#E7E7E7] hover:border-[#171717] hover:bg-[#F8F6F0] text-left transition-all group cursor-pointer'
              >
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2.5'>
                    <div className='w-8 h-8 rounded-lg bg-[#F3E8FF] text-[#8B5CF6] flex items-center justify-center'>
                      <Cpu className='w-4 h-4' />
                    </div>
                    <div>
                      <div className='text-xs font-bold text-[#171717]'>Hạn Ngạch AI & Quota</div>
                      <div className='text-[10px] text-[#737373]'>
                        Cấu hình token Gemini, Claude, OpenAI
                      </div>
                    </div>
                  </div>
                  <ArrowUpRight className='w-4 h-4 text-[#888888] group-hover:text-[#171717] group-hover:translate-x-0.5 transition-transform' />
                </div>
              </button>

              <button
                onClick={onNavigateToAudit}
                className='p-4 rounded-xl border border-[#E7E7E7] hover:border-emerald-500 hover:bg-emerald-50/20 text-left transition-all group cursor-pointer'
              >
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2.5'>
                    <div className='w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center'>
                      <Lock className='w-4 h-4' />
                    </div>
                    <div>
                      <div className='text-xs font-bold text-[#171717]'>
                        Nhật Ký Bảo Mật (Audit)
                      </div>
                      <div className='text-[10px] text-[#737373]'>
                        Theo dõi sự kiện đăng nhập, cấp quyền
                      </div>
                    </div>
                  </div>
                  <ArrowUpRight className='w-4 h-4 text-[#888888] group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform' />
                </div>
              </button>

              <button
                onClick={onNavigateToSettings}
                className='p-4 rounded-xl border border-[#E7E7E7] hover:border-blue-500 hover:bg-blue-50/20 text-left transition-all group cursor-pointer'
              >
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2.5'>
                    <div className='w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center'>
                      <HardDrive className='w-4 h-4' />
                    </div>
                    <div>
                      <div className='text-xs font-bold text-[#171717]'>Lưu Trữ & Cloud Vault</div>
                      <div className='text-[10px] text-[#737373]'>
                        Dung lượng bản thảo 600 DPI & Backup
                      </div>
                    </div>
                  </div>
                  <ArrowUpRight className='w-4 h-4 text-[#888888] group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform' />
                </div>
              </button>
            </div>
          </div>

          {/* Role Distribution Overview */}
          <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-sm font-bold text-[#171717] flex items-center gap-2'>
                <Shield className='w-4 h-4 text-[#171717]' />
                <span>Phân Bổ Vai Trò Manga Studio (RBAC)</span>
              </h3>
              <span className='text-[11px] font-mono text-[#888888]'>PanelForge Roles v2.1</span>
            </div>

            <div className='space-y-3 text-xs'>
              {[
                { role: 'Administrator', count: stats?.admins || 3, color: 'bg-[#171717]', pct: 5 },
                { role: 'Producer', count: 18, color: 'bg-[#F97316]', pct: 15 },
                { role: 'Writer', count: 32, color: 'bg-indigo-600', pct: 25 },
                { role: 'Artist', count: 48, color: 'bg-blue-600', pct: 35 },
                { role: 'Letterer', count: 14, color: 'bg-emerald-600', pct: 12 },
                { role: 'Editor', count: 12, color: 'bg-red-600', pct: 10 },
                { role: 'Reader', count: 120, color: 'bg-gray-500', pct: 60 },
              ].map((item) => (
                <div key={item.role} className='space-y-1'>
                  <div className='flex items-center justify-between text-[11px]'>
                    <span className='font-semibold text-[#171717]'>{item.role}</span>
                    <span className='font-mono text-[#737373]'>{item.count} người dùng</span>
                  </div>
                  <div className='w-full bg-[#EAE6DF] h-2 rounded-full overflow-hidden'>
                    <div
                      className={`h-full rounded-full ${item.color} transition-all duration-500`}
                      style={{ width: `${item.pct}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: System Health & Live Specs */}
        <div className='space-y-6'>
          <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-4'>
            <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
              <h3 className='text-sm font-bold text-[#171717] flex items-center gap-2'>
                <Server className='w-4 h-4 text-emerald-600' />
                <span>Trạng Thái Hạ Tầng</span>
              </h3>
              <span className='text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded'>
                99.98% SLA
              </span>
            </div>

            <div className='space-y-3 text-xs'>
              <div className='flex items-center justify-between py-1.5 border-b border-[#F3F1EB]'>
                <span className='text-[#737373]'>Backend API Host</span>
                <span className='font-mono font-medium text-[#171717]'>
                  localhost:5044 (.NET 9)
                </span>
              </div>

              <div className='flex items-center justify-between py-1.5 border-b border-[#F3F1EB]'>
                <span className='text-[#737373]'>Database Primary</span>
                <span className='font-mono font-medium text-[#171717]'>PostgreSQL 16 + Vector</span>
              </div>

              <div className='flex items-center justify-between py-1.5 border-b border-[#F3F1EB]'>
                <span className='text-[#737373]'>AI LoRA Model Engine</span>
                <span className='font-mono font-semibold text-[#8B5CF6]'>Active (v1.4)</span>
              </div>

              <div className='flex items-center justify-between py-1.5 border-b border-[#F3F1EB]'>
                <span className='text-[#737373]'>Cơ chế Bảo mật 2FA</span>
                <span className='font-mono font-semibold text-emerald-600'>RFC 6238 TOTP</span>
              </div>

              <div className='flex items-center justify-between py-1.5'>
                <span className='text-[#737373]'>Lần đồng bộ gần nhất</span>
                <span className='font-mono text-[#888888]'>
                  {lastRefreshed.toLocaleTimeString()}
                </span>
              </div>
            </div>

            <div className='p-3 bg-[#F8F6F0] rounded-xl border border-[#E7E7E7] text-[11px] text-[#555555] space-y-1'>
              <div className='font-semibold text-[#171717] flex items-center gap-1.5'>
                <Clock className='w-3.5 h-3.5 text-[#F97316]' />
                <span>Lưu ý Quản trị</span>
              </div>
              <p>
                Mọi thay đổi phân quyền thông qua API <code>/api/Admin/assign-role</code> sẽ có hiệu
                lực ngay ở phiên làm việc tiếp theo của người dùng.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
