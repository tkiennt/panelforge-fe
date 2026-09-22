import React, { useState, useMemo } from 'react';
import {
  List,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  User,
  Database,
  Lock,
} from 'lucide-react';

interface ProvenanceLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: 'Edit' | 'Upload' | 'AI Suggestion' | 'System';
  entity: string;
  source: 'Human' | 'AI Provider' | 'System';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

const MOCK_PROVENANCE_LOGS: ProvenanceLogEntry[] = [
  {
    id: 'log-001',
    timestamp: '2026-09-18T05:40:12Z',
    actor: 'artist@panelforge.com',
    action: 'Upload',
    entity: 'Page 12 - Ink Layer',
    source: 'Human',
    severity: 'INFO',
  },
  {
    id: 'log-002',
    timestamp: '2026-09-18T05:32:00Z',
    actor: 'Gemini 1.5 Pro',
    action: 'AI Suggestion',
    entity: 'Page 12 - Background Shading',
    source: 'AI Provider',
    severity: 'INFO',
  },
  {
    id: 'log-003',
    timestamp: '2026-09-18T05:15:22Z',
    actor: 'editor@panelforge.com',
    action: 'Edit',
    entity: 'Page 12 - Script',
    source: 'Human',
    severity: 'WARNING',
  },
  {
    id: 'log-004',
    timestamp: '2026-09-18T04:10:00Z',
    actor: 'System',
    action: 'System',
    entity: 'Daily Backup',
    source: 'System',
    severity: 'INFO',
  },
];

export const AdminAuditLogView = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActor, setFilterActor] = useState('ALL');
  const [filterDate, setFilterDate] = useState('ALL');

  const filteredLogs = useMemo(() => {
    let result = MOCK_PROVENANCE_LOGS;

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (l) =>
          l.actor.toLowerCase().includes(lower) ||
          l.action.toLowerCase().includes(lower) ||
          l.entity.toLowerCase().includes(lower)
      );
    }

    if (filterActor !== 'ALL') {
      result = result.filter((l) => {
        if (filterActor === 'HUMAN') return l.source === 'Human';
        if (filterActor === 'AI') return l.source === 'AI Provider';
        return true;
      });
    }

    if (filterDate !== 'ALL') {
      // Giả lập logic ngày
      const today = new Date().toISOString().split('T')[0];
      if (filterDate === 'TODAY') {
        result = result.filter((l) => l.timestamp.startsWith(today));
      }
    }

    return result;
  }, [searchTerm, filterActor, filterDate]);

  return (
    <div className='p-8 h-full flex flex-col'>
      <div className='mb-8'>
        <h1 className='text-3xl font-display font-bold text-[#171717] mb-2 flex items-center gap-3'>
          <List className='w-8 h-8 text-[#F97316]' />
          Data Provenance & Audit Log
        </h1>
        <p className='text-[#555555]'>Append-only event log for tracking history and AI accountability.</p>
      </div>

      <div className='bg-white border border-[#E7E7E7] rounded-xl shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden'>
        <div className='p-4 border-b border-[#E7E7E7] flex items-center justify-between bg-[#F8F6F0]'>
          <div className='relative w-64'>
            <Search className='w-4 h-4 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2' />
            <input
              type='text'
              placeholder='Search logs...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='w-full pl-9 pr-3 py-1.5 text-sm border border-[#D4D4D4] rounded-md focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]'
            />
          </div>

          <div className='flex items-center gap-3'>
            <div className='flex items-center gap-2'>
              <Filter className='w-4 h-4 text-[#888888]' />
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className='text-sm border border-[#D4D4D4] rounded-md px-2 py-1.5 bg-white focus:outline-none focus:border-[#F97316]'
              >
                <option value='ALL'>All Time</option>
                <option value='TODAY'>Today</option>
                <option value='7DAYS'>Last 7 Days</option>
              </select>
            </div>
            
            <select
              value={filterActor}
              onChange={(e) => setFilterActor(e.target.value)}
              className='text-sm border border-[#D4D4D4] rounded-md px-2 py-1.5 bg-white focus:outline-none focus:border-[#F97316]'
            >
              <option value='ALL'>All Sources</option>
              <option value='HUMAN'>Human Only</option>
              <option value='AI'>AI Providers Only</option>
            </select>
            
            <button className='px-4 py-1.5 bg-[#171717] text-white text-sm font-semibold rounded-md hover:bg-black transition-colors'>
              Export CSV
            </button>
          </div>
        </div>

        <div className='flex-1 overflow-auto custom-scrollbar'>
          <table className='w-full text-left border-collapse'>
            <thead className='sticky top-0 bg-[#F8F6F0] shadow-sm z-10'>
              <tr>
                <th className='py-3 px-4 text-xs font-bold text-[#737373] uppercase tracking-wider border-b border-[#E7E7E7] whitespace-nowrap'>
                  Timestamp
                </th>
                <th className='py-3 px-4 text-xs font-bold text-[#737373] uppercase tracking-wider border-b border-[#E7E7E7]'>
                  Actor
                </th>
                <th className='py-3 px-4 text-xs font-bold text-[#737373] uppercase tracking-wider border-b border-[#E7E7E7]'>
                  Action
                </th>
                <th className='py-3 px-4 text-xs font-bold text-[#737373] uppercase tracking-wider border-b border-[#E7E7E7]'>
                  Entity
                </th>
                <th className='py-3 px-4 text-xs font-bold text-[#737373] uppercase tracking-wider border-b border-[#E7E7E7]'>
                  Source
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-[#E7E7E7]'>
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className='hover:bg-[#F9F9F9] transition-colors'>
                    <td className='py-3 px-4 text-sm text-[#555555] font-mono whitespace-nowrap flex items-center gap-2'>
                      <Clock className='w-3.5 h-3.5 text-[#A3A3A3]' />
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className='py-3 px-4 text-sm font-semibold text-[#171717] flex items-center gap-2'>
                      <User className='w-3.5 h-3.5 text-[#888888]' />
                      {log.actor}
                    </td>
                    <td className='py-3 px-4 text-sm'>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        log.action === 'Upload' ? 'bg-[#ECFCCB] text-[#65A30D]' :
                        log.action === 'Edit' ? 'bg-[#E0E7FF] text-[#4F46E5]' :
                        log.action === 'AI Suggestion' ? 'bg-[#F5F3FF] text-[#8B5CF6]' :
                        'bg-[#F3F3F3] text-[#737373]'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className='py-3 px-4 text-sm text-[#555555] flex items-center gap-2'>
                      <Database className='w-3.5 h-3.5 text-[#888888]' />
                      {log.entity}
                    </td>
                    <td className='py-3 px-4 text-sm'>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${
                        log.source === 'Human' ? 'bg-white border-[#D4D4D4] text-[#555555]' :
                        log.source === 'AI Provider' ? 'bg-[#F5F3FF] border-[#DDD6FE] text-[#8B5CF6]' :
                        'bg-white border-[#D4D4D4] text-[#A3A3A3]'
                      }`}>
                        {log.source === 'Human' && <User className="w-3 h-3" />}
                        {log.source}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className='py-8 text-center text-[#888888]'>
                    No audit logs found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
