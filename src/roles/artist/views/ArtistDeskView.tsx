import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Layers,
  Plus,
  Trash2,
  Settings,
  FileImage,
  RefreshCw,
  CheckCircle2,
  X,
  Layout,
  Sparkles,
  KanbanSquare,
  Clock,
  ArrowRight,
  BookOpen,
  ShieldAlert,
  LayoutTemplate,
  CheckSquare,
  Square,
  MessageSquare,
  Move,
  Film,
  Edit3,
  Upload,
  ImageIcon,
  RotateCw,
  ArrowUp,
  ArrowDown,
  User,
  Mountain,
  Package,
  Zap,
  Palette,
} from 'lucide-react';
import { pageService, PageDto, PageDetailDto } from '@/services/page.service';
import { chapterService, ChapterDto } from '@/services/chapter.service';
import { panelService } from '@/services/panel.service';
import { PanelDto, PanelDetailDto } from '@/types/pipeline';
import {
  elementService,
  ElementSnapshotDto,
  IMAGE_LAYER_TYPES,
  ImageLayerType,
  LAYER_LABELS,
  AddElementRequest,
} from '@/services/element.service';
import { bibleService, BibleEntryDto } from '@/services/bible.service';
import { FrameTemplateModal } from '@/roles/artist/modals/FrameTemplateModal';
import { OfflineStatusBanner } from '@/shared/components/OfflineStatusBanner';
import { offlineQueueService } from '@/services/offlineQueue.service';
import {
  scriptLineService,
  SceneDto,
  SceneScriptLineSummaryDto,
} from '@/services/scriptLine.service';
import { artworkService, computeFileSha256, resolveArtworkUrl } from '@/services/artwork.service';
import type { AssetReferenceDto } from '@/types';
import { normalizeWorkspaceRole } from '@/types/auth';
import {
  ParsedBoundingBox,
  parseBoundingBox,
  buildBoundingBoxJson,
} from '../utils/panelBoundingBox';

interface ArtistDeskViewProps {
  workspaceRole?: string | null;
}

export const ArtistDeskView: React.FC<ArtistDeskViewProps> = ({ workspaceRole }) => {
  const { workspaceId, seriesId } = useParams<{ workspaceId?: string; seriesId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const chapterIdFromUrl = searchParams.get('chapterId');

  const [activeTab, setActiveTab] = useState<'pages' | 'queue'>('pages');
  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(chapterIdFromUrl || null);
  const [loadingChapters, setLoadingChapters] = useState(false);

  // Quyền ghi Page (Breaking 152): Chỉ Producer và Artist được ghi (tạo/sửa canvas/xoá)
  const normRole = workspaceRole ? normalizeWorkspaceRole(workspaceRole) : null;
  const canEditPages = !normRole || normRole === 'PRODUCER' || normRole === 'ARTIST';

  // Tasks Queue Data
  const [tasks] = useState([
    {
      id: 'a-1',
      entityType: 'Page',
      targetEntityId: 'p-1',
      pipelineStageId: 'Thumbnail',
      brief: 'Draw rough thumbnails for Page 1',
      status: 'Assigned',
      dueDate: '2026-10-01',
    },
    {
      id: 'a-2',
      entityType: 'Page',
      targetEntityId: 'p-2',
      pipelineStageId: 'Pencil',
      brief: 'Pencil line art for Page 2',
      status: 'InProgress',
      dueDate: '2026-10-02',
    },
    {
      id: 'a-3',
      entityType: 'Page',
      targetEntityId: 'p-3',
      pipelineStageId: 'Ink',
      brief: 'Ink Page 3 based on approved pencils',
      status: 'Assigned',
      dueDate: '2026-10-03',
    },
    {
      id: 'a-4',
      entityType: 'Page',
      targetEntityId: 'p-4',
      pipelineStageId: 'Color',
      brief: 'Flat and shade Page 4',
      status: 'Assigned',
      dueDate: '2026-10-04',
    },
  ]);

  const [pages, setPages] = useState<PageDto[]>([]);
  const [selectedPage, setSelectedPage] = useState<PageDto | null>(null);
  const [pageDetail, setPageDetail] = useState<PageDetailDto | null>(null);
  const [loading, setLoading] = useState(false);

  // Panels on the selected page
  const [panels, setPanels] = useState<PanelDto[]>([]);
  const [loadingPanels, setLoadingPanels] = useState(false);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [selectedPanelDetail, setSelectedPanelDetail] = useState<PanelDetailDto | null>(null);

  // Scenes & Script lines in current chapter
  const [scenes, setScenes] = useState<SceneDto[]>([]);
  const [sceneLines, setSceneLines] = useState<SceneScriptLineSummaryDto[]>([]);
  const [loadingSceneLines, setLoadingSceneLines] = useState(false);

  // Panel Coordinates Edit State
  const [panelBoxX, setPanelBoxX] = useState(10);
  const [panelBoxY, setPanelBoxY] = useState(10);
  const [panelBoxW, setPanelBoxW] = useState(80);
  const [panelBoxH, setPanelBoxH] = useState(35);
  const [panelReadingOrder, setPanelReadingOrder] = useState(1);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [frameTemplateModalOpen, setFrameTemplateModalOpen] = useState(false);
  const [newPageNumber, setNewPageNumber] = useState(1);
  const [newLayoutFormat, setNewLayoutFormat] = useState('StandardPage');
  const [newWidthPx, setNewWidthPx] = useState('1200');
  const [newHeightPx, setNewHeightPx] = useState('1800');
  const [newDpi, setNewDpi] = useState('600');

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [editWidthPx, setEditWidthPx] = useState('1200');
  const [editHeightPx, setEditHeightPx] = useState('1800');
  const [editDpi, setEditDpi] = useState('600');
  const [editLayout, setEditLayout] = useState('StandardPage');

  // Quản lý Artwork của Page và Panel
  const [pageArtworks, setPageArtworks] = useState<AssetReferenceDto[]>([]);
  const [panelArtworkUrls, setPanelArtworkUrls] = useState<Record<string, string>>({});
  const panelFileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadingPanelId, setUploadingPanelId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ title: string; desc: string } | null>(null);

  const showToast = (title: string, desc: string) => {
    setToast({ title, desc });
    setTimeout(() => setToast(null), 3500);
  };

  // Quản lý Layers & Element ảnh trên Canvas (CF2 / BR-11)
  const [pageElements, setPageElements] = useState<ElementSnapshotDto[]>([]);
  const [loadingElements, setLoadingElements] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<'panel' | 'layers'>('panel');
  const [bibleEntries, setBibleEntries] = useState<BibleEntryDto[]>([]);
  const [createLayerModalOpen, setCreateLayerModalOpen] = useState(false);

  // Form tạo layer mới
  const [newLayerType, setNewLayerType] = useState<ImageLayerType>('CHARACTER_INSTANCE');
  const [newLayerPanelId, setNewLayerPanelId] = useState<string>('');
  const [newLayerBibleEntryId, setNewLayerBibleEntryId] = useState<string>('');
  const [newLayerRotation, setNewLayerRotation] = useState<number>(0);
  const [newLayerX, setNewLayerX] = useState<number>(100);
  const [newLayerY, setNewLayerY] = useState<number>(100);
  const [newLayerWidth, setNewLayerWidth] = useState<number>(300);
  const [newLayerHeight, setNewLayerHeight] = useState<number>(400);
  const [newLayerAssetId, setNewLayerAssetId] = useState<string>('');
  const [newLayerContent, setNewLayerContent] = useState<string>('');

  const loadPageArtworks = useCallback(
    async (chapId: string, pId: string) => {
      try {
        const arts = await artworkService.getArtworks(chapId, pId);
        setPageArtworks(arts);
        for (const a of arts) {
          if (!panelArtworkUrls[a.id]) {
            artworkService
              .getArtworkAccessLink(chapId, a.id)
              .then((res) => {
                setPanelArtworkUrls((prev) => ({ ...prev, [a.id]: resolveArtworkUrl(res.url) }));
              })
              .catch(() => undefined);
          }
        }
      } catch {
        // ignore
      }
    },
    [panelArtworkUrls],
  );

  const handleTriggerUploadPanel = (panelId: string) => {
    setUploadingPanelId(panelId);
    panelFileInputRef.current?.click();
  };

  const handlePanelFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentChapterId || !selectedPage || !uploadingPanelId) return;
    try {
      showToast('Đang xử lý', 'Đang tính mã SHA-256 cho ảnh panel...');
      const sha256 = await computeFileSha256(file);
      showToast('Đang tải lên', 'Đang tải artwork cho khung panel...');
      const res = await artworkService.uploadArtwork(
        currentChapterId,
        selectedPage.id,
        file,
        'Thumbnail',
        sha256,
        undefined,
        uploadingPanelId,
      );
      showToast('Thành công', `Đã tải artwork v${res.versionNumber} cho khung panel!`);
      await loadPageArtworks(currentChapterId, selectedPage.id);
    } catch (err: any) {
      showToast('Lỗi tải ảnh', err.message || 'Không thể tải ảnh cho khung panel');
    } finally {
      if (panelFileInputRef.current) panelFileInputRef.current.value = '';
      setUploadingPanelId(null);
    }
  };

  // Nạp danh sách Chapter thật của Series
  useEffect(() => {
    if (!seriesId) return;
    let isMounted = true;
    setLoadingChapters(true);
    chapterService
      .getChaptersBySeries(seriesId, 1, 50)
      .then((res) => {
        if (!isMounted) return;
        setChapters(res.items);
        if (res.items.length > 0) {
          const matched = res.items.find((c) => c.id === chapterIdFromUrl);
          const chosenId = matched ? matched.id : res.items[0].id;
          setCurrentChapterId(chosenId);
        }
      })
      .catch((err) => {
        console.error('Không thể nạp chapters cho ArtistDesk:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingChapters(false);
      });

    return () => {
      isMounted = false;
    };
  }, [seriesId, chapterIdFromUrl]);

  // Nạp danh sách Scenes của Chapter (V1.2 / CF2)
  useEffect(() => {
    if (!currentChapterId) {
      setScenes([]);
      return;
    }
    scriptLineService
      .getScenesByChapter(currentChapterId)
      .then((data) => setScenes(data))
      .catch((err) => console.error('Lỗi nạp scenes cho chapter:', err));
  }, [currentChapterId]);

  // Nạp Series Bible (Nhân vật, Bối cảnh, Đạo cụ...) cho Series
  useEffect(() => {
    if (!seriesId) return;
    bibleService
      .getSeriesBible(seriesId)
      .then((res) => {
        setBibleEntries(res.entries || []);
      })
      .catch((err) => console.warn('Lỗi nạp series bible:', err));
  }, [seriesId]);

  // Nạp danh sách Elements / Layers của Trang
  const loadElements = useCallback(async (pageId: string) => {
    setLoadingElements(true);
    try {
      const snap = await elementService.getPageSnapshot(pageId);
      setPageElements(snap.elements || []);
    } catch (err: any) {
      console.warn('Lỗi tải elements của trang:', err);
    } finally {
      setLoadingElements(false);
    }
  }, []);

  // Nạp danh sách Panels của Trang được chọn
  const loadPanels = useCallback(async (pageId: string) => {
    setLoadingPanels(true);
    try {
      const data = await panelService.getPanelsByPage(pageId);
      setPanels(data);
      if (data.length > 0) {
        setSelectedPanelId(data[0].id);
      } else {
        setSelectedPanelId(null);
        setSelectedPanelDetail(null);
      }
    } catch (err: any) {
      console.error('Lỗi tải panels của trang:', err);
    } finally {
      setLoadingPanels(false);
    }
  }, []);

  const loadPages = useCallback(async () => {
    if (!currentChapterId) {
      setPages([]);
      setSelectedPage(null);
      setPanels([]);
      setPageElements([]);
      return;
    }
    setLoading(true);
    try {
      const list = await pageService.getPagesByChapter(currentChapterId);
      if (list && list.length > 0) {
        setPages(list);
        const sel = list.find((p) => p.id === selectedPage?.id) || list[0];
        setSelectedPage(sel);
        const detail = await pageService.getPageById(sel.id);
        setPageDetail(detail);
        setNewPageNumber(list.length + 1);
        await Promise.all([
          loadPanels(sel.id),
          loadElements(sel.id),
          loadPageArtworks(currentChapterId, sel.id),
        ]);
      } else {
        setPages([]);
        setSelectedPage(null);
        setPageDetail(null);
        setPanels([]);
        setPageElements([]);
        setPageArtworks([]);
        setNewPageNumber(1);
      }
    } catch (err: any) {
      console.error('Lỗi nạp pages cho chapter:', err);
      showToast('Lỗi nạp trang', err.message || 'Không thể tải danh sách trang');
    } finally {
      setLoading(false);
    }
  }, [currentChapterId, loadPanels, loadElements, loadPageArtworks, selectedPage?.id]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const handleSelectPage = async (p: PageDto) => {
    setSelectedPage(p);
    try {
      const detail = await pageService.getPageById(p.id);
      setPageDetail(detail);
      if (currentChapterId) {
        await Promise.all([
          loadPanels(p.id),
          loadElements(p.id),
          loadPageArtworks(currentChapterId, p.id),
        ]);
      } else {
        await Promise.all([loadPanels(p.id), loadElements(p.id)]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Thao tác với Layer Ảnh (CF2 / BR-11)
  const handleCreateLayer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedPage) return;
    const clientElementId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `elem-${Date.now()}`;

    const req: AddElementRequest = {
      elementType: newLayerType,
      x: Number(newLayerX),
      y: Number(newLayerY),
      width: Number(newLayerWidth),
      height: Number(newLayerHeight),
      zIndex: pageElements.length + 1,
      content: newLayerContent || undefined,
      assetId: newLayerAssetId || undefined,
      panelId: newLayerPanelId || undefined,
      rotation: Number(newLayerRotation) || 0,
      bibleEntryId: newLayerBibleEntryId || undefined,
      clientElementId,
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      offlineQueueService.enqueue({
        type: 'ADD_ELEMENT',
        endpoint: `/pages/${selectedPage.id}/elements`,
        method: 'POST',
        payload: req,
        clientRefId: clientElementId,
      });
      const tempItem: ElementSnapshotDto = {
        elementId: clientElementId,
        elementType: newLayerType,
        x: req.x,
        y: req.y,
        width: req.width,
        height: req.height,
        zIndex: req.zIndex,
        content: req.content,
        assetId: req.assetId,
        panelId: req.panelId,
        rotation: req.rotation,
        bibleEntryId: req.bibleEntryId,
        isRemoved: false,
        version: 1,
      };
      setPageElements((prev) => [...prev, tempItem]);
      setSelectedElementId(tempItem.elementId);
      setCreateLayerModalOpen(false);
      showToast('Đã lưu ngoại tuyến', 'Layer đã được lưu tạm trên máy (NFR-09).');
      return;
    }

    try {
      const res = await elementService.addElement(selectedPage.id, req);
      const newItem: ElementSnapshotDto = {
        elementId: res.elementId,
        elementType: res.elementType,
        x: req.x,
        y: req.y,
        width: req.width,
        height: req.height,
        zIndex: req.zIndex,
        content: req.content,
        assetId: res.assetId || req.assetId,
        panelId: res.panelId || req.panelId,
        rotation: res.rotation != null ? res.rotation : req.rotation,
        bibleEntryId: res.bibleEntryId || req.bibleEntryId,
        isRemoved: false,
        version: 1,
      };
      setPageElements((prev) => [...prev, newItem]);
      setSelectedElementId(newItem.elementId);
      setCreateLayerModalOpen(false);
      showToast('Thành công', `Đã thêm layer ${LAYER_LABELS[newLayerType] || newLayerType}!`);
    } catch (err: any) {
      showToast('Thất bại', err.message || 'Không thể tạo layer ảnh');
    }
  };

  const handleRotateLayer = async (elem: ElementSnapshotDto, deltaDeg: number) => {
    if (!selectedPage) return;
    const newRotation = ((((elem.rotation || 0) + deltaDeg) % 360) + 360) % 360;
    try {
      await elementService.moveElement(selectedPage.id, elem.elementId, {
        newX: elem.x,
        newY: elem.y,
        newWidth: elem.width,
        newHeight: elem.height,
        expectedElementVersion: elem.version,
        newRotation,
        newZIndex: elem.zIndex,
      });
      setPageElements((prev) =>
        prev.map((el) =>
          el.elementId === elem.elementId
            ? { ...el, rotation: newRotation, version: (el.version || 1) + 1 }
            : el,
        ),
      );
      showToast('Xoay layer', `Đã xoay layer sang ${newRotation}°`);
    } catch (err: any) {
      showToast('Lỗi xoay layer', err.message);
    }
  };

  const handleChangeLayerZIndex = async (elem: ElementSnapshotDto, deltaZ: number) => {
    if (!selectedPage) return;
    const newZIndex = Math.max(1, elem.zIndex + deltaZ);
    try {
      await elementService.moveElement(selectedPage.id, elem.elementId, {
        newX: elem.x,
        newY: elem.y,
        newWidth: elem.width,
        newHeight: elem.height,
        expectedElementVersion: elem.version,
        newRotation: elem.rotation || 0,
        newZIndex,
      });
      setPageElements((prev) =>
        prev.map((el) =>
          el.elementId === elem.elementId
            ? { ...el, zIndex: newZIndex, version: (el.version || 1) + 1 }
            : el,
        ),
      );
      showToast('Đổi thứ tự lớp', `Đã đổi zIndex sang ${newZIndex}`);
    } catch (err: any) {
      showToast('Lỗi đổi lớp', err.message);
    }
  };

  const handleDeleteLayer = async (elem: ElementSnapshotDto) => {
    if (!selectedPage) return;
    try {
      await elementService.removeElement(selectedPage.id, elem.elementId, elem.version);
      setPageElements((prev) => prev.filter((el) => el.elementId !== elem.elementId));
      if (selectedElementId === elem.elementId) setSelectedElementId(null);
      showToast('Đã xoá layer', 'Đã xoá layer thành công.');
    } catch (err: any) {
      showToast('Lỗi xoá layer', err.message);
    }
  };

  // Khi chọn một Panel, nạp chi tiết PanelDetailDto và danh sách script lines
  useEffect(() => {
    if (!selectedPanelId) {
      setSelectedPanelDetail(null);
      setSceneLines([]);
      return;
    }
    panelService
      .getPanelById(selectedPanelId)
      .then((detail) => {
        setSelectedPanelDetail(detail);
        const box = parseBoundingBox(
          detail.boundingBox,
          selectedPage?.widthPx,
          selectedPage?.heightPx,
        );
        setPanelBoxX(Math.round(box.percentX));
        setPanelBoxY(Math.round(box.percentY));
        setPanelBoxW(Math.round(box.percentW));
        setPanelBoxH(Math.round(box.percentH));
        setPanelReadingOrder(detail.readingOrder);

        if (detail.sceneId) {
          setLoadingSceneLines(true);
          scriptLineService
            .getSceneById(detail.sceneId)
            .then((res) => {
              setSceneLines(res.scriptLines || []);
            })
            .catch(console.error)
            .finally(() => setLoadingSceneLines(false));
        } else {
          setSceneLines([]);
        }
      })
      .catch(console.error);
  }, [selectedPanelId, selectedPage?.widthPx, selectedPage?.heightPx]);

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditPages) {
      showToast('Không có quyền', 'Chỉ Producer và Artist mới có quyền tạo trang.');
      return;
    }
    if (!currentChapterId) {
      showToast('Chưa chọn chương', 'Vui lòng chọn hoặc tạo một Chương trước khi thêm trang.');
      return;
    }
    try {
      const created = await pageService.createPage(currentChapterId, {
        pageNumber: newPageNumber,
        layoutFormat: newLayoutFormat,
        widthPx: parseInt(newWidthPx, 10),
        heightPx: parseInt(newHeightPx, 10),
        dpi: parseInt(newDpi, 10),
      });
      setPages((prev) => [...prev, created]);
      setSelectedPage(created);
      setCreateModalOpen(false);
      showToast(
        'Tạo trang thành công',
        `Đã tạo Trang ${created.pageNumber} (${created.layoutFormat} - ${created.dpi} DPI).`,
      );
      await loadPanels(created.id);
    } catch (err: any) {
      showToast('Lỗi tạo trang', err.message);
    }
  };

  const handleUpdateCanvas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPage) return;
    try {
      await pageService.updateCanvasSettings(selectedPage.id, {
        widthPx: parseInt(editWidthPx, 10),
        heightPx: parseInt(editHeightPx, 10),
        dpi: parseInt(editDpi, 10),
        layoutFormat: editLayout,
      });
      setPages((prev) =>
        prev.map((p) =>
          p.id === selectedPage.id
            ? {
                ...p,
                widthPx: parseInt(editWidthPx, 10),
                heightPx: parseInt(editHeightPx, 10),
                dpi: parseInt(editDpi, 10),
                layoutFormat: editLayout,
              }
            : p,
        ),
      );
      setSettingsModalOpen(false);
      showToast('Cập nhật Canvas', 'Đã lưu cài đặt kích thước và DPI khổ giấy.');
    } catch (err: any) {
      showToast('Lỗi', err.message);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!canEditPages) {
      showToast('Không có quyền', 'Chỉ Producer và Artist mới có quyền xoá trang.');
      return;
    }
    if (!confirm('Bạn có chắc chắn muốn xóa trang này khỏi Chapter?')) return;
    try {
      await pageService.deletePage(pageId);
      const remaining = pages.filter((p) => p.id !== pageId);
      setPages(remaining);
      if (selectedPage?.id === pageId) {
        setSelectedPage(remaining[0] || null);
        if (remaining[0]) {
          await loadPanels(remaining[0].id);
        } else {
          setPanels([]);
        }
      }
      showToast('Đã xóa trang', 'Trang đã được gỡ khỏi chapter.');
    } catch (err: any) {
      showToast('Lỗi', err.message);
    }
  };

  // Thêm Panel thủ công (POST /api/pages/{pageId}/panels)
  const handleCreatePanel = async () => {
    if (!selectedPage || !canEditPages) return;
    const pageWidth = selectedPage.widthPx || 1200;
    const pageHeight = selectedPage.heightPx || 1800;
    const nextNum = panels.length + 1;
    const defaultY = Math.min(75, 5 + ((panels.length * 25) % 70));
    const defaultBox = buildBoundingBoxJson(10, defaultY, 80, 22, pageWidth, pageHeight);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const clientPanelId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `panel-${Date.now()}`;
      offlineQueueService.enqueue({
        type: 'CREATE_PANEL',
        endpoint: `/pages/${selectedPage.id}/panels`,
        method: 'POST',
        payload: {
          panelNumber: nextNum,
          readingOrder: nextNum,
          boundingBox: defaultBox,
        },
        clientRefId: clientPanelId,
      });
      const tempPanel: PanelDto = {
        id: clientPanelId,
        pageId: selectedPage.id,
        panelNumber: nextNum,
        readingOrder: nextNum,
        boundingBox: defaultBox,
        createdAt: new Date().toISOString(),
      };
      setPanels((prev) => [...prev, tempPanel]);
      setSelectedPanelId(tempPanel.id);
      showToast('Đã lưu ngoại tuyến', `Đã tạo Panel #${nextNum} tạm thời trên máy.`);
      return;
    }

    try {
      const created = await panelService.createPanel(selectedPage.id, {
        panelNumber: nextNum,
        readingOrder: nextNum,
        boundingBox: defaultBox,
      });
      setPanels((prev) => [...prev, created]);
      setSelectedPanelId(created.id);
      showToast(
        'Tạo Panel thành công',
        `Đã tạo Panel #${created.panelNumber} (Thứ tự đọc #${created.readingOrder}).`,
      );
    } catch (err: any) {
      const isNetworkError = !err.response || err.code === 'ERR_NETWORK';
      if (isNetworkError) {
        const clientPanelId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `panel-${Date.now()}`;
        offlineQueueService.enqueue({
          type: 'CREATE_PANEL',
          endpoint: `/pages/${selectedPage.id}/panels`,
          method: 'POST',
          payload: {
            panelNumber: nextNum,
            readingOrder: nextNum,
            boundingBox: defaultBox,
          },
          clientRefId: clientPanelId,
        });
        const tempPanel: PanelDto = {
          id: clientPanelId,
          pageId: selectedPage.id,
          panelNumber: nextNum,
          readingOrder: nextNum,
          boundingBox: defaultBox,
          createdAt: new Date().toISOString(),
        };
        setPanels((prev) => [...prev, tempPanel]);
        setSelectedPanelId(tempPanel.id);
        showToast('Đã lưu ngoại tuyến', `Mất mạng: Đã tạo Panel #${nextNum} tạm thời trên máy.`);
      } else {
        showToast('Lỗi tạo panel', err.message);
      }
    }
  };

  // Xóa Panel (DELETE /api/panels/{panelId})
  const handleDeletePanel = async (panelId: string) => {
    if (!canEditPages) return;
    if (!confirm('Bạn có chắc chắn muốn xóa ô panel này khỏi trang?')) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      offlineQueueService.enqueue({
        type: 'DELETE_PANEL',
        endpoint: `/panels/${panelId}`,
        method: 'DELETE',
        payload: {},
        clientRefId: panelId,
      });
      const remaining = panels.filter((p) => p.id !== panelId);
      setPanels(remaining);
      if (selectedPanelId === panelId) {
        setSelectedPanelId(remaining.length > 0 ? remaining[0].id : null);
      }
      showToast('Đã lưu ngoại tuyến', 'Đã xóa khung panel tạm thời trên máy.');
      return;
    }

    try {
      await panelService.deletePanel(panelId);
      const remaining = panels.filter((p) => p.id !== panelId);
      setPanels(remaining);
      if (selectedPanelId === panelId) {
        setSelectedPanelId(remaining.length > 0 ? remaining[0].id : null);
      }
      showToast('Đã xóa panel', 'Khung panel đã được xóa thành công.');
    } catch (err: any) {
      const isNetworkError = !err.response || err.code === 'ERR_NETWORK';
      if (isNetworkError) {
        offlineQueueService.enqueue({
          type: 'DELETE_PANEL',
          endpoint: `/panels/${panelId}`,
          method: 'DELETE',
          payload: {},
          clientRefId: panelId,
        });
        const remaining = panels.filter((p) => p.id !== panelId);
        setPanels(remaining);
        if (selectedPanelId === panelId) {
          setSelectedPanelId(remaining.length > 0 ? remaining[0].id : null);
        }
        showToast('Đã lưu ngoại tuyến', 'Mất mạng: Đã xóa khung panel tạm thời trên máy.');
      } else {
        showToast('Lỗi xóa panel', err.message);
      }
    }
  };

  // Cập nhật tọa độ Panel (PUT /api/panels/{panelId}/coordinates)
  const handleSavePanelCoords = async () => {
    if (!selectedPanelId) return;
    const pageWidth = selectedPage?.widthPx || 1200;
    const pageHeight = selectedPage?.heightPx || 1800;
    const existing = selectedPanelDetail?.boundingBox
      ? parseBoundingBox(selectedPanelDetail.boundingBox, pageWidth, pageHeight)
      : null;
    const boxJson = buildBoundingBoxJson(
      Number(panelBoxX),
      Number(panelBoxY),
      Number(panelBoxW),
      Number(panelBoxH),
      pageWidth,
      pageHeight,
      { corners: existing?.corners, borderless: existing?.borderless },
    );

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      offlineQueueService.enqueue({
        type: 'UPDATE_PANEL_COORDINATES',
        endpoint: `/panels/${selectedPanelId}/coordinates`,
        method: 'PUT',
        payload: {
          boundingBox: boxJson,
          readingOrder: Number(panelReadingOrder),
        },
        clientRefId: selectedPanelId,
      });
      setPanels((prev) =>
        prev.map((p) =>
          p.id === selectedPanelId
            ? { ...p, boundingBox: boxJson, readingOrder: Number(panelReadingOrder) }
            : p,
        ),
      );
      if (selectedPanelDetail) {
        setSelectedPanelDetail({
          ...selectedPanelDetail,
          boundingBox: boxJson,
          readingOrder: Number(panelReadingOrder),
        });
      }
      showToast('Đã lưu ngoại tuyến', 'Tọa độ panel đã được lưu tạm trên máy (NFR-09).');
      return;
    }

    try {
      const updated = await panelService.updatePanelCoordinates(selectedPanelId, {
        boundingBox: boxJson,
        readingOrder: Number(panelReadingOrder),
      });
      setPanels((prev) => prev.map((p) => (p.id === selectedPanelId ? updated : p)));
      if (selectedPanelDetail) {
        setSelectedPanelDetail({
          ...selectedPanelDetail,
          boundingBox: updated.boundingBox,
          readingOrder: updated.readingOrder,
        });
      }
      showToast(
        'Đã lưu tọa độ panel',
        `Tọa độ và thứ tự đọc #${updated.readingOrder} đã được cập nhật.`,
      );
    } catch (err: any) {
      const isNetworkError = !err.response || err.code === 'ERR_NETWORK';
      if (isNetworkError) {
        offlineQueueService.enqueue({
          type: 'UPDATE_PANEL_COORDINATES',
          endpoint: `/panels/${selectedPanelId}/coordinates`,
          method: 'PUT',
          payload: {
            boundingBox: boxJson,
            readingOrder: Number(panelReadingOrder),
          },
          clientRefId: selectedPanelId,
        });
        setPanels((prev) =>
          prev.map((p) =>
            p.id === selectedPanelId
              ? { ...p, boundingBox: boxJson, readingOrder: Number(panelReadingOrder) }
              : p,
          ),
        );
        if (selectedPanelDetail) {
          setSelectedPanelDetail({
            ...selectedPanelDetail,
            boundingBox: boxJson,
            readingOrder: Number(panelReadingOrder),
          });
        }
        showToast(
          'Đã lưu ngoại tuyến',
          'Mất mạng: Tọa độ panel đã được lưu tạm trên máy (NFR-09).',
        );
      } else {
        showToast('Lỗi lưu tọa độ', err.message);
      }
    }
  };

  // Gán Phân cảnh cho Panel (PUT /api/panels/{panelId}/scene)
  const handleAssignScene = async (sceneId: string | null) => {
    if (!selectedPanelId) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      offlineQueueService.enqueue({
        type: 'ASSIGN_PANEL_SCENE',
        endpoint: `/panels/${selectedPanelId}/scene`,
        method: 'PUT',
        payload: { sceneId },
        clientRefId: selectedPanelId,
      });
      setPanels((prev) => prev.map((p) => (p.id === selectedPanelId ? { ...p, sceneId } : p)));
      if (selectedPanelDetail) {
        setSelectedPanelDetail({ ...selectedPanelDetail, sceneId });
      }
      showToast('Đã lưu ngoại tuyến', 'Liên kết phân cảnh đã được lưu tạm trên máy.');
      return;
    }

    try {
      const updated = await panelService.assignPanelScene(selectedPanelId, sceneId);
      setPanels((prev) => prev.map((p) => (p.id === selectedPanelId ? updated : p)));
      if (selectedPanelDetail) {
        setSelectedPanelDetail({ ...selectedPanelDetail, sceneId });
      }
      if (sceneId) {
        setLoadingSceneLines(true);
        const sceneDetail = await scriptLineService.getSceneById(sceneId);
        setSceneLines(sceneDetail.scriptLines || []);
        setLoadingSceneLines(false);
      } else {
        setSceneLines([]);
      }
      showToast(
        'Đã cập nhật phân cảnh',
        sceneId ? 'Đã liên kết Panel với Phân cảnh.' : 'Đã bỏ liên kết Phân cảnh.',
      );
    } catch (err: any) {
      const isNetworkError = !err.response || err.code === 'ERR_NETWORK';
      if (isNetworkError) {
        offlineQueueService.enqueue({
          type: 'ASSIGN_PANEL_SCENE',
          endpoint: `/panels/${selectedPanelId}/scene`,
          method: 'PUT',
          payload: { sceneId },
          clientRefId: selectedPanelId,
        });
        setPanels((prev) => prev.map((p) => (p.id === selectedPanelId ? { ...p, sceneId } : p)));
        if (selectedPanelDetail) {
          setSelectedPanelDetail({ ...selectedPanelDetail, sceneId });
        }
        showToast('Đã lưu ngoại tuyến', 'Mất mạng: Liên kết phân cảnh đã được lưu tạm trên máy.');
      } else {
        showToast('Lỗi gán phân cảnh', err.message);
      }
    }
  };

  // Neo dòng kịch bản vào Panel (PUT /api/panels/{panelId}/script-lines)
  const handleToggleScriptLine = async (lineId: string) => {
    if (!selectedPanelId || !selectedPanelDetail) return;
    const currentIds = selectedPanelDetail.scriptLineIds || [];
    const newIds = currentIds.includes(lineId)
      ? currentIds.filter((id) => id !== lineId)
      : [...currentIds, lineId];

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      offlineQueueService.enqueue({
        type: 'ASSIGN_PANEL_SCRIPT_LINES',
        endpoint: `/panels/${selectedPanelId}/script-lines`,
        method: 'PUT',
        payload: { scriptLineIds: newIds },
        clientRefId: selectedPanelId,
      });
      setSelectedPanelDetail({ ...selectedPanelDetail, scriptLineIds: newIds });
      showToast('Đã lưu ngoại tuyến', `Đã lưu tạm neo ${newIds.length} dòng kịch bản.`);
      return;
    }

    try {
      await panelService.assignPanelScriptLines(selectedPanelId, newIds);
      setSelectedPanelDetail({ ...selectedPanelDetail, scriptLineIds: newIds });
      showToast('Cập nhật dòng thoại', `Đã neo ${newIds.length} dòng kịch bản vào Panel này.`);
    } catch (err: any) {
      const isNetworkError = !err.response || err.code === 'ERR_NETWORK';
      if (isNetworkError) {
        offlineQueueService.enqueue({
          type: 'ASSIGN_PANEL_SCRIPT_LINES',
          endpoint: `/panels/${selectedPanelId}/script-lines`,
          method: 'PUT',
          payload: { scriptLineIds: newIds },
          clientRefId: selectedPanelId,
        });
        setSelectedPanelDetail({ ...selectedPanelDetail, scriptLineIds: newIds });
        showToast('Đã lưu ngoại tuyến', `Mất mạng: Đã lưu tạm neo ${newIds.length} dòng kịch bản.`);
      } else {
        showToast('Lỗi neo kịch bản', err.message);
      }
    }
  };

  return (
    <div className='flex-1 bg-[#FAF8F5] min-h-screen p-6 md:p-8 space-y-6'>
      {/* Toast */}
      {toast && (
        <div className='fixed top-6 right-6 z-50 bg-[#171717] text-white px-4 py-3 rounded-xl shadow-2xl border border-white/10 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200'>
          <CheckCircle2 className='w-4 h-4 text-emerald-400 shrink-0' />
          <div>
            <div className='text-xs font-bold'>{toast.title}</div>
            <div className='text-[11px] text-[#A3A3A3]'>{toast.desc}</div>
          </div>
          <button onClick={() => setToast(null)} className='ml-2 text-[#737373] hover:text-white'>
            <X className='w-3.5 h-3.5' />
          </button>
        </div>
      )}

      {/* NFR-09 Offline Status Indicator */}
      <OfflineStatusBanner />

      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs'>
        <div>
          <div className='mb-1 text-[11px] font-mono font-semibold uppercase tracking-wider text-[#555555]'>
            Bàn vẽ
          </div>
          <h1 className='text-2xl font-serif font-bold text-[#171717] tracking-tight'>
            Bàn Vẽ &amp; Bố Cục Khung Tranh Manga
          </h1>
          <p className='text-xs text-[#737373]'>
            Dựng khung tranh (Panels), áp dụng Frame Templates dựng sẵn, điều chỉnh thứ tự đọc và
            neo dòng kịch bản (Script Lines) vào từng ô phân cảnh.
          </p>
        </div>

        <div className='flex items-center gap-2.5 shrink-0 flex-wrap'>
          {chapters.length > 0 && (
            <div className='flex items-center gap-1.5 bg-[#F8F6F0] px-3 py-1 rounded-xl border border-[#E7E7E7]'>
              <BookOpen className='w-3.5 h-3.5 text-blue-600' />
              <label htmlFor='artist-chapter-select' className='text-xs font-medium text-[#555555]'>
                Chương:
              </label>
              <select
                id='artist-chapter-select'
                value={currentChapterId || ''}
                onChange={(e) => {
                  const newId = e.target.value;
                  setCurrentChapterId(newId);
                  setSearchParams((prev) => {
                    const p = new URLSearchParams(prev);
                    p.set('chapterId', newId);
                    return p;
                  });
                }}
                className='bg-transparent text-xs font-semibold text-[#171717] outline-none cursor-pointer pr-1'
              >
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    Chương {c.chapterNumber}
                    {c.title ? `: ${c.title}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={loadPages}
            disabled={loading}
            className='inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#555555] bg-[#F8F6F0] hover:bg-[#EAE6DF] border border-[#E7E7E7] rounded-xl transition-all cursor-pointer'
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            disabled={!canEditPages || !currentChapterId}
            title={
              !canEditPages
                ? 'Chỉ Producer và Artist mới có quyền tạo trang (Breaking 152)'
                : !currentChapterId
                  ? 'Vui lòng chọn hoặc tạo Chương trước'
                  : undefined
            }
            className='inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all cursor-pointer'
          >
            <Plus className='w-3.5 h-3.5' />
            <span>Tạo Trang Mới</span>
          </button>
        </div>
      </div>

      {!canEditPages && (
        <div className='p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800'>
          <ShieldAlert className='w-4 h-4 text-amber-600 shrink-0' />
          <span>
            Chế độ xem: Bạn đang xem trang với quyền đọc. Chỉ vai trò <strong>Producer</strong> hoặc{' '}
            <strong>Artist</strong> mới có quyền tạo, sửa cài đặt và xoá trang.
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className='flex items-center gap-2 border-b border-[#E7E7E7] pb-3'>
        <button
          onClick={() => setActiveTab('pages')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'pages'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-[#555555] hover:bg-[#F8F6F0] border border-[#E7E7E7]'
          }`}
        >
          <Layout className='w-3.5 h-3.5' />
          <span>Trang &amp; Bố Cục Manga ({pages.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'queue'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-[#555555] hover:bg-[#F8F6F0] border border-[#E7E7E7]'
          }`}
        >
          <KanbanSquare className='w-3.5 h-3.5' />
          <span>Hàng Đợi Nhiệm Vụ ({tasks.length})</span>
        </button>
      </div>

      {activeTab === 'queue' && (
        <div className='bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-4'>
          <div className='flex items-center justify-between text-xs font-bold text-[#171717] border-b border-[#E7E7E7] pb-3'>
            <span className='flex items-center gap-2'>
              <Clock className='w-4 h-4 text-blue-600' />
              <span>Hàng Đợi Công Việc Theo Công Đoạn</span>
            </span>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
            {tasks.map((task) => (
              <div
                key={task.id}
                className='p-4 rounded-xl border border-[#E7E7E7] bg-[#FAF8F5] space-y-2'
              >
                <div className='flex items-center justify-between'>
                  <span className='px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800'>
                    {task.pipelineStageId}
                  </span>
                  <span className='text-[10px] font-mono text-zinc-500'>{task.status}</span>
                </div>
                <div className='text-xs font-bold text-[#171717]'>{task.brief}</div>
                <div className='text-[10px] text-zinc-500'>Hạn chót: {task.dueDate}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'pages' && (
        <>
          {/* Pages Thumbnails Carousel / Strip */}
          <div className='bg-white p-5 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-3'>
            <div className='flex items-center justify-between text-xs font-bold text-[#171717]'>
              <span className='flex items-center gap-2'>
                <Layout className='w-4 h-4 text-blue-600' />
                <span>
                  Danh Sách Trang Bản Thảo{' '}
                  {currentChapterId
                    ? `(Chương ${chapters.find((c) => c.id === currentChapterId)?.chapterNumber ?? ''})`
                    : ''}
                </span>
              </span>
              <span className='font-mono text-[11px] text-[#888888]'>
                Tổng cộng: {pages.length} trang
              </span>
            </div>

            {pages.length === 0 ? (
              <div className='p-8 text-center text-xs text-zinc-500 border border-dashed border-[#E7E7E7] rounded-xl'>
                {currentChapterId
                  ? 'Chương này chưa có trang bản thảo nào. Bấm "Tạo Trang Mới" để bắt đầu vẽ.'
                  : 'Vui lòng chọn một Chương để hiển thị danh sách trang.'}
              </div>
            ) : (
              <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3'>
                {pages.map((p) => {
                  const isSel = selectedPage?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPage(p)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer text-center relative ${
                        isSel
                          ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/30'
                          : 'border-[#E7E7E7] bg-[#FAF8F5] hover:bg-white hover:border-blue-400'
                      }`}
                    >
                      <div className='aspect-[2/3] bg-white border border-[#E7E7E7] rounded-lg flex flex-col items-center justify-center p-2 mb-2 relative overflow-hidden group shadow-2xs'>
                        <FileImage className='w-8 h-8 text-blue-400 mb-1' />
                        <span className='text-[10px] font-mono text-[#888888]'>
                          {p.widthPx}x{p.heightPx}
                        </span>
                        <span className='text-[9px] font-mono font-bold text-blue-600 bg-blue-50 px-1 py-0.2 rounded mt-1'>
                          {p.dpi} DPI
                        </span>
                      </div>
                      <div className='text-xs font-bold text-[#171717]'>Trang {p.pageNumber}</div>
                      <div className='text-[10px] text-[#888888] font-mono truncate'>
                        {p.layoutFormat}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Page Workbench & Interactive Panels Layout */}
          {selectedPage && (
            <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
              {/* Left Column: Canvas Preview with Interactive Panels (7 cols) */}
              <div className='lg:col-span-7 bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-4'>
                <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3 flex-wrap gap-2'>
                  <div>
                    <h3 className='text-sm font-bold text-[#171717] flex items-center gap-2'>
                      <Layers className='w-4 h-4 text-blue-600' />
                      <span>Trang {selectedPage.pageNumber} — Bố Cục Khung Tranh (Panels)</span>
                    </h3>
                    <span className='text-[11px] font-mono text-[#888888]'>
                      {panels.length} ô khung panel • Khổ: {selectedPage.widthPx} x{' '}
                      {selectedPage.heightPx} px ({selectedPage.dpi} DPI)
                    </span>
                  </div>

                  <div className='flex items-center gap-2 flex-wrap'>
                    {canEditPages && (
                      <>
                        <button
                          onClick={() => setFrameTemplateModalOpen(true)}
                          className='px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer'
                          title='Áp dụng mẫu khung tranh dựng sẵn vào trang'
                        >
                          <LayoutTemplate className='w-3.5 h-3.5' />
                          <span>Áp Dụng Mẫu Khung</span>
                        </button>
                        <button
                          onClick={handleCreatePanel}
                          className='px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1 cursor-pointer'
                          title='Tạo thêm một ô panel thủ công'
                        >
                          <Plus className='w-3.5 h-3.5' />
                          <span>Thêm Panel</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditWidthPx(selectedPage.widthPx.toString());
                            setEditHeightPx(selectedPage.heightPx.toString());
                            setEditDpi(selectedPage.dpi.toString());
                            setEditLayout(selectedPage.layoutFormat);
                            setSettingsModalOpen(true);
                          }}
                          className='p-1.5 text-[#555555] hover:text-[#171717] bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg cursor-pointer'
                          title='Cài đặt Canvas'
                        >
                          <Settings className='w-3.5 h-3.5' />
                        </button>
                        <button
                          onClick={() => handleDeletePage(selectedPage.id)}
                          className='p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer'
                          title='Xóa trang'
                        >
                          <Trash2 className='w-3.5 h-3.5' />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Canvas Container */}
                <div className='bg-[#F8F6F0] rounded-xl border border-dashed border-[#CCCCCC] p-6 flex items-center justify-center min-h-[460px] relative overflow-hidden'>
                  <div
                    className='bg-white shadow-xl border-2 border-[#171717] relative'
                    style={{
                      width: '320px',
                      aspectRatio: '1 / 1.414',
                    }}
                  >
                    {/* Safe Margin Guides */}
                    <div className='absolute inset-3 border border-blue-200/60 pointer-events-none'></div>

                    {panels.length === 0 ? (
                      <div className='absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-zinc-400'>
                        <LayoutTemplate className='w-8 h-8 mb-2 opacity-50' />
                        <span className='text-xs font-semibold'>Chưa có khung panel</span>
                        <p className='text-[10px] mt-1 text-zinc-500'>
                          Bấm "Áp Dụng Mẫu Khung" hoặc "Thêm Panel" để chia ô phân cảnh trên trang.
                        </p>
                      </div>
                    ) : (
                      panels.map((p) => {
                        const box = parseBoundingBox(
                          p.boundingBox,
                          selectedPage.widthPx,
                          selectedPage.heightPx,
                        );
                        const isSelected = selectedPanelId === p.id;
                        const panelArt = pageArtworks.filter((a) => a.panelId === p.id).pop();
                        const panelArtUrl = panelArt ? panelArtworkUrls[panelArt.id] : null;
                        return (
                          <div
                            key={p.id}
                            onClick={() => setSelectedPanelId(p.id)}
                            className={`absolute border-2 transition-all cursor-pointer flex flex-col justify-between p-1.5 overflow-hidden ${
                              isSelected
                                ? 'border-orange-500 bg-orange-500/10 ring-2 ring-orange-400/40 z-20'
                                : box.borderless
                                  ? 'border-dashed border-zinc-400 bg-white/80 hover:border-blue-500 z-10'
                                  : 'border-[#171717] bg-white/90 hover:border-blue-500 hover:bg-blue-50/20 z-10'
                            }`}
                            style={{
                              left: `${box.percentX}%`,
                              top: `${box.percentY}%`,
                              width: `${box.percentW}%`,
                              height: `${box.percentH}%`,
                            }}
                          >
                            {panelArtUrl && (
                              <img
                                src={panelArtUrl}
                                alt={`Panel #${p.panelNumber}`}
                                className='absolute inset-0 w-full h-full object-contain pointer-events-none opacity-85 z-0'
                              />
                            )}

                            <div className='flex items-center justify-between pointer-events-none relative z-10'>
                              <span className='font-mono font-bold text-[9px] bg-[#171717] text-white px-1 rounded shadow-2xs'>
                                #{p.panelNumber}
                              </span>
                              <div className='flex items-center gap-1'>
                                {panelArt && (
                                  <span className='font-mono font-bold text-[8px] bg-emerald-600 text-white px-1 rounded shadow-2xs'>
                                    v{panelArt.versionNumber}
                                  </span>
                                )}
                                <span className='font-mono font-semibold text-[8px] bg-blue-50 text-blue-700 px-1 rounded border border-blue-200'>
                                  Đọc #{p.readingOrder}
                                </span>
                              </div>
                            </div>

                            <div className='flex items-center justify-between text-[8px] text-zinc-500 pointer-events-none'>
                              {p.sceneId && (
                                <span className='bg-purple-100 text-purple-800 px-1 rounded truncate max-w-[80px]'>
                                  Scene
                                </span>
                              )}
                              <span className='font-mono text-zinc-400 ml-auto'>
                                {Math.round(box.percentW)}×{Math.round(box.percentH)}%
                                {box.borderless && ' (Tràn)'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* Layers / Image Elements on Canvas (CF2) */}
                    {pageElements
                      .filter((el) => !el.isRemoved)
                      .map((el) => {
                        const isSelected = selectedElementId === el.elementId;
                        const bibleEntry = el.bibleEntryId
                          ? bibleEntries.find((b) => b.id === el.bibleEntryId)
                          : null;
                        const artRef = el.assetId
                          ? pageArtworks.find((a) => a.id === el.assetId)
                          : null;
                        const imgUrl = artRef
                          ? panelArtworkUrls[artRef.id]
                          : el.content?.startsWith('http') || el.content?.startsWith('data:')
                            ? el.content
                            : bibleEntry?.referenceImageUrl
                              ? bibleEntry.referenceImageUrl
                              : null;

                        // Tỷ lệ % trên canvas
                        const pageW = selectedPage.widthPx || 1200;
                        const pageH = selectedPage.heightPx || 1800;
                        const isPercent = el.width <= 100 || el.height <= 100;
                        const leftPct = isPercent ? el.x : (el.x / pageW) * 100;
                        const topPct = isPercent ? el.y : (el.y / pageH) * 100;
                        const widthPct = isPercent ? el.width : (el.width / pageW) * 100;
                        const heightPct = isPercent ? el.height : (el.height / pageH) * 100;

                        return (
                          <div
                            key={el.elementId}
                            data-testid={`canvas-layer-${el.elementId}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedElementId(el.elementId);
                              setActiveRightTab('layers');
                            }}
                            className={`absolute transition-all cursor-pointer flex flex-col items-center justify-center p-1 overflow-hidden select-none ${
                              isSelected
                                ? 'ring-2 ring-purple-600 bg-purple-50/30'
                                : 'border border-dashed border-purple-400/50 hover:ring-1 hover:ring-purple-400'
                            }`}
                            style={{
                              left: `${leftPct}%`,
                              top: `${topPct}%`,
                              width: `${widthPct}%`,
                              height: `${heightPct}%`,
                              transform: `rotate(${el.rotation || 0}deg)`,
                              transformOrigin: 'center center',
                              zIndex: el.zIndex || 5,
                            }}
                          >
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={el.elementType}
                                className='w-full h-full object-contain pointer-events-none'
                              />
                            ) : (
                              <div className='flex flex-col items-center justify-center text-center p-1 bg-white/80 backdrop-blur-2xs rounded w-full h-full pointer-events-none'>
                                {el.elementType === 'CHARACTER_INSTANCE' && (
                                  <User className='w-4 h-4 text-purple-600 mb-0.5' />
                                )}
                                {el.elementType === 'BACKGROUND' && (
                                  <Mountain className='w-4 h-4 text-emerald-600 mb-0.5' />
                                )}
                                {el.elementType === 'PROP' && (
                                  <Package className='w-4 h-4 text-amber-600 mb-0.5' />
                                )}
                                {el.elementType === 'EFFECT' && (
                                  <Zap className='w-4 h-4 text-red-500 mb-0.5' />
                                )}
                                {el.elementType === 'ARTWORK_LAYER' && (
                                  <Palette className='w-4 h-4 text-blue-500 mb-0.5' />
                                )}
                                <span className='text-[8px] font-bold text-zinc-700 truncate max-w-full'>
                                  {bibleEntry
                                    ? bibleEntry.canonicalName
                                    : LAYER_LABELS[el.elementType] || el.elementType}
                                </span>
                                {el.rotation ? (
                                  <span className='text-[7px] text-zinc-500'>{el.rotation}°</span>
                                ) : null}
                              </div>
                            )}
                            <div className='absolute top-0.5 right-0.5 bg-black/60 text-white text-[7px] px-1 rounded font-mono'>
                              z:{el.zIndex || 1}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Right Column: Panel Properties & Script Anchoring (5 cols) */}
              <div className='lg:col-span-5 bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs space-y-4 flex flex-col'>
                {/* Tab Switcher: Khung Panel vs Lớp Vẽ & Layer Ảnh */}
                <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
                  <div className='flex items-center gap-2'>
                    <button
                      type='button'
                      onClick={() => setActiveRightTab('panel')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        activeRightTab === 'panel'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-zinc-600 hover:bg-zinc-100'
                      }`}
                      data-testid='tab-panel'
                    >
                      <Edit3 className='w-3.5 h-3.5' />
                      <span>
                        {selectedPanelDetail
                          ? `Panel #${selectedPanelDetail.panelNumber}`
                          : 'Khung Panel'}
                      </span>
                    </button>
                    <button
                      type='button'
                      onClick={() => setActiveRightTab('layers')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        activeRightTab === 'layers'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'text-zinc-600 hover:bg-zinc-100'
                      }`}
                      data-testid='tab-layers'
                    >
                      <Layers className='w-3.5 h-3.5' />
                      <span>Lớp Vẽ &amp; Layer Ảnh</span>
                      {pageElements.length > 0 && (
                        <span className='ml-1 px-1.5 py-0.2 bg-purple-200 text-purple-800 rounded-full text-[10px] font-mono'>
                          {pageElements.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {activeRightTab === 'layers' && (
                    <button
                      type='button'
                      onClick={() => setCreateLayerModalOpen(true)}
                      className='px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs'
                      data-testid='open-create-layer-modal'
                    >
                      <Plus className='w-3.5 h-3.5' />
                      <span>Thêm Layer</span>
                    </button>
                  )}
                </div>

                {activeRightTab === 'panel' ? (
                  selectedPanelDetail ? (
                    <div className='space-y-4 text-xs flex-1 overflow-y-auto custom-scrollbar'>
                      {/* Tọa độ & Thứ tự đọc */}
                      <div className='p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7] space-y-2'>
                        <div className='font-bold text-[#171717] flex items-center justify-between'>
                          <span>Vị trí &amp; Thứ tự đọc (BR-11)</span>
                          <span className='font-mono text-[10px] text-zinc-500'>
                            ID: {selectedPanelDetail.id.slice(0, 8)}...
                          </span>
                        </div>
                        <div className='grid grid-cols-2 gap-2 text-[11px]'>
                          <div>
                            <label className='block text-zinc-500 mb-0.5'>Thứ tự đọc:</label>
                            <input
                              type='number'
                              value={panelReadingOrder}
                              onChange={(e) => setPanelReadingOrder(parseInt(e.target.value, 10))}
                              className='w-full px-2 py-1 bg-white border border-[#E7E7E7] rounded font-mono'
                            />
                          </div>
                          <div>
                            <label className='block text-zinc-500 mb-0.5'>X (%):</label>
                            <input
                              type='number'
                              value={panelBoxX}
                              onChange={(e) => setPanelBoxX(parseFloat(e.target.value))}
                              className='w-full px-2 py-1 bg-white border border-[#E7E7E7] rounded font-mono'
                            />
                          </div>
                          <div>
                            <label className='block text-zinc-500 mb-0.5'>Y (%):</label>
                            <input
                              type='number'
                              value={panelBoxY}
                              onChange={(e) => setPanelBoxY(parseFloat(e.target.value))}
                              className='w-full px-2 py-1 bg-white border border-[#E7E7E7] rounded font-mono'
                            />
                          </div>
                          <div>
                            <label className='block text-zinc-500 mb-0.5'>Rộng × Cao (%):</label>
                            <div className='flex gap-1'>
                              <input
                                type='number'
                                value={panelBoxW}
                                onChange={(e) => setPanelBoxW(parseFloat(e.target.value))}
                                className='w-1/2 px-1 py-1 bg-white border border-[#E7E7E7] rounded font-mono'
                              />
                              <input
                                type='number'
                                value={panelBoxH}
                                onChange={(e) => setPanelBoxH(parseFloat(e.target.value))}
                                className='w-1/2 px-1 py-1 bg-white border border-[#E7E7E7] rounded font-mono'
                              />
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={handleSavePanelCoords}
                          className='w-full mt-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer'
                        >
                          Lưu Tọa Độ &amp; Thứ Tự Đọc
                        </button>
                      </div>

                      {/* Ảnh Artwork Của Khung (CF2) */}
                      {(() => {
                        const panelArt = pageArtworks
                          .filter((a) => a.panelId === selectedPanelDetail.id)
                          .pop();
                        const panelArtUrl = panelArt ? panelArtworkUrls[panelArt.id] : null;
                        return (
                          <div
                            className='p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7] space-y-2'
                            data-testid='panel-artwork-desk-card'
                          >
                            <div className='font-bold text-[#171717] flex items-center justify-between'>
                              <span className='flex items-center gap-1.5'>
                                <ImageIcon className='w-3.5 h-3.5 text-blue-600' />
                                <span>Ảnh Artwork Khung #{selectedPanelDetail.panelNumber}</span>
                              </span>
                              {panelArt && (
                                <span className='font-mono font-bold text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded'>
                                  v{panelArt.versionNumber}
                                </span>
                              )}
                            </div>

                            {panelArt ? (
                              <div className='space-y-2'>
                                {panelArtUrl ? (
                                  <div className='aspect-video max-h-36 bg-white border border-[#E7E7E7] rounded-lg overflow-hidden flex items-center justify-center relative p-1'>
                                    <img
                                      src={panelArtUrl}
                                      alt={panelArt.fileName}
                                      className='w-full h-full object-contain'
                                    />
                                  </div>
                                ) : (
                                  <p className='text-[10px] text-zinc-400 font-mono'>
                                    Đang nạp link xem ảnh...
                                  </p>
                                )}
                                <div className='text-[10px] text-zinc-500 font-mono flex items-center justify-between'>
                                  <span className='truncate'>{panelArt.fileName}</span>
                                  <span>{Math.round(panelArt.sizeBytes / 1024)} KB</span>
                                </div>
                              </div>
                            ) : (
                              <p className='text-[11px] text-zinc-500 italic p-2 bg-white rounded border border-[#E7E7E7]'>
                                Khung này chưa có ảnh riêng. Bấm "Tải ảnh cho khung" để nạp ảnh bản
                                vẽ.
                              </p>
                            )}

                            {canEditPages && (
                              <button
                                type='button'
                                data-testid={`desk-upload-panel-btn-${selectedPanelDetail.id}`}
                                onClick={() => handleTriggerUploadPanel(selectedPanelDetail.id)}
                                className='w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs'
                              >
                                <Upload className='w-3.5 h-3.5' />
                                <span>Tải ảnh cho khung</span>
                              </button>
                            )}
                          </div>
                        );
                      })()}

                      {/* Gán Phân cảnh (Scene) */}
                      <div className='p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7] space-y-2'>
                        <div className='font-bold text-[#171717] flex items-center gap-1.5'>
                          <Film className='w-3.5 h-3.5 text-purple-600' />
                          <span>Gán Phân Cảnh (Scene)</span>
                        </div>
                        <select
                          value={selectedPanelDetail.sceneId || ''}
                          onChange={(e) =>
                            handleAssignScene(e.target.value ? e.target.value : null)
                          }
                          className='w-full p-2 bg-white border border-[#E7E7E7] rounded-lg text-xs font-semibold'
                        >
                          <option value=''>-- Chưa gán phân cảnh --</option>
                          {scenes.map((s) => (
                            <option key={s.id} value={s.id}>
                              Phân cảnh #{s.sceneNumber}: {s.heading || 'Không tiêu đề'} (
                              {s.scriptLinesCount} dòng thoại)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Neo dòng kịch bản (Script Lines) */}
                      <div className='p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7] space-y-2 flex-1'>
                        <div className='font-bold text-[#171717] flex items-center justify-between'>
                          <span className='flex items-center gap-1.5'>
                            <MessageSquare className='w-3.5 h-3.5 text-blue-600' />
                            <span>Neo Dòng Kịch Bản Vào Panel (CF2)</span>
                          </span>
                          <span className='text-[10px] text-zinc-500 font-mono'>
                            {selectedPanelDetail.scriptLineIds?.length || 0} dòng
                          </span>
                        </div>

                        {!selectedPanelDetail.sceneId ? (
                          <p className='text-[11px] text-zinc-500 italic p-2 bg-white rounded border border-[#E7E7E7]'>
                            Vui lòng gán Phân cảnh (Scene) ở trên trước khi chọn các dòng thoại neo
                            vào panel này.
                          </p>
                        ) : loadingSceneLines ? (
                          <p className='text-[11px] text-zinc-500 p-2'>Đang nạp kịch bản...</p>
                        ) : sceneLines.length === 0 ? (
                          <p className='text-[11px] text-zinc-500 italic p-2 bg-white rounded border border-[#E7E7E7]'>
                            Phân cảnh này chưa có dòng thoại kịch bản nào.
                          </p>
                        ) : (
                          <div className='space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar'>
                            {sceneLines.map((line) => {
                              const isAnchored = selectedPanelDetail.scriptLineIds?.includes(
                                line.id,
                              );
                              return (
                                <div
                                  key={line.id}
                                  onClick={() => handleToggleScriptLine(line.id)}
                                  className={`p-2 rounded-lg border text-left cursor-pointer flex items-start gap-2 transition-all ${
                                    isAnchored
                                      ? 'bg-blue-50 border-blue-300 text-blue-900'
                                      : 'bg-white border-[#E7E7E7] text-[#171717] hover:border-zinc-400'
                                  }`}
                                >
                                  {isAnchored ? (
                                    <CheckSquare className='w-4 h-4 text-blue-600 shrink-0 mt-0.5' />
                                  ) : (
                                    <Square className='w-4 h-4 text-zinc-400 shrink-0 mt-0.5' />
                                  )}
                                  <div className='flex-1 min-w-0'>
                                    <div className='flex items-center gap-1 text-[10px] font-mono font-bold text-zinc-500'>
                                      <span>#{line.lineOrder}</span>
                                      {line.speakerCharacterId && (
                                        <span className='bg-zinc-100 px-1 rounded text-zinc-700'>
                                          Nhân vật
                                        </span>
                                      )}
                                    </div>
                                    <p className='text-[11px] truncate font-medium'>
                                      {line.dialogueText ||
                                        line.stageDirection ||
                                        '(Chỉ dẫn diễn xuất)'}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Delete Panel Button */}
                      <div className='pt-2 border-t border-[#E7E7E7] flex justify-end'>
                        <button
                          onClick={() => handleDeletePanel(selectedPanelDetail.id)}
                          className='px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-colors'
                        >
                          <Trash2 className='w-3.5 h-3.5' />
                          <span>Xóa Khung Panel Này</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className='p-8 text-center text-xs text-zinc-400 border border-dashed border-[#E7E7E7] rounded-xl flex-1 flex flex-col items-center justify-center'>
                      <Move className='w-8 h-8 mb-2 opacity-40' />
                      <p className='font-semibold text-zinc-600'>Chưa chọn ô Panel</p>
                      <p className='text-[11px] text-zinc-400 mt-1 max-w-xs'>
                        Bấm vào bất kỳ ô khung panel nào trên canvas bên trái để chỉnh sửa thứ tự
                        đọc, liên kết Scene và neo các dòng thoại kịch bản.
                      </p>
                    </div>
                  )
                ) : (
                  /* Layers Management Tab (CF2) */
                  <div
                    className='space-y-4 text-xs flex-1 overflow-y-auto custom-scrollbar'
                    data-testid='layers-management-view'
                  >
                    <div className='p-3 bg-purple-50/60 rounded-xl border border-purple-100 space-y-1.5'>
                      <div className='flex items-center justify-between'>
                        <span className='font-bold text-purple-900 flex items-center gap-1.5'>
                          <Sparkles className='w-3.5 h-3.5 text-purple-600' />
                          <span>Quản Lý Element &amp; Layer Ảnh (CF2)</span>
                        </span>
                        <span className='text-[10px] font-mono text-purple-700'>
                          {pageElements.length} layer
                        </span>
                      </div>
                      <p className='text-[11px] text-purple-800/80'>
                        Tách layer nhân vật, bối cảnh, đạo cụ, hiệu ứng trực quan trên canvas. Hỗ
                        trợ xoay góc và đổi thứ tự hiển thị z-index.
                      </p>
                    </div>

                    {loadingElements ? (
                      <div className='p-8 text-center text-zinc-400'>
                        <RefreshCw className='w-5 h-5 animate-spin mx-auto mb-2' />
                        <span>Đang tải các layer của trang...</span>
                      </div>
                    ) : pageElements.length === 0 ? (
                      <div className='p-8 text-center border border-dashed border-[#E7E7E7] rounded-xl flex flex-col items-center justify-center space-y-3'>
                        <Layers className='w-8 h-8 text-purple-300' />
                        <div>
                          <p className='font-semibold text-zinc-700'>Chưa có layer ảnh nào</p>
                          <p className='text-[11px] text-zinc-400 mt-0.5 max-w-xs'>
                            Bấm "+ Thêm Layer" để thêm nhân vật, bối cảnh, đạo cụ, hiệu ứng hoặc lớp
                            artwork riêng trên trang.
                          </p>
                        </div>
                        <button
                          type='button'
                          onClick={() => setCreateLayerModalOpen(true)}
                          className='px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1'
                        >
                          <Plus className='w-3.5 h-3.5' />
                          <span>Thêm Layer Đầu Tiên</span>
                        </button>
                      </div>
                    ) : (
                      <div className='space-y-3' data-testid='page-layers-list'>
                        {/* Selected Layer Inspector if any */}
                        {(() => {
                          const selectedElem = pageElements.find(
                            (e) => e.elementId === selectedElementId,
                          );
                          if (!selectedElem) return null;
                          const bible = selectedElem.bibleEntryId
                            ? bibleEntries.find((b) => b.id === selectedElem.bibleEntryId)
                            : null;
                          return (
                            <div
                              className='p-3 bg-[#FAF8F5] rounded-xl border-2 border-purple-300 space-y-2.5 shadow-2xs'
                              data-testid='selected-layer-inspector'
                            >
                              <div className='flex items-center justify-between'>
                                <div className='flex items-center gap-1.5 font-bold text-zinc-800'>
                                  <span className='px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-800 font-mono'>
                                    z:{selectedElem.zIndex}
                                  </span>
                                  <span className='truncate max-w-[160px]'>
                                    {bible
                                      ? bible.canonicalName
                                      : LAYER_LABELS[selectedElem.elementType] ||
                                        selectedElem.elementType}
                                  </span>
                                </div>
                                <span className='font-mono text-[10px] text-zinc-400'>
                                  ID: {selectedElem.elementId.slice(0, 8)}...
                                </span>
                              </div>

                              <div className='grid grid-cols-2 gap-2 text-[11px]'>
                                <div>
                                  <span className='text-zinc-500 block text-[10px]'>
                                    Loại Layer:
                                  </span>
                                  <span className='font-semibold text-zinc-700'>
                                    {LAYER_LABELS[selectedElem.elementType] ||
                                      selectedElem.elementType}
                                  </span>
                                </div>
                                <div>
                                  <span className='text-zinc-500 block text-[10px]'>Góc xoay:</span>
                                  <span className='font-mono font-semibold text-zinc-700'>
                                    {selectedElem.rotation || 0}°
                                  </span>
                                </div>
                                <div>
                                  <span className='text-zinc-500 block text-[10px]'>Toạ độ:</span>
                                  <span className='font-mono text-zinc-700'>
                                    {selectedElem.x}, {selectedElem.y} px
                                  </span>
                                </div>
                                <div>
                                  <span className='text-zinc-500 block text-[10px]'>
                                    Kích thước:
                                  </span>
                                  <span className='font-mono text-zinc-700'>
                                    {selectedElem.width} × {selectedElem.height} px
                                  </span>
                                </div>
                              </div>

                              {bible && (
                                <div className='p-2 bg-white rounded-lg border border-[#E7E7E7] flex items-center gap-2'>
                                  {bible.referenceImageUrl && (
                                    <img
                                      src={bible.referenceImageUrl}
                                      alt={bible.canonicalName}
                                      className='w-7 h-7 rounded object-cover border border-zinc-200'
                                    />
                                  )}
                                  <div className='min-w-0 flex-1'>
                                    <span className='text-[10px] text-zinc-400 block'>
                                      Series Bible:
                                    </span>
                                    <p className='text-xs font-bold text-zinc-800 truncate'>
                                      {bible.canonicalName}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Controls */}
                              <div className='pt-2 border-t border-[#E7E7E7] flex items-center justify-between gap-1'>
                                <div className='flex items-center gap-1'>
                                  <button
                                    type='button'
                                    onClick={() => handleRotateLayer(selectedElem, -15)}
                                    className='px-2 py-1 bg-white border border-[#E7E7E7] hover:bg-zinc-50 rounded text-zinc-700 flex items-center gap-1 text-[11px] font-semibold cursor-pointer'
                                    title='Xoay trái 15 độ'
                                  >
                                    <RotateCw className='w-3 h-3 -scale-x-100' />
                                    <span>-15°</span>
                                  </button>
                                  <button
                                    type='button'
                                    onClick={() => handleRotateLayer(selectedElem, 15)}
                                    className='px-2 py-1 bg-white border border-[#E7E7E7] hover:bg-zinc-50 rounded text-zinc-700 flex items-center gap-1 text-[11px] font-semibold cursor-pointer'
                                    title='Xoay phải 15 độ'
                                  >
                                    <RotateCw className='w-3 h-3' />
                                    <span>+15°</span>
                                  </button>
                                </div>

                                <div className='flex items-center gap-1'>
                                  <button
                                    type='button'
                                    onClick={() => handleChangeLayerZIndex(selectedElem, 1)}
                                    className='p-1.5 bg-white border border-[#E7E7E7] hover:bg-zinc-50 rounded text-zinc-700 cursor-pointer'
                                    title='Lên 1 lớp (Tăng zIndex)'
                                  >
                                    <ArrowUp className='w-3.5 h-3.5' />
                                  </button>
                                  <button
                                    type='button'
                                    onClick={() => handleChangeLayerZIndex(selectedElem, -1)}
                                    className='p-1.5 bg-white border border-[#E7E7E7] hover:bg-zinc-50 rounded text-zinc-700 cursor-pointer'
                                    title='Xuống 1 lớp (Giảm zIndex)'
                                  >
                                    <ArrowDown className='w-3.5 h-3.5' />
                                  </button>
                                </div>

                                <button
                                  type='button'
                                  onClick={() => handleDeleteLayer(selectedElem)}
                                  className='p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer'
                                  title='Xoá layer'
                                >
                                  <Trash2 className='w-3.5 h-3.5' />
                                </button>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Layer List Items */}
                        <div className='space-y-1.5'>
                          {pageElements
                            .slice()
                            .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
                            .map((el) => {
                              const isSelected = selectedElementId === el.elementId;
                              const bible = el.bibleEntryId
                                ? bibleEntries.find((b) => b.id === el.bibleEntryId)
                                : null;
                              return (
                                <div
                                  key={el.elementId}
                                  data-testid={`layer-item-${el.elementId}`}
                                  onClick={() => setSelectedElementId(el.elementId)}
                                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                    isSelected
                                      ? 'border-purple-500 bg-purple-50/50 shadow-xs ring-1 ring-purple-400'
                                      : 'border-[#E7E7E7] bg-white hover:border-purple-300'
                                  }`}
                                >
                                  <div className='flex items-center gap-2 min-w-0'>
                                    <div className='w-6 h-6 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600 shrink-0'>
                                      {el.elementType === 'CHARACTER_INSTANCE' && (
                                        <User className='w-3.5 h-3.5 text-purple-600' />
                                      )}
                                      {el.elementType === 'BACKGROUND' && (
                                        <Mountain className='w-3.5 h-3.5 text-emerald-600' />
                                      )}
                                      {el.elementType === 'PROP' && (
                                        <Package className='w-3.5 h-3.5 text-amber-600' />
                                      )}
                                      {el.elementType === 'EFFECT' && (
                                        <Zap className='w-3.5 h-3.5 text-red-500' />
                                      )}
                                      {el.elementType === 'ARTWORK_LAYER' && (
                                        <Palette className='w-3.5 h-3.5 text-blue-500' />
                                      )}
                                    </div>
                                    <div className='min-w-0'>
                                      <p className='font-bold text-zinc-800 text-[11px] truncate'>
                                        {bible
                                          ? bible.canonicalName
                                          : LAYER_LABELS[el.elementType] || el.elementType}
                                      </p>
                                      <div className='flex items-center gap-1.5 text-[9px] text-zinc-500'>
                                        <span className='font-mono'>z:{el.zIndex}</span>
                                        {el.rotation ? (
                                          <span className='font-mono'>• {el.rotation}°</span>
                                        ) : null}
                                        {el.panelId ? (
                                          <span className='bg-blue-50 text-blue-700 px-1 rounded'>
                                            Khung #
                                            {panels.find((p) => p.id === el.panelId)?.panelNumber ||
                                              '?'}
                                          </span>
                                        ) : (
                                          <span className='text-zinc-400'>Toàn trang</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div
                                    className='flex items-center gap-1'
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type='button'
                                      data-testid={`rotate-layer-${el.elementId}`}
                                      onClick={() => handleRotateLayer(el, 15)}
                                      className='p-1 text-zinc-400 hover:text-zinc-700 rounded hover:bg-zinc-100 cursor-pointer'
                                      title='Xoay +15°'
                                    >
                                      <RotateCw className='w-3 h-3' />
                                    </button>
                                    <button
                                      type='button'
                                      data-testid={`layer-up-${el.elementId}`}
                                      onClick={() => handleChangeLayerZIndex(el, 1)}
                                      className='p-1 text-zinc-400 hover:text-zinc-700 rounded hover:bg-zinc-100 cursor-pointer'
                                      title='Lên 1 lớp'
                                    >
                                      <ArrowUp className='w-3.5 h-3.5' />
                                    </button>
                                    <button
                                      type='button'
                                      data-testid={`layer-down-${el.elementId}`}
                                      onClick={() => handleChangeLayerZIndex(el, -1)}
                                      className='p-1 text-zinc-400 hover:text-zinc-700 rounded hover:bg-zinc-100 cursor-pointer'
                                      title='Xuống 1 lớp'
                                    >
                                      <ArrowDown className='w-3.5 h-3.5' />
                                    </button>
                                    <button
                                      type='button'
                                      data-testid={`delete-layer-${el.elementId}`}
                                      onClick={() => handleDeleteLayer(el)}
                                      className='p-1 text-zinc-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer'
                                      title='Xoá layer'
                                    >
                                      <Trash2 className='w-3.5 h-3.5' />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {!selectedPage && (
            <div className='flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-[#E7E7E7] shadow-xs my-6'>
              <div className='w-16 h-16 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400 mb-4'>
                <FileImage className='w-8 h-8' />
              </div>
              <h3 className='text-base font-bold text-zinc-800 mb-1'>Chọn một trang để bắt đầu</h3>
              <p className='text-xs text-zinc-500 max-w-sm'>
                {pages.length > 0
                  ? 'Vui lòng chọn một trang từ dải thumbnail phía trên để bắt đầu thao tác bố cục khung tranh.'
                  : 'Chương hiện tại chưa có trang truyện nào. Bấm "Thêm Trang Mới" để tạo trang đầu tiên.'}
              </p>
            </div>
          )}
        </>
      )}

      {/* Modal: Frame Template */}
      {selectedPage && (
        <FrameTemplateModal
          isOpen={frameTemplateModalOpen}
          onClose={() => setFrameTemplateModalOpen(false)}
          workspaceId={workspaceId || ''}
          pageId={selectedPage.id}
          pageNumber={selectedPage.pageNumber}
          hasExistingPanels={panels.length > 0}
          onApplied={(newPanels) => {
            setPanels(newPanels);
            if (newPanels.length > 0) {
              setSelectedPanelId(newPanels[0].id);
            }
          }}
          onShowToast={showToast}
        />
      )}

      {/* Modal: Create Page */}
      {createModalOpen && (
        <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4'>
          <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-2xl max-w-md w-full p-6 space-y-4'>
            <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
              <h3 className='text-sm font-bold text-[#171717]'>Tạo Trang Truyện Mới</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className='text-[#888888] hover:text-[#171717]'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
            <form onSubmit={handleCreatePage} className='space-y-3 text-xs'>
              <div>
                <label className='block font-semibold text-[#171717] mb-1'>
                  Số thứ tự trang (Page Number)
                </label>
                <input
                  type='number'
                  value={newPageNumber}
                  onChange={(e) => setNewPageNumber(parseInt(e.target.value, 10))}
                  className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg'
                  required
                />
              </div>
              <div>
                <label className='block font-semibold text-[#171717] mb-1'>
                  Kiểu bố cục (Layout Format)
                </label>
                <select
                  value={newLayoutFormat}
                  onChange={(e) => setNewLayoutFormat(e.target.value)}
                  className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg'
                >
                  <option value='StandardPage'>StandardPage (Trang đơn tiêu chuẩn)</option>
                  <option value='SpreadLeft'>SpreadLeft (Trang đôi - Nửa trái)</option>
                  <option value='SpreadRight'>SpreadRight (Trang đôi - Nửa phải)</option>
                  <option value='WebtoonScroll'>WebtoonScroll (Cuộn dọc)</option>
                </select>
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>Chiều rộng (px)</label>
                  <input
                    type='number'
                    value={newWidthPx}
                    onChange={(e) => setNewWidthPx(e.target.value)}
                    className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg'
                  />
                </div>
                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>Chiều cao (px)</label>
                  <input
                    type='number'
                    value={newHeightPx}
                    onChange={(e) => setNewHeightPx(e.target.value)}
                    className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg'
                  />
                </div>
              </div>
              <div>
                <label className='block font-semibold text-[#171717] mb-1'>Độ phân giải DPI</label>
                <select
                  value={newDpi}
                  onChange={(e) => setNewDpi(e.target.value)}
                  className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg'
                >
                  <option value='300'>300 DPI (Web &amp; Digital Preview)</option>
                  <option value='600'>600 DPI (B5 Tankōbon Print Standard)</option>
                </select>
              </div>
              <div className='flex justify-end gap-2 pt-2'>
                <button
                  type='button'
                  onClick={() => setCreateModalOpen(false)}
                  className='px-3 py-1.5 rounded-lg text-[#555555]'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  className='px-4 py-1.5 rounded-lg bg-blue-600 text-white font-semibold'
                >
                  Tạo Trang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Canvas Settings */}
      {settingsModalOpen && (
        <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4'>
          <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-2xl max-w-md w-full p-6 space-y-4'>
            <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
              <h3 className='text-sm font-bold text-[#171717]'>Cập Nhật Thông Số Canvas Trang</h3>
              <button
                onClick={() => setSettingsModalOpen(false)}
                className='text-[#888888] hover:text-[#171717]'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
            <form onSubmit={handleUpdateCanvas} className='space-y-3 text-xs'>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>Chiều rộng (px)</label>
                  <input
                    type='number'
                    value={editWidthPx}
                    onChange={(e) => setEditWidthPx(e.target.value)}
                    className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg'
                  />
                </div>
                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>Chiều cao (px)</label>
                  <input
                    type='number'
                    value={editHeightPx}
                    onChange={(e) => setEditHeightPx(e.target.value)}
                    className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg'
                  />
                </div>
              </div>
              <div>
                <label className='block font-semibold text-[#171717] mb-1'>Độ phân giải DPI</label>
                <select
                  value={editDpi}
                  onChange={(e) => setEditDpi(e.target.value)}
                  className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg'
                >
                  <option value='300'>300 DPI</option>
                  <option value='600'>600 DPI</option>
                </select>
              </div>
              <div className='flex justify-end gap-2 pt-2'>
                <button
                  type='button'
                  onClick={() => setSettingsModalOpen(false)}
                  className='px-3 py-1.5 rounded-lg text-[#555555]'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  className='px-4 py-1.5 rounded-lg bg-blue-600 text-white font-semibold'
                >
                  Lưu Canvas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Thêm Layer Ảnh / Element Mới (CF2) */}
      {createLayerModalOpen && (
        <div
          className='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4'
          data-testid='create-layer-modal'
        >
          <div className='bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E7E7E7] space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar'>
            <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
              <div className='flex items-center gap-2'>
                <div className='p-2 bg-purple-50 rounded-xl text-purple-700'>
                  <Layers className='w-4 h-4' />
                </div>
                <div>
                  <h3 className='font-bold text-sm text-[#171717]'>
                    Thêm Layer / Element Ảnh Canvas
                  </h3>
                  <p className='text-[11px] text-zinc-500'>
                    Tạo layer nhân vật, bối cảnh, đạo cụ hoặc hiệu ứng (CF2)
                  </p>
                </div>
              </div>
              <button
                type='button'
                onClick={() => setCreateLayerModalOpen(false)}
                className='p-1.5 rounded-lg text-[#888888] hover:bg-[#FAF8F5] cursor-pointer'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            <form onSubmit={handleCreateLayer} className='space-y-3 text-xs'>
              {/* Loại Layer */}
              <div>
                <label className='block font-semibold text-[#171717] mb-1'>
                  Loại Layer Ảnh (Master Data)
                </label>
                <select
                  value={newLayerType}
                  onChange={(e) => setNewLayerType(e.target.value as ImageLayerType)}
                  className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg bg-white font-medium'
                  data-testid='select-layer-type'
                >
                  {IMAGE_LAYER_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {LAYER_LABELS[t] || t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Neo vào Panel hoặc Toàn trang */}
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>
                    Gắn Với Panel (Tuỳ chọn)
                  </label>
                  <select
                    value={newLayerPanelId}
                    onChange={(e) => setNewLayerPanelId(e.target.value)}
                    className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg bg-white'
                    data-testid='select-layer-panel'
                  >
                    <option value=''>Toàn trang (Không thuộc panel)</option>
                    {panels.map((p) => (
                      <option key={p.id} value={p.id}>
                        Khung #{p.panelNumber} (Đọc #{p.readingOrder})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>
                    Mục Series Bible (Tuỳ chọn)
                  </label>
                  <select
                    value={newLayerBibleEntryId}
                    onChange={(e) => setNewLayerBibleEntryId(e.target.value)}
                    className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg bg-white'
                    data-testid='select-layer-bible-entry'
                  >
                    <option value=''>Không gắn mục Bible</option>
                    {bibleEntries.map((b) => (
                      <option key={b.id} value={b.id}>
                        [{b.category}] {b.canonicalName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ảnh Artwork Uploaded hoặc Link */}
              <div>
                <label className='block font-semibold text-[#171717] mb-1'>
                  Artwork Đã Tải Lên (AssetId)
                </label>
                <select
                  value={newLayerAssetId}
                  onChange={(e) => setNewLayerAssetId(e.target.value)}
                  className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg bg-white font-mono text-[11px]'
                  data-testid='select-layer-asset'
                >
                  <option value=''>Không dùng assetId sẵn có</option>
                  {pageArtworks.map((a) => (
                    <option key={a.id} value={a.id}>
                      v{a.versionNumber} ({a.stageName}){' '}
                      {a.panelId ? `[Panel ${a.panelId.slice(0, 6)}]` : '[Toàn trang]'}
                    </option>
                  ))}
                </select>
              </div>

              {/* URL ảnh / Mô tả ghi chú */}
              <div>
                <label className='block font-semibold text-[#171717] mb-1'>
                  Đường Dẫn Ảnh (URL) Hoặc Ghi Chú
                </label>
                <input
                  type='text'
                  value={newLayerContent}
                  onChange={(e) => setNewLayerContent(e.target.value)}
                  placeholder='https://... hoặc data:image/... hoặc mô tả layer'
                  className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg font-mono text-[11px]'
                  data-testid='input-layer-content'
                />
              </div>

              {/* Vị trí X, Y */}
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>Toạ độ X (px)</label>
                  <input
                    type='number'
                    value={newLayerX}
                    onChange={(e) => setNewLayerX(parseFloat(e.target.value) || 0)}
                    className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg font-mono'
                    data-testid='input-layer-x'
                  />
                </div>
                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>Toạ độ Y (px)</label>
                  <input
                    type='number'
                    value={newLayerY}
                    onChange={(e) => setNewLayerY(parseFloat(e.target.value) || 0)}
                    className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg font-mono'
                    data-testid='input-layer-y'
                  />
                </div>
              </div>

              {/* Kích thước Rộng, Cao */}
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>Chiều rộng (px)</label>
                  <input
                    type='number'
                    value={newLayerWidth}
                    onChange={(e) => setNewLayerWidth(parseFloat(e.target.value) || 100)}
                    className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg font-mono'
                    data-testid='input-layer-w'
                  />
                </div>
                <div>
                  <label className='block font-semibold text-[#171717] mb-1'>Chiều cao (px)</label>
                  <input
                    type='number'
                    value={newLayerHeight}
                    onChange={(e) => setNewLayerHeight(parseFloat(e.target.value) || 100)}
                    className='w-full px-3 py-2 border border-[#E7E7E7] rounded-lg font-mono'
                    data-testid='input-layer-h'
                  />
                </div>
              </div>

              {/* Góc xoay */}
              <div>
                <label className='block font-semibold text-[#171717] mb-1'>
                  Góc Xoay (Độ, 0 - 359°):{' '}
                  <span className='font-mono text-purple-700 font-bold'>{newLayerRotation}°</span>
                </label>
                <div className='flex items-center gap-3'>
                  <input
                    type='range'
                    min='0'
                    max='359'
                    value={newLayerRotation}
                    onChange={(e) => setNewLayerRotation(parseInt(e.target.value, 10))}
                    className='flex-1 accent-purple-600'
                  />
                  <input
                    type='number'
                    min='0'
                    max='359'
                    value={newLayerRotation}
                    onChange={(e) => setNewLayerRotation(parseInt(e.target.value, 10) || 0)}
                    className='w-20 px-2 py-1 border border-[#E7E7E7] rounded font-mono text-center'
                    data-testid='input-layer-rotation'
                  />
                </div>
              </div>

              <div className='flex justify-end gap-2 pt-3 border-t border-[#E7E7E7]'>
                <button
                  type='button'
                  onClick={() => setCreateLayerModalOpen(false)}
                  className='px-3 py-1.5 rounded-lg text-[#555555] hover:bg-zinc-100 cursor-pointer'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  className='px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors cursor-pointer shadow-xs'
                  data-testid='submit-create-layer'
                >
                  Tạo Layer Ảnh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File input ẩn tải ảnh panel */}
      <input
        ref={panelFileInputRef}
        type='file'
        accept='image/png,image/jpeg,image/webp'
        className='hidden'
        data-testid='desk-panel-file-input'
        onChange={handlePanelFileSelected}
      />
    </div>
  );
};

export default ArtistDeskView;
