import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
  FileText,
  ArrowRight,
} from 'lucide-react';
import {
  workspaceService,
  WorkspaceDto,
  WorkspaceMemberDto,
  WorkspaceUsageDto,
  WorkspaceReaderStatsDto,
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
import { formatBytes } from './studio-overview/formatters';
import { StudioGovernanceBar } from './studio-overview/StudioGovernanceBar';
import { SeriesFilterBar, type SeriesStatusFilter } from './studio-overview/SeriesFilterBar';
import { SeriesShelf } from './studio-overview/SeriesShelf';
import { MembersTabContent } from './studio-overview/MembersTabContent';
import { StudioScheduleTab } from './studio-overview/StudioScheduleTab';
import { StudioAuditTab } from './studio-overview/StudioAuditTab';
import { StudioAutomationTab } from './studio-overview/StudioAutomationTab';
import { MemberSeriesPortal } from './studio-overview/MemberSeriesPortal';
import { StudioSwitcher } from '@/shared/components/StudioSwitcher';
import { Alert, Card, CardBody, CardHeader, PageHeader } from '@/shared/ui';
import {
  CoverPickerModal,
  CreateSeriesModal,
  EditSeriesModal,
} from './studio-overview/SeriesModals';
import { WorkspaceAuditModal, EditMemberAccessModal } from './studio-overview/StudioModals';
import { CreateWorkspaceModal } from '@/roles/producer/modals/CreateWorkspaceModal';
import { useConfirm } from '@/shared/context/ConfirmContext';
import { useToast } from '@/shared/context/ToastContext';
import { formatReadingDirection } from './studio-overview/formatters';
import { useTranslation } from '@/lib/i18n';

const STUDIO_TABS = ['series', 'members', 'schedule', 'audit', 'automation'] as const;
type StudioTab = (typeof STUDIO_TABS)[number];

export const StudioOverviewView: React.FC = () => {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
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
  // The studio tabs live in the AppShell top bar, so the active tab is shared through `?tab=`.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: StudioTab = STUDIO_TABS.includes(tabParam as StudioTab)
    ? (tabParam as StudioTab)
    : 'series';
  const setActiveTab = (tab: StudioTab) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === 'series') next.delete('tab');
      else next.set('tab', tab);
      return next;
    });
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
  const [createStudioModalOpen, setCreateStudioModalOpen] = useState(false);

  // UC-03: Create Series Modal State
  const [createSeriesModalOpen, setCreateSeriesModalOpen] = useState(false);

  // "Tạo Series mới" sits in the AppShell top bar and asks this view to open the modal via `?action=`.
  useEffect(() => {
    if (searchParams.get('action') !== 'create-series') return;
    if (isProducerOrAdmin) setCreateSeriesModalOpen(true);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('action');
        return next;
      },
      { replace: true },
    );
  }, [searchParams, isProducerOrAdmin, setSearchParams]);
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
  const [editSeriesFormat, setEditSeriesFormat] = useState('MANGA');
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
  const [readerStats, setReaderStats] = useState<WorkspaceReaderStatsDto | null>(null);

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
  const [editMemberError, setEditMemberError] = useState<string | null>(null);
  const [savingMemberRole, setSavingMemberRole] = useState(false);

  // Search, Filter & Sort states for Series Library
  const [searchQuery, setSearchQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('ALL');
  const [directionFilter, setDirectionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<SeriesStatusFilter>('ALL');
  const [sortBy, setSortBy] = useState<'recent' | 'az' | 'za' | 'chapters'>('recent');
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

      const statusKey = String(m.status ?? '').toLowerCase();
      const isPending =
        statusKey === '0' || statusKey === 'pending' || m.isEmailConfirmed === false;

      return {
        id: m.userId,
        name: m.fullName || m.email.split('@')[0],
        email: m.email,
        role: roleStr,
        avatarBg: '#171717',
        initials,
        status: isPending ? 'Pending' : 'Active',
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

            try {
              const rStats = await workspaceService.getReaderStats(cur.id);
              setReaderStats(rStats);
            } catch {
              setReaderStats(null);
            }
          } else {
            setWorkspaceUsage(null);
            setReaderStats(null);
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
          setReaderStats(null);
        }
      } catch (err: any) {
        console.error(err);
        setLoadError(err.message || t('workspace.overviewView.serverConnectError'));
        showToast(
          t('workspace.overviewView.loadDataErrorTitle'),
          err.message || t('workspace.overviewView.serverConnectError'),
        );
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
      showToast(
        t('workspace.overviewView.errorTitle'),
        t('workspace.overviewView.selectWorkspaceFirst'),
      );
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
        t('workspace.overviewView.createSeriesSuccessTitle'),
        t('workspace.overviewView.createSeriesSuccessDesc', { title: created.title }),
      );
    } catch (err: any) {
      showToast(t('workspace.overviewView.createSeriesErrorTitle'), err.message);
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
      showToast(t('workspace.overviewView.coverUpdatedTitle'), `${target.title}: ${img.name}`);
      setCoverPickerSeries(null);
    } catch (err: any) {
      showToast(t('workspace.overviewView.coverErrorTitle'), err.message);
    } finally {
      setSavingCoverId(null);
    }
  };

  const handleClearCover = async (seriesId: string) => {
    try {
      await seriesService.clearCover(seriesId);
      setSeriesCover(seriesId, null);
      showToast(
        t('workspace.overviewView.coverClearedTitle'),
        t('workspace.overviewView.coverClearedDesc'),
      );
    } catch (err: any) {
      showToast(t('workspace.overviewView.coverErrorTitle'), err.message);
    }
  };

  const handleOpenEditSeries = (s: SeriesDto) => {
    setEditingSeries(s);
    setEditSeriesTitle(s.title);
    setEditSeriesSynopsis(s.synopsis || '');
    setEditSeriesStoryArc(s.storyArc || '');
    setEditSeriesGenre(s.genre || 'Action / Sci-Fi');
    setEditSeriesFormat(s.format || 'MANGA');
    // Khớp enum BE ReadingDirection (0 RightToLeft, 1 LeftToRight, 2 Vertical); BE trả chuỗi tên enum.
    setEditSeriesDirection(
      typeof s.readingDirection === 'number'
        ? s.readingDirection
        : s.readingDirection === 'Vertical'
          ? 2
          : s.readingDirection === 'LeftToRight'
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
      showToast(
        t('workspace.overviewView.updateSeriesSuccessTitle'),
        t('workspace.overviewView.updateSeriesSuccessDesc', { title: finalSeries.title }),
      );
    } catch (err: any) {
      showToast(t('workspace.overviewView.updateSeriesErrorTitle'), err.message);
    } finally {
      setUpdatingSeries(false);
    }
  };

  // Delete Series Handlers (F5) - Lucian Confirm & Toast
  const handleDeleteSeries = async (series: SeriesDto) => {
    if (
      !(await confirm({
        title: t('workspace.overviewView.deleteSeriesTitle', { title: series.title }),
        description: t('workspace.overviewView.deleteSeriesDesc'),
        confirmText: t('workspace.overviewView.deleteSeriesConfirm'),
        cancelText: t('workspace.overviewView.keepBtn'),
        variant: 'danger',
      }))
    )
      return;

    try {
      await seriesService.deleteSeries(series.id);
      setSeriesList((prev) => prev.filter((s) => s.id !== series.id));
      toast.success(
        t('workspace.overviewView.deleteSeriesSuccessTitle'),
        t('workspace.overviewView.deleteSeriesSuccessDesc', { title: series.title }),
      );
    } catch (err: any) {
      toast.error(
        t('workspace.overviewView.deleteSeriesErrorTitle'),
        err.message || t('workspace.overviewView.deleteSeriesErrorFallback'),
      );
    }
  };

  // Delete Member Handlers - Lucian Confirm & Toast
  const handleDeleteMember = async (member: { id: string; email: string }) => {
    if (!activeWorkspace) return;
    if (
      !(await confirm({
        title: t('workspace.overviewView.deleteMemberTitle'),
        description: t('workspace.overviewView.deleteMemberDesc', { email: member.email }),
        confirmText: t('workspace.overviewView.deleteMemberConfirm'),
        cancelText: t('workspace.overviewView.keepBtn'),
        variant: 'danger',
      }))
    )
      return;

    try {
      await workspaceService.removeMember(activeWorkspace.id, member.id);
      setMembers((prev) => prev.filter((m) => m.userId !== member.id));
      toast.success(
        t('workspace.overviewView.deleteMemberSuccessTitle'),
        t('workspace.overviewView.deleteMemberSuccessDesc', { email: member.email }),
      );
    } catch (err: any) {
      toast.error(
        t('workspace.overviewView.deleteMemberErrorTitle'),
        err.message || t('workspace.overviewView.deleteMemberErrorFallback'),
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
      showToast(t('workspace.overviewView.auditLoadErrorTitle'), err.message);
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
      showToast(
        t('workspace.overviewView.resendSuccessTitle'),
        t('workspace.overviewView.resendSuccessDesc'),
      );
    } catch (err: any) {
      showToast(t('workspace.overviewView.resendErrorTitle'), err.message);
    }
  };

  const handleOpenEditAccess = (member: any) => {
    setEditingMember(member);
    setEditRole(member.role);
    setEditTask(member.activeTask || 'Chapter 5 Production');
    setEditMemberError(null);
  };

  const handleSaveAccess = async () => {
    if (!editingMember || !activeWorkspace || savingMemberRole) return;
    setEditMemberError(null);
    setSavingMemberRole(true);
    try {
      await workspaceService.updateMemberRole(activeWorkspace.id, editingMember.id, {
        newRole: editRole,
      });
      const memList = await workspaceService.getMembers(activeWorkspace.id);
      setMembers(memList);
      showToast('Permissions Saved', `Updated role & access policies for ${editingMember.name}.`);
      setEditingMember(null);
    } catch (err: any) {
      const message = err?.message || t('workspace.overviewView.updateRoleErrorFallback');
      setEditMemberError(message);
      toast.error(t('workspace.overviewView.updateRoleErrorTitle'), message);
    } finally {
      setSavingMemberRole(false);
    }
  };

  // Reset search, filters and sort when active workspace changes
  useEffect(() => {
    setSearchQuery('');
    setGenreFilter('ALL');
    setDirectionFilter('ALL');
    setSortBy('recent');
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
          return a.title.localeCompare(b.title, lang === 'en' ? 'en' : 'vi');
        }
        if (sortBy === 'za') {
          return b.title.localeCompare(a.title, lang === 'en' ? 'en' : 'vi');
        }
        if (sortBy === 'chapters') {
          return (b.chaptersCount ?? 0) - (a.chaptersCount ?? 0);
        }
        return 0;
      });
  }, [seriesList, searchQuery, genreFilter, directionFilter, statusFilter, sortBy, lang]);

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

  // Writers, artists, letterers and editors land on their own series picker, not the studio governance hub.
  if (!isProducerOrAdmin) {
    if (wsRole === 'EDITOR' && activeTab === 'automation') {
      return (
        <div className='flex-1 bg-[#FAF9F5] min-h-full px-4 md:px-8 xl:px-10 py-6 space-y-6 text-stone-900 font-sans'>
          <StudioAutomationTab
            workspaceId={activeWorkspace?.id || workspaceId}
            workspaceName={activeWorkspace?.name}
            canEdit={false}
            onShowToast={showToast}
            onBackToSeries={() => setActiveTab('series')}
          />
        </div>
      );
    }
    return (
      <MemberSeriesPortal
        workspaceId={activeWorkspace?.id || workspaceId}
        workspaceName={activeWorkspace?.name}
        userName={currentUser?.fullName}
        workspaceRole={wsRole}
        seriesList={seriesList}
        loading={loading}
        onOpenSeries={handleOpenSeries}
        onOpenAutomation={wsRole === 'EDITOR' ? () => setActiveTab('automation') : undefined}
      />
    );
  }

  const storageUsed = workspaceUsage
    ? workspaceUsage.storage.used
    : activeWorkspace?.usedStorageBytes || 0;
  const storageQuota = workspaceUsage
    ? workspaceUsage.storage.quota
    : activeWorkspace?.storageQuotaBytes || 0;
  const storagePct =
    storageQuota > 0 ? Math.min(100, Math.round((storageUsed / storageQuota) * 100)) : 0;
  const storagePctLabel =
    storageQuota <= 0
      ? t('workspace.studioHub.metrics.unlimited')
      : storageUsed > 0 && storagePct === 0
        ? '<1%'
        : `${storagePct}%`;
  const runningSeries = seriesList.filter((s) => !s.isCompleted).length;
  const completedSeries = seriesList.length - runningSeries;
  const activeMembers = members.filter((m) => {
    const statusKey = String(m.status ?? '').toLowerCase();
    return (
      m.isEmailConfirmed !== false &&
      statusKey !== '0' &&
      statusKey !== 'pending' &&
      statusKey !== '2' &&
      statusKey !== 'rejected'
    );
  }).length;
  const numberFmt = new Intl.NumberFormat(lang);

  const totalChapters = seriesList.reduce((acc, s) => acc + (s.chaptersCount ?? 0), 0);
  const storageBarClass =
    storagePct >= 90 ? 'bg-rose-600' : storagePct >= 75 ? 'bg-amber-500' : 'bg-accent';

  return (
    <div className='flex-1 bg-[#FAF9F5] min-h-full px-4 md:px-8 xl:px-12 py-6 text-stone-900 font-sans'>
      <div className='max-w-[1440px] mx-auto w-full space-y-6'>
        {/* Chọn ảnh bìa có sẵn của hệ thống */}
        <CoverPickerModal
          series={coverPickerSeries}
          savingCoverId={savingCoverId}
          onClose={() => !savingCoverId && setCoverPickerSeries(null)}
          onPickSystemCover={(img) => void handlePickSystemCover(img)}
        />

        {activeTab === 'series' && (
          <PageHeader
            icon={<BookOpen className='w-5 h-5' aria-hidden='true' />}
            eyebrow={activeWorkspace?.name || t('workspace.hub')}
            title={t('workspace.studioHub.series.title')}
            description={t('workspace.library.subtitle.PRODUCER')}
            actions={
              isProducerOrAdmin ? (
                <button
                  type='button'
                  onClick={() => setCreateSeriesModalOpen(true)}
                  className='focus-ring inline-flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white font-semibold px-4 py-2 text-sm shadow-xs transition-studio cursor-pointer whitespace-nowrap'
                  data-testid='studio-hub-create-series'
                >
                  <Plus className='w-4 h-4' aria-hidden='true' />
                  <span>{t('workspace.studioHub.createSeries')}</span>
                </button>
              ) : undefined
            }
          />
        )}

        {activeTab === 'series' && (
          <section
            className='grid grid-cols-1 md:grid-cols-3 gap-4 xl:gap-5 items-stretch'
            id='studio-metrics-strip'
            aria-label={t('workspace.studioHub.metrics.ariaLabel')}
          >
            <Card className='flex flex-col'>
              <CardHeader
                tone='brand'
                className='gap-2 px-3.5'
                icon={<Layers aria-hidden='true' />}
                title={t('workspace.studioHub.metrics.seriesTitle')}
                actions={
                  <span className='rounded-full bg-kraft px-2 py-0.5 text-[11px] font-semibold text-kraft-ink tabular-nums whitespace-nowrap'>
                    {t('workspace.studioHub.metrics.seriesRunning', { count: runningSeries })}
                  </span>
                }
              />
              <CardBody className='flex flex-1 flex-col'>
                <div className='flex items-baseline gap-1.5'>
                  <span className='text-3xl font-bold text-stone-900 tracking-tight tabular-nums'>
                    {numberFmt.format(seriesList.length)}
                  </span>
                  <span className='text-sm text-stone-500 tabular-nums'>
                    {t('workspace.studioHub.metrics.seriesChapters', { count: totalChapters })}
                  </span>
                </div>
                <div className='mt-auto pt-4 border-t border-stone-100 flex items-center gap-2 text-xs text-stone-600'>
                  <span
                    className='w-2 h-2 rounded-full bg-emerald-600 shrink-0'
                    aria-hidden='true'
                  />
                  <span className='tabular-nums'>
                    {t('workspace.studioHub.metrics.seriesSplit', {
                      running: runningSeries,
                      done: completedSeries,
                    })}
                  </span>
                </div>
              </CardBody>
            </Card>

            <Card className='flex flex-col'>
              <CardHeader
                tone='info'
                className='gap-2 px-3.5'
                icon={<HardDrive aria-hidden='true' />}
                title={t('workspace.studioHub.metrics.storageTitle')}
                actions={
                  <span className='rounded-full bg-kraft px-2 py-0.5 text-[11px] font-semibold text-kraft-ink tabular-nums whitespace-nowrap'>
                    {storagePctLabel}
                  </span>
                }
              />
              <CardBody className='flex flex-1 flex-col'>
                <div className='flex items-baseline gap-1.5'>
                  <span className='text-3xl font-bold text-stone-900 tracking-tight tabular-nums'>
                    {formatBytes(storageUsed)}
                  </span>
                  <span className='text-sm text-stone-500 tabular-nums'>
                    /{' '}
                    {storageQuota > 0
                      ? formatBytes(storageQuota)
                      : t('workspace.studioHub.metrics.unlimited')}
                  </span>
                </div>
                <div className='w-full bg-head-wash border border-head-line/70 h-2 rounded-full overflow-hidden mt-3'>
                  <div
                    className={`${storageBarClass} h-full rounded-full transition-studio`}
                    style={{
                      width: `${storageUsed > 0 && storagePct === 0 ? 1 : storagePct}%`,
                    }}
                  />
                </div>
                <div className='mt-auto pt-4 border-t border-stone-100 flex items-center gap-2 text-xs text-stone-600'>
                  <FileText className='w-3.5 h-3.5 text-stone-400 shrink-0' aria-hidden='true' />
                  <span className='truncate'>
                    {t('workspace.studioHub.metrics.storageFootnote')}
                  </span>
                </div>
              </CardBody>
            </Card>

            <Card className='flex flex-col'>
              <CardHeader
                tone='success'
                className='gap-2 px-3.5'
                icon={<Users aria-hidden='true' />}
                title={t('workspace.studioHub.metrics.crewTitle')}
                actions={
                  <span className='inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 tabular-nums whitespace-nowrap'>
                    <span className='w-1.5 h-1.5 rounded-full bg-emerald-600' aria-hidden='true' />
                    {t('workspace.studioHub.metrics.crewActive', { count: activeMembers })}
                  </span>
                }
              />
              <CardBody className='flex flex-1 flex-col'>
                <div className='flex items-baseline gap-1.5'>
                  <span className='text-3xl font-bold text-stone-900 tracking-tight tabular-nums'>
                    {numberFmt.format(members.length)}
                  </span>
                  <span className='text-sm text-stone-500'>
                    {t('workspace.studioHub.metrics.crewMembers')}
                  </span>
                </div>
                <p className='text-xs text-stone-600 mt-1.5 tabular-nums'>
                  {t('workspace.studioHub.metrics.crewBreakdown', {
                    writers: tabCounts.WRITER,
                    artists: tabCounts.ARTIST,
                    letterers: studioMembers.filter((m) =>
                      (m.role || '').toLowerCase().includes('letterer'),
                    ).length,
                    editors: tabCounts.EDITOR,
                  })}
                </p>
                <button
                  type='button'
                  onClick={() => setActiveTab('members')}
                  className='focus-ring mt-auto pt-3 border-t border-stone-100 flex items-center justify-between text-left text-xs text-sienna hover:text-accent-dark font-semibold transition-studio cursor-pointer'
                >
                  <span>{t('workspace.studioHub.metrics.crewManage')}</span>
                  <ArrowRight className='w-4 h-4' aria-hidden='true' />
                </button>
              </CardBody>
            </Card>
          </section>
        )}

        <div className='space-y-6'>
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
                    {t('workspace.shelf.retry')}
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
              onOpenInviteModal={() => setInviteModalOpen(true)}
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

          {/* TAB 5: Assign Automation Settings View */}
          {activeTab === 'automation' && (
            <StudioAutomationTab
              workspaceId={activeWorkspace?.id || workspaceId}
              workspaceName={activeWorkspace?.name}
              canEdit={isProducer}
              onShowToast={showToast}
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
          onClose={() => {
            setEditingMember(null);
            setEditMemberError(null);
          }}
          role={editRole}
          onRoleChange={(r) => {
            setEditRole(r);
            setEditMemberError(null);
          }}
          task={editTask}
          onTaskChange={setEditTask}
          onSave={handleSaveAccess}
          error={editMemberError}
          saving={savingMemberRole}
        />

        {/* Create Studio Modal */}
        <CreateWorkspaceModal
          isOpen={createStudioModalOpen}
          onClose={() => setCreateStudioModalOpen(false)}
          onSuccess={(newWs) => {
            setCreateStudioModalOpen(false);
            const normalized = {
              ...newWs,
              currentUserRole: normalizeWorkspaceRole(newWs.currentUserRole),
            } as any;
            setActiveWorkspace(normalized);
            writeCachedWorkspace(normalized, currentUser?.id);
            navigate(`/workspaces/${newWs.id}`);
          }}
          onShowToast={showToast}
        />
      </div>
    </div>
  );
};

export { StudioOverviewView as ProducerWorkspaceView };
export default StudioOverviewView;
