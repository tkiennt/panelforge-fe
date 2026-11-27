import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const sizes = {
  sm: { className: 'size-8 text-xs', pixels: 32 },
  md: { className: 'size-10 text-sm', pixels: 40 },
  lg: { className: 'size-12 text-base', pixels: 48 },
};
export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string | null;
  name: string;
  size?: keyof typeof sizes;
}
const initialsFor = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase())
    .join('') || '?';
export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  { src, name, size = 'md', className, ...props },
  ref,
) {
  const config = sizes[size];
  return (
    <span
      ref={ref}
      className={cn(
        'inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-orange-100 font-semibold text-orange-800',
        config.className,
        className,
      )}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          width={config.pixels}
          height={config.pixels}
          loading='lazy'
          className='size-full object-cover'
        />
      ) : (
        <span aria-label={name}>{initialsFor(name)}</span>
      )}
    </span>
  );
});
