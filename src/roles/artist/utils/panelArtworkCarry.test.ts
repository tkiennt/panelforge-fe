import { describe, expect, it } from 'vitest';
import type { PanelDto } from '@/types/pipeline';
import type { PanelArtworkData } from '../components/desk/PanelFrameOverlay';
import { mergeResplitArtworks } from './panelArtworkCarry';

const panel = (id: string, n: number): PanelDto =>
  ({ id, pageId: 'p1', panelNumber: n, readingOrder: n, boundingBox: '{}' }) as PanelDto;

const art = (
  id: string,
  panelId: string,
  source: PanelArtworkData['source'] = 'upload',
): PanelArtworkData => ({
  id,
  panelId,
  panelNumber: 1,
  imageUrl: `blob:http://localhost/${id}`,
  fileName: `${id}.png`,
  uploadedAt: '2026-11-26T00:00:00Z',
  source,
});

describe('mergeResplitArtworks', () => {
  const oldPanels = [panel('old1', 1), panel('old2', 2)];
  const newPanels = [panel('new1', 1), panel('new2', 2), panel('new3', 3)];
  const crops = {
    new1: art('crop1', 'new1', 'auto-split'),
    new2: art('crop2', 'new2', 'auto-split'),
    new3: art('crop3', 'new3', 'auto-split'),
  };

  it('uses fresh crops on a first split', () => {
    const r = mergeResplitArtworks(oldPanels, newPanels, {}, crops);
    expect(Object.keys(r.mapped)).toEqual(['new1', 'new2', 'new3']);
    expect(r.mapped.new2.id).toBe('crop2');
    expect(r.discarded).toEqual([]);
  });

  it('replaces previous auto crops with the new ones instead of carrying stale images', () => {
    const previous = {
      old1: art('oldCrop1', 'old1', 'auto-split'),
      old2: art('oldCrop2', 'old2', 'auto-split'),
    };
    const r = mergeResplitArtworks(oldPanels, newPanels, previous, crops);
    expect(Object.values(r.mapped).map((a) => a.id)).toEqual(['crop1', 'crop2', 'crop3']);
    expect(r.discarded.map((a) => a.id)).toEqual(['oldCrop1', 'oldCrop2']);
    expect(r.orphans).toEqual([]);
  });

  it('keeps uploaded artwork in reading order and fills the remaining panels with crops', () => {
    const previous = {
      old1: art('auto', 'old1', 'auto-split'),
      old2: art('drawn', 'old2'),
    };
    const r = mergeResplitArtworks(oldPanels, newPanels, previous, crops);
    // Tranh tự vẽ ở khung cũ 2 sang khung mới 2; ảnh cắt cũ ở khung 1 nhường cho ảnh cắt mới.
    expect(r.mapped.new2.id).toBe('drawn');
    expect(r.mapped.new2.panelId).toBe('new2');
    expect(r.mapped.new1.id).toBe('crop1');
    expect(r.mapped.new3.id).toBe('crop3');
    expect(r.discarded.map((a) => a.id).sort()).toEqual(['auto', 'crop2']);
  });

  it('keeps each uploaded artwork at the same reading position, leaving gaps empty', () => {
    const previous = { old2: art('second', 'old2') }; // khung cũ 1 trống, khung cũ 2 có tranh
    const r = mergeResplitArtworks(oldPanels, newPanels, previous, crops);
    expect(r.mapped.new2.id).toBe('second'); // không dồn lên khung 1
    expect(r.mapped.new1.id).toBe('crop1');
    expect(r.mapped.new3.id).toBe('crop3');
  });

  it('sends uploaded artwork that no longer fits to page history', () => {
    const previous = { old1: art('a1', 'old1'), old2: art('a2', 'old2') };
    const r = mergeResplitArtworks(oldPanels, [panel('only', 1)], previous, {}, [
      art('older', 'x'),
    ]);
    expect(r.mapped.only.id).toBe('a1');
    expect(r.orphans.map((a) => a.id)).toEqual(['older', 'a2']);
  });
});
