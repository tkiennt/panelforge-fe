import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Users,
  UserPlus,
  Trash2,
  Shield,
  Mail,
  Loader2,
  Search,
  CheckCircle2,
  Sparkles,
  Plus,
  Crown,
  Lock,
  AlertCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { seriesService, SeriesMemberDto, SeriesCandidateDto } from '@/services/series.service';
import { workspaceService, WorkspaceMemberDto } from '@/services/workspace.service';
import { useConfirm } from '@/shared/context/ConfirmContext';
import { useToast } from '@/shared/context/ToastContext';
import { useTranslation } from '@/lib/i18n';
import '@/styles/modules/lucian/lucian-285.css';
import { Modal } from '@/shared/ui';

export interface SeriesMembersModalProps {
  isOpen: boolean;
  workspaceId: string;
  workspaceName?: string;
  seriesId: string;
  seriesTitle: string;
  onClose: () => void;
  onMembersChanged?: () => void;
}

const PALETTE = ['#F97316', '#6366F1', '#EC4899', '#0EA5E9', '#10B981', '#8B5CF6'];

export const SERIES_ROLES = [
  { value: 'Writer', label: 'Writer (Biên kịch)', slug: 'writer' },
  { value: 'Artist', label: 'Artist (Họa sĩ)', slug: 'artist' },
  { value: 'Letterer', label: 'Letterer (Thoại & FX)', slug: 'letterer' },
  { value: 'Editor', label: 'Editor (Biên tập)', slug: 'editor' },
  { value: 'Publisher', label: 'Publisher (Xuất bản)', slug: 'publisher' },
];

export const isProducerMember = (
  m?: { seriesRole?: string; studioRole?: string; role?: string; userId?: string } | null,
  wsMemberList: WorkspaceMemberDto[] = [],
): boolean => {
  if (!m) return false;
  const roleStr = `${m.seriesRole || ''} ${m.studioRole || ''} ${m.role || ''}`.toLowerCase();
  if (roleStr.includes('producer') || roleStr.includes('owner')) {
    return true;
  }
  const wsMember = wsMemberList.find((wm) => wm.userId === m.userId);
  if (wsMember) {
    const wsRole = (wsMember.role || '').toString().toLowerCase();
    if (wsRole === 'producer' || wsRole === 'owner' || Boolean(wsMember.isOwner)) {
      return true;
    }
  }
  return false;
};

export const SeriesMembersModal: React.FC<SeriesMembersModalProps> = ({
  isOpen,
  workspaceId,
  workspaceName,
  seriesId,
  seriesTitle,
  onClose,
  onMembersChanged,
}) => {
  const confirm = useConfirm();
  const toast = useToast();
  const { t: tProd, lang } = useTranslation('production');

  const [currentWorkspaceName, setCurrentWorkspaceName] = useState<string>(() => {
    if (workspaceName?.trim()) return workspaceName.trim();
    try {
      const stored = localStorage.getItem('activeWorkspace');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.name?.trim()) return parsed.name.trim();
      }
    } catch {
      // ignore
    }
    return '';
  });

  useEffect(() => {
    if (workspaceName?.trim()) {
      setCurrentWorkspaceName(workspaceName.trim());
      return;
    }
    try {
      const stored = localStorage.getItem('activeWorkspace');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.name?.trim()) {
          setCurrentWorkspaceName(parsed.name.trim());
          return;
        }
      }
    } catch {
      // ignore
    }
    if (workspaceId && typeof workspaceService.getWorkspaceById === 'function') {
      workspaceService
        .getWorkspaceById(workspaceId)
        .then((ws) => {
          if (ws?.name?.trim()) {
            setCurrentWorkspaceName(ws.name.trim());
          }
        })
        .catch(() => {});
    }
  }, [workspaceId, workspaceName]);

  const displayWsName = currentWorkspaceName?.trim() || 'Workspace';

  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [seriesMembers, setSeriesMembers] = useState<SeriesMemberDto[]>([]);
  const [candidates, setCandidates] = useState<SeriesCandidateDto[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberDto[]>([]);

  // Vai trò chuẩn bị trước cho từng ứng viên trong Talent Pool

  // Tìm kiếm ứng viên Workspace
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');

  // Tìm kiếm & lọc thành viên Series
  const [seriesSearchQuery, setSeriesSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('ALL');

  // Đổi vai trò inline cho thành viên Series

  // Thông báo Alert trực tiếp bên trong Modal (thành công / lỗi / cảnh báo)
  const [statusAlert, setStatusAlert] = useState<{
    type: 'success' | 'danger' | 'warning' | 'info';
    title: string;
    message: string;
  } | null>(null);

  const loadData = async () => {
    if (!seriesId) return;
    setLoading(true);
    try {
      const candidatesPromise =
        typeof seriesService.getSeriesCandidates === 'function'
          ? seriesService.getSeriesCandidates(seriesId).catch(() => [])
          : Promise.resolve([]);

      const wsMembersPromise = workspaceId
        ? workspaceService.getMembers(workspaceId).catch(() => [])
        : Promise.resolve([]);

      const [sMembers, cList, wsMembers] = await Promise.all([
        seriesService.getSeriesMembers(workspaceId, seriesId),
        candidatesPromise,
        wsMembersPromise,
      ]);
      setSeriesMembers(sMembers || []);
      setCandidates(cList || []);
      setWorkspaceMembers(wsMembers || []);
    } catch (err: any) {
      toast.error(
        tProd('producer.seriesMembersModal.loadErrorTitle'),
        err.message || tProd('producer.seriesMembersModal.loadErrorDesc'),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setCandidateSearchQuery('');
      setSeriesSearchQuery('');
      setFilterRole('ALL');
      setStatusAlert(null);
    }
  }, [isOpen, seriesId, workspaceId]);

  // Danh sách ứng viên Talent Pool (Producer luôn mặc định trong Series nên không xuất hiện ở cột ứng viên)
  const availableWorkspaceMembers = useMemo(() => {
    if (candidates.length > 0) {
      return candidates
        .filter(
          (c) =>
            !c.isAlreadyMember &&
            c.workspaceRole?.toLowerCase() !== 'producer' &&
            c.workspaceRole?.toLowerCase() !== 'owner',
        )
        .map((c) => ({
          userId: c.userId,
          fullName: c.fullName || '',
          email: c.email || '',
          role: c.workspaceRole || 'Member',
          avatarUrl: c.avatarUrl || null,
        }));
    }
    const existingIds = new Set(seriesMembers.map((m) => m.userId));
    return workspaceMembers
      .filter(
        (m) =>
          !existingIds.has(m.userId) &&
          !m.isOwner &&
          m.role?.toString().toLowerCase() !== 'producer' &&
          m.role?.toString().toLowerCase() !== 'owner',
      )
      .map((m) => ({
        userId: m.userId,
        fullName: m.fullName || '',
        email: m.email || '',
        role: m.role?.toString() || 'Member',
        avatarUrl: m.avatarUrl || null,
      }));
  }, [candidates, workspaceMembers, seriesMembers]);

  // Lọc danh sách ứng viên theo tìm kiếm
  const filteredCandidates = useMemo(() => {
    if (!candidateSearchQuery.trim()) return availableWorkspaceMembers;
    const q = candidateSearchQuery.toLowerCase();
    return availableWorkspaceMembers.filter(
      (c) =>
        (c.fullName && c.fullName.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.role && c.role.toLowerCase().includes(q)),
    );
  }, [availableWorkspaceMembers, candidateSearchQuery]);

  // Lọc danh sách thành viên hiện có trong Series
  const filteredSeriesMembers = useMemo(() => {
    return seriesMembers.filter((m) => {
      const rawRole = (m as any).seriesRole ?? (m as any).role ?? (m as any).studioRole ?? '';
      const memberRole =
        typeof rawRole === 'number'
          ? ['Producer', 'Writer', 'Artist', 'Letterer', 'Editor', 'Publisher'][rawRole] || ''
          : String(rawRole || '');

      const matchesSearch =
        !seriesSearchQuery.trim() ||
        m.fullName?.toLowerCase().includes(seriesSearchQuery.toLowerCase()) ||
        m.email?.toLowerCase().includes(seriesSearchQuery.toLowerCase()) ||
        memberRole.toLowerCase().includes(seriesSearchQuery.toLowerCase());

      const matchesRole =
        filterRole === 'ALL' ||
        memberRole.toLowerCase() === filterRole.toLowerCase() ||
        (filterRole === 'Producer' && isProducerMember(m, workspaceMembers));

      return matchesSearch && matchesRole;
    });
  }, [seriesMembers, seriesSearchQuery, filterRole, workspaceMembers]);

  // Chọn vai trò cho 1 ứng viên trước khi bấm Thêm
  // Thêm nhân sự vào Series. Vai trò luôn theo vai trò Studio (Workspace) — BE bỏ qua seriesRole, gửi để tương thích.
  const handleAddCandidateToSeries = async (candidateUserId: string) => {
    const roleToAdd =
      availableWorkspaceMembers.find((m) => m.userId === candidateUserId)?.role || 'Artist';
    setActionLoadingId(candidateUserId);
    try {
      await seriesService.addSeriesMember(workspaceId, seriesId, {
        userId: candidateUserId,
        seriesRole: roleToAdd,
      });

      const memberName =
        availableWorkspaceMembers.find((m) => m.userId === candidateUserId)?.fullName ||
        candidateUserId;

      setStatusAlert({
        type: 'success',
        title: tProd('producer.seriesMembersModal.addSuccessTitle'),
        message: tProd('producer.seriesMembersModal.addSuccessMsg', {
          name: memberName,
          seriesTitle,
        }),
      });

      toast.success(
        tProd('producer.seriesMembersModal.addSuccessTitle'),
        tProd('producer.seriesMembersModal.addSuccessMsg', { name: memberName, seriesTitle }),
      );
      await loadData();
      onMembersChanged?.();
    } catch (err: any) {
      const errorMsg = err.message || tProd('producer.seriesMembersModal.addErrorTitle');
      setStatusAlert({
        type: 'danger',
        title: tProd('producer.seriesMembersModal.addErrorTitle'),
        message: errorMsg,
      });
      toast.error(tProd('producer.seriesMembersModal.addErrorTitle'), errorMsg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Rút thành viên khỏi Series
  const handleRemoveMember = async (member: SeriesMemberDto) => {
    const isProducer = isProducerMember(member, workspaceMembers);
    if (isProducer) {
      setStatusAlert({
        type: 'warning',
        title: tProd('producer.seriesMembersModal.cannotRemoveProducerTitle'),
        message: tProd('producer.seriesMembersModal.cannotRemoveProducerMsg'),
      });
      toast.warning(
        tProd('producer.seriesMembersModal.cannotRemoveProducerTitle'),
        tProd('producer.seriesMembersModal.cannotRemoveProducerMsg'),
      );
      return;
    }

    const memberName =
      member.fullName?.trim() ||
      member.email?.split('@')[0] ||
      tProd('producer.seriesMembersModal.defaultMember');

    const confirmed = await confirm({
      title: tProd('producer.seriesMembersModal.removeMemberTitle'),
      description: tProd('producer.seriesMembersModal.removeMemberDesc', {
        name: memberName,
        seriesTitle,
      }),
      confirmText: tProd('producer.seriesMembersModal.confirmRemoveBtn'),
      cancelText: tProd('producer.seriesMembersModal.cancelBtn'),
      variant: 'danger',
    });

    if (!confirmed) return;

    setActionLoadingId(member.userId);
    try {
      await seriesService.removeSeriesMember(workspaceId, seriesId, member.userId);
      setStatusAlert({
        type: 'info',
        title: tProd('producer.seriesMembersModal.removeSuccessTitle', { seriesTitle }),
        message: tProd('producer.seriesMembersModal.removeSuccessMsg', {
          name: memberName,
          seriesTitle,
        }),
      });
      toast.success(
        tProd('producer.seriesMembersModal.updateRoleSuccessTitle'),
        tProd('producer.seriesMembersModal.removeSuccessMsg', {
          name: memberName,
          seriesTitle,
        }),
      );
      await loadData();
      onMembersChanged?.();
    } catch (err: any) {
      const errorMsg = err.message || tProd('producer.seriesMembersModal.removeErrorTitle');
      setStatusAlert({
        type: 'danger',
        title: tProd('producer.seriesMembersModal.removeErrorTitle'),
        message: errorMsg,
      });
      toast.error(tProd('producer.seriesMembersModal.removeErrorTitle'), errorMsg);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size='full'
      title={tProd('producer.seriesMembersModal.modalTitle')}
      description={tProd('producer.seriesMembersModal.modalSubtitle', { seriesTitle })}
      closeLabel={tProd('producer.seriesMembersModal.closeLabel')}
    >
      <div className='u285-modal-card w-full max-w-5xl xl:max-w-6xl max-h-[88vh] shadow-2xl flex flex-col'>
        {/* Header - Chuẩn Lucian với không gian rộng rãi */}
        <div className='p-4 sm:px-6 bg-[#FAF8F4] border-b border-[#E7E7E7] flex items-center justify-between shrink-0'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-xl bg-orange-50 border border-orange-200/80 text-orange-600 flex items-center justify-center shrink-0 shadow-2xs'>
              <Users className='w-4.5 h-4.5' />
            </div>
            <div>
              <div className='flex items-center gap-2.5'>
                <h3
                  id='series-members-modal-title'
                  className='font-display font-bold text-base text-[#171717] tracking-tight'
                >
                  {tProd('producer.seriesMembersModal.modalTitle')}
                </h3>
                <span className='u285-ct text-xs'>
                  {tProd('producer.seriesMembersModal.memberCount', {
                    count: seriesMembers.length,
                  })}
                </span>
              </div>
              <p
                id='series-members-modal-desc'
                className='text-xs text-[#737373] leading-none mt-1 truncate max-w-xl'
              >
                {tProd('producer.seriesMembersModal.modalSubtitle', { seriesTitle })}
              </p>
            </div>
          </div>

          <button
            type='button'
            onClick={onClose}
            aria-label={tProd('producer.seriesMembersModal.closeLabel')}
            className='w-8 h-8 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] flex items-center justify-center text-[#888888] hover:text-[#171717] transition-all cursor-pointer'
          >
            <X className='w-4.5 h-4.5' />
          </button>
        </div>

        {/* In-Modal Alert Báo trạng thái tinh tế, hài hòa với giao diện Studio */}
        {statusAlert && (
          <div className='px-4 sm:px-6 pt-3.5 pb-0 shrink-0'>
            <div
              className={`p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-3 text-xs shadow-2xs transition-all ${
                statusAlert.type === 'success'
                  ? 'bg-emerald-50/70 border-emerald-200/90 text-emerald-950'
                  : statusAlert.type === 'danger'
                    ? 'bg-rose-50/70 border-rose-200/90 text-rose-950'
                    : statusAlert.type === 'warning'
                      ? 'bg-amber-50/70 border-amber-200/90 text-amber-950'
                      : 'bg-[#F9F7F3] border-[#E5E0D8] text-stone-900'
              }`}
              role='status'
            >
              <div className='flex items-center gap-2.5 min-w-0'>
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    statusAlert.type === 'success'
                      ? 'bg-emerald-100 text-emerald-700'
                      : statusAlert.type === 'danger'
                        ? 'bg-rose-100 text-rose-700'
                        : statusAlert.type === 'warning'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-stone-200/80 text-stone-700'
                  }`}
                >
                  {statusAlert.type === 'success' && <CheckCircle2 className='w-3.5 h-3.5' />}
                  {statusAlert.type === 'danger' && <AlertCircle className='w-3.5 h-3.5' />}
                  {statusAlert.type === 'warning' && <AlertTriangle className='w-3.5 h-3.5' />}
                  {statusAlert.type === 'info' && <Info className='w-3.5 h-3.5' />}
                </div>
                <div className='min-w-0 flex-1 leading-snug'>
                  <span className='font-bold mr-1.5'>{statusAlert.title}:</span>
                  <span className='opacity-90'>{statusAlert.message}</span>
                </div>
              </div>

              <button
                type='button'
                onClick={() => setStatusAlert(null)}
                aria-label={tProd('producer.seriesMembersModal.closeAlertLabel')}
                className='w-6 h-6 rounded-md hover:bg-black/5 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors shrink-0'
              >
                <X className='w-3.5 h-3.5' />
              </button>
            </div>
          </div>
        )}

        {/* Body Layout: 2 Cột Trực Quan Thoáng Đãng */}
        <div className='flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6'>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-5 items-start'>
            {/* ==================== CỘT 1: TALENT POOL SẴN SÀNG ==================== */}
            <div className='bg-[#FFFFFF] rounded-2xl border border-[#E7E7E7] shadow-xs flex flex-col min-h-[260px] max-h-[520px] overflow-hidden'>
              {/* Header Cột 1 */}
              <div className='p-3.5 sm:p-4 bg-[#FAF8F4] border-b border-[#E7E7E7] space-y-2.5 shrink-0'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <div className='w-6 h-6 rounded-lg bg-orange-100/70 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0'>
                      <UserPlus className='w-3.5 h-3.5' />
                    </div>
                    <div>
                      <h4 className='text-xs font-bold text-[#171717] tracking-tight'>
                        {tProd('producer.seriesMembersModal.candidatePoolTitle')}
                      </h4>
                      <p className='text-[11px] text-[#737373]'>
                        {tProd('producer.seriesMembersModal.candidatePoolSubtitle')}
                      </p>
                    </div>
                  </div>
                  <span className='text-[10.5px] font-mono px-2 py-0.5 rounded-md bg-white text-[#737373] font-semibold border border-[#E7E7E7] shrink-0'>
                    {tProd('producer.seriesMembersModal.personCount', {
                      count: availableWorkspaceMembers.length,
                    })}
                  </span>
                </div>

                {/* Search input ứng viên */}
                <div className='relative'>
                  <Search className='w-3.5 h-3.5 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none' />
                  <input
                    type='text'
                    placeholder={tProd('producer.seriesMembersModal.candidatePoolSearch')}
                    value={candidateSearchQuery}
                    onChange={(e) => setCandidateSearchQuery(e.target.value)}
                    className='w-full h-8 pl-8 pr-7 text-xs rounded-lg border border-[#E7E7E7] bg-white text-[#171717] placeholder-[#737373] focus:outline-none focus:border-orange-500'
                  />
                  {candidateSearchQuery && (
                    <button
                      type='button'
                      onClick={() => setCandidateSearchQuery('')}
                      className='absolute right-2.5 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#171717]'
                    >
                      <X className='w-3 h-3' />
                    </button>
                  )}
                </div>
              </div>

              {/* Danh sách hiển thị ra hết */}
              <div className='flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5'>
                {loading ? (
                  <div className='py-20 text-center text-[#737373] text-xs flex flex-col items-center justify-center gap-2'>
                    <Loader2 className='w-6 h-6 animate-spin text-orange-500' />
                    <span className='font-mono text-xs'>
                      {tProd('producer.seriesMembersModal.loadingCandidates')}
                    </span>
                  </div>
                ) : filteredCandidates.length === 0 ? (
                  <div className='py-10 px-4 text-center space-y-2 text-[#737373]'>
                    <CheckCircle2 className='w-9 h-9 text-emerald-600 mx-auto' />
                    <p className='text-xs font-semibold text-[#171717]'>
                      {candidateSearchQuery
                        ? tProd('producer.seriesMembersModal.candidatePoolEmptySearch')
                        : tProd('producer.seriesMembersModal.candidatePoolEmptyAll', {
                            workspaceName: displayWsName,
                          })}
                    </p>
                    <p className='text-[11px] text-[#737373] max-w-xs mx-auto leading-relaxed'>
                      {candidateSearchQuery
                        ? tProd('producer.seriesMembersModal.candidatePoolEmptySearchDesc')
                        : tProd('producer.seriesMembersModal.candidatePoolEmptyAllDesc', {
                            workspaceName: displayWsName,
                          })}
                    </p>
                    {workspaceId && !candidateSearchQuery && (
                      <div className='pt-2'>
                        <a
                          href={`/workspaces/${workspaceId}/members`}
                          onClick={onClose}
                          className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-50 hover:bg-orange-50 border border-zinc-200 hover:border-orange-200 text-zinc-700 hover:text-orange-600 text-xs font-medium transition-colors cursor-pointer shadow-2xs'
                        >
                          <UserPlus className='w-3.5 h-3.5' />
                          <span>{tProd('producer.seriesMembersModal.manageWorkspaceMembers')}</span>
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  filteredCandidates.map((candidate, idx) => {
                    const avatarColor = PALETTE[idx % PALETTE.length];
                    const displayName =
                      candidate.fullName?.trim() ||
                      candidate.email?.split('@')[0] ||
                      tProd('producer.seriesMembersModal.defaultMemberTitle');
                    const initialLetter = displayName.charAt(0).toUpperCase();
                    const isAdding = actionLoadingId === candidate.userId;

                    return (
                      <div
                        key={candidate.userId}
                        className='p-3 bg-[#FAF8F4]/70 hover:bg-[#FAF8F4] border border-[#E7E7E7] rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs group'
                      >
                        {/* Thông tin nhân sự: Tên chữ to, dưới đó có email nhỏ */}
                        <div className='flex items-center gap-3 min-w-0 flex-1'>
                          <div
                            className='u285-av shrink-0 w-9 h-9'
                            style={{ '--c': avatarColor } as React.CSSProperties}
                          >
                            {candidate.avatarUrl ? (
                              <img
                                src={candidate.avatarUrl}
                                alt={displayName}
                                className='w-full h-full object-cover rounded-full'
                              />
                            ) : (
                              <span className='text-xs font-bold'>{initialLetter}</span>
                            )}
                          </div>
                          <div className='min-w-0 flex-1'>
                            <div className='flex items-center gap-2 flex-wrap'>
                              <span className='text-sm font-bold text-[#171717] tracking-tight truncate'>
                                {displayName}
                              </span>
                              {candidate.role && (
                                <span className='text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white border border-[#E7E7E7] text-[#555555] font-semibold shrink-0'>
                                  {candidate.role}
                                </span>
                              )}
                            </div>
                            <span className='text-xs font-mono text-[#737373] truncate block mt-0.5'>
                              {candidate.email}
                            </span>
                          </div>
                        </div>

                        {/* Thao tác chọn vai trò và nút Thêm trực tiếp */}
                        <div className='flex items-center gap-2 shrink-0 self-end sm:self-center'>
                          <button
                            type='button'
                            disabled={isAdding}
                            onClick={() => handleAddCandidateToSeries(candidate.userId)}
                            className='h-8 px-3.5 bg-[#171717] hover:bg-black active:scale-[0.98] disabled:bg-[#888888] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0 whitespace-nowrap'
                            title={tProd('producer.seriesMembersModal.candidatePoolAddBtn')}
                          >
                            {isAdding ? (
                              <Loader2 className='w-3.5 h-3.5 animate-spin' />
                            ) : (
                              <>
                                <Plus className='w-3.5 h-3.5 text-orange-400' />
                                <span>
                                  {tProd('producer.seriesMembersModal.candidatePoolAddBtn')}
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ==================== CỘT 2: THÀNH VIÊN TRONG BỘ TRUYỆN ==================== */}
            <div className='bg-[#FFFFFF] rounded-2xl border border-[#E7E7E7] shadow-xs flex flex-col min-h-[360px] max-h-[520px] overflow-hidden'>
              {/* Header Cột 2 */}
              <div className='p-3.5 sm:p-4 bg-[#FAF8F4] border-b border-[#E7E7E7] space-y-2.5 shrink-0'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <div className='w-6 h-6 rounded-lg bg-stone-100 border border-stone-200 text-stone-700 flex items-center justify-center shrink-0'>
                      <Shield className='w-3.5 h-3.5' />
                    </div>
                    <div>
                      <h4 className='text-xs font-bold text-[#171717] tracking-tight'>
                        {tProd('producer.seriesMembersModal.rosterTitle')}
                      </h4>
                      <p className='text-[11px] text-[#737373]'>
                        {tProd('producer.seriesMembersModal.rosterSubtitle')}
                      </p>
                    </div>
                  </div>
                  <span className='text-[10.5px] font-mono px-2 py-0.5 rounded-md bg-white text-stone-800 font-bold border border-[#E7E7E7] shrink-0'>
                    {tProd('producer.seriesMembersModal.memberCount', {
                      count: seriesMembers.length,
                    })}
                  </span>
                </div>

                {/* Toolbar tìm kiếm & lọc vai trò */}
                <div className='flex items-center gap-2'>
                  <div className='relative flex-1 min-w-0'>
                    <Search className='w-3.5 h-3.5 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none' />
                    <input
                      type='text'
                      placeholder={tProd('producer.seriesMembersModal.rosterSearch')}
                      value={seriesSearchQuery}
                      onChange={(e) => setSeriesSearchQuery(e.target.value)}
                      className='w-full h-8 pl-8 pr-7 text-xs rounded-lg border border-[#E7E7E7] bg-white text-[#171717] placeholder-[#737373] focus:outline-none focus:border-orange-500'
                    />
                    {seriesSearchQuery && (
                      <button
                        type='button'
                        onClick={() => setSeriesSearchQuery('')}
                        className='absolute right-2.5 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#171717]'
                      >
                        <X className='w-3 h-3' />
                      </button>
                    )}
                  </div>

                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className='h-8 px-2.5 text-xs font-semibold rounded-lg border border-[#E7E7E7] bg-white text-[#171717] focus:outline-none focus:border-orange-500 shrink-0 w-32 cursor-pointer'
                  >
                    <option value='ALL'>
                      {tProd('producer.seriesMembersModal.rosterAllRoles')}
                    </option>
                    <option value='Producer'>Producer</option>
                    {SERIES_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Danh sách thành viên Series */}
              <div className='flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5'>
                {loading ? (
                  <div className='py-20 text-center text-[#737373] text-xs flex flex-col items-center justify-center gap-2'>
                    <Loader2 className='w-6 h-6 animate-spin text-orange-500' />
                    <span className='font-mono text-xs'>
                      {tProd('producer.seriesMembersModal.loadingSeriesMembers')}
                    </span>
                  </div>
                ) : filteredSeriesMembers.length === 0 ? (
                  <div className='py-20 px-4 text-center space-y-2 text-[#737373]'>
                    <Users className='w-9 h-9 text-stone-300 mx-auto' />
                    <p className='text-xs font-semibold text-[#171717]'>
                      {seriesSearchQuery || filterRole !== 'ALL'
                        ? tProd('producer.seriesMembersModal.rosterEmptySearch')
                        : tProd('producer.seriesMembersModal.rosterEmpty')}
                    </p>
                    <p className='text-[11px] text-[#737373] max-w-xs mx-auto leading-relaxed'>
                      {seriesSearchQuery || filterRole !== 'ALL'
                        ? tProd('producer.seriesMembersModal.rosterEmptySearchDesc')
                        : tProd('producer.seriesMembersModal.rosterEmptyDesc')}
                    </p>
                  </div>
                ) : (
                  filteredSeriesMembers.map((m, idx) => {
                    const isProducer = isProducerMember(m, workspaceMembers);

                    const rawRole =
                      (m as any).seriesRole ?? (m as any).role ?? (m as any).studioRole ?? 'Artist';
                    const memberRole =
                      typeof rawRole === 'number'
                        ? ['Producer', 'Writer', 'Artist', 'Letterer', 'Editor', 'Publisher'][
                            rawRole
                          ] || 'Artist'
                        : String(rawRole || 'Artist');
                    const normalizedRole = memberRole.toLowerCase();

                    const matched = SERIES_ROLES.find(
                      (r) => r.value.toLowerCase() === normalizedRole,
                    );

                    const roleConfig = isProducer
                      ? {
                          value: 'Producer',
                          label: tProd('producer.seriesMembersModal.roles.Producer'),
                          slug: 'producer',
                        }
                      : matched
                        ? {
                            ...matched,
                            label: tProd(`producer.seriesMembersModal.roles.${matched.value}`),
                          }
                        : {
                            value: memberRole,
                            label:
                              memberRole.toLowerCase() === 'artist'
                                ? tProd('producer.seriesMembersModal.roles.Artist')
                                : memberRole,
                            slug: normalizedRole.includes('writer')
                              ? 'writer'
                              : normalizedRole.includes('artist')
                                ? 'artist'
                                : normalizedRole.includes('letter')
                                  ? 'letterer'
                                  : normalizedRole.includes('edit')
                                    ? 'editor'
                                    : normalizedRole.includes('publish')
                                      ? 'publisher'
                                      : 'artist',
                          };

                    const avatarColor = isProducer ? '#F59E0B' : PALETTE[idx % PALETTE.length];
                    const displayName =
                      m.fullName?.trim() ||
                      m.email?.split('@')[0] ||
                      tProd('producer.seriesMembersModal.defaultMemberTitle');
                    const initialLetter = displayName.charAt(0).toUpperCase();
                    const isRowActionLoading = actionLoadingId === m.userId;

                    return (
                      <div
                        key={m.id || m.userId}
                        className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${
                          isProducer
                            ? 'bg-amber-50/40 border-amber-200/90 hover:bg-amber-50/60'
                            : 'bg-white hover:bg-[#FAF8F4] border-[#E7E7E7]'
                        }`}
                      >
                        {/* Thông tin thành viên: Tên chữ to, dưới đó có email nhỏ */}
                        <div className='flex items-center gap-3 min-w-0 flex-1'>
                          <div
                            className='u285-av shrink-0 w-9 h-9'
                            style={{ '--c': avatarColor } as React.CSSProperties}
                          >
                            {m.avatarUrl ? (
                              <img
                                src={m.avatarUrl}
                                alt={displayName}
                                className='w-full h-full object-cover rounded-full'
                              />
                            ) : (
                              <span className='text-xs font-bold'>{initialLetter}</span>
                            )}
                          </div>

                          <div className='min-w-0 flex-1'>
                            <div className='flex items-center gap-2 flex-wrap'>
                              <span className='text-sm font-bold text-[#171717] tracking-tight truncate'>
                                {displayName}
                              </span>
                              {isProducer && (
                                <span className='text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 shrink-0'>
                                  <Crown className='w-2.5 h-2.5 text-amber-600' />
                                  <span>
                                    {tProd('producer.seriesMembersModal.producerAdminTag')}
                                  </span>
                                </span>
                              )}
                              {m.joinedAt && (
                                <span className='text-[10.5px] font-mono text-[#737373] hidden sm:inline'>
                                  • {new Date(m.joinedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'vi-VN')}
                                </span>
                              )}
                            </div>
                            <span className='text-xs font-mono text-[#737373] truncate block mt-0.5'>
                              {m.email}
                            </span>
                          </div>
                        </div>

                        {/* Vai trò & Hành động */}
                        <div className='flex items-center gap-2 justify-end shrink-0 self-end sm:self-center'>
                          <span
                            className={`u285-role-badge ${roleConfig.slug}`}
                            title={roleConfig.label}
                          >
                            {isProducer ? (
                              <Crown className='w-3 h-3 text-amber-600' />
                            ) : (
                              <Sparkles className='w-2.5 h-2.5 opacity-70' />
                            )}
                            <span>{roleConfig.label}</span>
                          </span>

                          <div className='flex items-center gap-1'>
                            {isProducer ? (
                              <span
                                className='w-7 h-7 rounded-lg flex items-center justify-center text-amber-600'
                                title={tProd('producer.seriesMembersModal.producerLockTooltip')}
                              >
                                <Lock className='w-3.5 h-3.5 opacity-60' />
                              </span>
                            ) : (
                              <>
                                <button
                                  type='button'
                                  disabled={isRowActionLoading}
                                  onClick={() => handleRemoveMember(m)}
                                  className='w-7 h-7 rounded-lg text-[#737373] hover:text-[#DC2626] hover:bg-[#FEE2E2]/60 border border-transparent hover:border-[#FECACA] flex items-center justify-center transition-all cursor-pointer'
                                  title={tProd('producer.seriesMembersModal.removeMemberTooltip')}
                                >
                                  <Trash2 className='w-3.5 h-3.5' />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='p-3.5 sm:px-6 bg-[#FAF8F4] border-t border-[#E7E7E7] flex items-center justify-between text-xs shrink-0'>
          <div className='flex items-center gap-2 text-xs text-[#737373]'>
            <span className='w-2 h-2 rounded-full bg-emerald-500 shrink-0 inline-block' />
            <span className='font-mono'>
              {tProd('producer.seriesMembersModal.footerStatus', {
                seriesCount: seriesMembers.length,
              })}
            </span>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-2 rounded-xl bg-[#FFFFFF] hover:bg-[#F3F1EB] active:scale-[0.98] border border-[#E7E7E7] text-[#171717] text-xs font-bold transition-all cursor-pointer shadow-2xs'
          >
            {tProd('producer.seriesMembersModal.footerClose')}
          </button>
        </div>
      </div>
    </Modal>
  );
};
