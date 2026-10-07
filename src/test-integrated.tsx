import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { SeriesBibleView } from './views/SeriesBibleView';
import { PanelCanvasEditor } from './views/PanelCanvasEditor';
import CharacterImagePipeline from './components/CharacterImagePipeline';
import { BookOpen, Image as ImageIcon, Layout, Box } from 'lucide-react';

const IntegratedTestingApp = () => {
  const [activeTab, setActiveTab] = useState<'bible' | 'pipeline' | 'canvas'>('bible');

  return (
    <WorkspaceProvider>
      <div className="flex h-screen w-full bg-[#FAF8F5] text-zinc-800 overflow-hidden font-sans">
        
        {/* Sidebar */}
        <div className="w-64 shrink-0 bg-white border-r border-zinc-200 flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-zinc-200 shrink-0">
            <Box className="w-6 h-6 text-orange-500 mr-2" />
            <span className="font-bold text-white text-lg tracking-wide">PanelForge V2</span>
          </div>
          
          <div className="p-4 space-y-2 flex-1">
            <button 
              onClick={() => setActiveTab('bible')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${
                activeTab === 'bible' 
                  ? 'bg-orange-500/10 text-orange-600 border border-orange-500/30' 
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 border border-transparent'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Series Bible
            </button>
            
            <button 
              onClick={() => setActiveTab('pipeline')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${
                activeTab === 'pipeline' 
                  ? 'bg-orange-500/10 text-orange-600 border border-orange-500/30' 
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 border border-transparent'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              Image Pipeline
            </button>

            <button 
              onClick={() => setActiveTab('canvas')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${
                activeTab === 'canvas' 
                  ? 'bg-orange-500/10 text-orange-600 border border-orange-500/30' 
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 border border-transparent'
              }`}
            >
              <Layout className="w-4 h-4" />
              Canvas Editor
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#FAF8F5]">
          {activeTab === 'bible' && <SeriesBibleView />}
          {activeTab === 'pipeline' && <CharacterImagePipeline />}
          {activeTab === 'canvas' && <PanelCanvasEditor />}
        </div>
      </div>
    </WorkspaceProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <IntegratedTestingApp />
  </React.StrictMode>
);
