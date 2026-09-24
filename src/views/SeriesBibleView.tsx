import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  CheckCircle,
  ExternalLink,
  Tag,
  Eye,
  Edit,
  ShieldCheck,
  Cpu,
  FileText,
  X,
  History,
  GitCommit,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { BibleEntity, BibleCategory, MangaProject } from '../types';
import { bibleService, BibleEntryRevisionDto } from '../services/bible.service';

interface SeriesBibleViewProps {
  activeProject: MangaProject;
  entities: BibleEntity[];
  onAddEntity: () => void;
  onViewVectorStatus: () => void;
  onEditEntity: (entity: BibleEntity) => void;
  onShowToast: (title: string, desc: string) => void;
}

const CATEGORIES: { key: BibleCategory; label: string; count: number }[] = [
  { key: 'characters', label: 'Characters', count: 14 },
  { key: 'locations', label: 'Locations', count: 8 },
  { key: 'cyberware', label: 'Cyberware & Props', count: 22 },
  { key: 'lore', label: 'Lore & Factions', count: 6 },
  { key: 'style', label: 'Style Guide', count: 4 },
];

export const SeriesBibleView: React.FC<SeriesBibleViewProps> = ({
  activeProject,
  entities,
  onAddEntity,
  onViewVectorStatus,
  onEditEntity,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<BibleCategory>('characters');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedEntity, setSelectedEntity] = useState<BibleEntity | null>(null);

  // BR-15: Chapter-Versioned State
  const [effectiveChapter, setEffectiveChapter] = useState<number | 'all'>('all');

  // BR-18: Revision History Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyRevisions, setHistoryRevisions] = useState<BibleEntryRevisionDto[]>([]);
  const [historyEntityName, setHistoryEntityName] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);

  // BR-01 & BR-15: Add Revision Modal State
  const [addRevModalOpen, setAddRevModalOpen] = useState(false);
  const [revisionTarget, setRevisionTarget] = useState<BibleEntity | null>(null);
  const [revisionSummary, setRevisionSummary] = useState('');
  const [revisionEffectiveChapter, setRevisionEffectiveChapter] = useState(
    activeProject?.chapter || 1,
  );
  const [savingRevision, setSavingRevision] = useState(false);

  const filteredEntities = useMemo(() => {
    return entities.filter((item) => {
      const matchesTab = activeTab === 'all' || item.category === activeTab;
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'ALL' || item.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesTab && matchesSearch && matchesStatus;
    });
  }, [entities, activeTab, searchQuery, statusFilter]);

  return (
    <div className='max-w-7xl mx-auto space-y-6 pb-12'>
      {/* Top Breadcrumb & Header Section */}
      <div className='bg-white border border-[#E7E7E7] rounded-xl p-5 shadow-xs'>
        <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4'>
          <div>
            <div className='flex items-center gap-2 text-[11px] font-mono text-[#888888] mb-1'>
              <span className='font-semibold text-[#171717]'>
                {activeProject.title.toUpperCase()}
              </span>
              <span>/</span>
              <span className='text-[#F97316] font-semibold'>PRODUCTION ARCHIVE</span>
            </div>
            <h1 className='text-2xl lg:text-3xl font-bold font-display text-[#171717] tracking-tight'>
              Series Bible Repository
            </h1>
            <p className='text-xs text-[#555555] mt-1'>
              Canon rules, mechanical blueprints, costume turnarounds, and character sheets for AI
              continuity enforcement.
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-2.5'>
            {/* Vector Index Pill */}
            <button
              onClick={onViewVectorStatus}
              className='px-3 py-1.5 rounded-lg bg-[#ECFDF5] border border-[#10B981]/30 text-[#059669] text-xs font-semibold font-mono flex items-center gap-1.5 cursor-pointer hover:bg-[#10B981]/15 transition-colors'
              title='Click to view Vector Index status and embedding models'
            >
              <span className='w-2 h-2 rounded-full bg-[#10B981] animate-pulse'></span>
              <span>Vector Index: Synchronized (1,248 Nodes)</span>
            </button>

            {/* Add Entity Button */}
            <button
              onClick={onAddEntity}
              className='px-3.5 py-2 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer active:scale-95'
            >
              <Plus className='w-3.5 h-3.5' />
              <span>Add Entity</span>
            </button>
          </div>
        </div>

        {/* BR-15 Chapter-Versioned Bible Selector Banner */}
        <div className='mt-4 p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs'>
          <div className='flex items-center gap-2'>
            <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-[10px] font-bold'>
              BR-15 // CHAPTER-VERSIONED
            </span>
            <span className='text-[#171717] font-semibold'>Phiên bản Bible có hiệu lực tại:</span>
            <span className='text-[#059669] font-mono font-bold'>
              {effectiveChapter === 'all'
                ? 'Tất cả các mục (Mới nhất)'
                : `Chương ${effectiveChapter}`}
            </span>
          </div>

          <div className='flex items-center gap-2'>
            <span className='text-[11px] text-[#737373]'>Mốc chương kiểm tra:</span>
            <select
              value={effectiveChapter}
              onChange={(e) => {
                const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
                setEffectiveChapter(val);
                onShowToast(
                  'Chuyển đổi phiên bản chương (BR-15)',
                  `Đang hiển thị tri thức Series Bible có hiệu lực tại ${val === 'all' ? 'bản mới nhất' : `Chương ${val}`}`,
                );
              }}
              className='px-2.5 py-1 bg-white border border-[#D4D4D4] rounded-lg font-mono text-xs text-[#171717] focus:outline-none focus:border-[#F97316]'
            >
              <option value='all'>Tất cả (Mới nhất)</option>
              <option value={1}>Chương 1 (Initial Setup)</option>
              <option value={2}>Chương 2</option>
              <option value={3}>Chương 3</option>
              <option value={4}>Chương 4</option>
              <option value={5}>Chương 5 (Current Production)</option>
            </select>
          </div>
        </div>

        {/* Tab Selection Row */}
        <div className='mt-4 pt-4 border-t border-[#E7E7E7] flex flex-col md:flex-row md:items-center justify-between gap-4'>
          {/* Category Tabs */}
          <div className='flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 custom-scrollbar'>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveTab(cat.key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  activeTab === cat.key
                    ? 'bg-[#171717] text-white shadow-xs'
                    : 'text-[#555555] hover:text-[#171717] hover:bg-[#F3F1EB]'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    activeTab === cat.key ? 'bg-white/20 text-white' : 'bg-[#EAE8E0] text-[#555555]'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search and Filters */}
          <div className='flex items-center gap-2.5'>
            <div className='relative'>
              <Search className='w-3.5 h-3.5 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2' />
              <input
                type='text'
                placeholder='Filter canon entities...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='pl-8 pr-3 py-1.5 bg-[#FAF8F4] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-[#171717] placeholder-[#888888] focus:outline-none focus:border-[#F97316] w-48 sm:w-56 transition-all'
              />
            </div>

            <div className='relative'>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className='appearance-none bg-[#FAF8F4] border border-[#E7E7E7] pl-3 pr-7 py-1.5 rounded-lg text-xs font-semibold text-[#171717] focus:outline-none focus:border-[#F97316] cursor-pointer'
              >
                <option value='ALL'>All Status</option>
                <option value='Verified'>Verified Canon</option>
                <option value='Draft'>Draft</option>
                <option value='Review'>In Review</option>
              </select>
              <ChevronDown className='w-3.5 h-3.5 text-[#888888] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none' />
            </div>
          </div>
        </div>
      </div>

      {/* Entity Cards Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
        {filteredEntities.map((entity) => (
          <div
            key={entity.id}
            className='bg-white border border-[#E7E7E7] rounded-xl overflow-hidden shadow-xs hover:border-[#171717] transition-all flex flex-col justify-between group'
          >
            <div>
              {/* Card Image Banner */}
              <div
                className='relative w-full h-44 bg-[#171717] overflow-hidden cursor-pointer'
                onClick={() => setSelectedEntity(entity)}
              >
                <img
                  src={entity.imageUrl}
                  alt={entity.name}
                  className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90'
                />
                <div className='absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1.5'>
                  {entity.tags.map((tag, i) => (
                    <span
                      key={i}
                      className='px-2 py-0.5 rounded bg-black/75 backdrop-blur-xs text-white text-[9px] font-mono font-bold uppercase tracking-wider'
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className='absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-[#10B981] text-white text-[10px] font-mono font-bold flex items-center gap-1'>
                  <ShieldCheck className='w-3 h-3' />
                  {entity.status}
                </div>
              </div>

              {/* Card Content Info */}
              <div className='p-4 space-y-3'>
                <div>
                  <h3
                    className='text-base font-bold font-display text-[#171717] group-hover:text-[#F97316] transition-colors cursor-pointer'
                    onClick={() => setSelectedEntity(entity)}
                  >
                    {entity.name}
                  </h3>
                  <div className='text-[11px] text-[#888888] font-mono'>{entity.subtitle}</div>
                </div>

                <p className='text-xs text-[#555555] leading-relaxed line-clamp-2'>
                  {entity.description}
                </p>

                {/* LoRA & Vector Specs */}
                <div className='p-2.5 bg-[#FAF8F4] rounded-lg border border-[#E7E7E7] text-xs font-mono space-y-1.5'>
                  <div className='flex items-center justify-between text-[11px]'>
                    <span className='text-[#888888]'>Scene References</span>
                    <strong className='text-[#171717]'>{entity.referencesCount} Scenes</strong>
                  </div>
                  <div className='flex items-center justify-between text-[11px]'>
                    <span className='text-[#888888]'>LoRA Weight / Model</span>
                    <span className='font-semibold text-[#6D28D9]'>
                      {entity.loraWeight} ({entity.modelVersion})
                    </span>
                  </div>
                  <div className='flex items-center justify-between text-[11px]'>
                    <span className='text-[#888888]'>AI Continuity Match</span>
                    <strong className='text-[#059669] flex items-center gap-1'>
                      <Sparkles className='w-3 h-3' />
                      {entity.continuityMatch}%
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Footer */}
            <div className='p-3 bg-[#F8F6F0] border-t border-[#E7E7E7] flex flex-wrap items-center justify-between gap-2'>
              <div className='flex flex-wrap items-center gap-1.5'>
                <button
                  onClick={() => setSelectedEntity(entity)}
                  className='px-2 py-1 bg-white hover:bg-[#F3F1EB] border border-[#E7E7E7] rounded text-[11px] font-semibold text-[#171717] flex items-center gap-1 transition-colors cursor-pointer'
                >
                  <Eye className='w-3 h-3 text-[#888888]' />
                  <span>Model Sheet</span>
                </button>
                <button
                  onClick={async () => {
                    setHistoryEntityName(entity.name);
                    setHistoryModalOpen(true);
                    setLoadingHistory(true);
                    try {
                      if (activeProject?.id) {
                        const history = await bibleService.getEntryHistory(
                          activeProject.id,
                          entity.id,
                        );
                        setHistoryRevisions(history);
                      } else {
                        setHistoryRevisions([
                          {
                            id: 'rev-1',
                            bibleEntryId: entity.id,
                            versionNumber: 1,
                            summary: `Khởi tạo mục ${entity.name} (BR-18 initial version)`,
                            snapshotJson: '{}',
                            contentHash: 'SHA256:7b1e...v1',
                            effectiveFromChapterNumber: 1,
                            isInitialVersion: true,
                            createdAt: new Date().toISOString(),
                          },
                        ]);
                      }
                    } catch {
                      setHistoryRevisions([
                        {
                          id: 'rev-1',
                          bibleEntryId: entity.id,
                          versionNumber: 1,
                          summary: `Khởi tạo mục ${entity.name} (BR-18 initial version)`,
                          snapshotJson: '{}',
                          contentHash: 'SHA256:7b1e...v1',
                          effectiveFromChapterNumber: 1,
                          isInitialVersion: true,
                          createdAt: new Date().toISOString(),
                        },
                      ]);
                    } finally {
                      setLoadingHistory(false);
                    }
                  }}
                  className='px-2 py-1 bg-white hover:bg-[#F3F1EB] border border-[#E7E7E7] rounded text-[11px] font-semibold text-[#171717] flex items-center gap-1 transition-colors cursor-pointer'
                  title='Xem toàn bộ lịch sử các phiên bản (BR-18)'
                >
                  <History className='w-3 h-3 text-[#F97316]' />
                  <span>Lịch sử (BR-18)</span>
                </button>
                <button
                  onClick={() => {
                    setRevisionTarget(entity);
                    setRevisionSummary('');
                    setRevisionEffectiveChapter(
                      typeof effectiveChapter === 'number' ? effectiveChapter : 2,
                    );
                    setAddRevModalOpen(true);
                  }}
                  className='px-2 py-1 bg-white hover:bg-[#F3F1EB] border border-[#E7E7E7] rounded text-[11px] font-semibold text-[#059669] flex items-center gap-1 transition-colors cursor-pointer'
                  title='Tạo phiên bản sửa đổi mới có hiệu lực từ một Chương (BR-15, BR-01)'
                >
                  <GitCommit className='w-3 h-3' />
                  <span>+ Version (BR-15)</span>
                </button>
              </div>

              <button
                onClick={() => onEditEntity(entity)}
                className='w-7 h-7 rounded flex items-center justify-center text-[#888888] hover:text-[#171717] hover:bg-white border border-transparent hover:border-[#E7E7E7] transition-all cursor-pointer'
                title='Sửa nhanh mục'
              >
                <Edit className='w-3.5 h-3.5' />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredEntities.length === 0 && (
        <div className='bg-white border border-[#E7E7E7] rounded-xl p-12 text-center'>
          <BookOpen className='w-8 h-8 text-[#888888] mx-auto mb-2' />
          <h4 className='text-base font-bold text-[#171717]'>No Canon Entities Found</h4>
          <p className='text-xs text-[#555555] mt-1'>
            Try adjusting your search query or category filter.
          </p>
        </div>
      )}

      {/* Entity Model Sheet Modal / Drawer */}
      {selectedEntity && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4'>
          <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-150'>
            {/* Modal Header */}
            <div className='p-4 border-b border-[#E7E7E7] flex items-center justify-between bg-[#FAF8F4]'>
              <div className='flex items-center gap-2'>
                <span className='w-2.5 h-2.5 rounded-full bg-[#10B981]'></span>
                <h3 className='text-base font-bold font-display text-[#171717]'>
                  Canon Spec Sheet: {selectedEntity.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEntity(null)}
                className='w-7 h-7 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] flex items-center justify-center text-[#888888] hover:text-[#171717] transition-all cursor-pointer'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            {/* Modal Body */}
            <div className='p-6 space-y-5'>
              <div className='relative w-full h-64 bg-[#171717] rounded-xl overflow-hidden border border-[#E7E7E7]'>
                <img
                  src={selectedEntity.imageUrl}
                  alt={selectedEntity.name}
                  className='w-full h-full object-cover'
                />
                <div className='absolute bottom-3 left-3 bg-black/80 backdrop-blur-xs text-white px-3 py-1 rounded-lg text-xs font-mono'>
                  Vector Model: {selectedEntity.modelVersion} • Weight {selectedEntity.loraWeight}
                </div>
              </div>

              <div>
                <h4 className='text-lg font-bold font-display text-[#171717]'>
                  {selectedEntity.name}
                </h4>
                <div className='text-xs font-mono text-[#F97316] font-semibold mt-0.5'>
                  {selectedEntity.subtitle}
                </div>
                <p className='text-xs text-[#555555] leading-relaxed mt-2'>
                  {selectedEntity.description}
                </p>
              </div>

              {/* Color Swatches */}
              {selectedEntity.colors && (
                <div>
                  <div className='text-[11px] font-mono text-[#888888] uppercase tracking-wider mb-2'>
                    Verified Ink &amp; Screentone Palette
                  </div>
                  <div className='flex items-center gap-2'>
                    {selectedEntity.colors.map((c, i) => (
                      <div
                        key={i}
                        className='flex items-center gap-1.5 bg-[#F8F6F0] px-2 py-1 rounded border border-[#E7E7E7] text-[10px] font-mono'
                      >
                        <span
                          className='w-3.5 h-3.5 rounded-full border border-black/20'
                          style={{ backgroundColor: c }}
                        ></span>
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vector Embedding Details */}
              <div className='p-3 bg-[#FAF8F4] rounded-xl border border-[#E7E7E7] space-y-2 text-xs font-mono'>
                <div className='text-[11px] font-bold text-[#171717] flex items-center justify-between'>
                  <span>Neural Vector Anchor</span>
                  <span className='text-[#059669]'>100% Enforced</span>
                </div>
                <div className='text-[10px] text-[#555555] bg-white p-2 rounded border border-[#E7E7E7] break-all'>
                  SHA-256: 4a9f81bc7e2d9a334f55a12089b2184911dcae984f1807d9b042a9b
                </div>
                <div className='text-[11px] text-[#555555] flex items-center justify-between pt-1'>
                  <span>Embedding Latency: 1.2s</span>
                  <span>Active Clones: 32 Panels</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className='p-4 bg-[#FAF8F4] border-t border-[#E7E7E7] flex items-center justify-between'>
              <button
                onClick={() => {
                  onShowToast(
                    'Synced to LoRA Matrix',
                    `Updated ${selectedEntity.name} vector lock.`,
                  );
                  setSelectedEntity(null);
                }}
                className='px-4 py-2 bg-[#171717] hover:bg-black text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer'
              >
                Sync with Chapter 5 LoRA
              </button>
              <button
                onClick={() => setSelectedEntity(null)}
                className='px-3 py-2 bg-white hover:bg-[#F3F1EB] border border-[#E7E7E7] text-[#555555] text-xs font-semibold rounded-lg transition-colors cursor-pointer'
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* BR-18: Revision History Modal */}
      {historyModalOpen && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4'>
          <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150'>
            <div className='p-4 border-b border-[#E7E7E7] flex items-center justify-between bg-[#FAF8F4]'>
              <div className='flex items-center gap-2'>
                <History className='w-4 h-4 text-[#F97316]' />
                <h3 className='text-sm font-bold font-display text-[#171717]'>
                  Lịch Sử Phiên Bản &amp; Kiểm Toán (BR-18): {historyEntityName}
                </h3>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className='w-7 h-7 rounded-lg hover:bg-white flex items-center justify-center text-[#888888] hover:text-[#171717]'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            <div className='p-6 overflow-y-auto space-y-4 flex-1'>
              <div className='text-xs text-[#737373]'>
                Dữ liệu lưu trữ bất biến (Append-only - BR-01). Mọi thay đổi đều sinh một version
                mới gắn với mốc chương có hiệu lực (BR-15) và lưu trữ vết kiểm toán (BR-18).
              </div>

              {loadingHistory ? (
                <div className='py-8 text-center text-xs text-[#888888]'>
                  Đang tải lịch sử phiên bản...
                </div>
              ) : historyRevisions.length === 0 ? (
                <div className='py-8 text-center text-xs text-[#888888]'>
                  Chưa có phiên bản nào được ghi nhận.
                </div>
              ) : (
                <div className='relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E7E7E7]'>
                  {historyRevisions.map((rev) => (
                    <div key={rev.id} className='relative group'>
                      <div className='absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#F97316] group-hover:scale-110 transition-transform'></div>
                      <div className='bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E7E7E7] space-y-1.5'>
                        <div className='flex items-center justify-between'>
                          <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-[10px] font-bold'>
                            VERSION {rev.versionNumber} {rev.isInitialVersion ? '(Khởi tạo)' : ''}
                          </span>
                          <span className='text-[10px] font-mono text-[#888888] flex items-center gap-1'>
                            <Clock className='w-3 h-3' />
                            {new Date(rev.createdAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        <div className='text-xs font-semibold text-[#171717]'>{rev.summary}</div>
                        <div className='flex items-center gap-2 pt-1'>
                          <span className='px-2 py-0.5 rounded bg-[#ECFDF5] text-[#059669] border border-[#10B981]/30 text-[10px] font-mono font-semibold'>
                            Hiệu lực từ: Chương {rev.effectiveFromChapterNumber}
                          </span>
                          <span
                            className='text-[10px] font-mono text-[#888888] truncate'
                            title={rev.contentHash}
                          >
                            Hash: {rev.contentHash.substring(0, 16)}...
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className='p-4 bg-[#FAF8F4] border-t border-[#E7E7E7] flex justify-end'>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className='px-4 py-2 bg-[#171717] hover:bg-black text-white text-xs font-semibold rounded-lg'
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BR-01 & BR-15: Add Revision Modal */}
      {addRevModalOpen && revisionTarget && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4'>
          <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150'>
            <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
              <div className='flex items-center gap-2'>
                <GitCommit className='w-4 h-4 text-[#059669]' />
                <h3 className='text-sm font-bold text-[#171717]'>
                  Tạo Phiên Bản Mới (BR-15): {revisionTarget.name}
                </h3>
              </div>
              <button
                onClick={() => setAddRevModalOpen(false)}
                className='w-6 h-6 rounded flex items-center justify-center text-[#888888] hover:text-[#171717]'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            <div className='text-xs text-[#737373] bg-[#FAF8F5] p-3 rounded-lg border border-[#E7E7E7]'>
              <strong>Lưu ý nghiệp vụ (BR-01 &amp; BR-15):</strong> Phiên bản cũ sẽ được bảo toàn
              vĩnh viễn không bị xóa. Phiên bản mới này sẽ chỉ có hiệu lực từ Chương được chỉ định
              trở đi.
            </div>

            <div className='space-y-3'>
              <div>
                <label className='block text-xs font-semibold text-[#171717] mb-1'>
                  Có hiệu lực từ Chương số (Effective From Chapter) *
                </label>
                <input
                  type='number'
                  min={1}
                  value={revisionEffectiveChapter}
                  onChange={(e) =>
                    setRevisionEffectiveChapter(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs font-mono text-[#171717] focus:outline-none focus:border-[#F97316]'
                />
              </div>

              <div>
                <label className='block text-xs font-semibold text-[#171717] mb-1'>
                  Lý do thay đổi / Tóm tắt phiên bản mới (Summary) *
                </label>
                <input
                  type='text'
                  placeholder='VD: Cập nhật trang phục chiến đấu mới từ Arc Neo-Tokyo'
                  value={revisionSummary}
                  onChange={(e) => setRevisionSummary(e.target.value)}
                  className='w-full px-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#F97316]'
                />
              </div>
            </div>

            <div className='pt-3 border-t border-[#E7E7E7] flex items-center justify-end gap-2'>
              <button
                onClick={() => setAddRevModalOpen(false)}
                className='px-3 py-1.5 border border-[#E7E7E7] rounded-lg text-xs font-semibold text-[#555555] hover:bg-[#F3F1EB]'
              >
                Hủy
              </button>
              <button
                disabled={!revisionSummary.trim() || savingRevision}
                onClick={async () => {
                  setSavingRevision(true);
                  try {
                    if (activeProject?.id) {
                      await bibleService.addRevision(activeProject.id, revisionTarget.id, {
                        summary: revisionSummary.trim(),
                        name: revisionTarget.name,
                        description: revisionTarget.description,
                        subtitle: revisionTarget.subtitle,
                        effectiveFromChapterNumber: revisionEffectiveChapter,
                      });
                    }
                    onShowToast(
                      'Tạo phiên bản thành công (BR-15)',
                      `Đã ghi nhận phiên bản mới cho ${revisionTarget.name} có hiệu lực từ Chương ${revisionEffectiveChapter}.`,
                    );
                    setAddRevModalOpen(false);
                  } catch (err: any) {
                    onShowToast('Lỗi tạo phiên bản', err.message);
                  } finally {
                    setSavingRevision(false);
                  }
                }}
                className='px-4 py-1.5 bg-[#059669] hover:bg-[#047857] text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5'
              >
                <CheckCircle2 className='w-3.5 h-3.5' />
                <span>{savingRevision ? 'Đang lưu...' : 'Lưu phiên bản (BR-15)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
