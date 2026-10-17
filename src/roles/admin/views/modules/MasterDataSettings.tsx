import React, { useState } from 'react';
import {
  Sliders,
  Plus,
  Trash2,
  CheckCircle2,
  Save,
  Layers,
  Layout,
  FileOutput,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';

export const MasterDataSettings: React.FC = () => {
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [stages, setStages] = useState([
    { key: 'script', name: 'Script Drafting', color: 'bg-indigo-500' },
    { key: 'thumbnail', name: 'Name / Storyboard', color: 'bg-blue-500' },
    { key: 'pencil', name: 'Draft Pencil Art', color: 'bg-amber-500' },
    { key: 'ink', name: 'Line Inking & G-Pen', color: 'bg-zinc-800' },
    { key: 'color', name: 'Halftone & Screentone', color: 'bg-purple-500' },
    { key: 'letter', name: 'Typesetting & Dialogue', color: 'bg-emerald-500' },
    { key: 'review', name: 'Editor-in-Chief Review', color: 'bg-red-500' },
  ]);

  const [elementTypes, setElementTypes] = useState([
    'Character Anchor (Genga Model)',
    'Location Environment',
    'Prop Artifact',
    'World Constraint Rule',
  ]);

  const [newStageName, setNewStageName] = useState('');
  const [newElementType, setNewElementType] = useState('');

  const handleAddStage = () => {
    if (!newStageName.trim()) return;
    setStages([
      ...stages,
      {
        key: newStageName.toLowerCase().replace(/\s+/g, '-'),
        name: newStageName.trim(),
        color: 'bg-slate-600',
      },
    ]);
    setNewStageName('');
  };

  const handleAddElementType = () => {
    if (!newElementType.trim()) return;
    setElementTypes([...elementTypes, newElementType.trim()]);
    setNewElementType('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className='space-y-6 w-full'>
      <div className='flex items-center justify-between bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs'>
        <div>
          <div className='flex items-center gap-2 mb-1'>
            <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-[10px] font-bold'>
              MASTER DATA // PRESETS
            </span>
          </div>
          <h1 className='text-2xl font-serif font-bold text-[#171717] tracking-tight'>
            Master Data & Pipeline Templates
          </h1>
          <p className='text-xs text-[#737373]'>
            Cấu hình mẫu quy trình sản xuất Manga, phân loại Series Bible và chuẩn xuất bản toàn hệ
            thống.
          </p>
        </div>

        {savedSuccess && (
          <div className='inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold animate-in fade-in'>
            <CheckCircle2 className='w-4 h-4' />
            <span>Đã lưu Master Data!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className='space-y-6'>
        <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
          {/* Pipeline Stage Templates */}
          <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-4'>
            <h3 className='text-sm font-bold text-[#171717] flex items-center gap-2'>
              <Layers className='w-4 h-4 text-[#F97316]' />
              <span>Mẫu Giai Đoạn Pipeline Sản Xuất (Pipeline Stage Templates)</span>
            </h3>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              {stages.map((stage, idx) => (
                <div
                  key={stage.key}
                  className='flex items-center justify-between p-3 rounded-xl border border-[#E7E7E7] bg-[#FAF8F5] text-xs'
                >
                  <div className='flex items-center gap-2.5'>
                    <span className={`w-3 h-3 rounded-full ${stage.color}`} />
                    <span className='font-bold text-[#171717]'>{stage.name}</span>
                    <span className='font-mono text-[10px] text-[#737373]'>({stage.key})</span>
                  </div>
                  {idx > 2 && (
                    <button
                      type='button'
                      onClick={() => setStages(stages.filter((_, i) => i !== idx))}
                      className='text-red-500 hover:text-red-700 p-1 cursor-pointer'
                    >
                      <Trash2 className='w-3.5 h-3.5' />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className='flex items-center gap-2 pt-2'>
              <Input
                placeholder='Tên giai đoạn sản xuất mới...'
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                className='text-xs h-9'
              />
              <Button
                type='button'
                onClick={handleAddStage}
                className='h-9 bg-[#171717] hover:bg-black text-white text-xs shrink-0 cursor-pointer'
              >
                <Plus className='w-3.5 h-3.5 mr-1' /> Thêm Stage
              </Button>
            </div>
          </div>

          {/* Manga Element Types */}
          <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-4'>
            <h3 className='text-sm font-bold text-[#171717] flex items-center gap-2'>
              <Layout className='w-4 h-4 text-[#F97316]' />
              <span>Phân Loại Thực Thể Series Bible (Manga Element Types)</span>
            </h3>

            <div className='flex flex-wrap gap-2'>
              {elementTypes.map((type, idx) => (
                <span
                  key={idx}
                  className='inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E7E7E7] text-xs font-semibold text-[#171717]'
                >
                  {type}
                  {idx > 1 && (
                    <button
                      type='button'
                      onClick={() => setElementTypes(elementTypes.filter((_, i) => i !== idx))}
                      className='text-red-500 hover:text-red-700 cursor-pointer'
                    >
                      &times;
                    </button>
                  )}
                </span>
              ))}
            </div>

            <div className='flex items-center gap-2 pt-2'>
              <Input
                placeholder='Loại thực thể Bible mới...'
                value={newElementType}
                onChange={(e) => setNewElementType(e.target.value)}
                className='text-xs h-9'
              />
              <Button
                type='button'
                onClick={handleAddElementType}
                className='h-9 bg-[#171717] hover:bg-black text-white text-xs shrink-0 cursor-pointer'
              >
                <Plus className='w-3.5 h-3.5 mr-1' /> Thêm Element Type
              </Button>
            </div>
          </div>
        </div>

        {/* Export Presets */}
        <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-4'>
          <h3 className='text-sm font-bold text-[#171717] flex items-center gap-2'>
            <FileOutput className='w-4 h-4 text-[#F97316]' />
            <span>Chuẩn Xuất Bản Đơn Hàng (Export & Pre-Press Presets)</span>
          </h3>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs'>
            <div className='p-4 rounded-xl border border-[#E7E7E7] bg-[#FAF8F5] space-y-1.5'>
              <div className='font-bold text-[#171717] text-sm'>B5 Tankōbon Master Print</div>
              <div className='text-[#737373] text-[11px]'>
                600 DPI Greyscale + Halftone Screentone Layering
              </div>
              <div className='text-emerald-700 font-mono font-bold text-[10px]'>
                Default Active Preset
              </div>
            </div>
            <div className='p-4 rounded-xl border border-[#E7E7E7] bg-[#FAF8F5] space-y-1.5'>
              <div className='font-bold text-[#171717] text-sm'>
                Digital Webtoon Vertical Scroll
              </div>
              <div className='text-[#737373] text-[11px]'>
                RGB Color Space 800px Width Continuous Canvas
              </div>
              <div className='text-[#F97316] font-mono font-bold text-[10px]'>
                Digital Serialization
              </div>
            </div>
          </div>
        </div>

        <div className='flex justify-end'>
          <Button
            type='submit'
            className='bg-[#F97316] hover:bg-[#EA580C] text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md cursor-pointer'
          >
            <Save className='w-4 h-4 mr-1.5' /> Lưu Master Data
          </Button>
        </div>
      </form>
    </div>
  );
};
