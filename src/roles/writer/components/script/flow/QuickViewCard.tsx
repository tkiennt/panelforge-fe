// src/roles/writer/components/script/flow/QuickViewCard.tsx
import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Palette,
  Plus,
  Lock,
  AlertCircle,
  ImageOff,
  Sparkles,
  Layers,
  LayoutGrid,
} from 'lucide-react';
import axiosClient from '@/api/axiosClient';

// Bộ nhớ đệm ảnh trong phiên làm việc (Session In-Memory Image Cache)
const sessionImageCache = new Map<string, string>();

export type QuickViewItemType = 'bible' | 'panel' | 'stub';

export interface QuickViewCardData {
  type: QuickViewItemType;
  id: string;
  code: string;
  name: string;
  category?: string;
  description?: string | null;
  imageUrl?: string | null;
  // Panel fields
  pageNumber?: number;
  panelNumber?: number;
  panelId?: string;
  // Bible fields
  isLocked?: boolean;
  stageName?: string | null;
  // Actions
  onOpenInBible?: (codeOrId: string) => void;
  onOpenInArtistDesk?: (pageNumber?: number, panelId?: string) => void;
  onCreateInBible?: (tempCode: string, name?: string) => void;
}

interface QuickViewCardProps {
  data: QuickViewCardData;
  position?: { top: number; left: number };
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  className?: string;
  isInlinePreview?: boolean; // Khi render bên cạnh popup @
}

export const QuickViewCard: React.FC<QuickViewCardProps> = ({
  data,
  position,
  onMouseEnter,
  onMouseLeave,
  className = '',
  isInlinePreview = false,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);

  // Chỉ tải ảnh khi mở thẻ và cache trong phiên theo id / imageUrl
  useEffect(() => {
    if (!data.imageUrl) {
      setImageSrc(null);
      setLoadingImage(false);
      return;
    }

    const cacheKey = data.imageUrl;
    if (sessionImageCache.has(cacheKey)) {
      setImageSrc(sessionImageCache.get(cacheKey)!);
      setLoadingImage(false);
      return;
    }

    let isMounted = true;
    setLoadingImage(true);

    // Tải ảnh qua Blob nếu là link nội bộ cần Bearer auth
    if (data.imageUrl.startsWith('/api') || data.imageUrl.includes('/bible/assets/')) {
      axiosClient
        .get(data.imageUrl, { responseType: 'blob' })
        .then((res) => {
          if (!isMounted) return;
          const blobUrl = URL.createObjectURL(res.data);
          sessionImageCache.set(cacheKey, blobUrl);
          setImageSrc(blobUrl);
        })
        .catch(() => {
          if (!isMounted) return;
          setImageSrc(null);
        })
        .finally(() => {
          if (isMounted) setLoadingImage(false);
        });
    } else {
      // Ảnh tĩnh thông thường
      const img = new Image();
      img.src = data.imageUrl;
      img.onload = () => {
        if (!isMounted) return;
        sessionImageCache.set(cacheKey, data.imageUrl!);
        setImageSrc(data.imageUrl!);
        setLoadingImage(false);
      };
      img.onerror = () => {
        if (!isMounted) return;
        setImageSrc(null);
        setLoadingImage(false);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [data.imageUrl]);

  const getCategoryColor = (cat?: string) => {
    const c = (cat || '').toLowerCase();
    if (c.includes('panel')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (c.includes('loc') || c.includes('địa danh')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (c.includes('prop') || c.includes('đạo cụ')) return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    if (c.includes('term') || c.includes('thuật ngữ')) return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    return 'bg-amber-100 text-amber-800 border-amber-200';
  };

  const stylePosition: React.CSSProperties = isInlinePreview
    ? {}
    : position
      ? {
          position: 'fixed',
          top: `${position.top}px`,
          left: `${position.left}px`,
          zIndex: 60,
        }
      : {};

  return (
    <div
      role="tooltip"
      id="quick-view-card"
      data-testid="quick-view-card"
      style={stylePosition}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`w-72 bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl shadow-xl p-3.5 text-zinc-900 font-sans text-xs select-none animate-in fade-in zoom-in-95 duration-150 ${className}`}
    >
      {/* 1. Header: Loại & Mã định danh */}
      <div className="flex items-center justify-between gap-1.5 pb-2 mb-2 border-b border-[#E5E0D8]">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getCategoryColor(
              data.category
            )}`}
          >
            {data.type === 'panel' ? 'Khung tranh' : data.category || 'Mục'}
          </span>
          <span className="font-mono font-bold text-xs text-zinc-800 truncate" title={data.code}>
            {data.code}
          </span>
        </div>

        {data.type === 'bible' && data.isLocked && (
          <span
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0"
            title="Đã khóa Canon"
          >
            <Lock className="w-2.5 h-2.5" /> Canon
          </span>
        )}

        {data.type === 'stub' && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-dashed border-amber-300 shrink-0">
            Mã tạm
          </span>
        )}
      </div>

      {/* 2. Body: Hình ảnh & Thông tin chi tiết */}
      <div className="space-y-2.5">
        {/* VÙNG HÌNH ẢNH: Chỉ nạp khi mở thẻ */}
        {data.type === 'bible' && (
          <div className="flex items-start gap-2.5">
            {loadingImage ? (
              <div className="w-14 h-14 rounded-lg bg-zinc-200 animate-pulse shrink-0 border border-zinc-300" />
            ) : imageSrc ? (
              <img
                src={imageSrc}
                alt={data.name}
                className="w-14 h-14 rounded-lg object-cover shrink-0 border border-zinc-300 shadow-2xs"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-orange-100 text-orange-800 text-lg font-bold flex items-center justify-center shrink-0 border border-orange-200">
                {data.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-sm text-zinc-900 truncate">{data.name}</h4>
              {data.stageName && (
                <span className="inline-block mt-0.5 text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-medium border border-purple-200">
                  {data.stageName}
                </span>
              )}
              {data.description && (
                <p className="text-[11px] text-zinc-600 line-clamp-2 mt-1 italic">
                  {data.description}
                </p>
              )}
            </div>
          </div>
        )}

        {/* VÙNG KHUNG TRANH / PANEL */}
        {data.type === 'panel' && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-zinc-800 font-bold text-xs">
              <LayoutGrid className="w-3.5 h-3.5 text-purple-700" />
              <span>
                Trang {data.pageNumber || 1} · Khung #{data.panelNumber || 1}
              </span>
            </div>

            {loadingImage ? (
              <div className="h-28 w-full rounded-lg bg-zinc-200 animate-pulse border border-zinc-300" />
            ) : imageSrc ? (
              <img
                src={imageSrc}
                alt={`Trang ${data.pageNumber || 1} Khung ${data.panelNumber || 1}`}
                className="h-28 w-full rounded-lg object-contain bg-zinc-900 border border-zinc-300"
              />
            ) : (
              /* Ô trống ghi "Chưa có phác thảo" — Tuyệt đối không hiện ảnh lỗi */
              <div
                data-testid="panel-no-sketch-placeholder"
                className="h-24 w-full rounded-lg bg-zinc-100 border border-dashed border-zinc-300 flex flex-col items-center justify-center text-zinc-400 gap-1"
              >
                <ImageOff className="w-5 h-5 text-zinc-400" />
                <span className="text-[11px] font-medium">Chưa có phác thảo</span>
              </div>
            )}
          </div>
        )}

        {/* VÙNG MÃ TẠM (Chưa có trong Bible) */}
        {data.type === 'stub' && (
          <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-900 font-bold">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate">{data.name}</span>
            </div>
            <p className="text-[11px] text-amber-800/90 leading-tight">
              Mã tạm <code className="font-mono font-bold text-amber-950">@{data.code}</code> chưa có hồ sơ chính thức trong Series Bible.
            </p>
          </div>
        )}
      </div>

      {/* 3. Footer: Nút hành động tương ứng */}
      <div className="mt-3 pt-2 border-t border-[#E5E0D8] flex items-center justify-between">
        {data.type === 'bible' && (
          <button
            type="button"
            onClick={() => data.onOpenInBible?.(data.code || data.id)}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#C2410C] hover:bg-[#9A3412] shadow-2xs transition-all cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Mở trong Bible</span>
          </button>
        )}

        {data.type === 'panel' && (
          <button
            type="button"
            onClick={() => data.onOpenInArtistDesk?.(data.pageNumber, data.panelId)}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 shadow-2xs transition-all cursor-pointer"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Mở trên Bàn vẽ</span>
          </button>
        )}

        {data.type === 'stub' && (
          <button
            type="button"
            onClick={() => data.onCreateInBible?.(data.code, data.name)}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo trong Bible</span>
          </button>
        )}
      </div>
    </div>
  );
};
