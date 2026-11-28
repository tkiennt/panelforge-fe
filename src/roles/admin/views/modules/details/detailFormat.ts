export const formatDateTime = (iso: string | null | undefined, locale: string) =>
  iso
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(iso),
      )
    : '—';
