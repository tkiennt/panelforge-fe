import type { PanelDto } from '@/types/pipeline';

export interface SplitPanelDeps {
  updateCoordinates: (
    panelId: string,
    data: { boundingBox: string; readingOrder?: number },
  ) => Promise<PanelDto>;
  createPanel: (
    pageId: string,
    data: { panelNumber?: number; readingOrder?: number; boundingBox?: string },
  ) => Promise<PanelDto>;
}

export interface SplitPanelArgs {
  panel: Pick<PanelDto, 'id' | 'readingOrder' | 'boundingBox'>;
  pageId: string;
  firstBox: string;
  secondBox: string;
  newPanelNumber: number;
  newReadingOrder: number;
}

/**
 * Chia đôi khung trên máy chủ: (1) PUT thu khung gốc về nửa đầu, (2) POST tạo khung ở nửa sau.
 * Hai lời gọi không nguyên tử: nếu (2) lỗi thì PUT trả khung gốc về kích thước cũ rồi ném lại lỗi
 * của BE, không để lại nửa khung trống.
 */
export async function splitPanelWithRollback(
  deps: SplitPanelDeps,
  args: SplitPanelArgs,
): Promise<{ updated: PanelDto; created: PanelDto }> {
  const { panel } = args;
  const updated = await deps.updateCoordinates(panel.id, {
    boundingBox: args.firstBox,
    readingOrder: panel.readingOrder,
  });
  try {
    const created = await deps.createPanel(args.pageId, {
      panelNumber: args.newPanelNumber,
      readingOrder: args.newReadingOrder,
      boundingBox: args.secondBox,
    });
    return { updated, created };
  } catch (err) {
    try {
      await deps.updateCoordinates(panel.id, {
        boundingBox: panel.boundingBox ?? '',
        readingOrder: panel.readingOrder,
      });
    } catch {
      /* hoàn tác thất bại: vẫn báo lỗi gốc của lần tạo */
    }
    throw err;
  }
}
