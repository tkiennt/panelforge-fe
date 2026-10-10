import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Columns,
  Eye,
  HelpCircle,
  Layers,
  Loader2,
  Lock,
  Maximize2,
  MessageSquare,
  Minimize2,
  MinusCircle,
  Move,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  Undo2,
  Unlock,
  XCircle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type {
  AssetReferenceDto,
  AssignmentDto,
  ChangeRequestDto,
  ConsistencyFindingDto,
  PanelDto,
  StageProgressDto,
  SubmissionDto,
} from '@/types';
import { assignmentService } from '@/services/assignment.service';
import { artworkService, resolveArtworkUrl } from '@/services/artwork.service';
import { panelService } from '@/services/panel.service';
import { workspaceService, type WorkspaceMemberDto } from '@/services/workspace.service';
import { seriesService } from '@/services/series.service';
import { authService } from '@/services/auth.service';
import { normalizeWorkspaceRole, getRoleFromToken } from '@/types';
import {
  errorMessage,
  getWorkActions,
  resolvePageId,
} from '@/shared/features/collaboration/collaborationRules';
import { parseBoundingBox } from '@/shared/utils/panelBoundingBox';
import { PreviewLinksModal } from '@/shared/modals/PreviewLinksModal';

interface ReviewViewProps {
  currentUserId?: string | null;
  workspaceRole?: string | null;
  onShowToast?: (title: string, desc: string) => void;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DraftRegion {
  key: number;
  box: Box;
  description: string;
  assetReferenceId?: string;
  panelId?: string | null;
}

type Tab = 'changes' | 'consistency';
type CompareMode = 'side-by-side' | 'swipe' | 'onion-skin';

const parseRegion = (json?: string | null): Box | null => {
  if (!json) return null;
  try {
    const r = JSON.parse(json);
    return [r.x, r.y, r.w, r.h].every((n) => typeof n === 'number') ? r : null;
  } catch {
    return null;
  }
};

/**
 * Ghép ảnh các Panel lên khổ 1200×1800 khi submission không có ảnh cả trang (CF2 / Mục 3).
 * Lưu ý bắt buộc:
 * - Kiểm tra đơn vị boundingBox (px hay %) qua parseBoundingBox
 * - Chỉ lấy các ảnh panel thuộc submission.artworkReferenceIds, không lấy bản mới nhất ngoài submission.
 */
async function buildCompositeSubmissionArtwork(
  chapterId: string,
  submission: SubmissionDto,
  submissionPanelArts: AssetReferenceDto[],
  panels: PanelDto[],
): Promise<{ artwork: AssetReferenceDto; dataUrl: string } | null> {
  const CANVAS_W = 1200;
  const CANVAS_H = 1800;
  let dataUrl = '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext ? canvas.getContext('2d') : null;
    if (ctx) {
      // 1. Nền trắng
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // 2. Vẽ từng panel và ghép ảnh tương ứng
      for (const panel of panels) {
        // Kiểm tra đơn vị boundingBox (px hay %)
        const box = parseBoundingBox(panel.boundingBox, CANVAS_W, CANVAS_H);

        // Vẽ viền panel
        ctx.strokeStyle = '#171717';
        ctx.lineWidth = 2;
        ctx.strokeRect(box.pixelX, box.pixelY, box.pixelW, box.pixelH);

        // Chỉ lấy ảnh panel thuộc submission.artworkReferenceIds, không lấy bản mới nhất
        const panelArt = submissionPanelArts.find((a) => a.panelId === panel.id);
        if (panelArt) {
          try {
            const link = await artworkService.getArtworkAccessLink(chapterId, panelArt.id);
            const url = resolveArtworkUrl(link.url);
            await new Promise<void>((resolve) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => {
                ctx.drawImage(img, box.pixelX, box.pixelY, box.pixelW, box.pixelH);
                resolve();
              };
              img.onerror = () => resolve();
              img.src = url;
            });
          } catch {
            // bỏ qua lỗi nếu 1 ảnh panel không tải được
          }
        }
      }
      dataUrl = canvas.toDataURL('image/png');
    }
  } catch {
    // fallback an toàn khi môi trường không có canvas đầy đủ
  }

  const compositeArt: AssetReferenceDto = {
    id: `composite-sub-${submission.id}`,
    assetId: `composite-asset-${submission.id}`,
    chapterId,
    pageId: submissionPanelArts[0]?.pageId || '',
    pipelineStageId: submissionPanelArts[0]?.pipelineStageId || '',
    versionNumber: submission.attemptNumber,
    fileName: `Trang ghép Panel (Lần nộp ${submission.attemptNumber})`,
    contentType: 'image/png',
    sizeBytes: 0,
    sha256: '',
    reused: false,
    uploadedByUserId: submission.submittedByUserId || '',
    createdAt: submission.submittedAt || new Date().toISOString(),
  };

  return { artwork: compositeArt, dataUrl };
}

const parsePanelNormalizedBox = (bboxJson?: string | null): Box | null => {
  if (!bboxJson) return null;
  try {
    const parsed = parseBoundingBox(bboxJson);
    return {
      x: parsed.percentX / 100,
      y: parsed.percentY / 100,
      w: parsed.percentW / 100,
      h: parsed.percentH / 100,
    };
  } catch {
    return null;
  }
};

const calculateOverlappingPanelId = (box: Box, panels: PanelDto[]): string | undefined => {
  let maxArea = 0;
  let bestPanelId: string | undefined = undefined;
  for (const p of panels) {
    const pBox = parsePanelNormalizedBox(p.boundingBox);
    if (!pBox) continue;
    const ox = Math.max(0, Math.min(box.x + box.w, pBox.x + pBox.w) - Math.max(box.x, pBox.x));
    const oy = Math.max(0, Math.min(box.y + box.h, pBox.y + pBox.h) - Math.max(box.y, pBox.y));
    const area = ox * oy;
    if (area > maxArea) {
      maxArea = area;
      bestPanelId = p.id;
    }
  }
  return bestPanelId;
};

const round = (n: number) => Math.round(n * 10000) / 10000;

const SEVERITY_STYLE: Record<string, string> = {
  Blocking: 'bg-red-50 text-red-700 border-red-200',
  Warning: 'bg-amber-50 text-amber-700 border-amber-200',
  Info: 'bg-zinc-100 text-zinc-600 border-zinc-200',
};

const FINDING_LABEL: Record<string, string> = {
  Open: 'Chưa xử lý',
  Confirmed: 'Đã xác nhận',
  Rejected: 'Bác bỏ',
  Ignored: 'Bỏ qua',
  NeedsClarification: 'Cần làm rõ',
  Resolved: 'Đã sửa',
  Stale: 'Lỗi thời',
};

const OPEN_FINDING = ['Open', 'Confirmed', 'NeedsClarification'];

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });

/**
 * Màn duyệt của Editor/Producer (CF3): so sánh phiên bản artwork, khoanh vùng trên đúng phiên bản,
 * zoom/pan đồng bộ, chế độ swipe/onion-skin, đối chiếu pixel canvas, duyệt/trả về có kiểm tra phiên bản lần nộp (concurrency).
 */
export const ReviewView: React.FC<ReviewViewProps> = ({
  currentUserId,
  workspaceRole,
  onShowToast,
}) => {
  const { taskId, workspaceId, wsId, seriesId } = useParams<{
    taskId?: string;
    workspaceId?: string;
    wsId?: string;
    seriesId?: string;
  }>();
  const effectiveWsId = workspaceId || wsId;
  const [search] = useSearchParams();
  const chapterId = search.get('chapterId');
  const navigate = useNavigate();

  // Tự nạp và duy trì vai trò người dùng trong Workspace (hỗ trợ mở trực tiếp bằng URL hoặc F5)
  const [selfWorkspaceRole, setSelfWorkspaceRole] = useState<string | null>(() => {
    if (workspaceRole) return workspaceRole;
    try {
      const saved = localStorage.getItem('activeWorkspace');
      if (saved) {
        const ws = JSON.parse(saved);
        if (!effectiveWsId || ws.id === effectiveWsId) {
          return normalizeWorkspaceRole(ws.currentUserRole) || (ws.isOwner ? 'PRODUCER' : null);
        }
      }
    } catch {
      /* ignore */
    }
    const tokenRole = getRoleFromToken();
    if (tokenRole === 'ADMINISTRATOR') return 'PRODUCER';
    return null;
  });

  const [selfUserId, setSelfUserId] = useState<string | null>(() => {
    if (currentUserId) return currentUserId;
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u?.id) return u.id;
      }
    } catch {
      /* ignore */
    }
    try {
      const token = localStorage.getItem('token');
      if (token && token.includes('.')) {
        const p = JSON.parse(atob(token.split('.')[1]));
        return (
          p.sub ||
          p.nameid ||
          p['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
          p.id ||
          null
        );
      }
    } catch {
      /* ignore */
    }
    return null;
  });

  useEffect(() => {
    if (workspaceRole) setSelfWorkspaceRole(workspaceRole);
  }, [workspaceRole]);

  useEffect(() => {
    if (currentUserId) setSelfUserId(currentUserId);
  }, [currentUserId]);

  const effectiveRole = workspaceRole || selfWorkspaceRole;
  const effectiveUser = currentUserId || selfUserId;

  const [assignment, setAssignment] = useState<AssignmentDto | null>(null);
  const [artworks, setArtworks] = useState<AssetReferenceDto[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionDto[]>([]);
  const [members, setMembers] = useState<WorkspaceMemberDto[]>([]);
  const [panels, setPanels] = useState<PanelDto[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [previousId, setPreviousId] = useState<string | null>(null);
  const [changeRequests, setChangeRequests] = useState<ChangeRequestDto[]>([]);
  const [findings, setFindings] = useState<ConsistencyFindingDto[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [naturalSizes, setNaturalSizes] = useState<Record<string, { w: number; h: number }>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>('changes');
  const [crFilter, setCrFilter] = useState<'all' | 'version'>('all');
  const [activeChangeRequestId, setActiveChangeRequestId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftRegion[]>([]);
  const [comment, setComment] = useState('');
  const [isPreviewFeedbackOpen, setIsPreviewFeedbackOpen] = useState(false);
  const [drawing, setDrawing] = useState<{ start: { x: number; y: number }; box: Box } | null>(
    null,
  );
  const [drawingHint, setDrawingHint] = useState<string | null>(null);
  const drawingRef = useRef<{ start: { x: number; y: number }; box: Box } | null>(null);
  const drawingHintTimerRef = useRef<NodeJS.Timeout | number | null>(null);
  const currentImageWrapperRef = useRef<HTMLDivElement | null>(null);
  const draftKey = useRef(0);

  // So sánh & Tương tác nâng cao (Phase 1 & Phase 2)
  const [compareMode, setCompareMode] = useState<CompareMode>('side-by-side');
  const [swipePos, setSwipePos] = useState(50); // 0–100%
  const [onionOpacity, setOnionOpacity] = useState(50); // 0–100%
  const [isDrawTool, setIsDrawTool] = useState(true);
  const [zoomSync, setZoomSync] = useState(true);
  const [zoomTransform, setZoomTransform] = useState<{ scale: number; x: number; y: number }>({
    scale: 1,
    x: 0,
    y: 0,
  });
  const [prevTransform, setPrevTransform] = useState<{ scale: number; x: number; y: number }>({
    scale: 1,
    x: 0,
    y: 0,
  });
  const [isPanning, setIsPanning] = useState(false);
  const isPanningRef = useRef(false);
  const zoomSyncRef = useRef(zoomSync);
  const panStartRef = useRef<{ clientX: number; clientY: number; x: number; y: number } | null>(
    null,
  );
  const comparisonContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Pixel Diff (Phase 2)
  const [diffResultUrl, setDiffResultUrl] = useState<string | null>(null);
  const [diffStats, setDiffStats] = useState<{
    diffPixels: number;
    totalPixels: number;
    percent: number;
  } | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffMessage, setDiffMessage] = useState<string | null>(null);
  const [showDiffOverlay, setShowDiffOverlay] = useState(false);

  const toastRef = useRef(onShowToast);
  useEffect(() => {
    toastRef.current = onShowToast;
  }, [onShowToast]);

  const toast = useCallback((title: string, desc: string) => toastRef.current?.(title, desc), []);

  // Theo dõi toàn màn hình
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const load = useCallback(async () => {
    if (!chapterId || !taskId) return;
    setLoading(true);
    setError(null);
    try {
      const [list, crs, fs, subs] = await Promise.all([
        assignmentService.getAssignments(chapterId),
        assignmentService.getChangeRequests(chapterId, { assignmentId: taskId }),
        assignmentService.getConsistencyFindings(chapterId),
        assignmentService.getSubmissions(chapterId, taskId),
      ]);
      const sortedSubs = [...subs].sort((x, y) => x.attemptNumber - y.attemptNumber);
      setSubmissions(sortedSubs);
      const a = list.find((x) => x.id === taskId) ?? null;
      setAssignment(a);
      setChangeRequests(crs);
      setFindings(fs);

      // Tự động xác định targetWsId khi mở qua URL trực tiếp hoặc F5
      let targetWsId = effectiveWsId;
      if (!targetWsId && a?.seriesId) {
        try {
          const s = await seriesService.getSeriesById(a.seriesId);
          if (s?.workspaceId) {
            targetWsId = s.workspaceId;
          }
        } catch {
          /* ignore */
        }
      } else if (!targetWsId && seriesId) {
        try {
          const s = await seriesService.getSeriesById(seriesId);
          if (s?.workspaceId) {
            targetWsId = s.workspaceId;
          }
        } catch {
          /* ignore */
        }
      }

      // Tự nạp vai trò trong Workspace nếu mở URL trực tiếp hoặc F5
      if (targetWsId) {
        try {
          const [wsInfo, workspaceMembers] = await Promise.all([
            workspaceService.getWorkspaceById(targetWsId).catch(() => null),
            workspaceService.getMembers(targetWsId).catch(() => []),
          ]);
          setMembers(workspaceMembers);

          if (wsInfo) {
            const derivedRole = wsInfo.isOwner
              ? 'PRODUCER'
              : normalizeWorkspaceRole(wsInfo.currentUserRole);
            if (derivedRole) {
              setSelfWorkspaceRole((prev) => prev || derivedRole);
            }
            try {
              localStorage.setItem('activeWorkspace', JSON.stringify(wsInfo));
            } catch {
              /* ignore */
            }
          }

          // Đối chiếu trong danh sách thành viên nếu getWorkspaceById chưa trả vai trò
          if (!effectiveRole && workspaceMembers.length > 0) {
            const myId = effectiveUser;
            let myEmail: string | undefined;
            try {
              myEmail = JSON.parse(localStorage.getItem('user') || '{}')?.email;
            } catch {
              /* ignore */
            }
            const matchedMember = workspaceMembers.find(
              (m) =>
                (myId && m.userId === myId) ||
                (myEmail && m.email?.toLowerCase() === myEmail.toLowerCase()),
            );
            if (matchedMember) {
              const memberRole = matchedMember.isOwner
                ? 'PRODUCER'
                : normalizeWorkspaceRole(matchedMember.role);
              if (memberRole) {
                setSelfWorkspaceRole((prev) => prev || memberRole);
              }
            }
          }
        } catch (err) {
          console.warn('ReviewView: Không thể nạp thông tin workspace/thành viên:', err);
        }
      }

      // Fallback nạp thông tin vai trò qua landing-context
      if (!effectiveRole || !effectiveUser) {
        try {
          const landing = await authService.getLandingContext();
          if (landing) {
            if (landing.userId && !effectiveUser) {
              setSelfUserId(landing.userId);
            }
            if (targetWsId) {
              const matchWs = landing.workspaces?.find((w) => w.workspaceId === targetWsId);
              if (matchWs?.role) {
                const r = normalizeWorkspaceRole(matchWs.role);
                if (r) setSelfWorkspaceRole((prev) => prev || r);
              }
            }
            if (landing.systemRole === 'ADMINISTRATOR') {
              setSelfWorkspaceRole((prev) => prev || 'PRODUCER');
            }
          }
        } catch {
          /* ignore */
        }
      }

      if (a) {
        const progress: StageProgressDto[] =
          String(a.entityType) === 'Panel'
            ? await assignmentService.getStageProgress(chapterId)
            : [];
        const pageId = resolvePageId(a, progress);
        const [arts, pagePanels] = await Promise.all([
          pageId ? artworkService.getArtworks(chapterId, pageId, a.pipelineStageId) : [],
          pageId ? panelService.getPanelsByPage(pageId).catch(() => []) : [],
        ]);
        setPanels(pagePanels);

        // Màn so sánh ưu tiên artwork cả trang; nếu lần nộp chỉ có Panel thì ghép ảnh từ submission.artworkReferenceIds
        const pageArts = arts
          .filter((x) => !x.panelId)
          .sort((x, y) => x.versionNumber - y.versionNumber);

        const compositeArts: AssetReferenceDto[] = [];
        const newUrls: Record<string, string> = {};

        for (const s of sortedSubs) {
          const hasWholePage = arts.some(
            (x) => !x.panelId && s.artworkReferenceIds?.includes(x.id),
          );
          if (!hasWholePage && s.artworkReferenceIds && s.artworkReferenceIds.length > 0) {
            // Lấy theo submission.artworkReferenceIds, không lấy bản mới nhất ngoài submission
            const submissionPanelArts = arts.filter(
              (x) => x.panelId && s.artworkReferenceIds?.includes(x.id),
            );
            if (submissionPanelArts.length > 0) {
              const composite = await buildCompositeSubmissionArtwork(
                chapterId,
                s,
                submissionPanelArts,
                pagePanels,
              );
              if (composite) {
                compositeArts.push(composite.artwork);
                if (composite.dataUrl) {
                  newUrls[composite.artwork.id] = composite.dataUrl;
                }
              }
            }
          }
        }

        if (Object.keys(newUrls).length > 0) {
          setUrls((prev) => ({ ...prev, ...newUrls }));
        }

        const allReviewArts = [...pageArts, ...compositeArts].sort((x, y) => {
          if (x.versionNumber !== y.versionNumber) {
            return x.versionNumber - y.versionNumber;
          }
          return new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime();
        });
        setArtworks(allReviewArts);

        // CF3: Nguyên tắc dữ liệu bắt buộc:
        // Bản đang duyệt = artwork từ artworkReferenceIds của lần nộp Pending mới nhất
        const pendingSub = [...sortedSubs]
          .reverse()
          .find((s) => s.status === 'Pending' || s.status === 0);
        const decidedSubs = sortedSubs.filter(
          (s) =>
            s.status === 'Approved' || s.status === 'Rejected' || s.status === 1 || s.status === 2,
        );
        const lastDecidedSub = decidedSubs[decidedSubs.length - 1];

        const versionOf = (s?: SubmissionDto) => {
          if (!s) return undefined;
          const directArt = allReviewArts.find((x) => s.artworkReferenceIds?.includes(x.id));
          if (directArt) return directArt;
          return allReviewArts.find((x) => x.id === `composite-sub-${s.id}`);
        };

        const cur =
          versionOf(pendingSub) ??
          versionOf(sortedSubs[sortedSubs.length - 1]) ??
          allReviewArts[allReviewArts.length - 1];

        const prev =
          versionOf(lastDecidedSub) ??
          (cur
            ? allReviewArts.filter((x) => x.versionNumber < cur.versionNumber).pop()
            : allReviewArts[allReviewArts.length - 2]);

        setCurrentId(cur?.id ?? null);
        setPreviousId(prev?.id ?? null);
      }
    } catch (err) {
      setError(errorMessage(err, 'Không thể tải dữ liệu duyệt.'));
    } finally {
      setLoading(false);
    }
  }, [chapterId, taskId, effectiveWsId, seriesId, effectiveRole, effectiveUser]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = artworks.find((x) => x.id === currentId) ?? null;
  const previous = artworks.find((x) => x.id === previousId) ?? null;

  const currentRef = useRef<AssetReferenceDto | null>(null);
  const panelsRef = useRef<PanelDto[]>([]);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEffect(() => {
    panelsRef.current = panels;
  }, [panels]);

  useEffect(() => {
    drawingRef.current = drawing;
  }, [drawing]);

  useEffect(() => {
    isPanningRef.current = isPanning;
  }, [isPanning]);

  useEffect(() => {
    zoomSyncRef.current = zoomSync;
  }, [zoomSync]);

  const pendingSub = useMemo(
    () => [...submissions].reverse().find((s) => s.status === 'Pending' || s.status === 0),
    [submissions],
  );

  /** "lần nộp N" của một phiên bản (nếu phiên bản đó từng được nộp). */
  const attemptOf = useCallback(
    (artId?: string) =>
      submissions
        .filter(
          (s) =>
            artId && (s.artworkReferenceIds?.includes(artId) || artId === `composite-sub-${s.id}`),
        )
        .map((s) => s.attemptNumber),
    [submissions],
  );

  const label = useCallback(
    (a: AssetReferenceDto) => {
      const n = attemptOf(a.id);
      return `v${a.versionNumber}${n.length ? ` · lần nộp ${n.join(', ')}` : ''}`;
    },
    [attemptOf],
  );

  const getVersionBadge = useCallback(
    (a: AssetReferenceDto) => {
      const isLatest = a.id === artworks[artworks.length - 1]?.id;
      const isPending = submissions.some(
        (s) =>
          (s.status === 'Pending' || s.status === 0) &&
          (s.artworkReferenceIds?.includes(a.id) || a.id === `composite-sub-${s.id}`),
      );
      const isApproved = submissions.some(
        (s) =>
          (s.status === 'Approved' || s.status === 1) &&
          (s.artworkReferenceIds?.includes(a.id) || a.id === `composite-sub-${s.id}`),
      );
      const isRejected = submissions.some(
        (s) =>
          (s.status === 'Rejected' || s.status === 2) &&
          (s.artworkReferenceIds?.includes(a.id) || a.id === `composite-sub-${s.id}`),
      );
      if (isPending) return 'Đang duyệt';
      if (isApproved) return 'Đã duyệt';
      if (isRejected) return 'Bị trả về';
      if (isLatest) return 'Mới nhất';
      return null;
    },
    [artworks, submissions],
  );

  const formatVersionOption = useCallback(
    (a: AssetReferenceDto) => {
      const n = attemptOf(a.id);
      const member = members.find((m) => m.userId === a.uploadedByUserId);
      const uploader = member?.fullName || member?.email || a.uploadedByUserId;
      const badge = getVersionBadge(a);
      const dateStr = new Date(a.createdAt).toLocaleDateString('vi-VN');
      return `v${a.versionNumber}${n.length ? ` · lần nộp ${n.join(', ')}` : ''} · ${uploader} (${dateStr})${badge ? ` [${badge}]` : ''}`;
    },
    [attemptOf, members, getVersionBadge],
  );

  // Link xem ảnh ngắn hạn (BR-16), xin theo từng phiên bản đang hiển thị
  useEffect(() => {
    if (!chapterId) return;
    for (const art of [current, previous]) {
      if (!art || urls[art.id]) continue;
      artworkService
        .getArtworkAccessLink(chapterId, art.id)
        .then((link) => setUrls((u) => ({ ...u, [art.id]: resolveArtworkUrl(link.url) })))
        .catch(() => undefined);
    }
  }, [chapterId, current, previous, urls]);

  // Kích thước tự nhiên (natural size) để cảnh báo khác kích thước
  const prevSize = previous ? naturalSizes[previous.id] : null;
  const curSize = current ? naturalSizes[current.id] : null;
  const isSizeMismatch =
    prevSize && curSize && (prevSize.w !== curSize.w || prevSize.h !== curSize.h);

  const actions = useMemo(
    () =>
      assignment
        ? getWorkActions(assignment, {
            userId: effectiveUser,
            workspaceRole: effectiveRole,
            changeRequests,
            hasCurrentArtwork: null,
          })
        : null,
    [assignment, effectiveUser, effectiveRole, changeRequests],
  );
  const canDraw = !!actions?.canDecide && !!current;
  const canTriage = !!actions?.isReviewer;

  const run = async (fn: () => Promise<unknown>, title: string, desc: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      toast(title, desc);
      await load();
      return true;
    } catch (err) {
      setError(errorMessage(err, 'Thao tác thất bại.'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  // ── Zoom & Pan helpers ──
  const resetZoom = () => {
    setZoomTransform({ scale: 1, x: 0, y: 0 });
    setPrevTransform({ scale: 1, x: 0, y: 0 });
  };

  const handleZoom = (delta: number) => {
    setZoomTransform((t) => {
      const nextScale = Math.min(4, Math.max(0.5, round(t.scale + delta)));
      return { ...t, scale: nextScale };
    });
    if (!zoomSync) {
      setPrevTransform((t) => {
        const nextScale = Math.min(4, Math.max(0.5, round(t.scale + delta)));
        return { ...t, scale: nextScale };
      });
    }
  };

  const toggleFullscreen = async () => {
    if (!comparisonContainerRef.current) return;
    if (!document.fullscreenElement) {
      await comparisonContainerRef.current.requestFullscreen().catch(() => undefined);
    } else {
      await document.exitFullscreen().catch(() => undefined);
    }
  };

  // ── Tính toán toạ độ và vẽ vùng (Chuẩn hoá 0–1 theo ảnh gốc) ──
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Nếu bấm trúng hộp yêu cầu sửa hoặc phần tử tương tác bên trong thì không bắt đầu vẽ
    if ((e.target as HTMLElement).closest('[data-change-request-box]')) {
      return;
    }

    currentImageWrapperRef.current = e.currentTarget;
    const rect = e.currentTarget.getBoundingClientRect();
    const p = {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };

    // Nếu giữ Shift hoặc đang bật công cụ vẽ: khoanh vùng
    if (canDraw && (isDrawTool || e.shiftKey)) {
      const initialDrawing = { start: p, box: { x: p.x, y: p.y, w: 0, h: 0 } };
      drawingRef.current = initialDrawing;
      setDrawing(initialDrawing);
      setDrawingHint(null);
      return;
    }
    // Ngược lại: Pan kéo ảnh
    isPanningRef.current = true;
    setIsPanning(true);
    panStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      x: zoomTransform.x,
      y: zoomTransform.y,
    };
  };

  const onMouseDownPrev = (e: React.MouseEvent<HTMLDivElement>) => {
    isPanningRef.current = true;
    setIsPanning(true);
    panStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      x: prevTransform.x,
      y: prevTransform.y,
    };
  };

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      // 1. Khoanh vùng: bắt sự kiện trên toàn cửa sổ và giới hạn toạ độ trong khoảng 0-1
      if (drawingRef.current && currentImageWrapperRef.current) {
        const rect = currentImageWrapperRef.current.getBoundingClientRect();
        const width = rect.width > 0 ? rect.width : 1;
        const height = rect.height > 0 ? rect.height : 1;
        const curX = Math.min(1, Math.max(0, (e.clientX - rect.left) / width));
        const curY = Math.min(1, Math.max(0, (e.clientY - rect.top) / height));
        const start = drawingRef.current.start;
        const box: Box = {
          x: Math.min(curX, start.x),
          y: Math.min(curY, start.y),
          w: Math.abs(curX - start.x),
          h: Math.abs(curY - start.y),
        };
        const nextDrawing = { start, box };
        drawingRef.current = nextDrawing;
        setDrawing(nextDrawing);
        return;
      }

      // 2. Pan ảnh
      if (isPanningRef.current && panStartRef.current) {
        const dx = e.clientX - panStartRef.current.clientX;
        const dy = e.clientY - panStartRef.current.clientY;
        const nextX = panStartRef.current.x + dx;
        const nextY = panStartRef.current.y + dy;
        setZoomTransform((t) => ({ ...t, x: nextX, y: nextY }));
        if (zoomSyncRef.current) {
          setPrevTransform((t) => ({ ...t, x: nextX, y: nextY }));
        }
      }
    };

    const handleWindowMouseUp = () => {
      // Kết thúc Pan
      if (isPanningRef.current) {
        isPanningRef.current = false;
        setIsPanning(false);
        panStartRef.current = null;
      }

      // Kết thúc khoanh vùng
      if (drawingRef.current) {
        const activeDrawing = drawingRef.current;
        drawingRef.current = null;
        setDrawing(null);

        const { box } = activeDrawing;
        // Click không kéo: hiện gợi ý "Kéo chuột để khoanh vùng"
        if (box.w < 0.01 || box.h < 0.01) {
          setDrawingHint('Kéo chuột để khoanh vùng');
          toastRef.current?.('Gợi ý khoanh vùng', 'Kéo chuột để khoanh vùng');
          if (drawingHintTimerRef.current) {
            clearTimeout(drawingHintTimerRef.current as any);
          }
          drawingHintTimerRef.current = setTimeout(() => {
            setDrawingHint(null);
          }, 3000);
          return;
        }

        // Tạo draft region nếu box hợp lệ
        if (currentRef.current) {
          draftKey.current += 1;
          const normalizedBox = {
            x: round(box.x),
            y: round(box.y),
            w: round(box.w),
            h: round(box.h),
          };
          const matchedPanelId = calculateOverlappingPanelId(normalizedBox, panelsRef.current);
          const isComposite = currentRef.current.id.startsWith('composite-');
          setDrafts((d) => [
            ...d,
            {
              key: draftKey.current,
              box: normalizedBox,
              description: '',
              assetReferenceId: isComposite ? undefined : currentRef.current!.id,
              panelId: matchedPanelId,
            },
          ]);
          setTab('changes');
        }
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      if (drawingHintTimerRef.current) {
        clearTimeout(drawingHintTimerRef.current as any);
      }
    };
  }, []);

  // ── Hành động Duyệt & Trả về (với chống xung đột expectedSubmissionId) ──
  const onApprove = async () => {
    if (!chapterId || !assignment) return;
    // Tải lại kiểm tra concurrency trước khi duyệt
    const latestSubs = await assignmentService.getSubmissions(chapterId, assignment.id);
    const latestPending = [...latestSubs]
      .reverse()
      .find((s) => s.status === 'Pending' || s.status === 0);

    if (pendingSub && (!latestPending || latestPending.id !== pendingSub.id)) {
      setError(
        'Đã có lần nộp mới trong lúc bạn đang xem. Vui lòng tải lại dữ liệu trước khi duyệt.',
      );
      return;
    }

    await run(
      () => assignmentService.approveAssignment(chapterId, assignment.id, pendingSub?.id),
      'Đã duyệt',
      assignment.brief,
    );
  };

  const sendBack = async () => {
    if (!chapterId || !assignment) return;
    if (!comment.trim()) {
      setError('Trả về bắt buộc có nhận xét chung (BR-06).');
      return;
    }
    if (drafts.some((d) => !d.description.trim())) {
      setError('Mỗi vùng khoanh cần một mô tả yêu cầu sửa.');
      return;
    }

    // Tải lại kiểm tra concurrency trước khi trả về
    const latestSubs = await assignmentService.getSubmissions(chapterId, assignment.id);
    const latestPending = [...latestSubs]
      .reverse()
      .find((s) => s.status === 'Pending' || s.status === 0);

    if (pendingSub && (!latestPending || latestPending.id !== pendingSub.id)) {
      setError(
        'Đã có lần nộp mới trong lúc bạn đang xem. Vui lòng tải lại dữ liệu trước khi trả về.',
      );
      return;
    }

    const ok = await run(
      () =>
        assignmentService.requestChanges(chapterId, assignment.id, {
          comment: comment.trim(),
          ...(pendingSub?.id ? { expectedSubmissionId: pendingSub.id } : {}),
          changes: drafts.length
            ? drafts.map((d) => {
                const isComposite = d.assetReferenceId?.startsWith('composite-');
                return {
                  description: d.description.trim(),
                  regionJson: JSON.stringify(d.box),
                  assetReferenceId: isComposite ? undefined : d.assetReferenceId,
                  ...(d.panelId ? { panelId: d.panelId } : {}),
                };
              })
            : undefined,
        }),
      'Đã trả về',
      `${drafts.length || 1} yêu cầu sửa đã gửi cho người làm.`,
    );
    if (ok) {
      setDrafts([]);
      setComment('');
    }
  };

  // ── Xử lý Change Request: Xác minh đạt & Mở lại ──
  const verifyChangeRequest = async (cr: ChangeRequestDto) => {
    if (!chapterId) return;
    const note = window.prompt('Ghi chú xác minh đạt (tuỳ chọn):');
    if (note === null) return; // Bấm Cancel
    await run(
      () => assignmentService.verifyChangeRequest(chapterId, cr.id, note.trim() || undefined),
      'Đã xác minh đạt',
      `Yêu cầu "${cr.description}" đã đạt tiêu chuẩn.`,
    );
  };

  const reopenChangeRequest = async (cr: ChangeRequestDto) => {
    if (!chapterId) return;
    const reason = window.prompt('Lý do mở lại yêu cầu sửa (bắt buộc):');
    if (!reason?.trim()) {
      if (reason !== null) {
        setError('Mở lại yêu cầu sửa bắt buộc phải nhập lý do.');
      }
      return;
    }
    await run(
      () => assignmentService.reopenChangeRequest(chapterId, cr.id, reason.trim()),
      'Đã mở lại yêu cầu',
      `Yêu cầu "${cr.description}" đã mở lại để sửa tiếp.`,
    );
  };

  // Bấm một yêu cầu sửa: chọn đúng phiên bản, zoom tới vùng, nhấp nháy
  const focusChangeRequest = (cr: ChangeRequestDto) => {
    setActiveChangeRequestId(cr.id);
    if (cr.assetReferenceId) {
      if (currentId !== cr.assetReferenceId && previousId !== cr.assetReferenceId) {
        setCurrentId(cr.assetReferenceId);
      }
    } else {
      const targetSubId = cr.submissionId || pendingSub?.id;
      if (targetSubId) {
        const compositeId = `composite-sub-${targetSubId}`;
        if (currentId !== compositeId && previousId !== compositeId) {
          setCurrentId(compositeId);
        }
      }
    }
    const box = parseRegion(cr.regionJson);
    if (box) {
      const targetScale = 2.0;
      setZoomTransform({
        scale: targetScale,
        x: -(box.x + box.w / 2 - 0.5) * 300 * targetScale,
        y: -(box.y + box.h / 2 - 0.5) * 450 * targetScale,
      });
      if (zoomSync) {
        setPrevTransform({
          scale: targetScale,
          x: -(box.x + box.w / 2 - 0.5) * 300 * targetScale,
          y: -(box.y + box.h / 2 - 0.5) * 450 * targetScale,
        });
      }
    }
  };

  // ── Pixel Diff (Canvas) ──
  const runPixelDiff = async () => {
    if (!current || !previous) return;
    const url1 = urls[previous.id];
    const url2 = urls[current.id];
    if (!url1 || !url2) return;

    if (!prevSize || !curSize || prevSize.w !== curSize.w || prevSize.h !== curSize.h) {
      setDiffMessage('Không thể so pixel được vì hai ảnh khác kích thước.');
      return;
    }

    try {
      setDiffLoading(true);
      setDiffMessage(null);
      const [img1, img2] = await Promise.all([loadImage(url1), loadImage(url2)]);
      const canvas = document.createElement('canvas');
      canvas.width = prevSize.w;
      canvas.height = prevSize.h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Đọc img1
      ctx.drawImage(img1, 0, 0);
      const d1 = ctx.getImageData(0, 0, prevSize.w, prevSize.h);
      // Đọc img2
      ctx.clearRect(0, 0, prevSize.w, prevSize.h);
      ctx.drawImage(img2, 0, 0);
      const d2 = ctx.getImageData(0, 0, prevSize.w, prevSize.h);

      const diff = ctx.createImageData(prevSize.w, prevSize.h);
      let diffPixels = 0;
      const len = d1.data.length;
      for (let i = 0; i < len; i += 4) {
        const dr = Math.abs(d1.data[i] - d2.data[i]);
        const dg = Math.abs(d1.data[i + 1] - d2.data[i + 1]);
        const db = Math.abs(d1.data[i + 2] - d2.data[i + 2]);
        if (dr > 32 || dg > 32 || db > 32) {
          diffPixels++;
          diff.data[i] = 236; // Magenta
          diff.data[i + 1] = 72;
          diff.data[i + 2] = 153;
          diff.data[i + 3] = 210;
        } else {
          diff.data[i + 3] = 0;
        }
      }
      ctx.putImageData(diff, 0, 0);
      setDiffResultUrl(canvas.toDataURL());
      const totalPixels = prevSize.w * prevSize.h;
      setDiffStats({
        diffPixels,
        totalPixels,
        percent: round((diffPixels / totalPixels) * 100),
      });
      setShowDiffOverlay(true);
    } catch {
      setDiffMessage('Lỗi nạp ảnh khi so sánh pixel (kiểm tra kết nối hoặc CORS).');
    } finally {
      setDiffLoading(false);
    }
  };

  // ── Phân loại kiểm tra nhất quán ──
  const triage = async (
    f: ConsistencyFindingDto,
    decision: 'Confirmed' | 'Rejected' | 'Ignored' | 'NeedsClarification',
  ) => {
    if (!chapterId) return;
    let note: string | undefined;
    if (decision === 'Ignored' || decision === 'NeedsClarification') {
      const answer = window.prompt(
        decision === 'Ignored'
          ? 'Lý do bỏ qua lỗi này (bắt buộc):'
          : 'Câu hỏi cần làm rõ (bắt buộc):',
      );
      if (!answer?.trim()) return;
      note = answer.trim();
    }
    await run(
      () => assignmentService.triageConsistencyFinding(chapterId, f.id, decision, note),
      'Đã phân loại',
      `${f.ruleCode}: ${FINDING_LABEL[decision]}`,
    );
  };

  // ── Lọc danh sách yêu cầu sửa ──
  const filteredChangeRequests = useMemo(() => {
    if (crFilter === 'all') return changeRequests;
    return changeRequests.filter((c) => {
      if (c.assetReferenceId === currentId || c.assetReferenceId === previousId) return true;
      if (!c.assetReferenceId) {
        const matchesCurSub =
          currentId?.startsWith('composite-sub-') &&
          (c.submissionId === currentId.replace('composite-sub-', '') ||
            (!c.submissionId && pendingSub?.id === currentId.replace('composite-sub-', '')));
        const matchesPrevSub =
          previousId?.startsWith('composite-sub-') &&
          c.submissionId === previousId.replace('composite-sub-', '');
        if (matchesCurSub || matchesPrevSub) return true;
      }
      return false;
    });
  }, [changeRequests, crFilter, currentId, previousId, pendingSub?.id]);

  if (!chapterId) {
    return (
      <div className='p-8 text-center text-sm text-[#737373]'>
        Thiếu chương. Hãy mở màn duyệt từ thẻ công việc trong "Công việc của tôi".
      </div>
    );
  }
  if (loading && !assignment) {
    return (
      <div className='p-8 flex items-center justify-center gap-2 text-sm text-[#737373]'>
        <Loader2 className='w-4 h-4 animate-spin' /> Đang tải…
      </div>
    );
  }
  if (!assignment) {
    return (
      <div className='p-8 text-center text-sm text-[#737373]'>Không tìm thấy việc cần duyệt.</div>
    );
  }

  const regionsFor = (artId: string) => {
    const isComposite = artId.startsWith('composite-sub-');
    const compositeSubId = isComposite ? artId.replace('composite-sub-', '') : null;

    return changeRequests
      .filter((c) => {
        if (c.assetReferenceId === artId) return true;
        if (isComposite && !c.assetReferenceId) {
          if (c.submissionId && c.submissionId === compositeSubId) return true;
          if (!c.submissionId && pendingSub?.id === compositeSubId) return true;
        }
        return false;
      })
      .map((c) => ({ c, box: parseRegion(c.regionJson) }))
      .filter((x): x is { c: ChangeRequestDto; box: Box } => !!x.box);
  };

  // Render một khung ảnh với transform zoom/pan
  const renderImageContent = (art: AssetReferenceDto | null, isCurrent: boolean) => {
    if (!art) {
      return (
        <div className='text-xs text-[#A3A3A3] text-center p-6'>
          {isCurrent ? 'Chưa có artwork cả trang ở công đoạn này.' : 'Không có phiên bản trước.'}
        </div>
      );
    }
    const currentTransform = zoomSync || isCurrent ? zoomTransform : prevTransform;
    const boxes = regionsFor(art.id);

    return (
      <div
        ref={isCurrent ? currentImageWrapperRef : undefined}
        className={`relative inline-block select-none ${isCurrent && canDraw && isDrawTool ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
        style={{
          transform: `translate(${currentTransform.x}px, ${currentTransform.y}px) scale(${currentTransform.scale})`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.1s ease-out',
        }}
        onMouseDown={isCurrent ? onMouseDown : onMouseDownPrev}
        data-testid={isCurrent ? 'review-current-image' : 'review-previous-image'}
      >
        {urls[art.id] ? (
          <img
            src={urls[art.id]}
            alt={`Artwork v${art.versionNumber}`}
            draggable={false}
            onLoad={(e) => {
              const w = e.currentTarget.naturalWidth;
              const h = e.currentTarget.naturalHeight;
              setNaturalSizes((ns) => ({
                ...ns,
                [art.id]: { w, h },
              }));
            }}
            className='max-h-[72vh] w-auto bg-white border border-[#D4D4D4] shadow-sm object-contain'
          />
        ) : (
          <div className='w-[300px] aspect-[2/3] bg-white border border-[#D4D4D4] flex items-center justify-center'>
            <Loader2 className='w-4 h-4 animate-spin text-[#A3A3A3]' />
          </div>
        )}

        {/* Lớp Diff Highlight Overlay nếu bật */}
        {showDiffOverlay && diffResultUrl && isCurrent && (
          <img
            src={diffResultUrl}
            alt='Diff overlay'
            className='absolute inset-0 w-full h-full pointer-events-none'
          />
        )}

        {/* Các vùng khoanh đã lưu */}
        {boxes.map(({ c, box }, i) => {
          const isActive = activeChangeRequestId === c.id;
          return (
            <div
              key={c.id}
              data-change-request-box='true'
              title={`${c.description} (${String(c.status)})`}
              onClick={(e) => {
                e.stopPropagation();
                focusChangeRequest(c);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className={`absolute border-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-orange-500 ring-4 ring-orange-400/50 bg-orange-500/20 animate-pulse z-20'
                  : String(c.status) === 'Open'
                    ? 'border-red-500 bg-red-500/10 hover:bg-red-500/20'
                    : 'border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20'
              }`}
              style={{
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
                width: `${box.w * 100}%`,
                height: `${box.h * 100}%`,
              }}
            >
              <span
                className={`absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow ${
                  isActive ? 'bg-orange-500' : 'bg-red-500'
                }`}
              >
                {i + 1}
              </span>
            </div>
          );
        })}

        {/* Vùng đang soạn thảo */}
        {isCurrent &&
          drafts.map((d, i) => (
            <div
              key={d.key}
              className='absolute border-2 border-dashed border-[#F97316] bg-[#F97316]/10 pointer-events-none z-10'
              style={{
                left: `${d.box.x * 100}%`,
                top: `${d.box.y * 100}%`,
                width: `${d.box.w * 100}%`,
                height: `${d.box.h * 100}%`,
              }}
            >
              <span className='absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full bg-[#F97316] text-white text-[10px] font-bold flex items-center justify-center shadow'>
                M{i + 1}
              </span>
            </div>
          ))}

        {/* Vùng đang kéo chuột */}
        {isCurrent && drawing && (
          <div
            className='absolute border-2 border-[#F97316] bg-[#F97316]/20 pointer-events-none z-30'
            style={{
              left: `${drawing.box.x * 100}%`,
              top: `${drawing.box.y * 100}%`,
              width: `${drawing.box.w * 100}%`,
              height: `${drawing.box.h * 100}%`,
            }}
          />
        )}

        {/* Gợi ý click không kéo */}
        {isCurrent && drawingHint && (
          <div
            data-testid='drawing-hint-banner'
            className='absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-600/90 text-white text-xs font-semibold rounded-full shadow-lg z-40 pointer-events-none transition-all flex items-center gap-1.5'
          >
            <span>💡</span>
            <span>{drawingHint}</span>
          </div>
        )}
      </div>
    );
  };

  const st = String(assignment.status);
  const openFindings = findings.filter((f) => OPEN_FINDING.includes(String(f.status)));

  return (
    <div className='w-full h-full flex flex-col bg-[#FAF8F4] overflow-hidden select-none'>
      {/* HEADER */}
      <div className='shrink-0 bg-white border-b border-[#E7E7E7] px-6 py-2.5 flex items-center justify-between gap-4 z-10 shadow-xs'>
        <div className='flex items-center gap-3 min-w-0'>
          <button
            type='button'
            onClick={() => navigate(-1)}
            aria-label='Quay lại'
            className='w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F3F3F3] text-[#737373] cursor-pointer'
          >
            <ArrowLeft className='w-4 h-4' />
          </button>
          <div className='min-w-0'>
            <div className='flex items-center gap-2'>
              <h2 className='text-sm font-bold text-[#171717] truncate'>
                Duyệt: {assignment.brief}
              </h2>
              {current && (
                <span className='px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200'>
                  Đang duyệt: {label(current)}
                  {pendingSub ? ` (lần nộp ${pendingSub.attemptNumber})` : ''}
                </span>
              )}
            </div>
            <p className='text-[10px] text-[#A3A3A3] uppercase tracking-wider font-bold'>
              Trạng thái: {st} · {String(assignment.entityType)}
              {effectiveRole ? ` · Vai trò: ${effectiveRole}` : ''}
            </p>
          </div>
        </div>

        {/* Các nút hành động chính */}
        <div className='flex items-center gap-2 shrink-0'>
          {actions?.canOpenReview && (
            <button
              type='button'
              disabled={busy}
              onClick={() =>
                void run(
                  () => assignmentService.openReview(chapterId, assignment.id),
                  'Đã mở xét duyệt',
                  assignment.brief,
                )
              }
              className='px-3 py-1.5 flex items-center gap-1.5 border border-[#D4D4D4] rounded text-xs font-semibold hover:bg-[#F3F3F3] disabled:opacity-50 cursor-pointer'
            >
              <Eye className='w-3.5 h-3.5' /> Mở xét duyệt
            </button>
          )}

          {assignment?.chapterId && (
            <button
              type='button'
              onClick={() => setIsPreviewFeedbackOpen(true)}
              className='px-3 py-1.5 flex items-center gap-1.5 border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/70 text-indigo-800 text-xs font-semibold rounded cursor-pointer transition-colors shadow-2xs'
              data-testid='editor-preview-feedback-btn'
              title='Xem & Triage phản hồi từ liên kết xem thử độc giả (CF5)'
            >
              <MessageSquare className='w-3.5 h-3.5 text-indigo-600' />
              <span>Phản hồi xem thử</span>
            </button>
          )}

          {actions?.canDecide && (
            <button
              type='button'
              disabled={busy || !!actions.approveBlockedReason || drafts.length > 0}
              title={
                actions.approveBlockedReason ??
                (drafts.length > 0
                  ? 'Đang có vùng khoanh chưa gửi: hãy trả về hoặc xoá vùng.'
                  : 'Duyệt công đoạn này')
              }
              onClick={() => void onApprove()}
              className='px-4 py-1.5 flex items-center gap-1.5 bg-[#171717] text-white text-xs font-bold rounded hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm'
            >
              <CheckCircle2 className='w-4 h-4' /> Duyệt
            </button>
          )}
        </div>
      </div>

      {/* TOOLBAR SO SÁNH & ĐIỀU KHIỂN GÓC NHÌN */}
      <div className='shrink-0 bg-[#F9F8F6] border-b border-[#E7E7E7] px-6 py-1.5 flex items-center justify-between gap-4 text-xs z-10 flex-wrap'>
        {/* Nhóm chế độ hiển thị */}
        <div className='flex items-center gap-1 border border-[#D4D4D4] rounded bg-white p-0.5'>
          <button
            type='button'
            onClick={() => setCompareMode('side-by-side')}
            className={`px-2 py-1 rounded flex items-center gap-1 font-semibold text-[11px] cursor-pointer ${
              compareMode === 'side-by-side' ? 'bg-[#171717] text-white' : 'text-[#737373]'
            }`}
          >
            <Columns className='w-3 h-3' /> Cạnh nhau
          </button>
          <button
            type='button'
            onClick={() => setCompareMode('swipe')}
            className={`px-2 py-1 rounded flex items-center gap-1 font-semibold text-[11px] cursor-pointer ${
              compareMode === 'swipe' ? 'bg-[#171717] text-white' : 'text-[#737373]'
            }`}
          >
            Thanh trượt
          </button>
          <button
            type='button'
            onClick={() => setCompareMode('onion-skin')}
            className={`px-2 py-1 rounded flex items-center gap-1 font-semibold text-[11px] cursor-pointer ${
              compareMode === 'onion-skin' ? 'bg-[#171717] text-white' : 'text-[#737373]'
            }`}
          >
            <Layers className='w-3 h-3' /> Chồng ảnh
          </button>
        </div>

        {/* Thanh trượt Onion Skin nếu đang ở mode onion-skin */}
        {compareMode === 'onion-skin' && (
          <div className='flex items-center gap-2'>
            <span className='text-[11px] text-zinc-600 font-medium'>Độ mờ bản sau:</span>
            <input
              type='range'
              min='0'
              max='100'
              value={onionOpacity}
              onChange={(e) => setOnionOpacity(Number(e.target.value))}
              className='w-24 accent-[#171717]'
            />
            <span className='text-[10px] font-mono text-zinc-500 w-8'>{onionOpacity}%</span>
          </div>
        )}

        {/* Nhóm zoom và pan */}
        <div className='flex items-center gap-1'>
          <button
            type='button'
            onClick={() => handleZoom(0.2)}
            title='Phóng to'
            className='p-1 border border-[#D4D4D4] rounded bg-white hover:bg-zinc-50 cursor-pointer'
          >
            <ZoomIn className='w-3.5 h-3.5' />
          </button>
          <span className='px-1.5 font-mono text-[11px] text-zinc-600 font-medium'>
            {Math.round(zoomTransform.scale * 100)}%
          </span>
          <button
            type='button'
            onClick={() => handleZoom(-0.2)}
            title='Thu nhỏ'
            className='p-1 border border-[#D4D4D4] rounded bg-white hover:bg-zinc-50 cursor-pointer'
          >
            <ZoomOut className='w-3.5 h-3.5' />
          </button>
          <button
            type='button'
            onClick={resetZoom}
            title='Đặt lại góc nhìn'
            className='px-2 py-1 border border-[#D4D4D4] rounded bg-white hover:bg-zinc-50 font-medium text-[11px] flex items-center gap-1 cursor-pointer'
          >
            <RotateCcw className='w-3 h-3' /> Đặt lại
          </button>
          <button
            type='button'
            onClick={() => setZoomSync((s) => !s)}
            title='Đồng bộ zoom/pan cả hai khung'
            className={`px-2 py-1 border rounded font-medium text-[11px] flex items-center gap-1 cursor-pointer ${
              zoomSync
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-zinc-600 border-zinc-200'
            }`}
          >
            {zoomSync ? <Lock className='w-3 h-3' /> : <Unlock className='w-3 h-3' />}
            <span>Đồng bộ: {zoomSync ? 'Bật' : 'Tắt'}</span>
          </button>
        </div>

        {/* Nhóm công cụ thao tác */}
        <div className='flex items-center gap-1.5'>
          {canDraw && (
            <div className='flex items-center gap-1.5'>
              <div className='flex items-center border border-[#D4D4D4] rounded bg-white p-0.5'>
                <button
                  type='button'
                  onClick={() => setIsDrawTool(true)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                    isDrawTool ? 'bg-[#F97316] text-white' : 'text-[#737373]'
                  }`}
                >
                  <Square className='w-3 h-3' /> Khoanh vùng
                </button>
                <button
                  type='button'
                  onClick={() => setIsDrawTool(false)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                    !isDrawTool ? 'bg-[#171717] text-white' : 'text-[#737373]'
                  }`}
                >
                  <Move className='w-3 h-3' /> Di chuyển
                </button>
              </div>
              {drawingHint && (
                <span className='px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse flex items-center gap-1'>
                  <span>💡</span>
                  <span>{drawingHint}</span>
                </span>
              )}
            </div>
          )}

          {/* Nút so sánh pixel diff */}
          <button
            type='button'
            onClick={() => void runPixelDiff()}
            disabled={diffLoading || !current || !previous}
            className='px-2.5 py-1 border border-pink-200 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded font-semibold text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-50'
          >
            {diffLoading ? (
              <Loader2 className='w-3 h-3 animate-spin' />
            ) : (
              <Sparkles className='w-3 h-3' />
            )}
            <span>Pixel Diff</span>
          </button>

          {/* Nút toàn màn hình */}
          <button
            type='button'
            onClick={() => void toggleFullscreen()}
            title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
            className='p-1 border border-[#D4D4D4] rounded bg-white hover:bg-zinc-50 cursor-pointer'
          >
            {isFullscreen ? (
              <Minimize2 className='w-3.5 h-3.5' />
            ) : (
              <Maximize2 className='w-3.5 h-3.5' />
            )}
          </button>
        </div>
      </div>

      {/* CẢNH BÁO LỆCH KÍCH THƯỚC HOẶC THÔNG BÁO LỖI */}
      {error && (
        <div className='mx-6 mt-2 p-2 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700 flex items-center gap-1.5'>
          <AlertTriangle className='w-3.5 h-3.5 shrink-0' /> {error}
        </div>
      )}

      {isSizeMismatch && prevSize && curSize && (
        <div className='mx-6 mt-2 p-2 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800 flex items-center gap-1.5 font-medium'>
          <AlertTriangle className='w-4 h-4 shrink-0 text-amber-600' />
          <span>
            Hai phiên bản khác kích thước ({prevSize.w}×{prevSize.h} so với {curSize.w}×{curSize.h}
            ).
          </span>
        </div>
      )}

      {diffMessage && (
        <div className='mx-6 mt-2 p-2 rounded-lg border border-zinc-200 bg-zinc-50 text-xs text-zinc-700 flex items-center gap-1.5'>
          <AlertTriangle className='w-3.5 h-3.5 shrink-0 text-zinc-500' />
          <span>{diffMessage}</span>
        </div>
      )}

      {diffStats && showDiffOverlay && (
        <div className='mx-6 mt-2 p-2 rounded-lg border border-pink-200 bg-pink-50 text-xs text-pink-800 flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <span className='font-bold'>Gợi ý so pixel:</span>
            <span>
              Phát hiện {diffStats.diffPixels.toLocaleString()} px khác nhau (~{diffStats.percent}%)
            </span>
            <span className='text-[10px] text-zinc-500 italic'>
              (Gợi ý tham khảo, không phải kết luận)
            </span>
          </div>
          <button
            type='button'
            onClick={() => setShowDiffOverlay(false)}
            className='text-xs underline text-pink-700 cursor-pointer'
          >
            Ẩn lớp highlight
          </button>
        </div>
      )}

      {/* MAIN VIEWPORT */}
      <div className='flex-1 flex overflow-hidden' ref={comparisonContainerRef}>
        <div className='flex-1 flex flex-col min-w-0 bg-[#EFEFEF] overflow-hidden'>
          {/* HEADER CHỌN PHIÊN BẢN */}
          <div className='p-2 bg-white border-b border-[#E7E7E7] flex items-center justify-between gap-4 text-xs'>
            <div className='flex-1 flex items-center gap-2'>
              <span className='uppercase tracking-wider font-bold text-[#737373] text-[11px] shrink-0'>
                Phiên bản trước:
              </span>
              <select
                aria-label='Chọn phiên bản để so sánh'
                value={previousId ?? ''}
                onChange={(e) => setPreviousId(e.target.value || null)}
                className='border border-[#D4D4D4] rounded px-2 py-0.5 text-xs bg-white max-w-sm truncate'
              >
                <option value=''>(không so sánh)</option>
                {artworks
                  .filter((a) => a.id !== currentId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {formatVersionOption(a)}
                    </option>
                  ))}
              </select>
            </div>

            <div className='flex-1 flex items-center justify-end gap-2'>
              <span className='uppercase tracking-wider font-bold text-[#F97316] text-[11px] shrink-0'>
                Bản đang duyệt:
              </span>
              <select
                aria-label='Chọn bản đang duyệt'
                value={currentId ?? ''}
                onChange={(e) => setCurrentId(e.target.value || null)}
                className='border border-[#FED7AA] bg-[#FFF7ED] rounded px-2 py-0.5 text-xs text-[#9A3412] font-semibold max-w-sm truncate'
              >
                {artworks.map((a) => (
                  <option key={a.id} value={a.id}>
                    {formatVersionOption(a)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* VÙNG HIỂN THỊ THEO CHẾ ĐỘ (Side-by-side / Swipe / Onion-skin) */}
          <div className='flex-1 relative flex overflow-hidden'>
            {compareMode === 'side-by-side' && (
              <div className='flex-1 flex w-full h-full'>
                <div className='flex-1 border-r border-[#D4D4D4] flex flex-col min-w-0'>
                  <div className='text-center py-1 text-[11px] font-bold text-zinc-500 bg-[#EAE8E3] border-b border-[#D4D4D4]'>
                    {previous ? label(previous) : 'Không có phiên bản trước'}
                  </div>
                  <div className='flex-1 p-4 flex items-center justify-center overflow-hidden'>
                    {renderImageContent(previous, false)}
                  </div>
                </div>

                <div className='flex-1 flex flex-col min-w-0'>
                  <div className='text-center py-1 text-[11px] font-bold text-[#F97316] bg-[#FFF7ED] border-b border-[#FED7AA]'>
                    {current ? `Bản đang duyệt · ${label(current)}` : 'Chưa có artwork'}
                  </div>
                  <div className='flex-1 p-4 flex items-center justify-center overflow-hidden'>
                    {renderImageContent(current, true)}
                  </div>
                </div>
              </div>
            )}

            {compareMode === 'swipe' && (
              <div className='flex-1 relative flex items-center justify-center p-4 overflow-hidden'>
                <div className='relative max-h-[72vh] aspect-[2/3] border border-zinc-300 shadow-md bg-white select-none overflow-hidden'>
                  {/* Bản trước ở dưới */}
                  {previous && urls[previous.id] && (
                    <img
                      src={urls[previous.id]}
                      alt='Previous version'
                      className='absolute inset-0 w-full h-full object-contain'
                    />
                  )}
                  {/* Bản hiện tại ở trên, bị cắt theo swipePos */}
                  {current && urls[current.id] && (
                    <div
                      className='absolute inset-0 overflow-hidden'
                      style={{ clipPath: `inset(0 0 0 ${swipePos}%)` }}
                    >
                      <img
                        src={urls[current.id]}
                        alt='Current version'
                        className='absolute inset-0 w-full h-full object-contain'
                      />
                    </div>
                  )}
                  {/* Thanh trượt dọc chia đôi */}
                  <div
                    className='absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize z-20 flex items-center justify-center'
                    style={{ left: `${swipePos}%` }}
                    onMouseDown={(e) => {
                      const container = e.currentTarget.parentElement;
                      if (!container) return;
                      const rect = container.getBoundingClientRect();
                      const onMove = (ev: MouseEvent) => {
                        const newPos = Math.min(
                          100,
                          Math.max(0, ((ev.clientX - rect.left) / rect.width) * 100),
                        );
                        setSwipePos(Math.round(newPos));
                      };
                      const onUp = () => {
                        window.removeEventListener('mousemove', onMove);
                        window.removeEventListener('mouseup', onUp);
                      };
                      window.addEventListener('mousemove', onMove);
                      window.addEventListener('mouseup', onUp);
                    }}
                  >
                    <div className='w-6 h-6 rounded-full bg-white border border-zinc-300 shadow flex items-center justify-center text-[10px] font-bold text-zinc-700'>
                      ↔
                    </div>
                  </div>
                </div>
              </div>
            )}

            {compareMode === 'onion-skin' && (
              <div className='flex-1 relative flex items-center justify-center p-4 overflow-hidden'>
                <div className='relative max-h-[72vh] aspect-[2/3] border border-zinc-300 shadow-md bg-white select-none'>
                  {previous && urls[previous.id] && (
                    <img
                      src={urls[previous.id]}
                      alt='Previous version'
                      className='absolute inset-0 w-full h-full object-contain'
                    />
                  )}
                  {current && urls[current.id] && (
                    <img
                      src={urls[current.id]}
                      alt='Current version'
                      style={{ opacity: onionOpacity / 100 }}
                      className='absolute inset-0 w-full h-full object-contain'
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR TABS: YÊU CẦU SỬA & KIỂM TRA NHẤT QUÁN */}
        <div className='w-[380px] shrink-0 bg-white border-l border-[#E7E7E7] flex flex-col h-full z-10'>
          <div className='flex border-b border-[#E7E7E7]' role='tablist'>
            {(
              [
                [
                  'changes',
                  `Yêu cầu sửa (${filteredChangeRequests.length + drafts.length})`,
                  MessageSquare,
                ],
                ['consistency', `Nhất quán (${openFindings.length})`, ShieldCheck],
              ] as const
            ).map(([key, tabLabel, Icon]) => (
              <button
                key={key}
                type='button'
                role='tab'
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`flex-1 py-3 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                  tab === key
                    ? 'text-[#171717] border-b-2 border-[#171717]'
                    : 'text-[#A3A3A3] bg-[#FAF8F4]'
                }`}
              >
                <Icon className='w-3.5 h-3.5' /> {tabLabel}
              </button>
            ))}
          </div>

          <div className='flex-1 overflow-y-auto p-4 space-y-4'>
            {tab === 'changes' && (
              <>
                {/* Bộ lọc yêu cầu sửa */}
                <div className='flex items-center justify-between gap-2 text-xs'>
                  <span className='font-semibold text-zinc-600'>Lọc yêu cầu:</span>
                  <select
                    value={crFilter}
                    onChange={(e) => setCrFilter(e.target.value as 'all' | 'version')}
                    className='border border-zinc-200 rounded px-2 py-0.5 text-[11px] bg-white'
                  >
                    <option value='all'>Hiện tất cả ({changeRequests.length})</option>
                    <option value='version'>Theo phiên bản đang xem</option>
                  </select>
                </div>

                {/* Form soạn thảo Trả về kèm vùng khoanh */}
                {actions?.canDecide && (
                  <div
                    className='space-y-2 p-3 rounded-lg border border-[#FED7AA] bg-[#FFF7ED]'
                    data-testid='review-draft-panel'
                  >
                    <p className='text-[11px] font-bold text-[#9A3412]'>Trả về kèm yêu cầu sửa</p>
                    {drafts.length === 0 && (
                      <p className='text-[11px] text-[#9A3412]'>
                        Kéo chuột trên ảnh hiện tại để khoanh vùng cần sửa (tuỳ chọn).
                      </p>
                    )}
                    {drafts.map((d, i) => (
                      <div key={d.key} className='flex items-start gap-1.5'>
                        <span className='mt-1.5 text-[10px] font-bold text-[#F97316] w-6'>
                          M{i + 1}
                        </span>
                        <div className='flex-1 space-y-1'>
                          <input
                            value={d.description}
                            onChange={(e) =>
                              setDrafts((all) =>
                                all.map((x) =>
                                  x.key === d.key ? { ...x, description: e.target.value } : x,
                                ),
                              )
                            }
                            placeholder='Mô tả cần sửa gì ở vùng này'
                            aria-label={`Mô tả vùng M${i + 1}`}
                            className='w-full px-2 py-1 text-xs border border-[#D4D4D4] rounded bg-white'
                          />
                          {d.panelId && (
                            <span className='text-[9px] text-zinc-500 font-mono'>
                              Khung: {d.panelId.slice(0, 8)}…
                            </span>
                          )}
                        </div>
                        <button
                          type='button'
                          aria-label={`Xoá vùng M${i + 1}`}
                          onClick={() => setDrafts((all) => all.filter((x) => x.key !== d.key))}
                          className='p-1 text-[#A3A3A3] hover:text-red-600 cursor-pointer'
                        >
                          <Trash2 className='w-3.5 h-3.5' />
                        </button>
                      </div>
                    ))}
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder='Nhận xét chung (bắt buộc khi trả về)'
                      aria-label='Nhận xét chung'
                      className='w-full h-16 p-2 text-xs border border-[#D4D4D4] rounded bg-white'
                    />
                    <button
                      type='button'
                      disabled={busy}
                      onClick={() => void sendBack()}
                      className='w-full py-2 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded disabled:opacity-50 cursor-pointer'
                    >
                      {busy ? (
                        <Loader2 className='w-3.5 h-3.5 animate-spin' />
                      ) : (
                        <Undo2 className='w-3.5 h-3.5' />
                      )}
                      Trả về ({drafts.length || 1} yêu cầu sửa)
                    </button>
                  </div>
                )}

                {/* Danh sách yêu cầu sửa */}
                {filteredChangeRequests.length === 0 ? (
                  <p className='text-center text-xs text-[#A3A3A3] py-6'>
                    Chưa có yêu cầu sửa nào phù hợp.
                  </p>
                ) : (
                  <ul className='space-y-2'>
                    {filteredChangeRequests.map((c) => {
                      const art = artworks.find((a) => a.id === c.assetReferenceId);
                      const isResolved = String(c.status) === 'Resolved';
                      const isVerified = String(c.status) === 'Verified';
                      const isOpen = String(c.status) === 'Open';
                      const isRejected = String(c.status) === 'Rejected';

                      // Phiên bản được nộp để xử lý yêu cầu này (nếu có)
                      const resolvedSub = c.resolvedAt
                        ? submissions.find((s) => new Date(s.submittedAt) > new Date(c.resolvedAt!))
                        : null;

                      return (
                        <li
                          key={c.id}
                          onClick={() => focusChangeRequest(c)}
                          className={`p-3 rounded-lg border text-xs space-y-1.5 cursor-pointer transition-all ${
                            activeChangeRequestId === c.id
                              ? 'border-orange-400 bg-orange-50/50 shadow-sm'
                              : 'border-[#E7E7E7] bg-[#FAF8F4] hover:bg-zinc-50'
                          }`}
                        >
                          <div className='flex items-center justify-between gap-2'>
                            <span className='font-semibold text-[#171717]'>{c.description}</span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                isOpen
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : isResolved
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : isVerified
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                              }`}
                            >
                              {isOpen
                                ? 'Đang mở'
                                : isResolved
                                  ? 'Đã sửa, chờ xác minh'
                                  : isVerified
                                    ? 'Đã xác minh'
                                    : isRejected
                                      ? 'Bác bỏ'
                                      : String(c.status)}
                            </span>
                          </div>

                          {c.regionJson && (
                            <p className='text-[10px] text-[#737373]'>
                              Vùng khoanh{' '}
                              {art
                                ? `trên v${art.versionNumber}`
                                : c.panelId
                                  ? `trên Khung #${panels.find((p) => p.id === c.panelId)?.panelNumber || c.panelId}`
                                  : c.submissionId
                                    ? 'trên Trang ghép'
                                    : '(không gắn phiên bản)'}
                            </p>
                          )}

                          {c.resolutionNote && (
                            <div className='p-1.5 rounded bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 space-y-0.5'>
                              <div className='font-bold'>Phản hồi của người làm:</div>
                              <div>{c.resolutionNote}</div>
                              {resolvedSub && (
                                <div className='text-[10px] text-emerald-600'>
                                  Đã nộp ở lần {resolvedSub.attemptNumber}
                                </div>
                              )}
                            </div>
                          )}

                          {c.reviewerComment && (
                            <p className='text-[10px] text-zinc-600 italic'>
                              Nhận xét người duyệt: {c.reviewerComment}
                            </p>
                          )}

                          {/* Nút thao tác trực tiếp với yêu cầu Resolved (Xác minh đạt & Mở lại) */}
                          {actions?.canDecide && isResolved && (
                            <div className='flex items-center gap-2 pt-1.5 border-t border-zinc-200'>
                              <button
                                type='button'
                                disabled={busy}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void verifyChangeRequest(c);
                                }}
                                className='flex-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50'
                              >
                                <CheckCircle2 className='w-3 h-3' /> Xác minh đạt
                              </button>
                              <button
                                type='button'
                                disabled={busy}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void reopenChangeRequest(c);
                                }}
                                className='flex-1 py-1 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50'
                              >
                                <RotateCcw className='w-3 h-3' /> Mở lại
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}

            {tab === 'consistency' && (
              <>
                <button
                  type='button'
                  disabled={busy}
                  onClick={() =>
                    void run(
                      async () => {
                        const r = await assignmentService.runConsistencyCheck(chapterId);
                        toast(
                          'Kiểm tra nhất quán',
                          `${r.newCount} lỗi mới · ${r.openCount} đang mở · ${r.blockingOpenCount} chặn`,
                        );
                      },
                      'Đã chạy kiểm tra',
                      'Kết quả đã cập nhật.',
                    )
                  }
                  className='w-full py-2.5 flex items-center justify-center gap-2 bg-[#F5F3FF] text-[#6D28D9] text-sm font-bold border border-[#DDD6FE] rounded-lg hover:bg-[#EDE9FE] disabled:opacity-50 cursor-pointer'
                >
                  {busy ? (
                    <Loader2 className='w-4 h-4 animate-spin' />
                  ) : (
                    <Play className='w-4 h-4' />
                  )}
                  Chạy kiểm tra nhất quán (script ↔ Bible)
                </button>

                {findings.length === 0 ? (
                  <p className='text-center text-xs text-[#A3A3A3] py-6'>
                    Chưa có kết quả. Bấm chạy kiểm tra.
                  </p>
                ) : (
                  <ul className='space-y-2' data-testid='consistency-findings'>
                    {findings.map((f) => {
                      const isOpen = OPEN_FINDING.includes(String(f.status));
                      return (
                        <li
                          key={f.id}
                          className={`p-3 rounded-lg border bg-white space-y-2 ${isOpen ? '' : 'opacity-60'}`}
                        >
                          <div className='flex items-center justify-between gap-2'>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${SEVERITY_STYLE[String(f.severity)] ?? SEVERITY_STYLE.Info}`}
                            >
                              {String(f.severity)} · {f.ruleCode}
                            </span>
                            <span className='text-[10px] font-bold text-[#737373]'>
                              {FINDING_LABEL[String(f.status)] ?? String(f.status)}
                            </span>
                          </div>
                          <p className='text-xs text-[#171717]'>{f.message}</p>
                          {f.evidence && (
                            <blockquote className='text-[11px] text-[#555555] border-l-2 border-[#D4D4D4] pl-2 italic'>
                              {f.evidence}
                            </blockquote>
                          )}
                          {f.triageNote && (
                            <p className='text-[10px] text-[#737373]'>Ghi chú: {f.triageNote}</p>
                          )}
                          {canTriage && isOpen && (
                            <div className='flex items-center gap-1 pt-1 border-t border-[#F3F3F3]'>
                              {(
                                [
                                  [
                                    'Confirmed',
                                    CheckCircle2,
                                    'text-emerald-600 hover:bg-emerald-50',
                                    'Xác nhận là lỗi',
                                  ],
                                  [
                                    'Rejected',
                                    XCircle,
                                    'text-red-600 hover:bg-red-50',
                                    'Bác bỏ (không phải lỗi)',
                                  ],
                                  [
                                    'Ignored',
                                    MinusCircle,
                                    'text-indigo-600 hover:bg-indigo-50',
                                    'Bỏ qua (cần lý do)',
                                  ],
                                  [
                                    'NeedsClarification',
                                    HelpCircle,
                                    'text-amber-600 hover:bg-amber-50',
                                    'Cần làm rõ (cần câu hỏi)',
                                  ],
                                ] as const
                              ).map(([decision, Icon, cls, actionLabel]) => (
                                <button
                                  key={decision}
                                  type='button'
                                  disabled={
                                    busy ||
                                    (decision === 'Confirmed' && String(f.status) === 'Confirmed')
                                  }
                                  onClick={() => void triage(f, decision)}
                                  title={actionLabel}
                                  aria-label={actionLabel}
                                  className={`p-1.5 rounded disabled:opacity-30 cursor-pointer ${cls}`}
                                >
                                  <Icon className='w-4 h-4' />
                                </button>
                              ))}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* CF5: Preview Links & Feedback Triage Modal for Editor */}
      {isPreviewFeedbackOpen && assignment?.chapterId && (
        <PreviewLinksModal
          isOpen={isPreviewFeedbackOpen}
          chapterId={assignment.chapterId}
          chapterNumber={assignment.targetEntityId || 1}
          chapterTitle={assignment.brief}
          chapterStatus={assignment.status}
          workspaceRole={workspaceRole}
          onClose={() => setIsPreviewFeedbackOpen(false)}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
