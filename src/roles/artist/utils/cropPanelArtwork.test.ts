import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cropPanelArtwork } from './cropPanelArtwork';

describe('cropPanelArtwork', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cắt ảnh thành công và trả về đối tượng File', async () => {
    // Mock canvas context and toBlob
    const mockCtx = {
      drawImage: vi.fn(),
    };
    const mockBlob = new Blob(['mock-data'], { type: 'image/png' });
    const originalCreateElement = document.createElement.bind(document);

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn().mockReturnValue(mockCtx),
          toBlob: (cb: (b: Blob | null) => void) => cb(mockBlob),
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName);
    });

    // Mock Image
    const mockImg = {
      complete: true,
      naturalWidth: 1000,
      naturalHeight: 1500,
      onload: null as any,
      src: '',
    };
    vi.spyOn(globalThis, 'Image').mockImplementation(function (this: any) {
      setTimeout(() => {
        if (mockImg.onload) mockImg.onload();
      }, 0);
      return mockImg as unknown as HTMLImageElement;
    } as any);

    const file = new File(['dummy content'], 'source-page.png', { type: 'image/png' });
    const cropped = await cropPanelArtwork(file, [10, 20, 300, 400], 'panel-1.png');

    expect(cropped).toBeInstanceOf(File);
    expect(cropped.name).toBe('panel-1.png');
    expect(cropped.type).toBe('image/png');
    expect(mockCtx.drawImage).toHaveBeenCalledWith(mockImg, 10, 20, 300, 400, 0, 0, 300, 400);
  });
});
