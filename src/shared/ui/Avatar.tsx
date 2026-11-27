import React, { forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name: string;
  size?: AvatarSize;
}

const sizeConfig: Record<AvatarSize, { container: string; text: string; px: number }> = {
  sm: { container: 'size-7', text: 'text-xs', px: 28 },
  md: { container: 'size-9', text: 'text-xs', px: 36 },
  lg: { container: 'size-12', text: 'text-sm font-semibold', px: 48 },
};

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(function Avatar(
  { src, name, size = 'md', className, ...props },
  ref,
) {
  const [imgError, setImgError] = useState(false);
  const cfg = sizeConfig[size];
  const showImg = Boolean(src && !imgError);

  return (
    <div
      ref={ref}
      aria-label={name}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone-200 bg-stone-100 font-medium text-stone-700 select-none',
        cfg.container,
        cfg.text,
        className,
      )}
      {...props}
    >
      {showImg ? (
        <img
          src={src!}
          alt={name}
          width={cfg.px}
          height={cfg.px}
          loading='lazy'
          onError={() => setImgError(true)}
          className='size-full object-cover rounded-full'
        />
      ) : (
        <span aria-hidden='true'>{getInitials(name)}</span>
      )}
    </div>
  );
});
