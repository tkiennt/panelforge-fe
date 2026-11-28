import React, { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import {
  adminService,
  type AdminEmailTemplateDto,
  type EmailTemplateContent,
} from '@/services/admin.service';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/common/useDebounce';
import { AdminBadge, AdminButton, AdminCard, AdminField } from '../components/AdminUi';
import { adminFieldClass, adminFocusRing } from '../components/adminUiStyles';

const QUERY_KEY = ['adminEmailTemplates'];
const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z]+)\s*\}\}/g;

type Field = keyof EmailTemplateContent;
const FIELDS: { key: Field; multiline: boolean; required: boolean }[] = [
  { key: 'subject', multiline: false, required: true },
  { key: 'greeting', multiline: false, required: true },
  { key: 'intro', multiline: true, required: true },
  { key: 'note', multiline: true, required: false },
  { key: 'signature', multiline: true, required: false },
];

const unknownPlaceholders = (content: EmailTemplateContent, allowed: string[]) => [
  ...new Set(
    Object.values(content)
      .flatMap((text) => [...text.matchAll(PLACEHOLDER_RE)].map((m) => m[1]))
      .filter((name) => !allowed.includes(name)),
  ),
];

const fieldErrors = (content: EmailTemplateContent, allowed: string[]) => ({
  subject: !content.subject.trim() ? 'required' : /[\r\n]/.test(content.subject) ? 'subject' : null,
  greeting: content.greeting.trim() ? null : 'required',
  intro: content.intro.trim() ? null : 'required',
  unknown: unknownPlaceholders(content, allowed),
});

/**
 * Admin sửa lời lẽ email hệ thống bằng các ô chữ thường. Bố cục và ô mã OTP do Backend dựng nên Admin không làm mất mã;
 * thông tin như tên người nhận được chèn bằng nút. Xem trước lấy từ Backend (đúng email sẽ gửi), hiển thị trong iframe
 * sandbox không chạy script.
 */
export const EmailTemplatesCard: React.FC<{
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}> = ({ onSaved, onError }) => {
  const { t, lang } = useTranslation();
  const queryClient = useQueryClient();
  const dateTime = useMemo(
    () => new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' }),
    [lang],
  );
  const inputs = useRef<Partial<Record<Field, HTMLInputElement | HTMLTextAreaElement | null>>>({});
  const lastField = useRef<Field>('intro');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, EmailTemplateContent>>({});
  const [touched, setTouched] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: adminService.getEmailTemplates,
  });

  const template: AdminEmailTemplateDto | undefined =
    data?.find((x) => x.key === selectedKey) ?? data?.[0];
  const draft: EmailTemplateContent | undefined = template
    ? (drafts[template.key] ?? template.content)
    : undefined;
  const errors = template && draft ? fieldErrors(draft, template.placeholders) : null;
  const valid =
    !!errors && !errors.subject && !errors.greeting && !errors.intro && !errors.unknown.length;

  const debounced = useDebounce(draft, 400);
  const debouncedValid =
    !!template &&
    !!debounced &&
    (() => {
      const e = fieldErrors(debounced, template.placeholders);
      return !e.subject && !e.greeting && !e.intro && !e.unknown.length;
    })();
  const preview = useQuery({
    queryKey: ['adminEmailTemplatePreview', template?.key, debounced],
    queryFn: () => adminService.previewEmailTemplate(template!.key, debounced!),
    enabled: debouncedValid,
    placeholderData: (previous) => previous,
    retry: false,
  });

  const save = useMutation({
    mutationFn: (input: { key: string; content: EmailTemplateContent }) =>
      adminService.updateEmailTemplate(input.key, input.content),
    onSuccess: (next) => {
      queryClient.setQueryData<AdminEmailTemplateDto[]>(QUERY_KEY, (list) =>
        list?.map((x) => (x.key === next.key ? next : x)),
      );
      setDrafts(({ [next.key]: _saved, ...rest }) => rest);
      setTouched(false);
      onSaved(t('admin.emailSettings.templates.saved'));
    },
    onError: (err: Error) => onError(err.message),
  });

  const sendTest = useMutation({
    mutationFn: (input: { key: string; content: EmailTemplateContent }) =>
      adminService.sendTestEmailTemplate(input.key, input.content),
    onSuccess: ({ sentTo }) =>
      onSaved(t('admin.emailSettings.templates.testSent', { email: sentTo })),
    onError: (err: Error) => onError(err.message),
  });

  const setDraft = (next: EmailTemplateContent) => {
    if (template) setDrafts({ ...drafts, [template.key]: next });
  };

  const insert = (name: string) => {
    if (!draft) return;
    const field = lastField.current;
    const el = inputs.current[field];
    const token = `{{${name}}}`;
    const value = draft[field];
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? start;
    setDraft({ ...draft, [field]: value.slice(0, start) + token + value.slice(end) });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const guard = (action: () => void) => {
    setTouched(true);
    if (valid) action();
  };

  const fieldError = (field: Field) => {
    const code = errors?.[field as 'subject' | 'greeting' | 'intro'];
    return touched && code ? t(`admin.emailSettings.templates.errors.${code}`) : null;
  };

  const renderField = (field: (typeof FIELDS)[number]) => {
    if (!draft) return null;
    const id = `email-template-${field.key}`;
    const common = {
      id,
      value: draft[field.key],
      onFocus: () => {
        lastField.current = field.key;
      },
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft({ ...draft, [field.key]: e.target.value }),
      className: cn(adminFieldClass, field.multiline && 'min-h-24 leading-relaxed'),
    };
    return (
      <AdminField
        key={field.key}
        label={t(`admin.emailSettings.templates.${field.key}`)}
        htmlFor={id}
        required={field.required}
        hint={field.required ? undefined : t('admin.emailSettings.templates.optional')}
        error={fieldError(field.key)}
      >
        {field.multiline ? (
          <textarea
            {...common}
            ref={(el) => {
              inputs.current[field.key] = el;
            }}
            rows={3}
            maxLength={2000}
          />
        ) : (
          <input
            {...common}
            ref={(el) => {
              inputs.current[field.key] = el;
            }}
            maxLength={field.key === 'subject' ? 200 : 2000}
          />
        )}
      </AdminField>
    );
  };

  return (
    <AdminCard
      title={t('admin.emailSettings.templates.title')}
      description={t('admin.emailSettings.templates.description')}
    >
      {isLoading ? (
        <p className='text-sm text-admin-muted'>{t('admin.emailSettings.templates.loading')}</p>
      ) : isError || !template || !draft || !errors ? (
        <div className='flex flex-wrap items-center gap-3' role='alert'>
          <p className='text-sm text-red-700'>{(error as Error | null)?.message}</p>
          <AdminButton size='sm' onClick={() => refetch()}>
            {t('admin.emailSettings.templates.retry')}
          </AdminButton>
        </div>
      ) : (
        <div className='grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]'>
          <nav aria-label={t('admin.emailSettings.templates.typesLabel')}>
            <ul className='space-y-2'>
              {data!.map((x) => {
                const active = x.key === template.key;
                return (
                  <li key={x.key}>
                    <button
                      type='button'
                      aria-pressed={active}
                      onClick={() => {
                        setSelectedKey(x.key);
                        setTouched(false);
                      }}
                      className={cn(
                        'w-full text-left p-3 rounded-xl border transition-colors cursor-pointer',
                        adminFocusRing,
                        active
                          ? 'border-admin-accent bg-admin-accent-soft'
                          : 'border-admin-line bg-admin-field hover:bg-admin-hover',
                      )}
                    >
                      <span className='flex items-start justify-between gap-2'>
                        <span className='text-sm font-semibold text-admin-ink-strong'>
                          {t(`admin.emailSettings.templates.keys.${x.key}`, x.key)}
                        </span>
                        {(x.isCustomized || drafts[x.key]) && (
                          <AdminBadge tone='accent'>
                            {t('admin.emailSettings.templates.customized')}
                          </AdminBadge>
                        )}
                      </span>
                      <span className='block mt-1 text-xs text-admin-muted'>
                        {t(`admin.emailSettings.templates.when.${x.key}`, '')}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className='grid gap-6 2xl:grid-cols-2 min-w-0'>
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                guard(() => save.mutate({ key: template.key, content: draft }));
              }}
              className='space-y-4 min-w-0'
            >
              {template.changedAt && (
                <p className='text-xs text-admin-muted'>
                  {t('admin.emailSettings.templates.changed', {
                    date: dateTime.format(new Date(template.changedAt)),
                    name: template.changedByName ?? '—',
                  })}
                </p>
              )}

              {FIELDS.slice(0, 3).map(renderField)}
              {template.hasCode && (
                <div className='flex items-center gap-3 p-3 rounded-xl border border-dashed border-admin-line bg-admin-subtle'>
                  <KeyRound className='w-4 h-4 text-admin-muted shrink-0' aria-hidden />
                  <div>
                    <p className='text-sm font-semibold text-admin-ink'>
                      {t('admin.emailSettings.templates.codeBox')}
                    </p>
                    <p className='text-xs text-admin-muted'>
                      {t('admin.emailSettings.templates.codeBoxHint')}
                    </p>
                  </div>
                </div>
              )}
              {FIELDS.slice(3).map(renderField)}

              <div className='space-y-2'>
                <p className='text-xs text-admin-muted'>
                  {t('admin.emailSettings.templates.insertLabel')}
                </p>
                <div className='flex flex-wrap gap-2'>
                  {template.placeholders.map((p) => (
                    <AdminButton
                      key={p}
                      size='sm'
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => insert(p)}
                    >
                      + {t(`admin.emailSettings.templates.fields.${p}`, p)}
                    </AdminButton>
                  ))}
                </div>
                {errors.unknown.length > 0 && (
                  <p className='text-xs text-red-700' role='alert'>
                    {t('admin.emailSettings.templates.errors.unknown', {
                      placeholders: errors.unknown.map((n) => `{{${n}}}`).join(', '),
                    })}
                  </p>
                )}
              </div>

              <div className='flex flex-wrap justify-end gap-2 pt-2'>
                <AdminButton
                  onClick={() => setDraft(template.defaultContent)}
                  disabled={save.isPending}
                >
                  {t('admin.emailSettings.templates.useDefault')}
                </AdminButton>
                <AdminButton
                  onClick={() =>
                    guard(() => sendTest.mutate({ key: template.key, content: draft }))
                  }
                  isLoading={sendTest.isPending}
                >
                  {t('admin.emailSettings.templates.sendTest')}
                </AdminButton>
                <AdminButton type='submit' variant='primary' isLoading={save.isPending}>
                  {t('admin.emailSettings.templates.save')}
                </AdminButton>
              </div>
            </form>

            <section className='space-y-2 min-w-0' aria-live='polite'>
              <div>
                <p className='text-sm font-semibold text-admin-ink'>
                  {t('admin.emailSettings.templates.preview')}
                </p>
                <p className='text-xs text-admin-muted'>
                  {t('admin.emailSettings.templates.previewHint')}
                </p>
              </div>
              <div className='rounded-xl border border-admin-line bg-white overflow-hidden'>
                {preview.data ? (
                  <>
                    <p className='px-4 py-2 border-b border-admin-line text-sm font-semibold text-stone-900 break-all'>
                      {preview.data.subject}
                    </p>
                    <iframe
                      title={t('admin.emailSettings.templates.previewTitle')}
                      sandbox=''
                      srcDoc={`<!doctype html><meta charset="utf-8"><body style="margin:16px">${preview.data.bodyHtml}</body>`}
                      className={cn('w-full h-96 bg-white', preview.isFetching && 'opacity-60')}
                    />
                  </>
                ) : (
                  <p className='p-4 text-sm text-admin-muted'>
                    {preview.isError
                      ? (preview.error as Error).message
                      : t('admin.emailSettings.templates.previewLoading')}
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </AdminCard>
  );
};
