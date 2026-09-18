import React, { useState, useRef } from 'react';
import {
  UploadCloud, ShieldCheck, Cpu, User as UserIcon, ImageIcon, GripHorizontal, 
  ChevronRight, MousePointer2, Pencil, Eraser, PaintBucket
} from 'lucide-react';

const MOCK_PROVENANCE = [
  { id: 'a1', name: 'panel3_lineart.psd', type: 'Human', hash: 'CAS-8F92...3A1', time: '10:45 AM' },
  { id: 'a2', name: 'bg_ref_gen.png', type: 'AI', hash: 'CAS-1B44...9C2', time: '09:12 AM' },
];

export default function ArtistWorkspace() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedAssets, setUploadedAssets] = useState(MOCK_PROVENANCE);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTool, setActiveTool] = useState<'select' | 'brush' | 'eraser' | 'fill'>('brush');
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#171717');
  const [showBrushSettings, setShowBrushSettings] = useState(false);

  const mockUpload = (fileName: string) => {
    const newAsset = {
      id: `a${Date.now()}`, name: fileName, type: 'Human',
      hash: `CAS-${Math.random().toString(36).substring(2, 8).toUpperCase()}...`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setUploadedAssets([newAsset, ...uploadedAssets]);
  };

  return (
    <div className='flex h-full w-full bg-[#FAF8F4] text-[#171717] font-sans overflow-hidden'>
      
      {/* KHÔNG CÒN LEFT SIDEBAR Ở ĐÂY NỮA */}

      {/* 1. CENTER CANVAS AREA */}
      <main className='flex-1 flex flex-col bg-[#E5E5E5] relative min-w-0'>
        <div className='h-12 bg-white border-b border-[#E7E7E7] flex items-center justify-between px-4 shadow-sm z-10 shrink-0'>
          <div className='flex items-center gap-2 text-[11px] font-semibold truncate'>
            <span className='text-[#888888]'>Ch.5</span><ChevronRight className='w-3 h-3 text-[#CCCCCC]' />
            <span className='text-[#888888]'>Page 2</span><ChevronRight className='w-3 h-3 text-[#CCCCCC]' />
            <span className='text-[#171717] bg-[#F3F1EB] px-2 py-1 rounded truncate'>Interactive Canvas</span>
          </div>
          <div className='flex items-center gap-1.5 shrink-0'>
            <button className='px-2 py-1 text-[10px] font-semibold bg-white border border-[#E7E7E7] rounded hover:bg-[#F8F6F0]'>Grid Snap</button>
          </div>
        </div>

        {/* Floating Toolbar */}
        <div className='absolute left-2 top-16 z-20 bg-white border border-[#E7E7E7] rounded-xl shadow-lg flex flex-col p-1 gap-1 items-center'>
          <button onClick={() => setActiveTool('select')} className={`w-8 h-8 rounded-lg flex justify-center items-center ${activeTool === 'select' ? 'bg-[#FFF7ED] text-[#F97316]' : 'text-[#555555] hover:bg-[#F3F1EB]'}`}><MousePointer2 className='w-4 h-4' /></button>
          <div className='relative group'>
            <button onClick={() => { setActiveTool('brush'); setShowBrushSettings(!showBrushSettings); }} className={`w-8 h-8 rounded-lg flex justify-center items-center ${activeTool === 'brush' ? 'bg-[#FFF7ED] text-[#F97316]' : 'text-[#555555] hover:bg-[#F3F1EB]'}`}><Pencil className='w-4 h-4' /></button>
            {activeTool === 'brush' && showBrushSettings && (
              <div className='absolute left-full ml-2 top-0 bg-white border border-[#E7E7E7] rounded-lg shadow-xl p-2 w-40 z-30 flex flex-col gap-2'>
                <div className='flex justify-between'><span className='text-[10px] font-bold text-[#888888]'>SIZE</span><span className='text-[10px] font-mono font-bold'>{brushSize}px</span></div>
                <input type="range" min="1" max="100" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full h-1 bg-[#E5E5E5] rounded-lg appearance-none accent-[#F97316]" />
              </div>
            )}
          </div>
          <button onClick={() => setActiveTool('eraser')} className={`w-8 h-8 rounded-lg flex justify-center items-center ${activeTool === 'eraser' ? 'bg-[#FFF7ED] text-[#F97316]' : 'text-[#555555] hover:bg-[#F3F1EB]'}`}><Eraser className='w-4 h-4' /></button>
          <button onClick={() => setActiveTool('fill')} className={`w-8 h-8 rounded-lg flex justify-center items-center ${activeTool === 'fill' ? 'bg-[#FFF7ED] text-[#F97316]' : 'text-[#555555] hover:bg-[#F3F1EB]'}`}><PaintBucket className='w-4 h-4' /></button>
          <div className='w-5 h-px bg-[#E7E7E7] my-0.5' />
          <label className='w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#F3F1EB] cursor-pointer'>
            <div className='w-4 h-4 rounded-full border border-gray-300 overflow-hidden flex items-center justify-center'><input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="w-6 h-6 -m-2 cursor-pointer" /></div>
          </label>
        </div>

        {/* MOCK CANVAS - RESPONSIVE */}
        <div className='flex-1 overflow-auto flex items-center justify-center p-4 min-w-0 custom-scrollbar'>
          <div className='w-full max-w-[600px] min-w-[300px] aspect-[1/1.414] bg-white shadow-2xl relative border border-[#E7E7E7] shrink-0'>
            <div className='absolute top-[3%] left-[4%] right-[4%] h-[28%] border-2 border-[#171717] hover:border-[#F97316] group cursor-move'>
               <div className='absolute -top-3 left-2 bg-white px-1 text-[9px] font-bold text-[#888888] flex gap-1 group-hover:text-[#F97316]'><GripHorizontal className='w-2.5 h-2.5' /> P1 (Ink)</div>
               <div className='w-full h-full bg-gray-50 flex items-center justify-center text-[#CCCCCC]'><ImageIcon className='w-8 h-8 opacity-50' /></div>
            </div>
            <div className='absolute top-[34%] left-[4%] w-[44%] h-[30%] border-2 border-[#171717] hover:border-[#F97316] group cursor-move'>
               <div className='absolute -top-3 left-2 bg-white px-1 text-[9px] font-bold text-[#888888] flex gap-1 group-hover:text-[#F97316]'><GripHorizontal className='w-2.5 h-2.5' /> P2</div>
            </div>
            <div className='absolute top-[34%] right-[4%] w-[45%] h-[40%] border-[3px] border-[#F97316] bg-[#FFF7ED]/30 group cursor-move shadow-[0_0_15px_rgba(249,115,22,0.15)]'>
               <div className='absolute -top-3 left-2 bg-white px-1 text-[9px] font-bold text-[#F97316] flex gap-1'><GripHorizontal className='w-2.5 h-2.5' /> P3 (Active)</div>
               <div className='absolute inset-0 flex items-center justify-center'><span className='text-[10px] font-semibold text-[#F97316] text-center'>Drop Artwork</span></div>
            </div>
          </div>
        </div>
      </main>

      {/* 2. RIGHT SIDEBAR - ASSET PROVENANCE */}
      <aside className='w-72 flex flex-col border-l border-[#E7E7E7] bg-white shrink-0'>
        <div className='p-3 border-b border-[#E7E7E7]'>
          <h2 className='text-xs font-bold font-display tracking-tight flex items-center gap-1.5'><ShieldCheck className='w-3.5 h-3.5 text-[#10B981]' /> Asset & Provenance</h2>
        </div>
        <div className='p-3 flex flex-col h-full'>
          <div 
            className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-4 text-center cursor-pointer mb-4 ${isDragging ? 'border-[#F97316] bg-[#FFF7ED]' : 'border-[#E7E7E7] hover:border-[#CCCCCC] bg-[#F8F6F0]'}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); if(e.dataTransfer.files[0]) mockUpload(e.dataTransfer.files[0].name); }}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className={`w-6 h-6 mb-1 ${isDragging ? 'text-[#F97316]' : 'text-[#888888]'}`} />
            <span className='text-[11px] font-bold text-[#171717]'>Tải File Lên</span>
            <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files && mockUpload(e.target.files[0].name)} />
          </div>
          <div className='flex-1 overflow-y-auto custom-scrollbar'>
            <div className='space-y-2'>
              {uploadedAssets.map((asset) => (
                <div key={asset.id} className='p-2 bg-white border border-[#E7E7E7] rounded-lg'>
                  <div className='flex justify-between items-start mb-1.5'>
                    <span className='text-[10px] font-bold text-[#171717] truncate pr-1'>{asset.name}</span>
                    <span className='text-[8px] text-[#888888] font-mono shrink-0'>{asset.time}</span>
                  </div>
                  <div className='flex gap-1.5 mb-1.5'>
                    {asset.type === 'Human' ? <span className='flex items-center gap-1 text-[8px] font-semibold bg-blue-50 text-blue-700 px-1 rounded'><UserIcon className='w-2.5 h-2.5'/> Human</span>
                    : <span className='flex items-center gap-1 text-[8px] font-semibold bg-purple-50 text-purple-700 px-1 rounded'><Cpu className='w-2.5 h-2.5'/> AI</span>}
                  </div>
                  <div className='flex items-center gap-1 text-[8px] text-[#888888] bg-[#F8F6F0] p-1 rounded font-mono'><ShieldCheck className='w-2.5 h-2.5 text-[#10B981]' /> <span className='truncate'>{asset.hash}</span></div>
                </div>
              ))}
            </div>
          </div>
          <button className='w-full py-2 bg-[#171717] text-white rounded-lg text-[11px] font-bold mt-2 shadow-md hover:bg-gray-800 transition-colors'>Xác nhận Task</button>
        </div>
      </aside>
    </div>
  );
}