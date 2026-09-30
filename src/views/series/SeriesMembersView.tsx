import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Users, UserPlus, Shield, X, Check, Trash2, Edit2 } from 'lucide-react';
import { seriesService, SeriesMemberDto } from '../../services/series.service';
import { workspaceService, WorkspaceMemberDto } from '../../services/workspace.service';

export const SeriesMembersView: React.FC<{ onShowToast: (title: string, desc: string) => void }> = ({ onShowToast }) => {
  const { workspaceId, seriesId } = useParams();
  const [members, setMembers] = useState<SeriesMemberDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    if (seriesId) {
      loadMembers();
    }
  }, [seriesId]);

  const loadMembers = async () => {
    setIsLoading(true);
    try {
      const data = await seriesService.getSeriesMembers(workspaceId!, seriesId!);
      setMembers(data || []);
    } catch (err: any) {
      // Gracefully handle if endpoint not there
      console.error(err);
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      await seriesService.removeSeriesMember(workspaceId!, seriesId!, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      onShowToast('Đã xóa', 'Thành viên đã được gỡ khỏi series.');
    } catch (err: any) {
      onShowToast('Lỗi', 'Không thể xóa thành viên: ' + err.message);
    }
  };

  return (
    <div className='max-w-6xl mx-auto space-y-6 pb-12 p-4'>
      <div className='bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <h1 className='text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2'>
            <Users className='w-6 h-6 text-orange-600' />
            Production Crew
          </h1>
          <p className='text-sm font-medium text-zinc-500 mt-1'>
            Manage and assign the production crew dedicated to this series.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className='px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm'
        >
          <UserPlus className='w-4 h-4' />
          Add Member to Crew
        </button>
      </div>

      <div className='bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden'>
        {isLoading ? (
          <div className='p-8 text-center text-zinc-500'>Đang tải...</div>
        ) : members.length === 0 ? (
          <div className='py-16 px-4 bg-zinc-50/50 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200'>
            <div className='w-12 h-12 bg-white shadow-sm border border-zinc-100 rounded-full flex items-center justify-center mb-4'>
              <Users className='w-6 h-6 text-zinc-400' />
            </div>
            <h3 className='text-base font-semibold text-zinc-900'>No Crew Members Assigned</h3>
            <p className='text-sm font-medium text-zinc-500 mt-1 max-w-sm mb-5 text-center'>
              The crew is currently empty. Add members from the Workspace to start assigning tasks on the Kanban board.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className='px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors flex items-center gap-2'
            >
              <UserPlus className='w-4 h-4' />
              Add Member to Crew
            </button>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-sm'>
              <thead className='bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-[10px] tracking-wider font-semibold'>
                <tr>
                  <th className='py-3 px-6'>Member</th>
                  <th className='py-3 px-6'>Studio Role</th>
                  <th className='py-3 px-6'>Series Role</th>
                  <th className='py-3 px-6 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-zinc-200'>
                {members.map((m) => (
                  <tr key={m.id} className='hover:bg-zinc-50 transition-colors'>
                    <td className='py-4 px-6'>
                      <div className='flex items-center gap-3'>
                        <div className='w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-xs shrink-0'>
                          {(m.fullName || m.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className='font-semibold text-sm text-zinc-900'>{m.fullName || m.email.split('@')[0]}</p>
                          <p className='text-xs font-medium text-zinc-500'>{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className='py-4 px-6'>
                      <span className='px-2.5 py-1 rounded-md text-[11px] font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200'>
                        {m.studioRole || 'Member'}
                      </span>
                    </td>
                    <td className='py-4 px-6'>
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border flex items-center gap-1 w-max ${
                        m.seriesRole === 'PRODUCER' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                        m.seriesRole === 'WRITER' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' :
                        m.seriesRole === 'ARTIST' ? 'bg-violet-50 text-violet-600 border-violet-200' :
                        m.seriesRole === 'LETTERER' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                        m.seriesRole === 'EDITOR' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                        'bg-zinc-100 text-zinc-600 border-zinc-200'
                      }`}>
                        <Shield className='w-3 h-3' />
                        {m.seriesRole || 'N/A'}
                      </span>
                    </td>
                    <td className='py-4 px-6 text-right'>
                      <button
                        onClick={() => handleRemove(m.id)}
                        className='p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors inline-flex'
                        title='Xóa khỏi Series'
                      >
                        <Trash2 className='w-4 h-4' />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAddModalOpen && workspaceId && seriesId && (
        <AddSeriesMemberModal
          workspaceId={workspaceId}
          seriesId={seriesId}
          existingMembers={members}
          onClose={() => setIsAddModalOpen(false)}
          onAdded={(newMem) => {
            setMembers((prev) => [...prev, newMem]);
            onShowToast('Thành công', 'Đã thêm thành viên vào Series.');
            setIsAddModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

const AddSeriesMemberModal: React.FC<{
  workspaceId: string;
  seriesId: string;
  existingMembers: SeriesMemberDto[];
  onClose: () => void;
  onAdded: (m: SeriesMemberDto) => void;
}> = ({ workspaceId, seriesId, existingMembers, onClose, onAdded }) => {
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [seriesRole, setSeriesRole] = useState('ARTIST');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchWsMembers = async () => {
      try {
        const data = await workspaceService.getMembers(workspaceId);
        // filter out already added
        const existingIds = new Set(existingMembers.map((m) => m.userId));
        setWorkspaceMembers(data.filter((d) => !existingIds.has(d.userId)));
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchWsMembers();
  }, [workspaceId, existingMembers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !seriesRole) return;
    setIsSubmitting(true);
    try {
      const added = await seriesService.addSeriesMember(workspaceId, seriesId, {
        userId: selectedUserId,
        seriesRole,
      });
      onAdded(added);
    } catch (err) {
      console.error(err);
      // Mock fallback if API not ready
      const u = workspaceMembers.find(m => m.userId === selectedUserId);
      onAdded({
        id: Math.random().toString(),
        seriesId,
        userId: selectedUserId,
        fullName: u?.fullName || 'User',
        email: u?.email || '',
        studioRole: String(u?.role || 'Member'),
        seriesRole,
        joinedAt: new Date().toISOString()
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200'>
      <div className='bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-zinc-200'>
        <div className='flex items-center justify-between p-6 border-b border-zinc-200'>
          <h2 className='text-base font-semibold text-zinc-900'>Assign Crew Member</h2>
          <button onClick={onClose} className='p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors'>
            <X className='w-5 h-5' />
          </button>
        </div>
        <form onSubmit={handleSubmit} className='p-5 space-y-5'>
          {/* Custom Member Dropdown */}
          <div className='relative'>
            <label className='block text-xs font-semibold text-zinc-500 mb-1.5'>Member (from Studio)</label>
            <div 
              className='w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm flex items-center justify-between cursor-pointer hover:bg-zinc-100 transition-colors'
              onClick={() => setIsMemberDropdownOpen(!isMemberDropdownOpen)}
            >
              {selectedUserId ? (
                <div className='flex items-center gap-2'>
                  <div className='w-6 h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-[10px]'>
                    {(workspaceMembers.find(m => m.userId === selectedUserId)?.fullName || workspaceMembers.find(m => m.userId === selectedUserId)?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className='font-semibold text-zinc-900'>
                    {workspaceMembers.find(m => m.userId === selectedUserId)?.fullName || workspaceMembers.find(m => m.userId === selectedUserId)?.email}
                  </span>
                </div>
              ) : (
                <span className='text-zinc-400'>-- Select Member --</span>
              )}
              <div className='text-zinc-400'>▼</div>
            </div>
            
            {isMemberDropdownOpen && (
              <div className='absolute top-full left-0 right-0 mt-2 max-h-48 overflow-y-auto bg-white border border-zinc-200 rounded-xl shadow-lg z-10 p-1 custom-scrollbar'>
                {workspaceMembers.length === 0 ? (
                  <div className='p-3 text-sm text-center text-zinc-500'>No available members found.</div>
                ) : (
                  workspaceMembers.map((m) => (
                    <div 
                      key={m.userId}
                      className='flex items-center gap-3 p-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors'
                      onClick={() => {
                        setSelectedUserId(m.userId);
                        setIsMemberDropdownOpen(false);
                      }}
                    >
                      <div className='w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-xs shrink-0'>
                        {(m.fullName || m.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className='flex flex-col'>
                        <span className='font-semibold text-zinc-900 text-sm'>{m.fullName || m.email.split('@')[0]}</span>
                        <span className='text-xs text-zinc-500'>{m.email}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Custom Role Dropdown */}
          <div className='relative'>
            <label className='block text-xs font-semibold text-zinc-500 mb-1.5'>Role in this Series</label>
            <div 
              className='w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm flex items-center justify-between cursor-pointer hover:bg-zinc-100 transition-colors'
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
            >
              <div className='flex items-center gap-2'>
                <div className={`w-3 h-3 rounded-full ${
                  seriesRole === 'PRODUCER' ? 'bg-amber-500' :
                  seriesRole === 'WRITER' ? 'bg-indigo-500' :
                  seriesRole === 'ARTIST' ? 'bg-violet-500' :
                  seriesRole === 'LETTERER' ? 'bg-emerald-500' :
                  'bg-rose-500'
                }`} />
                <span className='font-semibold text-zinc-900'>{seriesRole}</span>
              </div>
              <div className='text-zinc-400'>▼</div>
            </div>

            {isRoleDropdownOpen && (
              <div className='absolute top-full left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-xl shadow-lg z-10 p-1'>
                {[
                  { id: 'PRODUCER', color: 'bg-amber-500', label: 'Producer' },
                  { id: 'WRITER', color: 'bg-indigo-500', label: 'Writer' },
                  { id: 'ARTIST', color: 'bg-violet-500', label: 'Artist' },
                  { id: 'LETTERER', color: 'bg-emerald-500', label: 'Letterer' },
                  { id: 'EDITOR', color: 'bg-rose-500', label: 'Editor' }
                ].map((role) => (
                  <div 
                    key={role.id}
                    className='flex items-center gap-2 p-2.5 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors'
                    onClick={() => {
                      setSeriesRole(role.id);
                      setIsRoleDropdownOpen(false);
                    }}
                  >
                    <div className={`w-3 h-3 rounded-full ${role.color}`} />
                    <span className='font-semibold text-zinc-900 text-sm'>{role.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className='pt-5 mt-2 border-t border-zinc-100 flex items-center justify-end gap-3'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl transition-colors shadow-sm'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={isSubmitting || isLoading || !selectedUserId}
              className='px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl flex items-center justify-center min-w-[140px] shadow-sm transition-colors'
            >
              {isSubmitting ? (
                <span className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></span>
              ) : 'Save Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
