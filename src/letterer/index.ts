/**
 * PanelForge Letterer Module
 * Quản lý tính năng của Role Letterer: Đặt bóng thoại, Typographic Presets, SFX, Canvas Layout
 * Kết nối trực tiếp với Backend ElementsController (Marten Append-Only Event Store)
 */
export {
  elementService,
  type ElementSnapshotDto,
  type PageSnapshotDto,
  type AddElementRequest,
  type MoveElementRequest,
  MOCK_ELEMENTS,
} from '../services/element.service';

export { LettererCanvasView } from '../views/letterer';
