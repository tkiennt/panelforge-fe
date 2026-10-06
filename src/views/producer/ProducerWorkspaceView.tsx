import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Sliders,
  ListOrdered,
  Kanban,
  MoreVertical,
  Cpu,
  Image as ImageIcon,
} from 'lucide-react';
import {
  workspaceService,
  WorkspaceDto,
  WorkspaceMemberDto,
  WorkspaceUsageDto,
} from '../../services/workspace.service';
import { pipelineService, PipelineTemplateDto } from '../../services/pipeline.service';
import { seriesService, SeriesDto, UpdateSeriesRequest } from '../../services/series.service';
import { SeriesPipelineModal } from '../../components/modals/SeriesPipelineModal';
import { SeriesChaptersModal } from '../../components/modals/SeriesChaptersModal';
import { SeriesPresetsModal } from '../../components/modals/SeriesPresetsModal';

export const ProducerWorkspaceView: React.FC = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const [workspaces, setWorkspaces] = useState<WorkspaceDto[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceDto | null>(() => {
    try {
      const saved = localStorage.getItem('activeWorkspace');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [members, setMembers] = useState<WorkspaceMemberDto[]>([]);
  const [seriesList, setSeriesList] = useState<SeriesDto[]>([]);
  const [activeTab, setActiveTab] = useState<'series' | 'members'>('series');
  const [loading, setLoading] = useState(false);

  // Selected series for UC-03 Modals
  const [selectedPipelineSeries, setSelectedPipelineSeries] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [selectedChapterSeries, setSelectedChapterSeries] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [selectedPresetsSeries, setSelectedPresetsSeries] = useState<{
    id: string;
    title: string;
  } | null>(null);

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
  const [newSeriesFormat, setNewSeriesFormat] = useState('WEBTOON');
  const [creatingSeries, setCreatingSeries] = useState(false);

  // Pipeline Templates (B1 / UC-03)
  const [pipelineTemplates, setPipelineTemplates] = useState<PipelineTemplateDto[]>([]);
  const [newSeriesTemplateId, setNewSeriesTemplateId] = useState('');

  // Edit Series Modal State (F5)
  const [editingSeries, setEditingSeries] = useState<SeriesDto | null>(null);
  const [editSeriesTitle, setEditSeriesTitle] = useState('');
  const [editSeriesSynopsis, setEditSeriesSynopsis] = useState('');
  const [editSeriesStoryArc, setEditSeriesStoryArc] = useState('');
  const [editSeriesGenre, setEditSeriesGenre] = useState('Action / Sci-Fi');
  const [editSeriesFormat, setEditSeriesFormat] = useState('Manga (Standard)');
  const [editSeriesDirection, setEditSeriesDirection] = useState(1);
  const [editSeriesSchedule, setEditSeriesSchedule] = useState('');
  const [updatingSeries, setUpdatingSeries] = useState(false);

  // Delete Series Confirm State (F5)
  const [deleteSeriesModal, setDeleteSeriesModal] = useState<SeriesDto | null>(null);
  const [deletingSeries, setDeletingSeries] = useState(false);

  // Workspace Usage (NFR Resource Governance - Storage & AI Tokens)
  const [workspaceUsage, setWorkspaceUsage] = useState<WorkspaceUsageDto | null>(null);

  // Workspace Audit Modal State (F8)
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilterEntity, setAuditFilterEntity] = useState('');

  // CanCreateStudio check (B3 / F4)
  const currentUser = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);
  const canCreateStudio = currentUser?.canCreateStudio === true;

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
        const cur = workspaceId
          ? wsList.find((w) => w.id === workspaceId) ||
            wsList.find((w) => w.id === activeWorkspace?.id) ||
            wsList[0]
          : wsList.find((w) => w.id === activeWorkspace?.id) || wsList[0];
        setActiveWorkspace(cur);
        const memList = await workspaceService.getMembers(cur.id);
        setMembers(memList);

        // Load Workspace Resource Usage (GET /api/workspaces/{id}/usage)
        try {
          const usage = await workspaceService.getWorkspaceUsage(cur.id);
          setWorkspaceUsage(usage);
        } catch {
          setWorkspaceUsage(null);
        }

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
        setWorkspaceUsage(null);
      }
    } catch (err: any) {
      console.error(err);
      showToast('Lỗi tải dữ liệu', err.message || 'Không thể kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, workspaceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load Active Pipeline Templates from API (GET /api/pipeline-templates) (B1 / UC-03)
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const templates = await pipelineService.getActivePipelineTemplates();
        setPipelineTemplates(templates);
        const def = templates.find((t) => t.isDefault);
        if (def) {
          setNewSeriesTemplateId(def.id);
        } else if (templates.length > 0) {
          setNewSeriesTemplateId(templates[0].id);
        }
      } catch (err: any) {
        console.warn('Lỗi tải danh sách template pipeline:', err);
      }
    };
    fetchTemplates();
  }, []);

  const handleSelectWorkspace = async (ws: WorkspaceDto) => {
    setActiveWorkspace(ws);
    try {
      const memList = await workspaceService.getMembers(ws.id);
      setMembers(memList);
      const sList = await seriesService.getSeriesList(ws.id);
      setSeriesList(sList);
    } catch (err: any) {
      console.error(err);
      showToast('Lỗi tải dữ liệu Workspace', err.message || 'Không thể tải chi tiết Workspace.');
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
        format: newSeriesFormat,
      });

      setSeriesList((prev) => [created, ...prev]);
      setCreateSeriesModalOpen(false);
      setNewSeriesTitle('');
      showToast(
        'Tạo Series thành công',
        `Đã tạo bộ truyện "${created.title}" với cấu hình mặc định (8-stage pipeline).`,
      );
    } catch (err: any) {
      showToast('Lỗi tạo Series', err.message);
    } finally {
      setCreatingSeries(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateStudio) {
      showToast(
        'Từ chối quyền thao tác',
        'Tài khoản chưa được Admin cấp quyền Producer (CanCreateStudio) để tạo Studio Workspace (BR-07).',
      );
      return;
    }
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

  // Edit Series Handlers (F5)
  const handleOpenEditSeries = (s: SeriesDto) => {
    setEditingSeries(s);
    setEditSeriesTitle(s.title);
    setEditSeriesSynopsis(s.synopsis || '');
    setEditSeriesStoryArc(s.storyArc || '');
    setEditSeriesGenre(s.genre || 'Action / Sci-Fi');
    setEditSeriesFormat(s.format || 'Manga (Standard)');
    setEditSeriesDirection(
      typeof s.readingDirection === 'number'
        ? s.readingDirection
        : s.readingDirection === 'RightToLeft'
          ? 1
          : 0,
    );
    setEditSeriesSchedule(s.releaseScheduleJson || '');
  };

  const handleUpdateSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSeries) return;
    setUpdatingSeries(true);
    try {
      const updated = await seriesService.updateSeries(editingSeries.id, {
        title: editSeriesTitle.trim(),
        synopsis: editSeriesSynopsis.trim() === '' ? '' : editSeriesSynopsis.trim(),
        storyArc: editSeriesStoryArc.trim() === '' ? '' : editSeriesStoryArc.trim(),
        genre: editSeriesGenre || undefined,
        format: editSeriesFormat || undefined,
        readingDirection: editSeriesDirection,
        releaseScheduleJson: editSeriesSchedule || undefined,
      });
      setSeriesList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setEditingSeries(null);
      showToast('Cập nhật thành công', `Đã cập nhật thông tin Series "${updated.title}".`);
    } catch (err: any) {
      showToast('Lỗi cập nhật Series', err.message);
    } finally {
      setUpdatingSeries(false);
    }
  };

  // Delete Series Handlers (F5)
  const handleDeleteSeries = async () => {
    if (!deleteSeriesModal) return;
    setDeletingSeries(true);
    try {
      await seriesService.deleteSeries(deleteSeriesModal.id);
      setSeriesList((prev) => prev.filter((s) => s.id !== deleteSeriesModal.id));
      showToast(
        'Đã xóa Series',
        `Bộ truyện "${deleteSeriesModal.title}" đã được xóa khỏi Workspace.`,
      );
      setDeleteSeriesModal(null);
    } catch (err: any) {
      showToast('Lỗi xóa Series', err.message);
    } finally {
      setDeletingSeries(false);
    }
  };

  // Workspace Audit Log Loader (F8)
  const loadWorkspaceAudit = React.useCallback(async () => {
    if (!activeWorkspace) return;
    setAuditLoading(true);
    try {
      const res = await workspaceService.getWorkspaceAuditLogs(activeWorkspace.id, {
        entityName: auditFilterEntity || undefined,
        pageSize: 50,
      });
      setAuditLogs(res?.items || []);
    } catch (err: any) {
      showToast('Lỗi tải Audit Log', err.message);
    } finally {
      setAuditLoading(false);
    }
  }, [activeWorkspace, auditFilterEntity]);

  useEffect(() => {
    if (auditModalOpen) {
      loadWorkspaceAudit();
    }
  }, [auditModalOpen, loadWorkspaceAudit]);

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

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(i >= 3 ? 2 : 1)) + ' ' + sizes[i];
  };

  const formatTokens = (tokens: number) => {
    return Number(tokens).toLocaleString('vi-VN');
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

      {/* Header Banner: Clean & Compact Studio Banner */}
      <div className='bg-white p-5 rounded-2xl border border-[#E7E7E7] shadow-2xs space-y-3'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E7E7E7] pb-3'>
          <div>
            <h1 className='text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2 font-display'>
              <Briefcase className='w-5 h-5 text-orange-500' />
              <span>{activeWorkspace?.name || 'Studio Workspace'}</span>
            </h1>
            <p className='text-xs text-zinc-500 mt-0.5'>
              Bàn làm việc của Giám đốc Sản xuất: Quản lý các bộ truyện (Series), quy trình sản xuất
              và thành viên.
            </p>
          </div>
        </div>

        {/* Workspace Governance & Resource Usage Meters (Storage, AI Tokens & Image Quota) */}
        {activeWorkspace && (
          <div className='grid grid-cols-1 md:grid-cols-3 gap-3 pt-1'>
            {/* Storage Meter */}
            <div className='p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7] space-y-2'>
              <div className='flex items-center justify-between text-xs'>
                <div className='flex items-center gap-1.5 font-semibold text-[#171717]'>
                  <HardDrive className='w-4 h-4 text-[#F97316]' />
                  <span>Dung Lượng Lưu Trữ</span>
                </div>
                <div className='font-mono text-[11px] font-bold text-[#171717]'>
                  {workspaceUsage
                    ? `${formatBytes(workspaceUsage.storage.used)} / ${
                        workspaceUsage.storage.isUnlimited
                          ? 'Không giới hạn'
                          : formatBytes(workspaceUsage.storage.quota)
                      }`
                    : `${formatGb(activeWorkspace.usedStorageBytes)} / ${formatGb(
                        activeWorkspace.storageQuotaBytes,
                      )} GB`}
                </div>
              </div>

              <div className='w-full bg-[#E7E7E7] h-2 rounded-full overflow-hidden'>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    (workspaceUsage?.storage.percentUsed ?? 0) >= 90
                      ? 'bg-red-500'
                      : (workspaceUsage?.storage.percentUsed ?? 0) >= 75
                        ? 'bg-amber-500'
                        : 'bg-[#F97316]'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      workspaceUsage?.storage.percentUsed ??
                        Math.round(
                          (activeWorkspace.usedStorageBytes /
                            (activeWorkspace.storageQuotaBytes || 1)) *
                            100,
                        ),
                    )}%`,
                  }}
                />
              </div>

              <div className='flex items-center justify-between text-[10px] text-[#737373]'>
                <span>
                  {workspaceUsage?.storage.isUnlimited
                    ? 'Không giới hạn dung lượng'
                    : `Đã dùng ${workspaceUsage?.storage.percentUsed ?? 0}%`}
                </span>
                <span className='font-mono text-zinc-500'>Chặn khi chạm 100%</span>
              </div>
            </div>

            {/* AI Token Meter */}
            <div className='p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7] space-y-2'>
              <div className='flex items-center justify-between text-xs'>
                <div className='flex items-center gap-1.5 font-semibold text-[#171717]'>
                  <Cpu className='w-4 h-4 text-[#3B82F6]' />
                  <span>Hạn Mức AI Tokens (Tháng này)</span>
                </div>
                {workspaceUsage?.aiTokens ? (
                  <div className='font-mono text-[11px] font-bold text-[#171717]'>
                    {formatTokens(workspaceUsage.aiTokens.used)} /{' '}
                    {workspaceUsage.aiTokens.isUnlimited
                      ? 'Không giới hạn'
                      : `${formatTokens(workspaceUsage.aiTokens.quota)} Tokens`}
                  </div>
                ) : (
                  <span className='text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-mono'>
                    Chưa cấp quota
                  </span>
                )}
              </div>

              {workspaceUsage?.aiTokens ? (
                <>
                  <div className='w-full bg-[#E7E7E7] h-2 rounded-full overflow-hidden'>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        (workspaceUsage.aiTokens.percentUsed ?? 0) >= 90
                          ? 'bg-red-500'
                          : 'bg-[#3B82F6]'
                      }`}
                      style={{
                        width: `${Math.min(100, workspaceUsage.aiTokens.percentUsed ?? 0)}%`,
                      }}
                    />
                  </div>
                  <div className='flex items-center justify-between text-[10px] text-[#737373]'>
                    <span>
                      {workspaceUsage.aiTokens.isUnlimited
                        ? 'Token không giới hạn'
                        : `Đã dùng ${workspaceUsage.aiTokens.percentUsed ?? 0}%`}
                    </span>
                    <span
                      className={`font-semibold ${
                        workspaceUsage.aiEnabled ? 'text-emerald-600' : 'text-zinc-400'
                      }`}
                    >
                      {workspaceUsage.aiEnabled ? '● AI Đang bật' : '○ AI Đã tắt'}
                    </span>
                  </div>
                </>
              ) : (
                <div className='flex items-center justify-between text-[11px] text-[#737373] pt-1'>
                  <span className='italic'>Liên hệ Admin để cấu hình quota AI Studio</span>
                  <span className='text-[10px] font-mono text-zinc-400'>NFR Governance</span>
                </div>
              )}
            </div>

            {/* AI Image Generation Meter */}
            <div className='p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7] space-y-2'>
              <div className='flex items-center justify-between text-xs'>
                <div className='flex items-center gap-1.5 font-semibold text-[#171717]'>
                  <ImageIcon className='w-4 h-4 text-[#8B5CF6]' />
                  <span>Hạn Mức Sinh Ảnh AI (Tháng này)</span>
                </div>
                {workspaceUsage?.images ? (
                  <div className='font-mono text-[11px] font-bold text-[#171717]'>
                    {workspaceUsage.images.used.toLocaleString()} /{' '}
                    {workspaceUsage.images.isUnlimited
                      ? 'Không giới hạn'
                      : `${workspaceUsage.images.quota.toLocaleString()} ảnh`}
                  </div>
                ) : (
                  <span className='text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-mono'>
                    Chưa cấp quota
                  </span>
                )}
              </div>

              {workspaceUsage?.images ? (
                <>
                  <div className='w-full bg-[#E7E7E7] h-2 rounded-full overflow-hidden'>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        (workspaceUsage.images.percentUsed ?? 0) >= 90
                          ? 'bg-red-500'
                          : (workspaceUsage.images.percentUsed ?? 0) >= 75
                            ? 'bg-amber-500'
                            : 'bg-[#8B5CF6]'
                      }`}
                      style={{
                        width: `${Math.min(100, workspaceUsage.images.percentUsed ?? 0)}%`,
                      }}
                    />
                  </div>
                  <div className='flex items-center justify-between text-[10px] text-[#737373]'>
                    <span>
                      {workspaceUsage.images.isUnlimited
                        ? 'Ảnh không giới hạn'
                        : `Đã dùng ${workspaceUsage.images.percentUsed ?? 0}%`}
                    </span>
                    <span
                      className={`font-semibold ${
                        workspaceUsage.aiEnabled ? 'text-purple-600' : 'text-zinc-400'
                      }`}
                    >
                      {workspaceUsage.aiEnabled ? '● Đang kích hoạt' : '○ AI Đã tắt'}
                    </span>
                  </div>
                </>
              ) : (
                <div className='flex items-center justify-between text-[11px] text-[#737373] pt-1'>
                  <span className='italic'>Liên hệ Admin để cấp quota sinh ảnh</span>
                  <span className='text-[10px] font-mono text-zinc-400'>NFR Governance</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Workspace Content Area with Tabbed Navigation */}
      <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-xs p-6 space-y-5'>
        {/* Tab Navigation & CTA */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7E7E7] pb-4'>
          <div className='flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E7E7E7]'>
            <button
              onClick={() => setActiveTab('series')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'series'
                  ? 'bg-white text-[#171717] shadow-2xs border border-[#E7E7E7]'
                  : 'text-[#737373] hover:text-[#171717]'
              }`}
            >
              <BookOpen className='w-3.5 h-3.5 text-[#F97316]' />
              <span>Bộ Truyện (Series)</span>
              <span className='px-1.5 py-0.2 rounded-full bg-orange-50 text-[#F97316] text-[10px] font-mono'>
                {seriesList.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'members'
                  ? 'bg-white text-[#171717] shadow-2xs border border-[#E7E7E7]'
                  : 'text-[#737373] hover:text-[#171717]'
              }`}
            >
              <Users className='w-3.5 h-3.5 text-[#3B82F6]' />
              <span>Thành Viên Studio</span>
              <span className='px-1.5 py-0.2 rounded-full bg-blue-50 text-[#3B82F6] text-[10px] font-mono'>
                {members.length}
              </span>
            </button>
          </div>

          {activeTab === 'series' ? (
            <button
              onClick={() => setCreateSeriesModalOpen(true)}
              className='inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold shadow-xs cursor-pointer'
            >
              <Plus className='w-4 h-4' />
              <span>Tạo Series Mới</span>
            </button>
          ) : (
            <button
              onClick={() => setInviteModalOpen(true)}
              className='inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#171717] hover:bg-black text-white text-xs font-semibold shadow-xs cursor-pointer'
            >
              <UserPlus className='w-4 h-4 text-[#F97316]' />
              <span>Mời Thành Viên Mới</span>
            </button>
          )}
        </div>

        {/* TAB 1: Series Projects View */}
        {activeTab === 'series' && (
          <div>
            {seriesList.length === 0 ? (
              <div className='py-12 px-4 text-center bg-[#FAF8F5] rounded-xl border border-dashed border-[#E7E7E7] max-w-lg mx-auto my-4 space-y-3'>
                <div className='w-12 h-12 rounded-full bg-orange-50 text-[#F97316] flex items-center justify-center mx-auto'>
                  <BookOpen className='w-6 h-6' />
                </div>
                <h3 className='text-sm font-bold text-[#171717]'>
                  Chưa có Series nào trong Studio này
                </h3>
                <p className='text-xs text-[#737373] leading-relaxed'>
                  Khởi tạo Series mới để thiết lập thể loại, định dạng xuất bản, quy trình 8 công
                  đoạn và kho tư liệu Series Bible.
                </p>
                <button
                  onClick={() => setCreateSeriesModalOpen(true)}
                  className='inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-xl shadow-xs transition-all cursor-pointer'
                >
                  <Plus className='w-3.5 h-3.5' />
                  <span>Tạo Series Mới Ngay</span>
                </button>
              </div>
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {seriesList.map((s) => (
                  <div
                    key={s.id}
                    onClick={() =>
                      navigate(`/workspaces/${activeWorkspace.id}/series/${s.id}/dashboard`)
                    }
                    className='p-5 bg-white hover:bg-zinc-50 rounded-xl border border-zinc-200 hover:border-orange-500/50 transition-all shadow-sm hover:shadow-md cursor-pointer group relative flex flex-col h-full'
                  >
                    <div className='flex items-start justify-between gap-2'>
                      <div>
                        <span className='px-2 py-0.5 rounded bg-orange-50 text-orange-600 font-mono text-[10px] font-bold border border-orange-200 uppercase tracking-wide'>
                          {s.genre || s.format || 'WEBTOON'}
                        </span>
                        <h3 className='text-lg font-bold text-zinc-900 mt-2 group-hover:text-orange-600 transition-colors leading-tight font-display'>
                          {s.title}
                        </h3>
                      </div>
                      <div className='flex items-center gap-1 shrink-0 relative group/menu'>
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className='p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors'
                          title='Tùy chọn'
                        >
                          <MoreVertical className='w-4 h-4' />
                        </button>
                        <div className='absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-xl border border-zinc-200 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10 py-1 overflow-hidden'>
                          <button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditSeries(s);
                            }}
                            className='w-full text-left px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 flex items-center gap-2 transition-colors'
                          >
                            <Edit2 className='w-3 h-3' /> Chỉnh sửa
                          </button>
                          <button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteSeriesModal(s);
                            }}
                            className='w-full text-left px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors'
                          >
                            <Trash2 className='w-3 h-3' /> Xóa
                          </button>
                        </div>
                      </div>
                    </div>

                    {s.synopsis && (
                      <p className='text-xs text-zinc-500 line-clamp-2 leading-relaxed mt-2.5'>
                        {s.synopsis}
                      </p>
                    )}

                    {s.storyArc && (
                      <div className='mt-2 px-2.5 py-1.5 bg-amber-50/70 border border-amber-200/60 rounded-lg'>
                        <div className='flex items-center gap-1 text-[10px] font-semibold text-amber-700 font-mono uppercase tracking-wider mb-0.5'>
                          <span>Story Arc</span>
                        </div>
                        <p className='text-[11px] text-amber-900 line-clamp-2 leading-relaxed'>
                          {s.storyArc}
                        </p>
                      </div>
                    )}

                    <div className='mt-auto pt-4 flex flex-col gap-2.5'>
                      <div className='flex items-center justify-between text-[11px] font-mono text-zinc-500'>
                        <div className='flex items-center gap-1.5'>
                          <Compass className='w-3 h-3 text-zinc-400' />
                          <span className='font-semibold text-zinc-700'>
                            {s.readingDirection === 1 || s.readingDirection === 'RightToLeft'
                              ? 'RTL'
                              : 'Vertical'}
                          </span>
                        </div>
                        <div className='flex items-center gap-1.5'>
                          <Calendar className='w-3 h-3 text-zinc-400' />
                          <span className='text-zinc-700 font-semibold'>
                            {s.releaseScheduleJson || 'Hàng tuần'}
                          </span>
                        </div>
                      </div>

                      <div className='flex items-center justify-between text-[10px] font-mono'>
                        <span className='text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold flex items-center gap-1'>
                          <Sparkles className='w-3 h-3' /> Bible Active
                        </span>
                        <span className='text-zinc-400 font-medium'>{s.chaptersCount} Chương</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Studio Members View */}
        {activeTab === 'members' && (
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-xs'>
              <thead className='bg-[#FAF8F5] text-[#737373] font-semibold text-[10px] uppercase tracking-wider'>
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
        )}
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
              <div className='p-2.5 bg-[#FAF8F5] rounded-lg border border-[#E7E7E7] text-[11px] text-[#737373] space-y-1'>
                <p>
                  <strong>Lưu ý:</strong> Nếu email chưa có tài khoản, hệ thống sẽ gửi email kèm mã
                  OTP 6 số (hạn 15 phút) để thành viên kích hoạt tài khoản và tự tạo mật khẩu.
                </p>
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

              <div className='grid grid-cols-1 gap-3'>
                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>
                    Định Dạng (Format)
                  </label>
                  <select
                    value={newSeriesFormat}
                    onChange={(e) => setNewSeriesFormat(e.target.value)}
                    className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                  >
                    <option value='WEBTOON'>Webtoon (Cuộn dọc)</option>
                    <option value='MANGA'>Manga (Phải sang Trái)</option>
                    <option value='COMIC'>Comic (Trái sang Phải)</option>
                  </select>
                </div>
              </div>

              <div className='p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7] space-y-1 text-[11px] text-[#737373]'>
                <div className='font-bold text-[#171717] flex items-center gap-1.5'>
                  <Sparkles className='w-3.5 h-3.5 text-[#F97316]' />
                  <span>Cấu hình tự động:</span>
                </div>
                <div>• Áp dụng chuẩn 8 công đoạn (Script → Approved) có Review Gate.</div>
                <div>• Hướng đọc tự động thiết lập theo Format.</div>
                <div>• Khởi tạo sẵn Series Bible rỗng.</div>
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

      {/* UC-03: Series Pipeline Configuration Modal */}
      {selectedPipelineSeries && (
        <SeriesPipelineModal
          isOpen={!!selectedPipelineSeries}
          seriesId={selectedPipelineSeries.id}
          seriesTitle={selectedPipelineSeries.title}
          onClose={() => setSelectedPipelineSeries(null)}
          onShowToast={showToast}
        />
      )}

      {/* UC-03: Series Chapters & Release Calendar Modal */}
      {selectedChapterSeries && (
        <SeriesChaptersModal
          isOpen={!!selectedChapterSeries}
          seriesId={selectedChapterSeries.id}
          seriesTitle={selectedChapterSeries.title}
          onClose={() => setSelectedChapterSeries(null)}
          onShowToast={showToast}
          onChapterCountChange={(delta) => {
            if (selectedChapterSeries) {
              setSeriesList((prev) =>
                prev.map((s) =>
                  s.id === selectedChapterSeries.id
                    ? { ...s, chaptersCount: Math.max(0, s.chaptersCount + delta) }
                    : s,
                ),
              );
            }
          }}
        />
      )}

      {/* NFR-08: Series Typography Presets & Consistency Rules Modal */}
      {selectedPresetsSeries && (
        <SeriesPresetsModal
          isOpen={!!selectedPresetsSeries}
          seriesId={selectedPresetsSeries.id}
          seriesTitle={selectedPresetsSeries.title}
          onClose={() => setSelectedPresetsSeries(null)}
          onShowToast={showToast}
        />
      )}

      {/* F5: Edit Series Modal */}
      {editingSeries && (
        <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4'>
          <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto'>
            <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
              <div className='flex items-center gap-2'>
                <Edit2 className='w-4 h-4 text-[#F97316]' />
                <h3 className='text-sm font-bold text-[#171717]'>
                  Chỉnh Sửa Thông Tin Series (UC-03 / F5)
                </h3>
              </div>
              <button
                onClick={() => setEditingSeries(null)}
                className='text-[#888888] hover:text-[#171717]'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            <form onSubmit={handleUpdateSeries} className='space-y-3.5 text-xs'>
              <div>
                <label className='block font-semibold text-[#171717] mb-1'>
                  Tên Dự Án (Title) *
                </label>
                <input
                  type='text'
                  value={editSeriesTitle}
                  onChange={(e) => setEditSeriesTitle(e.target.value)}
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
                  value={editSeriesSynopsis}
                  onChange={(e) => setEditSeriesSynopsis(e.target.value)}
                  placeholder='Mô tả ngắn gọn nội dung cốt truyện...'
                  className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                />
              </div>

              <div>
                <div className='flex items-center justify-between mb-1'>
                  <label className='block font-semibold text-[#171717]'>
                    Cung Truyện Tổng Thể (Story Arc)
                  </label>
                  <span className='text-[10px] text-[#888888] font-mono'>Đầu vào AI Writer</span>
                </div>
                <textarea
                  rows={3}
                  value={editSeriesStoryArc}
                  onChange={(e) => setEditSeriesStoryArc(e.target.value)}
                  placeholder='Tuyến truyện chính, các mốc xung đột và bước ngoặt xuyên suốt Series...'
                  className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                />
                <p className='text-[10px] text-[#737373] mt-1'>
                  Story arc sẽ được chuyển vào snapshot và nạp vào prompt cho AI Writer Agent khi
                  sinh kịch bản.
                </p>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>
                    Thể Loại (Genre)
                  </label>
                  <select
                    value={editSeriesGenre}
                    onChange={(e) => setEditSeriesGenre(e.target.value)}
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
                    value={editSeriesFormat}
                    onChange={(e) => setEditSeriesFormat(e.target.value)}
                    className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                  >
                    <option value='Manga (B&W Standard)'>Manga (B&W Standard)</option>
                    <option value='Webtoon (Vertical Scroll)'>Webtoon (Vertical Scroll)</option>
                    <option value='Comic (Color Format)'>Comic (Color Format)</option>
                  </select>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>Hướng Đọc</label>
                  <select
                    value={editSeriesDirection}
                    onChange={(e) => setEditSeriesDirection(parseInt(e.target.value, 10))}
                    className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                  >
                    <option value={1}>Phải sang Trái (RTL, Manga)</option>
                    <option value={0}>Trái sang Phải (LTR)</option>
                    <option value={2}>Cuộn dọc từ trên xuống (Webtoon)</option>
                  </select>
                </div>

                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>Lịch Phát Hành</label>
                  <input
                    type='text'
                    value={editSeriesSchedule}
                    onChange={(e) => setEditSeriesSchedule(e.target.value)}
                    className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                  />
                </div>
              </div>

              <div className='flex justify-end gap-2 pt-2 border-t border-[#E7E7E7]'>
                <button
                  type='button'
                  onClick={() => setEditingSeries(null)}
                  className='px-3 py-1.5 rounded-lg text-[#555555] hover:bg-[#F3F1EB]'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  disabled={updatingSeries || !editSeriesTitle.trim()}
                  className='px-4 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold disabled:opacity-50'
                >
                  {updatingSeries ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* F5: Delete Series Confirm Modal */}
      {deleteSeriesModal && (
        <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4'>
          <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-2xl max-w-sm w-full p-6 space-y-4'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0'>
                <Trash2 className='w-5 h-5' />
              </div>
              <div>
                <h3 className='text-sm font-bold text-[#171717]'>Xác nhận xóa Series</h3>
                <p className='text-xs text-[#737373]'>
                  Thao tác này sẽ xóa Series và toàn bộ dữ liệu liên quan.
                </p>
              </div>
            </div>

            <p className='text-xs text-[#555555] p-3 bg-red-50 rounded-xl border border-red-200'>
              Bạn có chắc chắn muốn xóa bộ truyện{' '}
              <strong>&quot;{deleteSeriesModal.title}&quot;</strong>?
            </p>

            <div className='flex justify-end gap-2 pt-2'>
              <button
                type='button'
                onClick={() => setDeleteSeriesModal(null)}
                className='px-3 py-1.5 rounded-lg text-[#555555] hover:bg-[#F3F1EB] text-xs'
              >
                Hủy
              </button>
              <button
                type='button'
                onClick={handleDeleteSeries}
                disabled={deletingSeries}
                className='px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs disabled:opacity-50'
              >
                {deletingSeries ? 'Đang xóa...' : 'Xóa Vĩnh Viễn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* F8: Workspace Audit Log Modal */}
      {auditModalOpen && (
        <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4'>
          <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col p-6 space-y-4'>
            <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
              <div>
                <div className='flex items-center gap-2 mb-0.5'>
                  <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-[10px] font-bold'>
                    PRODUCER // AUDIT TRAIL
                  </span>
                  <span className='text-xs text-[#888888] font-mono'>
                    BR-18 Provenance Guarantee
                  </span>
                </div>
                <h3 className='text-sm font-bold text-[#171717]'>
                  Lịch Sử Thay Đổi Studio: {activeWorkspace?.name}
                </h3>
              </div>
              <button
                onClick={() => setAuditModalOpen(false)}
                className='text-[#888888] hover:text-[#171717]'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            {/* Filter */}
            <div className='flex items-center gap-3 text-xs'>
              <input
                type='text'
                placeholder='Lọc theo Entity (Series, BibleEntry, PipelineStage...)'
                value={auditFilterEntity}
                onChange={(e) => setAuditFilterEntity(e.target.value)}
                className='px-3 py-1.5 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs w-64 focus:outline-none focus:border-[#F97316]'
              />
              <button
                onClick={loadWorkspaceAudit}
                className='px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E7E7E7] hover:bg-[#F3F1EB] font-semibold flex items-center gap-1.5'
              >
                <RefreshCw className={`w-3 h-3 ${auditLoading ? 'animate-spin' : ''}`} />
                <span>Tìm kiếm</span>
              </button>
            </div>

            {/* Audit Logs Table */}
            <div className='overflow-y-auto flex-1 border border-[#E7E7E7] rounded-xl text-xs'>
              <table className='w-full text-left'>
                <thead className='bg-[#FAF8F5] border-b border-[#E7E7E7] font-mono text-[10px] text-[#737373] sticky top-0'>
                  <tr>
                    <th className='py-2.5 px-3'>Hành Động</th>
                    <th className='py-2.5 px-3'>Thực Thể</th>
                    <th className='py-2.5 px-3'>Người Thực Hiện</th>
                    <th className='py-2.5 px-3'>Thời Gian (UTC)</th>
                    <th className='py-2.5 px-3'>Chi Tiết Thay Đổi</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-[#E7E7E7]'>
                  {auditLoading ? (
                    <tr>
                      <td colSpan={5} className='py-8 text-center text-[#888888]'>
                        <RefreshCw className='w-5 h-5 animate-spin mx-auto mb-1 text-[#F97316]' />
                        <span>Đang tải lịch sử audit...</span>
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className='py-8 text-center text-[#888888]'>
                        Chưa có bản ghi audit nào trong Studio này.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log: any) => (
                      <tr key={log.id} className='hover:bg-[#FAF8F5]'>
                        <td className='py-2.5 px-3 font-mono font-semibold text-[#171717]'>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              log.action?.includes('CREATE')
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : log.action?.includes('DELETE')
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className='py-2.5 px-3 font-mono text-[11px] text-[#555555]'>
                          {log.entityName} {log.entityId ? `#${log.entityId.substring(0, 6)}` : ''}
                        </td>
                        <td className='py-2.5 px-3 text-[#555555]'>
                          {log.userEmail || log.userId || 'Hệ thống'}
                        </td>
                        <td className='py-2.5 px-3 font-mono text-[11px] text-[#888888] whitespace-nowrap'>
                          {new Date(log.createdAtUtc).toLocaleString('vi-VN')}
                        </td>
                        <td className='py-2.5 px-3 font-mono text-[10px] text-[#737373] max-w-xs truncate'>
                          {log.changesJson || log.details || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
