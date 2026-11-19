import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Briefcase,
  Plus,
  Users,
  CheckCircle2,
  X,
  BookOpen,
  UserPlus,
  AlertTriangle,
  Search,
  HardDrive,
  Layers,
  Calendar,
  History,
} from 'lucide-react';
import {
  workspaceService,
  WorkspaceDto,
  WorkspaceMemberDto,
  WorkspaceUsageDto,
} from '@/services/workspace.service';
import { pipelineService, PipelineTemplateDto } from '@/services/pipeline.service';
import { seriesService, SeriesDto } from '@/services/series.service';
import { SeriesPipelineModal } from '@/roles/producer/modals/SeriesPipelineModal';
import { SeriesPresetsModal } from '@/roles/producer/modals/SeriesPresetsModal';
import { SeriesMembersModal } from '@/roles/producer/modals/SeriesMembersModal';
import { InviteMemberModal } from '@/roles/producer/modals/InviteMemberModal';
import { systemImageToFile, type SystemImage } from '@/shared/utils/systemImages';
import { getRoleDefaultPath } from '@/roles/roles';
import { normalizeWorkspaceRole } from '@/types/auth';
import { readCachedWorkspace, writeCachedWorkspace } from '@/types/workspace';
import { StudioGovernanceBar } from './studio-overview/StudioGovernanceBar';
import { SeriesFilterBar, type SeriesStatusFilter } from './studio-overview/SeriesFilterBar';
import { SeriesShelf } from './studio-overview/SeriesShelf';
import { MembersTabContent } from './studio-overview/MembersTabContent';
import { StudioScheduleTab } from './studio-overview/StudioScheduleTab';
import { StudioAuditTab } from './studio-overview/StudioAuditTab';
import { StudioSwitcher } from '@/shared/components/StudioSwitcher';
import { Alert } from '@/shared/ui';
import {
  CoverPickerModal,
  CreateSeriesModal,
  EditSeriesModal,
} from './studio-overview/SeriesModals';
import { WorkspaceAuditModal, EditMemberAccessModal } from './studio-overview/StudioModals';
import { useConfirm } from '@/shared/context/ConfirmContext';
import { useToast } from '@/shared/context/ToastContext';
import { formatReadingDirection } from './studio-overview/formatters';
import { useTranslation } from '@/lib/i18n';

export const StudioOverviewView: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { workspaceId } = useParams();
  const [, setWorkspaces] = useState<WorkspaceDto[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceDto | null>(() =>
    readCachedWorkspace(),
  );

  const userRole = localStorage.getItem('userRole');
  const wsRole =
    normalizeWorkspaceRole(activeWorkspace?.currentUserRole) ||
    (activeWorkspace ? normalizeWorkspaceRole(localStorage.getItem('workspaceRole')) : null);
  const isProducer = wsRole === 'PRODUCER' || !!activeWorkspace?.isOwner;
  const isProducerOrAdmin = userRole === 'ADMINISTRATOR' || isProducer;

  const [members, setMembers] = useState<WorkspaceMemberDto[]>([]);
  const [seriesList, setSeriesList] = useState<SeriesDto[]>([]);
  const [activeTab, setActiveTab] = useState<'series' | 'members' | 'schedule' | 'audit'>('series');
  const [loading, setLoading] = useState(false);

  // Selected series for UC-03 Modals
  const [selectedPipelineSeries, setSelectedPipelineSeries] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [selectedPresetsSeries, setSelectedPresetsSeries] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [selectedMembersSeries, setSelectedMembersSeries] = useState<{
    id: string;
    title: string;
  } | null>(null);

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
  const [editSeriesCompleted, setEditSeriesCompleted] = useState(false);
  const [editSeriesOriginalLanguage, setEditSeriesOriginalLanguage] = useState('vi');
  const [editSeriesReleaseLanguages, setEditSeriesReleaseLanguages] = useState<string[]>([
    'vi',
    'en',
  ]);
  const [updatingSeries, setUpdatingSeries] = useState(false);

  // Workspace Usage (NFR Resource Governance - Storage & AI Tokens)
  const [workspaceUsage, setWorkspaceUsage] = useState<WorkspaceUsageDto | null>(null);

  // Workspace Audit Modal State (F8)
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilterEntity, setAuditFilterEntity] = useState('');

  // Members UI States
  const [memberRoleFilter, setMemberRoleFilter] = useState<
    'ALL' | 'LEAD' | 'ARTIST' | 'WRITER' | 'EDITOR'
  >('ALL');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [editingMember, setEditingMember] = useState<any>(null);
  const [editRole, setEditRole] = useState('');
  const [editTask, setEditTask] = useState('');

  // Search, Filter & Sort states for Series Library
  const [searchQuery, setSearchQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('ALL');
  const [directionFilter, setDirectionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<SeriesStatusFilter>('ALL');
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

  const toast = useToast();
  const showToast = toast.showToast;

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

  const activeWorkspaceIdRef = React.useRef<string | undefined>(activeWorkspace?.id);
  const inFlightLoadRef = React.useRef<Promise<void> | null>(null);
  const templatesLoadedRef = React.useRef(false);

  const loadData = React.useCallback(async () => {
    if (inFlightLoadRef.current) return inFlightLoadRef.current;
    const run = (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const wsList = await workspaceService.getMyWorkspaces();
        if (wsList && wsList.length > 0) {
          setWorkspaces(wsList);
          const fallbackId = activeWorkspaceIdRef.current;
          const cur = workspaceId
            ? wsList.find((w) => w.id === workspaceId) ||
              wsList.find((w) => w.id === fallbackId) ||
              wsList[0]
            : wsList.find((w) => w.id === fallbackId) || wsList[0];
          activeWorkspaceIdRef.current = cur.id;
          setActiveWorkspace(cur);

          let memList: WorkspaceMemberDto[] = [];
          try {
            memList = await workspaceService.getMembers(cur.id);
            setMembers(memList);
          } catch {
            setMembers([]);
          }

          const resolvedWsRole =
            normalizeWorkspaceRole(cur.currentUserRole) ||
            normalizeWorkspaceRole(
              memList.find(
                (m) =>
                  (currentUser?.id && m.userId === currentUser.id) ||
                  (currentUser?.email && m.email === currentUser.email),
              )?.role,
            );
          const syncedCur = writeCachedWorkspace(
            {
              ...cur,
              currentUserRole: resolvedWsRole ?? normalizeWorkspaceRole(cur.currentUserRole),
            },
            currentUser?.id,
          );
          setActiveWorkspace(syncedCur);
          try {
            if (resolvedWsRole) localStorage.setItem('workspaceRole', resolvedWsRole);
            else localStorage.removeItem('workspaceRole');
          } catch {
            /* ignore */
          }
          const isCurrentProducer = !!cur.isOwner || resolvedWsRole === 'PRODUCER';

          // Load Workspace Resource Usage (GET /api/workspaces/{id}/usage) — chỉ gọi khi role hiện tại là Producer
          if (isCurrentProducer) {
            try {
              const usage = await workspaceService.getWorkspaceUsage(cur.id);
              setWorkspaceUsage(usage);
            } catch {
              setWorkspaceUsage(null);
            }
          } else {
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
        inFlightLoadRef.current = null;
        setLoading(false);
      }
    })();
    inFlightLoadRef.current = run;
    return run;
    // Chỉ nạp lại khi đổi workspaceId trên URL; tránh phụ thuộc activeWorkspace?.id gây gọi lặp.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Load Active Pipeline Templates from API (GET /api/pipeline-templates) (B1 / UC-03)
  useEffect(() => {
    if (templatesLoadedRef.current) return;
    templatesLoadedRef.current = true;
    const fetchTemplates = async () => {
      try {
        const templates = await pipelineService.getActivePipelineTemplates();
        setPipelineTemplates(templates);
      } catch (err: any) {
        console.warn('Lỗi tải danh sách template pipeline:', err);
      }
    };
    void fetchTemplates();
  }, []);

  const handleCreateSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) {
      showToast('Lỗi', 'Chọn hoặc tạo Studio Workspace trước.');
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
      setNewSeriesTemplateId('');
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

  // Edit Series Handlers (F5)
  const [coverPickerSeries, setCoverPickerSeries] = useState<{ id: string; title: string } | null>(
    null,
  );
  const [savingCoverId, setSavingCoverId] = useState<string | null>(null);
  const setSeriesCover = (seriesId: string, coverUrl: string | null) =>
    setSeriesList((prev) => prev.map((x) => (x.id === seriesId ? { ...x, coverUrl } : x)));

  const handlePickSystemCover = async (img: SystemImage) => {
    const target = coverPickerSeries;
    if (!target || savingCoverId) return;
    setSavingCoverId(img.id);
    try {
      const file = await systemImageToFile(img);
      setSeriesCover(target.id, await seriesService.setCover(target.id, file));
      showToast('Đã cập nhật ảnh bìa', `${target.title}: ${img.name}`);
      setCoverPickerSeries(null);
    } catch (err: any) {
      showToast('Lỗi ảnh bìa', err.message);
    } finally {
      setSavingCoverId(null);
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
    setEditSeriesCompleted(Boolean(s.isCompleted));
    setEditSeriesOriginalLanguage(s.originalLanguage || 'vi');
    setEditSeriesReleaseLanguages(
      s.releaseLanguages && s.releaseLanguages.length > 0 ? s.releaseLanguages : ['vi', 'en'],
    );
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
        isCompleted: editSeriesCompleted,
      });

      let finalSeries = updated;
      try {
        const langUpdated = await seriesService.updateSeriesLanguages(
          editingSeries.id,
          editSeriesOriginalLanguage,
          editSeriesReleaseLanguages,
        );
        finalSeries = {
          ...updated,
          originalLanguage: langUpdated.originalLanguage,
          releaseLanguages: langUpdated.releaseLanguages,
        };
      } catch (langErr) {
        console.warn('Lỗi cập nhật cấu hình ngôn ngữ series:', langErr);
      }

      setSeriesList((prev) => prev.map((s) => (s.id === finalSeries.id ? finalSeries : s)));
      setEditingSeries(null);
      showToast('Cập nhật thành công', `Đã cập nhật thông tin Series "${finalSeries.title}".`);
    } catch (err: any) {
      showToast('Lỗi cập nhật Series', err.message);
    } finally {
      setUpdatingSeries(false);
    }
  };

  // Delete Series Handlers (F5) - Lucian Confirm & Toast
  const handleDeleteSeries = async (series: SeriesDto) => {
    if (
      !(await confirm({
        title: `Xóa bộ truyện "${series.title}"?`,
        description: 'Thao tác này sẽ xóa Series và toàn bộ dữ liệu liên quan khỏi Workspace.',
        confirmText: 'Xác nhận xóa Series',
        cancelText: 'Giữ lại',
        variant: 'danger',
      }))
    )
      return;

    try {
      await seriesService.deleteSeries(series.id);
      setSeriesList((prev) => prev.filter((s) => s.id !== series.id));
      toast.success(
        'Đã xóa Series thành công',
        `Bộ truyện "${series.title}" đã được xóa khỏi Workspace.`,
      );
    } catch (err: any) {
      toast.error('Lỗi xóa Series', err.message || 'Không thể xóa Series.');
    }
  };

  // Delete Member Handlers - Lucian Confirm & Toast
  const handleDeleteMember = async (member: { id: string; email: string }) => {
    if (!activeWorkspace) return;
    if (
      !(await confirm({
        title: 'Xóa thành viên khỏi Workspace?',
        description: `Bạn có chắc chắn muốn xóa thành viên "${member.email}" khỏi Workspace? Quyền truy cập Studio sẽ bị thu hồi ngay lập tức.`,
        confirmText: 'Xác nhận xóa thành viên',
        cancelText: 'Giữ lại',
        variant: 'danger',
      }))
    )
      return;

    try {
      await workspaceService.removeMember(activeWorkspace.id, member.id);
      setMembers((prev) => prev.filter((m) => m.userId !== member.id));
      toast.success('Đã xóa thành viên thành công', `Đã xóa ${member.email} khỏi Workspace.`);
    } catch (err: any) {
      toast.error(
        'Xóa thành viên thất bại',
        err.message || 'Không thể xóa thành viên khỏi Workspace.',
      );
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace, auditFilterEntity]);

  useEffect(() => {
    if (auditModalOpen) {
      loadWorkspaceAudit();
    }
  }, [auditModalOpen, loadWorkspaceAudit]);

  useEffect(() => {
    if (activeTab === 'audit' && auditLogs.length === 0 && activeWorkspace) {
      loadWorkspaceAudit();
    }
  }, [activeTab, activeWorkspace, auditLogs.length, loadWorkspaceAudit]);

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

  const handleOpenSeries = (sId: string) => {
    const wsId = activeWorkspace?.id || workspaceId;
    const dest = getRoleDefaultPath(wsRole || userRole, wsId, sId);
    navigate(dest);
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

        const isCompleted = s.isCompleted;
        const isPreProd = !isCompleted && (s.chaptersCount ?? 0) === 0;
        const isInProd = !isCompleted && (s.chaptersCount ?? 0) > 0;
        const matchesStatus =
          statusFilter === 'ALL' ||
          (statusFilter === 'COMPLETED' && isCompleted) ||
          (statusFilter === 'IN_PROD' && isInProd) ||
          (statusFilter === 'PRE_PROD' && isPreProd);

        return matchesSearch && matchesGenre && matchesDirection && matchesStatus;
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
  }, [seriesList, searchQuery, genreFilter, directionFilter, statusFilter, sortBy]);

  const statusCounts = useMemo(() => {
    let inProd = 0;
    let preProd = 0;
    let completed = 0;
    seriesList.forEach((s) => {
      if (s.isCompleted) completed++;
      else if ((s.chaptersCount ?? 0) > 0) inProd++;
      else preProd++;
    });
    return {
      all: seriesList.length,
      inProd,
      preProd,
      completed,
    };
  }, [seriesList]);

  const isFiltering =
    searchQuery.trim() !== '' ||
    genreFilter !== 'ALL' ||
    directionFilter !== 'ALL' ||
    statusFilter !== 'ALL';

  const handleClearFilters = () => {
    setSearchQuery('');
    setGenreFilter('ALL');
    setDirectionFilter('ALL');
    setStatusFilter('ALL');
  };

  return (
    <div className='flex-1 bg-[#FAF9F5] min-h-screen p-4 md:p-6 space-y-5 text-stone-900 font-sans'>
      {/* Chọn ảnh bìa có sẵn của hệ thống */}
      <CoverPickerModal
        series={coverPickerSeries}
        savingCoverId={savingCoverId}
        onClose={() => !savingCoverId && setCoverPickerSeries(null)}
        onPickSystemCover={(img) => void handlePickSystemCover(img)}
      />

      {/* Header Banner: Studio Series Library Header */}
      <div className='bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div>
            <div className='flex items-center gap-2.5 mb-2'>
              <StudioSwitcher
                activeWorkspaceId={activeWorkspace?.id || workspaceId}
                activeWorkspaceName={activeWorkspace?.name}
                onCreateNewStudio={() => navigate('/workspaces?create=true')}
                onSelectStudio={(ws) => {
                  const normalizedWs = ws as any;
                  setActiveWorkspace(normalizedWs);
                  writeCachedWorkspace(normalizedWs, currentUser?.id);
                  navigate(`/workspaces/${ws.id}`);
                }}
              />
            </div>
            <h1 className='text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight mt-1'>
              {t('workspace.library.title')}
            </h1>
            <p className='text-xs sm:text-sm text-stone-600 mt-1 leading-relaxed max-w-2xl'>
              {t(
                `workspace.library.subtitle.${isProducer ? 'PRODUCER' : (wsRole ?? 'default')}`,
                t('workspace.library.subtitle.default'),
              )}
            </p>
          </div>

          {isProducerOrAdmin && (
            <div className='flex items-center gap-2.5 shrink-0'>
              <button
                type='button'
                onClick={() => setCreateSeriesModalOpen(true)}
                className='inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-semibold shadow-xs active:scale-[0.98] transition-all cursor-pointer'
              >
                <Plus className='w-4 h-4' />
                <span>Tạo bộ truyện</span>
                <span className='sr-only'>Tạo Series Mới</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Studio Operational Metrics (Stitch Architecture) */}
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1'>
          <div className='bg-[#FAF9F5] p-3.5 sm:p-4 rounded-xl border border-stone-200 shadow-2xs space-y-1.5'>
            <div className='flex items-center justify-between text-xs text-stone-500 font-semibold'>
              <span>Bộ truyện</span>
              <BookOpen className='w-4 h-4 text-orange-600' />
            </div>
            <div className='text-xl sm:text-2xl font-mono font-bold text-stone-900'>
              {seriesList.length}{' '}
              <span className='text-xs font-sans text-stone-500 font-normal'>Dự án</span>
            </div>
            <div className='text-[11px] text-emerald-700 font-semibold flex items-center gap-1 truncate'>
              <span className='w-1.5 h-1.5 rounded-full bg-emerald-600' />
              <span>{seriesList.filter((s) => !s.isCompleted).length} Đang sản xuất</span>
            </div>
          </div>

          <div className='bg-[#FAF9F5] p-3.5 sm:p-4 rounded-xl border border-stone-200 shadow-2xs space-y-1.5'>
            <div className='flex items-center justify-between text-xs text-stone-500 font-semibold'>
              <span>Lưu trữ Studio</span>
              <HardDrive className='w-4 h-4 text-sky-600' />
            </div>
            <div className='text-xl sm:text-2xl font-mono font-bold text-stone-900'>
              {(() => {
                const used = workspaceUsage
                  ? workspaceUsage.storage.used
                  : activeWorkspace?.usedStorageBytes || 0;
                const quota = workspaceUsage
                  ? workspaceUsage.storage.quota
                  : activeWorkspace?.storageQuotaBytes || 0;
                const pct = quota > 0 ? Math.round((used / quota) * 100) : 0;
                return `${pct}%`;
              })()}
              <span className='text-xs font-sans text-stone-500 font-normal ml-1.5'>đã dùng</span>
            </div>
            <div className='w-full bg-stone-100 h-1.5 rounded-full overflow-hidden'>
              <div
                className='bg-sky-600 h-full rounded-full transition-all duration-300'
                style={{
                  width: `${Math.min(
                    100,
                    (() => {
                      const used = workspaceUsage
                        ? workspaceUsage.storage.used
                        : activeWorkspace?.usedStorageBytes || 0;
                      const quota = workspaceUsage
                        ? workspaceUsage.storage.quota
                        : activeWorkspace?.storageQuotaBytes || 0;
                      return quota > 0 ? (used / quota) * 100 : 0;
                    })(),
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className='bg-[#FAF9F5] p-3.5 sm:p-4 rounded-xl border border-stone-200 shadow-2xs space-y-1.5'>
            <div className='flex items-center justify-between text-xs text-stone-500 font-semibold'>
              <span>Nhân sự Studio</span>
              <Users className='w-4 h-4 text-emerald-600' />
            </div>
            <div className='text-xl sm:text-2xl font-mono font-bold text-stone-900'>
              {members.length}{' '}
              <span className='text-xs font-sans text-stone-500 font-normal'>Thành viên</span>
            </div>
            <div className='text-[11px] text-stone-600 font-medium truncate'>
              {members.filter((m) => m.isEmailConfirmed !== false).length} Đang hoạt động
            </div>
          </div>

          <div className='bg-[#FAF9F5] p-3.5 sm:p-4 rounded-xl border border-stone-200 shadow-2xs space-y-1.5'>
            <div className='flex items-center justify-between text-xs text-stone-500 font-semibold'>
              <span>Tổng số chương</span>
              <Layers className='w-4 h-4 text-purple-600' />
            </div>
            <div className='text-xl sm:text-2xl font-mono font-bold text-stone-900'>
              {seriesList.reduce((acc, s) => acc + (s.chaptersCount ?? 0), 0)}{' '}
              <span className='text-xs font-sans text-stone-500 font-normal'>Chương</span>
            </div>
            <div className='text-[11px] text-stone-600 font-medium truncate'>Toàn bộ tác phẩm</div>
          </div>
        </div>

        {/* Studio Resource Governance (Compact & Collapsible) - Shown for Producer */}
        {activeWorkspace && isProducer && (
          <StudioGovernanceBar
            activeWorkspace={activeWorkspace}
            workspaceUsage={workspaceUsage}
            isResourcesExpanded={isResourcesExpanded}
            onToggleResourcesExpanded={() => setIsResourcesExpanded(!isResourcesExpanded)}
            onOpenAuditModal={() => setAuditModalOpen(true)}
          />
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'series'
                  ? 'bg-orange-50 text-stone-900 border border-orange-500 shadow-2xs'
                  : 'bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-50 border border-stone-200'
              }`}
            >
              <BookOpen
                className={`w-4 h-4 ${activeTab === 'series' ? 'text-orange-600' : 'text-stone-400'}`}
              />
              <span>Bộ truyện</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                  activeTab === 'series'
                    ? 'bg-orange-600 text-white'
                    : 'bg-stone-100 text-stone-600'
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
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'members'
                    ? 'bg-orange-50 text-stone-900 border border-orange-500 shadow-2xs'
                    : 'bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-50 border border-stone-200'
                }`}
              >
                <Users
                  className={`w-4 h-4 ${activeTab === 'members' ? 'text-orange-600' : 'text-stone-400'}`}
                />
                <span>Thành viên Studio</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                    activeTab === 'members'
                      ? 'bg-orange-600 text-white'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {members.length}
                </span>
              </button>
            )}

            {/* Tab 3: Lịch phát hành tổng */}
            <button
              type='button'
              role='tab'
              id='tab-schedule'
              aria-selected={activeTab === 'schedule'}
              aria-controls='tabpanel-schedule'
              onClick={() => setActiveTab('schedule')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'schedule'
                  ? 'bg-orange-50 text-stone-900 border border-orange-500 shadow-2xs'
                  : 'bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-50 border border-stone-200'
              }`}
            >
              <Calendar
                className={`w-4 h-4 ${activeTab === 'schedule' ? 'text-orange-600' : 'text-stone-400'}`}
              />
              <span>Lịch phát hành</span>
            </button>

            {/* Tab 4: Nhật ký hoạt động */}
            {isProducerOrAdmin && (
              <button
                type='button'
                role='tab'
                id='tab-audit'
                aria-selected={activeTab === 'audit'}
                aria-controls='tabpanel-audit'
                onClick={() => setActiveTab('audit')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'audit'
                    ? 'bg-orange-50 text-stone-900 border border-orange-500 shadow-2xs'
                    : 'bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-50 border border-stone-200'
                }`}
              >
                <History
                  className={`w-4 h-4 ${activeTab === 'audit' ? 'text-orange-600' : 'text-stone-400'}`}
                />
                <span>Nhật ký hoạt động</span>
              </button>
            )}
          </div>

          {/* Right Action Button for Current Tab */}
          <div className='flex items-center gap-2'>
            {isProducerOrAdmin && activeTab === 'members' && (
              <button
                type='button'
                onClick={() => setInviteModalOpen(true)}
                className='inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer'
              >
                <UserPlus className='w-4 h-4' />
                <span>Mời thành viên mới</span>
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
              <Alert tone='danger' className='text-xs sm:text-sm'>
                <div className='flex items-center gap-2.5'>
                  <AlertTriangle className='w-5 h-5 text-rose-600 shrink-0' aria-hidden='true' />
                  <span>{loadError}</span>
                </div>
                <button
                  type='button'
                  onClick={() => loadData()}
                  className='btn-cta-danger focus-ring min-h-9 px-3.5 text-xs font-semibold cursor-pointer shrink-0'
                >
                  Thử lại
                </button>
              </Alert>
            )}

            {/* Search, Filter & Sort Toolbar */}
            <SeriesFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onClearSearch={() => setSearchQuery('')}
              genreFilter={genreFilter}
              onGenreFilterChange={setGenreFilter}
              availableGenres={availableGenres}
              directionFilter={directionFilter}
              onDirectionFilterChange={setDirectionFilter}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              statusCounts={statusCounts}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              isFiltering={isFiltering}
              onClearFilters={handleClearFilters}
              displayedCount={filteredAndSortedSeries.length}
              totalCount={seriesList.length}
            />

            <SeriesShelf
              loading={loading}
              totalCount={seriesList.length}
              series={filteredAndSortedSeries}
              canCreate={isProducerOrAdmin}
              openMenuSeriesId={openMenuSeriesId}
              onToggleMenu={(id) => setOpenMenuSeriesId(openMenuSeriesId === id ? null : id)}
              onCreateSeries={() => setCreateSeriesModalOpen(true)}
              onClearFilters={handleClearFilters}
              onOpenSeries={handleOpenSeries}
              openLabel={t(
                `workspace.library.open.${isProducer ? 'default' : (wsRole ?? 'default')}`,
                t('workspace.library.open.default'),
              )}
              onOpenPipeline={(ser) => setSelectedPipelineSeries(ser)}
              onOpenPresets={(ser) => setSelectedPresetsSeries(ser)}
              onOpenMembers={(ser) => setSelectedMembersSeries(ser)}
              onPickCover={(ser) => setCoverPickerSeries(ser)}
              onClearCover={(sId) => void handleClearCover(sId)}
              onEditSeries={handleOpenEditSeries}
              onDeleteSeries={handleDeleteSeries}
            />
          </div>
        )}

        {/* TAB 2: Studio Members View */}
        {activeTab === 'members' && (
          <MembersTabContent
            filteredMembers={filteredMembers}
            tabCounts={tabCounts}
            memberRoleFilter={memberRoleFilter}
            onMemberRoleFilterChange={setMemberRoleFilter}
            memberSearchQuery={memberSearchQuery}
            onMemberSearchQueryChange={setMemberSearchQuery}
            canCreateStudio={canCreateStudio}
            onResendInvitation={handleResendInvitation}
            onOpenEditAccess={handleOpenEditAccess}
            onDeleteMember={handleDeleteMember}
          />
        )}

        {/* TAB 3: Release Schedule View */}
        {activeTab === 'schedule' && (
          <StudioScheduleTab
            seriesList={seriesList}
            workspaceId={activeWorkspace?.id || workspaceId}
            isProducer={isProducer}
          />
        )}

        {/* TAB 4: Audit Logs View */}
        {activeTab === 'audit' && (
          <StudioAuditTab
            logs={auditLogs}
            loading={auditLoading}
            filterEntity={auditFilterEntity}
            onFilterChange={setAuditFilterEntity}
            onRefresh={loadWorkspaceAudit}
            workspaceName={activeWorkspace?.name}
          />
        )}
      </div>

      {/* Invite Member Modal */}
      {activeWorkspace && (
        <InviteMemberModal
          isOpen={inviteModalOpen}
          workspaceId={activeWorkspace.id}
          workspaceName={activeWorkspace.name}
          onClose={() => setInviteModalOpen(false)}
          onInvited={async () => {
            const memList = await workspaceService.getMembers(activeWorkspace.id);
            setMembers(memList);
          }}
          onShowToast={showToast}
        />
      )}

      {/* UC-03: Create Series Modal */}
      <CreateSeriesModal
        isOpen={createSeriesModalOpen}
        onClose={() => setCreateSeriesModalOpen(false)}
        onSubmit={handleCreateSeries}
        title={newSeriesTitle}
        onTitleChange={setNewSeriesTitle}
        format={newSeriesFormat}
        onFormatChange={setNewSeriesFormat}
        direction={newSeriesDirection}
        onDirectionChange={setNewSeriesDirection}
        genre={newSeriesGenre}
        onGenreChange={setNewSeriesGenre}
        synopsis={newSeriesSynopsis}
        onSynopsisChange={setNewSeriesSynopsis}
        storyArc={newSeriesStoryArc}
        onStoryArcChange={setNewSeriesStoryArc}
        pipelineTemplates={pipelineTemplates}
        templateId={newSeriesTemplateId}
        onTemplateIdChange={setNewSeriesTemplateId}
        creating={creatingSeries}
      />

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

      {/* UC-04 / RBAC: Series Members Management Modal */}
      {selectedMembersSeries && activeWorkspace && (
        <SeriesMembersModal
          isOpen={!!selectedMembersSeries}
          workspaceId={activeWorkspace.id}
          seriesId={selectedMembersSeries.id}
          seriesTitle={selectedMembersSeries.title}
          onClose={() => setSelectedMembersSeries(null)}
        />
      )}

      {/* F5: Edit Series Modal */}
      <EditSeriesModal
        series={editingSeries}
        onClose={() => setEditingSeries(null)}
        onSubmit={handleUpdateSeries}
        title={editSeriesTitle}
        onTitleChange={setEditSeriesTitle}
        synopsis={editSeriesSynopsis}
        onSynopsisChange={setEditSeriesSynopsis}
        storyArc={editSeriesStoryArc}
        onStoryArcChange={setEditSeriesStoryArc}
        genre={editSeriesGenre}
        onGenreChange={setEditSeriesGenre}
        format={editSeriesFormat}
        onFormatChange={setEditSeriesFormat}
        direction={editSeriesDirection}
        onDirectionChange={setEditSeriesDirection}
        schedule={editSeriesSchedule}
        onScheduleChange={setEditSeriesSchedule}
        isCompleted={editSeriesCompleted}
        onCompletedChange={setEditSeriesCompleted}
        originalLanguage={editSeriesOriginalLanguage}
        onOriginalLanguageChange={setEditSeriesOriginalLanguage}
        releaseLanguages={editSeriesReleaseLanguages}
        onReleaseLanguagesChange={setEditSeriesReleaseLanguages}
        updating={updatingSeries}
      />

      {/* F8: Workspace Audit Log Modal */}
      <WorkspaceAuditModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        activeWorkspace={activeWorkspace}
        filterEntity={auditFilterEntity}
        onFilterEntityChange={setAuditFilterEntity}
        onSearch={loadWorkspaceAudit}
        loading={auditLoading}
        logs={auditLogs}
      />

      {/* Edit Access & Role Modal */}
      <EditMemberAccessModal
        member={editingMember}
        onClose={() => setEditingMember(null)}
        role={editRole}
        onRoleChange={setEditRole}
        task={editTask}
        onTaskChange={setEditTask}
        onSave={handleSaveAccess}
      />
    </div>
  );
};

export { StudioOverviewView as ProducerWorkspaceView };
export default StudioOverviewView;
