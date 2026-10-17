import React from 'react';
import { cn } from '@/lib/utils';

export interface AtmosphericOrbBackgroundProps {
  className?: string;
  variant?: 'subtle' | 'default' | 'vibrant';
  children?: React.ReactNode;
}

export const AtmosphericOrbBackground: React.FC<AtmosphericOrbBackgroundProps> = ({
  className,
  variant = 'default',
  children,
}) => {
  const opacityClass =
    variant === 'subtle' ? 'opacity-40' : variant === 'vibrant' ? 'opacity-85' : 'opacity-65';

  return (
    <div className={cn('relative overflow-hidden w-full bg-[#f5f5f5]', className)}>
      {/* Background Atmospheric Gradient Orbs */}
      <div
        className={cn(
          'absolute inset-0 pointer-events-none overflow-hidden select-none transition-opacity duration-700',
          opacityClass,
        )}
        aria-hidden='true'
      >
        {/* Mint Orb - Top Left */}
        <div
          className='absolute -top-32 -left-20 w-[480px] h-[480px] rounded-full bg-[#a7e5d3] orb-glow animate-orb-float-slow'
          style={{ animationDuration: '24s' }}
        />

        {/* Peach Orb - Top Right */}
        <div
          className='absolute -top-24 -right-16 w-[520px] h-[520px] rounded-full bg-[#f4c5a8] orb-glow animate-orb-float-reverse'
          style={{ animationDuration: '28s' }}
        />

        {/* Lavender Orb - Center / Mid */}
        <div
          className='absolute top-1/3 left-1/4 w-[460px] h-[460px] rounded-full bg-[#c8b8e0] orb-glow animate-orb-float-slow'
          style={{ animationDuration: '32s', animationDelay: '-6s' }}
        />

        {/* Sky Orb - Bottom Left */}
        <div
          className='absolute -bottom-36 left-1/10 w-[540px] h-[540px] rounded-full bg-[#a8c8e8] orb-glow animate-orb-float-reverse'
          style={{ animationDuration: '26s', animationDelay: '-10s' }}
        />

        {/* Rose Orb - Bottom Right */}
        <div
          className='absolute -bottom-28 -right-20 w-[460px] h-[460px] rounded-full bg-[#e8b8c4] orb-glow animate-orb-float-slow'
          style={{ animationDuration: '30s', animationDelay: '-14s' }}
        />
      </div>

      {/* Foreground Content */}
      <div className='relative z-10 w-full'>{children}</div>
    </div>
  );
};
