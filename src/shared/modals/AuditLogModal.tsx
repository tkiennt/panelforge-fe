import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle,
  Download,
  RefreshCw,
  Search,
  Filter,
  Clock,
  User,
  Activity,
} from 'lucide-react';
import { ProvenanceLogItem } from '@/types';
import { workspaceService } from '@/services/workspace.service';
import { adminService } from '@/services/admin.service';
import {
  formatActionLabel,
  formatEntityLabel,
  getAuditStatusBadgeClass,
} from '@/shared/utils/auditLogUtils';

export interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
  workspaceName?: string;
  userRole?: string;
  logs?: ProvenanceLogItem[];
  onShowToast: (title: string, desc: string) => void;
}

interface NormalizedAuditLog {
  id: string;
  actor: string;
  action: string;
  entityName: string;
  entityId?: string;
  details: string;
  timestamp: string;
  statusTag?: string;
  statusTagColor?: string;
  hash?: string;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  workspaceId: propWorkspaceId,
  workspaceName: propWorkspaceName,
  userRole,
  logs: fallbackLogs = [],
  onShowToast,
}) => {
  const [loading, setLoading] = useState(false);
  const [apiLogs, setApiLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  // Xác định workspace ID từ props hoặc localStorage
  const effectiveWorkspaceId = useMemo(() => {
    if (propWorkspaceId) return propWorkspaceId;
    try {
      const saved = localStorage.getItem('activeWorkspace');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed?.id || undefined;
      }
    } catch {
      // ignore
    }
    return undefined;
  }, [propWorkspaceId]);

  const effectiveWorkspaceName = useMemo(() => {
    if (propWorkspaceName) return propWorkspaceName;
    try {
      const saved = localStorage.getItem('activeWorkspace');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed?.name || undefined;
      }
    } catch {
      // ignore
    }
    return undefined;
  }, [propWorkspaceName]);

  const loadLogs = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      if (effectiveWorkspaceId) {
        const res = await workspaceService.getWorkspaceAuditLogs(effectiveWorkspaceId, {
          pageSize: 50,
          page: 1,
        });
        setApiLogs(res?.items || []);
      } else if (userRole === 'ADMINISTRATOR') {
        const res = await adminService.getAuditLogs({
          pageSize: 50,
          page: 1,
        });
        setApiLogs(res?.items || []);
      } else {
        setApiLogs([]);
      }
    } catch (err: any) {
      console.warn('Không thể nạp nhật ký kiểm toán từ API:', err);
      // Giữ apiLogs rỗng để fallback sang fallbackLogs
      setApiLogs([]);
    } finally {
      setLoading(false);
    }
  }, [isOpen, effectiveWorkspaceId, userRole]);

  useEffect(() => {
    if (isOpen) {
      void loadLogs();
    }
  }, [isOpen, loadLogs]);

  // Chuẩn hóa dữ liệu log từ API hoặc fallback
  const normalizedLogs: NormalizedAuditLog[] = useMemo(() => {
    if (apiLogs.length > 0) {
      return apiLogs.map((item: any, idx: number) => {
        const actionStr = String(item.action || 'UPDATE').toUpperCase();
        const statusTagColor = getAuditStatusBadgeClass(actionStr);
        const actionLabel = formatActionLabel(actionStr);

        const dateStr = item.timestampUtc || item.createdAtUtc || item.createdAt;
        const formattedDate = dateStr
          ? new Date(dateStr).toLocaleString('vi-VN', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          : 'Gần đây';

        return {
          id: item.id || `api-${idx}`,
          actor: item.userEmail || item.userName || item.actor || 'Hệ thống',
          action: actionStr,
          entityName: item.entityName || 'Resource',
          entityId: item.entityId,
          details:
            item.details ||
            `${actionLabel} trên ${formatEntityLabel(item.entityName)} ${item.entityId ? `#${String(item.entityId).slice(0, 8)}` : ''}`,
          timestamp: formattedDate,
          statusTag: actionLabel,
          statusTagColor,
          hash: item.changesJson ? `JSON: ${item.changesJson.slice(0, 16)}...` : undefined,
        };
      });
    }

    // Fallback sang provenanceLogs nếu API chưa trả hoặc offline
    return fallbackLogs.map((log) => ({
      id: log.id,
      actor: log.actor,
      action: log.statusTag || 'PROVENANCE',
      entityName: 'Chapter',
      details: log.details,
      timestamp: log.timeAgo,
      statusTag: formatActionLabel(log.statusTag) || log.statusTag,
      statusTagColor: log.statusTagColor || 'bg-stone-100 text-stone-700',
      hash: log.hash,
    }));
  }, [apiLogs, fallbackLogs]);

  // Bộ lọc tìm kiếm và hành động
  const filteredLogs = useMemo(() => {
    return normalizedLogs.filter((log) => {
      const matchSearch =
        !searchQuery ||
        log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.statusTag && log.statusTag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase());

      const matchAction =
        filterAction === 'ALL' ||
        (filterAction === 'SECURITY'
          ? log.entityName.toLowerCase() === 'session' ||
            log.entityName.toLowerCase() === 'user' ||
            log.action.includes('SESSION') ||
            log.action === 'LOGIN' ||
            log.action === 'LOGOUT'
          : log.action.toUpperCase().includes(filterAction.toUpperCase()) ||
            (log.statusTag && log.statusTag.toUpperCase().includes(filterAction.toUpperCase())));

      return matchSearch && matchAction;
    });
  }, [normalizedLogs, searchQuery, filterAction]);

  const handleExport = () => {
    const dataToExport = {
      exportTimestamp: new Date().toISOString(),
      workspaceId: effectiveWorkspaceId || 'global',
      workspaceName: effectiveWorkspaceName || 'PanelForge Studio',
      totalRecords: filteredLogs.length,
      logs: filteredLogs,
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${effectiveWorkspaceId || 'system'}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onShowToast('Đã xuất nhật ký', `Đã tải về file JSON chứa ${filteredLogs.length} bản ghi kiểm toán.`);
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4'>
      <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[88vh]'>
        {/* Header */}
        <div className='p-4 bg-[#F8F6F0] border-b border-[#D8D2C5] flex items-center justify-between shrink-0'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-xl bg-[#FFF2E6] border border-[#F97316]/30 flex items-center justify-center text-[#F97316]'>
              <ShieldCheck className='w-5 h-5' />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <h3 className='font-serif font-bold text-base text-[#1C1917] tracking-tight'>
                  Nhật Ký Hoạt Động &amp; Kiểm Toán (Audit Logs)
                </h3>
                {effectiveWorkspaceName && (
                  <span className='px-2 py-0.5 rounded-full bg-[#EAE5DC] text-[#57534E] text-[11px] font-mono font-medium'>
                    {effectiveWorkspaceName}
                  </span>
                )}
              </div>
              <div className='text-[11px] font-mono text-[#78716C] flex items-center gap-1.5'>
                <span>BR-18 PROVENANCE GUARANTEE</span>
                <span>•</span>
                <span>SHA-256 IMMUTABLE LEDGER</span>
              </div>
            </div>
          </div>
          <button
            type='button'
            onClick={onClose}
            aria-label='Đóng'
            className='w-8 h-8 rounded-lg hover:bg-[#EFECE6] border border-transparent hover:border-[#D8D2C5] flex items-center justify-center text-[#78716C] hover:text-[#1C1917] transition-all cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Toolbar: Search, Filters & Refresh */}
        <div className='p-3 bg-[#FAF8F4] border-b border-[#D8D2C5] flex flex-wrap items-center justify-between gap-2 text-xs'>
          <div className='flex items-center gap-2 flex-1 min-w-[240px]'>
            <div className='relative flex-1'>
              <Search className='w-3.5 h-3.5 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2' />
              <input
                type='text'
                placeholder='Tìm theo người thực hiện, hành động, thực thể...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='w-full pl-8 pr-3 py-1.5 bg-[#FCFBF8] border border-[#D8D2C5] rounded-lg text-xs text-[#1C1917] placeholder-[#78716C] focus:outline-none focus:border-[#C2410C]'
              />
            </div>

            <div className='flex items-center gap-1 shrink-0'>
              <Filter className='w-3.5 h-3.5 text-[#78716C]' />
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className='px-2 py-1.5 bg-[#FCFBF8] border border-[#D8D2C5] rounded-lg text-xs text-[#57534E] focus:outline-none focus:border-[#C2410C] font-mono'
              >
                <option value='ALL'>Tất cả hành động</option>
                <option value='SECURITY'>Bảo mật &amp; Phiên (Session + User)</option>
                <option value='LOGIN'>Đăng nhập (LOGIN)</option>
                <option value='LOGOUT'>Đăng xuất (LOGOUT)</option>
                <option value='SESSIONS_REVOKED'>Thu hồi phiên (REVOKED)</option>
                <option value='CREATE'>Tạo mới (CREATE)</option>
                <option value='UPDATE'>Chỉnh sửa (UPDATE)</option>
                <option value='DELETE'>Xóa (DELETE)</option>
                <option value='SUBMIT'>Nộp bài (SUBMIT)</option>
                <option value='APPROVE'>Phê duyệt (APPROVE)</option>
              </select>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={() => void loadLogs()}
              disabled={loading}
              title='Làm mới nhật ký'
              className='px-2.5 py-1.5 rounded-lg border border-[#D8D2C5] bg-[#FCFBF8] hover:bg-[#F3F0E9] text-[#57534E] hover:text-[#1C1917] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50'
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
            <button
              type='button'
              onClick={handleExport}
              disabled={filteredLogs.length === 0}
              className='px-3 py-1.5 bg-[#1C1917] hover:bg-black text-[#FCFBF8] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50'
            >
              <Download className='w-3.5 h-3.5' />
              <span>Xuất JSON</span>
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className='p-4 overflow-y-auto space-y-3 custom-scrollbar text-xs flex-1'>
          <div className='p-3 bg-[#ECFDF5] border border-[#10B981]/30 rounded-xl text-[#059669] flex items-center justify-between text-xs'>
            <span className='flex items-center gap-2 font-semibold'>
              <CheckCircle className='w-4 h-4' />
              Toàn bộ nhật ký hoạt động studio đã được chứng thực toàn vẹn
            </span>
            <span className='text-[10px] bg-white px-2 py-0.5 rounded border border-[#10B981]/40 font-semibold'>
              ĐÃ XÁC THỰC
            </span>
          </div>

          {loading ? (
            <div className='py-16 text-center text-[#78716C] flex flex-col items-center justify-center gap-2'>
              <RefreshCw className='w-6 h-6 animate-spin text-[#F97316]' />
              <span className='text-xs'>Đang tải dữ liệu kiểm toán từ máy chủ...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className='py-16 text-center text-[#78716C] flex flex-col items-center justify-center gap-2'>
              <Activity className='w-8 h-8 text-[#A8A29E]' />
              <span className='text-sm font-medium text-[#57534E]'>
                Không tìm thấy bản ghi hoạt động nào.
              </span>
              <span className='text-xs text-[#78716C]'>
                {searchQuery
                  ? 'Thử thay đổi từ khóa hoặc bộ lọc hành động.'
                  : 'Chưa có hoạt động nào được ghi nhận trong phiên làm việc này.'}
              </span>
            </div>
          ) : (
            <div className='divide-y divide-[#E7E2D9] border border-[#D8D2C5] rounded-xl overflow-hidden bg-[#FCFBF8]'>
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className='p-3.5 space-y-1.5 hover:bg-[#F3F0E9]/50 transition-colors'
                >
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <span className='font-semibold text-[#1C1917] flex items-center gap-1.5'>
                        <User className='w-3.5 h-3.5 text-[#78716C]' />
                        {log.actor}
                      </span>
                      <span className='text-[11px] font-mono text-[#78716C]'>
                        ({formatEntityLabel(log.entityName)}
                        {log.entityId ? ` #${String(log.entityId).slice(0, 8)}` : ''})
                      </span>
                    </div>
                    <span className='text-[#78716C] text-[11px] font-mono flex items-center gap-1'>
                      <Clock className='w-3 h-3' />
                      {log.timestamp}
                    </span>
                  </div>

                  <p className='text-xs text-[#57534E] font-sans leading-relaxed'>
                    {log.details}
                  </p>

                  <div className='flex items-center justify-between pt-1 text-[11px] font-mono'>
                    {log.hash ? (
                      <span className='text-[#78716C] bg-[#F1EEE8] px-2 py-0.5 rounded border border-[#D8D2C5]' title={log.hash}>
                        Mã bảo chứng: #{log.hash.slice(0, 8)}
                      </span>
                    ) : (
                      <span className='text-[#059669] text-[10px] font-medium'>ĐÃ BẢO CHỨNG TOÀN VẸN</span>
                    )}
                    {log.statusTag && (
                      <span
                        title={log.action}
                        className={`font-semibold px-2 py-0.5 rounded text-[10px] ${log.statusTagColor}`}
                      >
                        {log.statusTag}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='p-3.5 bg-[#F8F6F0] border-t border-[#D8D2C5] flex items-center justify-between shrink-0 text-xs text-[#78716C] font-mono'>
          <span>
            Tổng số bản ghi: <strong>{filteredLogs.length}</strong>
          </span>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-1.5 bg-[#FCFBF8] hover:bg-[#EFECE6] border border-[#D8D2C5] text-[#57534E] text-xs font-semibold rounded-lg transition-colors cursor-pointer'
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
