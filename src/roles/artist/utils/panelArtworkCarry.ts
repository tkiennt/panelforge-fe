import type { PanelDto } from '@/types/pipeline';
import type { PanelArtworkData } from '../components/desk/PanelFrameOverlay';

const byReadingOrder = (panels: PanelDto[]) =>
  [...panels].sort((a, b) => (a.readingOrder || a.panelNumber) - (b.readingOrder || b.panelNumber));

/**
 * Chuyển tranh từ bố cục cũ sang bố cục mới theo thứ tự đọc: tranh ở khung cũ thứ N sang khung
 * mới thứ N (giữ vị trí, khung cũ trống thì khung mới cùng vị trí cũng trống). Tranh ở khung cũ
 * không còn khung mới tương ứng được giữ trong lịch sử trang (orphans).
 */
export function carryArtworksByReadingOrder(
  oldPanels: PanelDto[],
  newPanels: PanelDto[],
  artworks: Record<string, PanelArtworkData>,
  existingOrphans: PanelArtworkData[] = [],
): { mapped: Record<string, PanelArtworkData>; orphans: PanelArtworkData[] } {
  const orderedTargets = byReadingOrder(newPanels);
  const mapped: Record<string, PanelArtworkData> = {};
  const orphans = [...existingOrphans];

  byReadingOrder(oldPanels).forEach((panel, index) => {
    const artwork = artworks[panel.id];
    if (!artwork) return;
    const target = orderedTargets[index];
    if (!target) {
      orphans.push(artwork);
      return;
    }
    mapped[target.id] = {
      ...artwork,
      panelId: target.id,
      panelNumber: target.panelNumber || target.readingOrder || index + 1,
    };
  });

  return { mapped, orphans };
}

/**
 * Gộp kết quả tách lại từ ảnh phác thảo:
 * - Tranh người dùng tải lên vẫn được chuyển theo thứ tự đọc (như hộp thoại tách lại cam kết).
 * - Khung mới chưa nhận tranh nào thì dùng ảnh vừa cắt.
 * - Ảnh cắt tự động của lần tách trước bị bỏ (trả về trong `discarded` để giải phóng URL).
 */
export function mergeResplitArtworks(
  oldPanels: PanelDto[],
  newPanels: PanelDto[],
  previousArtworks: Record<string, PanelArtworkData>,
  croppedArtworks: Record<string, PanelArtworkData>,
  existingOrphans: PanelArtworkData[] = [],
): {
  mapped: Record<string, PanelArtworkData>;
  orphans: PanelArtworkData[];
  discarded: PanelArtworkData[];
} {
  const uploaded: Record<string, PanelArtworkData> = {};
  const discarded: PanelArtworkData[] = [];
  Object.entries(previousArtworks).forEach(([panelId, artwork]) => {
    if (artwork.source === 'auto-split') discarded.push(artwork);
    else uploaded[panelId] = artwork;
  });

  const carried = carryArtworksByReadingOrder(oldPanels, newPanels, uploaded, existingOrphans);
  const mapped = { ...carried.mapped };
  Object.entries(croppedArtworks).forEach(([panelId, artwork]) => {
    if (mapped[panelId]) discarded.push(artwork);
    else mapped[panelId] = artwork;
  });

  return { mapped, orphans: carried.orphans, discarded };
}

/** Giải phóng object URL của các ảnh không còn dùng. */
export function revokeArtworkUrls(artworks: PanelArtworkData[]): void {
  artworks.forEach((artwork) => {
    if (artwork.imageUrl.startsWith('blob:')) URL.revokeObjectURL(artwork.imageUrl);
  });
}
