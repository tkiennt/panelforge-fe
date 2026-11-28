// Ảnh mẫu (SVG sinh bằng code) cho chế độ dữ liệu mẫu của khu độc giả: bìa truyện, bìa chương, trang truyện.
// Trả về data URI dạng utf8 (không base64) để khung đọc vẫn nối được `?lang=` mà ảnh không hỏng.

export interface ArtPalette {
  /** Màu nền chủ đạo. */
  base: string;
  /** Màu nhấn. */
  accent: string;
  /** Màu mực / chữ. */
  ink: string;
}

const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * `lang` được ghi vào chú thích cuối SVG: `ChapterReaderModal` thấy `?lang=` đã có trong URL nên không
 * nối thêm (nối thêm sẽ thành nội dung rác sau thẻ đóng </svg>).
 */
function toDataUri(svg: string, lang = 'vi'): string {
  const compact = svg.replace(/\s{2,}/g, ' ').replace(/\n/g, '');
  const encoded = compact.replace(/%/g, '%25').replace(/#/g, '%23');
  return `data:image/svg+xml;utf8,${encoded}<!--?lang=${lang}-->`;
}

/** Bộ sinh số giả ngẫu nhiên có hạt giống: cùng truyện / trang luôn ra cùng một hình. */
function seeded(seedText: string) {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

function wrapTitle(title: string, maxChars: number): string[] {
  const words = title.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

/** Hình nhân vật cách điệu (đầu + vai) — dùng chung cho bìa và trang. */
function figure(cx: number, cy: number, scale: number, fill: string, stroke: string): string {
  const r = 34 * scale;
  return `
    <g>
      <path d="M ${cx - 70 * scale} ${cy + 150 * scale} Q ${cx} ${cy + 40 * scale} ${cx + 70 * scale} ${cy + 150 * scale} Z" fill="${fill}" stroke="${stroke}" stroke-width="${3 * scale}"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${3 * scale}"/>
      <path d="M ${cx - r} ${cy - 4 * scale} Q ${cx - r * 0.2} ${cy - r * 1.6} ${cx + r * 1.1} ${cy - r * 0.3} L ${cx + r * 0.4} ${cy - r * 0.6} L ${cx + r * 0.1} ${cy - r * 0.1} L ${cx - r * 0.3} ${cy - r * 0.55} Z" fill="${stroke}"/>
      <circle cx="${cx - r * 0.35}" cy="${cy + r * 0.05}" r="${3.2 * scale}" fill="${stroke}"/>
      <circle cx="${cx + r * 0.35}" cy="${cy + r * 0.05}" r="${3.2 * scale}" fill="${stroke}"/>
    </g>`;
}

function speedLines(rand: () => number, w: number, h: number, color: string, count: number) {
  const cx = w / 2;
  const cy = h / 2;
  let out = '';
  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2;
    const inner = 0.25 + rand() * 0.2;
    const x1 = cx + Math.cos(angle) * w * inner;
    const y1 = cy + Math.sin(angle) * h * inner;
    const x2 = cx + Math.cos(angle) * w;
    const y2 = cy + Math.sin(angle) * h;
    out += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${(0.6 + rand() * 1.6).toFixed(2)}" opacity="0.55"/>`;
  }
  return out;
}

/** Bìa truyện tỉ lệ 3:4. */
export function makeSeriesCover(seriesKey: string, title: string, palette: ArtPalette): string {
  const rand = seeded(seriesKey);
  const w = 600;
  const h = 800;
  const lines = wrapTitle(title.toUpperCase(), 14);
  const titleY = h - 70 - (lines.length - 1) * 58;
  const sun = 140 + rand() * 80;
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${palette.base}"/>
        <stop offset="1" stop-color="${palette.ink}"/>
      </linearGradient>
      <pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse">
        <circle cx="7" cy="7" r="2" fill="${palette.ink}" opacity="0.18"/>
      </pattern>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <rect width="${w}" height="${h}" fill="url(#dots)"/>
    <circle cx="${w * (0.3 + rand() * 0.4)}" cy="${h * 0.32}" r="${sun}" fill="${palette.accent}" opacity="0.9"/>
    ${speedLines(rand, w, h * 0.8, '#ffffff', 36)}
    ${figure(w / 2, h * 0.42, 1.9, palette.base, palette.ink)}
    <rect x="0" y="${h - 230 - (lines.length - 1) * 58}" width="${w}" height="${260 + (lines.length - 1) * 58}" fill="${palette.ink}" opacity="0.55"/>
    ${lines
      .map(
        (line, i) =>
          `<text x="40" y="${titleY + i * 58}" font-family="Georgia, serif" font-size="52" font-weight="700" fill="#ffffff" letter-spacing="1">${escapeXml(line)}</text>`,
      )
      .join('')}
    <rect x="40" y="${h - 46}" width="120" height="6" fill="${palette.accent}"/>
  </svg>`;
  return toDataUri(svg);
}

/** Bìa chương ngang 16:9 (ảnh nhỏ trong danh sách chương). */
export function makeChapterCover(
  seriesKey: string,
  chapterNumber: number,
  palette: ArtPalette,
): string {
  const rand = seeded(`${seriesKey}-c${chapterNumber}`);
  const w = 480;
  const h = 270;
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    <rect width="${w}" height="${h}" fill="${palette.base}"/>
    ${speedLines(rand, w, h, palette.ink, 26)}
    <circle cx="${w * (0.2 + rand() * 0.6)}" cy="${h * 0.45}" r="${60 + rand() * 40}" fill="${palette.accent}" opacity="0.85"/>
    ${figure(w * (0.35 + rand() * 0.3), h * 0.38, 0.9, '#ffffff', palette.ink)}
    <rect x="16" y="${h - 56}" width="92" height="40" rx="8" fill="${palette.ink}"/>
    <text x="62" y="${h - 29}" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#ffffff" text-anchor="middle">#${chapterNumber}</text>
  </svg>`;
  return toDataUri(svg);
}

interface PanelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const PAGE_LAYOUTS: PanelRect[][] = [
  [
    { x: 0, y: 0, w: 1, h: 0.38 },
    { x: 0, y: 0.38, w: 0.5, h: 0.32 },
    { x: 0.5, y: 0.38, w: 0.5, h: 0.32 },
    { x: 0, y: 0.7, w: 1, h: 0.3 },
  ],
  [
    { x: 0, y: 0, w: 0.6, h: 0.5 },
    { x: 0.6, y: 0, w: 0.4, h: 0.5 },
    { x: 0, y: 0.5, w: 1, h: 0.5 },
  ],
  [
    { x: 0, y: 0, w: 1, h: 0.25 },
    { x: 0, y: 0.25, w: 0.33, h: 0.4 },
    { x: 0.33, y: 0.25, w: 0.34, h: 0.4 },
    { x: 0.67, y: 0.25, w: 0.33, h: 0.4 },
    { x: 0, y: 0.65, w: 1, h: 0.35 },
  ],
  [
    { x: 0, y: 0, w: 0.45, h: 1 },
    { x: 0.45, y: 0, w: 0.55, h: 0.5 },
    { x: 0.45, y: 0.5, w: 0.55, h: 0.5 },
  ],
];

const LINES_VI = [
  'Chạy đi!',
  'Không thể nào...',
  'Tớ sẽ không bỏ cuộc!',
  'Ai đó?',
  'Đây mới là sức mạnh thật sự.',
  'Hứa với tớ nhé.',
  'BÙM!',
  'Đợi đã!',
  'Cậu đến muộn rồi.',
  'Bắt đầu thôi.',
];
const LINES_EN = [
  'Run!',
  'No way...',
  "I won't give up!",
  "Who's there?",
  'This is real power.',
  'Promise me.',
  'BOOM!',
  'Wait!',
  "You're late.",
  "Let's begin.",
];

/**
 * Trang truyện. Webtoon: khổ dọc dài 1 cột; Manga/Comic: khổ trang 2:3 chia khung.
 * `lang` đổi chữ trong bóng thoại để thấy được khác biệt giữa ấn bản VI và EN.
 */
export function makePage(
  seriesKey: string,
  chapterNumber: number,
  pageNumber: number,
  palette: ArtPalette,
  opts: { vertical: boolean; lang: string },
): string {
  const rand = seeded(`${seriesKey}-c${chapterNumber}-p${pageNumber}`);
  const lines = opts.lang === 'en' ? LINES_EN : LINES_VI;
  const w = 800;
  const h = opts.vertical ? 1400 : 1200;
  const margin = 36;
  const gutter = 16;
  const layout = opts.vertical
    ? [
        { x: 0, y: 0, w: 1, h: 0.45 },
        { x: 0, y: 0.45, w: 1, h: 0.55 },
      ]
    : PAGE_LAYOUTS[Math.floor(rand() * PAGE_LAYOUTS.length)];
  const innerW = w - margin * 2;
  const innerH = h - margin * 2 - 40;

  const panels = layout
    .map((p, i) => {
      const x = margin + p.x * innerW + gutter / 2;
      const y = margin + p.y * innerH + gutter / 2;
      const pw = p.w * innerW - gutter;
      const ph = p.h * innerH - gutter;
      const tone = i % 2 === 0 ? palette.base : '#ffffff';
      const id = `c${i}`;
      const showFigure = rand() > 0.25;
      const bubbleText = lines[Math.floor(rand() * lines.length)];
      const bx = x + 20 + rand() * Math.max(10, pw - 260);
      const by = y + 22 + rand() * 30;
      const bubbleW = Math.min(240, Math.max(120, bubbleText.length * 11 + 40));
      return `
      <clipPath id="${id}"><rect x="${x}" y="${y}" width="${pw}" height="${ph}"/></clipPath>
      <g clip-path="url(#${id})">
        <rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="${tone}"/>
        <g transform="translate(${x} ${y})">${speedLines(rand, pw, ph, palette.ink, rand() > 0.5 ? 30 : 10)}</g>
        ${rand() > 0.5 ? `<circle cx="${x + pw * rand()}" cy="${y + ph * 0.4}" r="${40 + rand() * 70}" fill="${palette.accent}" opacity="0.75"/>` : ''}
        ${showFigure ? figure(x + pw * (0.3 + rand() * 0.4), y + ph * 0.55, Math.min(pw, ph) / 260, '#ffffff', palette.ink) : ''}
      </g>
      <rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="none" stroke="#111111" stroke-width="5"/>
      <g>
        <ellipse cx="${bx + bubbleW / 2}" cy="${by + 30}" rx="${bubbleW / 2}" ry="30" fill="#ffffff" stroke="#111111" stroke-width="3"/>
        <path d="M ${bx + bubbleW / 2 - 10} ${by + 56} L ${bx + bubbleW / 2 + 6} ${by + 82} L ${bx + bubbleW / 2 + 14} ${by + 54} Z" fill="#ffffff" stroke="#111111" stroke-width="3"/>
        <text x="${bx + bubbleW / 2}" y="${by + 37}" font-family="'Comic Sans MS', 'Patrick Hand', cursive" font-size="20" text-anchor="middle" fill="#111111">${escapeXml(bubbleText)}</text>
      </g>`;
    })
    .join('');

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    <rect width="${w}" height="${h}" fill="#fdfcf8"/>
    ${panels}
    <text x="${w / 2}" y="${h - 22}" font-family="Arial, sans-serif" font-size="18" fill="#78716c" text-anchor="middle">${pageNumber}</text>
  </svg>`;
  return toDataUri(svg, opts.lang);
}
