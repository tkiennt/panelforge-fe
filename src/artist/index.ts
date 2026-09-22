/**
 * PanelForge Artist Module
 * Quản lý tính năng của Role Artist: Bàn vẽ Genga, Thumbnail, Upload 600 DPI, Quản lý trang & Canvas
 * Kết nối trực tiếp với Backend PagesController
 */
export {
  pageService,
  type PageDto,
  type PageDetailDto,
  type CreatePageRequestBody,
  type UpdateCanvasRequestBody,
  MOCK_PAGES,
} from '../services/page.service';

export { ArtistDeskView } from '../views/artist';
