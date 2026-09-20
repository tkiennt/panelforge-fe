import React, { useState } from 'react';
import { X } from 'lucide-react';

export const CreateProjectModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4'>
      <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200'>
        <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-4 mb-4'>
          <h3 className='text-lg font-bold text-[#171717]'>Thêm Bộ Truyện Mới</h3>
          <button onClick={onClose} className='text-[#888888] hover:text-[#171717]'>
            <X className='w-5 h-5' />
          </button>
        </div>

        <form
          className='space-y-4 text-sm'
          onSubmit={(e) => {
            e.preventDefault();
            onClose();
          }}
        >
          <div>
            <label className='block font-semibold text-[#171717] mb-1.5'>Tên truyện</label>
            <input
              type='text'
              required
              className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] outline-none'
            />
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block font-semibold text-[#171717] mb-1.5'>Thể loại</label>
              <input
                type='text'
                placeholder='VD: Action, Fantasy...'
                className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg focus:border-[#F97316] outline-none'
              />
            </div>
            <div>
              <label className='block font-semibold text-[#171717] mb-1.5'>Nhân vật chính</label>
              <input
                type='text'
                className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg focus:border-[#F97316] outline-none'
              />
            </div>
          </div>
          <div>
            <label className='block font-semibold text-[#171717] mb-1.5'>Cốt truyện tóm tắt</label>
            <textarea
              rows={3}
              className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg focus:border-[#F97316] outline-none resize-none'
            ></textarea>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block font-semibold text-[#171717] mb-1.5'>Số chương dự kiến</label>
              <input
                type='number'
                min='1'
                className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg focus:border-[#F97316] outline-none'
              />
            </div>
          </div>

          <div className='flex justify-end gap-3 mt-6 pt-4 border-t border-[#E7E7E7]'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 rounded-xl text-[#555555] hover:bg-[#F8F6F0] font-medium'
            >
              Hủy
            </button>
            <button
              type='submit'
              className='px-5 py-2 rounded-xl bg-[#171717] text-white hover:bg-black font-semibold'
            >
              Tạo Dự Án
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
