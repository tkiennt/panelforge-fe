import React from 'react';
import { Activity, Clock, FolderKanban, Users, TrendingUp } from 'lucide-react';

export const ProducerWorkspaceView: React.FC = () => {
  return (
    <div className='p-6 h-full flex flex-col bg-[#FAF8F4] overflow-y-auto custom-scrollbar'>
      <div className='mb-8'>
        <h1 className='text-2xl font-bold text-[#171717]'>Tổng quan Studio</h1>
        <p className='text-sm text-gray-500 mt-1'>
          Theo dõi hoạt động và tiến độ của toàn bộ dự án
        </p>
      </div>

      {/* Thống kê nhanh */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-8'>
        {[
          {
            label: 'Dự án đang chạy',
            value: '12',
            icon: FolderKanban,
            color: 'text-blue-500',
            bg: 'bg-blue-50',
          },
          {
            label: 'Chương đang sản xuất',
            value: '34',
            icon: Activity,
            color: 'text-orange-500',
            bg: 'bg-orange-50',
          },
          {
            label: 'Thành viên Studio',
            value: '28',
            icon: Users,
            color: 'text-green-500',
            bg: 'bg-green-50',
          },
          {
            label: 'Deadline tuần này',
            value: '5',
            icon: Clock,
            color: 'text-red-500',
            bg: 'bg-red-50',
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            className='bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4'
          >
            <div className={`p-3 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className='text-2xl font-bold text-[#171717]'>{stat.value}</p>
              <p className='text-xs text-gray-500 font-medium'>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Hoạt động gần đây */}
      <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
        <div className='flex items-center justify-between mb-6'>
          <h2 className='text-lg font-bold text-[#171717] flex items-center gap-2'>
            <TrendingUp className='w-5 h-5 text-[#F97316]' />
            Hoạt động gần đây
          </h2>
          <button className='text-sm text-[#F97316] hover:underline font-medium'>Xem tất cả</button>
        </div>

        <div className='space-y-4'>
          {[
            {
              action: 'Tatsuki F. đã hoàn thành bản phác thảo',
              project: 'Ghost Protocol: Sector 9 - Ch.1',
              time: '10 phút trước',
            },
            {
              action: 'Minh T. đã tải lên kịch bản mới',
              project: 'Cyberpunk 2077 - Ch.5',
              time: '1 giờ trước',
            },
            {
              action: 'Dự án mới được khởi tạo',
              project: 'Fantasy World - Pilot',
              time: '3 giờ trước',
            },
          ].map((log, idx) => (
            <div
              key={idx}
              className='flex justify-between items-center py-3 border-b border-gray-50 last:border-0'
            >
              <div>
                <p className='text-sm font-medium text-[#171717]'>{log.action}</p>
                <p className='text-xs text-gray-500'>{log.project}</p>
              </div>
              <span className='text-xs text-gray-400'>{log.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
