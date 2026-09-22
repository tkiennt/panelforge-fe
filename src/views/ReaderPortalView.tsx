import React from 'react';
import ReaderWorkspace from '../components/modals/roles/ReaderWorkspace';

export const ReaderPortalView: React.FC = () => {
  return (
    <div className='flex-1 flex flex-col min-h-screen bg-[#FAF8F5]'>
      <ReaderWorkspace />
    </div>
  );
};
