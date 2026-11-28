import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { resolveCatalogImageUrl } from '@/services/catalog.service';
import { cn } from '@/lib/utils';

interface SeriesCoverProps {
  title: string;
  coverUrl?: string | null;
  className?: string;
  /** Ảnh ở màn đầu (LCP) thì tải ngay với ưu tiên cao. */
  priority?: boolean;
  children?: React.ReactNode;
}

/** Bìa truyện tỉ lệ 3:4; chưa có bìa hoặc ảnh lỗi thì hiện khối giấy kèm tên truyện. */
export const SeriesCover: React.FC<SeriesCoverProps> = ({
  title,
  coverUrl,
  className,
  priority = false,
  children,
}) => {
  const [failed, setFailed] = useState(false);
  const src = coverUrl && !failed ? resolveCatalogImageUrl(coverUrl) : null;

  return (
    <div
      className={cn(
        'relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-stone-200/80 bg-stone-100',
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={title}
          width={300}
          height={400}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          onError={() => setFailed(true)}
          className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]'
        />
      ) : (
        <div className='flex h-full w-full flex-col items-center justify-center gap-2 bg-[#F3F0E9] p-3 text-center'>
          <BookOpen className='w-4 h-4 text-stone-400' aria-hidden='true' />
          <span className='font-serif text-sm font-bold leading-snug text-stone-600 line-clamp-3'>
            {title}
          </span>
        </div>
      )}
      {children}
    </div>
  );
};
