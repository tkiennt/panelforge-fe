/**
 * Lucian UX/UI Prompt #011 · Radial floating button
 * Ported for PanelForge Manga Production Platform (Artist Auxiliary Tools)
 * MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#011
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Eye,
  EyeOff,
  User,
  Grid2x2,
  Wand2,
  Layers,
  BookmarkCheck,
  ShieldAlert,
  Sparkle,
} from 'lucide-react';
import '@/styles/modules/lucian/lucian-011.css';

interface BibleEntryReference {
  id: string;
  name: string;
  referenceImageUrl?: string | null;
}

interface ArtistAuxiliaryRadialMenuProps {
  canEditPages: boolean;
  isPencilStage?: boolean;
  isInkStage?: boolean;

  // Storyboard Overlay
  hasStoryboard?: boolean;
  showStoryboardOverlay?: boolean;
  onToggleStoryboardOverlay?: () => void;
  storyboardOpacity?: number;
  onStoryboardOpacityChange?: (opacity: number) => void;

  // Model Sheet Reference
  bibleEntries?: BibleEntryReference[];
  selectedBibleEntryId?: string | null;
  onSelectBibleEntry?: (id: string | null) => void;

  // AI Prompt Assist
  onOpenAiAssist?: () => void;

  // Layout Edit
  layoutEdit?: boolean;
  onToggleLayoutEdit?: () => void;
  disabledLayoutEdit?: boolean;

  // Ink Extra Tools
  pencilUnderlayVisible?: boolean;
  onTogglePencilUnderlay?: () => void;
  hasPencilArt?: boolean;
  screenToneEnabled?: boolean;
  onToggleScreenTone?: () => void;
  safeZoneVisible?: boolean;
  onToggleSafeZone?: () => void;
}

export const ArtistAuxiliaryRadialMenu: React.FC<ArtistAuxiliaryRadialMenuProps> = ({
  canEditPages,
  isPencilStage = true,
  isInkStage = false,
  hasStoryboard = false,
  showStoryboardOverlay = false,
  onToggleStoryboardOverlay,
  storyboardOpacity = 50,
  onStoryboardOpacityChange,
  bibleEntries = [],
  selectedBibleEntryId = null,
  onSelectBibleEntry,
  onOpenAiAssist,
  layoutEdit = false,
  onToggleLayoutEdit,
  disabledLayoutEdit = false,
  pencilUnderlayVisible = true,
  onTogglePencilUnderlay,
  hasPencilArt = false,
  screenToneEnabled = false,
  onToggleScreenTone,
  safeZoneVisible = false,
  onToggleSafeZone,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modelSheetOpen, setModelSheetOpen] = useState(false);
  const [storyboardSliderOpen, setStoryboardSliderOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Click outside to close menu
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setModelSheetOpen(false);
        setStoryboardSliderOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setModelSheetOpen(false);
        setStoryboardSliderOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`u011-wrapper ${isOpen ? 'is-open' : ''} shrink-0`}
      data-testid='artist-auxiliary-radial-menu'
    >
      {/* =========================================================================
          RADIAL SATELLITE ITEMS (Hình cánh quạt bung lên phía trên Canvas)
          Tọa độ Arc:
          Item 0: x = -105px, y = -40px
          Item 1: x = -58px,  y = -85px
          Item 2: x = 58px,   y = -85px
          Item 3: x = 105px,  y = -40px
         ========================================================================= */}

      {/* 1. NÚT AI SINH MÔ TẢ VẼ (CẢ CẢNH) */}
      {canEditPages && onOpenAiAssist && (
        <button
          type='button'
          data-testid='desk-open-ai-assist-btn'
          onClick={() => {
            onOpenAiAssist();
            setIsOpen(false);
          }}
          className='u011-item'
          style={
            {
              '--item-x': '-105px',
              '--item-y': '-42px',
              '--item-bg': 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
            } as React.CSSProperties
          }
          title='Tạo mô tả vẽ cho tất cả khung trong phân cảnh (Bước 1)'
          aria-label='Tạo mô tả vẽ (cả cảnh)'
        >
          <div className='u011-item-inner'>
            <Sparkles className='w-4 h-4' />
          </div>
          <span className='u011-item-label'>Tạo mô tả vẽ (cả cảnh)</span>
        </button>
      )}

      {/* 2. NÚT STORYBOARD HOẶC CHÌ NỀN (UNDERLAY) */}
      {isPencilStage ? (
        <div
          className='u011-item'
          style={
            {
              '--item-x': '-58px',
              '--item-y': '-85px',
              '--item-bg': showStoryboardOverlay
                ? 'linear-gradient(135deg, #EA580C, #C2410C)'
                : 'linear-gradient(135deg, #78716C, #57534E)',
            } as React.CSSProperties
          }
        >
          <button
            type='button'
            data-testid='radial-item-storyboard'
            onClick={() => {
              if (onToggleStoryboardOverlay) onToggleStoryboardOverlay();
              setStoryboardSliderOpen((v) => !v);
            }}
            disabled={!hasStoryboard}
            className='w-full h-full flex items-center justify-center rounded-full cursor-pointer disabled:opacity-40'
            title={
              hasStoryboard
                ? 'Ẩn / hiện lớp Storyboard để so sánh nét chì'
                : 'Chưa có ảnh Storyboard phân cảnh'
            }
            aria-label='Lớp Storyboard'
          >
            <div className='u011-item-inner'>
              {showStoryboardOverlay && hasStoryboard ? (
                <Eye className='w-4 h-4' />
              ) : (
                <EyeOff className='w-4 h-4' />
              )}
            </div>
            <span className='u011-item-label'>
              Storyboard {hasStoryboard ? `(${storyboardOpacity}%)` : '(Chưa có)'}
            </span>
          </button>
        </div>
      ) : isInkStage && onTogglePencilUnderlay ? (
        <div
          className='u011-item'
          style={
            {
              '--item-x': '-58px',
              '--item-y': '-85px',
              '--item-bg': pencilUnderlayVisible
                ? 'linear-gradient(135deg, #0284C7, #0369A1)'
                : 'linear-gradient(135deg, #78716C, #57534E)',
            } as React.CSSProperties
          }
        >
          <button
            type='button'
            data-testid='radial-item-pencil-underlay'
            onClick={onTogglePencilUnderlay}
            disabled={!hasPencilArt}
            className='w-full h-full flex items-center justify-center rounded-full cursor-pointer disabled:opacity-40'
            title={hasPencilArt ? 'Ẩn / hiện chì nền để đối chiếu' : 'Chưa có bản vẽ chì nền'}
            aria-label='Lớp chì nền'
          >
            <div className='u011-item-inner'>
              <Layers className='w-4 h-4' />
            </div>
            <span className='u011-item-label'>Chì nền</span>
          </button>
        </div>
      ) : null}

      {/* 3. NÚT MODEL SHEET QUICK-PICKER */}
      {onSelectBibleEntry && (
        <div
          className='u011-item'
          style={
            {
              '--item-x': '58px',
              '--item-y': '-85px',
              '--item-bg':
                selectedBibleEntryId || modelSheetOpen
                  ? 'linear-gradient(135deg, #9333EA, #7E22CE)'
                  : 'linear-gradient(135deg, #64748B, #475569)',
            } as React.CSSProperties
          }
        >
          <button
            type='button'
            data-testid='radial-item-model-sheet'
            onClick={() => setModelSheetOpen((v) => !v)}
            className='w-full h-full flex items-center justify-center rounded-full cursor-pointer'
            title={`Thiết kế nhân vật (${bibleEntries.length})`}
            aria-label={`Thiết kế nhân vật (${bibleEntries.length})`}
          >
            <div className='u011-item-inner'>
              <User className='w-4 h-4' />
            </div>
            <span className='u011-item-label'>Model Sheet ({bibleEntries.length})</span>
          </button>
        </div>
      )}

      {/* 4. NÚT SỬA BỐ CỤC KHUNG HOẶC SAFE-ZONE */}
      {onToggleLayoutEdit ? (
        <button
          type='button'
          data-testid='radial-item-layout-edit'
          aria-pressed={layoutEdit}
          disabled={disabledLayoutEdit}
          onClick={() => {
            onToggleLayoutEdit();
            setIsOpen(false);
          }}
          className='u011-item'
          style={
            {
              '--item-x': '105px',
              '--item-y': '-42px',
              '--item-bg': layoutEdit
                ? 'linear-gradient(135deg, #EA580C, #9A3412)'
                : 'linear-gradient(135deg, #52525B, #3F3F46)',
            } as React.CSSProperties
          }
          title={
            disabledLayoutEdit
              ? 'Trang này đã được tách việc cho người khác, không thể sửa bố cục'
              : layoutEdit
                ? 'Tắt chế độ sửa bố cục'
                : 'Bật chế độ sửa bố cục khung'
          }
          aria-label='Sửa bố cục khung'
        >
          <div className='u011-item-inner'>
            <Grid2x2 className='w-4 h-4' />
          </div>
          <span className='u011-item-label'>Sửa bố cục</span>
        </button>
      ) : isInkStage && onToggleSafeZone ? (
        <button
          type='button'
          data-testid='radial-item-safe-zone'
          onClick={() => {
            onToggleSafeZone();
            setIsOpen(false);
          }}
          className='u011-item'
          style={
            {
              '--item-x': '105px',
              '--item-y': '-42px',
              '--item-bg': safeZoneVisible
                ? 'linear-gradient(135deg, #0D9488, #0F766E)'
                : 'linear-gradient(135deg, #52525B, #3F3F46)',
            } as React.CSSProperties
          }
          title='Bật / tắt hiển thị Vùng An Toàn (Safe Zone)'
          aria-label='Vùng an toàn Safe Zone'
        >
          <div className='u011-item-inner'>
            <ShieldAlert className='w-4 h-4' />
          </div>
          <span className='u011-item-label'>Safe Zone</span>
        </button>
      ) : null}

      {/* =========================================================================
          NÚT FAB CHÍNH (LUCIAN #011 RADIAL BUTTON)
         ========================================================================= */}
      <button
        type='button'
        data-testid='btn-radial-auxiliary-fab'
        onClick={() => {
          setIsOpen((v) => !v);
          if (isOpen) {
            setModelSheetOpen(false);
            setStoryboardSliderOpen(false);
          }
        }}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Đóng công cụ phụ' : 'Mở công cụ phụ'}
        title='Công cụ hỗ trợ phụ (AI Mô tả, Storyboard, Model Sheet, Sửa bố cục)'
        className='u011-fab'
      >
        <Wand2 className='u011-icon' />
      </button>

      {/* =========================================================================
          POPOVER: THANH TRƯỢT STORYBOARD OPACITY KHI BẤM NÚT STORYBOARD
         ========================================================================= */}
      {storyboardSliderOpen && hasStoryboard && onStoryboardOpacityChange && (
        <div
          className='absolute bottom-full mb-14 -left-16 bg-white border border-[#D8D2C5] rounded-xl shadow-xl p-2.5 z-50 flex items-center gap-2 min-w-[200px]'
          onClick={(e) => e.stopPropagation()}
        >
          <Eye className='w-3.5 h-3.5 text-orange-600 shrink-0' />
          <span className='text-[11px] font-bold text-stone-700 whitespace-nowrap'>
            Độ mờ Storyboard:
          </span>
          <input
            type='range'
            data-testid='input-storyboard-opacity'
            min={0}
            max={100}
            value={storyboardOpacity}
            onChange={(e) => onStoryboardOpacityChange(Number(e.target.value))}
            className='w-20 accent-orange-600 h-1 bg-stone-300 rounded cursor-pointer'
          />
          <span className='text-[10px] font-mono font-bold text-stone-600 min-w-[2rem] text-right'>
            {storyboardOpacity}%
          </span>
        </div>
      )}

      {/* =========================================================================
          POPOVER: MODEL SHEET DROPDOWN (KHI BẤM NÚT MODEL SHEET)
         ========================================================================= */}
      {modelSheetOpen && onSelectBibleEntry && (
        <div
          data-testid='model-sheet-dropdown'
          className='absolute bottom-full mb-14 -left-12 w-64 bg-white border border-stone-200 rounded-xl shadow-xl p-2.5 z-50 space-y-1.5'
          onClick={(e) => e.stopPropagation()}
        >
          <div className='text-[10px] font-bold text-stone-400 uppercase px-1 pb-1 border-b border-stone-100 flex items-center justify-between'>
            <span>Thiết kế nhân vật (Bible)</span>
            {selectedBibleEntryId && (
              <button
                type='button'
                onClick={() => onSelectBibleEntry(null)}
                className='text-orange-600 hover:underline text-[10px] cursor-pointer'
              >
                Bỏ ghim
              </button>
            )}
          </div>
          <div className='max-h-48 overflow-y-auto space-y-1 py-1'>
            {bibleEntries.length === 0 ? (
              <p className='text-xs text-stone-400 p-2 italic'>Chưa có Model Sheet nào.</p>
            ) : (
              bibleEntries.map((b) => (
                <button
                  key={b.id}
                  type='button'
                  onClick={() => {
                    onSelectBibleEntry(b.id === selectedBibleEntryId ? null : b.id);
                    setModelSheetOpen(false);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 p-1.5 rounded-lg text-xs text-left cursor-pointer transition-colors ${
                    selectedBibleEntryId === b.id
                      ? 'bg-purple-100 text-purple-900 font-bold'
                      : 'hover:bg-stone-50 text-stone-800'
                  }`}
                >
                  {b.referenceImageUrl ? (
                    <img
                      src={b.referenceImageUrl}
                      alt={b.name}
                      className='w-6 h-6 rounded object-cover border border-stone-200'
                    />
                  ) : (
                    <div className='w-6 h-6 rounded bg-stone-100 flex items-center justify-center text-stone-400'>
                      <User className='w-3 h-3' />
                    </div>
                  )}
                  <span className='truncate flex-1'>{b.name}</span>
                  {selectedBibleEntryId === b.id && (
                    <BookmarkCheck className='w-3 h-3 text-purple-700 shrink-0' />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
