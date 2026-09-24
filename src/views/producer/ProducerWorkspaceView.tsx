import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Users,
  HardDrive,
  Trash2,
  Edit2,
  UserPlus,
  Shield,
  CheckCircle2,
  RefreshCw,
  X,
  Clock,
  Layers,
  BookOpen,
  Calendar,
  Compass,
  Sparkles,
} from 'lucide-react';
import {
  workspaceService,
  WorkspaceDto,
  WorkspaceMemberDto,
  MOCK_WORKSPACES,
  MOCK_WORKSPACE_MEMBERS,
} from '../../services/workspace.service';
import { seriesService, SeriesDto } from '../../services/series.service';

export const ProducerWorkspaceView: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<WorkspaceDto[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceDto | null>(null);
  const [members, setMembers] = useState<WorkspaceMemberDto[]>([]);
  const [seriesList, setSeriesList] = useState<SeriesDto[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsQuotaGb, setNewWsQuotaGb] = useState('5');

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Producer' | 'Editor' | 'Artist'>('Artist');

  // UC-03: Create Series Modal State
  const [createSeriesModalOpen, setCreateSeriesModalOpen] = useState(false);
  const [newSeriesTitle, setNewSeriesTitle] = useState('');
  const [newSeriesSynopsis, setNewSeriesSynopsis] = useState('');
  const [newSeriesGenre, setNewSeriesGenre] = useState('Action / Sci-Fi');
  const [newSeriesFormat, setNewSeriesFormat] = useState('Manga (Standard)');
  const [newSeriesDirection, setNewSeriesDirection] = useState(1); // 1 = RightToLeft
  const [newSeriesSchedule, setNewSeriesSchedule] = useState('Hàng tuần vào Thứ Sáu');
  const [creatingSeries, setCreatingSeries] = useState(false);

  const [toast, setToast] = useState<{ title: string; desc: string } | null>(null);

  const showToast = (title: string, desc: string) => {
    setToast({ title, desc });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const wsList = await workspaceService.getMyWorkspaces();
      if (wsList && wsList.length > 0) {
        setWorkspaces(wsList);
        const cur = wsList.find((w) => w.id === activeWorkspace?.id) || wsList[0];
        setActiveWorkspace(cur);
        const memList = await workspaceService.getMembers(cur.id);
        setMembers(memList);

        // Load Series in workspace (UC-03)
        try {
          const sList = await seriesService.getSeriesList(cur.id);
          setSeriesList(sList);
        } catch {
          setSeriesList([]);
        }
      } else {
        setWorkspaces([]);
        setActiveWorkspace(null);
        setMembers([]);
        setSeriesList([]);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectWorkspace = async (ws: WorkspaceDto) => {
    setActiveWorkspace(ws);
    try {
      const memList = await workspaceService.getMembers(ws.id);
      setMembers(memList);
      const sList = await seriesService.getSeriesList(ws.id);
      setSeriesList(sList);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) {
      showToast('Lỗi', 'Vui lòng chọn hoặc tạo một Studio Workspace trước.');
      return;
    }
    if (!newSeriesTitle.trim()) return;
    setCreatingSeries(true);
    try {
      const created = await seriesService.createSeries(activeWorkspace.id, {
        title: newSeriesTitle.trim(),
        synopsis: newSeriesSynopsis.trim(),
        genre: newSeriesGenre,
        format: newSeriesFormat,
        readingDirection: newSeriesDirection,
        releaseScheduleJson: newSeriesSchedule,
      });

      setSeriesList((prev) => [created, ...prev]);
      setCreateSeriesModalOpen(false);
      setNewSeriesTitle('');
      setNewSeriesSynopsis('');
      showToast(
        'Tạo Series thành công (UC-03)',
        `Đã tạo bộ truyện "${created.title}" kèm Series Bible và Presets mặc định sẵn sàng nhận việc.`,
      );
    } catch (err: any) {
      showToast('Lỗi tạo Series', err.message);
    } finally {
      setCreatingSeries(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    try {
      const quotaBytes = parseFloat(newWsQuotaGb) * 1024 * 1024 * 1024;
      const created = await workspaceService.createWorkspace({
        name: newWsName.trim(),
        storageQuotaBytes: quotaBytes,
      });
      setWorkspaces((prev) => [created, ...prev]);
      setActiveWorkspace(created);
      setCreateModalOpen(false);
      setNewWsName('');
      showToast('Tạo Workspace thành công', `Đã tạo studio workspace "${created.name}".`);
    } catch (err: any) {
      showToast('Lỗi tạo Workspace', err.message);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) {
      showToast('Lỗi', 'Vui lòng chọn một Studio Workspace.');
      return;
    }
    if (!inviteEmail.trim()) return;
    try {
      const added = await workspaceService.addMember(activeWorkspace.id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setMembers((prev) => [...prev, added]);
      setInviteModalOpen(false);
      setInviteEmail('');
      showToast('Mời thành viên thành công', `Đã gửi lời mời tham gia tới ${added.email}.`);
    } catch (err: any) {
      showToast('Lỗi mời thành viên', err.message);
    }
  };

  const handleRemoveMember = async (userId: string, email: string) => {
    if (!activeWorkspace) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa thành viên ${email} khỏi Workspace?`)) return;
    try {
      await workspaceService.removeMember(activeWorkspace.id, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      showToast('Đã xóa thành viên', `Đã xóa ${email} khỏi workspace.`);
    } catch (err: any) {
      showToast('Lỗi', err.message);
    }
  };

  const formatGb = (bytes: number) => {
    return (bytes / (1024 * 1024 * 1024)).toFixed(1);
  };

  return (
    <div className='flex-1 bg-[#FAF8F5] min-h-screen p-6 md:p-8 space-y-6'>
      {/* Toast */}
      {toast && (
        <div className='fixed top-6 right-6 z-50 bg-[#171717] text-white px-4 py-3 rounded-xl shadow-2xl border border-white/10 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200'>
          <CheckCircle2 className='w-4 h-4 text-emerald-400 shrink-0' />
          <div>
            <div className='text-xs font-bold'>{toast.title}</div>
            <div className='text-[11px] text-[#A3A3A3]'>{toast.desc}</div>
          </div>
          <button onClick={() => setToast(null)} className='ml-2 text-[#737373] hover:text-white'>
            <X className='w-3.5 h-3.5' />
          </button>
        </div>
      )}

      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs'>
        <div>
          <div className='flex items-center gap-2 mb-1'>
            <span className='px-2 py-0.5 rounded bg-[#F97316] text-white font-mono text-[10px] font-bold'>
              PRODUCER // WORKSPACES
            </span>
            <span className='text-xs text-[#888888] font-mono'>
              API: <code>/api/Workspaces</code>
            </span>
          </div>
          <h1 className='text-2xl font-serif font-bold text-[#171717] tracking-tight'>
            Studio Workspaces & Manga Production Desk
          </h1>
          <p className='text-xs text-[#737373]'>
            Không gian làm việc của Giám đốc Sản xuất: Quản lý studio, dung lượng lưu trữ và phân
            quyền thành viên dự án.
          </p>
        </div>

        <div className='flex items-center gap-2.5 shrink-0'>
          <button
            onClick={loadData}
            disabled={loading}
            className='inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#555555] bg-[#F8F6F0] hover:bg-[#EAE6DF] border border-[#E7E7E7] rounded-xl transition-all cursor-pointer'
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className='inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-xl shadow-xs transition-all cursor-pointer'
          >
            <Plus className='w-3.5 h-3.5' />
            <span>Tạo Workspace Mới</span>
          </button>
        </div>
      </div>

      {/* Active Workspace Selector Cards */}
      {workspaces.length === 0 ? (
        <div className='p-8 bg-white rounded-2xl border border-dashed border-[#E7E7E7] text-center space-y-3'>
          <Briefcase className='w-10 h-10 text-[#888888] mx-auto' />
          <h3 className='text-base font-bold text-[#171717]'>Chưa có Studio Workspace nào</h3>
          <p className='text-xs text-[#555555] max-w-sm mx-auto'>
            Bạn chưa tạo Workspace nào. Bấm nút &quot;Tạo Workspace Mới&quot; để thiết lập studio làm việc cho Producer.
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className='inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-xl shadow-xs transition-all cursor-pointer'
          >
            <Plus className='w-3.5 h-3.5' />
            <span>Tạo Workspace Ngay</span>
          </button>
        </div>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
          {workspaces.map((ws) => {
            const isSelected = ws.id === activeWorkspace?.id;
            const usedGb = formatGb(ws.usedStorageBytes);
            const totalGb = formatGb(ws.storageQuotaBytes);
            const pct = Math.min(
              100,
              Math.round((ws.usedStorageBytes / (ws.storageQuotaBytes || 1)) * 100),
            );

            return (
              <div
                key={ws.id}
                onClick={() => handleSelectWorkspace(ws)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white border-[#F97316] ring-2 ring-[#F97316]/20 shadow-md'
                    : 'bg-white/80 border-[#E7E7E7] hover:border-[#F97316]/50 hover:bg-white shadow-xs'
                }`}
              >
                <div className='flex items-start justify-between'>
                  <div className='flex items-center gap-2.5'>
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                        isSelected ? 'bg-[#F97316] text-white' : 'bg-[#FAF8F5] text-[#171717]'
                      }`}
                    >
                      <Briefcase className='w-4 h-4' />
                    </div>
                    <div>
                      <h3 className='text-sm font-bold text-[#171717] truncate max-w-[180px]'>
                        {ws.name}
                      </h3>
                      <span className='text-[10px] text-[#888888] font-mono'>
                        Chủ sở hữu: {ws.ownerName}
                      </span>
                    </div>
                  </div>
                  {ws.isOwner && (
                    <span className='text-[10px] font-mono font-bold bg-[#FFF7ED] text-[#F97316] border border-[#FDBA74] px-1.5 py-0.5 rounded'>
                      OWNER
                    </span>
                  )}
                </div>

                {/* Storage Quota Bar */}
                <div className='mt-4 space-y-1.5'>
                  <div className='flex items-center justify-between text-[11px]'>
                    <span className='text-[#737373] flex items-center gap-1'>
                      <HardDrive className='w-3 h-3' /> Dung lượng lưu trữ
                    </span>
                    <span className='font-mono font-semibold text-[#171717]'>
                      {usedGb} / {totalGb} GB ({pct}%)
                    </span>
                  </div>
                  <div className='w-full bg-[#FAF8F5] h-1.5 rounded-full overflow-hidden border border-[#E7E7E7]'>
                    <div
                      className='bg-[#F97316] h-full rounded-full transition-all duration-500'
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* UC-03: Series Projects in Workspace */}
      <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-5'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7E7E7] pb-4'>
          <div>
            <div className='flex items-center gap-2 mb-1'>
              <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-[10px] font-bold'>
                UC-03 // SERIES SETUP
              </span>
              <span className='text-xs text-[#888888] font-mono'>
                Pipeline, Format &amp; Series Bible
              </span>
            </div>
            <h2 className='text-lg font-bold text-[#171717] flex items-center gap-2'>
              <BookOpen className='w-5 h-5 text-[#F97316]' />
              <span>Dự Án Truyện Tranh (Series) Trong Workspace: {activeWorkspace?.name || 'Chưa chọn Studio'}</span>
            </h2>
            <p className='text-xs text-[#737373]'>
              Thiết lập thể loại, định dạng đọc, quy trình Kanban 8 công đoạn, Series Bible có
              version theo chương (BR-15).
            </p>
          </div>

          <button
            onClick={() => setCreateSeriesModalOpen(true)}
            className='inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold shadow-xs cursor-pointer'
          >
            <Plus className='w-3.5 h-3.5' />
            <span>Tạo Series Mới (UC-03)</span>
          </button>
        </div>

        {/* Series Grid */}
        {seriesList.length === 0 ? (
          <div className='py-8 text-center bg-[#FAF8F5] rounded-xl border border-dashed border-[#E7E7E7] space-y-2'>
            <BookOpen className='w-8 h-8 text-[#888888] mx-auto' />
            <div className='text-xs font-bold text-[#171717]'>
              Chưa có Series nào trong Workspace này
            </div>
            <p className='text-[11px] text-[#737373] max-w-sm mx-auto'>
              Bấm nút &quot;Tạo Series Mới&quot; để thiết lập thể loại, định dạng, quy trình
              pipeline và khởi tạo Series Bible.
            </p>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {seriesList.map((s) => (
              <div
                key={s.id}
                className='p-4 bg-[#FAF8F5] hover:bg-white rounded-xl border border-[#E7E7E7] hover:border-[#171717] transition-all space-y-3 shadow-2xs group'
              >
                <div className='flex items-start justify-between'>
                  <div>
                    <span className='px-2 py-0.5 rounded bg-[#FFF7ED] text-[#F97316] font-mono text-[10px] font-bold border border-[#FDBA74]'>
                      {s.genre}
                    </span>
                    <h3 className='text-sm font-bold text-[#171717] mt-1 group-hover:text-[#F97316] transition-colors'>
                      {s.title}
                    </h3>
                  </div>
                  <span className='text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-[#E7E7E7] text-[#555555]'>
                    {s.format}
                  </span>
                </div>

                <p className='text-xs text-[#555555] line-clamp-2 leading-relaxed'>
                  {s.synopsis || 'Chưa có mô tả tóm tắt cho bộ truyện này.'}
                </p>

                <div className='pt-2 border-t border-[#E7E7E7] flex flex-col gap-1.5 text-[11px] font-mono text-[#737373]'>
                  <div className='flex items-center justify-between'>
                    <span className='flex items-center gap-1'>
                      <Compass className='w-3 h-3 text-[#888888]' /> Hướng đọc:
                    </span>
                    <span className='font-semibold text-[#171717]'>
                      {s.readingDirection === 1 || s.readingDirection === 'RightToLeft'
                        ? 'Phải sang Trái (RTL)'
                        : 'Cuộn dọc (Vertical)'}
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='flex items-center gap-1'>
                      <Calendar className='w-3 h-3 text-[#888888]' /> Lịch phát hành:
                    </span>
                    <span className='text-[#171717] font-semibold'>
                      {s.releaseScheduleJson || 'Hàng tuần'}
                    </span>
                  </div>
                </div>

                <div className='pt-2 flex items-center justify-between text-[10px] font-mono'>
                  <span className='text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#10B981]/30 font-semibold flex items-center gap-1'>
                    <Sparkles className='w-3 h-3' /> Series Bible Active
                  </span>
                  <span className='text-[#888888]'>{s.chaptersCount} Chương</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Workspace Details & Member Management */}
      <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-5'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7E7E7] pb-4'>
          <div>
            <h2 className='text-lg font-bold text-[#171717] flex items-center gap-2'>
              <Users className='w-5 h-5 text-[#F97316]' />
              <span>Thành Viên Trong Studio Workspace: {activeWorkspace?.name || 'Chưa chọn Studio'}</span>
            </h2>
            <p className='text-xs text-[#737373]'>
              Phân quyền và phân công nhiệm vụ cho Writer, Artist, Letterer và Editor.
            </p>
          </div>

          <button
            onClick={() => setInviteModalOpen(true)}
            className='inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#171717] hover:bg-black text-white text-xs font-semibold shadow-xs cursor-pointer'
          >
            <UserPlus className='w-3.5 h-3.5 text-[#F97316]' />
            <span>Mời Thành Viên Mới</span>
          </button>
        </div>

        {/* Members Table */}
        <div className='overflow-x-auto'>
          <table className='w-full text-left text-xs'>
            <thead className='bg-[#F8F6F0] text-[#737373] font-semibold text-[10px] uppercase tracking-wider'>
              <tr>
                <th className='py-3 px-4'>Thành Viên</th>
                <th className='py-3 px-4'>Email</th>
                <th className='py-3 px-4'>Vai Trò Studio</th>
                <th className='py-3 px-4'>Ngày Tham Gia</th>
                <th className='py-3 px-4 text-right'>Thao Tác</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-[#E7E7E7]'>
              {members.map((m) => (
                <tr key={m.userId} className='hover:bg-[#FAF8F5] transition-colors'>
                  <td className='py-3.5 px-4'>
                    <div className='flex items-center gap-2.5'>
                      <div className='w-7 h-7 rounded-full bg-[#171717] text-white flex items-center justify-center font-bold text-xs'>
                        {m.fullName.charAt(0)}
                      </div>
                      <span className='font-semibold text-[#171717]'>{m.fullName}</span>
                      {m.isOwner && (
                        <span className='text-[9px] font-mono bg-[#FFF7ED] text-[#F97316] border border-[#FDBA74] px-1 py-0.2 rounded'>
                          Studio Owner
                        </span>
                      )}
                    </div>
                  </td>
                  <td className='py-3.5 px-4 font-mono text-[#555555]'>{m.email}</td>
                  <td className='py-3.5 px-4'>
                    <span className='inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FFF7ED] text-[#F97316] border border-[#FDBA74]'>
                      {m.role}
                    </span>
                  </td>
                  <td className='py-3.5 px-4 text-[#888888] font-mono text-[11px]'>
                    {new Date(m.joinedAt).toLocaleDateString()}
                  </td>
                  <td className='py-3.5 px-4 text-right'>
                    {!m.isOwner && (
                      <button
                        onClick={() => handleRemoveMember(m.userId, m.email)}
                        className='text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors cursor-pointer'
                        title='Xóa thành viên'
                      >
                        <Trash2 className='w-3.5 h-3.5' />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Workspace */}
      {createModalOpen && (
        <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4'>
          <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-2xl max-w-md w-full p-6 space-y-4'>
            <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
              <h3 className='text-sm font-bold text-[#171717]'>Tạo Studio Workspace Mới</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className='text-[#888888] hover:text-[#171717]'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
            <form onSubmit={handleCreateWorkspace} className='space-y-4 text-xs'>
              <div>
                <label className='block font-semibold text-[#171717] mb-1'>Tên Workspace</label>
                <input
                  type='text'
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  placeholder='Ví dụ: Tokyo Mecha Arc Studio'
                  className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                  required
                />
              </div>
              <div>
                <label className='block font-semibold text-[#171717] mb-1'>
                  Hạn mức lưu trữ Cloud Vault (GB)
                </label>
                <input
                  type='number'
                  value={newWsQuotaGb}
                  onChange={(e) => setNewWsQuotaGb(e.target.value)}
                  className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                  min='1'
                  max='100'
                />
              </div>
              <div className='flex justify-end gap-2 pt-2'>
                <button
                  type='button'
                  onClick={() => setCreateModalOpen(false)}
                  className='px-3 py-1.5 rounded-lg text-[#555555]'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  className='px-4 py-1.5 rounded-lg bg-[#F97316] text-white font-semibold'
                >
                  Tạo Ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Invite Member */}
      {inviteModalOpen && (
        <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4'>
          <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-2xl max-w-md w-full p-6 space-y-4'>
            <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
              <h3 className='text-sm font-bold text-[#171717]'>Mời Thành Viên Vào Workspace</h3>
              <button
                onClick={() => setInviteModalOpen(false)}
                className='text-[#888888] hover:text-[#171717]'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
            <form onSubmit={handleInviteMember} className='space-y-4 text-xs'>
              <div>
                <label className='block font-semibold text-[#171717] mb-1'>Email người nhận</label>
                <input
                  type='email'
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder='artist@panelforge.com'
                  className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                  required
                />
              </div>
              <div>
                <label className='block font-semibold text-[#171717] mb-1'>Vai trò dự án</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                >
                  <option value='Producer'>Producer (Đồng sản xuất)</option>
                  <option value='Editor'>Editor (Biên tập viên)</option>
                  <option value='Artist'>Artist (Đóng góp / Họa sĩ / Biên kịch)</option>
                </select>
              </div>
              <div className='flex justify-end gap-2 pt-2'>
                <button
                  type='button'
                  onClick={() => setInviteModalOpen(false)}
                  className='px-3 py-1.5 rounded-lg text-[#555555]'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  className='px-4 py-1.5 rounded-lg bg-[#F97316] text-white font-semibold'
                >
                  Gửi Lời Mời
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UC-03: Modal Create Series */}
      {createSeriesModalOpen && (
        <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4'>
          <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto'>
            <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
              <div className='flex items-center gap-2'>
                <BookOpen className='w-4 h-4 text-[#F97316]' />
                <h3 className='text-sm font-bold text-[#171717]'>
                  Tạo Dự Án Series Truyện Mới (UC-03)
                </h3>
              </div>
              <button
                onClick={() => setCreateSeriesModalOpen(false)}
                className='text-[#888888] hover:text-[#171717]'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            <form onSubmit={handleCreateSeries} className='space-y-3.5 text-xs'>
              <div>
                <label className='block font-semibold text-[#171717] mb-1'>
                  Tên Dự Án (Series Title) *
                </label>
                <input
                  type='text'
                  value={newSeriesTitle}
                  onChange={(e) => setNewSeriesTitle(e.target.value)}
                  placeholder='Ví dụ: Tokyo Neon Shadows'
                  className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                  required
                />
              </div>

              <div>
                <label className='block font-semibold text-[#171717] mb-1'>
                  Tóm Tắt Cốt Truyện (Synopsis)
                </label>
                <textarea
                  rows={2}
                  value={newSeriesSynopsis}
                  onChange={(e) => setNewSeriesSynopsis(e.target.value)}
                  placeholder='Giới thiệu bối cảnh, xung đột chính và nhân vật trung tâm...'
                  className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                />
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>
                    Thể Loại (Genre)
                  </label>
                  <select
                    value={newSeriesGenre}
                    onChange={(e) => setNewSeriesGenre(e.target.value)}
                    className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                  >
                    <option value='Action / Sci-Fi'>Action / Sci-Fi</option>
                    <option value='Fantasy / Isekai'>Fantasy / Isekai</option>
                    <option value='Mystery / Detective'>Mystery / Detective</option>
                    <option value='Horror / Supernatural'>Horror / Supernatural</option>
                    <option value='Slice of Life / Drama'>Slice of Life / Drama</option>
                  </select>
                </div>

                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>
                    Định Dạng (Format)
                  </label>
                  <select
                    value={newSeriesFormat}
                    onChange={(e) => setNewSeriesFormat(e.target.value)}
                    className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                  >
                    <option value='Manga (B&amp;W Standard)'>Manga (B&amp;W Standard)</option>
                    <option value='Webtoon (Vertical Scroll)'>Webtoon (Vertical Scroll)</option>
                    <option value='Comic (Color Format)'>Comic (Color Format)</option>
                  </select>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>
                    Hướng Đọc (Reading Direction)
                  </label>
                  <select
                    value={newSeriesDirection}
                    onChange={(e) => setNewSeriesDirection(parseInt(e.target.value, 10))}
                    className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                  >
                    <option value={1}>Phải sang Trái (Right-to-Left, Manga)</option>
                    <option value={0}>Trái sang Phải (Left-to-Right)</option>
                    <option value={2}>Cuộn dọc từ trên xuống (Webtoon)</option>
                  </select>
                </div>

                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>
                    Lịch Phát Hành (Schedule)
                  </label>
                  <input
                    type='text'
                    value={newSeriesSchedule}
                    onChange={(e) => setNewSeriesSchedule(e.target.value)}
                    placeholder='Hàng tuần vào Thứ 6'
                    className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                  />
                </div>
              </div>

              <div className='p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7] space-y-1 text-[11px] text-[#737373]'>
                <div className='font-bold text-[#171717] flex items-center gap-1.5'>
                  <Sparkles className='w-3.5 h-3.5 text-[#F97316]' />
                  <span>Quy trình tự động kích hoạt kèm Series (Core Flow 1):</span>
                </div>
                <div>
                  • Áp dụng chuẩn Manga 8 công đoạn (Script → Approved) có Review Gate (BR-06).
                </div>
                <div>• Khởi tạo sẵn Series Bible kho tri thức bất biến theo chương (BR-15).</div>
                <div>• Bật sẵn Typography Presets và Consistency Rules cho Series (NFR-08).</div>
              </div>

              <div className='flex justify-end gap-2 pt-2 border-t border-[#E7E7E7]'>
                <button
                  type='button'
                  onClick={() => setCreateSeriesModalOpen(false)}
                  className='px-3 py-1.5 rounded-lg text-[#555555] hover:bg-[#F3F1EB]'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  disabled={creatingSeries || !newSeriesTitle.trim()}
                  className='px-4 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold disabled:opacity-50'
                >
                  {creatingSeries ? 'Đang tạo...' : 'Tạo Dự Án Ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
