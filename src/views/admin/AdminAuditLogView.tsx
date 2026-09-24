import React, { useState, useEffect } from 'react';
import {
  List,
  Shield,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  User,
  Key,
  Database,
  Lock,
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  category: 'RBAC' | 'AUTH' | 'SECURITY' | 'SYSTEM';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  details: string;
  ipAddress: string;
}

const MOCK_AUDIT_LOGS: AuditLogEntry[] = [];

import { adminService } from '../../services/admin.service';

export const AdminAuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await adminService.getAuditLogs();
        if (res && res.items && res.items.length > 0) {
          const mapped: AuditLogEntry[] = res.items.map((item: any) => ({
            id: item.id,
            timestamp: item.timestampUtc,
            actor: item.userEmail || item.userId || 'System',
            action: item.action,
            category: item.action.includes('ROLE')
              ? 'RBAC'
              : item.action.includes('AUTH')
                ? 'AUTH'
                : 'SYSTEM',
            severity: item.action.includes('DELETE') ? 'WARNING' : 'INFO',
            details: item.details || `${item.action} on ${item.entityName} (${item.entityId})`,
            ipAddress: item.ipAddress || '127.0.0.1',
          }));
          setLogs(mapped);
        }
      } catch (err) {
        console.warn('Cannot fetch real audit logs, using mock logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      log.actor.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.ipAddress.includes(q);

    const matchesCategory = categoryFilter === 'ALL' || log.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className='inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded'>
            <AlertTriangle className='w-3 h-3' /> CRITICAL
          </span>
        );
      case 'WARNING':
        return (
          <span className='inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded'>
            <AlertTriangle className='w-3 h-3' /> WARNING
          </span>
        );
      default:
        return (
          <span className='inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded'>
            <Info className='w-3 h-3' /> INFO
          </span>
        );
    }
  };

  return (
    <div className='flex-1 bg-[#FAF8F5] min-h-screen p-6 md:p-8 space-y-6'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs'>
        <div>
          <div className='flex items-center gap-2 mb-1'>
            <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-[10px] font-bold'>
              SYS-AUDIT // LOGS
            </span>
            <span className='text-xs text-[#888888] font-mono'>Immutable Event Stream</span>
          </div>
          <h1 className='text-2xl font-serif font-bold text-[#171717] tracking-tight'>
            Nhật Ký Kiểm Toán Hệ Thống (Global Audit Log)
          </h1>
          <p className='text-xs text-[#737373]'>
            Theo dõi tất cả sự kiện phân quyền vai trò, đăng nhập, bật 2FA và bảo mật hệ thống.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className='bg-white p-4 rounded-xl border border-[#E7E7E7] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3'>
        <div className='relative flex-1 max-w-md'>
          <Search className='w-4 h-4 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2' />
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Tìm kiếm theo actor, hành động, IP...'
            className='w-full pl-9 pr-4 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs text-[#171717] placeholder:text-[#888888] focus:outline-none focus:border-[#F97316]'
          />
        </div>

        <div className='flex items-center gap-1.5 overflow-x-auto text-xs'>
          <span className='text-[11px] font-semibold text-[#888888] uppercase mr-1 flex items-center gap-1'>
            <Filter className='w-3 h-3' /> Danh mục:
          </span>
          {['ALL', 'RBAC', 'AUTH', 'SECURITY', 'SYSTEM'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-[#171717] text-white'
                  : 'bg-[#F8F6F0] text-[#737373] hover:text-[#171717]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-xs overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full text-left text-xs'>
            <thead className='bg-[#F8F6F0] border-b border-[#E7E7E7] text-[#737373] font-semibold uppercase text-[10px] tracking-wider'>
              <tr>
                <th className='py-3.5 px-4'>Thời Gian (UTC)</th>
                <th className='py-3.5 px-4'>Người Thực Hiện (Actor)</th>
                <th className='py-3.5 px-4'>Hành Động</th>
                <th className='py-3.5 px-4'>Mức Độ</th>
                <th className='py-3.5 px-4'>Chi Tiết Sự Kiện</th>
                <th className='py-3.5 px-4'>IP Nguồn</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-[#E7E7E7]'>
              {filteredLogs.map((log) => (
                <tr key={log.id} className='hover:bg-[#FAF8F5] transition-colors'>
                  <td className='py-3 px-4 font-mono text-[11px] text-[#737373] whitespace-nowrap'>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className='py-3 px-4 font-semibold text-[#171717]'>{log.actor}</td>
                  <td className='py-3 px-4 font-mono font-medium text-[#F97316]'>{log.action}</td>
                  <td className='py-3 px-4'>{getSeverityBadge(log.severity)}</td>
                  <td className='py-3 px-4 text-[#555555]'>{log.details}</td>
                  <td className='py-3 px-4 font-mono text-[11px] text-[#888888]'>
                    {log.ipAddress}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
