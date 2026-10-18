import React from 'react';

export interface PaperSectionDividerProps {
  /** Background color of the section immediately above this divider */
  topColor?: string;
  /** Background color of the section immediately below this divider */
  bottomColor?: string;
  /**
   * Overlap hierarchy:
   * - 'top-over-bottom': The top paper sheet edge drapes over the bottom section
   * - 'bottom-over-top': The bottom paper sheet edge drapes over the top section
   */
  direction?: 'top-over-bottom' | 'bottom-over-top';
  /** Optional custom exposed cellulose pulp ribbon tone */
  pulpColor?: string;
  /** Extra wrapper classes (e.g. for custom heights or z-index) */
  className?: string;
}

/**
 * Reusable deckle-edge torn paper divider for major landing section transitions.
 * Features an asymmetric organic tear path, exposed pulp core band, and fine fibrous contour.
 */
export const PaperSectionDivider: React.FC<PaperSectionDividerProps> = ({
  topColor = '#F3F0E9',
  bottomColor = '#1C1917',
  direction = 'top-over-bottom',
  pulpColor,
  className = '',
}) => {
  const isTopOverBottom = direction === 'top-over-bottom';

  // The primary overlapping paper sheet color vs the background color it tears across
  const paperSheetColor = isTopOverBottom ? topColor : bottomColor;
  const containerBgColor = isTopOverBottom ? bottomColor : topColor;

  // Natural cellulose pulp tone (lighter fibrous core)
  const resolvedPulpColor =
    pulpColor ||
    (paperSheetColor === '#1C1917'
      ? '#2D2825'
      : paperSheetColor === '#EAE5DC'
        ? '#F4F0E8'
        : '#FAF7F0');

  // Asymmetric deckle edge paths (1000x32 coordinate grid)
  const bodyPath =
    'M 0 0 L 1000 0 L 1000 22.6 L 985.7 21 L 971.4 21 L 957.1 20.3 L 942.9 20.2 L 928.6 20.1 L 914.3 19.5 L 900 18.1 L 885.7 19 L 871.4 18.2 L 857.1 17.1 L 842.9 18.6 L 828.6 17.7 L 814.3 16.2 L 800 14.8 L 785.7 17.2 L 771.4 16.5 L 757.1 15.7 L 742.9 15.6 L 728.6 13.7 L 714.3 15.4 L 700 14.3 L 685.7 15.1 L 671.4 14.3 L 657.1 14.7 L 642.9 15.7 L 628.6 17.3 L 614.3 17.1 L 600 15.4 L 585.7 15.4 L 571.4 19 L 557.1 17.5 L 542.9 16.4 L 528.6 18.4 L 514.3 19.1 L 500 18.8 L 485.7 20.6 L 471.4 20.6 L 457.1 19.1 L 442.9 19.6 L 428.6 20.2 L 414.3 21.2 L 400 19 L 385.7 19.8 L 371.4 19 L 357.1 19.4 L 342.9 20 L 328.6 19.9 L 314.3 21.6 L 300 19.7 L 285.7 18.4 L 271.4 20.8 L 257.1 19.8 L 242.9 20.1 L 228.6 19.9 L 214.3 21.1 L 200 19.1 L 185.7 21.3 L 171.4 19.5 L 157.1 20.4 L 142.9 19.9 L 128.6 20 L 114.3 19.6 L 100 19.4 L 85.7 21.9 L 71.4 19.8 L 57.1 20 L 42.9 20.5 L 28.6 19.9 L 14.3 19.3 L 0 19.9 Z';

  const pulpRibbon =
    'M 0 19.9 L 14.3 19.3 L 28.6 19.9 L 42.9 20.5 L 57.1 20 L 71.4 19.8 L 85.7 21.9 L 100 19.4 L 114.3 19.6 L 128.6 20 L 142.9 19.9 L 157.1 20.4 L 171.4 19.5 L 185.7 21.3 L 200 19.1 L 214.3 21.1 L 228.6 19.9 L 242.9 20.1 L 257.1 19.8 L 271.4 20.8 L 285.7 18.4 L 300 19.7 L 314.3 21.6 L 328.6 19.9 L 342.9 20 L 357.1 19.4 L 371.4 19 L 385.7 19.8 L 400 19 L 414.3 21.2 L 428.6 20.2 L 442.9 19.6 L 457.1 19.1 L 471.4 20.6 L 485.7 20.6 L 500 18.8 L 514.3 19.1 L 528.6 18.4 L 542.9 16.4 L 557.1 17.5 L 571.4 19 L 585.7 15.4 L 600 15.4 L 614.3 17.1 L 628.6 17.3 L 642.9 15.7 L 657.1 14.7 L 671.4 14.3 L 685.7 15.1 L 700 14.3 L 714.3 15.4 L 728.6 13.7 L 742.9 15.6 L 757.1 15.7 L 771.4 16.5 L 785.7 17.2 L 800 14.8 L 814.3 16.2 L 828.6 17.7 L 842.9 18.6 L 857.1 17.1 L 871.4 18.2 L 885.7 19 L 900 18.1 L 914.3 19.5 L 928.6 20.1 L 942.9 20.2 L 957.1 20.3 L 971.4 21 L 985.7 21 L 1000 22.6 L 1000 24.4 L 985.7 23.2 L 971.4 24.2 L 957.1 22.8 L 942.9 23.3 L 928.6 22.3 L 914.3 22.3 L 900 21.3 L 885.7 20.6 L 871.4 21 L 857.1 19 L 842.9 20.7 L 828.6 19.3 L 814.3 18.3 L 800 17.6 L 785.7 19.4 L 771.4 18.9 L 757.1 18.7 L 742.9 17.3 L 728.6 16.2 L 714.3 17.6 L 700 17.2 L 685.7 18.1 L 671.4 17 L 657.1 17.5 L 642.9 17.9 L 628.6 19.1 L 614.3 19.6 L 600 18.1 L 585.7 18.5 L 571.4 20.6 L 557.1 20.2 L 542.9 19.1 L 528.6 20.4 L 514.3 20.8 L 500 21 L 485.7 22.5 L 471.4 22.7 L 457.1 21.6 L 442.9 22 L 428.6 23 L 414.3 22.9 L 400 22.1 L 385.7 22 L 371.4 21.5 L 357.1 21.3 L 342.9 22.4 L 328.6 23.1 L 314.3 23.3 L 300 21.9 L 285.7 21.1 L 271.4 23.3 L 257.1 22.6 L 242.9 21.8 L 228.6 22.8 L 214.3 23.5 L 200 21.9 L 185.7 23.1 L 171.4 22.1 L 157.1 22.3 L 142.9 22.1 L 128.6 22.4 L 114.3 22.8 L 100 22.3 L 85.7 23.5 L 71.4 22.1 L 57.1 21.5 L 42.9 22.7 L 28.6 23.1 L 14.3 21.8 L 0 23.2 Z';

  const edgeLine =
    'M 0 23.2 L 14.3 21.8 L 28.6 23.1 L 42.9 22.7 L 57.1 21.5 L 71.4 22.1 L 85.7 23.5 L 100 22.3 L 114.3 22.8 L 128.6 22.4 L 142.9 22.1 L 157.1 22.3 L 171.4 22.1 L 185.7 23.1 L 200 21.9 L 214.3 23.5 L 228.6 22.8 L 242.9 21.8 L 257.1 22.6 L 271.4 23.3 L 285.7 21.1 L 300 21.9 L 314.3 23.3 L 328.6 23.1 L 342.9 22.4 L 357.1 21.3 L 371.4 21.5 L 385.7 22 L 400 22.1 L 414.3 22.9 L 428.6 23 L 442.9 22 L 457.1 21.6 L 471.4 22.7 L 485.7 22.5 L 500 21 L 514.3 20.8 L 528.6 20.4 L 542.9 19.1 L 557.1 20.2 L 571.4 20.6 L 585.7 18.5 L 600 18.1 L 614.3 19.6 L 628.6 19.1 L 642.9 17.9 L 657.1 17.5 L 671.4 17 L 685.7 18.1 L 700 17.2 L 714.3 17.6 L 728.6 16.2 L 742.9 17.3 L 757.1 18.7 L 771.4 18.9 L 785.7 19.4 L 800 17.6 L 814.3 18.3 L 828.6 19.3 L 842.9 20.7 L 857.1 19 L 871.4 21 L 885.7 20.6 L 900 21.3 L 914.3 22.3 L 928.6 22.3 L 942.9 23.3 L 957.1 22.8 L 971.4 24.2 L 985.7 23.2 L 1000 24.4';

  // Subtle drop shadow depending on overlap direction
  const dropShadowStyle = isTopOverBottom
    ? {
        filter:
          'drop-shadow(0px 2.5px 3.5px rgba(40, 30, 20, 0.10)) drop-shadow(0px 6px 14px rgba(40, 30, 20, 0.05))',
      }
    : {
        filter:
          'drop-shadow(0px -2.5px 3.5px rgba(40, 30, 20, 0.10)) drop-shadow(0px -6px 14px rgba(40, 30, 20, 0.05))',
      };

  return (
    <div
      className={`w-full overflow-hidden select-none pointer-events-none relative z-10 -mt-px -mb-px ${className}`}
      style={{ backgroundColor: containerBgColor }}
      aria-hidden='true'
    >
      <svg
        className='w-full h-6 sm:h-8 md:h-9 block'
        viewBox='0 0 1000 32'
        preserveAspectRatio='none'
        style={{
          ...dropShadowStyle,
          transform: isTopOverBottom ? 'none' : 'scaleY(-1)',
          transformOrigin: 'center center',
        }}
      >
        {/* Main overlapping torn paper sheet */}
        <path d={bodyPath} fill={paperSheetColor} />

        {/* Exposed cellulose pulp deckle ribbon */}
        <path d={pulpRibbon} fill={resolvedPulpColor} opacity={0.92} />

        {/* Fine fibrous tear contour */}
        <path
          d={edgeLine}
          fill='none'
          stroke='#FFFDF8'
          strokeWidth='0.9'
          strokeLinecap='round'
          strokeLinejoin='round'
          opacity={0.85}
        />

        {/* Organic cellulose micro-fibers along the tear */}
        <path
          d='M 71.4 19.8 L 73.2 21 M 214.3 21.1 L 216.5 22.4 M 357.1 19.4 L 359 20.8 M 528.6 18.4 L 531 19.6 M 700 14.3 L 702.2 15.6 M 857.1 17.1 L 859.4 18.5'
          fill='none'
          stroke='#FAF8F4'
          strokeWidth='0.9'
          strokeLinecap='round'
          opacity={0.9}
        />
      </svg>
    </div>
  );
};
