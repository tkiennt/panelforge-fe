import React from 'react';
import { useTranslation } from '@/lib/i18n';
import {
  SPEC_SCHEMA,
  SpecCategory,
  getFieldLabel,
  getFieldPlaceholder,
  getGroupTitle,
} from './bibleSpec';

export interface SpecFieldsEditorProps {
  category: SpecCategory;
  values: Record<string, string>;
  readOnly?: boolean;
  onChange?: (key: string, value: string) => void;
}

export const SpecFieldsEditor: React.FC<SpecFieldsEditorProps> = ({
  category,
  values,
  readOnly = false,
  onChange,
}) => {
  const { t } = useTranslation();
  return (
    <div className='space-y-3' data-testid='spec-fields-editor'>
      {SPEC_SCHEMA[category].map((group) => {
        const visibleFields = group.fields.filter(
          (field) => !readOnly || Boolean(values[field.key]?.trim()),
        );
        if (readOnly && visibleFields.length === 0) return null;

        return (
          <fieldset
            key={group.key}
            className='p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2'
          >
            <legend className='px-1 text-xs font-semibold uppercase tracking-wider text-stone-500'>
              {getGroupTitle(group.key, t)}
            </legend>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              {visibleFields.map((field) => {
                const id = `spec-${field.key}`;
                const value = values[field.key] ?? '';
                return (
                  <div key={field.key} className={field.multiline ? 'sm:col-span-2' : undefined}>
                    <label htmlFor={id} className='block text-xs font-semibold text-stone-700 mb-1'>
                      {getFieldLabel(field, t)}
                    </label>
                    {readOnly ? (
                      <p id={id} className='text-sm text-stone-800 whitespace-pre-line'>
                        {value}
                      </p>
                    ) : field.multiline ? (
                      <textarea
                        id={id}
                        rows={8}
                        value={value}
                        placeholder={getFieldPlaceholder(field, t)}
                        onChange={(e) => onChange?.(field.key, e.target.value)}
                        className='w-full min-h-44 max-h-96 px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm leading-relaxed text-stone-900 focus:outline-none focus:border-orange-500 resize-y [field-sizing:content]'
                      />
                    ) : (
                      <input
                        id={id}
                        type='text'
                        value={value}
                        placeholder={getFieldPlaceholder(field, t)}
                        onChange={(e) => onChange?.(field.key, e.target.value)}
                        className='w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:border-orange-500'
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
};
