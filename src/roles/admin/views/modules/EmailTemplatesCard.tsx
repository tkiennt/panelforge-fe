import React, { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService, type AdminEmailTemplateDto } from '@/services/admin.service';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { AdminBadge, AdminButton, AdminCard, AdminField } from '../components/AdminUi';
import { adminFieldClass } from '../components/adminUiStyles';

const QUERY_KEY = ['adminEmailTemplates'];
const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z]+)\s*\}\}/g;

const placeholdersIn = (text: string) => [
  ...new Set([...text.matchAll(PLACEHOLDER_RE)].map((m) => m[1])),
];
const wrap = (names: string[]) => names.map((n) => `{{${n}}}`).join(', ');

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

interface Draft {
  subject: string;
  bodyHtml: string;
}

/**
 * Admin sửa mẫu email hệ thống. Kiểm tra biến giống Backend (biến lạ, thiếu {{code}}) để báo lỗi sớm;
 * xem trước trong iframe sandbox (không chạy script) với dữ liệu mẫu đã HTML-encode như khi gửi thật.
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
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [touched, setTouched] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: adminService.getEmailTemplates,
  });

  const template: AdminEmailTemplateDto | undefined =
    data?.find((x) => x.key === selectedKey) ?? data?.[0];
  const draft: Draft | undefined = template
    ? (drafts[template.key] ?? { subject: template.subject, bodyHtml: template.bodyHtml })
    : undefined;

  const save = useMutation({
    mutationFn: (input: { key: string } & Draft) =>
      adminService.updateEmailTemplate(input.key, {
        subject: input.subject,
        bodyHtml: input.bodyHtml,
      }),
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

  return (
    <AdminCard
      title={t('admin.emailSettings.templates.title')}
      description={t('admin.emailSettings.templates.description')}
    >
      {isLoading ? (
        <p className='text-sm text-admin-muted'>{t('admin.emailSettings.templates.loading')}</p>
      ) : isError || !template || !draft ? (
        <div className='flex flex-wrap items-center gap-3' role='alert'>
          <p className='text-sm text-red-700'>{(error as Error | null)?.message}</p>
          <AdminButton size='sm' onClick={() => refetch()}>
            {t('admin.emailSettings.templates.retry')}
          </AdminButton>
        </div>
      ) : (
        renderEditor()
      )}
    </AdminCard>
  );

  function renderEditor() {
    if (!template || !draft) return null;
    const setDraft = (next: Draft) => setDrafts({ ...drafts, [template.key]: next });
    const used = placeholdersIn(`${draft.subject}\n${draft.bodyHtml}`);
    const unknown = used.filter((p) => !template.placeholders.includes(p));
    const missing = template.requiredPlaceholders.filter(
      (p) => !placeholdersIn(draft.bodyHtml).includes(p),
    );
    const errors = {
      subject:
        draft.subject.trim() === '' || /[\r\n]/.test(draft.subject)
          ? t('admin.emailSettings.templates.errors.subject')
          : null,
      body:
        draft.bodyHtml.trim() === ''
          ? t('admin.emailSettings.templates.errors.body')
          : unknown.length
            ? t('admin.emailSettings.templates.errors.unknown', { placeholders: wrap(unknown) })
            : missing.length
              ? t('admin.emailSettings.templates.errors.missing', { placeholders: wrap(missing) })
              : null,
    };
    const err = (key: keyof typeof errors) => (touched ? errors[key] : null);

    const sample = (name: string) => t(`admin.emailSettings.templates.sample.${name}`, name);
    const preview = draft.bodyHtml.replace(PLACEHOLDER_RE, (m, name: string) =>
      template.placeholders.includes(name) ? escapeHtml(sample(name)) : m,
    );
    const previewSubject = draft.subject.replace(PLACEHOLDER_RE, (m, name: string) =>
      template.placeholders.includes(name) ? sample(name) : m,
    );

    const insert = (name: string) => {
      const el = bodyRef.current;
      const token = `{{${name}}}`;
      const start = el?.selectionStart ?? draft.bodyHtml.length;
      const end = el?.selectionEnd ?? start;
      setDraft({
        ...draft,
        bodyHtml: draft.bodyHtml.slice(0, start) + token + draft.bodyHtml.slice(end),
      });
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(start + token.length, start + token.length);
      });
    };

    const submit = (e: React.FormEvent) => {
      e.preventDefault();
      setTouched(true);
      if (errors.subject || errors.body || save.isPending) return;
      save.mutate({ key: template.key, subject: draft.subject.trim(), bodyHtml: draft.bodyHtml });
    };

    return (
      <form onSubmit={submit} noValidate className='space-y-4'>
        <div className='flex flex-wrap items-end gap-3'>
          <AdminField
            label={t('admin.emailSettings.templates.type')}
            htmlFor='email-template-key'
            className='flex-1 min-w-[220px]'
          >
            <select
              id='email-template-key'
              value={template.key}
              onChange={(e) => {
                setSelectedKey(e.target.value);
                setTouched(false);
              }}
              className={adminFieldClass}
            >
              {data!.map((x) => (
                <option key={x.key} value={x.key}>
                  {t(`admin.emailSettings.templates.keys.${x.key}`, x.key)}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminBadge tone={template.isCustomized ? 'accent' : 'neutral'}>
            {template.isCustomized
              ? t('admin.emailSettings.templates.customized')
              : t('admin.emailSettings.templates.default')}
          </AdminBadge>
        </div>
        {template.changedAt && (
          <p className='text-xs text-admin-muted'>
            {t('admin.emailSettings.templates.changed', {
              date: dateTime.format(new Date(template.changedAt)),
              name: template.changedByName ?? '—',
            })}
          </p>
        )}

        <AdminField
          label={t('admin.emailSettings.templates.subject')}
          htmlFor='email-template-subject'
          required
          error={err('subject')}
        >
          <input
            id='email-template-subject'
            value={draft.subject}
            onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            maxLength={200}
            className={adminFieldClass}
          />
        </AdminField>

        <AdminField
          label={t('admin.emailSettings.templates.body')}
          htmlFor='email-template-body'
          required
          error={err('body')}
        >
          <textarea
            id='email-template-body'
            ref={bodyRef}
            value={draft.bodyHtml}
            onChange={(e) => setDraft({ ...draft, bodyHtml: e.target.value })}
            rows={12}
            spellCheck={false}
            className={cn(adminFieldClass, 'font-mono text-xs leading-relaxed min-h-60')}
          />
        </AdminField>

        <div className='space-y-2'>
          <p className='text-xs text-admin-muted'>
            {t('admin.emailSettings.templates.placeholders')}
          </p>
          <div className='flex flex-wrap gap-2'>
            {template.placeholders.map((p) => (
              <AdminButton key={p} size='sm' onClick={() => insert(p)}>
                <span className='font-mono'>{`{{${p}}}`}</span>
                {template.requiredPlaceholders.includes(p) && (
                  <span className='text-admin-muted'>
                    · {t('admin.emailSettings.templates.required')}
                  </span>
                )}
              </AdminButton>
            ))}
          </div>
        </div>

        <div className='space-y-2'>
          <p className='text-sm font-semibold text-admin-ink'>
            {t('admin.emailSettings.templates.preview')}
          </p>
          <div className='rounded-xl border border-admin-line bg-white overflow-hidden'>
            <p className='px-4 py-2 border-b border-admin-line text-sm font-semibold text-stone-900 break-all'>
              {previewSubject}
            </p>
            <iframe
              title={t('admin.emailSettings.templates.previewTitle')}
              sandbox=''
              srcDoc={`<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;color:#1c1917;margin:16px">${preview}</body>`}
              className='w-full h-72 bg-white'
            />
          </div>
        </div>

        <div className='flex flex-wrap justify-end gap-2'>
          <AdminButton
            onClick={() =>
              setDraft({ subject: template.defaultSubject, bodyHtml: template.defaultBodyHtml })
            }
            disabled={save.isPending}
          >
            {t('admin.emailSettings.templates.useDefault')}
          </AdminButton>
          <AdminButton type='submit' variant='primary' isLoading={save.isPending}>
            {t('admin.emailSettings.templates.save')}
          </AdminButton>
        </div>
      </form>
    );
  }
};
