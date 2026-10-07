import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Lock, Download, CheckCircle2, FileText, ImageIcon, Code } from 'lucide-react';

interface ExportViewProps {
  onShowToast: (title: string, desc: string) => void;
}

export const ExportView: React.FC<ExportViewProps> = ({ onShowToast }) => {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [isLocked, setIsLocked] = useState(false);
  const [exportFormat, setExportFormat] = useState({
    pdf: true,
    cbz: false,
    webtoon: false,
    json: true,
  });

  const handleLock = () => {
    setIsLocked(true);
    onShowToast('Chapter Locked', 'Data has been successfully frozen.');
  };

  const handleExport = () => {
    if (!isLocked) {
      onShowToast('Data Not Locked', 'Please lock the chapter before exporting.');
      return;
    }
    const formats = Object.keys(exportFormat)
      .filter((k) => exportFormat[k as keyof typeof exportFormat])
      .join(', ')
      .toUpperCase();
    onShowToast('Exporting...', `Exporting process for (${formats}) is running in the background.`);
  };

  return (
    <div className='p-8 max-w-4xl mx-auto flex flex-col h-full overflow-y-auto custom-scrollbar bg-zinc-50 min-h-screen'>
      <button
        onClick={() => navigate(-1)}
        className='self-start flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 mb-6 transition-colors'
      >
        <ArrowLeft className='w-4 h-4' /> Back to Series
      </button>

      <h1 className='text-xl font-bold text-zinc-900 tracking-tight mb-2 flex items-center gap-2'>
        <Download className='w-6 h-6 text-orange-600' />
        Export & Publish
      </h1>
      <p className='text-sm font-medium text-zinc-600 mb-8'>
        Lock the final draft for <b>{projectId || 'Unknown'}</b> and extract production assets.
      </p>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {/* LOCK SECTION */}
        <div
          className={`p-6 border rounded-xl flex flex-col gap-4 shadow-sm transition-colors ${isLocked ? 'border-emerald-200 bg-emerald-50' : 'border-zinc-200 bg-white'}`}
        >
          <div className='flex items-center gap-3'>
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${isLocked ? 'bg-emerald-500 text-white' : 'bg-zinc-100 text-zinc-500'}`}
            >
              {isLocked ? <CheckCircle2 className='w-6 h-6' /> : <Lock className='w-6 h-6' />}
            </div>
            <div>
              <h3 className='text-base font-semibold text-zinc-900'>
                {isLocked ? 'Chapter Locked' : 'Lock Chapter'}
              </h3>
              <p className='text-sm font-medium text-zinc-600'>
                {isLocked
                  ? 'Draft is frozen. No further changes can be made.'
                  : 'Freeze final state and prevent all edits.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLock}
            disabled={isLocked}
            className='mt-auto py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800 transition-colors shadow-sm'
          >
            {isLocked ? 'Chapter is Locked' : 'Execute Lock'}
          </button>
        </div>

        {/* EXPORT SECTION */}
        <div
          className={`p-6 border rounded-xl flex flex-col gap-4 shadow-sm bg-white transition-all ${!isLocked ? 'border-zinc-200 opacity-50 pointer-events-none' : 'border-orange-500 shadow-md shadow-orange-500/10'}`}
        >
          <h3 className='text-base font-semibold text-zinc-900 border-b border-zinc-200 pb-2'>
            Export Formats
          </h3>

          <div className='space-y-4 pt-2'>
            <label className='flex items-center gap-3 cursor-pointer'>
              <input
                type='checkbox'
                checked={exportFormat.pdf}
                onChange={(e) => setExportFormat((p) => ({ ...p, pdf: e.target.checked }))}
                className='w-4 h-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-600'
              />
              <FileText className='w-4 h-4 text-zinc-500' />
              <span className='text-sm font-medium text-zinc-700'>
                PDF Document (Print / Review)
              </span>
            </label>
            <label className='flex items-center gap-3 cursor-pointer'>
              <input
                type='checkbox'
                checked={exportFormat.cbz}
                onChange={(e) => setExportFormat((p) => ({ ...p, cbz: e.target.checked }))}
                className='w-4 h-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-600'
              />
              <ImageIcon className='w-4 h-4 text-zinc-500' />
              <span className='text-sm font-medium text-zinc-700'>CBZ Archive (E-Reader)</span>
            </label>
            <label className='flex items-center gap-3 cursor-pointer'>
              <input
                type='checkbox'
                checked={exportFormat.webtoon}
                onChange={(e) => setExportFormat((p) => ({ ...p, webtoon: e.target.checked }))}
                className='w-4 h-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-600'
              />
              <ImageIcon className='w-4 h-4 text-zinc-500' />
              <span className='text-sm font-medium text-zinc-700'>
                Webtoon Scroll (Vertical slice)
              </span>
            </label>
            <label className='flex items-center gap-3 cursor-pointer'>
              <input
                type='checkbox'
                checked={exportFormat.json}
                onChange={(e) => setExportFormat((p) => ({ ...p, json: e.target.checked }))}
                className='w-4 h-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-600'
              />
              <Code className='w-4 h-4 text-zinc-500' />
              <span className='text-sm font-medium text-zinc-700'>
                JSON Provenance (Audit History)
              </span>
            </label>
          </div>

          <button
            onClick={handleExport}
            className='mt-auto py-2.5 bg-orange-600 text-white text-sm font-medium rounded-xl hover:bg-orange-700 transition-colors shadow-sm'
          >
            Export Files
          </button>
        </div>
      </div>
    </div>
  );
};
