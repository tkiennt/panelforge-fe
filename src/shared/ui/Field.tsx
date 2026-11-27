import React, { createContext, forwardRef, useContext, useId } from 'react';
import { AlertCircle, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FieldContextValue {
  id: string;
  describedBy?: string;
  isInvalid?: boolean;
  required?: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
  id?: string;
}

export const Field = forwardRef<HTMLDivElement, FieldProps>(function Field(
  { label, hint, error, required = false, htmlFor, id: propId, className, children, ...props },
  ref,
) {
  const generatedId = useId();
  const id = propId ?? htmlFor ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const isInvalid = Boolean(error);

  return (
    <FieldContext.Provider value={{ id, describedBy, isInvalid, required }}>
      <div ref={ref} className={cn('flex flex-col gap-1.5', className)} {...props}>
        {label && (
          <label htmlFor={id} className='text-xs font-semibold text-stone-800'>
            {label}
            {required && (
              <span className='ml-1 text-rose-500' aria-hidden='true'>
                *
              </span>
            )}
          </label>
        )}
        {children}
        {hint && !error && (
          <p id={hintId} className='text-xs text-stone-500'>
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role='alert' className='flex items-center gap-1 text-xs text-rose-600'>
            <AlertCircle className='size-3.5 shrink-0' aria-hidden='true' />
            <span>{error}</span>
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
});

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id: propId, required: propRequired, className, ...props },
  ref,
) {
  const context = useContext(FieldContext);
  const id = propId ?? context?.id;
  const required = propRequired ?? context?.required;
  const ariaDescribedBy = props['aria-describedby'] ?? context?.describedBy;
  const isInvalid = props['aria-invalid'] ?? context?.isInvalid;

  return (
    <input
      ref={ref}
      id={id}
      required={required}
      aria-describedby={ariaDescribedBy}
      aria-invalid={isInvalid ? 'true' : undefined}
      className={cn(
        'w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 outline-hidden transition-all',
        'focus:border-orange-500 focus:ring-1 focus:ring-orange-500',
        'disabled:bg-stone-50 disabled:text-stone-400 disabled:cursor-not-allowed',
        'aria-invalid:border-rose-500 aria-invalid:focus:border-rose-500 aria-invalid:focus:ring-rose-500',
        className,
      )}
      {...props}
    />
  );
});

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { id: propId, required: propRequired, className, ...props },
  ref,
) {
  const context = useContext(FieldContext);
  const id = propId ?? context?.id;
  const required = propRequired ?? context?.required;
  const ariaDescribedBy = props['aria-describedby'] ?? context?.describedBy;
  const isInvalid = props['aria-invalid'] ?? context?.isInvalid;

  return (
    <textarea
      ref={ref}
      id={id}
      required={required}
      aria-describedby={ariaDescribedBy}
      aria-invalid={isInvalid ? 'true' : undefined}
      className={cn(
        'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 outline-hidden transition-all',
        'focus:border-orange-500 focus:ring-1 focus:ring-orange-500',
        'disabled:bg-stone-50 disabled:text-stone-400 disabled:cursor-not-allowed',
        'aria-invalid:border-rose-500 aria-invalid:focus:border-rose-500 aria-invalid:focus:ring-rose-500',
        className,
      )}
      {...props}
    />
  );
});

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { id: propId, required: propRequired, className, children, ...props },
  ref,
) {
  const context = useContext(FieldContext);
  const id = propId ?? context?.id;
  const required = propRequired ?? context?.required;
  const ariaDescribedBy = props['aria-describedby'] ?? context?.describedBy;
  const isInvalid = props['aria-invalid'] ?? context?.isInvalid;

  return (
    <select
      ref={ref}
      id={id}
      required={required}
      aria-describedby={ariaDescribedBy}
      aria-invalid={isInvalid ? 'true' : undefined}
      className={cn(
        'w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-900 outline-hidden transition-all',
        'focus:border-orange-500 focus:ring-1 focus:ring-orange-500',
        'disabled:bg-stone-50 disabled:text-stone-400 disabled:cursor-not-allowed',
        'aria-invalid:border-rose-500 aria-invalid:focus:border-rose-500 aria-invalid:focus:ring-rose-500',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export interface SearchInputProps extends Omit<InputProps, 'type'> {
  onClear?: () => void;
  clearAriaLabel?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { onClear, clearAriaLabel = 'Clear search', value, className, ...props },
  ref,
) {
  const hasValue = value !== undefined && value !== null && String(value).length > 0;

  return (
    <div className='relative flex w-full items-center'>
      <Search
        className='pointer-events-none absolute left-3 size-3.5 text-stone-400'
        aria-hidden='true'
      />
      <Input
        ref={ref}
        type='search'
        value={value}
        className={cn('pl-9 pr-8', className)}
        {...props}
      />
      {hasValue && onClear && (
        <button
          type='button'
          onClick={onClear}
          aria-label={clearAriaLabel}
          className='absolute right-2.5 grid size-5 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600 focus:outline-hidden'
        >
          <X className='size-3' aria-hidden='true' />
        </button>
      )}
    </div>
  );
});
