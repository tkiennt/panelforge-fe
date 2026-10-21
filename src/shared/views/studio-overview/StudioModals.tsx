import React from 'react';
import { X, RefreshCw, Shield, Monitor, LogOut, AlertTriangle } from 'lucide-react';
import { WorkspaceDto, WorkspaceSessionDto } from '@/services/workspace.service';

export interface WorkspaceAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeWorkspace: WorkspaceDto | null;
  filterEntity: string;
  onFilterEntityChange: (val: string) => void;
  onSearch: () => void;
  loading: boolean;
  logs: any[];
}

export const WorkspaceAuditModal: React.FC<WorkspaceAuditModalProps> = ({
  isOpen,
  onClose,
  activeWorkspace,
  filterEntity,
  onFilterEntityChange,
  onSearch,
  loading,
  logs,
}) => {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4'>
      <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col p-6 space-y-4'>
        <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
          <div>
            <div className='flex items-center gap-2 mb-0.5'>
              <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-xs font-bold'>
                PRODUCER // AUDIT TRAIL
              </span>
              <span className='text-xs text-[#888888] font-mono'>BR-18 Provenance Guarantee</span>
            </div>
            <h3 className='text-sm font-bold text-[#171717]'>
              Lịch Sử Thay Đổi Studio: {activeWorkspace?.name}
            </h3>
          </div>
          <button onClick={onClose} className='text-[#888888] hover:text-[#171717]'>
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Filter */}
        <div className='flex items-center gap-3 text-xs'>
          <input
            type='text'
            placeholder='Lọc theo Entity (Series, BibleEntry, PipelineStage...)'
            value={filterEntity}
            onChange={(e) => onFilterEntityChange(e.target.value)}
            className='px-3 py-1.5 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs w-64 focus:outline-none focus:border-[#F97316]'
          />
          <button
            onClick={onSearch}
            className='px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E7E7E7] hover:bg-[#F3F1EB] font-semibold flex items-center gap-1.5 cursor-pointer'
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
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
              {loading ? (
                <tr>
                  <td colSpan={5} className='py-8 text-center text-[#888888]'>
                    <RefreshCw className='w-5 h-5 animate-spin mx-auto mb-1 text-[#F97316]' />
                    <span>Đang tải lịch sử audit...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className='py-8 text-center text-[#888888]'>
                    Chưa có bản ghi audit nào trong Studio này.
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => (
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
  );
};

export interface WorkspaceSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeWorkspace: WorkspaceDto | null;
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  onRefresh: () => void;
  loading: boolean;
  sessions: WorkspaceSessionDto[];
  revokingSessionId: string | null;
  onRevokeSession: (sessionId: string, userName: string) => void;
}

export const WorkspaceSessionsModal: React.FC<WorkspaceSessionsModalProps> = ({
  isOpen,
  onClose,
  activeWorkspace,
  searchQuery,
  onSearchQueryChange,
  onRefresh,
  loading,
  sessions,
  revokingSessionId,
  onRevokeSession,
}) => {
  if (!isOpen) return null;

  const filteredSessions = sessions.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      s.fullName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.deviceName && s.deviceName.toLowerCase().includes(q))
    );
  });

  return (
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
            onClick={onClose}
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
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className='px-3 py-1.5 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs w-72 focus:outline-none focus:border-[#F97316]'
            />
            <button
              type='button'
              onClick={onRefresh}
              className='px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E7E7E7] hover:bg-[#F3F1EB] font-semibold flex items-center gap-1.5 cursor-pointer'
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>
          <div className='text-xs text-[#737373] font-mono'>
            Tổng cộng: <span className='font-bold text-[#171717]'>{sessions.length}</span> phiên
            đang hoạt động
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
              {loading ? (
                <tr>
                  <td colSpan={6} className='p-8 text-center text-[#888888] font-mono'>
                    Đang tải danh sách phiên làm việc...
                  </td>
                </tr>
              ) : filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className='p-8 text-center text-[#888888] font-mono'>
                    Không có phiên đăng nhập nào đang hoạt động.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((session) => (
                  <tr key={session.sessionId} className='hover:bg-[#FAF8F5] transition-colors'>
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
                        onClick={() => onRevokeSession(session.sessionId, session.fullName)}
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
            onClick={onClose}
            className='px-4 py-1.5 bg-[#171717] text-white rounded-lg text-xs font-semibold cursor-pointer'
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export interface EditMemberAccessModalProps {
  member: any;
  onClose: () => void;
  role: string;
  onRoleChange: (r: string) => void;
  task: string;
  onTaskChange: (t: string) => void;
  onSave: () => void;
}

export const EditMemberAccessModal: React.FC<EditMemberAccessModalProps> = ({
  member,
  onClose,
  role,
  onRoleChange,
  task,
  onTaskChange,
  onSave,
}) => {
  if (!member) return null;

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150'>
      <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden'>
        <div className='p-4 bg-[#FAF8F4] border-b border-[#E7E7E7] flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Shield className='w-4 h-4 text-[#F97316]' />
            <h3 className='font-serif font-bold text-base text-[#171717]'>
              Edit Access Policies: {member.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className='w-7 h-7 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] flex items-center justify-center text-[#888888] hover:text-[#171717] transition-all cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        <div className='p-6 space-y-4 text-xs'>
          <div>
            <label className='block font-mono font-bold uppercase tracking-wider text-[#888888] mb-1.5 text-xs'>
              Assigned Production Role (Single Role)
            </label>
            <div className='flex flex-wrap gap-2 mt-1'>
              {(['PRODUCER', 'ARTIST', 'WRITER', 'LETTERER', 'EDITOR'] as const).map((roleKey) => {
                const isSelected = role.toUpperCase() === roleKey;
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
                      onChange={() => onRoleChange(roleKey)}
                    />
                    <span>{roleKey}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className='block font-mono font-bold uppercase tracking-wider text-[#888888] mb-1.5 text-xs'>
              Current Assignment / Scope
            </label>
            <input
              type='text'
              value={task}
              onChange={(e) => onTaskChange(e.target.value)}
              className='w-full px-3 py-2 bg-[#FAF8F4] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-[#171717] focus:outline-none focus:border-[#F97316]'
            />
          </div>
        </div>

        <div className='p-4 bg-[#FAF8F4] border-t border-[#E7E7E7] flex items-center justify-between'>
          <button
            type='button'
            onClick={onClose}
            className='px-3.5 py-1.5 bg-white hover:bg-[#F3F1EB] border border-[#E7E7E7] text-[#555555] rounded-lg text-xs font-semibold cursor-pointer'
          >
            Cancel
          </button>
          <button
            type='button'
            onClick={onSave}
            className='px-4 py-1.5 bg-[#171717] hover:bg-black text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer'
          >
            Save Policies
          </button>
        </div>
      </div>
    </div>
  );
};

export interface DeleteMemberConfirmModalProps {
  member: { id: string; email: string } | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteMemberConfirmModal: React.FC<DeleteMemberConfirmModalProps> = ({
  member,
  onClose,
  onConfirm,
}) => {
  if (!member) return null;

  return (
    <div className='fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150'>
      <div className='bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-md w-full p-6 space-y-4'>
        <div className='flex items-center gap-3 text-red-600'>
          <div className='w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0'>
            <AlertTriangle className='w-5 h-5 text-red-600' />
          </div>
          <div>
            <h3 className='text-sm font-bold font-serif text-stone-900'>Xác nhận xóa thành viên</h3>
            <p className='text-xs text-stone-500 font-mono'>Thu hồi quyền truy cập Studio</p>
          </div>
        </div>
        <p className='text-xs text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200/80'>
          Bạn có chắc chắn muốn xóa thành viên{' '}
          <strong className='text-stone-900'>{member.email}</strong> khỏi Studio? Mọi phiên đăng
          nhập sẽ bị chấm dứt ngay lập tức và các khóa ủy quyền chữ ký ECDSA sẽ bị thu hồi.
        </p>
        <div className='flex items-center justify-end gap-2 pt-2'>
          <button
            type='button'
            onClick={onClose}
            className='px-3.5 py-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-700 cursor-pointer transition-colors'
          >
            Hủy
          </button>
          <button
            type='button'
            onClick={onConfirm}
            className='px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors'
          >
            Xác nhận xóa
          </button>
        </div>
      </div>
    </div>
  );
};
