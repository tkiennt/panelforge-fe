import React, { useState } from 'react';
import { UserPlus, Trash2, Edit2 } from 'lucide-react';

export const ProjectMembersView: React.FC = () => {
  const [members, setMembers] = useState([
    {
      id: 1,
      name: 'Tatsuki F.',
      role: 'Producer',
      email: 'tatsuki@studio.com',
      project: 'Cyberpunk',
    },
    { id: 2, name: 'Hideo K.', role: 'Writer', email: 'hideo@studio.com', project: 'Fantasy Arc' },
  ]);

  return (
    <div className='p-6 h-full bg-[#F8F6F0]'>
      <div className='flex justify-between items-center mb-6'>
        <div>
          <h1 className='text-2xl font-bold'>Thành Viên Dự Án</h1>
          <p className='text-sm text-gray-500'>Thêm, xóa và phân quyền thành viên trong studio</p>
        </div>
        <button className='flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl font-semibold hover:bg-gray-800'>
          <UserPlus className='w-4 h-4' /> Thêm thành viên
        </button>
      </div>

      <div className='bg-white rounded-2xl border overflow-hidden'>
        <table className='w-full text-left text-sm'>
          <thead className='bg-gray-50 border-b text-gray-600'>
            <tr>
              <th className='p-4 font-semibold'>Thành viên</th>
              <th className='p-4 font-semibold'>Email</th>
              <th className='p-4 font-semibold'>Dự án đang tham gia</th>
              <th className='p-4 font-semibold'>Vai trò (Role)</th>
              <th className='p-4 font-semibold text-right'>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className='border-b last:border-0 hover:bg-gray-50'>
                <td className='p-4 font-bold text-gray-900'>{m.name}</td>
                <td className='p-4 text-gray-500'>{m.email}</td>
                <td className='p-4'>
                  <span className='bg-gray-100 px-2 py-1 rounded'>{m.project}</span>
                </td>
                <td className='p-4'>
                  <select className='border rounded p-1 text-sm bg-white' defaultValue={m.role}>
                    <option>Producer</option>
                    <option>Writer</option>
                    <option>Artist</option>
                    <option>Editor</option>
                  </select>
                </td>
                <td className='p-4 text-right space-x-2'>
                  <button className='p-2 text-red-500 hover:bg-red-50 rounded-lg'>
                    <Trash2 className='w-4 h-4' />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
