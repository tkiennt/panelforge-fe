// PanelForge symbol ("Trang khung P"): three manga panels forming a P; the orange panel is the page in progress.
// Master artwork + usage rules: design/logo/final (BRAND-GUIDE.md). UI sizes are ≤ 40px, so this is the
// small-size cut (orange panel filled solid).
interface BrandMarkProps {
  size?: number;
  /** 'ink' on light backgrounds, 'paper' on dark ones. */
  tone?: 'ink' | 'paper';
  className?: string;
}

export function BrandMark({ size = 32, tone = 'ink', className }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='24 24 208 208'
      className={className}
      aria-hidden='true'
      focusable='false'
    >
      <path
        fill={tone === 'ink' ? '#1C1917' : '#F3F0E9'}
        d='M32 32H96V224H32Z M112 32H168A56 56 0 0 1 168 144H112Z'
      />
      <path fill='#F97316' d='M112 160H224V224H112Z' />
    </svg>
  );
}
