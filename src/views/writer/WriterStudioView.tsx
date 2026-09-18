import React from 'react';
import WriterWorkspace from '../../components/modals/roles/WriterWorkspace';
import { ScriptEditorView } from '../ScriptEditorView';

interface WriterStudioViewProps {
  onShowToast?: (title: string, desc: string) => void;
}

export const WriterStudioView: React.FC<WriterStudioViewProps> = ({ onShowToast }) => {
  return (
    <div className='flex-1 flex flex-col min-h-screen bg-[#FAF8F5]'>
      <WriterWorkspace />
    </div>
  );
};
