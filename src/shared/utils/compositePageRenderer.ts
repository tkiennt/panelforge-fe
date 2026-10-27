// src/shared/utils/compositePageRenderer.ts
// Ghép ảnh các Panel (và element ảnh) thành một trang hoàn chỉnh khổ 1200×1800.
// Dùng chung cho Artist (xem trước khi nộp) và Editor (ReviewView) để cả hai thấy cùng một kết quả.
import type { AssetReferenceDto, PanelDto } from '@/types';
import type { ElementSnapshotDto } from '@/services/element.service';
import { IMAGE_LAYER_TYPES } from '@/services/element.service';
import { parseBoundingBox, type ParsedBoundingBox } from '@/shared/utils/panelBoundingBox';
import { canvasFont, resolveTextStyle } from '@/roles/letterer/lib/textStyle';
import {
  appearanceFromStyle,
  balloonPath,
  tailFromStyle,
  fillRgba,
  layoutText,
  resolveAppearance,
  type BalloonAppearance,
} from '@/roles/letterer/lib/balloonRender';

/** Phần tối thiểu của một khung để ghép trang (dùng chung cho PanelDto và SubmissionPanelDto). */
export type CompositePanel = Pick<PanelDto, 'id' | 'boundingBox'>;

export const COMPOSITE_PAGE_WIDTH = 1200;
export const COMPOSITE_PAGE_HEIGHT = 1800;

export interface PixelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ClipPoint = { x: number; y: number };

/** Đường clip của khung (px trên trang): đa giác nếu khung nghiêng (có `corners` 0–1 trong hộp khung), ngược lại hình chữ nhật. */
export function getPanelClipPoints(box: ParsedBoundingBox): ClipPoint[] {
  if (box.corners && box.corners.length >= 3) {
    return box.corners.map((c) => ({
      x: box.pixelX + c.x * box.pixelW,
      y: box.pixelY + c.y * box.pixelH,
    }));
  }
  return [
    { x: box.pixelX, y: box.pixelY },
    { x: box.pixelX + box.pixelW, y: box.pixelY },
    { x: box.pixelX + box.pixelW, y: box.pixelY + box.pixelH },
    { x: box.pixelX, y: box.pixelY + box.pixelH },
  ];
}

/**
 * Toạ độ element không có đơn vị cố định: cùng quy tắc với bàn vẽ (ArtistDeskView) —
 * `width <= 100 || height <= 100` coi là phần trăm trang, ngược lại là pixel.
 */
export function resolveElementRect(
  el: Pick<ElementSnapshotDto, 'x' | 'y' | 'width' | 'height'>,
  pageW = COMPOSITE_PAGE_WIDTH,
  pageH = COMPOSITE_PAGE_HEIGHT,
): PixelRect {
  const isPercent = el.width <= 100 || el.height <= 100;
  if (isPercent) {
    return {
      x: (el.x / 100) * pageW,
      y: (el.y / 100) * pageH,
      w: (el.width / 100) * pageW,
      h: (el.height / 100) * pageH,
    };
  }
  return { x: el.x, y: el.y, w: el.width, h: el.height };
}

/** Rect đặt ảnh theo kiểu "contain" (giữ tỉ lệ, căn giữa) trong `target`. */
export function containRect(imgW: number, imgH: number, target: PixelRect): PixelRect {
  if (imgW <= 0 || imgH <= 0) return target;
  const scale = Math.min(target.w / imgW, target.h / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  return { x: target.x + (target.w - w) / 2, y: target.y + (target.h - h) / 2, w, h };
}

export interface ElementImageSources {
  /** Map AssetReference id → URL (đã xin access-link). */
  assetUrls?: Record<string, string>;
  /** Map bibleEntryId → referenceImageUrl. */
  bibleImageUrls?: Record<string, string>;
}

/** Thứ tự nguồn ảnh của element: `assetId` → `content` là URL/data: → ảnh tham chiếu của Bible entry. */
export function resolveElementImageUrl(
  el: Pick<ElementSnapshotDto, 'assetId' | 'content' | 'bibleEntryId'>,
  sources: ElementImageSources,
): string | null {
  if (el.assetId && sources.assetUrls?.[el.assetId]) return sources.assetUrls[el.assetId];
  if (el.content && (el.content.startsWith('http') || el.content.startsWith('data:'))) {
    return el.content;
  }
  if (el.bibleEntryId && sources.bibleImageUrls?.[el.bibleEntryId]) {
    return sources.bibleImageUrls[el.bibleEntryId];
  }
  return null;
}

/** Element ảnh cần vẽ: không bị xoá, thuộc loại layer ảnh, theo zIndex tăng dần. */
export function selectDrawableElements(elements: ElementSnapshotDto[]): ElementSnapshotDto[] {
  const imageTypes = new Set<string>(IMAGE_LAYER_TYPES);
  return elements
    .filter((el) => !el.isRemoved && imageTypes.has(el.elementType))
    .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
}

/** Element chữ của Letterer (bóng thoại, dẫn truyện…): không bị xoá, không phải layer ảnh, có nội dung. */
export function selectTextElements(elements: ElementSnapshotDto[]): ElementSnapshotDto[] {
  const imageTypes = new Set<string>(IMAGE_LAYER_TYPES);
  return elements
    .filter(
      (el) =>
        !el.isRemoved &&
        !imageTypes.has(el.elementType) &&
        !!(el.renderedText ?? el.content ?? '').trim(),
    )
    .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
}

/** Bản mới nhất của mỗi Panel: danh sách đã sắp theo stage → panelId → versionNumber nên lấy phần tử có version lớn nhất. */
export function latestArtworkByPanel(
  artworks: AssetReferenceDto[],
): Map<string, AssetReferenceDto> {
  const map = new Map<string, AssetReferenceDto>();
  for (const art of artworks) {
    if (!art.panelId) continue;
    const cur = map.get(art.panelId);
    if (!cur || art.versionNumber >= cur.versionNumber) map.set(art.panelId, art);
  }
  return map;
}

export function latestWholePageArtwork(artworks: AssetReferenceDto[]): AssetReferenceDto | null {
  let best: AssetReferenceDto | null = null;
  for (const art of artworks) {
    if (art.panelId) continue;
    if (!best || art.versionNumber >= best.versionNumber) best = art;
  }
  return best;
}

type Ctx2D = CanvasRenderingContext2D;

export interface CompositeEnv {
  createCanvas: (w: number, h: number) => HTMLCanvasElement;
  /** Trả null khi ảnh lỗi/không có CORS; không được ném lỗi. */
  loadImage: (url: string) => Promise<CanvasImageSource | null>;
}

const defaultEnv: CompositeEnv = {
  createCanvas: (w, h) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    return canvas;
  },
  loadImage: (url) =>
    new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    }),
};

const sizeOf = (img: CanvasImageSource): { w: number; h: number } => {
  const anyImg = img as unknown as {
    naturalWidth?: number;
    naturalHeight?: number;
    width?: number;
    height?: number;
  };
  return {
    w: anyImg.naturalWidth || anyImg.width || 0,
    h: anyImg.naturalHeight || anyImg.height || 0,
  };
};

function tracePath(ctx: Ctx2D, points: ClipPoint[]) {
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
}

/**
 * Vẽ lớp chữ cho màn duyệt và bản xuất bằng đúng quy tắc của bàn Letterer (`balloonRender`): cùng hình bóng, nền,
 * viền, vùng chữ an toàn, ngắt dòng và cỡ chữ đã chọn (không tự thu nhỏ). Không vẽ khung chọn/tay nắm/đường gióng.
 * Hình bóng/nền/viền/đuôi đọc từ `style` đã lưu (BE TextStyle); thiếu thì mặc định theo loại — giống bàn Letterer và bản xuất BE.
 */
export function drawTextElement(
  ctx: Ctx2D,
  el: ElementSnapshotDto,
  rect: PixelRect,
  appearance: BalloonAppearance = resolveAppearance(el.elementType, appearanceFromStyle(el.style)),
) {
  const text = (el.renderedText ?? el.content ?? '').trim();
  const style = resolveTextStyle(el);

  ctx.save();
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
  ctx.translate(-rect.w / 2, -rect.h / 2);

  const d = balloonPath(appearance.shape, rect.w, rect.h, tailFromStyle(el.style) ?? undefined);
  if (d && typeof Path2D !== 'undefined') {
    const shape = new Path2D(d);
    if (appearance.fillOpacity > 0) {
      ctx.fillStyle = fillRgba(appearance);
      ctx.fill(shape);
    }
    if (appearance.borderWidth > 0) {
      ctx.strokeStyle = appearance.borderColor;
      ctx.lineWidth = appearance.borderWidth;
      ctx.stroke(shape);
    }
  }

  const layout = layoutText(text, style, appearance.shape, rect.w, rect.h, (s, font) => {
    ctx.font = font;
    return ctx.measureText(s).width;
  });
  const { area, lines, lineHeightPx } = layout;
  const align = style.align ?? 'center';
  ctx.font = layout.font;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const x = align === 'left' ? area.x : align === 'right' ? area.x + area.w : area.x + area.w / 2;
  const top = area.y + area.h / 2 - layout.textHeight / 2 + lineHeightPx / 2;
  lines.forEach((line, i) => {
    const y = top + i * lineHeightPx;
    if (style.strokeColor && style.strokeWidth) {
      ctx.strokeStyle = style.strokeColor;
      ctx.lineWidth = style.strokeWidth * 2; // stroke canvas nằm giữa nét chữ, nhân đôi cho giống -webkit-text-stroke
      ctx.lineJoin = 'round';
      ctx.strokeText(line, x, y);
    }
    ctx.fillStyle = style.color ?? '#171717';
    ctx.fillText(line, x, y);
  });
  ctx.restore();
}

function drawPlaceholder(ctx: Ctx2D, rect: PixelRect) {
  ctx.save();
  ctx.fillStyle = '#F4F4F5';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = '#A1A1AA';
  ctx.lineWidth = 2;
  ctx.setLineDash?.([10, 8]);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

export interface RenderCompositeInput {
  panels: CompositePanel[];
  /** panelId → URL ảnh của bản mới nhất. Panel không có ảnh chỉ vẽ khung. */
  panelImageUrls: Record<string, string>;
  /** Element ảnh vẽ chồng lên (đã nạp snapshot của trang). */
  elements?: ElementSnapshotDto[];
  elementSources?: ElementImageSources;
  /** Vẽ cả element chữ (bóng thoại, dẫn truyện) — dùng cho màn duyệt Letter. Mặc định chỉ vẽ ảnh. */
  drawText?: boolean;
  width?: number;
  height?: number;
  env?: Partial<CompositeEnv>;
}

export interface RenderCompositeResult {
  dataUrl: string;
  /** Số ảnh không tải được (đã thay bằng ô giữ chỗ / bỏ qua) — một ảnh lỗi không làm hỏng cả trang. */
  failedImages: number;
}

/**
 * Vẽ trang ghép: nền trắng → mỗi Panel (clip theo khung chữ nhật/đa giác, ảnh co "contain", viền theo đúng path đã clip)
 * → element ảnh theo zIndex (xoay quanh tâm). Ảnh lỗi không ném lỗi mà được bỏ qua.
 */
export async function renderCompositePage(
  input: RenderCompositeInput,
): Promise<RenderCompositeResult> {
  const width = input.width ?? COMPOSITE_PAGE_WIDTH;
  const height = input.height ?? COMPOSITE_PAGE_HEIGHT;
  const env: CompositeEnv = { ...defaultEnv, ...input.env };
  let failedImages = 0;
  let dataUrl = '';

  try {
    const canvas = env.createCanvas(width, height);
    const ctx = canvas.getContext ? canvas.getContext('2d') : null;
    if (!ctx) return { dataUrl, failedImages };

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    for (const panel of input.panels) {
      const box = parseBoundingBox(panel.boundingBox, width, height);
      const points = getPanelClipPoints(box);
      const boundsRect: PixelRect = { x: box.pixelX, y: box.pixelY, w: box.pixelW, h: box.pixelH };

      const url = input.panelImageUrls[panel.id];
      if (url) {
        const img = await env.loadImage(url);
        if (img) {
          const { w, h } = sizeOf(img);
          const dest = containRect(w, h, boundsRect);
          ctx.save();
          tracePath(ctx, points);
          ctx.clip();
          ctx.drawImage(img, dest.x, dest.y, dest.w, dest.h);
          ctx.restore();
        } else {
          failedImages += 1;
          drawPlaceholder(ctx, boundsRect);
        }
      }

      if (!box.borderless) {
        // Stroke đúng path đã clip (đa giác khi khung nghiêng), không dùng strokeRect.
        ctx.save();
        ctx.strokeStyle = '#171717';
        ctx.lineWidth = 2;
        tracePath(ctx, points);
        ctx.stroke();
        ctx.restore();
      }
    }

    for (const el of selectDrawableElements(input.elements ?? [])) {
      const url = resolveElementImageUrl(el, input.elementSources ?? {});
      if (!url) continue;
      const img = await env.loadImage(url);
      if (!img) {
        failedImages += 1;
        continue;
      }
      const rect = resolveElementRect(el, width, height);
      const { w, h } = sizeOf(img);
      const dest = containRect(w, h, rect);
      ctx.save();
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
      ctx.drawImage(
        img,
        dest.x - (rect.x + rect.w / 2),
        dest.y - (rect.y + rect.h / 2),
        dest.w,
        dest.h,
      );
      ctx.restore();
    }

    if (input.drawText) {
      const texts = selectTextElements(input.elements ?? []);
      // Canvas không tự chờ webfont: nạp trước các font Letterer đã chọn, lỗi thì vẽ bằng font dự phòng
      // Nạp cả kiểu mặc định theo loại (không chỉ kiểu đã lưu) và đúng đậm/nghiêng, tránh đo bằng font dự phòng
      const fonts = new Set(texts.map((el) => canvasFont(resolveTextStyle(el), 24)));
      await Promise.all(
        [...fonts].map((f) =>
          (typeof document !== 'undefined' ? document.fonts?.load(f) : undefined)?.catch(
            () => undefined,
          ),
        ),
      );
      for (const el of texts) {
        drawTextElement(ctx, el, resolveElementRect(el, width, height));
      }
    }

    dataUrl = canvas.toDataURL('image/png');
  } catch {
    // Môi trường thiếu canvas đầy đủ hoặc canvas bị taint: trả về rỗng thay vì làm hỏng màn hình.
  }
  return { dataUrl, failedImages };
}

export interface BuildPageCompositeInput {
  panels: CompositePanel[];
  /** Artwork của trang ở đúng stage (và đã lọc theo phạm vi cần ghép). */
  artworks: AssetReferenceDto[];
  elements?: ElementSnapshotDto[];
  /** Vẽ cả element chữ (màn duyệt Letter). */
  drawText?: boolean;
  bibleImageUrls?: Record<string, string>;
  /** Xin link tải của một AssetReference (vd artworkService.getArtworkAccessLink + resolveArtworkUrl). */
  getAccessUrl: (assetReferenceId: string) => Promise<string>;
  width?: number;
  height?: number;
  env?: Partial<CompositeEnv>;
}

export interface BuildPageCompositeResult extends RenderCompositeResult {
  /** `page` = hiển thị ảnh cả trang (không ghép); `panels` = ghép từ ảnh Panel; `empty` = chưa có ảnh nào. */
  mode: 'page' | 'panels' | 'empty';
}

/** Cổng vào cấp cao: nếu stage đã có ảnh cả trang thì dùng nó, ngược lại ghép bản mới nhất của từng Panel + element. */
export async function buildPageComposite(
  input: BuildPageCompositeInput,
): Promise<BuildPageCompositeResult> {
  const width = input.width ?? COMPOSITE_PAGE_WIDTH;
  const height = input.height ?? COMPOSITE_PAGE_HEIGHT;
  const safeAccess = async (id: string): Promise<string | null> => {
    try {
      return await input.getAccessUrl(id);
    } catch {
      return null;
    }
  };

  const whole = latestWholePageArtwork(input.artworks);
  if (whole) {
    const url = await safeAccess(whole.id);
    const base = { width, height, env: input.env };
    // Ảnh cả trang: vẽ như một khung phủ toàn trang, không vẽ viền khung/element.
    const result = await renderCompositePage({
      ...base,
      panels: [
        {
          id: '__page__',
          boundingBox: JSON.stringify({
            x: 0,
            y: 0,
            width,
            height,
            unit: 'px',
            pageWidthPx: width,
            pageHeightPx: height,
            borderless: true,
          }),
        } as PanelDto,
      ],
      panelImageUrls: url ? { __page__: url } : {},
      // Duyệt Letter: chữ vẫn phải chồng lên ảnh cả trang
      elements: input.drawText ? selectTextElements(input.elements ?? []) : undefined,
      drawText: input.drawText,
    });
    return { ...result, failedImages: result.failedImages + (url ? 0 : 1), mode: 'page' };
  }

  const latest = latestArtworkByPanel(input.artworks);
  const panelImageUrls: Record<string, string> = {};
  let unresolved = 0;
  for (const [panelId, art] of latest) {
    const url = await safeAccess(art.id);
    if (url) panelImageUrls[panelId] = url;
    else unresolved += 1;
  }

  const assetUrls: Record<string, string> = {};
  const wantedAssets = new Set<string>();
  for (const el of selectDrawableElements(input.elements ?? [])) {
    if (el.assetId) wantedAssets.add(el.assetId);
  }
  for (const assetId of wantedAssets) {
    const known = input.artworks.find((a) => a.id === assetId);
    if (known && panelImageUrls[known.panelId ?? '']) continue;
    const url = await safeAccess(assetId);
    if (url) assetUrls[assetId] = url;
  }

  if (latest.size === 0 && (input.elements ?? []).length === 0) {
    return { dataUrl: '', failedImages: 0, mode: 'empty' };
  }

  const result = await renderCompositePage({
    panels: input.panels,
    panelImageUrls,
    elements: input.elements,
    elementSources: { assetUrls, bibleImageUrls: input.bibleImageUrls },
    drawText: input.drawText,
    width,
    height,
    env: input.env,
  });
  return { ...result, failedImages: result.failedImages + unresolved, mode: 'panels' };
}
