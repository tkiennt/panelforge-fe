import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CountChip, type SurfaceTone } from '@/shared/ui';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { useTranslation } from '@/lib/i18n';
import type { BibleDesignQueueItemDto, BibleReviewStatus } from '@/services/bible.service';

/**
 * Khối dựng dùng chung cho màn "Tổng quan công việc" của mọi vai trò (Writer, Artist, …)
 * để các workspace có cùng nhịp thị giác: PageHeader → hàng số liệu → thẻ "Tiếp tục" → các panel.
 * Chỉ dùng token studio (accent, head-wash, kraft, sienna) để hoạt động đúng cả light/dark.
 */

const metricIconTone: Record<SurfaceTone, string> = {
  brand: 'bg-accent-soft text-accent-dark',
  ai: 'bg-violet-100 text-violet-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-700',
  info: 'bg-blue-100 text-blue-700',
  neutral: 'bg-stone-100 text-stone-600',
};

const metricAlertBar: Record<SurfaceTone, string> = {
  brand: 'before:bg-accent',
  ai: 'before:bg-violet-500',
  success: 'before:bg-emerald-500',
  warning: 'before:bg-amber-500',
  danger: 'before:bg-rose-500',
  info: 'before:bg-blue-500',
  neutral: 'before:bg-stone-400',
};

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-dark';

export interface OverviewMetricItem {
  key: string;
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: SurfaceTone;
  /** Hiện vạch nhấn màu khi giá trị > 0 (việc cần chú ý). */
  attention?: boolean;
  to?: string;
  onClick?: () => void;
  testId?: string;
}

export function OverviewMetrics({
  items,
  ariaLabel,
}: {
  items: OverviewMetricItem[];
  ariaLabel: string;
}) {
  return (
    <section className='grid grid-cols-2 gap-3 lg:grid-cols-4' aria-label={ariaLabel}>
      {items.map((item) => {
        const tone = item.tone ?? 'brand';
        const highlighted = item.attention && item.value > 0;
        const content = (
          <>
            <span className='flex items-center justify-between gap-2'>
              <span
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-lg [&_svg]:size-4',
                  metricIconTone[tone],
                )}
                aria-hidden='true'
              >
                {item.icon}
              </span>
              {(item.to || item.onClick) && (
                <ChevronRight
                  className='size-4 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-stone-600'
                  aria-hidden='true'
                />
              )}
            </span>
            <span className='mt-3 block font-mono text-2xl font-bold tabular-nums text-stone-900'>
              {item.value}
            </span>
            <span className='mt-0.5 block text-xs font-medium text-stone-600'>{item.label}</span>
          </>
        );
        const className = cn(
          'group relative block overflow-hidden rounded-xl border border-stone-200/80 bg-white p-4 text-left shadow-xs transition-colors',
          highlighted &&
            cn(
              "before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-['']",
              metricAlertBar[tone],
            ),
          (item.to || item.onClick) && cn('hover:border-stone-300 hover:bg-head-wash', focusRing),
        );
        if (item.to) {
          return (
            <Link key={item.key} to={item.to} data-testid={item.testId} className={className}>
              {content}
            </Link>
          );
        }
        if (item.onClick) {
          return (
            <button
              key={item.key}
              type='button'
              onClick={item.onClick}
              data-testid={item.testId}
              className={className}
            >
              {content}
            </button>
          );
        }
        return (
          <div key={item.key} data-testid={item.testId} className={className}>
            {content}
          </div>
        );
      })}
    </section>
  );
}

/** Thẻ "Tiếp tục …" nổi bật (viền trên accent) — dùng cho Writer (kịch bản) và Artist (sản xuất). */
export function ContinueCard({
  eyebrow,
  title,
  badge,
  action,
  children,
  testId,
}: {
  eyebrow: string;
  title: React.ReactNode;
  badge?: React.ReactNode;
  action: React.ReactNode;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <Card as='article' featured data-testid={testId}>
      <header className='flex flex-wrap items-center justify-between gap-3 border-b border-head-line bg-head-wash px-5 py-3.5'>
        <div className='min-w-0'>
          <p className='text-xs font-semibold uppercase tracking-wider text-sienna'>{eyebrow}</p>
          <h2 className='mt-1 truncate font-serif text-lg font-bold text-stone-900'>{title}</h2>
        </div>
        {badge}
      </header>
      <div className='space-y-4 px-5 py-4'>
        {children}
        <footer className='flex justify-end border-t border-stone-200/80 pt-3'>{action}</footer>
      </div>
    </Card>
  );
}

/** Panel danh sách có header nền ấm + đếm số lượng (Cần xử lý, Phối hợp, Yêu cầu thiết kế, …). */
export function OverviewPanel({
  id,
  icon,
  title,
  count,
  tone = 'brand',
  emphasized = false,
  action,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  count?: number;
  tone?: SurfaceTone;
  emphasized?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card
      as='section'
      tone={tone}
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn('flex flex-col', emphasized && 'border-accent ring-2 ring-accent-soft')}
    >
      <CardHeader
        icon={icon}
        tone={tone}
        title={<span id={`${id}-title`}>{title}</span>}
        titleAs='h2'
        actions={
          <>
            {action}
            {count !== undefined && <CountChip className='font-mono'>{count}</CountChip>}
          </>
        }
      />
      <div className='flex-1'>{children}</div>
    </Card>
  );
}

/** Một dòng trong panel: biểu tượng/ảnh, tiêu đề, mô tả, trạng thái, mũi tên. */
export function OverviewRow({
  to,
  leading,
  title,
  meta,
  status,
  tone = 'neutral',
}: {
  to: string;
  leading: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  status?: React.ReactNode;
  tone?: 'neutral' | 'danger';
}) {
  return (
    <li>
      <Link
        to={to}
        className={cn(
          'group flex items-center gap-3 px-5 py-3 transition-colors',
          tone === 'danger' ? 'hover:bg-rose-50' : 'hover:bg-head-wash',
          focusRing,
        )}
      >
        <span className='grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-stone-100 font-mono text-xs font-bold text-stone-700 [&_svg]:size-4'>
          {leading}
        </span>
        <span className='min-w-0 flex-1'>
          <span className='block truncate text-sm font-semibold text-stone-900'>{title}</span>
          {meta && (
            <span
              className={cn(
                'mt-0.5 block truncate text-xs',
                tone === 'danger' ? 'text-rose-700' : 'text-stone-600',
              )}
            >
              {meta}
            </span>
          )}
        </span>
        {status && <span className='shrink-0 text-xs font-semibold'>{status}</span>}
        <ChevronRight
          className='size-4 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-stone-600'
          aria-hidden='true'
        />
      </Link>
    </li>
  );
}

export function OverviewList({ children }: { children: React.ReactNode }) {
  return <ul className='divide-y divide-stone-200/80'>{children}</ul>;
}

export function OverviewEmpty({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className='flex flex-col items-center justify-center gap-2 px-5 py-8 text-center'>
      {icon}
      <p className='text-sm text-stone-600'>{children}</p>
    </div>
  );
}

/** Link dạng nút dùng chung cho CTA trong các workspace (primary = accent, secondary = viền). */
export function OverviewLinkButton({
  to,
  variant = 'primary',
  icon,
  trailingIcon,
  children,
}: {
  to: string;
  variant?: 'primary' | 'secondary';
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-colors active:scale-[0.98] [&_svg]:size-4',
        variant === 'primary'
          ? 'bg-orange-600 text-white hover:bg-orange-700'
          : 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-100',
        focusRing,
      )}
    >
      {icon}
      {children}
      {trailingIcon}
    </Link>
  );
}

const designStatusClass: Record<BibleReviewStatus, string> = {
  Draft: 'text-blue-700',
  ConceptSubmitted: 'text-amber-800',
  ReworkRequired: 'text-rose-700',
  CanonLocked: 'text-emerald-700',
};

/** Trạng thái thiết kế Series Bible — cùng màu/nhãn cho Writer và Artist. */
export function DesignStatus({ status }: { status: BibleReviewStatus }) {
  const { t } = useTranslation('collaboration');
  return (
    <span className={designStatusClass[status] ?? 'text-stone-600'}>
      {t(`writerStudio.designStatus.${status}`)}
    </span>
  );
}

/** Ảnh tham chiếu (nếu có) hoặc chữ cái đầu của thực thể Series Bible. */
export function DesignThumb({ item }: { item: BibleDesignQueueItemDto }) {
  if (item.referenceImageUrl) {
    return (
      <AuthenticatedImage
        src={item.referenceImageUrl}
        alt=''
        width={36}
        height={36}
        loading='lazy'
        className='h-full w-full object-cover'
      />
    );
  }
  return <>{item.name.trim().charAt(0).toUpperCase() || '?'}</>;
}
