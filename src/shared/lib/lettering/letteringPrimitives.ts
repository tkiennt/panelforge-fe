export const LETTERING_FONT_PX = 26;
export const LETTERING_CHAR_WIDTH_EM = 0.55;
export const LETTERING_LINE_HEIGHT_EM = 1.3;
export const LETTERING_PADDING_PX = 12;
export const MIN_LETTERING_FONT_PX = 14;

/** Sinh SVG path cho bóng hét / SFX mạnh (spiky polygon / bóng răng cưa). */
export function createShoutBalloonPath(w: number, h: number): string {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const spikes = 18;
  let d = '';

  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i * Math.PI) / spikes;
    const isOuter = i % 2 === 0;
    const factor = isOuter ? 1.05 : 0.82;
    const px = cx + rx * factor * Math.cos(angle);
    const py = cy + ry * factor * Math.sin(angle);
    if (i === 0) d += `M ${px},${py}`;
    else d += ` L ${px},${py}`;
  }
  d += ' Z';
  return d;
}
