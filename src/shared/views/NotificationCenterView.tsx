import React, { useState } from 'react';
import { Bell, CheckCircle2, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { SystemRole } from '@/types';

interface NotificationCenterViewProps {
  onNavigateToWorkspace: (workspaceId: string, targetView: string, role: SystemRole) => void;
  onClose?: () => void;
}

export const NotificationCenterView: React.FC<NotificationCenterViewProps> = ({
  onNavigateToWorkspace,
  onClose,
}) => {
  const [notifications] = useState([
    {
      id: 'n-01',
      title: 'New Workspace Invitation',
      message: 'Tatsuki F. invited you to join "Cyberpunk Red Studio" as an Artist.',
      timeAgo: '10m ago',
      type: 'invite',
      read: false,
      workspaceId: 'w-01',
      targetRole: 'ARTIST' as SystemRole,
      targetView: 'queue',
    },
    {
      id: 'n-02',
      title: 'Task Assigned',
      message: 'You have been assigned to Inking for Page 12 of Arc 02.',
      timeAgo: '1h ago',
      type: 'task',
      read: false,
      workspaceId: 'w-01',
      targetRole: 'ARTIST' as SystemRole,
      targetView: 'queue',
    },
    {
      id: 'n-03',
      title: 'Feedback Required',
      message: 'Editor requested rework on Page 5 - Color pass.',
      timeAgo: '2h ago',
      type: 'alert',
      read: true,
      workspaceId: 'w-01',
      targetRole: 'ARTIST' as SystemRole,
      targetView: 'queue',
    },
  ]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'invite':
        return <CheckCircle2 className='w-5 h-5 text-emerald-500' />;
      case 'task':
        return <Bell className='w-5 h-5 text-blue-500' />;
      case 'alert':
        return <AlertTriangle className='w-5 h-5 text-amber-500' />;
      default:
        return <Bell className='w-5 h-5 text-gray-500' />;
    }
  };

  return (
    <div className='w-full max-w-sm bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl shadow-xl flex flex-col overflow-hidden relative'>
      <div className='px-4 py-3 border-b border-[#D8D2C5] flex justify-between items-center bg-[#F8F6F0]'>
        <h3 className='font-serif font-bold text-sm text-[#1C1917] tracking-tight'>Notifications</h3>
        {onClose && (
          <button
            onClick={onClose}
            className='text-[#57534E] hover:text-[#1C1917] transition-colors cursor-pointer p-1 rounded-md hover:bg-[#EFECE6]'
          >
            <X className='w-4 h-4' />
          </button>
        )}
      </div>
      <div className='flex-1 overflow-y-auto max-h-[400px]'>
        {notifications.length === 0 ? (
          <div className='p-8 text-center text-[#57534E] text-sm'>No new notifications.</div>
        ) : (
          <div className='divide-y divide-[#D8D2C5]'>
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 flex gap-3 hover:bg-[#F3F0E9]/60 transition-colors cursor-pointer ${!n.read ? 'bg-[#FFF2E6]/40' : ''}`}
                onClick={() => onNavigateToWorkspace(n.workspaceId, n.targetView, n.targetRole)}
              >
                <div className='shrink-0 mt-0.5'>{getIcon(n.type)}</div>
                <div className='flex-1 min-w-0'>
                  <div className='flex justify-between items-start mb-1'>
                    <h4
                      className={`text-sm font-semibold truncate ${!n.read ? 'text-[#1C1917]' : 'text-[#57534E]'}`}
                    >
                      {n.title}
                    </h4>
                    <span className='text-xs text-[#57534E]/70 whitespace-nowrap ml-2 font-mono'>
                      {n.timeAgo}
                    </span>
                  </div>
                  <p className='text-xs text-[#57534E] line-clamp-2 leading-relaxed mb-2'>
                    {n.message}
                  </p>
                  <div className='flex items-center text-[#F97316] hover:text-[#EA580C] text-xs font-semibold group'>
                    <span>View Details</span>
                    <ArrowRight className='w-3 h-3 ml-1 transform group-hover:translate-x-1 transition-transform' />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className='p-3 border-t border-[#D8D2C5] bg-[#F8F6F0] text-center cursor-pointer hover:bg-[#F3F0E9] transition-colors'>
        <span className='text-xs font-semibold text-[#57534E] hover:text-[#1C1917]'>Mark all as read</span>
      </div>
    </div>
  );
};
