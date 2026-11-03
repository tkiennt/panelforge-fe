// src/roles/writer/components/script/thumbnail-studio/components/ThumbnailStudioBoard.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Film,
  Plus,
  BookOpen,
  LayoutGrid,
  Columns,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowRight,
  SlidersHorizontal,
  FileCode,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';
import { useComicStudioStore } from '../store/useComicStudioStore';
import { ThumbnailCard } from './ThumbnailCard';
import { PanelNode, PageNode, CameraShotType } from '../types';
import { scenesToComicScriptText } from '../lib/comicScriptParser';
import { SceneDetailDto } from '@/services/scriptLine.service';

interface ThumbnailStudioBoardProps {
  scenes?: SceneDetailDto[];
  canEdit?: boolean;
  getSpeakerName?: (id?: string | null) => string | null;
  onShowToast?: (title: string, desc: string) => void;
}

export const ThumbnailStudioBoard: React.FC<ThumbnailStudioBoardProps> = ({
  scenes = [],
  canEdit = true,
  getSpeakerName,
  onShowToast,
}) => {
  const {
    rawScript,
    ast,
    activePanelId,
    sketches,
    setRawScript,
    setActivePanel,
    insertTransitionPage,
    saveSketch,
    clearSketch,
  } = useComicStudioStore();

  const [viewLayout, setViewLayout] = useState<'board' | 'split'>('board');
  const [shotFilter, setShotFilter] = useState<'all' | CameraShotType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editorText, setEditorText] = useState(rawScript);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Đồng bộ văn bản editor nội bộ khi store cập nhật
  useEffect(() => {
    setEditorText(rawScript);
  }, [rawScript]);

  // Xử lý gõ văn bản kịch bản với debounce 250ms
  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEditorText(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setRawScript(val);
    }, 250);
  };

  // Nạp từ danh sách scenes hiện tại của kịch bản nếu người dùng muốn đồng bộ
  const handleSyncFromScenes = () => {
    if (!scenes || scenes.length === 0) {
      onShowToast?.('Không có phân cảnh', 'Chưa có phân cảnh nào để chuyển thành Comic Script.');
      return;
    }
    const text = scenesToComicScriptText(scenes, getSpeakerName);
    setRawScript(text);
    setEditorText(text);
    onShowToast?.(
      'Đã đồng bộ kịch bản',
      `Đã chuyển đổi thành công ${scenes.length} phân cảnh thành Comic Script & Storyboard.`
    );
  };

  // Tính toán thống kê
  const stats = useMemo(() => {
    let totalPanels = 0;
    let panelsWithSketch = 0;
    let totalDialogues = 0;

    ast.pages.forEach((page) => {
      totalPanels += page.panels.length;
      page.panels.forEach((panel) => {
        if (sketches[panel.id]) {
          panelsWithSketch++;
        }
        totalDialogues += panel.dialogues.length;
      });
    });

    const percent = totalPanels > 0 ? Math.round((panelsWithSketch / totalPanels) * 100) : 0;
    return {
      totalPages: ast.pages.length,
      totalPanels,
      panelsWithSketch,
      totalDialogues,
      percent,
    };
  }, [ast, sketches]);

  // Lọc các trang và ô theo filter
  const filteredPages = useMemo(() => {
    return ast.pages
      .map((page) => {
        const panels = page.panels.filter((p) => {
          // Lọc theo loại góc máy
          if (shotFilter !== 'all' && p.shotType !== shotFilter) {
            return false;
          }
          // Lọc theo từ khóa tìm kiếm (mô tả, thoại, nhân vật, số ô)
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchDesc = p.actionDescription?.toLowerCase().includes(q);
            const matchCamera = p.cameraNote?.toLowerCase().includes(q);
            const matchDialogue = p.dialogues.some(
              (d) => d.character.toLowerCase().includes(q) || d.text.toLowerCase().includes(q)
            );
            const matchSfx = p.sfx.some((s) => s.text.toLowerCase().includes(q));
            const matchNum = `ô ${p.panelNumber}`.includes(q) || `panel ${p.panelNumber}`.includes(q);
            return matchDesc || matchCamera || matchDialogue || matchSfx || matchNum;
          }
          return true;
        });

        return {
          ...page,
          panels,
        };
      })
      .filter((page) => page.panels.length > 0 || !searchQuery.trim());
  }, [ast.pages, shotFilter, searchQuery]);

  // Thêm trang mới ở cuối
  const handleAddNewPage = () => {
    const nextPageNum = ast.pages.length + 1;
    const newStub = `\n\n# Page ${nextPageNum}\n- Panel 1: Wide\nMô tả cảnh mở đầu trang ${nextPageNum}...`;
    const updated = rawScript.trim() + newStub;
    setRawScript(updated);
    setEditorText(updated);
    onShowToast?.('Thêm trang thành công', `Đã tạo Trang ${nextPageNum} mới.`);
  };

  return (
    <div
      data-testid="thumbnail-studio-board"
      className="flex flex-col flex-1 h-full bg-[#FAF8F5] text-[#1C1917] overflow-hidden"
    >
      {/* 1. Header Toolbar của Thumbnail Studio */}
      <div className="shrink-0 bg-[#FCFBF8] border-b border-[#D8D2C5] px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        {/* Tiêu đề & Thống kê độ phủ */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FFF2E6] border border-[#F97316]/30 flex items-center justify-center text-[#C2410C] shadow-2xs">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold font-serif text-[#1C1917] tracking-tight">
                THUMBNAIL & STORYBOARD STUDIO
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F3F0E9] border border-[#E5E0D8] text-[#57534E] font-semibold">
                AST v2.0
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#57534E] mt-0.5">
              <span className="font-medium text-[#1C1917]">{stats.totalPages} trang</span>
              <span>•</span>
              <span className="font-medium text-[#1C1917]">{stats.totalPanels} ô truyện</span>
              <span>•</span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="text-amber-800 font-bold">{stats.panelsWithSketch}/{stats.totalPanels}</span>
                <span className="text-[#57534E]">phác thảo</span>
                <span className="inline-block w-12 bg-[#E5E0D8] h-1.5 rounded-full overflow-hidden ml-1">
                  <span
                    className="block bg-[#C2410C] h-full rounded-full transition-all duration-300"
                    style={{ width: `${stats.percent}%` }}
                  />
                </span>
                <span className="text-[10px] text-[#C2410C] font-bold">{stats.percent}%</span>
              </span>
            </div>
          </div>
        </div>

        {/* Thanh công cụ phụ: Bộ lọc, Chế độ xem & Thao tác nhanh */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Lọc theo góc máy */}
          <div className="relative inline-flex items-center">
            <Filter className="w-3.5 h-3.5 absolute left-2.5 text-[#57534E] pointer-events-none" />
            <select
              data-testid="shot-filter-select"
              value={shotFilter}
              onChange={(e) => setShotFilter(e.target.value as any)}
              className="pl-8 pr-7 py-1 text-xs font-medium bg-[#F3F0E9] border border-[#E5E0D8] rounded-lg text-[#1C1917] hover:bg-[#EBE7DF] focus:outline-none focus:ring-1 focus:ring-[#C2410C] cursor-pointer appearance-none transition-colors"
            >
              <option value="all">Tất cả góc máy</option>
              <option value="extreme_wide">Đại toàn cảnh (X-Wide)</option>
              <option value="wide">Toàn cảnh (Wide)</option>
              <option value="medium">Trung cảnh (Medium)</option>
              <option value="close_up">Cận cảnh (Close-up)</option>
              <option value="extreme_close_up">Đặc tả (X-Close)</option>
              <option value="pov">Góc nhìn POV</option>
            </select>
          </div>

          {/* Ô tìm kiếm nhanh */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#57534E] pointer-events-none" />
            <input
              type="text"
              data-testid="search-panels-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm ô, thoại, nhân vật..."
              className="pl-8 pr-3 py-1 text-xs bg-[#F3F0E9] border border-[#E5E0D8] rounded-lg text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#C2410C] w-36 sm:w-44 transition-all"
            />
          </div>

          {/* Nút chuyển layout: Lưới thẻ / Chia đôi */}
          <div className="flex items-center bg-[#F3F0E9] p-0.5 rounded-lg border border-[#E5E0D8]">
            <button
              type="button"
              data-testid="view-layout-board"
              onClick={() => setViewLayout('board')}
              className={`p-1 rounded text-xs font-bold transition-all cursor-pointer ${
                viewLayout === 'board'
                  ? 'bg-white text-[#1C1917] shadow-2xs'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
              title="Xem dạng Lưới toàn cảnh (Board Mode)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              data-testid="view-layout-split"
              onClick={() => setViewLayout('split')}
              className={`p-1 rounded text-xs font-bold transition-all cursor-pointer ${
                viewLayout === 'split'
                  ? 'bg-white text-[#1C1917] shadow-2xs'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
              title="Chia đôi: Soạn kịch bản & Storyboard song song (Split Mode)"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Nút đồng bộ từ Phân cảnh */}
          {scenes && scenes.length > 0 && (
            <button
              type="button"
              data-testid="sync-from-scenes-btn"
              onClick={handleSyncFromScenes}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#57534E] hover:text-[#1C1917] bg-[#F3F0E9] hover:bg-[#EBE7DF] border border-[#E5E0D8] rounded-lg transition-colors cursor-pointer"
              title="Đồng bộ lại cấu trúc từ danh sách phân cảnh hiện tại"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nạp kịch bản</span>
            </button>
          )}

          {/* Nút thêm trang mới */}
          {canEdit && (
            <button
              type="button"
              data-testid="add-new-page-btn"
              onClick={handleAddNewPage}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-[#C2410C] hover:bg-[#9A3412] rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm trang</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Khu vực hiển thị chính */}
      <div className="flex-1 flex overflow-hidden">
        {/* A. Cột trái: Trình soạn thảo kịch bản trực tiếp (chỉ hiện khi ở chế độ 'split') */}
        {viewLayout === 'split' && (
          <div className="w-full md:w-1/2 lg:w-5/12 border-r border-[#D8D2C5] bg-[#FCFBF8] flex flex-col overflow-hidden">
            <div className="px-4 py-2 border-b border-[#E5E0D8] bg-[#F7F5EE] flex items-center justify-between text-xs text-[#57534E]">
              <span className="font-bold flex items-center gap-1.5 text-[#1C1917]">
                <FileCode className="w-3.5 h-3.5 text-[#C2410C]" />
                Comic Markdown Text
              </span>
              <span className="text-[11px] font-mono text-[#57534E]">Tự động phân tích (250ms)</span>
            </div>
            <textarea
              data-testid="comic-script-raw-textarea"
              value={editorText}
              onChange={handleEditorChange}
              disabled={!canEdit}
              placeholder="# Page 1&#10;- Panel 1: Wide&#10;Mô tả cảnh quay...&#10;NHÂN VẬT: Lời thoại..."
              className="flex-1 p-4 font-mono text-xs leading-relaxed text-[#1C1917] bg-[#FCFBF8] resize-none focus:outline-none custom-scrollbar"
            />
          </div>
        )}

        {/* B. Cột phải hoặc Toàn màn hình: Bảng lưới Storyboard & Thumbnail Cards */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-8">
          {filteredPages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#F3F0E9] border border-[#E5E0D8] flex items-center justify-center text-[#78716C] mb-3">
                <Film className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#1C1917]">Không tìm thấy ô truyện nào</h3>
              <p className="text-xs text-[#57534E] max-w-sm mt-1">
                {searchQuery || shotFilter !== 'all'
                  ? 'Thử thay đổi bộ lọc hoặc xóa từ khóa tìm kiếm.'
                  : 'Hãy thêm trang hoặc gõ nội dung kịch bản để bắt đầu phác thảo.'}
              </p>
              {canEdit && (
                <button
                  type="button"
                  onClick={handleAddNewPage}
                  className="mt-4 px-3.5 py-1.5 text-xs font-bold text-white bg-[#C2410C] hover:bg-[#9A3412] rounded-lg transition-colors cursor-pointer"
                >
                  + Tạo trang kịch bản đầu tiên
                </button>
              )}
            </div>
          ) : (
            filteredPages.map((page, pageIdx) => {
              const nextPage = filteredPages[pageIdx + 1];
              return (
                <div key={page.id} className="space-y-4">
                  {/* Thanh Tiêu đề Trang (Page Header) */}
                  <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-[#D8D2C5] shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#FFF2E6] border border-[#F97316]/30 flex items-center justify-center text-[#C2410C]">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold font-serif text-[#1C1917]">
                          TRANG {page.pageNumber}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-[#E5E0D8] text-[#57534E]">
                          Rank: {page.orderRank}
                        </span>
                        <span className="text-xs text-[#57534E]">
                          ({page.panels.length} ô truyện)
                        </span>
                      </div>
                    </div>

                    {/* Nút chèn trang đệm (Page 1.5, etc.) */}
                    {canEdit && (
                      <button
                        type="button"
                        data-testid={`insert-transition-page-${page.pageNumber}`}
                        onClick={() => {
                          insertTransitionPage(page.pageNumber, page.orderRank, nextPage?.orderRank);
                          onShowToast?.(
                            'Chèn trang đệm thành công',
                            `Đã thêm trang chuyển tiếp sau Trang ${page.pageNumber}.`
                          );
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#C2410C] hover:text-[#9A3412] bg-[#FFF2E6] hover:bg-[#FFE5D0] border border-[#F97316]/30 rounded-lg transition-colors cursor-pointer"
                        title="Chèn một trang chuyển cảnh xen giữa bằng thuật toán LexoRank"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Chèn trang đệm ({page.pageNumber}.5)</span>
                      </button>
                    )}
                  </div>

                  {/* Lưới các Panel Thumbnail Card */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {page.panels.map((panel) => (
                      <ThumbnailCard
                        key={panel.id}
                        panel={panel}
                        pageNumber={page.pageNumber}
                        sketchDataUrl={sketches[panel.id]}
                        isActive={activePanelId === panel.id}
                        onSelectPanel={(p) => setActivePanel(p.id, page.pageNumber, p.panelNumber)}
                        onSaveSketch={saveSketch}
                        onClearSketch={clearSketch}
                      />
                    ))}
                  </div>

                  {/* Đường phân cách giữa các trang */}
                  {pageIdx < filteredPages.length - 1 && (
                    <div className="pt-2 flex items-center justify-center">
                      <div className="h-px bg-gradient-to-r from-transparent via-[#D8D2C5] to-transparent w-full max-w-md" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
