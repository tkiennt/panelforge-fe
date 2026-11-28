import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { uploadLimitService, type UploadLimitsDto } from '@/services/uploadLimit.service';
import {
  DEFAULT_UPLOAD_LIMITS,
  formatMb,
  uploadMaxBytes,
  type UploadKind,
} from '@/lib/uploadLimits';

// Một lần tải cho cả phiên; Admin lưu giới hạn mới thì gọi setUploadLimits để mọi màn đang mở cập nhật
let cached: UploadLimitsDto | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<(limits: UploadLimitsDto) => void>();

export function setUploadLimits(limits: UploadLimitsDto) {
  cached = limits;
  listeners.forEach((notify) => notify(limits));
}

function ensureLoaded() {
  if (cached || inflight) return;
  inflight = uploadLimitService
    .get()
    .then(setUploadLimits)
    // Không tải được thì giữ mặc định và thử lại ở lần mở màn sau; Backend vẫn chặn file quá lớn (FILE_TOO_LARGE)
    .catch(() => undefined)
    .finally(() => {
      inflight = null;
    });
}

/**
 * Giới hạn kích thước file của một loại upload: `maxBytes` để kiểm file trước khi gửi, `maxMb` để ghép vào thông báo
 * (`{max}`). Trước khi server trả về thì dùng mặc định của Backend.
 */
export function useUploadLimit(kind: UploadKind) {
  const { lang } = useTranslation();
  const [limits, setLimits] = useState<UploadLimitsDto>(cached ?? DEFAULT_UPLOAD_LIMITS);

  useEffect(() => {
    listeners.add(setLimits);
    if (cached) setLimits(cached);
    else ensureLoaded();
    return () => {
      listeners.delete(setLimits);
    };
  }, []);

  const maxBytes = uploadMaxBytes(limits, kind);
  return { maxBytes, maxMb: formatMb(maxBytes, lang) };
}
