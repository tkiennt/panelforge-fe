import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Key,
  CheckCircle2,
  Lock,
  Mail,
  Search,
  ChevronDown,
  Sliders,
  MoreVertical,
  Check,
  X,
  Sparkles,
  RefreshCw,
  Edit3,
} from 'lucide-react';
import { StudioMember, MangaProject } from '../types';
import { InviteMemberModal } from '../components/modals/InviteMemberModal';
import { workspaceService, WorkspaceMemberDto } from '../services/workspace.service';

interface MembersRolesViewProps {
  activeProject?: MangaProject;
  workspaceId?: string;
  members?: StudioMember[];
  onInviteMember?: (newMember: StudioMember) => void;
  onUpdateMemberRole?: (memberId: string, newRole: string, updatedPermissions?: string[]) => void;
  onShowToast: (title: string, desc: string) => void;
}

const mapMemberDtoToStudioMember = (m: WorkspaceMemberDto): StudioMember => {
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
              : 'EDITOR'
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
    status: 'Active',
    activeTask: 'Production',
    cryptoKey: `ECDSA-P256 [0x${m.userId.substring(0, 4).toUpperCase()}...${m.userId.substring(m.userId.length - 3).toUpperCase()}]`,
    permissions: ['Production Seat', roleStr],
  };
};

export const MembersRolesView: React.FC<MembersRolesViewProps> = ({
  activeProject,
  workspaceId,
  members = [],
  onInviteMember,
  onUpdateMemberRole,
  onShowToast,
}) => {
  const [localMembers, setLocalMembers] = useState<StudioMember[]>(members);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'LEAD' | 'ARTIST' | 'WRITER' | 'EDITOR'>(
    'ALL',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteMemberOpen, setInviteMemberOpen] = useState(false);

  // Edit Access Modal State
  const [editingMember, setEditingMember] = useState<StudioMember | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editTask, setEditTask] = useState('');

  const effectiveWorkspaceId =
    workspaceId ||
    (() => {
      try {
        const saved = localStorage.getItem('activeWorkspace');
        return saved ? JSON.parse(saved)?.id : undefined;
      } catch {
        return undefined;
      }
    })();

  useEffect(() => {
    let isMounted = true;
    const fetchMembers = async () => {
      if (!effectiveWorkspaceId) return;
      setIsLoadingMembers(true);
      try {
        const data = await workspaceService.getMembers(effectiveWorkspaceId);
        if (isMounted && data && data.length > 0) {
          setLocalMembers(data.map(mapMemberDtoToStudioMember));
        } else if (isMounted && members && members.length > 0) {
          setLocalMembers(members);
        }
      } catch (err) {
        console.warn('Không thể tải thành viên từ API, fallback sang danh sách local:', err);
        if (isMounted && members && members.length > 0) {
          setLocalMembers(members);
        }
      } finally {
        if (isMounted) setIsLoadingMembers(false);
      }
    };

    fetchMembers();
    return () => {
      isMounted = false;
    };
  }, [effectiveWorkspaceId, members]);

  // Filtering members safely
  const filteredMembers = useMemo(() => {
    return localMembers.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.role && m.role.toLowerCase().includes(q)) ||
        (m.activeTask || m.assignedChapterNote || '').toLowerCase().includes(q);

      const roleStr = (m.role || '').toLowerCase();
      const matchesTab =
        activeTab === 'ALL' ||
        (activeTab === 'LEAD' && (roleStr.includes('lead') || roleStr.includes('producer'))) ||
        (activeTab === 'ARTIST' && (roleStr.includes('artist') || roleStr.includes('line'))) ||
        (activeTab === 'WRITER' && (roleStr.includes('writer') || roleStr.includes('script'))) ||
        (activeTab === 'EDITOR' && roleStr.includes('editor'));

      return matchesSearch && matchesTab;
    });
  }, [localMembers, searchQuery, activeTab]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      ALL: localMembers.length,
      LEAD: localMembers.filter(
        (m) =>
          (m.role || '').toLowerCase().includes('lead') ||
          (m.role || '').toLowerCase().includes('producer'),
      ).length,
      ARTIST: localMembers.filter((m) => (m.role || '').toLowerCase().includes('artist')).length,
      WRITER: localMembers.filter((m) => (m.role || '').toLowerCase().includes('writer')).length,
      EDITOR: localMembers.filter((m) => (m.role || '').toLowerCase().includes('editor')).length,
    };
  }, [localMembers]);

  const handleOpenEditAccess = (member: StudioMember) => {
    setEditingMember(member);
    setEditRole(member.role);
    setEditTask(member.activeTask || member.assignedChapterNote || 'Chapter 5 Production');
  };

  const handleSaveAccess = async () => {
    if (!editingMember) return;
    try {
      if (effectiveWorkspaceId) {
        await workspaceService.updateMemberRole(effectiveWorkspaceId, editingMember.id, {
          newRole: editRole,
        });
      }
      setLocalMembers((prev) =>
        prev.map((m) => (m.id === editingMember.id ? { ...m, role: editRole } : m)),
      );
      if (onUpdateMemberRole) onUpdateMemberRole(editingMember.id, editRole);
      onShowToast('Permissions Saved', `Updated role & access policies for ${editingMember.name}.`);
      setEditingMember(null);
    } catch (err: any) {
      onShowToast('Lỗi cập nhật vai trò', err.message || 'Không thể cập nhật vai trò thành viên.');
    }
  };

  const handleInvite = async (newMember: StudioMember) => {
    try {
      if (effectiveWorkspaceId) {
        await workspaceService.addMember(effectiveWorkspaceId, {
          email: newMember.email,
          role: newMember.role,
        });
      }
      setLocalMembers((prev) => [newMember, ...prev]);
      if (onInviteMember) onInviteMember(newMember);
      onShowToast('Mời thành viên', `Đã gửi lời mời tới ${newMember.email}.`);
    } catch (err: any) {
      onShowToast('Lỗi mời thành viên', err.message || 'Không thể thêm thành viên vào Workspace.');
    }
  };

  const handleRotateKey = (member: StudioMember) => {
    const randomHex = Math.random().toString(16).substring(2, 6).toUpperCase();
    const randomSuffix = Math.random().toString(16).substring(2, 5).toUpperCase();
    const newKey = `ECDSA-P256 [0x${randomHex}...${randomSuffix}]`;
    member.cryptoKey = newKey;
    onShowToast(
      'Key Rotated',
      `Generated new cryptographic signing authority key for ${member.name}: ${newKey}`,
    );
  };

  return (
    <div className='max-w-7xl mx-auto space-y-6 pb-12'>
      {/* Top Banner & Context */}
      <div className='bg-white border border-[#E7E7E7] rounded-xl p-5 shadow-xs'>
        <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4'>
          <div>
            <div className='flex items-center gap-2 text-[11px] font-mono text-[#888888] mb-1'>
              <span className='font-semibold text-[#171717]'>STUDIO TEAMS &amp; ACCESS</span>
              <span>/</span>
              <span className='text-[#F97316] font-semibold'>PERMISSIONS ENGINE</span>
            </div>
            <h1 className='text-2xl lg:text-3xl font-bold font-serif text-[#171717] tracking-tight'>
              Members &amp; Roles
            </h1>
            <p className='text-xs text-[#555555] mt-1'>
              Role-based access control (RBAC), production seat allocation, and cryptographic
              signing keys for Tankōbon mastering.
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-2.5'>
            {/* Seat Allocation Pill */}
            <div className='px-3 py-1.5 rounded-lg bg-[#FFFBEB] border border-[#F59E0B]/30 text-[#D97706] text-xs font-semibold font-mono flex items-center gap-1.5'>
              <Users className='w-3.5 h-3.5' />
              <span>Seat Allocation: {members.length} / 10 Active Seats</span>
            </div>

            {/* Invite Button */}
            <button
              onClick={() => setInviteMemberOpen(true)}
              className='px-3.5 py-2 rounded-lg bg-[#171717] hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95'
            >
              <UserPlus className='w-3.5 h-3.5' />
              <span>Invite Studio Member</span>
            </button>
          </div>
        </div>

        {/* Tab Selection Row */}
        <div className='mt-6 pt-4 border-t border-[#E7E7E7] flex flex-col md:flex-row md:items-center justify-between gap-4'>
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
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  activeTab === tab.key
                    ? 'bg-[#171717] text-white shadow-xs'
                    : 'text-[#555555] hover:text-[#171717] hover:bg-[#F3F1EB]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-[#EAE8E0] text-[#555555]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className='relative'>
            <Search className='w-3.5 h-3.5 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2' />
            <input
              type='text'
              placeholder='Filter members by name, role, task...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-8 pr-3 py-1.5 bg-[#FAF8F4] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-[#171717] placeholder-[#888888] focus:outline-none focus:border-[#F97316] w-64 transition-all'
            />
          </div>
        </div>
      </div>

      {/* Members Grid / List */}
      <div className='bg-white border border-[#E7E7E7] rounded-xl overflow-hidden shadow-xs'>
        <div className='p-4 bg-[#FAF8F4] border-b border-[#E7E7E7] flex items-center justify-between'>
          <h3 className='text-sm font-bold font-serif text-[#171717]'>
            Active Studio Production Members ({filteredMembers.length})
          </h3>
          <span className='text-xs font-mono text-[#888888]'>
            Chapter 5 Signing Keys Validated (ECDSA-P256)
          </span>
        </div>

        <div className='divide-y divide-[#E7E7E7]'>
          {filteredMembers.length === 0 ? (
            <div className='p-8 text-center text-xs text-[#888888] font-mono'>
              No studio members match the current filter or search query.
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
                      <h4 className='text-sm font-bold text-[#171717] font-serif'>{member.name}</h4>
                      <span className='px-2 py-0.5 rounded bg-[#171717] text-white text-[10px] font-mono font-bold tracking-wider'>
                        {(member.role || 'MEMBER').toUpperCase()}
                      </span>
                      {member.isYou && (
                        <span className='px-1.5 py-0.2 rounded bg-[#FFF7ED] text-[#EA580C] border border-[#FDBA74] text-[9px] font-mono font-bold'>
                          YOU
                        </span>
                      )}
                      <span className='flex items-center gap-1 text-[11px] text-[#059669] font-medium'>
                        <span className='w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse'></span>
                        {member.status || 'Active'}
                      </span>
                    </div>

                    <div className='flex flex-wrap items-center gap-3 text-xs text-[#555555] mt-1 font-mono'>
                      <span className='flex items-center gap-1'>
                        <Mail className='w-3 h-3 text-[#888888]' />
                        {member.email}
                      </span>
                      <span>•</span>
                      <span className='text-[#171717]'>
                        Assignment:{' '}
                        <strong>
                          {member.activeTask ||
                            member.assignedChapterNote ||
                            'Chapter 5 Production'}
                        </strong>
                      </span>
                    </div>

                    {/* Permissions Chips */}
                    <div className='flex flex-wrap items-center gap-1.5 mt-2.5'>
                      {(member.permissions && member.permissions.length > 0
                        ? member.permissions
                        : ['600 DPI Upload', 'Inking Pass', 'AI Assist']
                      ).map((perm, idx) => (
                        <span
                          key={idx}
                          className='px-2 py-0.5 rounded bg-[#F8F6F0] text-[#555555] border border-[#E7E7E7] text-[10px] font-mono'
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Cryptographic Key & Actions */}
                <div className='flex flex-col sm:flex-row sm:items-center gap-4 self-end md:self-center shrink-0'>
                  <div className='p-2.5 bg-[#FAF8F4] rounded-lg border border-[#E7E7E7] text-right font-mono'>
                    <div className='flex items-center gap-1 text-[10px] text-[#888888] justify-end'>
                      <Key className='w-3 h-3 text-[#F97316]' />
                      <span>Signing Authority</span>
                    </div>
                    <div className='text-[11px] font-bold text-[#171717] mt-0.5'>
                      {member.cryptoKey || 'ECDSA-P256 [0x7A9F...E19]'}
                    </div>
                  </div>

                  <div className='flex items-center gap-2'>
                    <button
                      onClick={() => handleOpenEditAccess(member)}
                      className='px-3 py-1.5 bg-white hover:bg-[#F3F1EB] border border-[#E7E7E7] rounded-lg text-xs font-semibold text-[#171717] transition-colors cursor-pointer shadow-2xs flex items-center gap-1'
                    >
                      <Edit3 className='w-3 h-3 text-[#F97316]' />
                      <span>Edit Access</span>
                    </button>
                    <button
                      onClick={() => handleRotateKey(member)}
                      className='px-3 py-1.5 bg-white hover:bg-[#F3F1EB] border border-[#E7E7E7] rounded-lg text-xs font-semibold text-[#888888] hover:text-[#171717] transition-colors cursor-pointer shadow-2xs flex items-center gap-1'
                      title='Rotate Cryptographic ECDSA Key'
                    >
                      <RefreshCw className='w-3 h-3' />
                      <span>Rotate Key</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RBAC Privilege Matrix */}
      <div className='bg-white border border-[#E7E7E7] rounded-xl p-5 shadow-xs'>
        <div className='flex items-center justify-between mb-4'>
          <div>
            <h3 className='text-base font-bold font-serif text-[#171717] flex items-center gap-2'>
              <Shield className='w-4 h-4 text-[#F97316]' />
              Role-Based Access Control (RBAC) Matrix
            </h3>
            <p className='text-xs text-[#555555]'>
              Production permissions mapped across studio roles for Tankōbon mastering
            </p>
          </div>
          <span className='text-xs font-mono text-[#059669] bg-[#ECFDF5] px-2.5 py-1 rounded border border-[#10B981]/30 font-semibold'>
            Strict Enforcement
          </span>
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full text-left border-collapse text-xs'>
            <thead className='bg-[#F8F6F0] border-b border-[#E7E7E7] text-[#555555] font-mono uppercase text-[10px]'>
              <tr>
                <th className='p-3'>Capability Privilege</th>
                <th className='p-3 text-center'>Lead Producer</th>
                <th className='p-3 text-center'>Key Artist</th>
                <th className='p-3 text-center'>Writer / SFX</th>
                <th className='p-3 text-center'>Chief Editor</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-[#E7E7E7]'>
              {[
                {
                  name: 'Master Commit & Tankōbon Lock',
                  lead: true,
                  ink: false,
                  writer: false,
                  edit: true,
                },
                {
                  name: 'AI Vector Retraining & LoRA Anchoring',
                  lead: true,
                  ink: true,
                  writer: false,
                  edit: false,
                },
                {
                  name: '600 DPI TIFF & CMYK Production Export',
                  lead: true,
                  ink: true,
                  writer: false,
                  edit: true,
                },
                {
                  name: 'Editorial Sign-off / Print Gate Release',
                  lead: true,
                  ink: false,
                  writer: false,
                  edit: true,
                },
                {
                  name: 'Script Versioning & Dialogue Balloon Fit',
                  lead: true,
                  ink: false,
                  writer: true,
                  edit: true,
                },
                {
                  name: 'Budget, Billing & Seat Allocation',
                  lead: true,
                  ink: false,
                  writer: false,
                  edit: false,
                },
              ].map((row, i) => (
                <tr key={i} className='hover:bg-[#FAF8F4] transition-colors'>
                  <td className='p-3 font-semibold text-[#171717]'>{row.name}</td>
                  <td className='p-3 text-center'>
                    {row.lead ? (
                      <span className='inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#ECFDF5] text-[#059669] font-bold'>
                        ✓
                      </span>
                    ) : (
                      <span className='inline-block text-[#D1D5DB] font-mono'>—</span>
                    )}
                  </td>
                  <td className='p-3 text-center'>
                    {row.ink ? (
                      <span className='inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#ECFDF5] text-[#059669] font-bold'>
                        ✓
                      </span>
                    ) : (
                      <span className='inline-block text-[#D1D5DB] font-mono'>—</span>
                    )}
                  </td>
                  <td className='p-3 text-center'>
                    {row.writer ? (
                      <span className='inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#ECFDF5] text-[#059669] font-bold'>
                        ✓
                      </span>
                    ) : (
                      <span className='inline-block text-[#D1D5DB] font-mono'>—</span>
                    )}
                  </td>
                  <td className='p-3 text-center'>
                    {row.edit ? (
                      <span className='inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#ECFDF5] text-[#059669] font-bold'>
                        ✓
                      </span>
                    ) : (
                      <span className='inline-block text-[#D1D5DB] font-mono'>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
                <label className='block font-mono font-bold uppercase tracking-wider text-[#888888] mb-1.5 text-[10px]'>
                  Assigned Production Role (Single Role)
                </label>
                <div className='flex flex-wrap gap-2 mt-1'>
                  {(['PRODUCER', 'ARTIST', 'WRITER', 'LETTERER', 'EDITOR'] as const).map(
                    (roleKey) => {
                      const isSelected = editRole.toUpperCase() === roleKey;
                      return (
                        <label
                          key={roleKey}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-[11px] font-bold tracking-wider cursor-pointer transition-colors ${
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
                <label className='block font-mono font-bold uppercase tracking-wider text-[#888888] mb-1.5 text-[10px]'>
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

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={inviteMemberOpen}
        onClose={() => setInviteMemberOpen(false)}
        onInvite={handleInvite}
        onShowToast={onShowToast}
      />
    </div>
  );
};
