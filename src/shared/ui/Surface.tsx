import React, { forwardRef, useContext } from 'react';
import { cn } from '@/lib/utils';
import { CountChip } from './CountChip';

export type SurfaceTone = 'brand' | 'ai' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

const CardContext = React.createContext<{ tone: SurfaceTone }>({ tone: 'brand' });

const featuredBorderClasses: Record<SurfaceTone, string> = {
  brand: 'border-t-[3px] border-t-accent',
  ai: 'border-t-[3px] border-t-violet-500',
  success: 'border-t-[3px] border-t-emerald-500',
  warning: 'border-t-[3px] border-t-amber-500',
  danger: 'border-t-[3px] border-t-rose-500',
  info: 'border-t-[3px] border-t-blue-500',
  neutral: 'border-t-[3px] border-t-stone-400',
};

const toneTileClasses: Record<SurfaceTone, string> = {
  brand: 'bg-accent-soft text-accent-dark',
  ai: 'bg-violet-100 text-violet-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-700',
  info: 'bg-blue-100 text-blue-700',
  neutral: 'bg-stone-100 text-stone-600',
};

/* -------------------------------------------------------------------------- */
/* PageHeader                                                                 */
/* -------------------------------------------------------------------------- */

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: React.ReactNode;
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  titleAriaLabel?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  variant?: 'page' | 'toolbar';
  as?: HeadingLevel;
  headingLevel?: HeadingLevel;
}

export const PageHeader = forwardRef<HTMLDivElement, PageHeaderProps>(function PageHeader(
  {
    icon,
    eyebrow,
    title,
    titleAriaLabel,
    description,
    actions,
    variant = 'page',
    as,
    headingLevel,
    className,
    children,
    ...props
  },
  ref,
) {
  const HeadingTag = as ?? headingLevel ?? 'h1';

  if (variant === 'toolbar') {
    return (
      <div
        ref={ref}
        className={cn(
          'relative flex items-center justify-between border-b border-stone-200 bg-white/95 px-4 py-2.5 shadow-[inset_0_2px_0_var(--studio-accent)]',
          className,
        )}
        {...props}
      >
        {children ?? (
          <>
            <div className='flex min-w-0 items-center gap-3'>
              {icon && (
                <div className='grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-dark [&_svg]:size-4'>
                  {icon}
                </div>
              )}
              <div className='min-w-0'>
                {eyebrow && (
                  <div className='text-xs font-semibold uppercase tracking-wider text-sienna'>
                    {eyebrow}
                  </div>
                )}
                {title && (
                  <HeadingTag
                    aria-label={titleAriaLabel}
                    className='truncate text-base font-bold text-stone-900'
                  >
                    {title}
                  </HeadingTag>
                )}
                {description && <p className='truncate text-xs text-stone-600'>{description}</p>}
              </div>
            </div>
            {actions && <div className='flex shrink-0 items-center gap-2'>{actions}</div>}
          </>
        )}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn('relative border-b border-head-line pb-4 pt-1', className)}
      {...props}
    >
      {children ?? (
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-start gap-3.5'>
            {icon && (
              <div className='grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-dark [&_svg]:size-5'>
                {icon}
              </div>
            )}
            <div className='min-w-0'>
              {eyebrow && (
                <div className='text-xs font-semibold uppercase tracking-wider text-sienna'>
                  {eyebrow}
                </div>
              )}
              {title && (
                <HeadingTag
                  aria-label={titleAriaLabel}
                  className='font-serif text-2xl font-bold text-stone-900'
                >
                  {title}
                </HeadingTag>
              )}
              {description && <p className='mt-1 text-sm text-stone-600'>{description}</p>}
            </div>
          </div>
          {actions && <div className='flex shrink-0 items-center gap-2'>{actions}</div>}
        </div>
      )}
      <span className='absolute -bottom-px left-0 h-[3px] w-12 bg-accent' aria-hidden='true' />
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/* SectionHeader                                                              */
/* -------------------------------------------------------------------------- */

export interface SectionHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  count?: React.ReactNode;
  actions?: React.ReactNode;
  level?: HeadingLevel;
  as?: HeadingLevel;
}

export const SectionHeader = forwardRef<HTMLDivElement, SectionHeaderProps>(function SectionHeader(
  { eyebrow, title, count, actions, level, as, className, ...props },
  ref,
) {
  const HeadingTag = as ?? level ?? 'h2';

  return (
    <div
      ref={ref}
      className={cn(
        'flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
      {...props}
    >
      <div>
        {eyebrow && (
          <span className='text-xs font-semibold uppercase tracking-wider text-sienna'>
            {eyebrow}
          </span>
        )}
        <div className='flex items-center gap-2'>
          <HeadingTag className='text-lg font-bold text-stone-900'>{title}</HeadingTag>
          {count !== undefined && count !== null && <CountChip count={count} />}
        </div>
      </div>
      {actions && <div className='flex shrink-0 items-center gap-2'>{actions}</div>}
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/* Card                                                                       */
/* -------------------------------------------------------------------------- */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: SurfaceTone;
  featured?: boolean;
  as?: 'section' | 'article' | 'div';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { tone = 'brand', featured = false, as = 'div', className, children, ...props },
  ref,
) {
  const Component = as;

  return (
    <CardContext.Provider value={{ tone }}>
      <Component
        ref={ref}
        className={cn(
          'overflow-hidden rounded-xl border border-stone-200/80 bg-white shadow-xs',
          featured && featuredBorderClasses[tone],
          className,
        )}
        {...props}
      >
        {children}
      </Component>
    </CardContext.Provider>
  );
});

/* -------------------------------------------------------------------------- */
/* CardHeader                                                                 */
/* -------------------------------------------------------------------------- */

export interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  tone?: SurfaceTone;
  titleAs?: HeadingLevel | 'span' | 'div';
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(function CardHeader(
  { icon, title, subtitle, actions, tone, titleAs: TitleTag = 'div', className, ...props },
  ref,
) {
  const context = useContext(CardContext);
  const resolvedTone = tone ?? context.tone;

  const bandClass =
    resolvedTone === 'ai'
      ? 'bg-violet-50/60 border-b border-violet-100'
      : 'bg-head-wash border-b border-head-line';

  return (
    <div
      ref={ref}
      className={cn('flex items-center justify-between gap-3 px-4 py-3', bandClass, className)}
      {...props}
    >
      <div className='flex min-w-0 items-center gap-2.5'>
        {icon && (
          <div
            className={cn(
              'grid size-7 shrink-0 place-items-center rounded-lg [&_svg]:size-4',
              toneTileClasses[resolvedTone],
            )}
          >
            {icon}
          </div>
        )}
        <div className='min-w-0'>
          <TitleTag className='truncate text-sm font-bold text-stone-900'>{title}</TitleTag>
          {subtitle && <p className='truncate text-xs text-stone-600'>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className='flex shrink-0 items-center gap-2'>{actions}</div>}
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/* CardBody                                                                   */
/* -------------------------------------------------------------------------- */

export type CardBodyProps = React.HTMLAttributes<HTMLDivElement>;

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(function CardBody(
  { className, children, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn('px-4 py-4', className)} {...props}>
      {children}
    </div>
  );
});
