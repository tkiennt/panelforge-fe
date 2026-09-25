import React, { useState } from 'react';
import { Users, UserPlus, Shield, Check, Trash2, Mail, Plus, X } from 'lucide-react';
import { WorkspaceRole } from '../types';

export interface ProjectMember {
  userId: string;
  fullName: string;
  email: string;
  roles: ('PRODUCER' | 'WRITER' | 'ARTIST' | 'LETTERER' | 'EDITOR')[];
  joinedAt: string;
}

const PROJECT_ROLES: { key: 'PRODUCER' | 'WRITER' | 'ARTIST' | 'LETTERER' | 'EDITOR'; label: string; badgeColor: string }[] = [
  { key: 'PRODUCER', label: 'Producer', badgeColor: 'bg-[#F97316]/10 text-[#F97316] border-[#F97316]/30' },
  { key: 'WRITER', label: 'Writer', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'ARTIST', label: 'Line Artist', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'LETTERER', label: 'Letterer', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'EDITOR', label: 'Chief Editor', badgeColor: 'bg-rose-50 text-rose-700 border-rose-200' },
];

export const ProjectMembersView: React.FC<{ projectId?: string; seriesTitle?: string }> = ({
  projectId = 'proj-01',
  seriesTitle = 'Manga Series Workspace',
}) => {
  const [members, setMembers] = useState<ProjectMember[]>([
    {
      userId: 'usr-01',
      fullName: 'Tatsuki Fujimoto',
      email: 'fujimoto@panelforge.com',
      roles: ['PRODUCER', 'WRITER'],
      joinedAt: '2026-09-15',
    },
    {
      userId: 'usr-02',
      fullName: 'Yusuke Murata',
      email: 'murata@panelforge.com',
      roles: ['ARTIST'],
      joinedAt: '2026-09-18',
    },
    {
      userId: 'usr-03',
      fullName: 'Akira Toriyama',
      email: 'toriyama@panelforge.com',
      roles: ['EDITOR', 'WRITER'],
      joinedAt: '2026-09-20',
    },
  ]);

  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedInviteRoles, setSelectedInviteRoles] = useState<('PRODUCER' | 'WRITER' | 'ARTIST' | 'LETTERER' | 'EDITOR')[]>(['WRITER']);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const toggleRoleForMember = (userId: string, roleKey: any) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.userId === userId) {
          const hasRole = m.roles.includes(roleKey);
          const updatedRoles = hasRole
            ? m.roles.filter((r) => r !== roleKey)
            : [...m.roles, roleKey];
          return { ...m, roles: updatedRoles.length > 0 ? updatedRoles : ['WRITER'] };
        }
        return m;
      })
    );
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    const newMember: ProjectMember = {
      userId: `usr-${Date.now()}`,
      fullName: inviteEmail.split('@')[0],
      email: inviteEmail,
      roles: selectedInviteRoles,
      joinedAt: new Date().toISOString().split('T')[0],
    };

    setMembers((prev) => [...prev, newMember]);
    setInviteEmail('');
    setIsInviteModalOpen(false);
  };

  return (
    <div className="flex-1 bg-[#F8F6F0] min-h-screen p-6 md:p-8 font-sans text-[#171717] space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-[#F97316] text-white font-mono text-[10px] font-bold">
              PROJECT RBAC // MEMBERS & ROLES
            </span>
            <span className="text-xs text-[#737373] font-mono">Series: {seriesTitle}</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-[#171717] tracking-tight">
            Project Members & Multi-Role Assignment
          </h1>
          <p className="text-xs text-[#737373] mt-1">
            Granular Project-Scoped RBAC. Members can hold multiple roles in a single project (e.g. Writer + Editor).
          </p>
        </div>

        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-2 bg-[#F97316] hover:bg-[#EA580C] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite Team Member</span>
        </button>
      </div>

      {/* Member List */}
      <div className="bg-white rounded-2xl border border-[#E7E7E7] shadow-sm overflow-hidden">
        <div className="p-4 bg-[#FAF8F5] border-b border-[#E7E7E7] flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#171717] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#F97316]" /> Team Members ({members.length})
          </span>
        </div>

        <div className="divide-y divide-[#E7E7E7]">
          {members.map((m) => (
            <div
              key={m.userId}
              className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#FAF8F5]/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#171717] text-white font-bold flex items-center justify-center text-sm">
                  {m.fullName.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#171717]">{m.fullName}</h4>
                  <p className="text-[11px] text-[#737373] font-mono">{m.email}</p>
                </div>
              </div>

              {/* Multi-Role Badge Toggles */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-[#A3A3A3] uppercase mr-1">Assigned Roles:</span>
                {PROJECT_ROLES.map((r) => {
                  const isAssigned = m.roles.includes(r.key);
                  return (
                    <button
                      key={r.key}
                      onClick={() => toggleRoleForMember(m.userId, r.key)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                        isAssigned
                          ? `${r.badgeColor} shadow-2xs`
                          : 'bg-[#F8F6F0] text-[#A3A3A3] border-transparent hover:border-[#E7E7E7]'
                      }`}
                    >
                      {r.label}
                      {isAssigned && <Check className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E7E7E7] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E7E7E7] pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#F97316]" />
                <h3 className="text-sm font-bold text-[#171717]">Invite Studio Member to Project</h3>
              </div>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-[#A3A3A3] hover:text-[#171717]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#171717] mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#A3A3A3] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="artist@studio.com"
                    className="w-full pl-9 pr-3 py-2 bg-[#F8F6F0] border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#171717] mb-2">Assign Initial Roles (Multi-select)</label>
                <div className="grid grid-cols-2 gap-2">
                  {PROJECT_ROLES.map((r) => {
                    const isSelected = selectedInviteRoles.includes(r.key);
                    return (
                      <button
                        type="button"
                        key={r.key}
                        onClick={() => {
                          setSelectedInviteRoles((prev) =>
                            isSelected ? prev.filter((x) => x !== r.key) : [...prev, r.key]
                          );
                        }}
                        className={`p-2 rounded-lg text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-[#171717] text-white border-[#171717]'
                            : 'bg-[#F8F6F0] text-[#555555] border-[#E7E7E7] hover:border-[#171717]'
                        }`}
                      >
                        <span>{r.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#F97316]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E7E7E7]">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 bg-[#F8F6F0] text-[#555555] text-xs font-bold rounded-lg hover:bg-[#EAE6DF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold rounded-lg shadow-xs"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
