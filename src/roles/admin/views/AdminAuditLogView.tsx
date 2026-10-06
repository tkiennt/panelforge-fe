// src/views/admin/AdminAuditLogView.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  List,
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  User,
  Database,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  FileText,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  adminService,
  AuditLogDto,
  AuditLogFilterParams,
  downloadBlob,
} from '@/services/admin.service';

const ENTITY_OPTIONS = [
  { value: '', label: 'Tất cả đối tượng (All Entities)' },
  { value: 'Series', label: 'Series' },
  { value: 'BibleEntry', label: 'BibleEntry' },
  { value: 'PipelineStage', label: 'PipelineStage' },
  { value: 'Workspace', label: 'Workspace' },
  { value: 'User', label: 'User' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'Tất cả hành động (All Actions)' },
  { value: 'CREATE', label: 'CREATE (Tạo mới)' },
  { value: 'UPDATE', label: 'UPDATE (Chỉnh sửa)' },
  { value: 'DELETE', label: 'DELETE (Xóa mềm)' },
  { value: 'ASSIGN_PRODUCER', label: 'ASSIGN_PRODUCER' },
];

export const AdminAuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filters State
  const [userEmail, setUserEmail] = useState('');
  const [entityName, setEntityName] = useState('');
  const [entityId, setEntityId] = useState('');
  const [action, setAction] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Changes Inspector Modal State
  const [inspectLog, setInspectLog] = useState<AuditLogDto | null>(null);

  // Toast / Feedback State
  const [toast, setToast] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const buildFilterParams = useCallback((): AuditLogFilterParams | null => {
    setDateError(null);
    let fromIso: string | undefined;
    let toIso: string | undefined;

    if (fromDate) {
      fromIso = new Date(`${fromDate}T00:00:00Z`).toISOString();
    }
    if (toDate) {
      toIso = new Date(`${toDate}T23:59:59Z`).toISOString();
    }

    if (fromIso && toIso && fromIso > toIso) {
      setDateError('Khoảng ngày không hợp lệ: Từ ngày (From) phải trước hoặc bằng Đến ngày (To).');
      return null;
    }

    const params: AuditLogFilterParams = {
      page,
      pageSize,
    };

    if (userEmail.trim()) params.userEmail = userEmail.trim();
    if (entityName) params.entityName = entityName;
    if (entityId.trim()) params.entityId = entityId.trim();
    if (action) params.action = action;
    if (fromIso) params.from = fromIso;
    if (toIso) params.to = toIso;

    return params;
  }, [page, pageSize, userEmail, entityName, entityId, action, fromDate, toDate]);

  const fetchLogs = useCallback(async () => {
    const params = buildFilterParams();
    if (!params) return;

    setLoading(true);
    try {
      const res = await adminService.getAuditLogs(params);
      setLogs(res.items || []);
      setTotalCount(res.totalCount || 0);
    } catch (err: any) {
      showToast(err.message || 'Không thể tải Audit Log.', 'error');
    } finally {
      setLoading(false);
    }
  }, [buildFilterParams]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleResetFilter = () => {
    setUserEmail('');
    setEntityName('');
    setEntityId('');
    setAction('');
    setFromDate('');
    setToDate('');
    setDateError(null);
    setPage(1);
  };

  const handleExportCsv = async () => {
    const params = buildFilterParams();
    if (!params) return;

    setExporting(true);
    try {
      const result = await adminService.exportAuditLogs(params);
      downloadBlob(result.blob, result.fileName);

      if (result.isTruncated) {
        showToast(
          `Đã tải file CSV (${result.rowCount.toLocaleString()} dòng). Chú ý: Dữ liệu đã bị giới hạn ở 10.000 dòng mới nhất (X-Export-Truncated).`,
          'warning',
        );
      } else {
        showToast(
          `Đã xuất thành công ${result.rowCount.toLocaleString()} dòng vào file ${result.fileName}!`,
          'success',
        );
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xuất CSV.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Helper formatting for Action Badges
  const renderActionBadge = (act: string) => {
    const upper = (act || '').toUpperCase();
    if (upper.includes('CREATE') || upper.includes('ADD')) {
      return (
        <span className='px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200'>
          {act}
        </span>
      );
    }
    if (upper.includes('DELETE') || upper.includes('REMOVE')) {
      return (
        <span className='px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-50 text-red-700 border border-red-200'>
          {act}
        </span>
      );
    }
    if (upper.includes('UPDATE') || upper.includes('EDIT')) {
      return (
        <span className='px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200'>
          {act}
        </span>
      );
    }
    if (upper.includes('ASSIGN')) {
      return (
        <span className='px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200'>
          {act}
        </span>
      );
    }
    return (
      <span className='px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-100 text-neutral-700 border border-neutral-200'>
        {act}
      </span>
    );
  };

  return (
    <div className='p-6 md:p-8 space-y-6'>
      {/* Toast Feedback */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg text-xs font-semibold animate-in slide-in-from-top-2 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : toast.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className='w-4 h-4 text-emerald-600' />}
          {toast.type === 'warning' && <AlertCircle className='w-4 h-4 text-amber-600' />}
          {toast.type === 'error' && <ShieldAlert className='w-4 h-4 text-red-600' />}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className='ml-2 text-neutral-400 hover:text-neutral-700'
          >
            <X className='w-3.5 h-3.5' />
          </button>
        </div>
      )}

      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs'>
        <div>
          <div className='flex items-center gap-2 mb-1'>
            <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-[10px] font-bold'>
              UC-15 // AUDIT TRAIL
            </span>
            <span className='text-xs text-[#888888] font-mono'>
              Data Provenance &amp; Activity Log
            </span>
          </div>
          <h1 className='text-2xl font-serif font-bold text-[#171717] tracking-tight'>
            Nhật Ký Kiểm Toán Toàn Hệ Thống (Audit Logs)
          </h1>
          <p className='text-xs text-[#737373] mt-1'>
            Ghi vết bất biến append-only mọi thao tác thay đổi dữ liệu, người thực hiện, địa chỉ IP
            và payload chi tiết (BR-18).
          </p>
        </div>

        <div className='flex items-center gap-2.5'>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className='inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E7E7E7] hover:bg-[#FAF8F5] text-xs font-semibold text-[#171717] shadow-xs cursor-pointer disabled:opacity-50'
            title='Tải lại dữ liệu'
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#F97316]' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={exporting || loading}
            className='inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#171717] hover:bg-black text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50'
            title='Xuất tối đa 10.000 dòng có Bearer Auth'
          >
            <Download className='w-3.5 h-3.5 text-[#F97316]' />
            <span>{exporting ? 'Đang xuất CSV...' : 'Xuất CSV (UC-15)'}</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <form
        onSubmit={handleApplyFilter}
        className='bg-white p-5 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-4'
      >
        <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
          <div className='flex items-center gap-2 text-xs font-bold text-[#171717]'>
            <Filter className='w-4 h-4 text-[#F97316]' />
            <span>Bộ Lọc Tìm Kiếm Chi Tiết (Query Filters)</span>
          </div>
          <button
            type='button'
            onClick={handleResetFilter}
            className='text-[11px] text-[#737373] hover:text-[#171717] font-medium'
          >
            Xóa bộ lọc
          </button>
        </div>

        {dateError && (
          <div className='p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2'>
            <AlertCircle className='w-4 h-4 text-red-600 shrink-0' />
            <span>{dateError}</span>
          </div>
        )}

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs'>
          {/* Email */}
          <div>
            <label className='block font-semibold text-[#171717] mb-1'>
              Email người dùng (userEmail)
            </label>
            <div className='relative'>
              <Search className='w-3.5 h-3.5 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2' />
              <input
                type='text'
                placeholder='vd: user@example.com'
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className='w-full pl-8 pr-3 py-1.5 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
              />
            </div>
          </div>

          {/* Entity Name */}
          <div>
            <label className='block font-semibold text-[#171717] mb-1'>
              Tên thực thể (entityName)
            </label>
            <select
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              className='w-full px-3 py-1.5 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
            >
              {ENTITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action */}
          <div>
            <label className='block font-semibold text-[#171717] mb-1'>Hành động (Action)</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className='w-full px-3 py-1.5 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Entity ID */}
          <div>
            <label className='block font-semibold text-[#171717] mb-1'>
              Mã ID thực thể (entityId)
            </label>
            <input
              type='text'
              placeholder='vd: Guid hoặc ID'
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className='w-full px-3 py-1.5 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs font-mono focus:outline-none focus:border-[#F97316]'
            />
          </div>

          {/* From Date */}
          <div>
            <label className='block font-semibold text-[#171717] mb-1 flex items-center gap-1'>
              <Calendar className='w-3 h-3 text-[#888888]' />
              <span>Từ ngày (From UTC)</span>
            </label>
            <input
              type='date'
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className='w-full px-3 py-1.5 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
            />
          </div>

          {/* To Date */}
          <div>
            <label className='block font-semibold text-[#171717] mb-1 flex items-center gap-1'>
              <Calendar className='w-3 h-3 text-[#888888]' />
              <span>Đến ngày (To UTC)</span>
            </label>
            <input
              type='date'
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className='w-full px-3 py-1.5 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
            />
          </div>

          {/* Page Size */}
          <div>
            <label className='block font-semibold text-[#171717] mb-1'>Số dòng / Trang</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className='w-full px-3 py-1.5 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs focus:outline-none focus:border-[#F97316]'
            >
              <option value={10}>10 dòng</option>
              <option value={25}>25 dòng</option>
              <option value={50}>50 dòng</option>
              <option value={100}>100 dòng</option>
            </select>
          </div>

          {/* Filter Button */}
          <div className='flex items-end'>
            <button
              type='submit'
              className='w-full py-1.5 px-4 bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer'
            >
              Áp Dụng Bộ Lọc
            </button>
          </div>
        </div>
      </form>

      {/* Main Table */}
      <div className='bg-white border border-[#E7E7E7] rounded-2xl shadow-xs overflow-hidden flex flex-col'>
        <div className='overflow-x-auto'>
          <table className='w-full text-left border-collapse'>
            <thead className='bg-[#FAF8F5] border-b border-[#E7E7E7] text-[11px] font-mono font-bold text-[#737373] uppercase tracking-wider'>
              <tr>
                <th className='py-3 px-4'>Thời Gian (UTC / Local)</th>
                <th className='py-3 px-4'>Người Thực Hiện (Actor)</th>
                <th className='py-3 px-4'>Hành Động</th>
                <th className='py-3 px-4'>Thực Thể (Entity)</th>
                <th className='py-3 px-4'>Chi Tiết (Details)</th>
                <th className='py-3 px-4'>IP Address</th>
                <th className='py-3 px-4 text-center'>Thay Đổi (Payload)</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-[#E7E7E7] text-xs'>
              {loading ? (
                <tr>
                  <td colSpan={7} className='py-12 text-center text-[#888888]'>
                    <RefreshCw className='w-6 h-6 animate-spin text-[#F97316] mx-auto mb-2' />
                    <span>Đang tải danh sách nhật ký kiểm toán...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className='py-12 text-center text-[#888888] space-y-1'>
                    <List className='w-8 h-8 text-[#888888] mx-auto' />
                    <div className='font-bold text-[#171717]'>Không tìm thấy Audit Log nào</div>
                    <div className='text-[11px] text-[#737373]'>
                      Thử điều chỉnh lại bộ lọc ngày, email người dùng hoặc hành động.
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((item) => (
                  <tr key={item.id} className='hover:bg-[#FAF8F5] transition-colors'>
                    <td className='py-3 px-4 font-mono text-[11px] whitespace-nowrap text-[#555555]'>
                      <div className='flex items-center gap-1.5 text-[#171717] font-semibold'>
                        <Clock className='w-3 h-3 text-[#F97316]' />
                        <span>{new Date(item.createdAt).toLocaleTimeString('vi-VN')}</span>
                      </div>
                      <div className='text-[10px] text-[#888888]'>
                        {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </td>

                    <td className='py-3 px-4'>
                      <div className='flex items-center gap-1.5'>
                        <User className='w-3.5 h-3.5 text-[#888888]' />
                        <span className='font-semibold text-[#171717]'>
                          {item.userEmail ||
                            (item.userId
                              ? `ID: ${item.userId.substring(0, 8)}...`
                              : 'Hệ Thống (System)')}
                        </span>
                      </div>
                      {item.userId && (
                        <div
                          className='text-[10px] font-mono text-[#888888] truncate max-w-[140px]'
                          title={item.userId}
                        >
                          {item.userId}
                        </div>
                      )}
                    </td>

                    <td className='py-3 px-4 whitespace-nowrap'>
                      {renderActionBadge(item.action)}
                    </td>

                    <td className='py-3 px-4 font-mono text-[11px]'>
                      <div className='flex items-center gap-1 text-[#171717] font-semibold'>
                        <Database className='w-3 h-3 text-[#888888]' />
                        <span>{item.entityName}</span>
                      </div>
                      <span
                        className='text-[10px] text-[#888888] truncate max-w-[120px] inline-block'
                        title={item.entityId}
                      >
                        {item.entityId}
                      </span>
                    </td>

                    <td className='py-3 px-4 max-w-xs'>
                      <div className='truncate text-[#555555]' title={item.details || ''}>
                        {item.details || '—'}
                      </div>
                      {item.workspaceName && (
                        <div className='text-[10px] text-[#888888] font-mono'>
                          WS: {item.workspaceName}
                        </div>
                      )}
                    </td>

                    <td className='py-3 px-4 font-mono text-[11px] text-[#737373] whitespace-nowrap'>
                      {item.ipAddress || '—'}
                    </td>

                    <td className='py-3 px-4 text-center'>
                      {item.changesJson ? (
                        <button
                          type='button'
                          onClick={() => setInspectLog(item)}
                          className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#E7E7E7] hover:border-[#171717] text-[#171717] text-[11px] font-semibold transition-all cursor-pointer shadow-2xs'
                          title='Xem chi tiết thay đổi changesJson'
                        >
                          <Eye className='w-3 h-3 text-[#F97316]' />
                          <span>Chi tiết</span>
                        </button>
                      ) : (
                        <span className='text-[#888888] text-[11px] font-mono'>—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className='p-4 bg-[#FAF8F5] border-t border-[#E7E7E7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs'>
          <div className='text-[#737373] font-mono'>
            Hiển thị <span className='font-bold text-[#171717]'>{logs.length}</span> / Tổng{' '}
            <span className='font-bold text-[#171717]'>{totalCount.toLocaleString()}</span> bản ghi
            (Trang {page} / {totalPages})
          </div>

          <div className='flex items-center gap-2'>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className='p-1.5 rounded-lg border border-[#E7E7E7] bg-white text-[#171717] disabled:opacity-40 hover:bg-[#FAF8F5] transition-colors cursor-pointer'
            >
              <ChevronLeft className='w-4 h-4' />
            </button>
            <span className='font-mono font-bold text-xs text-[#171717] px-2'>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className='p-1.5 rounded-lg border border-[#E7E7E7] bg-white text-[#171717] disabled:opacity-40 hover:bg-[#FAF8F5] transition-colors cursor-pointer'
            >
              <ChevronRight className='w-4 h-4' />
            </button>
          </div>
        </div>
      </div>

      {/* Changes JSON Inspector Modal */}
      {inspectLog && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4'>
          <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150'>
            <div className='p-4 border-b border-[#E7E7E7] flex items-center justify-between bg-[#FAF8F5]'>
              <div className='flex items-center gap-2'>
                <FileText className='w-4 h-4 text-[#F97316]' />
                <div>
                  <h3 className='text-sm font-bold text-[#171717]'>
                    Chi Tiết Payload Thay Đổi (changesJson)
                  </h3>
                  <div className='text-[10px] text-[#888888] font-mono'>
                    Log ID: {inspectLog.id} • {inspectLog.action} {inspectLog.entityName}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className='w-7 h-7 rounded-lg hover:bg-white flex items-center justify-center text-[#888888] hover:text-[#171717]'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            <div className='p-6 overflow-y-auto space-y-4 flex-1 text-xs'>
              <div className='grid grid-cols-2 gap-3 p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7] font-mono text-[11px]'>
                <div>
                  <span className='text-[#888888]'>Người thực hiện: </span>
                  <strong className='text-[#171717]'>
                    {inspectLog.userEmail || inspectLog.userId || 'System'}
                  </strong>
                </div>
                <div>
                  <span className='text-[#888888]'>IP: </span>
                  <strong className='text-[#171717]'>{inspectLog.ipAddress || '—'}</strong>
                </div>
                <div>
                  <span className='text-[#888888]'>Thực thể: </span>
                  <strong className='text-[#171717]'>
                    {inspectLog.entityName} ({inspectLog.entityId})
                  </strong>
                </div>
                <div>
                  <span className='text-[#888888]'>Thời gian: </span>
                  <strong className='text-[#171717]'>
                    {new Date(inspectLog.createdAt).toLocaleString('vi-VN')}
                  </strong>
                </div>
              </div>

              <div>
                <div className='flex items-center justify-between mb-1.5'>
                  <span className='font-bold text-[#171717]'>Dữ liệu JSON Thay Đổi:</span>
                  <span className='text-[10px] font-mono text-[#888888]'>
                    CREATE: &#123;field: val&#125; • UPDATE: &#123;field: &#123;old, new&#125;&#125;
                  </span>
                </div>
                <pre className='p-4 bg-[#171717] text-[#10B981] font-mono text-xs rounded-xl overflow-x-auto max-h-96 border border-[#262626] leading-relaxed'>
                  {(() => {
                    try {
                      const parsed = JSON.parse(inspectLog.changesJson || '{}');
                      return JSON.stringify(parsed, null, 2);
                    } catch {
                      return inspectLog.changesJson || 'Không có dữ liệu payload';
                    }
                  })()}
                </pre>
              </div>
            </div>

            <div className='p-4 bg-[#FAF8F5] border-t border-[#E7E7E7] flex justify-end'>
              <button
                type='button'
                onClick={() => setInspectLog(null)}
                className='px-4 py-2 bg-[#171717] hover:bg-black text-white text-xs font-semibold rounded-lg'
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
