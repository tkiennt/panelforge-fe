import React, { useEffect, useRef, useState } from 'react';
import { translate, useTranslation } from '@/lib/i18n';
import {
  AlertCircle,
  Check,
  Crop,
  Loader2,
  Maximize2,
  RotateCcw,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { seriesService, type SeriesImageKind } from '@/services/series.service';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import {
  SERIES_AVATAR_PRESETS,
  SERIES_BANNER_POSITION,
  SERIES_BANNER_PRESETS,
  SERIES_IMAGE_RULES,
} from '@/shared/utils/seriesImagePresets';
import { Alert, Modal } from '@/shared/ui';

interface Props {
  seriesId: string;
  kind: SeriesImageKind;
  /** URL ảnh đang dùng (API, cần Bearer) hoặc null. */
  currentUrl: string | null;
  onClose: () => void;
  /** Gọi sau khi Backend lưu xong (URL mới, null = đã gỡ). */
  onApplied: (url: string | null) => void;
}

type Choice =
  { type: 'preset'; id: string } | { type: 'upload'; file: File } | { type: 'remove' } | null;

type FitMode = 'contain' | 'cover';

/**
 * Xử lý ảnh tải lên bằng Canvas trước khi gửi lên API:
 * - 'contain': Giữ trọn 100% chi tiết ảnh, bổ sung nền mờ (blur ambient) sang hai bên/trên dưới để vừa khung chuẩn.
 * - 'cover': Cắt theo tỉ lệ chuẩn với toạ độ pan & độ zoom do người dùng tùy chỉnh.
 */
async function processImageForSeries(
  filePreviewUrl: string,
  kind: SeriesImageKind,
  fitMode: FitMode,
  zoom: number,
  pan: { x: number; y: number },
  previewBoxSize: { width: number; height: number },
  originalFile: File,
): Promise<File> {
  if (typeof document === 'undefined' || typeof HTMLCanvasElement === 'undefined') {
    return originalFile;
  }

  const isAvatar = kind === 'avatar';
  const targetW = isAvatar ? 512 : 1200;
  const targetH = isAvatar ? 512 : 400; // Avatar: vuông 1:1; Banner: tỉ lệ 3:1

  const img = new Image();
  img.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(translate('features.seriesIdentity.readImageError')));
    img.src = filePreviewUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx || !canvas.toBlob) {
    return originalFile;
  }

  const natW = img.naturalWidth || targetW;
  const natH = img.naturalHeight || targetH;
  const imgRatio = natW / natH;
  const targetRatio = targetW / targetH;

  if (fitMode === 'contain') {
    // 1. Vẽ nền mờ ambient để lấp khoảng trống hai bên / trên dưới
    ctx.save();
    let bgW = targetW;
    let bgH = targetH;
    if (imgRatio > targetRatio) {
      bgH = targetH;
      bgW = bgH * imgRatio;
    } else {
      bgW = targetW;
      bgH = bgW / imgRatio;
    }
    const bgX = (targetW - bgW) / 2;
    const bgY = (targetH - bgH) / 2;

    if ('filter' in ctx) {
      ctx.filter = 'blur(24px)';
    }
    ctx.drawImage(img, bgX, bgY, bgW, bgH);
    ctx.restore();

    // Lớp phủ tối nhẹ tạo tương phản cho tranh chính nổi bật
    ctx.fillStyle = 'rgba(28, 25, 23, 0.35)';
    ctx.fillRect(0, 0, targetW, targetH);

    // 2. Vẽ ảnh chính sắc nét ở trung tâm (giữ 100% hình ảnh không bị xén)
    let drawW: number;
    let drawH: number;
    let drawX: number;
    let drawY: number;

    if (imgRatio > targetRatio) {
      drawW = targetW;
      drawH = targetW / imgRatio;
      drawX = 0;
      drawY = (targetH - drawH) / 2;
    } else {
      drawH = targetH;
      drawW = targetH * imgRatio;
      drawX = (targetW - drawW) / 2;
      drawY = 0;
    }
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  } else {
    // Chế độ 'cover': tái hiện toạ độ từ preview box
    const boxW = previewBoxSize.width > 0 ? previewBoxSize.width : isAvatar ? 192 : 600;
    const boxH = previewBoxSize.height > 0 ? previewBoxSize.height : isAvatar ? 192 : 200;
    const boxRatio = boxW / boxH;

    let baseRenderW: number;
    let baseRenderH: number;
    if (imgRatio > boxRatio) {
      baseRenderH = boxH;
      baseRenderW = boxH * imgRatio;
    } else {
      baseRenderW = boxW;
      baseRenderH = boxW / imgRatio;
    }

    const renderW = baseRenderW * zoom;
    const renderH = baseRenderH * zoom;
    const renderX = boxW / 2 + pan.x - renderW / 2;
    const renderY = boxH / 2 + pan.y - renderH / 2;

    const scaleRatio = targetW / boxW;
    const destX = renderX * scaleRatio;
    const destY = renderY * scaleRatio;
    const destW = renderW * scaleRatio;
    const destH = renderH * scaleRatio;

    ctx.fillStyle = '#FCFBF8';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(img, destX, destY, destW, destH);
  }

  const outType = originalFile.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, outType, 0.92);
  });

  if (!blob) return originalFile;

  return new File([blob], originalFile.name, { type: outType });
}

/**
 * Chọn avatar (1:1) hoặc banner (~3:1) cho Series: mẫu có sẵn hoặc tải ảnh riêng.
 * Hỗ trợ chế độ "Vừa khung" (không mất viền) hoặc "Lấp đầy" kèm kéo vị trí và thu phóng.
 * Chỉ khi bấm "Áp dụng" mới gọi API lưu lên kho asset R2; "Hủy" không đổi gì.
 */
export const SeriesImagePickerDialog: React.FC<Props> = ({
  seriesId,
  kind,
  currentUrl,
  onClose,
  onApplied,
}) => {
  const { t } = useTranslation('features');
  const isAvatar = kind === 'avatar';
  const presets = isAvatar ? SERIES_AVATAR_PRESETS : SERIES_BANNER_PRESETS;
  const [choice, setChoice] = useState<Choice>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Chế độ hiển thị & crop ảnh tải lên
  const [fitMode, setFitMode] = useState<FitMode>('contain');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const fileRef = useRef<HTMLInputElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);

  // Kéo chuột để di chuyển ảnh trong chế độ 'cover'
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initPanX: number;
    initPanY: number;
  }>({
    startX: 0,
    startY: 0,
    initPanX: 0,
    initPanY: 0,
  });

  const title = isAvatar ? t('seriesIdentity.titleAvatar') : t('seriesIdentity.titleBanner');
  const ratioClass = isAvatar ? 'aspect-square' : 'aspect-[3/1]';

  useEffect(
    () => () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    },
    [filePreview],
  );

  const pickFile = (file: File | undefined) => {
    setFileError(null);
    setSaveError(null);
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setFileError(t('seriesIdentity.invalidFileType'));
      return;
    }
    if (file.size > SERIES_IMAGE_RULES.maxBytes) {
      setFileError(
        t('seriesIdentity.fileTooLarge', { size: (file.size / 1024 / 1024).toFixed(1) }),
      );
      return;
    }
    setFilePreview(URL.createObjectURL(file));
    setChoice({ type: 'upload', file });
    // Mặc định chọn 'contain' để giữ nguyên toàn bộ hình ảnh không bị tràn viền / cắt góc
    setFitMode('contain');
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (fitMode !== 'cover') return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initPanX: pan.x,
      initPanY: pan.y,
    };
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (fitMode !== 'cover' || e.touches.length !== 1) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      initPanX: pan.x,
      initPanY: pan.y,
    };
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      setPan({
        x: Math.round(dragStartRef.current.initPanX + dx),
        y: Math.round(dragStartRef.current.initPanY + dy),
      });
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - dragStartRef.current.startX;
      const dy = e.touches[0].clientY - dragStartRef.current.startY;
      setPan({
        x: Math.round(dragStartRef.current.initPanX + dx),
        y: Math.round(dragStartRef.current.initPanY + dy),
      });
    };

    const onEnd = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, []);

  const close = () => {
    if (!saving) onClose();
  };

  const apply = async () => {
    if (!choice || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      let url: string | null = null;
      if (choice.type === 'preset') {
        url = await seriesService.setSeriesImagePreset(seriesId, kind, choice.id);
      } else if (choice.type === 'upload') {
        let fileToUpload = choice.file;
        if (filePreview) {
          try {
            const boxRect = previewBoxRef.current?.getBoundingClientRect();
            fileToUpload = await processImageForSeries(
              filePreview,
              kind,
              fitMode,
              zoom,
              pan,
              {
                width: boxRect?.width || (isAvatar ? 192 : 600),
                height: boxRect?.height || (isAvatar ? 192 : 200),
              },
              choice.file,
            );
          } catch (processErr) {
            console.warn('Không thể xử lý canvas ảnh, dùng file gốc:', processErr);
            fileToUpload = choice.file;
          }
        }
        url = await seriesService.setSeriesImage(seriesId, kind, fileToUpload);
      } else {
        await seriesService.clearSeriesImage(seriesId, kind);
      }
      onApplied(url);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('seriesIdentity.saveErrorFallback'));
    } finally {
      setSaving(false);
    }
  };

  const selectedPreset =
    choice?.type === 'preset' ? presets.find((p) => p.id === choice.id) : undefined;
  const ring =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]';

  // Xem trước theo đúng tỷ lệ hiển thị
  const preview =
    choice?.type === 'remove' ? (
      <div className='w-full h-full flex items-center justify-center text-xs text-[#57534E] bg-[#F3F0E9]'>
        {t('seriesIdentity.willUseDefault')}
      </div>
    ) : selectedPreset ? (
      <img
        src={selectedPreset.preview}
        alt=''
        className='w-full h-full object-cover'
        style={{ objectPosition: selectedPreset.position }}
      />
    ) : choice?.type === 'upload' && filePreview ? (
      fitMode === 'contain' ? (
        <div
          ref={previewBoxRef}
          className='relative w-full h-full overflow-hidden flex items-center justify-center bg-stone-900'
        >
          {/* Nền mờ ambient */}
          <img
            src={filePreview}
            alt=''
            aria-hidden='true'
            className='absolute inset-0 w-full h-full object-cover blur-md scale-125 opacity-35 pointer-events-none'
          />
          <div className='absolute inset-0 bg-stone-900/25 pointer-events-none' />
          {/* Tranh chính sắc nét, nguyên vẹn 100% không bị cắt */}
          <img
            src={filePreview}
            alt=''
            className='relative z-10 w-full h-full object-contain p-1 select-none pointer-events-none'
          />
        </div>
      ) : (
        <div
          ref={previewBoxRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className='relative w-full h-full overflow-hidden flex items-center justify-center bg-stone-900 cursor-grab active:cursor-grabbing select-none'
          title={t('seriesIdentity.dragToMoveTitle')}
        >
          <img
            src={filePreview}
            alt=''
            draggable={false}
            className='w-full h-full object-cover pointer-events-none select-none transition-transform duration-75'
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          />
          <div className='absolute bottom-1.5 left-1/2 -translate-x-1/2 pointer-events-none bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-xs whitespace-nowrap shadow-xs'>
            {t('seriesIdentity.dragToCenterHint')}
          </div>
        </div>
      )
    ) : currentUrl ? (
      <AuthenticatedImage
        src={currentUrl}
        alt=''
        className='w-full h-full object-cover'
        style={{ objectPosition: isAvatar ? '50% 50%' : SERIES_BANNER_POSITION }}
      />
    ) : (
      <div className='w-full h-full flex items-center justify-center text-xs text-[#57534E] bg-[#F3F0E9]'>
        {t('seriesIdentity.noImage')}
      </div>
    );

  return (
    <Modal
      isOpen
      onClose={close}
      closeLabel={t('seriesIdentity.closeNoSave')}
      size='lg'
      title={title}
      dismissible={!saving}
    >
      <div
        data-testid={`series-${kind}-dialog`}
        className='w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl shadow-2xl p-5 space-y-4'
      >
        <div className='flex items-start justify-between gap-3'>
          <div>
            <h2 id='series-image-dialog-title' className='text-base font-bold text-[#1C1917]'>
              {title}
            </h2>
            <p className='text-xs text-[#57534E] mt-0.5'>
              {isAvatar ? t('seriesIdentity.avatarRuleHint') : t('seriesIdentity.bannerRuleHint')} ·{' '}
              {SERIES_IMAGE_RULES.label}. {t('seriesIdentity.applyHint')}
            </p>
          </div>
          <button
            type='button'
            onClick={close}
            disabled={saving}
            aria-label={t('seriesIdentity.closeNoSave')}
            className={`p-1.5 rounded-lg text-[#57534E] hover:bg-[#F3F0E9] cursor-pointer ${ring}`}
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Khung xem trước & Tùy chỉnh chế độ hiển thị */}
        <div className='space-y-3'>
          <div className='flex flex-col sm:flex-row sm:items-start gap-4'>
            <div
              className={`${isAvatar ? 'w-44 h-44 sm:w-48 sm:h-48' : 'w-full'} ${ratioClass} rounded-xl overflow-hidden border border-[#D8D2C5] bg-[#ECE7DC] shrink-0 shadow-xs`}
              data-testid='series-image-preview'
            >
              {preview}
            </div>

            {/* Bảng điều khiển khi đang chọn ảnh tải lên */}
            {choice?.type === 'upload' && (
              <div className='flex-1 space-y-2.5 min-w-0'>
                <div className='text-xs font-semibold text-[#44403C]'>
                  {t('seriesIdentity.displayModeLabel')}
                </div>
                <div className='flex items-center gap-1.5 p-1 bg-[#F3F0E9] rounded-lg border border-[#D8D2C5] w-fit'>
                  <button
                    type='button'
                    onClick={() => setFitMode('contain')}
                    className={`min-h-7 px-2.5 py-1 text-xs font-semibold rounded-md transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                      fitMode === 'contain'
                        ? 'bg-white text-[#C2410C] shadow-xs'
                        : 'text-[#57534E] hover:text-[#1C1917]'
                    } ${ring}`}
                  >
                    <Maximize2 className='w-3.5 h-3.5' />
                    {t('seriesIdentity.fitContain')}
                  </button>
                  <button
                    type='button'
                    onClick={() => setFitMode('cover')}
                    className={`min-h-7 px-2.5 py-1 text-xs font-semibold rounded-md transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                      fitMode === 'cover'
                        ? 'bg-white text-[#C2410C] shadow-xs'
                        : 'text-[#57534E] hover:text-[#1C1917]'
                    } ${ring}`}
                  >
                    <Crop className='w-3.5 h-3.5' />
                    {t('seriesIdentity.fitCover')}
                  </button>
                </div>

                {fitMode === 'contain' ? (
                  <p className='text-[11px] text-[#78716C] leading-relaxed'>
                    {t('seriesIdentity.fitContainDesc')}
                  </p>
                ) : (
                  <div className='space-y-2 pt-1'>
                    <div className='flex items-center gap-2 text-xs text-[#57534E]'>
                      <span className='font-medium text-[#44403C]'>
                        {t('seriesIdentity.zoomLabel')}
                      </span>
                      <button
                        type='button'
                        onClick={() => setZoom((z) => Math.max(1, Number((z - 0.1).toFixed(2))))}
                        disabled={zoom <= 1}
                        aria-label={t('seriesIdentity.zoomOutAria')}
                        className={`p-1 rounded border border-[#D8D2C5] bg-white hover:bg-[#F3F0E9] disabled:opacity-40 cursor-pointer ${ring}`}
                      >
                        <ZoomOut className='w-3.5 h-3.5' />
                      </button>
                      <input
                        type='range'
                        min='1'
                        max='3'
                        step='0.05'
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        aria-label={t('seriesIdentity.zoomSliderAria')}
                        className='w-28 accent-[#EA580C] cursor-pointer'
                      />
                      <button
                        type='button'
                        onClick={() => setZoom((z) => Math.min(3, Number((z + 0.1).toFixed(2))))}
                        disabled={zoom >= 3}
                        aria-label={t('seriesIdentity.zoomInAria')}
                        className={`p-1 rounded border border-[#D8D2C5] bg-white hover:bg-[#F3F0E9] disabled:opacity-40 cursor-pointer ${ring}`}
                      >
                        <ZoomIn className='w-3.5 h-3.5' />
                      </button>
                      <span className='w-9 text-right font-mono text-[11px] font-semibold text-[#44403C]'>
                        {Math.round(zoom * 100)}%
                      </span>
                    </div>

                    <div className='flex items-center gap-2'>
                      <span className='text-[11px] text-[#78716C]'>
                        {t('seriesIdentity.dragPanHint')}
                      </span>
                      {(zoom > 1 || pan.x !== 0 || pan.y !== 0) && (
                        <button
                          type='button'
                          onClick={() => {
                            setZoom(1);
                            setPan({ x: 0, y: 0 });
                          }}
                          className={`text-xs text-[#C2410C] hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer ml-auto ${ring}`}
                        >
                          <RotateCcw className='w-3 h-3' />
                          {t('seriesIdentity.resetBtn')}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className='text-xs font-semibold text-[#44403C] mb-2'>
            {t('seriesIdentity.presetsTitle')}
          </div>
          <div
            className={`grid gap-2 ${isAvatar ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-1 sm:grid-cols-3'}`}
          >
            {presets.map((p) => {
              const on = choice?.type === 'preset' && choice.id === p.id;
              return (
                <button
                  key={p.id}
                  type='button'
                  aria-pressed={on}
                  aria-label={t('seriesIdentity.selectPresetAria', { name: p.name })}
                  data-testid={`series-preset-${p.id}`}
                  disabled={saving}
                  onClick={() => {
                    setSaveError(null);
                    setChoice({ type: 'preset', id: p.id });
                  }}
                  className={`relative rounded-lg border-2 overflow-hidden ${ratioClass} cursor-pointer ${on ? 'border-[#F97316]' : 'border-[#D8D2C5] hover:border-[#F97316]/60'} ${ring}`}
                >
                  <img
                    src={p.thumb}
                    alt=''
                    className='w-full h-full object-cover'
                    style={{ objectPosition: p.position }}
                  />
                  {on && (
                    <span className='absolute top-1 right-1 w-5 h-5 rounded-full bg-[#F97316] text-white flex items-center justify-center'>
                      <Check className='w-3 h-3' aria-hidden='true' />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <input
            ref={fileRef}
            type='file'
            accept={SERIES_IMAGE_RULES.accept}
            className='hidden'
            data-testid='series-image-file'
            onChange={(e) => {
              pickFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <button
            type='button'
            onClick={() => fileRef.current?.click()}
            disabled={saving}
            className={`min-h-9 px-3 rounded-lg border border-[#D8D2C5] bg-white text-sm font-semibold text-[#44403C] hover:bg-[#F3F0E9] inline-flex items-center gap-1.5 cursor-pointer ${ring}`}
          >
            <Upload className='w-4 h-4' aria-hidden='true' />
            {choice?.type === 'upload'
              ? t('seriesIdentity.selectedFile', { name: choice.file.name })
              : t('seriesIdentity.uploadOwn')}
          </button>
          {currentUrl && (
            <button
              type='button'
              onClick={() => setChoice({ type: 'remove' })}
              aria-pressed={choice?.type === 'remove'}
              disabled={saving}
              className={`min-h-9 px-3 rounded-lg text-sm font-semibold cursor-pointer ${choice?.type === 'remove' ? 'bg-[#FFF2E6] text-[#C2410C]' : 'text-[#57534E] hover:bg-[#F3F0E9]'} ${ring}`}
            >
              {t('seriesIdentity.resetToDefault')}
            </button>
          )}
        </div>

        {(fileError || saveError) && (
          <Alert tone='danger' data-testid='series-image-error' className='text-xs'>
            <span>
              {fileError || saveError}
              {saveError && t('seriesIdentity.saveErrorRetryHint')}
            </span>
          </Alert>
        )}

        <div className='flex justify-end gap-2'>
          <button
            type='button'
            onClick={close}
            disabled={saving}
            className={`min-h-9 px-4 rounded-lg border border-[#D8D2C5] bg-white text-sm font-semibold text-[#44403C] hover:bg-[#F3F0E9] cursor-pointer disabled:opacity-50 ${ring}`}
          >
            {t('seriesIdentity.cancel')}
          </button>
          <button
            type='button'
            onClick={() => void apply()}
            disabled={!choice || saving}
            data-testid='series-image-apply'
            className={`min-h-9 px-4 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-sm font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer disabled:bg-stone-200 disabled:text-stone-500 disabled:cursor-not-allowed ${ring}`}
          >
            {saving && <Loader2 className='w-4 h-4 animate-spin' aria-hidden='true' />}
            {saving ? t('seriesIdentity.saving') : t('seriesIdentity.apply')}
          </button>
        </div>
      </div>
    </Modal>
  );
};
