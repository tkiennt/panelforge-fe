import React, { forwardRef, useId } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const controlClasses =
  'w-full min-h-9 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500 aria-[invalid=true]:border-rose-500 aria-[invalid=true]:ring-rose-100';

export interface FieldProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  children: React.ReactElement<{
    id?: string;
    'aria-describedby'?: string;
    'aria-invalid'?: React.AriaAttributes['aria-invalid'];
  }>;
}

export const Field = forwardRef<HTMLDivElement, FieldProps>(function Field(
  { label, hint, error, required, className, children, ...props },
  ref,
) {
  const generatedId = useId();
  const controlId = children.props.id ?? `${generatedId}-control`;
  const hintId = hint ? `${generatedId}-hint` : undefined;
  const errorId = error ? `${generatedId}-error` : undefined;
  const describedBy = [children.props['aria-describedby'], hintId, errorId]
    .filter(Boolean)
    .join(' ');
  return (
    <div ref={ref} className={cn('space-y-1.5', className)} {...props}>
      <label htmlFor={controlId} className='block text-xs font-semibold text-stone-700'>
        {label}
        {required && (
          <span aria-hidden='true' className='ml-1 text-rose-600'>
            *
          </span>
        )}
      </label>
      {React.cloneElement(children, {
        id: controlId,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : (children.props['aria-invalid'] ?? false),
      })}
      {hint && (
        <p id={hintId} className='text-xs text-stone-500'>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className='text-xs font-medium text-rose-700'>
          {error}
        </p>
      )}
    </div>
  );
});

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(controlClasses, className)} {...props} />;
  },
);
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(controlClasses, 'resize-y', className)}
      {...props}
    />
  );
});
export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return <select ref={ref} className={cn(controlClasses, className)} {...props} />;
  },
);

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  clearLabel: string;
  onClear?: () => void;
}
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { className, clearLabel, onClear, value, ...props },
  ref,
) {
  const hasValue = value !== undefined && String(value).length > 0;
  return (
    <div className={cn('relative', className)}>
      <Search
        aria-hidden='true'
        className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-500'
      />
      <Input ref={ref} type='search' value={value} className='pl-9 pr-9' {...props} />
      {onClear && hasValue && (
        <button
          type='button'
          aria-label={clearLabel}
          onClick={onClear}
          className='absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-stone-500 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-orange-600'
        >
          <X aria-hidden='true' className='size-4' />
        </button>
      )}
    </div>
  );
});
