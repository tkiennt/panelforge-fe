import { describe, expect, it, vi } from 'vitest';
import type { AssetReferenceDto, PanelDto } from '@/types';
import type { ElementSnapshotDto } from '@/services/element.service';
import {
  buildPageComposite,
  containRect,
  getPanelClipPoints,
  renderCompositePage,
  resolveElementImageUrl,
  resolveElementRect,
  selectDrawableElements,
  selectTextElements,
  drawTextElement,
} from './compositePageRenderer';
import { parseBoundingBox } from './panelBoundingBox';
import { panelArtworkCoverage } from '@/shared/features/collaboration/collaborationRules';
import { layoutText, resolveAppearance } from '@/roles/letterer/lib/balloonRender';
import { resolveTextStyle } from '@/roles/letterer/lib/textStyle';

const rectBox = JSON.stringify({
  x: 100,
  y: 200,
  width: 400,
  height: 300,
  unit: 'px',
  pageWidthPx: 1200,
  pageHeightPx: 1800,
});

const polyBox = JSON.stringify({
  x: 100,
  y: 200,
  width: 400,
  height: 300,
  unit: 'px',
  pageWidthPx: 1200,
  pageHeightPx: 1800,
  corners: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0.8, y: 1 },
    { x: 0, y: 1 },
  ],
});

const panel = (id: string, boundingBox: string): PanelDto => ({ id, boundingBox }) as PanelDto;

const makeCtx = () => {
  const calls: string[] = [];
  const ctx: Record<string, unknown> = {};
  [
    'fillRect',
    'strokeRect',
    'save',
    'restore',
    'beginPath',
    'moveTo',
    'lineTo',
    'closePath',
    'clip',
    'stroke',
    'drawImage',
    'translate',
    'rotate',
    'setLineDash',
  ].forEach((name) => {
    ctx[name] = (...args: unknown[]) => {
      calls.push(`${name}:${args.join(',')}`);
    };
  });
  return { ctx, calls };
};

const makeEnv = (loadImage: (url: string) => Promise<CanvasImageSource | null>) => {
  const { ctx, calls } = makeCtx();
  const canvas = {
    getContext: () => ctx,
    toDataURL: () => 'data:image/png;base64,AAA',
  } as unknown as HTMLCanvasElement;
  return { calls, env: { createCanvas: () => canvas, loadImage } };
};

const okImage = { naturalWidth: 100, naturalHeight: 100 } as unknown as CanvasImageSource;

describe('getPanelClipPoints', () => {
  it('trả hình chữ nhật khi khung không có corners', () => {
    const pts = getPanelClipPoints(parseBoundingBox(rectBox));
    expect(pts).toEqual([
      { x: 100, y: 200 },
      { x: 500, y: 200 },
      { x: 500, y: 500 },
      { x: 100, y: 500 },
    ]);
  });

  it('trả đa giác (corners 0–1 trong hộp khung) khi khung nghiêng', () => {
    const pts = getPanelClipPoints(parseBoundingBox(polyBox));
    expect(pts).toHaveLength(4);
    expect(pts[2]).toEqual({ x: 100 + 0.8 * 400, y: 500 });
  });
});

describe('resolveElementRect', () => {
  it('coi width/height <= 100 là phần trăm trang', () => {
    expect(resolveElementRect({ x: 10, y: 20, width: 50, height: 25 })).toEqual({
      x: 120,
      y: 360,
      w: 600,
      h: 450,
    });
  });

  it('coi giá trị lớn là pixel', () => {
    expect(resolveElementRect({ x: 10, y: 20, width: 300, height: 400 })).toEqual({
      x: 10,
      y: 20,
      w: 300,
      h: 400,
    });
  });
});

describe('containRect', () => {
  it('giữ tỉ lệ và căn giữa', () => {
    expect(containRect(200, 100, { x: 0, y: 0, w: 100, h: 100 })).toEqual({
      x: 0,
      y: 25,
      w: 100,
      h: 50,
    });
  });
});

describe('element helpers', () => {
  it('chọn nguồn ảnh: assetId → content URL → Bible', () => {
    const sources = { assetUrls: { a1: 'u-asset' }, bibleImageUrls: { b1: 'u-bible' } };
    expect(
      resolveElementImageUrl({ assetId: 'a1', content: 'http://x', bibleEntryId: 'b1' }, sources),
    ).toBe('u-asset');
    expect(
      resolveElementImageUrl({ assetId: 'zz', content: 'http://x', bibleEntryId: 'b1' }, sources),
    ).toBe('http://x');
    expect(
      resolveElementImageUrl({ assetId: null, content: 'abc', bibleEntryId: 'b1' }, sources),
    ).toBe('u-bible');
    expect(
      resolveElementImageUrl({ assetId: null, content: null, bibleEntryId: null }, sources),
    ).toBeNull();
  });

  it('bỏ isRemoved và loại không phải layer ảnh, sắp theo zIndex', () => {
    const els = [
      { elementId: '3', elementType: 'PROP', zIndex: 3, isRemoved: false },
      { elementId: '1', elementType: 'BACKGROUND', zIndex: 1, isRemoved: false },
      { elementId: '2', elementType: 'PROP', zIndex: 2, isRemoved: true },
      { elementId: '4', elementType: 'SPEECH_BALLOON', zIndex: 4, isRemoved: false },
    ] as ElementSnapshotDto[];
    expect(selectDrawableElements(els).map((e) => e.elementId)).toEqual(['1', '3']);
  });
});

describe('renderCompositePage', () => {
  it('clip hình chữ nhật: 4 điểm, vẽ ảnh trong clip và stroke theo path', async () => {
    const { env, calls } = makeEnv(async () => okImage);
    const res = await renderCompositePage({
      panels: [panel('p1', rectBox)],
      panelImageUrls: { p1: 'u1' },
      env,
    });
    expect(res.dataUrl).toContain('data:image/png');
    expect(calls.filter((c) => c.startsWith('lineTo'))).toHaveLength(6); // 3 clip + 3 stroke
    expect(calls).toContain('clip:');
    expect(calls.some((c) => c.startsWith('strokeRect'))).toBe(false);
    expect(calls.indexOf('clip:')).toBeLessThan(calls.findIndex((c) => c.startsWith('drawImage')));
  });

  it('clip đa giác: vẽ đúng các đỉnh corners và KHÔNG dùng strokeRect', async () => {
    const { env, calls } = makeEnv(async () => okImage);
    await renderCompositePage({
      panels: [panel('p1', polyBox)],
      panelImageUrls: { p1: 'u1' },
      env,
    });
    expect(calls).toContain(`lineTo:${100 + 0.8 * 400},500`);
    expect(calls.some((c) => c.startsWith('strokeRect'))).toBe(false);
  });

  it('ảnh lỗi không làm hỏng cả trang: vẽ ô giữ chỗ và vẫn trả dataUrl', async () => {
    const { env, calls } = makeEnv(async (url) => (url === 'bad' ? null : okImage));
    const res = await renderCompositePage({
      panels: [panel('p1', rectBox), panel('p2', rectBox)],
      panelImageUrls: { p1: 'bad', p2: 'good' },
      env,
    });
    expect(res.dataUrl).not.toBe('');
    expect(res.failedImages).toBe(1);
    expect(calls.filter((c) => c.startsWith('drawImage'))).toHaveLength(1);
    expect(calls.some((c) => c.startsWith('strokeRect'))).toBe(true); // placeholder
  });

  it('không ném lỗi khi toDataURL bị taint', async () => {
    const { ctx } = makeCtx();
    const canvas = {
      getContext: () => ctx,
      toDataURL: () => {
        throw new Error('tainted');
      },
    } as unknown as HTMLCanvasElement;
    const res = await renderCompositePage({
      panels: [panel('p1', rectBox)],
      panelImageUrls: {},
      env: { createCanvas: () => canvas },
    });
    expect(res.dataUrl).toBe('');
  });

  it('element: xoay quanh tâm và vẽ theo zIndex tăng dần, bỏ isRemoved', async () => {
    const { env, calls } = makeEnv(async () => okImage);
    const els = [
      {
        elementId: 'b',
        elementType: 'PROP',
        zIndex: 2,
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        content: 'http://b',
        rotation: 90,
        isRemoved: false,
      },
      {
        elementId: 'a',
        elementType: 'BACKGROUND',
        zIndex: 1,
        x: 0,
        y: 0,
        width: 300,
        height: 300,
        content: 'http://a',
        isRemoved: false,
      },
      {
        elementId: 'c',
        elementType: 'PROP',
        zIndex: 3,
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        content: 'http://c',
        isRemoved: true,
      },
    ] as ElementSnapshotDto[];
    const loadSpy = vi.fn(async () => okImage);
    const e2 = { ...env, loadImage: loadSpy };
    await renderCompositePage({ panels: [], panelImageUrls: {}, elements: els, env: e2 });
    expect(loadSpy.mock.calls.map((c) => (c as unknown[])[0])).toEqual(['http://a', 'http://b']);
    expect(calls).toContain(`rotate:${Math.PI / 2}`);
    expect(calls).toContain('translate:100,100');
  });
});

describe('buildPageComposite', () => {
  const art = (over: Partial<AssetReferenceDto>): AssetReferenceDto =>
    ({
      id: 'x',
      pageId: 'pg',
      pipelineStageId: 's',
      versionNumber: 1,
      createdAt: '2026-10-01T00:00:00Z',
      ...over,
    }) as AssetReferenceDto;

  it('có ảnh cả trang thì hiển thị ảnh cả trang, không ghép Panel', async () => {
    const { env } = makeEnv(async () => okImage);
    const getAccessUrl = vi.fn(async (id: string) => `url-${id}`);
    const res = await buildPageComposite({
      panels: [panel('p1', rectBox)],
      artworks: [
        art({ id: 'w1', panelId: null, versionNumber: 1 }),
        art({ id: 'pa', panelId: 'p1' }),
      ],
      getAccessUrl,
      env,
    });
    expect(res.mode).toBe('page');
    expect(getAccessUrl).toHaveBeenCalledTimes(1);
    expect(getAccessUrl).toHaveBeenCalledWith('w1');
  });

  it('ghép bản mới nhất của mỗi Panel; link lỗi không làm hỏng cả trang', async () => {
    const { env } = makeEnv(async () => okImage);
    const getAccessUrl = vi.fn(async (id: string) => {
      if (id === 'p2v1') throw new Error('403');
      return `url-${id}`;
    });
    const res = await buildPageComposite({
      panels: [panel('p1', rectBox), panel('p2', rectBox)],
      artworks: [
        art({ id: 'p1v1', panelId: 'p1', versionNumber: 1 }),
        art({ id: 'p1v2', panelId: 'p1', versionNumber: 2 }),
        art({ id: 'p2v1', panelId: 'p2', versionNumber: 1 }),
      ],
      getAccessUrl,
      env,
    });
    expect(res.mode).toBe('panels');
    expect(getAccessUrl).not.toHaveBeenCalledWith('p1v1');
    expect(res.failedImages).toBe(1);
    expect(res.dataUrl).not.toBe('');
  });

  it('chưa có ảnh nào → empty', async () => {
    const res = await buildPageComposite({
      panels: [panel('p1', rectBox)],
      artworks: [],
      getAccessUrl: async () => 'u',
    });
    expect(res.mode).toBe('empty');
  });
});

describe('panelArtworkCoverage (checklist theo luật BE)', () => {
  const a = (panelId: string | null, createdAt: string) => ({
    pageId: 'pg',
    pipelineStageId: 's',
    panelId,
    createdAt,
  });

  it('đếm N/M và đủ khi mọi panel có ảnh', () => {
    const r = panelArtworkCoverage([a('p1', '2026-10-01T00:00:00Z')], 'pg', 's', null, [
      'p1',
      'p2',
    ]);
    expect(r).toMatchObject({ covered: 1, total: 2, complete: false });
    const full = panelArtworkCoverage(
      [a('p1', '2026-10-01T00:00:00Z'), a('p2', '2026-10-01T00:00:00Z')],
      'pg',
      's',
      null,
      ['p1', 'p2'],
    );
    expect(full.complete).toBe(true);
  });

  it('ảnh cả trang là đủ dù panel chưa có ảnh', () => {
    const r = panelArtworkCoverage([a(null, '2026-10-01T00:00:00Z')], 'pg', 's', null, [
      'p1',
      'p2',
    ]);
    expect(r).toMatchObject({ hasFullPage: true, complete: true, covered: 0 });
  });

  it('sau khi bị trả về chỉ tính ảnh tạo từ mốc từ chối trở đi', () => {
    const rejectedAt = '2026-10-05T00:00:00Z';
    const r = panelArtworkCoverage(
      [a('p1', '2026-10-01T00:00:00Z'), a('p2', '2026-10-06T00:00:00Z')],
      'pg',
      's',
      rejectedAt,
      ['p1', 'p2'],
    );
    expect(r).toMatchObject({ covered: 1, total: 2, complete: false });
  });

  it('bỏ qua ảnh khác stage hoặc khác trang', () => {
    const r = panelArtworkCoverage(
      [{ ...a('p1', '2026-10-01T00:00:00Z'), pipelineStageId: 'other' }],
      'pg',
      's',
      null,
      ['p1'],
    );
    expect(r.covered).toBe(0);
  });
});

describe('lớp chữ cho màn duyệt Letter', () => {
  const text = (over: Partial<ElementSnapshotDto>): ElementSnapshotDto =>
    ({
      elementId: crypto.randomUUID(),
      elementType: 'SPEECH_BALLOON',
      zIndex: 1,
      x: 10,
      y: 10,
      width: 200,
      height: 120,
      content: 'Xin chào',
      isRemoved: false,
      ...over,
    }) as ElementSnapshotDto;

  it('chỉ lấy element chữ còn sống, có nội dung, theo zIndex', () => {
    const picked = selectTextElements([
      text({ zIndex: 3, elementType: 'NARRATION_BOX', content: 'Dẫn truyện' }),
      text({ zIndex: 1 }),
      text({ isRemoved: true }),
      text({ content: '   ' }),
      text({ elementType: 'BACKGROUND', content: 'ảnh nền' }),
    ]);
    expect(picked.map((e) => e.content)).toEqual(['Xin chào', 'Dẫn truyện']);
  });

  // Ghi lại lệnh vẽ để kiểm tra màn duyệt/bản xuất dựng đúng như bàn Letterer
  const recorder = () => {
    const calls: string[] = [];
    const texts: { fill: string; text: string; font: string }[] = [];
    const ctx = {
      font: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      textAlign: 'center',
      textBaseline: 'middle',
      lineJoin: 'miter',
      save: () => calls.push('save'),
      restore: () => calls.push('restore'),
      translate: () => undefined,
      rotate: () => undefined,
      fill: () => calls.push(`fill:${ctx.fillStyle}`),
      stroke: () => calls.push(`stroke:${ctx.strokeStyle}:${ctx.lineWidth}`),
      strokeRect: () => calls.push('strokeRect'),
      setLineDash: () => calls.push('setLineDash'),
      measureText: (s: string) => ({ width: Array.from(s).length * 10 }),
      fillText: (s: string) => texts.push({ fill: String(ctx.fillStyle), text: s, font: ctx.font }),
      strokeText: (s: string) => calls.push(`strokeText:${ctx.strokeStyle}:${s}`),
    };
    return { ctx: ctx as unknown as CanvasRenderingContext2D, calls, texts };
  };
  const rect = { x: 0, y: 0, w: 300, h: 200 };

  it('mặc định vẽ oval nền trắng, viền đen; không vẽ khung chọn/đường gióng', () => {
    vi.stubGlobal('Path2D', class {});
    const { ctx, calls } = recorder();
    drawTextElement(ctx, text({}), rect);
    expect(calls).toContain('fill:rgba(255, 255, 255, 1)');
    expect(calls).toContain('stroke:#171717:2.5');
    expect(calls).not.toContain('strokeRect');
    expect(calls).not.toContain('setLineDash');
    vi.unstubAllGlobals();
  });

  it('chữ trắng viền đen trên nền trong suốt: không tô nền trắng, giữ màu chữ và viền chữ', () => {
    vi.stubGlobal('Path2D', class {});
    const { ctx, calls, texts } = recorder();
    drawTextElement(
      ctx,
      text({
        content: 'Chữ trắng',
        style: {
          fontFamily: 'Mali',
          fontSize: 26,
          color: '#FFFFFF',
          strokeColor: '#000000',
          strokeWidth: 2,
        },
      }),
      rect,
      {
        shape: 'oval',
        fillColor: '#FFFFFF',
        fillOpacity: 0,
        borderColor: '#171717',
        borderWidth: 0,
      },
    );
    expect(calls.some((c) => c.startsWith('fill:'))).toBe(false);
    expect(calls.some((c) => c.startsWith('stroke:'))).toBe(false);
    expect(texts.every((t) => t.fill === '#FFFFFF')).toBe(true);
    expect(calls).toContain('strokeText:#000000:Chữ trắng');
    vi.unstubAllGlobals();
  });

  it('nền bán trong suốt và "Chỉ chữ" (không hình bóng)', () => {
    vi.stubGlobal('Path2D', class {});
    const half = recorder();
    drawTextElement(half.ctx, text({}), rect, {
      shape: 'box',
      fillColor: '#FFFBEB',
      fillOpacity: 0.5,
      borderColor: '#171717',
      borderWidth: 2.5,
    });
    expect(half.calls).toContain('fill:rgba(255, 251, 235, 0.5)');

    const none = recorder();
    drawTextElement(
      none.ctx,
      text({}),
      rect,
      resolveAppearance('SPEECH_BALLOON', { shape: 'none' }),
    );
    expect(none.calls.some((c) => c.startsWith('fill:') || c.startsWith('stroke:'))).toBe(false);
    expect(none.texts.map((t) => t.text)).toEqual(['Xin chào']);
    vi.unstubAllGlobals();
  });

  it('cùng cỡ chữ và cách ngắt dòng với bàn Letterer (không tự thu nhỏ), giữ xuống dòng thủ công', () => {
    const content = 'Đêm thứ tư liên tiếp, đèn phòng lab chưa từng tắt.\n72 giờ nữa!';
    const el = text({ content });
    const { ctx, texts } = recorder();
    drawTextElement(ctx, el, rect);
    const expected = layoutText(
      content,
      resolveTextStyle(el),
      'oval',
      300,
      200,
      (s) => Array.from(s).length * 10,
    );
    expect(texts.map((t) => t.text)).toEqual(expected.lines);
    expect(texts[0].font).toBe(expected.font);
    expect(texts.at(-1)!.text).toBe('72 giờ nữa!');
  });

  it('đọc hình bóng đã lưu trong style (giống bàn Letterer và bản xuất BE)', () => {
    vi.stubGlobal('Path2D', class {});
    const { ctx, calls, texts } = recorder();
    drawTextElement(
      ctx,
      text({ style: { fontFamily: 'Mali', fontSize: 26, color: '#FFFFFF', balloonShape: 'none' } }),
      rect,
    );
    expect(calls.some((c) => c.startsWith('fill:') || c.startsWith('stroke:'))).toBe(false);
    expect(texts[0].fill).toBe('#FFFFFF');
    vi.unstubAllGlobals();
  });
});
