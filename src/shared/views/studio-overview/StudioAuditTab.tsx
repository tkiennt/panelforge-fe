import React from 'react';
import { History, RefreshCw, Search, ShieldCheck, Download, CheckCircle2, Lock, FileSpreadsheet, User } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export interface StudioAuditTabProps {
  logs: any[];
  loading: boolean;
  filterEntity: string;
  onFilterChange: (val: string) => void;
  onRefresh: () => void;
  workspaceName?: string;
}

export const StudioAuditTab: React.FC<StudioAuditTabProps> = ({
  logs,
  loading,
  filterEntity,
  onFilterChange,
  onRefresh,
  workspaceName,
}) => {
  const { t } = useTranslation();

  const filteredLogs = React.useMemo(() => {
    if (!filterEntity.trim()) return logs;
    const q = filterEntity.toLowerCase().trim();
    return logs.filter((log) => {
      const entity = (log.entityName || log.targetType || '').toLowerCase();
      const action = (log.action || log.operation || '').toLowerCase();
      const user = (log.actorName || log.userName || '').toLowerCase();
      const desc = (log.description || log.details || '').toLowerCase();
      return entity.includes(q) || action.includes(q) || user.includes(q) || desc.includes(q);
    });
  }, [logs, filterEntity]);

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Thời gian', 'Nhân sự', 'Hành động', 'Đối tượng', 'Chi tiết'];
    const rows = filteredLogs.map((log) => [
      `"${log.timestamp || log.createdAt || log.createdUtc || ''}"`,
      `"${log.actorName || log.userName || log.userEmail || 'Hệ thống'}"`,
      `"${log.action || log.operation || 'Cập nhật'}"`,
      `"${log.entityName || log.targetType || ''}"`,
      `"${(log.description || log.details || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Studio_Audit_${workspaceName || 'Log'}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className='space-y-4 animate-in fade-in duration-200'>
      {/* Stitch Header & Controls */}
      <div className='bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <div>
          <div className='flex items-center gap-2'>
            <History className='w-4 h-4 text-orange-600' />
            <h2 className='text-xl font-bold text-stone-900'>
              Nhật ký hoạt động kiểm soát biên tập
            </h2>
          </div>
          <p className='text-xs text-stone-500 mt-0.5'>
            Theo dõi lịch sử thay đổi phiên bản trang vẽ, duyệt kịch bản và phân quyền thành viên
          </p>
        </div>

        {/* Filter Controls & Export */}
        <div className='flex items-center gap-2.5 flex-wrap sm:flex-nowrap'>
          <div className='relative flex-1 sm:w-64'>
            <Search className='w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2' />
            <input
              type='text'
              value={filterEntity}
              onChange={(e) => onFilterChange(e.target.value)}
              placeholder='Lọc thao tác, nhân sự, dự án...'
              className='w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-orange-500 transition-colors'
            />
          </div>

          <button
            type='button'
            onClick={handleExportCsv}
            className='inline-flex items-center gap-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 px-3 py-1.5 rounded-lg text-xs shadow-2xs font-medium cursor-pointer transition-colors whitespace-nowrap'
            title='Xuất báo cáo tập tin CSV'
          >
            <Download className='w-3.5 h-3.5 text-orange-600' />
            <span>.CSV Xuất dữ liệu</span>
          </button>

          <button
            type='button'
            onClick={onRefresh}
            disabled={loading}
            className='focus-ring min-h-9 px-3 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200/80 rounded-xl inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors'
            title='Làm mới nhật ký'
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-600' : ''}`} />
            <span className='hidden sm:inline'>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Logs Table / List */}
      <div className='bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden'>
        {loading && logs.length === 0 ? (
          <div className='py-12 flex flex-col items-center justify-center gap-2 text-stone-500 text-xs'>
            <RefreshCw className='w-5 h-5 animate-spin text-orange-600' />
            <span>Đang tải dữ liệu nhật ký kiểm soát...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className='py-12 px-4 text-center space-y-2'>
            <ShieldCheck className='w-8 h-8 text-stone-400 mx-auto' />
            <h4 className='text-sm font-bold text-stone-800'>Chưa có bản ghi nhật ký</h4>
            <p className='text-xs text-stone-500 max-w-sm mx-auto'>
              {filterEntity
                ? 'Không tìm thấy sự kiện nào khớp với từ khóa tìm kiếm.'
                : 'Mọi hoạt động tạo dự án, phân công và kiểm soát biên tập sẽ được ghi nhận tại đây.'}
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-xs'>
              <thead className='bg-[#FAF9F5] border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[11px]'>
                <tr>
                  <th className='py-3 px-4'>Thời gian</th>
                  <th className='py-3 px-4'>Nhân sự thực hiện</th>
                  <th className='py-3 px-4'>Hành động</th>
                  <th className='py-3 px-4'>Đối tượng</th>
                  <th className='py-3 px-4'>Chi tiết</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-stone-100 text-stone-800'>
                {filteredLogs.map((log, idx) => {
                  const time = log.timestamp || log.createdAt || log.createdUtc;
                  const formattedTime = time ? new Date(time).toLocaleString('vi-VN') : '—';
                  const actor = log.actorName || log.userName || log.userEmail || 'Hệ thống';
                  const action = log.action || log.operation || 'Cập nhật';
                  const target = log.entityName || log.targetType || log.entityType || '—';
                  const details = log.description || log.details || log.metadataJson || '—';

                  return (
                    <tr key={log.id || idx} className='hover:bg-stone-50 transition-colors'>
                      <td className='py-3 px-4 font-mono text-stone-500 whitespace-nowrap text-[11px]'>
                        {formattedTime}
                      </td>
                      <td className='py-3 px-4 font-medium text-stone-900 whitespace-nowrap'>
                        <div className='flex items-center gap-1.5'>
                          <User className='w-3.5 h-3.5 text-stone-400' />
                          <span>{actor}</span>
                        </div>
                      </td>
                      <td className='py-3 px-4 whitespace-nowrap'>
                        <span className='px-2 py-0.5 rounded-md bg-orange-50 text-orange-800 border border-orange-200 font-semibold text-[11px]'>
                          {action}
                        </span>
                      </td>
                      <td className='py-3 px-4 font-medium text-stone-700 whitespace-nowrap'>
                        {target}
                      </td>
                      <td className='py-3 px-4 text-stone-600 max-w-xs truncate' title={details}>
                        {details}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
