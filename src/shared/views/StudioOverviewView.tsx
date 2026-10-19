import React, { useState, useEffect, useRef } from 'react';
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
  ArrowRight,
  ChevronDown,
  ChevronUp,
  History,
  ImagePlus,
  ImageOff,
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
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
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
  const [newSeriesDirection, setNewSeriesDirection] = useState(2);
  const [newSeriesGenre, setNewSeriesGenre] = useState('Shonen / Action');
  const [newSeriesSynopsis, setNewSeriesSynopsis] = useState('');
  const [newSeriesStoryArc, setNewSeriesStoryArc] = useState('');
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

  // Search, Filter & Sort states for Series Library
  const [searchQuery, setSearchQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('ALL');
  const [directionFilter, setDirectionFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'recent' | 'az' | 'za' | 'chapters'>('recent');
  const [isResourcesExpanded, setIsResourcesExpanded] = useState(false);
  const [openMenuSeriesId, setOpenMenuSeriesId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

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
    setLoadError(null);
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
        try {
          const memList = await workspaceService.getMembers(cur.id);
          setMembers(memList);
        } catch {
          setMembers([]);
        }

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
      setLoadError(err.message || 'Không thể kết nối máy chủ.');
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
        readingDirection: Number(newSeriesDirection),
        genre: newSeriesGenre.trim() || undefined,
        synopsis: newSeriesSynopsis.trim() || undefined,
        storyArc: newSeriesStoryArc.trim() || undefined,
        pipelineTemplateId: newSeriesTemplateId || undefined,
      });

      setSeriesList((prev) => [created, ...prev]);
      setCreateSeriesModalOpen(false);
      setNewSeriesTitle('');
      setNewSeriesSynopsis('');
      setNewSeriesStoryArc('');
      setNewSeriesGenre('Shonen / Action');
      setNewSeriesFormat('WEBTOON');
      setNewSeriesDirection(2);
      showToast(
        'Tạo Series thành công',
        `Đã tạo bộ truyện "${created.title}" với cấu hình pipeline và metadata hoàn chỉnh.`,
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
  // Ảnh bìa Series (Producer): một input file dùng chung cho mọi thẻ, nhớ Series đang đổi bìa.
  const coverInputRef = useRef<HTMLInputElement>(null);
  const coverTargetRef = useRef<string | null>(null);
  const setSeriesCover = (seriesId: string, coverUrl: string | null) =>
    setSeriesList((prev) => prev.map((x) => (x.id === seriesId ? { ...x, coverUrl } : x)));

  const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const seriesId = coverTargetRef.current;
    e.target.value = ''; // cho phép chọn lại cùng file
    if (!file || !seriesId) return;
    try {
      setSeriesCover(seriesId, await seriesService.setCover(seriesId, file));
      showToast('Đã cập nhật ảnh bìa', file.name);
    } catch (err: any) {
      showToast('Lỗi ảnh bìa', err.message);
    }
  };

  const handleClearCover = async (seriesId: string) => {
    try {
      await seriesService.clearCover(seriesId);
      setSeriesCover(seriesId, null);
      showToast('Đã xoá ảnh bìa', 'Thẻ bộ truyện quay về bìa chữ cái.');
    } catch (err: any) {
      showToast('Lỗi ảnh bìa', err.message);
    }
  };

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

  // Close card options menu on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-series-options-menu]')) {
        setOpenMenuSeriesId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuSeriesId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Reset search, filters and sort when active workspace changes
  useEffect(() => {
    setSearchQuery('');
    setGenreFilter('ALL');
    setDirectionFilter('ALL');
    setSortBy('recent');
    setOpenMenuSeriesId(null);
  }, [activeWorkspace?.id, workspaceId]);

  const formatReadingDirection = (direction: number | string | undefined) => {
    if (direction === 'Vertical' || direction === 2 || direction === '2') {
      return { label: 'Cuộn dọc', shortLabel: 'Dọc', type: 'vertical' as const };
    }
    if (direction === 'LeftToRight' || direction === 0 || direction === '0') {
      return { label: 'Đọc trái → phải', shortLabel: 'LTR', type: 'ltr' as const };
    }
    return { label: 'Đọc phải → trái', shortLabel: 'RTL', type: 'rtl' as const };
  };

  const formatGenre = (genre: string | undefined | null) => {
    if (!genre || !genre.trim() || genre.trim().toUpperCase() === 'GENERAL') {
      return 'Tổng hợp';
    }
    return genre.trim();
  };

  const formatSeriesDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const handleOpenSeries = (sId: string) => {
    const wsId = activeWorkspace?.id || workspaceId;
    if (!wsId) return;
    const effectiveRole = wsRole ? String(wsRole) : userRole;
    navigate(getRoleDefaultPath(effectiveRole, wsId, sId));
  };

  const availableGenres = React.useMemo(() => {
    const genres = new Set<string>();
    seriesList.forEach((s) => {
      if (s.genre && s.genre.trim()) {
        genres.add(s.genre.trim());
      }
    });
    return Array.from(genres);
  }, [seriesList]);

  const filteredAndSortedSeries = React.useMemo(() => {
    return seriesList
      .filter((s) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          s.title.toLowerCase().includes(q) ||
          (s.synopsis && s.synopsis.toLowerCase().includes(q)) ||
          (s.genre && s.genre.toLowerCase().includes(q)) ||
          (s.storyArc && s.storyArc.toLowerCase().includes(q));

        const matchesGenre =
          genreFilter === 'ALL' || (s.genre && s.genre.toLowerCase() === genreFilter.toLowerCase());

        const dirInfo = formatReadingDirection(s.readingDirection);
        const matchesDirection =
          directionFilter === 'ALL' ||
          (directionFilter === 'RTL' && dirInfo.type === 'rtl') ||
          (directionFilter === 'LTR' && dirInfo.type === 'ltr') ||
          (directionFilter === 'VERTICAL' && dirInfo.type === 'vertical');

        return matchesSearch && matchesGenre && matchesDirection;
      })
      .sort((a, b) => {
        if (sortBy === 'recent') {
          const timeA = new Date(a.updatedAt || a.createdAt).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt).getTime();
          return timeB - timeA;
        }
        if (sortBy === 'az') {
          return a.title.localeCompare(b.title, 'vi');
        }
        if (sortBy === 'za') {
          return b.title.localeCompare(a.title, 'vi');
        }
        if (sortBy === 'chapters') {
          return (b.chaptersCount ?? 0) - (a.chaptersCount ?? 0);
        }
        return 0;
      });
  }, [seriesList, searchQuery, genreFilter, directionFilter, sortBy]);

  const isFiltering =
    searchQuery.trim() !== '' || genreFilter !== 'ALL' || directionFilter !== 'ALL';

  const handleClearFilters = () => {
    setSearchQuery('');
    setGenreFilter('ALL');
    setDirectionFilter('ALL');
  };

  return (
    <div className='flex-1 bg-[#FAF8F5] min-h-screen p-6 md:p-8 space-y-6'>
      <input
        ref={coverInputRef}
        type='file'
        accept='image/png,image/jpeg,image/webp'
        className='hidden'
        onChange={handleCoverFile}
        data-testid='series-cover-input'
      />
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

      {/* Header Banner: Studio Series Library Header */}
      <div className='bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-4'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div>
            <div className='flex items-center gap-2 text-xs font-semibold text-stone-500 uppercase tracking-wider font-mono'>
              <Briefcase className='w-4 h-4 text-orange-500 shrink-0' />
              <span>{activeWorkspace?.name || 'Studio Workspace'}</span>
            </div>
            <h1 className='text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight mt-1'>
              Thư viện Bộ truyện
            </h1>
            <p className='text-xs sm:text-sm text-stone-600 mt-1 leading-relaxed max-w-2xl'>
              Không gian quản lý, theo dõi tiến độ sản xuất và điều phối các bộ truyện tranh trong
              Studio.
            </p>
          </div>

          {isProducerOrAdmin && (
            <div className='flex items-center gap-2.5 shrink-0'>
              <button
                type='button'
                onClick={() => setCreateSeriesModalOpen(true)}
                className='inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-semibold shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer'
              >
                <Plus className='w-4 h-4' />
                <span>Tạo bộ truyện</span>
                <span className='sr-only'>Tạo Series Mới</span>
              </button>
            </div>
          )}
        </div>

        {/* Studio Resource Governance (Compact & Collapsible) - Shown for Producer/Admin */}
        {activeWorkspace && isProducerOrAdmin && (
          <div className='pt-2 border-t border-stone-100'>
            {/* Collapsed Summary Bar */}
            <div className='p-3 sm:p-3.5 bg-stone-50/70 rounded-xl border border-stone-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3'>
              <div className='flex flex-wrap items-center gap-2.5 text-xs'>
                <div className='flex items-center gap-1.5 font-bold text-stone-800 shrink-0'>
                  <HardDrive className='w-4 h-4 text-orange-500 shrink-0' />
                  <span>Tài nguyên Studio:</span>
                </div>

                {/* Storage Chip */}
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
                  const isWarning = !isUnlimited && percent >= 75;

                  return (
                    <div
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 ${
                        isWarning
                          ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
                          : 'bg-white text-stone-700 border-stone-200/80'
                      }`}
                      title={
                        isUnlimited ? 'Không giới hạn dung lượng' : `Đã dùng ${percent}% dung lượng`
                      }
                    >
                      <span className='text-stone-500 font-sans'>Lưu trữ:</span>
                      <span>
                        {workspaceUsage
                          ? `${formatBytes(used)} / ${isUnlimited ? 'Không giới hạn' : formatBytes(quota)}`
                          : `${formatGb(activeWorkspace.usedStorageBytes)} / ${formatGb(activeWorkspace.storageQuotaBytes)} GB`}
                      </span>
                      {isWarning && <AlertTriangle className='w-3 h-3 text-amber-600' />}
                    </div>
                  );
                })()}

                {/* AI Tokens Chip */}
                <div className='px-2.5 py-1 rounded-lg border bg-white border-stone-200/80 font-mono text-[11px] flex items-center gap-1.5 text-stone-700'>
                  <Cpu className='w-3.5 h-3.5 text-blue-500 shrink-0' />
                  <span className='text-stone-500 font-sans'>Token AI:</span>
                  <span>
                    {workspaceUsage?.aiTokens
                      ? workspaceUsage.aiTokens.isUnlimited
                        ? 'Không giới hạn'
                        : `${formatTokens(workspaceUsage.aiTokens.used)} / ${formatTokens(workspaceUsage.aiTokens.quota)}`
                      : 'Chưa cấp quota'}
                  </span>
                </div>

                {/* Sessions Chip */}
                <div className='px-2.5 py-1 rounded-lg border bg-white border-stone-200/80 font-mono text-[11px] flex items-center gap-1.5 text-stone-700'>
                  <Monitor className='w-3.5 h-3.5 text-emerald-500 shrink-0' />
                  <span className='text-stone-500 font-sans'>Thiết bị:</span>
                  <span>
                    {workspaceUsage?.activeSessions
                      ? `${workspaceUsage.activeSessions.used} thiết bị`
                      : '0 thiết bị'}
                  </span>
                  {workspaceUsage?.activeMemberCount ? (
                    <span className='text-stone-400 font-sans'>
                      ({workspaceUsage.activeMemberCount} người online)
                    </span>
                  ) : null}
                </div>
              </div>

              <div className='flex items-center gap-2 self-end md:self-auto shrink-0'>
                <button
                  type='button'
                  onClick={() => setAuditModalOpen(true)}
                  className='px-2.5 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer'
                  title='Xem lịch sử audit studio (BR-18)'
                >
                  <History className='w-3.5 h-3.5 text-stone-400' />
                  <span>Audit Trail</span>
                </button>

                <button
                  type='button'
                  onClick={() => setIsResourcesExpanded(!isResourcesExpanded)}
                  aria-expanded={isResourcesExpanded}
                  className='px-3 py-1 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-100 border border-stone-200/80 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs'
                >
                  <span>{isResourcesExpanded ? 'Thu gọn' : 'Chi tiết tài nguyên'}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isResourcesExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Expanded Detailed Quota Meters */}
            {isResourcesExpanded && (
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3.5 animate-in fade-in duration-150'>
                {/* 1. Storage Meter */}
                <div className='flex flex-col justify-between h-full p-4 bg-stone-50/70 hover:bg-stone-50 rounded-xl border border-stone-200/80 transition-all space-y-3'>
                  <div className='flex items-center justify-between gap-2'>
                    <div className='flex items-center gap-2 text-xs font-bold text-stone-800'>
                      <HardDrive className='w-4 h-4 text-orange-500 shrink-0' />
                      <span>Dung Lượng Lưu Trữ</span>
                    </div>
                    <div className='font-mono text-xs font-bold text-stone-900 shrink-0'>
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
                        {isUnlimited ? (
                          <div className='flex items-center gap-1.5 text-xs text-blue-600 font-medium py-0.5'>
                            <CheckCircle2 className='w-3.5 h-3.5' />
                            <span>Lưu trữ không giới hạn</span>
                          </div>
                        ) : (
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
                        )}
                        <div className='flex items-center justify-between text-[11px] leading-relaxed text-stone-600'>
                          <span>
                            {isUnlimited ? 'Gói vô hạn dung lượng' : `Đã dùng ${percent}%`}
                          </span>
                          <span className='font-mono text-stone-500 text-[10px]'>
                            {isUnlimited ? 'Không giới hạn' : 'Chặn khi chạm 100%'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 2. AI Token Meter */}
                <div className='flex flex-col justify-between h-full p-4 bg-stone-50/70 hover:bg-stone-50 rounded-xl border border-stone-200/80 transition-all space-y-3'>
                  <div className='flex items-center justify-between gap-2'>
                    <div className='flex items-center gap-2 text-xs font-bold text-stone-800'>
                      <Cpu className='w-4 h-4 text-blue-500 shrink-0' />
                      <span>Hạn Mức AI Tokens</span>
                    </div>
                    {workspaceUsage?.aiTokens ? (
                      <div className='font-mono text-xs font-bold text-stone-900 shrink-0'>
                        {formatTokens(workspaceUsage.aiTokens.used)} /{' '}
                        {workspaceUsage.aiTokens.isUnlimited
                          ? 'Không giới hạn'
                          : `${formatTokens(workspaceUsage.aiTokens.quota)}`}
                      </div>
                    ) : (
                      <span className='whitespace-nowrap px-2 py-0.5 text-[10px] font-medium rounded-full text-amber-700 bg-amber-50 border border-amber-200 font-mono shrink-0'>
                        Chưa cấp quota
                      </span>
                    )}
                  </div>

                  {workspaceUsage?.aiTokens ? (
                    <div className='space-y-2'>
                      {workspaceUsage.aiTokens.isUnlimited ? (
                        <div className='flex items-center gap-1.5 text-xs text-blue-600 font-medium py-0.5'>
                          <CheckCircle2 className='w-3.5 h-3.5' />
                          <span>Token AI không giới hạn</span>
                        </div>
                      ) : (
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
                      )}
                      <div className='flex items-center justify-between text-[11px] leading-relaxed text-stone-600'>
                        <span>
                          {workspaceUsage.aiTokens.isUnlimited
                            ? 'Token theo tháng'
                            : `Đã dùng ${workspaceUsage.aiTokens.percentUsed ?? 0}%`}
                        </span>
                        <span
                          className={`font-semibold text-[11px] ${
                            workspaceUsage.aiEnabled ? 'text-emerald-600' : 'text-stone-400'
                          }`}
                        >
                          {workspaceUsage.aiEnabled ? '● AI Đang bật' : '○ AI Đã tắt'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className='pt-1 text-xs leading-relaxed text-stone-500 italic'>
                      Liên hệ Admin để cấu hình quota AI Studio
                    </div>
                  )}
                </div>

                {/* 3. AI Image Generation Meter */}
                <div className='flex flex-col justify-between h-full p-4 bg-stone-50/70 hover:bg-stone-50 rounded-xl border border-stone-200/80 transition-all space-y-3'>
                  <div className='flex items-center justify-between gap-2'>
                    <div className='flex items-center gap-2 text-xs font-bold text-stone-800'>
                      <ImageIcon className='w-4 h-4 text-purple-500 shrink-0' />
                      <span>Hạn Mức Sinh Ảnh AI</span>
                    </div>
                    {workspaceUsage?.images ? (
                      <div className='font-mono text-xs font-bold text-stone-900 shrink-0'>
                        {workspaceUsage.images.used.toLocaleString()} /{' '}
                        {workspaceUsage.images.isUnlimited
                          ? 'Không giới hạn'
                          : `${workspaceUsage.images.quota.toLocaleString()} ảnh`}
                      </div>
                    ) : (
                      <span className='whitespace-nowrap px-2 py-0.5 text-[10px] font-medium rounded-full text-purple-700 bg-purple-50 border border-purple-200 font-mono shrink-0'>
                        Chưa cấp quota
                      </span>
                    )}
                  </div>

                  {workspaceUsage?.images ? (
                    <div className='space-y-2'>
                      {workspaceUsage.images.isUnlimited ? (
                        <div className='flex items-center gap-1.5 text-xs text-purple-600 font-medium py-0.5'>
                          <CheckCircle2 className='w-3.5 h-3.5' />
                          <span>Sinh ảnh không giới hạn</span>
                        </div>
                      ) : (
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
                      )}
                      <div className='flex items-center justify-between text-[11px] leading-relaxed text-stone-600'>
                        <span>
                          {workspaceUsage.images.isUnlimited
                            ? 'Ảnh không giới hạn'
                            : `Đã dùng ${workspaceUsage.images.percentUsed ?? 0}%`}
                        </span>
                        <span
                          className={`font-semibold text-[11px] ${
                            workspaceUsage.aiEnabled ? 'text-purple-600' : 'text-stone-400'
                          }`}
                        >
                          {workspaceUsage.aiEnabled ? '● Đang kích hoạt' : '○ AI Đã tắt'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className='space-y-1 pt-1'>
                      <p className='text-xs leading-relaxed text-stone-500 italic'>
                        Pipeline sinh ảnh AI chưa bật (đã dùng: 0).
                      </p>
                    </div>
                  )}
                </div>

                {/* 4. Active Devices & Concurrent Sessions Meter */}
                <div className='flex flex-col justify-between h-full p-4 bg-stone-50/70 hover:bg-stone-50 rounded-xl border border-stone-200/80 transition-all space-y-3'>
                  <div className='flex items-center justify-between gap-2'>
                    <div className='flex items-center gap-2 text-xs font-bold text-stone-800'>
                      <Monitor className='w-4 h-4 text-emerald-500 shrink-0' />
                      <span>Phiên Đăng Nhập Đồng Thời</span>
                    </div>
                    <div className='font-mono text-xs font-bold text-stone-900 shrink-0'>
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

                    <div className='flex items-center justify-between text-[11px] leading-relaxed text-stone-600'>
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
                        className='font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer flex items-center gap-1 text-[11px]'
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
        )}
      </div>

      {/* Main Workspace Content Area with Tabbed Navigation */}
      <div className='space-y-6'>
        {/* Navigation Tabs and Top Actions */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-4'>
          <div
            role='tablist'
            aria-label='Điều hướng không gian làm việc'
            className='flex items-center gap-2'
          >
            <button
              type='button'
              role='tab'
              id='tab-series'
              aria-selected={activeTab === 'series'}
              aria-controls='tabpanel-series'
              onClick={() => setActiveTab('series')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'series'
                  ? 'bg-stone-900 text-white shadow-soft-sm'
                  : 'bg-white/80 text-stone-600 hover:text-stone-900 hover:bg-white border border-stone-200/70'
              }`}
            >
              <BookOpen
                className={`w-4 h-4 ${activeTab === 'series' ? 'text-orange-400' : 'text-stone-400'}`}
              />
              <span>Bộ truyện</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                  activeTab === 'series' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
                }`}
              >
                {seriesList.length}
              </span>
            </button>

            {isProducerOrAdmin && (
              <button
                type='button'
                role='tab'
                id='tab-members'
                aria-selected={activeTab === 'members'}
                aria-controls='tabpanel-members'
                onClick={() => setActiveTab('members')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'members'
                    ? 'bg-stone-900 text-white shadow-soft-sm'
                    : 'bg-white/80 text-stone-600 hover:text-stone-900 hover:bg-white border border-stone-200/70'
                }`}
              >
                <Users
                  className={`w-4 h-4 ${activeTab === 'members' ? 'text-blue-400' : 'text-stone-400'}`}
                />
                <span>Thành viên Studio</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                    activeTab === 'members'
                      ? 'bg-white/20 text-white'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {members.length}
                </span>
              </button>
            )}
          </div>

          {/* Right Action Button for Current Tab */}
          <div className='flex items-center gap-2'>
            {isProducerOrAdmin && activeTab === 'members' && (
              <button
                type='button'
                onClick={() => setInviteModalOpen(true)}
                className='inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-soft-sm transition-all cursor-pointer'
              >
                <UserPlus className='w-4 h-4 text-orange-400' />
                <span>Mời thành viên mới</span>
              </button>
            )}
            {isProducerOrAdmin && activeTab === 'series' && (
              <button
                type='button'
                onClick={() => setCreateSeriesModalOpen(true)}
                className='inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-soft-sm transition-all cursor-pointer'
              >
                <Plus className='w-4 h-4' />
                <span>Tạo bộ truyện mới</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: Series Projects View */}
        {activeTab === 'series' && (
          <div
            role='tabpanel'
            id='tabpanel-series'
            aria-labelledby='tab-series'
            className='space-y-5'
          >
            {/* Error Message with Retry */}
            {loadError && (
              <div className='p-4 bg-red-50 border border-red-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-800 text-xs sm:text-sm shadow-soft-xs'>
                <div className='flex items-center gap-2.5'>
                  <AlertTriangle className='w-5 h-5 text-red-600 shrink-0' />
                  <span>{loadError}</span>
                </div>
                <button
                  type='button'
                  onClick={() => loadData()}
                  className='px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-colors'
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* Search, Filter & Sort Toolbar */}
            <div className='p-3.5 sm:p-4 bg-white/90 backdrop-blur-xs rounded-2xl border border-stone-200/80 shadow-soft-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3'>
              <div className='flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5'>
                {/* Search Input */}
                <div className='relative flex-1 min-w-[200px]'>
                  <Search className='w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none' />
                  <input
                    type='text'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder='Tìm bộ truyện theo tên, tóm tắt...'
                    className='w-full pl-9.5 pr-8 py-2 bg-stone-50/80 hover:bg-stone-50 focus:bg-white rounded-xl border border-stone-200/80 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all'
                  />
                  {searchQuery && (
                    <button
                      type='button'
                      onClick={() => setSearchQuery('')}
                      className='absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200/60 transition-colors'
                      aria-label='Xóa tìm kiếm'
                    >
                      <X className='w-3 h-3' />
                    </button>
                  )}
                </div>

                {/* Genre Filter */}
                <div className='relative'>
                  <select
                    value={genreFilter}
                    onChange={(e) => setGenreFilter(e.target.value)}
                    aria-label='Lọc theo thể loại'
                    className='w-full sm:w-auto px-3 py-2 bg-stone-50/80 hover:bg-stone-50 focus:bg-white rounded-xl border border-stone-200/80 text-xs font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer pr-8'
                  >
                    <option value='ALL'>Tất cả thể loại</option>
                    {availableGenres.map((g) => (
                      <option key={g} value={g}>
                        {formatGenre(g)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reading Direction Filter */}
                <div className='relative'>
                  <select
                    value={directionFilter}
                    onChange={(e) => setDirectionFilter(e.target.value)}
                    aria-label='Lọc theo định dạng đọc'
                    className='w-full sm:w-auto px-3 py-2 bg-stone-50/80 hover:bg-stone-50 focus:bg-white rounded-xl border border-stone-200/80 text-xs font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer pr-8'
                  >
                    <option value='ALL'>Tất cả định dạng đọc</option>
                    <option value='RTL'>Đọc phải → trái (RTL)</option>
                    <option value='LTR'>Đọc trái → phải (LTR)</option>
                    <option value='VERTICAL'>Cuộn dọc (Webtoon)</option>
                  </select>
                </div>
              </div>

              {/* Sort & Clear Options */}
              <div className='flex items-center justify-between lg:justify-end gap-2.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-stone-100'>
                <div className='flex items-center gap-1.5'>
                  <label
                    htmlFor='series-sort-select'
                    className='text-xs text-stone-500 font-medium whitespace-nowrap hidden sm:inline'
                  >
                    Sắp xếp:
                  </label>
                  <select
                    id='series-sort-select'
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className='px-3 py-2 bg-stone-50/80 hover:bg-stone-50 focus:bg-white rounded-xl border border-stone-200/80 text-xs font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer'
                  >
                    <option value='recent'>Mới cập nhật</option>
                    <option value='az'>Tên (A → Z)</option>
                    <option value='za'>Tên (Z → A)</option>
                    <option value='chapters'>Nhiều chương nhất</option>
                  </select>
                </div>

                {isFiltering && (
                  <button
                    type='button'
                    onClick={handleClearFilters}
                    className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer shrink-0'
                  >
                    <X className='w-3.5 h-3.5' />
                    <span>Xóa bộ lọc</span>
                  </button>
                )}
              </div>
            </div>

            {/* Result Stats Indicator */}
            <div className='flex items-center justify-between text-xs text-stone-500 px-1'>
              <p>
                Hiển thị{' '}
                <span className='font-bold text-stone-800'>{filteredAndSortedSeries.length}</span> /{' '}
                {seriesList.length} bộ truyện
                {isFiltering && (
                  <span className='text-orange-600 font-medium ml-1'>(đang lọc)</span>
                )}
              </p>
              {seriesList.length > 0 && (
                <span className='text-[11px] text-stone-400 italic hidden sm:inline'>
                  * Dữ liệu từ thư viện bộ truyện của Studio
                </span>
              )}
            </div>

            {/* Loading Skeleton */}
            {loading && seriesList.length === 0 ? (
              <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6'>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={`skeleton-${idx}`}
                    className='rounded-2xl bg-[#FCFBF8] border border-stone-200/80 p-4 sm:p-5 shadow-soft-xs space-y-4 animate-pulse'
                  >
                    <div className='flex gap-4'>
                      <div className='w-20 sm:w-24 aspect-[3/4] rounded-xl bg-stone-200 shrink-0' />
                      <div className='flex-1 space-y-2.5 py-1'>
                        <div className='h-4 bg-stone-200 rounded w-1/3' />
                        <div className='h-5 bg-stone-200 rounded w-4/5' />
                        <div className='h-3 bg-stone-100 rounded w-full' />
                        <div className='h-3 bg-stone-100 rounded w-2/3' />
                      </div>
                    </div>
                    <div className='pt-3 border-t border-stone-100 flex justify-between'>
                      <div className='h-3 bg-stone-100 rounded w-1/4' />
                      <div className='h-3 bg-stone-100 rounded w-1/4' />
                    </div>
                    <div className='pt-3 border-t border-stone-100 flex gap-2'>
                      <div className='h-11 bg-stone-200 rounded-xl flex-1' />
                      <div className='h-11 bg-stone-100 rounded-xl w-28' />
                    </div>
                  </div>
                ))}
              </div>
            ) : seriesList.length === 0 ? (
              /* Empty State: No series in workspace */
              <div className='py-16 px-6 text-center bg-white rounded-3xl border border-dashed border-stone-300 max-w-lg mx-auto my-6 space-y-4 shadow-soft-sm'>
                <div className='w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto shadow-inner'>
                  <BookOpen className='w-7 h-7' />
                </div>
                <div className='space-y-1.5'>
                  <h3 className='text-base font-bold text-stone-900'>
                    Chưa có bộ truyện nào trong Studio này
                  </h3>
                  <p className='text-xs text-stone-500 leading-relaxed max-w-sm mx-auto'>
                    Khởi tạo bộ truyện đầu tiên để thiết lập thể loại, định dạng đọc, quy trình sản
                    xuất và không gian sáng tác.
                  </p>
                </div>
                {isProducerOrAdmin && (
                  <button
                    type='button'
                    onClick={() => setCreateSeriesModalOpen(true)}
                    className='inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-soft-sm transition-all cursor-pointer'
                  >
                    <Plus className='w-4 h-4' />
                    <span>Tạo bộ truyện ngay</span>
                  </button>
                )}
              </div>
            ) : filteredAndSortedSeries.length === 0 ? (
              /* Empty State: Filter matched nothing */
              <div className='py-14 px-6 text-center bg-white rounded-3xl border border-stone-200/80 max-w-md mx-auto my-6 space-y-3 shadow-soft-sm'>
                <div className='w-12 h-12 rounded-xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto'>
                  <Search className='w-6 h-6' />
                </div>
                <h3 className='text-sm font-bold text-stone-800'>
                  Không tìm thấy bộ truyện phù hợp
                </h3>
                <p className='text-xs text-stone-500 leading-relaxed'>
                  Không có bộ truyện nào khớp với từ khóa tìm kiếm hoặc bộ lọc đã chọn.
                </p>
                <button
                  type='button'
                  onClick={handleClearFilters}
                  className='inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors cursor-pointer'
                >
                  <X className='w-3.5 h-3.5' />
                  <span>Xóa tất cả bộ lọc</span>
                </button>
              </div>
            ) : (
              /* Series Cards Grid */
              <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6'>
                {filteredAndSortedSeries.map((s) => (
                  <article
                    key={s.id}
                    className='group relative flex flex-col justify-between rounded-2xl bg-[#FCFBF8] border border-stone-200/80 hover:border-orange-400/80 hover:shadow-soft-md shadow-soft-xs transition-all duration-200 p-4 sm:p-5'
                  >
                    {/* Top Section: Left Thumbnail + Right Metadata */}
                    <div>
                      <div className='flex items-start gap-3.5'>
                        {/* Manga Style Thumbnail Fallback */}
                        <div
                          onClick={() => handleOpenSeries(s.id)}
                          className='w-20 sm:w-24 shrink-0 aspect-[3/4] rounded-xl overflow-hidden relative border border-stone-200/70 bg-gradient-to-br from-stone-100 via-stone-50 to-stone-200/80 flex flex-col justify-between p-2 shadow-2xs group-hover:border-orange-200 transition-colors cursor-pointer'
                          title={`Mở ${s.title}`}
                        >
                          {s.coverUrl && (
                            <AuthenticatedImage
                              src={s.coverUrl}
                              alt={`Bìa ${s.title}`}
                              className='absolute inset-0 w-full h-full object-cover'
                              fallback={null}
                            />
                          )}
                          {/* Top indicator: Chapter badge */}
                          <span className='relative text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/90 text-stone-700 shadow-2xs self-start backdrop-blur-xs border border-stone-200/50'>
                            #{s.chaptersCount ?? 0}
                          </span>

                          {/* Center: Serif Initial */}
                          <div className='flex-1 flex items-center justify-center'>
                            {!s.coverUrl && (
                              <span className='text-3xl sm:text-4xl font-serif font-bold text-stone-400/60 group-hover:text-orange-500/70 transition-colors select-none'>
                                {s.title.trim().charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>

                          {/* Bottom tag: Direction badge */}
                          <div className='relative text-[9px] font-medium text-stone-500 text-center truncate bg-white/80 rounded px-1 py-0.5 border border-stone-200/40'>
                            {formatReadingDirection(s.readingDirection).shortLabel}
                          </div>
                        </div>

                        {/* Title & Info */}
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-start justify-between gap-2'>
                            <span className='inline-block px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px] font-medium border border-stone-200/70 truncate'>
                              {formatGenre(s.genre || s.format)}
                            </span>

                            {/* Accessible 3-dots Menu for Producer / Admin */}
                            {isProducerOrAdmin && (
                              <div className='relative shrink-0' data-series-options-menu>
                                <button
                                  type='button'
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuSeriesId(openMenuSeriesId === s.id ? null : s.id);
                                  }}
                                  className='p-1.5 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center'
                                  aria-label={`Tùy chọn cho bộ truyện ${s.title}`}
                                  aria-haspopup='menu'
                                  aria-expanded={openMenuSeriesId === s.id}
                                >
                                  <MoreVertical className='w-4 h-4' />
                                </button>

                                {openMenuSeriesId === s.id && (
                                  <div
                                    role='menu'
                                    aria-label={`Tùy chọn ${s.title}`}
                                    className='absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-stone-200 z-20 py-1 overflow-hidden'
                                  >
                                    <button
                                      type='button'
                                      role='menuitem'
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuSeriesId(null);
                                        setSelectedPipelineSeries({ id: s.id, title: s.title });
                                      }}
                                      className='w-full text-left px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2 transition-colors cursor-pointer'
                                    >
                                      <Sliders className='w-3.5 h-3.5 text-blue-500' />
                                      <span>Cấu hình Pipeline</span>
                                    </button>
                                    <button
                                      type='button'
                                      role='menuitem'
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuSeriesId(null);
                                        setSelectedPresetsSeries({ id: s.id, title: s.title });
                                      }}
                                      className='w-full text-left px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2 transition-colors cursor-pointer'
                                    >
                                      <ListOrdered className='w-3.5 h-3.5 text-purple-500' />
                                      <span>Typography Presets</span>
                                    </button>
                                    <div className='border-t border-stone-100 my-1' />
                                    <button
                                      type='button'
                                      role='menuitem'
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuSeriesId(null);
                                        coverTargetRef.current = s.id;
                                        coverInputRef.current?.click();
                                      }}
                                      className='w-full text-left px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2 transition-colors cursor-pointer'
                                    >
                                      <ImagePlus className='w-3.5 h-3.5 text-orange-500' />
                                      <span>{s.coverUrl ? 'Đổi ảnh bìa' : 'Thêm ảnh bìa'}</span>
                                    </button>
                                    {s.coverUrl && (
                                      <button
                                        type='button'
                                        role='menuitem'
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenMenuSeriesId(null);
                                          void handleClearCover(s.id);
                                        }}
                                        className='w-full text-left px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2 transition-colors cursor-pointer'
                                      >
                                        <ImageOff className='w-3.5 h-3.5 text-stone-500' />
                                        <span>Xoá ảnh bìa</span>
                                      </button>
                                    )}
                                    <button
                                      type='button'
                                      role='menuitem'
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuSeriesId(null);
                                        handleOpenEditSeries(s);
                                      }}
                                      className='w-full text-left px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 flex items-center gap-2 transition-colors cursor-pointer'
                                    >
                                      <Edit2 className='w-3.5 h-3.5 text-stone-600' />
                                      <span>Chỉnh sửa thông tin</span>
                                    </button>
                                    <button
                                      type='button'
                                      role='menuitem'
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuSeriesId(null);
                                        setDeleteSeriesModal(s);
                                      }}
                                      className='w-full text-left px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer'
                                    >
                                      <Trash2 className='w-3.5 h-3.5' />
                                      <span>Xóa bộ truyện</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Series Title */}
                          <h3
                            onClick={() => handleOpenSeries(s.id)}
                            className='text-base sm:text-lg font-serif font-bold text-stone-900 group-hover:text-orange-600 transition-colors line-clamp-2 leading-snug mt-1.5 cursor-pointer'
                            title={s.title}
                          >
                            {s.title}
                          </h3>

                          {/* Synopsis */}
                          {s.synopsis ? (
                            <p
                              className='text-xs text-stone-600 line-clamp-2 leading-relaxed mt-1.5'
                              title={s.synopsis}
                            >
                              {s.synopsis}
                            </p>
                          ) : (
                            <p className='text-xs text-stone-400 italic mt-1.5'>
                              Chưa có phần tóm tắt nội dung
                            </p>
                          )}

                          {/* Story Arc */}
                          {s.storyArc && (
                            <div className='mt-2 px-2 py-1 bg-amber-50/80 border border-amber-200/60 rounded-md text-[11px] text-amber-900 line-clamp-1'>
                              <span className='font-semibold text-amber-700 mr-1'>Arc:</span>
                              {s.storyArc}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Middle Metadata: Direction and Update/Creation Date */}
                      <div className='mt-3.5 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500'>
                        <div className='flex items-center gap-1.5'>
                          <Compass className='w-3.5 h-3.5 text-stone-400' />
                          <span className='text-stone-600 font-medium'>
                            {formatReadingDirection(s.readingDirection).label}
                          </span>
                        </div>

                        {(s.updatedAt || s.createdAt) && (
                          <div
                            className='flex items-center gap-1 text-[11px] text-stone-400'
                            title={`Cập nhật: ${formatSeriesDate(s.updatedAt || s.createdAt)}`}
                          >
                            <History className='w-3 h-3 text-stone-400' />
                            <span>{formatSeriesDate(s.updatedAt || s.createdAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions Footer: Primary Open Button + Secondary Chapters Button */}
                    <div className='mt-4 pt-3.5 border-t border-stone-100 flex items-center gap-2'>
                      {/* Main Action: Open Series (Route to user's role workspace) */}
                      <button
                        type='button'
                        onClick={() => handleOpenSeries(s.id)}
                        className='flex-1 h-11 px-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-soft-xs hover:shadow-soft-sm active:scale-98 cursor-pointer'
                        title={`Mở không gian làm việc của bộ truyện ${s.title}`}
                      >
                        <span>Mở bộ truyện</span>
                        <ArrowRight className='w-3.5 h-3.5 text-orange-400' />
                      </button>

                      {/* Secondary Action: Manage Chapters Modal */}
                      <button
                        type='button'
                        onClick={() => setSelectedChapterSeries({ id: s.id, title: s.title })}
                        className='h-11 px-3.5 bg-stone-100 hover:bg-stone-200/80 text-stone-700 hover:text-stone-900 border border-stone-200/60 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0'
                        title={`Xem danh sách các chương của ${s.title}`}
                      >
                        <BookOpen className='w-3.5 h-3.5 text-orange-500' />
                        <span>Chương ({s.chaptersCount ?? 0})</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Studio Members View */}
        {activeTab === 'members' && (
          <div
            role='tabpanel'
            id='tabpanel-members'
            aria-labelledby='tab-members'
            className='space-y-6'
          >
            {/* Tab Selection Row & Search */}
            <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
              <div className='flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 custom-scrollbar'>
                {[
                  { key: 'ALL', label: 'Tất cả thành viên', count: tabCounts.ALL },
                  { key: 'LEAD', label: 'Giám đốc Sản xuất', count: tabCounts.LEAD },
                  { key: 'ARTIST', label: 'Họa sĩ', count: tabCounts.ARTIST },
                  { key: 'WRITER', label: 'Biên kịch & Storyboard', count: tabCounts.WRITER },
                  { key: 'EDITOR', label: 'Biên tập viên', count: tabCounts.EDITOR },
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
                  placeholder='Tìm kiếm thành viên theo tên, vai trò...'
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

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>
                    Định Dạng (Format)
                  </label>
                  <select
                    value={newSeriesFormat}
                    onChange={(e) => {
                      const fmt = e.target.value;
                      setNewSeriesFormat(fmt);
                      if (fmt === 'MANGA') setNewSeriesDirection(1);
                      else if (fmt === 'COMIC') setNewSeriesDirection(0);
                      else if (fmt === 'WEBTOON') setNewSeriesDirection(2);
                    }}
                    className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                  >
                    <option value='WEBTOON'>Webtoon (Cuộn dọc)</option>
                    <option value='MANGA'>Manga (Phải sang Trái)</option>
                    <option value='COMIC'>Comic (Trái sang Phải)</option>
                  </select>
                </div>
                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>
                    Hướng Đọc (Reading Direction - BR-14)
                  </label>
                  <select
                    value={newSeriesDirection}
                    onChange={(e) => setNewSeriesDirection(Number(e.target.value))}
                    className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                  >
                    <option value={1}>Phải sang Trái (Manga RTL - BR-14)</option>
                    <option value={0}>Trái sang Phải (Comic LTR)</option>
                    <option value={2}>Cuộn Dọc (Webtoon Vertical)</option>
                  </select>
                </div>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>
                    Thể Loại (Genre)
                  </label>
                  <input
                    type='text'
                    value={newSeriesGenre}
                    onChange={(e) => setNewSeriesGenre(e.target.value)}
                    placeholder='Ví dụ: Shonen, Action, Sci-Fi...'
                    className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                  />
                </div>
                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>
                    Tuyến Truyện / Phần (Story Arc)
                  </label>
                  <input
                    type='text'
                    value={newSeriesStoryArc}
                    onChange={(e) => setNewSeriesStoryArc(e.target.value)}
                    placeholder='Ví dụ: Arc 1: Khởi nguồn'
                    className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                  />
                </div>
              </div>

              {pipelineTemplates.length > 0 && (
                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>
                    Mẫu Quy Trình Sản Xuất (Pipeline Template)
                  </label>
                  <select
                    value={newSeriesTemplateId}
                    onChange={(e) => setNewSeriesTemplateId(e.target.value)}
                    className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316]'
                  >
                    {pipelineTemplates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name} {tpl.isDefault ? '(Mặc định)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className='block font-semibold text-[#171717] mb-1'>
                  Tóm Tắt Cốt Truyện (Synopsis)
                </label>
                <textarea
                  rows={2}
                  value={newSeriesSynopsis}
                  onChange={(e) => setNewSeriesSynopsis(e.target.value)}
                  placeholder='Mô tả ngắn gọn bối cảnh và cốt truyện chính của dự án...'
                  className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg focus:outline-none focus:border-[#F97316] resize-none'
                />
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
