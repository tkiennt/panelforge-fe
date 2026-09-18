import React from 'react';
import EditorWorkspace from '../../components/modals/roles/EditorWorkspace';

export const EditorDeskView: React.FC = () => {
  return (
    <div className='flex-1 flex flex-col min-h-screen bg-[#FAF8F5]'>
      <EditorWorkspace />
    </div>
  );
};
