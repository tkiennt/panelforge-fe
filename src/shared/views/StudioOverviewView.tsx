import React, { useState, useEffect } from 'react';
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
import { SeriesChaptersModal } from '@/roles/producer/modals/SeriesChaptersModal';
import { SeriesPresetsModal } from '@/roles/producer/modals/SeriesPresetsModal';
import { SeriesMembersModal } from '@/roles/producer/modals/SeriesMembersModal';
import { InviteMemberModal } from '@/roles/producer/modals/InviteMemberModal';
import { systemImageToFile, type SystemImage } from '@/shared/utils/systemImages';
import { getRoleDefaultPath } from '@/roles/roles';
import { normalizeWorkspaceRole } from '@/types/auth';
import { StudioGovernanceBar } from './studio-overview/StudioGovernanceBar';
import { SeriesFilterBar } from './studio-overview/SeriesFilterBar';
import { SeriesCardItem } from './studio-overview/SeriesCardItem';
import { MembersTabContent } from './studio-overview/MembersTabContent';
import {
  CoverPickerModal,
  CreateSeriesModal,
  EditSeriesModal,
} from './studio-overview/SeriesModals';
import { WorkspaceAuditModal, EditMemberAccessModal } from './studio-overview/StudioModals';
import { useConfirm } from '@/shared/context/ConfirmContext';
import { useToast } from '@/shared/context/ToastContext';
import { formatReadingDirection } from './studio-overview/formatters';

export const StudioOverviewView: React.FC = () => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { workspaceId } = useParams();
  const [, setWorkspaces] = useState<WorkspaceDto[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceDto | null>(() => {
    try {
      const saved = localStorage.getItem('activeWorkspace');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const userRole = localStorage.getItem('userRole');
  const wsRole =
    normalizeWorkspaceRole(activeWorkspace?.currentUserRole) ||
    normalizeWorkspaceRole(localStorage.getItem('workspaceRole'));
  const isProducer = wsRole === 'PRODUCER' || !!activeWorkspace?.isOwner;
  const isProducerOrAdmin = userRole === 'ADMINISTRATOR' || isProducer;

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
            ) ||
            normalizeWorkspaceRole(localStorage.getItem('workspaceRole'));
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
    void fetchTemplates();
  }, []);

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
    <div className='flex-1 bg-[#F3F0E9] min-h-screen p-6 md:p-8 space-y-6 text-[#1C1917] font-sans'>
      {/* Chọn ảnh bìa có sẵn của hệ thống */}
      <CoverPickerModal
        series={coverPickerSeries}
        savingCoverId={savingCoverId}
        onClose={() => !savingCoverId && setCoverPickerSeries(null)}
        onPickSystemCover={(img) => void handlePickSystemCover(img)}
      />

      {/* Header Banner: Studio Series Library Header */}
      <div className='bg-[#FCFBF8] p-6 rounded-xl border border-[#D8D2C5] shadow-2xs space-y-4'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div>
            <div className='flex items-center gap-2 text-xs font-semibold text-[#57534E] uppercase tracking-wider font-mono'>
              <Briefcase className='w-4 h-4 text-[#F97316] shrink-0' />
              <span>{activeWorkspace?.name || 'Studio Workspace'}</span>
            </div>
            <h1 className='text-2xl sm:text-3xl font-serif font-bold text-[#1C1917] tracking-tight mt-1'>
              Thư viện Bộ truyện
            </h1>
            <p className='text-xs sm:text-sm text-[#57534E] mt-1 leading-relaxed max-w-2xl'>
              Không gian quản lý, theo dõi tiến độ sản xuất và điều phối các bộ truyện tranh trong
              Studio.
            </p>
          </div>

          {isProducerOrAdmin && (
            <div className='flex items-center gap-2.5 shrink-0'>
              <button
                type='button'
                onClick={() => setCreateSeriesModalOpen(true)}
                className='inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs sm:text-sm font-semibold shadow-2xs active:scale-[0.98] transition-all cursor-pointer'
              >
                <Plus className='w-4 h-4' />
                <span>Tạo bộ truyện</span>
                <span className='sr-only'>Tạo Series Mới</span>
              </button>
            </div>
          )}
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
                  ? 'bg-[#FFF2E6] text-[#1C1917] border border-[#C2410C] shadow-2xs'
                  : 'bg-[#FCFBF8] text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3F0E9] border border-[#D8D2C5]'
              }`}
            >
              <BookOpen
                className={`w-4 h-4 ${activeTab === 'series' ? 'text-[#C2410C]' : 'text-[#57534E]'}`}
              />
              <span>Bộ truyện</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                  activeTab === 'series' ? 'bg-[#F97316] text-white' : 'bg-[#F3F0E9] text-[#57534E]'
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
                    ? 'bg-[#FFF2E6] text-[#1C1917] border border-[#C2410C] shadow-2xs'
                    : 'bg-[#FCFBF8] text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3F0E9] border border-[#D8D2C5]'
                }`}
              >
                <Users
                  className={`w-4 h-4 ${activeTab === 'members' ? 'text-[#C2410C]' : 'text-[#57534E]'}`}
                />
                <span>Thành viên Studio</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                    activeTab === 'members'
                      ? 'bg-[#F97316] text-white'
                      : 'bg-[#F3F0E9] text-[#57534E]'
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
                className='inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer'
              >
                <UserPlus className='w-4 h-4' />
                <span>Mời thành viên mới</span>
              </button>
            )}
            {isProducerOrAdmin && activeTab === 'series' && (
              <button
                type='button'
                onClick={() => setCreateSeriesModalOpen(true)}
                className='inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer'
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
            <SeriesFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onClearSearch={() => setSearchQuery('')}
              genreFilter={genreFilter}
              onGenreFilterChange={setGenreFilter}
              availableGenres={availableGenres}
              directionFilter={directionFilter}
              onDirectionFilterChange={setDirectionFilter}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              isFiltering={isFiltering}
              onClearFilters={handleClearFilters}
              displayedCount={filteredAndSortedSeries.length}
              totalCount={seriesList.length}
            />

            {/* Series Cards Container / Grid */}
            {loading ? (
              <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6'>
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className='h-72 rounded-2xl bg-white border border-stone-200/80 p-5 space-y-4 animate-pulse'
                  >
                    <div className='flex gap-3.5'>
                      <div className='w-20 sm:w-24 aspect-[3/4] bg-stone-200 rounded-xl shrink-0' />
                      <div className='flex-1 space-y-2.5 pt-1'>
                        <div className='h-4 bg-stone-200 rounded w-1/3' />
                        <div className='h-5 bg-stone-200 rounded w-3/4' />
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
                  <SeriesCardItem
                    key={s.id}
                    series={s}
                    isProducerOrAdmin={isProducerOrAdmin}
                    isOpenMenu={openMenuSeriesId === s.id}
                    onToggleMenu={(e) => {
                      e.stopPropagation();
                      setOpenMenuSeriesId(openMenuSeriesId === s.id ? null : s.id);
                    }}
                    onOpenSeries={handleOpenSeries}
                    onOpenChapters={(ser) => setSelectedChapterSeries(ser)}
                    onOpenPipeline={(ser) => setSelectedPipelineSeries(ser)}
                    onOpenPresets={(ser) => setSelectedPresetsSeries(ser)}
                    onOpenMembers={(ser) => setSelectedMembersSeries(ser)}
                    onPickCover={(ser) => setCoverPickerSeries(ser)}
                    onClearCover={(sId) => void handleClearCover(sId)}
                    onEditSeries={handleOpenEditSeries}
                    onDeleteSeries={handleDeleteSeries}
                  />
                ))}
              </div>
            )}
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
