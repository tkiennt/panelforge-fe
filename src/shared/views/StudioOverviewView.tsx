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
  Key,
  Mail,
  Search,
  Edit3,
  Monitor,
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import {
  workspaceService,
  WorkspaceDto,
  WorkspaceMemberDto,
  WorkspaceUsageDto,
  WorkspaceSessionDto,
} from '@/services/workspace.service';
import { pipelineService, PipelineTemplateDto } from '@/services/pipeline.service';
import { seriesService, SeriesDto, UpdateSeriesRequest } from '@/services/series.service';
import { SeriesPipelineModal } from '@/roles/producer/modals/SeriesPipelineModal';
import { SeriesChaptersModal } from '@/roles/producer/modals/SeriesChaptersModal';
import { SeriesPresetsModal } from '@/roles/producer/modals/SeriesPresetsModal';
import { InviteMemberModal } from '@/roles/producer/modals/InviteMemberModal';
import { getRoleDefaultPath } from '@/roles/roles';

const ROLE_BADGE_STYLE: Record<string, string> = {
  PRODUCER: 'bg-purple-50 text-purple-700 border-purple-200',
  LEAD: 'bg-purple-50 text-purple-700 border-purple-200',
  EDITOR: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  WRITER: 'bg-blue-50 text-blue-700 border-blue-200',
  ARTIST: 'bg-amber-50 text-amber-700 border-amber-200',
  LETTERER: 'bg-pink-50 text-pink-700 border-pink-200',
  PUBLISHER: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  ADMINISTRATOR: 'bg-red-50 text-red-700 border-red-200',
};

export const StudioOverviewView: React.FC = () => {
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

  const userRole = localStorage.getItem('userRole');
  const wsRole = localStorage.getItem('workspaceRole') || activeWorkspace?.currentUserRole;
  const effectiveRoleUpper = String(wsRole || userRole || '').toUpperCase();
  const isProducerOrAdmin =
    userRole === 'ADMINISTRATOR' || wsRole === 'PRODUCER' || !!activeWorkspace?.isOwner;

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

  // Workspace Active Sessions Modal State
  const [sessionsModalOpen, setSessionsModalOpen] = useState(false);
  const [activeSessions, setActiveSessions] = useState<WorkspaceSessionDto[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [sessionSearchQuery, setSessionSearchQuery] = useState('');

  // Members UI States
  const [memberRoleFilter, setMemberRoleFilter] = useState<
    'ALL' | 'LEAD' | 'ARTIST' | 'WRITER' | 'EDITOR'
  >('ALL');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [editingMember, setEditingMember] = useState<any>(null);
  const [editRole, setEditRole] = useState('');
  const [editTask, setEditTask] = useState('');
  const [memberToDelete, setMemberToDelete] = useState<{ id: string; email: string } | null>(null);

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

  const studioMembers = React.useMemo(() => {
    return members.map((m) => {
      const roleStr =
        typeof m.role === 'number'
          ? m.role === 0
            ? 'PRODUCER'
            : m.role === 1
              ? 'WRITER'
              : m.role === 2
                ? 'ARTIST'
                : m.role === 3
                  ? 'LETTERER'
                  : m.role === 4
                    ? 'EDITOR'
                    : m.role === 5
                      ? 'PUBLISHER'
                      : 'ADMINISTRATOR'
          : String(m.role).toUpperCase();

      const initials = m.fullName
        ? m.fullName
            .split(' ')
            .map((p) => p[0])
            .join('')
            .substring(0, 2)
            .toUpperCase()
        : 'ME';

      return {
        id: m.userId,
        name: m.fullName || m.email.split('@')[0],
        email: m.email,
        role: roleStr,
        avatarBg: '#171717',
        initials,
        status: m.isEmailConfirmed === false ? 'Chờ kích hoạt' : 'Đang hoạt động',
        isEmailConfirmed: m.isEmailConfirmed,
        invitationEmailSent: m.invitationEmailSent,
        isOwner: m.isOwner,
        isYou: currentUser?.id === m.userId || currentUser?.email === m.email,
      };
    });
  }, [members, currentUser]);

  const filteredMembers = React.useMemo(() => {
    return studioMembers.filter((m) => {
      const q = memberSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.role && m.role.toLowerCase().includes(q));

      const roleStr = (m.role || '').toLowerCase();
      const matchesTab =
        memberRoleFilter === 'ALL' ||
        (memberRoleFilter === 'LEAD' &&
          (roleStr.includes('lead') || roleStr.includes('producer'))) ||
        (memberRoleFilter === 'ARTIST' &&
          (roleStr.includes('artist') || roleStr.includes('line'))) ||
        (memberRoleFilter === 'WRITER' &&
          (roleStr.includes('writer') || roleStr.includes('script'))) ||
        (memberRoleFilter === 'EDITOR' && roleStr.includes('editor'));

      return matchesSearch && matchesTab;
    });
  }, [studioMembers, memberSearchQuery, memberRoleFilter]);

  const tabCounts = React.useMemo(() => {
    return {
      ALL: studioMembers.length,
      LEAD: studioMembers.filter(
        (m) =>
          (m.role || '').toLowerCase().includes('lead') ||
          (m.role || '').toLowerCase().includes('producer'),
      ).length,
      ARTIST: studioMembers.filter((m) => (m.role || '').toLowerCase().includes('artist')).length,
      WRITER: studioMembers.filter((m) => (m.role || '').toLowerCase().includes('writer')).length,
      EDITOR: studioMembers.filter((m) => (m.role || '').toLowerCase().includes('editor')).length,
    };
  }, [studioMembers]);

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

  const loadActiveSessions = React.useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setSessionsLoading(true);
    try {
      const data = await workspaceService.getActiveSessions(activeWorkspace.id);
      setActiveSessions(data);
    } catch (err: any) {
      showToast('Lỗi tải phiên làm việc', err.message || 'Không thể lấy danh sách thiết bị.');
    } finally {
      setSessionsLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    if (sessionsModalOpen) {
      loadActiveSessions();
    }
  }, [sessionsModalOpen, loadActiveSessions]);

  const handleRevokeSession = async (sessionId: string, userName: string) => {
    if (!activeWorkspace?.id) return;
    if (
      !confirm(
        `Bạn có chắc muốn ngắt kết nối thiết bị này của ${userName}? Phiên đăng nhập sẽ bị thu hồi ngay lập tức.`,
      )
    ) {
      return;
    }
    setRevokingSessionId(sessionId);
    try {
      await workspaceService.revokeSession(activeWorkspace.id, sessionId);
      showToast('Đã thu hồi phiên', `Đã ngắt kết nối thiết bị của ${userName}.`);
      await loadActiveSessions();
      try {
        const usage = await workspaceService.getWorkspaceUsage(activeWorkspace.id);
        setWorkspaceUsage(usage);
      } catch {
        // ignore
      }
    } catch (err: any) {
      showToast('Lỗi', err.message || 'Không thể thu hồi phiên làm việc.');
    } finally {
      setRevokingSessionId(null);
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

  const handleResendInvitation = async (userId: string) => {
    if (!activeWorkspace) return;
    try {
      await workspaceService.resendInvitation(activeWorkspace.id, userId);
      showToast('Gửi lại thành công', 'Đã gửi lại lời mời qua email.');
    } catch (err: any) {
      showToast('Lỗi gửi lại lời mời', err.message);
    }
  };

  const handleOpenEditAccess = (member: any) => {
    setEditingMember(member);
    setEditRole(member.role);
    setEditTask(member.activeTask || 'Chapter 5 Production');
  };

  const handleSaveAccess = async () => {
    if (!editingMember || !activeWorkspace) return;
    try {
      await workspaceService.updateMemberRole(activeWorkspace.id, editingMember.id, {
        newRole: editRole,
      });
      const memList = await workspaceService.getMembers(activeWorkspace.id);
      setMembers(memList);
      showToast('Permissions Saved', `Updated role & access policies for ${editingMember.name}.`);
      setEditingMember(null);
    } catch (err: any) {
      showToast('Lỗi cập nhật vai trò', err.message || 'Không thể cập nhật vai trò thành viên.');
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
            <div className='text-xs text-[#A3A3A3]'>{toast.desc}</div>
          </div>
          <button onClick={() => setToast(null)} className='ml-2 text-[#737373] hover:text-white'>
            <X className='w-3.5 h-3.5' />
          </button>
        </div>
      )}

      {/* Header Banner: Clean & Compact Studio Banner */}
      <div className='bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-4'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-100 pb-4'>
          <div>
            <h1 className='text-2xl font-serif font-bold text-stone-900 tracking-tight flex items-center gap-2.5'>
              <Briefcase className='w-5 h-5 text-orange-500 shrink-0' />
              <span>{activeWorkspace?.name || 'Studio Workspace'}</span>
            </h1>
            <p className='text-xs md:text-sm text-stone-500 mt-1 leading-relaxed'>
              {(() => {
                const effective = String(wsRole || userRole || '').toUpperCase();
                switch (effective) {
                  case 'EDITOR':
                    return 'Bàn làm việc của Biên tập viên: Kiểm soát chất lượng, duyệt chương và rà soát tính nhất quán của các bộ truyện (Series).';
                  case 'WRITER':
                    return 'Không gian sáng tạo Kịch bản: Quản lý các hồi truyện, kịch bản phân cảnh và kho tư liệu Series Bible.';
                  case 'ARTIST':
                    return 'Bàn vẽ & Phân cảnh: Quản lý khung tranh, phân tầng đồ họa và phác thảo các trang truyện.';
                  case 'LETTERER':
                    return 'Xưởng Thoại & Chèn chữ: Thiết kế bóng thoại, hiệu ứng âm thanh (SFX) và chèn chữ theo kịch bản.';
                  case 'PUBLISHER':
                    return 'Cổng Xuất bản Studio: Thẩm định ấn bản phát hành, lên lịch phát hành và kiểm soát phân phối.';
                  case 'ADMINISTRATOR':
                    return 'Khu vực Quản trị Hệ thống: Quản lý tài nguyên, định mức quota và giám sát toàn bộ Studio.';
                  case 'PRODUCER':
                  default:
                    return 'Bàn làm việc của Giám đốc Sản xuất: Quản lý các bộ truyện (Series), quy trình sản xuất và thành viên.';
                }
              })()}
            </p>
          </div>
        </div>

        {/* Workspace Governance & Resource Usage Meters (Storage, AI Tokens, Image Quota & Concurrent Sessions) - Shown for Producer/Admin */}
        {activeWorkspace && isProducerOrAdmin && (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1'>
            {/* 1. Storage Meter */}
            <div className='flex flex-col justify-between h-full p-5 bg-stone-50/70 hover:bg-stone-50 rounded-xl border border-stone-200/80 transition-all space-y-3'>
              <div className='flex items-center justify-between gap-2'>
                <div className='flex items-center gap-2 text-sm font-semibold text-stone-800'>
                  <HardDrive className='w-4 h-4 text-orange-500 shrink-0' />
                  <span>Dung Lượng Lưu Trữ</span>
                </div>
                <div className='font-mono text-sm font-bold text-stone-900 shrink-0'>
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

              {(() => {
                const used = workspaceUsage
                  ? workspaceUsage.storage.used
                  : activeWorkspace.usedStorageBytes || 0;
                const quota = workspaceUsage
                  ? workspaceUsage.storage.quota
                  : activeWorkspace.storageQuotaBytes || 0;
                const isUnlimited = workspaceUsage?.storage.isUnlimited ?? false;
                const percent = isUnlimited
                  ? 0
                  : quota > 0 && used > 0
                    ? Math.min(100, Math.max(0, Math.round((used / quota) * 100)))
                    : 0;

                return (
                  <div className='space-y-2'>
                    <div className='w-full bg-stone-200/80 h-2 rounded-full overflow-hidden'>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          percent >= 90
                            ? 'bg-red-500'
                            : percent >= 75
                              ? 'bg-amber-500'
                              : 'bg-orange-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className='flex items-center justify-between text-xs leading-relaxed text-stone-600'>
                      <span>
                        {isUnlimited ? 'Không giới hạn dung lượng' : `Đã dùng ${percent}%`}
                      </span>
                      <span className='font-mono text-stone-500 text-xs'>Chặn khi chạm 100%</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 2. AI Token Meter */}
            <div className='flex flex-col justify-between h-full p-5 bg-stone-50/70 hover:bg-stone-50 rounded-xl border border-stone-200/80 transition-all space-y-3'>
              <div className='flex items-center justify-between gap-2'>
                <div className='flex items-center gap-2 text-sm font-semibold text-stone-800'>
                  <Cpu className='w-4 h-4 text-blue-500 shrink-0' />
                  <span>Hạn Mức AI Tokens</span>
                </div>
                {workspaceUsage?.aiTokens ? (
                  <div className='font-mono text-sm font-bold text-stone-900 shrink-0'>
                    {formatTokens(workspaceUsage.aiTokens.used)} /{' '}
                    {workspaceUsage.aiTokens.isUnlimited
                      ? 'Không giới hạn'
                      : `${formatTokens(workspaceUsage.aiTokens.quota)}`}
                  </div>
                ) : (
                  <span className='whitespace-nowrap px-2.5 py-0.5 text-xs font-medium rounded-full text-amber-700 bg-amber-50 border border-amber-200 font-mono shrink-0'>
                    Chưa cấp quota
                  </span>
                )}
              </div>

              {workspaceUsage?.aiTokens ? (
                <div className='space-y-2'>
                  <div className='w-full bg-stone-200/80 h-2 rounded-full overflow-hidden'>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        (workspaceUsage.aiTokens.percentUsed ?? 0) >= 90
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${Math.min(100, workspaceUsage.aiTokens.percentUsed ?? 0)}%`,
                      }}
                    />
                  </div>
                  <div className='flex items-center justify-between text-xs leading-relaxed text-stone-600'>
                    <span>
                      {workspaceUsage.aiTokens.isUnlimited
                        ? 'Token không giới hạn'
                        : `Đã dùng ${workspaceUsage.aiTokens.percentUsed ?? 0}%`}
                    </span>
                    <span
                      className={`font-semibold text-xs ${
                        workspaceUsage.aiEnabled ? 'text-emerald-600' : 'text-stone-400'
                      }`}
                    >
                      {workspaceUsage.aiEnabled ? '● AI Đang bật' : '○ AI Đã tắt'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className='pt-1 text-xs leading-relaxed text-stone-600 italic'>
                  Liên hệ Admin để cấu hình quota AI Studio
                </div>
              )}
            </div>

            {/* 3. AI Image Generation Meter */}
            <div className='flex flex-col justify-between h-full p-5 bg-stone-50/70 hover:bg-stone-50 rounded-xl border border-stone-200/80 transition-all space-y-3'>
              <div className='flex items-center justify-between gap-2'>
                <div className='flex items-center gap-2 text-sm font-semibold text-stone-800'>
                  <ImageIcon className='w-4 h-4 text-purple-500 shrink-0' />
                  <span>Hạn Mức Sinh Ảnh AI</span>
                </div>
                {workspaceUsage?.images ? (
                  <div className='font-mono text-sm font-bold text-stone-900 shrink-0'>
                    {workspaceUsage.images.used.toLocaleString()} /{' '}
                    {workspaceUsage.images.isUnlimited
                      ? 'Không giới hạn'
                      : `${workspaceUsage.images.quota.toLocaleString()} ảnh`}
                  </div>
                ) : (
                  <span className='whitespace-nowrap px-2.5 py-0.5 text-xs font-medium rounded-full text-purple-700 bg-purple-50 border border-purple-200 font-mono shrink-0'>
                    Chưa cấp quota
                  </span>
                )}
              </div>

              {workspaceUsage?.images ? (
                <div className='space-y-2'>
                  <div className='w-full bg-stone-200/80 h-2 rounded-full overflow-hidden'>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        (workspaceUsage.images.percentUsed ?? 0) >= 90
                          ? 'bg-red-500'
                          : (workspaceUsage.images.percentUsed ?? 0) >= 75
                            ? 'bg-amber-500'
                            : 'bg-purple-500'
                      }`}
                      style={{
                        width: `${Math.min(100, workspaceUsage.images.percentUsed ?? 0)}%`,
                      }}
                    />
                  </div>
                  <div className='flex items-center justify-between text-xs leading-relaxed text-stone-600'>
                    <span>
                      {workspaceUsage.images.isUnlimited
                        ? 'Ảnh không giới hạn'
                        : `Đã dùng ${workspaceUsage.images.percentUsed ?? 0}%`}
                    </span>
                    <span
                      className={`font-semibold text-xs ${
                        workspaceUsage.aiEnabled ? 'text-purple-600' : 'text-stone-400'
                      }`}
                    >
                      {workspaceUsage.aiEnabled ? '● Đang kích hoạt' : '○ AI Đã tắt'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className='space-y-1 pt-1'>
                  <p className='text-xs leading-relaxed text-stone-600 italic'>
                    Pipeline sinh ảnh AI chưa bật (đã dùng: 0).
                  </p>
                </div>
              )}
            </div>

            {/* 4. Active Devices & Concurrent Sessions Meter */}
            <div className='flex flex-col justify-between h-full p-5 bg-stone-50/70 hover:bg-stone-50 rounded-xl border border-stone-200/80 transition-all space-y-3'>
              <div className='flex items-center justify-between gap-2'>
                <div className='flex items-center gap-2 text-sm font-semibold text-stone-800'>
                  <Monitor className='w-4 h-4 text-emerald-500 shrink-0' />
                  <span>Phiên Đăng Nhập Đồng Thời</span>
                </div>
                <div className='font-mono text-sm font-bold text-stone-900 shrink-0'>
                  {workspaceUsage?.activeSessions
                    ? workspaceUsage.activeSessions.isUnlimited
                      ? `${workspaceUsage.activeSessions.used} thiết bị`
                      : `${workspaceUsage.activeSessions.used} / ${workspaceUsage.activeSessions.quota}`
                    : '0 thiết bị'}
                </div>
              </div>

              <div className='space-y-2'>
                <div className='w-full bg-stone-200/80 h-2 rounded-full overflow-hidden'>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      (workspaceUsage?.activeSessions?.percentUsed ?? 0) >= 90
                        ? 'bg-red-500'
                        : (workspaceUsage?.activeSessions?.percentUsed ?? 0) >= 75
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        workspaceUsage?.activeSessions?.isUnlimited
                          ? 0
                          : (workspaceUsage?.activeSessions?.percentUsed ?? 0),
                      )}%`,
                    }}
                  />
                </div>

                <div className='flex items-center justify-between text-xs leading-relaxed text-stone-600'>
                  <span>
                    {workspaceUsage?.activeMemberCount
                      ? `${workspaceUsage.activeMemberCount} người online`
                      : 'Chưa có thành viên online'}
                  </span>
                  <button
                    type='button'
                    onClick={() => {
                      setSessionsModalOpen(true);
                      loadActiveSessions();
                    }}
                    className='font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer flex items-center gap-1'
                    title='Xem danh sách các thiết bị đang đăng nhập của Studio'
                  >
                    <span>Chi tiết</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Workspace Content Area with Tabbed Navigation */}
      <div className='space-y-6'>
        {/* Section Header bar & Action Controls */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
          <div className='flex items-center gap-3'>
            <h2 className='text-base font-bold text-stone-900 flex items-center gap-2'>
              <BookOpen className='w-4 h-4 text-orange-500' />
              <span>Bộ Truyện (Series)</span>
              <span className='px-2 py-0.5 rounded-full bg-orange-100/70 text-orange-700 text-xs font-mono font-bold'>
                {seriesList.length}
              </span>
            </h2>
            {isProducerOrAdmin && (
              <div className='flex items-center gap-1 bg-[#f0efed] p-1 rounded-full border border-[#e7e5e4] ml-2'>
                <button
                  onClick={() => setActiveTab('series')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    activeTab === 'series'
                      ? 'bg-[#292524] text-white shadow-soft-sm'
                      : 'text-[#4e4e4e] hover:text-[#0c0a09]'
                  }`}
                >
                  <span>Dự Án Series</span>
                </button>
                <button
                  onClick={() => setActiveTab('members')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    activeTab === 'members'
                      ? 'bg-[#292524] text-white shadow-soft-sm'
                      : 'text-[#4e4e4e] hover:text-[#0c0a09]'
                  }`}
                >
                  <Users className='w-3 h-3 text-blue-500' />
                  <span>Thành Viên Studio</span>
                  <span className='px-2 py-0.5 rounded-full bg-white/20 text-white text-xs font-mono'>
                    {members.length}
                  </span>
                </button>
              </div>
            )}
          </div>

          {isProducerOrAdmin &&
            (activeTab === 'series' ? (
              <button
                onClick={() => setCreateSeriesModalOpen(true)}
                className='inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#292524] hover:bg-[#0c0a09] text-white text-xs font-medium shadow-soft-sm transition-all cursor-pointer'
              >
                <Plus className='w-4 h-4' />
                <span>Tạo Series Mới</span>
              </button>
            ) : (
              <button
                onClick={() => setInviteModalOpen(true)}
                className='inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#292524] hover:bg-[#0c0a09] text-white text-xs font-medium shadow-soft-sm transition-all cursor-pointer'
              >
                <UserPlus className='w-4 h-4 text-orange-400' />
                <span>Mời Thành Viên Mới</span>
              </button>
            ))}
        </div>

        {/* TAB 1: Series Projects View */}
        {activeTab === 'series' && (
          <div>
            {seriesList.length === 0 ? (
              <div className='py-12 px-4 text-center bg-white rounded-2xl border border-dashed border-[#e7e5e4] max-w-lg mx-auto my-4 space-y-3 shadow-soft-sm'>
                <div className='w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mx-auto'>
                  <BookOpen className='w-6 h-6' />
                </div>
                <h3 className='text-sm font-bold text-[#0c0a09]'>
                  Chưa có Series nào trong Studio này
                </h3>
                <p className='text-xs text-[#777169] leading-relaxed'>
                  Khởi tạo Series mới để thiết lập thể loại, định dạng xuất bản, quy trình 8 công
                  đoạn và kho tư liệu Series Bible.
                </p>
                {isProducerOrAdmin && (
                  <button
                    onClick={() => setCreateSeriesModalOpen(true)}
                    className='inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#292524] hover:bg-[#0c0a09] rounded-full shadow-soft-sm transition-all cursor-pointer'
                  >
                    <Plus className='w-3.5 h-3.5' />
                    <span>Tạo Series Mới Ngay</span>
                  </button>
                )}
              </div>
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                {seriesList.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      const wsId = activeWorkspace?.id || workspaceId;
                      if (!wsId) return;
                      const effectiveRole = wsRole ? String(wsRole) : userRole;
                      navigate(getRoleDefaultPath(effectiveRole, wsId, String(s.id)));
                    }}
                    className='p-6 bg-white hover:bg-stone-50/50 rounded-2xl border border-[#f0efed] hover:border-[#292524] shadow-soft-sm hover:shadow-soft-md transition-all cursor-pointer group relative flex flex-col justify-between h-full'
                  >
                    <div>
                      <div className='flex items-start justify-between gap-2'>
                        <div>
                          <span className='px-2.5 py-0.5 rounded-full bg-[#f0efed] text-[#292524] font-mono text-xs font-medium border border-[#e7e5e4] uppercase tracking-wide'>
                            {s.genre || s.format || 'GENERAL'}
                          </span>
                          <h3 className='text-xl font-serif font-light text-[#0c0a09] mt-2 group-hover:text-[#292524] transition-colors leading-tight'>
                            {s.title}
                          </h3>
                        </div>
                        {isProducerOrAdmin && (
                          <div className='flex items-center gap-1 shrink-0 relative group/menu'>
                            <button
                              type='button'
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              className='p-1.5 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors'
                              title='Tùy chọn'
                            >
                              <MoreVertical className='w-4 h-4' />
                            </button>
                            <div className='absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-stone-200 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10 py-1 overflow-hidden'>
                              <button
                                type='button'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedChapterSeries({ id: s.id, title: s.title });
                                }}
                                className='w-full text-left px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2 transition-colors'
                              >
                                <BookOpen className='w-3.5 h-3.5 text-orange-500' /> Quản lý Chương
                                (Duyệt)
                              </button>
                              <button
                                type='button'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPipelineSeries({ id: s.id, title: s.title });
                                }}
                                className='w-full text-left px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2 transition-colors'
                              >
                                <Sliders className='w-3.5 h-3.5 text-blue-500' /> Cấu hình Pipeline
                                (UC-03)
                              </button>
                              <button
                                type='button'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPresetsSeries({ id: s.id, title: s.title });
                                }}
                                className='w-full text-left px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2 transition-colors'
                              >
                                <ListOrdered className='w-3.5 h-3.5 text-purple-500' /> Typography
                                Presets
                              </button>
                              <div className='border-t border-stone-100 my-1'></div>
                              <button
                                type='button'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditSeries(s);
                                }}
                                className='w-full text-left px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2 transition-colors'
                              >
                                <Edit2 className='w-3.5 h-3.5' /> Chỉnh sửa
                              </button>
                              <button
                                type='button'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteSeriesModal(s);
                                }}
                                className='w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors'
                              >
                                <Trash2 className='w-3.5 h-3.5' /> Xóa
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {s.synopsis && (
                        <p className='text-xs text-stone-600 line-clamp-2 leading-relaxed mt-2.5'>
                          {s.synopsis}
                        </p>
                      )}

                      {s.storyArc && (
                        <div className='mt-3 px-3 py-2 bg-amber-50/70 border border-amber-200/60 rounded-lg'>
                          <div className='flex items-center gap-1 text-xs font-semibold text-amber-700 font-mono uppercase tracking-wider mb-0.5'>
                            <span>Story Arc</span>
                          </div>
                          <p className='text-xs text-amber-900 line-clamp-2 leading-relaxed'>
                            {s.storyArc}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className='pt-5 flex flex-col gap-3'>
                      {/* Unified metadata row: Direction on left, Chapter Count on right */}
                      <div className='flex items-center justify-between text-xs font-mono text-stone-600'>
                        <div className='flex items-center gap-1.5'>
                          <Compass className='w-3.5 h-3.5 text-stone-400' />
                          <span className='font-semibold text-stone-700'>
                            {s.readingDirection === 1 || s.readingDirection === 'RightToLeft'
                              ? 'RTL'
                              : 'Vertical'}
                          </span>
                        </div>

                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedChapterSeries({ id: s.id, title: s.title });
                          }}
                          className='px-2.5 py-0.5 rounded-full bg-stone-100 hover:bg-orange-50 text-stone-700 hover:text-orange-600 font-semibold transition-colors cursor-pointer flex items-center gap-1 text-xs'
                          title='Bấm để xem danh sách chương'
                        >
                          <BookOpen className='w-3 h-3 text-orange-500' />
                          <span>{s.chaptersCount ?? 0} Chương</span>
                        </button>
                      </div>

                      {/* Action buttons on card footer */}
                      <div className='border-t border-stone-100 pt-4 flex items-center gap-2'>
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedChapterSeries({ id: s.id, title: s.title });
                          }}
                          className='flex-1 h-10 px-4 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200/80 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-2xs hover:shadow-xs active:scale-98 cursor-pointer'
                          title={
                            effectiveRoleUpper === 'EDITOR'
                              ? 'Quản lý và duyệt các chương truyện (BR-12)'
                              : effectiveRoleUpper === 'WRITER' ||
                                  effectiveRoleUpper === 'ARTIST' ||
                                  effectiveRoleUpper === 'LETTERER'
                                ? 'Vào không gian sáng tác và danh sách chương'
                                : 'Quản lý danh sách chương, kiểm tra tiến độ và phê duyệt hoàn tất (BR-12)'
                          }
                        >
                          <BookOpen className='w-4 h-4 text-orange-500' />
                          <span>
                            {effectiveRoleUpper === 'EDITOR'
                              ? 'Quản Lý & Duyệt Chương'
                              : effectiveRoleUpper === 'WRITER' ||
                                  effectiveRoleUpper === 'ARTIST' ||
                                  effectiveRoleUpper === 'LETTERER'
                                ? 'Vào Không Gian Sáng Tác'
                                : 'Quản Lý Chương (Duyệt)'}
                          </span>
                        </button>

                        {isProducerOrAdmin && (
                          <>
                            <button
                              type='button'
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPipelineSeries({ id: s.id, title: s.title });
                              }}
                              className='h-10 w-10 flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-100 border border-stone-200/80 rounded-xl transition-colors cursor-pointer shadow-2xs shrink-0'
                              title='Cấu hình Pipeline Series (UC-03)'
                            >
                              <Sliders className='w-4 h-4' />
                            </button>

                            <button
                              type='button'
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPresetsSeries({ id: s.id, title: s.title });
                              }}
                              className='h-10 w-10 flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-100 border border-stone-200/80 rounded-xl transition-colors cursor-pointer shadow-2xs shrink-0'
                              title='Typography Presets & Consistency Rules (NFR-08)'
                            >
                              <ListOrdered className='w-4 h-4' />
                            </button>
                          </>
                        )}
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
          <div className='space-y-6'>
            {/* Tab Selection Row & Search */}
            <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
              <div className='flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 custom-scrollbar'>
                {[
                  { key: 'ALL', label: 'All Members', count: tabCounts.ALL },
                  { key: 'LEAD', label: 'Lead Producers', count: tabCounts.LEAD },
                  { key: 'ARTIST', label: 'Artists', count: tabCounts.ARTIST },
                  { key: 'WRITER', label: 'Writers & Storyboard', count: tabCounts.WRITER },
                  { key: 'EDITOR', label: 'Editors & Editorial', count: tabCounts.EDITOR },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setMemberRoleFilter(tab.key as any)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shadow-soft-sm ${
                      memberRoleFilter === tab.key
                        ? 'bg-[#292524] text-white'
                        : 'bg-white text-[#4e4e4e] border border-[#e7e5e4] hover:bg-[#f0efed] hover:text-[#0c0a09]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                        memberRoleFilter === tab.key
                          ? 'bg-white/20 text-white'
                          : 'bg-[#f0efed] text-[#4e4e4e]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className='relative'>
                <Search className='w-3.5 h-3.5 text-[#777169] absolute left-3.5 top-1/2 -translate-y-1/2' />
                <input
                  type='text'
                  placeholder='Filter members by name, role, task...'
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  className='pl-9 pr-4 py-2 bg-white rounded-full border border-[#e7e5e4] text-xs text-[#0c0a09] placeholder-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#292524]/10 w-64 shadow-soft-sm transition-all'
                />
              </div>
            </div>

            {/* Members List */}
            <div className='bg-white border border-[#f0efed] rounded-2xl overflow-hidden shadow-soft-sm'>
              <div className='p-4 bg-[#fafafa] border-b border-[#f0efed] flex items-center justify-between'>
                <h3 className='text-sm font-serif font-light text-[#0c0a09]'>
                  Thành viên Studio ({filteredMembers.length})
                </h3>
                <button
                  type='button'
                  onClick={() => {
                    setSessionsModalOpen(true);
                    loadActiveSessions();
                  }}
                  className='px-3.5 py-1.5 rounded-full bg-white border border-[#e7e5e4] hover:bg-[#f0efed] text-xs font-medium text-[#0c0a09] flex items-center gap-1.5 shadow-soft-sm cursor-pointer'
                >
                  <Monitor className='w-3.5 h-3.5 text-emerald-600' />
                  <span>Giám sát thiết bị ({workspaceUsage?.activeSessions?.used ?? 0})</span>
                </button>
              </div>

              <div className='divide-y divide-[#E7E7E7]'>
                {filteredMembers.length === 0 ? (
                  <div className='p-8 text-center text-xs text-[#888888] font-mono'>
                    Không có thành viên nào phù hợp với bộ lọc hiện tại.
                  </div>
                ) : (
                  filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className='p-5 hover:bg-[#FAF8F4] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4'
                    >
                      {/* Member Info */}
                      <div className='flex items-start sm:items-center gap-4'>
                        <div
                          className='w-11 h-11 rounded-full text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs ring-2 ring-white'
                          style={{ backgroundColor: member.avatarBg || '#171717' }}
                        >
                          {member.initials || 'ST'}
                        </div>

                        <div>
                          <div className='flex flex-wrap items-center gap-2'>
                            <h4 className='text-sm font-bold text-[#171717] font-serif'>
                              {member.name}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded border text-xs font-mono font-semibold tracking-wider ${
                                ROLE_BADGE_STYLE[member.role] ||
                                'bg-stone-50 text-stone-700 border-stone-200'
                              }`}
                            >
                              {(member.role || 'MEMBER').toUpperCase()}
                            </span>
                            {member.isOwner && (
                              <span className='px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 text-xs font-mono font-bold'>
                                STUDIO OWNER
                              </span>
                            )}
                            {member.isYou && (
                              <span className='px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-xs font-mono font-bold'>
                                YOU
                              </span>
                            )}
                            <span
                              className='inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-mono font-medium'
                              title='Khóa chữ ký số mật mã ECDSA P-256 đang hoạt động'
                            >
                              <Key className='w-3 h-3 text-emerald-600' />
                              <span>ECDSA P-256</span>
                            </span>
                            <span className='flex items-center gap-1 text-xs font-medium'>
                              {member.isEmailConfirmed === false ? (
                                <span className='text-[#D97706] flex items-center gap-1 bg-[#FEF3C7] px-1.5 py-0.5 rounded-sm border border-[#FDE68A]'>
                                  Chờ kích hoạt
                                </span>
                              ) : (
                                <span className='text-[#059669] flex items-center gap-1'>
                                  <span className='w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse'></span>
                                  {member.status}
                                </span>
                              )}
                            </span>
                          </div>

                          <div className='flex flex-wrap items-center gap-3 text-xs text-[#555555] mt-1 font-mono'>
                            <span className='flex items-center gap-1'>
                              <Mail className='w-3 h-3 text-[#888888]' />
                              {member.email}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className='flex flex-col sm:flex-row sm:items-center gap-4 self-end md:self-center shrink-0'>
                        {canCreateStudio && (
                          <div className='flex items-center gap-2'>
                            {member.isEmailConfirmed === false && (
                              <button
                                onClick={() => handleResendInvitation(member.id)}
                                className='px-3 py-1.5 bg-white hover:bg-[#F3F1EB] border border-[#E7E7E7] rounded-lg text-xs font-semibold text-[#888888] hover:text-[#171717] transition-colors cursor-pointer shadow-2xs flex items-center gap-1'
                              >
                                <Mail className='w-3 h-3' />
                                <span className='hidden sm:inline'>Gửi lại lời mời</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEditAccess(member)}
                              className='px-3 py-1.5 bg-white hover:bg-[#F3F1EB] border border-[#E7E7E7] rounded-lg text-xs font-semibold text-[#171717] transition-colors cursor-pointer shadow-2xs flex items-center gap-1'
                            >
                              <Edit3 className='w-3 h-3 text-[#F97316]' />
                              <span>Sửa quyền</span>
                            </button>
                            {!member.isOwner && (
                              <button
                                onClick={() =>
                                  setMemberToDelete({ id: member.id, email: member.email })
                                }
                                className='text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors cursor-pointer border border-transparent hover:border-red-200 ml-1'
                                title='Xóa thành viên'
                              >
                                <Trash2 className='w-4 h-4' />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
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
      {inviteModalOpen && activeWorkspace && (
        <InviteMemberModal
          isOpen={inviteModalOpen}
          workspaceId={activeWorkspace.id}
          onClose={() => setInviteModalOpen(false)}
          onInvited={(newMember) => setMembers((prev) => [...prev, newMember])}
          onShowToast={showToast}
        />
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

              <div className='p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7] space-y-1 text-xs text-[#737373]'>
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
                  <span className='text-xs text-[#888888] font-mono'>Đầu vào AI Writer</span>
                </div>
                <textarea
                  rows={3}
                  value={editSeriesStoryArc}
                  onChange={(e) => setEditSeriesStoryArc(e.target.value)}
                  placeholder='Tuyến truyện chính, các mốc xung đột và bước ngoặt xuyên suốt Series...'
                  className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                />
                <p className='text-xs text-[#737373] mt-1'>
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
                  <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-xs font-bold'>
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
                <thead className='bg-[#FAF8F5] border-b border-[#E7E7E7] font-mono text-xs text-[#737373] sticky top-0'>
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
                            className={`px-1.5 py-0.5 rounded text-xs font-mono font-medium ${
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
                        <td className='py-2.5 px-3 font-mono text-xs text-[#555555]'>
                          {log.entityName} {log.entityId ? `#${log.entityId.substring(0, 6)}` : ''}
                        </td>
                        <td className='py-2.5 px-3 text-[#555555]'>
                          {log.userEmail || log.userId || 'Hệ thống'}
                        </td>
                        <td className='py-2.5 px-3 font-mono text-xs text-[#888888] whitespace-nowrap'>
                          {new Date(log.createdAtUtc).toLocaleString('vi-VN')}
                        </td>
                        <td className='py-2.5 px-3 font-mono text-xs text-[#737373] max-w-xs truncate'>
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
      {/* Edit Access & Role Modal */}
      {editingMember && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150'>
          <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden'>
            {/* Header */}
            <div className='p-4 bg-[#FAF8F4] border-b border-[#E7E7E7] flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Shield className='w-4 h-4 text-[#F97316]' />
                <h3 className='font-serif font-bold text-base text-[#171717]'>
                  Edit Access Policies: {editingMember.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingMember(null)}
                className='w-7 h-7 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] flex items-center justify-center text-[#888888] hover:text-[#171717] transition-all cursor-pointer'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            {/* Form */}
            <div className='p-6 space-y-4 text-xs'>
              <div>
                <label className='block font-mono font-bold uppercase tracking-wider text-[#888888] mb-1.5 text-xs'>
                  Assigned Production Role (Single Role)
                </label>
                <div className='flex flex-wrap gap-2 mt-1'>
                  {(['PRODUCER', 'ARTIST', 'WRITER', 'LETTERER', 'EDITOR'] as const).map(
                    (roleKey) => {
                      const isSelected = editRole.toUpperCase() === roleKey;
                      return (
                        <label
                          key={roleKey}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-bold tracking-wider cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#171717] text-white border-[#171717] shadow-xs'
                              : 'bg-white text-[#555555] border-[#E7E7E7] hover:bg-[#FAF8F4]'
                          }`}
                        >
                          <input
                            type='radio'
                            name='memberRole'
                            value={roleKey}
                            className='hidden'
                            checked={isSelected}
                            onChange={() => setEditRole(roleKey)}
                          />
                          <span>{roleKey}</span>
                        </label>
                      );
                    },
                  )}
                </div>
              </div>

              <div>
                <label className='block font-mono font-bold uppercase tracking-wider text-[#888888] mb-1.5 text-xs'>
                  Current Assignment / Scope
                </label>
                <input
                  type='text'
                  value={editTask}
                  onChange={(e) => setEditTask(e.target.value)}
                  className='w-full px-3 py-2 bg-[#FAF8F4] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-[#171717] focus:outline-none focus:border-[#F97316]'
                />
              </div>
            </div>

            {/* Footer */}
            <div className='p-4 bg-[#FAF8F4] border-t border-[#E7E7E7] flex items-center justify-between'>
              <button
                type='button'
                onClick={() => setEditingMember(null)}
                className='px-3.5 py-1.5 bg-white hover:bg-[#F3F1EB] border border-[#E7E7E7] text-[#555555] rounded-lg text-xs font-semibold cursor-pointer'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={handleSaveAccess}
                className='px-4 py-1.5 bg-[#171717] hover:bg-black text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer'
              >
                Save Policies
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Sessions & Devices Modal */}
      {sessionsModalOpen && (
        <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4'>
          <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col p-6 space-y-4'>
            <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
              <div>
                <div className='flex items-center gap-2 mb-0.5'>
                  <span className='px-2 py-0.5 rounded bg-emerald-600 text-white font-mono text-xs font-bold'>
                    PRODUCER // ACTIVE SESSIONS
                  </span>
                  <span className='text-xs text-[#888888] font-mono'>
                    NFR Concurrent Session Governance
                  </span>
                </div>
                <h3 className='text-sm font-bold text-[#171717]'>
                  Giám Sát Thiết Bị & Phiên Đăng Nhập Đồng Thời: {activeWorkspace?.name}
                </h3>
              </div>
              <button
                type='button'
                onClick={() => setSessionsModalOpen(false)}
                className='text-[#888888] hover:text-[#171717] cursor-pointer'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            {/* Filter & Refresh */}
            <div className='flex items-center justify-between text-xs'>
              <div className='flex items-center gap-3'>
                <input
                  type='text'
                  placeholder='Lọc theo tên thành viên, email, thiết bị...'
                  value={sessionSearchQuery}
                  onChange={(e) => setSessionSearchQuery(e.target.value)}
                  className='px-3 py-1.5 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs w-72 focus:outline-none focus:border-[#F97316]'
                />
                <button
                  type='button'
                  onClick={loadActiveSessions}
                  className='px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E7E7E7] hover:bg-[#F3F1EB] font-semibold flex items-center gap-1.5 cursor-pointer'
                >
                  <RefreshCw className={`w-3 h-3 ${sessionsLoading ? 'animate-spin' : ''}`} />
                  <span>Làm mới</span>
                </button>
              </div>
              <div className='text-xs text-[#737373] font-mono'>
                Tổng cộng: <span className='font-bold text-[#171717]'>{activeSessions.length}</span>{' '}
                phiên đang hoạt động
              </div>
            </div>

            {/* Sessions Table */}
            <div className='overflow-y-auto flex-1 border border-[#E7E7E7] rounded-xl text-xs'>
              <table className='w-full text-left'>
                <thead className='bg-[#FAF8F5] border-b border-[#E7E7E7] font-mono text-xs text-[#737373] sticky top-0'>
                  <tr>
                    <th className='py-2.5 px-3'>Thành Viên</th>
                    <th className='py-2.5 px-3'>Thiết Bị / Trình Duyệt</th>
                    <th className='py-2.5 px-3'>Địa Chỉ IP</th>
                    <th className='py-2.5 px-3'>Đăng Nhập Lúc</th>
                    <th className='py-2.5 px-3'>Hoạt Động Gần Nhất</th>
                    <th className='py-2.5 px-3 text-right'>Hành Động</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-[#E7E7E7]'>
                  {sessionsLoading ? (
                    <tr>
                      <td colSpan={6} className='p-8 text-center text-[#888888] font-mono'>
                        Đang tải danh sách phiên làm việc...
                      </td>
                    </tr>
                  ) : activeSessions.filter((s) => {
                      const q = sessionSearchQuery.toLowerCase().trim();
                      return (
                        !q ||
                        s.fullName.toLowerCase().includes(q) ||
                        s.email.toLowerCase().includes(q) ||
                        (s.deviceName && s.deviceName.toLowerCase().includes(q))
                      );
                    }).length === 0 ? (
                    <tr>
                      <td colSpan={6} className='p-8 text-center text-[#888888] font-mono'>
                        Không có phiên đăng nhập nào đang hoạt động.
                      </td>
                    </tr>
                  ) : (
                    activeSessions
                      .filter((s) => {
                        const q = sessionSearchQuery.toLowerCase().trim();
                        return (
                          !q ||
                          s.fullName.toLowerCase().includes(q) ||
                          s.email.toLowerCase().includes(q) ||
                          (s.deviceName && s.deviceName.toLowerCase().includes(q))
                        );
                      })
                      .map((session) => (
                        <tr
                          key={session.sessionId}
                          className='hover:bg-[#FAF8F5] transition-colors'
                        >
                          <td className='py-2.5 px-3'>
                            <div>
                              <div className='font-bold text-[#171717] flex items-center gap-1.5'>
                                <span>{session.fullName}</span>
                                {session.isCurrentSession && (
                                  <span className='px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200 text-xs font-mono font-bold'>
                                    Bạn
                                  </span>
                                )}
                              </div>
                              <div className='text-xs text-[#888888]'>{session.email}</div>
                            </div>
                          </td>
                          <td className='py-2.5 px-3 font-medium text-[#171717]'>
                            <div className='flex items-center gap-1.5'>
                              <Monitor className='w-3.5 h-3.5 text-zinc-500' />
                              <span>{session.deviceName || 'Thiết bị Web'}</span>
                            </div>
                          </td>
                          <td className='py-2.5 px-3 font-mono text-xs text-zinc-600'>
                            {session.ipAddress || '—'}
                          </td>
                          <td className='py-2.5 px-3 font-mono text-xs text-[#737373]'>
                            {new Date(session.sessionStartedAt).toLocaleString('vi-VN')}
                          </td>
                          <td className='py-2.5 px-3 font-mono text-xs text-[#737373]'>
                            {new Date(session.lastActiveAt).toLocaleString('vi-VN')}
                          </td>
                          <td className='py-2.5 px-3 text-right'>
                            <button
                              type='button'
                              disabled={revokingSessionId === session.sessionId}
                              onClick={() =>
                                handleRevokeSession(session.sessionId, session.fullName)
                              }
                              className='px-2.5 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 text-xs font-semibold border border-red-200 flex items-center gap-1 ml-auto cursor-pointer disabled:opacity-50'
                              title='Ngắt kết nối thiết bị này'
                            >
                              <LogOut className='w-3 h-3' />
                              <span>{session.isCurrentSession ? 'Đăng xuất' : 'Ngắt kết nối'}</span>
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className='flex items-center justify-between text-xs text-[#888888] border-t border-[#E7E7E7] pt-3'>
              <span className='italic'>
                * Producer có thể ngắt kết nối các thiết bị không rõ nguồn gốc hoặc khi nghi ngờ tài
                khoản bị lộ.
              </span>
              <button
                type='button'
                onClick={() => setSessionsModalOpen(false)}
                className='px-4 py-1.5 bg-[#171717] text-white rounded-lg text-xs font-semibold cursor-pointer'
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Revoke Member Confirmation */}
      {memberToDelete && (
        <div className='fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150'>
          <div className='bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-md w-full p-6 space-y-4'>
            <div className='flex items-center gap-3 text-red-600'>
              <div className='w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0'>
                <AlertTriangle className='w-5 h-5 text-red-600' />
              </div>
              <div>
                <h3 className='text-sm font-bold font-serif text-stone-900'>
                  Xác nhận xóa thành viên
                </h3>
                <p className='text-xs text-stone-500 font-mono'>Thu hồi quyền truy cập Studio</p>
              </div>
            </div>
            <p className='text-xs text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200/80'>
              Bạn có chắc chắn muốn xóa thành viên{' '}
              <strong className='text-stone-900'>{memberToDelete.email}</strong> khỏi Studio? Mọi
              phiên đăng nhập sẽ bị chấm dứt ngay lập tức và các khóa ủy quyền chữ ký ECDSA sẽ bị
              thu hồi.
            </p>
            <div className='flex items-center justify-end gap-2 pt-2'>
              <button
                type='button'
                onClick={() => setMemberToDelete(null)}
                className='px-3.5 py-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-700 cursor-pointer transition-colors'
              >
                Hủy
              </button>
              <button
                type='button'
                onClick={async () => {
                  if (!activeWorkspace || !memberToDelete) return;
                  try {
                    await workspaceService.removeMember(activeWorkspace.id, memberToDelete.id);
                    setMembers((prev) => prev.filter((m) => m.userId !== memberToDelete.id));
                    showToast(
                      'Đã xóa thành viên',
                      `Đã xóa ${memberToDelete.email} khỏi workspace.`,
                    );
                  } catch (err: any) {
                    showToast('Lỗi', err.message);
                  } finally {
                    setMemberToDelete(null);
                  }
                }}
                className='px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors'
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { StudioOverviewView as ProducerWorkspaceView };
export default StudioOverviewView;
