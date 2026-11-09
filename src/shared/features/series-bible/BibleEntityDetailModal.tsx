import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Lock,
  History,
  GitCommit,
  Eye,
  Image as ImageIcon,
  Layers,
  Palette,
  CheckCircle2,
  MessageSquare,
  AlertTriangle,
  Plus,
  RotateCcw,
  Upload,
  HelpCircle,
  Clock,
  ArrowLeft,
  User,
  Info,
  FileText,
  Edit3,
  Trash2,
} from 'lucide-react';
import { BibleEntity, normalizeWorkspaceRole } from '@/types';
import { BibleEntryDto, BibleEntryRevisionDto, bibleService } from '@/services/bible.service';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { LucianInlineAlert } from '@/shared/components/lucian/LucianInlineAlert';
import { LucianConfirmModal } from '@/shared/components/lucian/LucianConfirmModal';

export interface CharacterEraStage {
  stageKey: string;
  stageName: string;
  effectiveFromChapterNumber: number;
  effectiveToChapterNumber?: number | null;
  latestRevision: BibleEntryRevisionDto;
  revisions: BibleEntryRevisionDto[];
  isLocked: boolean;
}

export function groupRevisionsIntoStages(
  revisions: BibleEntryRevisionDto[],
  fallbackRevision?: BibleEntryRevisionDto | null,
): CharacterEraStage[] {
  const all: BibleEntryRevisionDto[] = [];
  const seenIds = new Set<string>();

  const addRev = (rev: BibleEntryRevisionDto | null | undefined) => {
    if (!rev) return;
    const idKey = rev.id
      ? String(rev.id)
      : `v${rev.versionNumber}-ch${rev.effectiveFromChapterNumber}-${rev.stageName || ''}`;
    if (!seenIds.has(idKey)) {
      seenIds.add(idKey);
      all.push(rev);
    }
  };

  if (Array.isArray(revisions)) {
    for (const r of revisions) addRev(r);
  }
  if (fallbackRevision) {
    addRev(fallbackRevision);
  }

  if (all.length === 0) {
    return [];
  }

  // 1. Tìm stageName chính thức của Chapter 1 (nếu có revision nào ở ch 1 được đặt tên riêng)
  const ch1NamedRev = all.find(
    (r) =>
      (r.effectiveFromChapterNumber || 1) === 1 && r.stageName && r.stageName.trim().length > 0,
  );
  const ch1DefaultStageName = ch1NamedRev?.stageName?.trim() || null;

  // 2. Nhóm các revision thành từng Narrative Era:
  // Nếu ở Chapter 1 mà có revision chưa đặt tên, ta gộp nó vào Era của Chapter 1 thay vì tách thành "Giai đoạn chuẩn" riêng biệt
  const groupMap = new Map<string, BibleEntryRevisionDto[]>();
  for (const rev of all) {
    const ch =
      typeof rev.effectiveFromChapterNumber === 'number' ? rev.effectiveFromChapterNumber : 1;
    let sName = (rev.stageName || '').trim().toLowerCase();

    // Nếu ở Chapter 1 và revision chưa có tên, kế thừa tên stageName của ch 1 nếu đã có
    if (ch === 1 && !sName && ch1DefaultStageName) {
      sName = ch1DefaultStageName.toLowerCase();
    }

    const groupKey = sName ? `ch_${ch}_stage_${sName}` : `ch_${ch}`;
    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, []);
    }
    groupMap.get(groupKey)!.push(rev);
  }

  const stages: CharacterEraStage[] = [];
  const sortedGroupKeys = Array.from(groupMap.keys()).sort((a, b) => {
    const chA = groupMap.get(a)![0]?.effectiveFromChapterNumber || 1;
    const chB = groupMap.get(b)![0]?.effectiveFromChapterNumber || 1;
    if (chA !== chB) return chA - chB;
    const minVerA = Math.min(...groupMap.get(a)!.map((r) => r.versionNumber || 0));
    const minVerB = Math.min(...groupMap.get(b)!.map((r) => r.versionNumber || 0));
    return minVerA - minVerB;
  });

  for (const groupKey of sortedGroupKeys) {
    const revList = groupMap.get(groupKey)!;
    const sortedRevs = [...revList].sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0));
    const latest = sortedRevs[0];
    const isLocked = sortedRevs.some((r) => r.isLocked);
    const ch = latest.effectiveFromChapterNumber || 1;

    // Ưu tiên lấy tên giai đoạn từ revision có stageName
    const namedRev = sortedRevs.find((r) => r.stageName && r.stageName.trim().length > 0);
    const stageName =
      namedRev?.stageName?.trim() ||
      (ch === 1 ? ch1DefaultStageName || 'Giai đoạn chuẩn' : `Giai đoạn từ Ch.${ch}`);

    stages.push({
      stageKey: `stage-${groupKey.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      stageName,
      effectiveFromChapterNumber: ch,
      effectiveToChapterNumber: latest.effectiveToChapterNumber,
      latestRevision: latest,
      revisions: sortedRevs,
      isLocked,
    });
  }

  return stages;
}

const getStageIcon = (name?: string | null, category?: string | number) => {
  const cat = String(category || '').toLowerCase();
  if (cat.includes('loc') || cat === '2') return '🗺️';
  if (cat.includes('prop') || cat === '3') return '🗡️';
  if (cat.includes('term') || cat.includes('lore') || cat === '4' || cat === '6') return '📜';
  if (cat.includes('style') || cat.includes('rule') || cat === '5') return '🎨';

  const lower = (name || '').toLowerCase();
  if (
    lower.includes('nhỏ') ||
    lower.includes('bé') ||
    lower.includes('child') ||
    lower.includes('kid') ||
    lower.includes('thiếu nhi')
  ) {
    return '🧒';
  }
  if (
    lower.includes('lớn') ||
    lower.includes('trưởng thành') ||
    lower.includes('adult') ||
    lower.includes('thanh niên')
  ) {
    return '🧑';
  }
  if (lower.includes('già') || lower.includes('lão') || lower.includes('old')) {
    return '🧓';
  }
  if (
    lower.includes('biến hình') ||
    lower.includes('ma hóa') ||
    lower.includes('form') ||
    lower.includes('chiến đấu') ||
    lower.includes('awakening')
  ) {
    return '⚡';
  }
  return '👤';
};

interface BibleEntityDetailModalProps {
  entity: BibleEntity;
  rawEntry?: BibleEntryDto;
  latestSavedRevision?: BibleEntryRevisionDto | null;
  isProducer: boolean;
  isArtist?: boolean;
  canCreateDraft?: boolean;
  canReview?: boolean;
  seriesId?: string;
  onClose: () => void;
  onOpenHistory: (entity: BibleEntity) => void;
  onOpenAddRevision: (
    entity: BibleEntity,
    supersede?: BibleEntryRevisionDto | null,
    fromQueue?: boolean,
    queueEffectiveChapter?: number,
    reworkFeedback?: string,
    isResubmit?: boolean,
    isNewEra?: boolean,
  ) => void;
  onEndorseRevision?: (entity: BibleEntity, rev: BibleEntryRevisionDto) => Promise<void>;
  onRequestRework?: (entity: BibleEntity, rev: BibleEntryRevisionDto) => void;
  onLockRevision?: (rev: BibleEntryRevisionDto) => Promise<void>;
  onShowToast: (title: string, desc: string) => void;
  onZoomImage: (image: { url: string; title: string }) => void;
  onDeleteRevision?: (entity: BibleEntity, rev: BibleEntryRevisionDto) => Promise<void>;
  onDeleteEra?: (entity: BibleEntity, stage: CharacterEraStage) => Promise<void>;
}

export const BibleEntityDetailModal: React.FC<BibleEntityDetailModalProps> = ({
  entity,
  rawEntry,
  latestSavedRevision,
  isProducer,
  isArtist = false,
  canCreateDraft = true,
  canReview = isProducer,
  seriesId,
  onClose,
  onOpenHistory,
  onOpenAddRevision,
  onEndorseRevision,
  onRequestRework,
  onLockRevision,
  onShowToast,
  onZoomImage,
  onDeleteRevision,
  onDeleteEra,
}) => {
  const [showConceptGuide, setShowConceptGuide] = useState(false);
  const [activeArtTab, setActiveArtTab] = useState<'turnaround' | 'action'>('turnaround');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Revisions & Era Stages State
  const [allRevisions, setAllRevisions] = useState<BibleEntryRevisionDto[]>(() => {
    return latestSavedRevision && latestSavedRevision.bibleEntryId === entity.id
      ? [latestSavedRevision]
      : [];
  });
  const [isEndorsing, setIsEndorsing] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(() => {
    return latestSavedRevision && latestSavedRevision.bibleEntryId === entity.id
      ? latestSavedRevision.id
      : null;
  });
  const [selectedStageKey, setSelectedStageKey] = useState<string>(() => {
    if (latestSavedRevision && latestSavedRevision.bibleEntryId === entity.id) {
      const ch = latestSavedRevision.effectiveFromChapterNumber || 1;
      const sName = (latestSavedRevision.stageName || '').trim().toLowerCase();
      const groupKey = sName ? `ch_${ch}_stage_${sName}` : `ch_${ch}`;
      return `stage-${groupKey.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    }
    return '';
  });

  useEffect(() => {
    if (latestSavedRevision && latestSavedRevision.bibleEntryId === entity.id) {
      setAllRevisions((prev) => {
        const filtered = prev.filter((r) => r.id !== latestSavedRevision.id);
        return [latestSavedRevision, ...filtered];
      });
      setSelectedVersionId(latestSavedRevision.id);
      const ch = latestSavedRevision.effectiveFromChapterNumber || 1;
      const sName = (latestSavedRevision.stageName || '').trim().toLowerCase();
      const groupKey = sName ? `ch_${ch}_stage_${sName}` : `ch_${ch}`;
      setSelectedStageKey(`stage-${groupKey.replace(/[^a-zA-Z0-9_-]/g, '_')}`);
    }
  }, [latestSavedRevision, entity.id]);
  const [revisionToDelete, setRevisionToDelete] = useState<BibleEntryRevisionDto | null>(null);
  const [eraToDelete, setEraToDelete] = useState<CharacterEraStage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // User workspace role detection
  const currentRole = useMemo(() => {
    try {
      const rawWs = localStorage.getItem('activeWorkspace');
      const ws = rawWs ? JSON.parse(rawWs) : null;
      return normalizeWorkspaceRole(ws?.currentUserRole);
    } catch {
      return null;
    }
  }, []);

  const isProducerUser = isProducer || currentRole === 'PRODUCER';
  const isArtistUser = isArtist || currentRole === 'ARTIST';
  const isWriterUser =
    currentRole === 'WRITER' || (!isProducerUser && canCreateDraft && !isArtistUser);
  const isEditorUser = currentRole === 'EDITOR' || (!isProducerUser && !isWriterUser && canReview);

  useEffect(() => {
    if (!seriesId || !entity.id) return;
    let active = true;
    bibleService
      .getEntryHistory(seriesId, entity.id)
      .then((revs) => {
        if (active && revs && revs.length > 0) {
          setAllRevisions(revs);
        }
      })
      .catch((err) => {
        console.warn('Cannot fetch full revision history for entity:', err);
      });
    return () => {
      active = false;
    };
  }, [
    seriesId,
    entity.id,
    rawEntry?.effectiveRevision?.id,
    rawEntry?.effectiveRevision?.versionNumber,
  ]);

  const stages = useMemo(() => {
    const fallback = rawEntry?.effectiveRevision || null;
    return groupRevisionsIntoStages(allRevisions, fallback);
  }, [allRevisions, rawEntry?.effectiveRevision]);

  useEffect(() => {
    if (
      stages.length > 0 &&
      (!selectedStageKey || !stages.some((s) => s.stageKey === selectedStageKey))
    ) {
      const eff = rawEntry?.effectiveRevision;
      const matching = eff ? stages.find((s) => s.revisions.some((r) => r.id === eff.id)) : null;
      setSelectedStageKey(matching ? matching.stageKey : stages[stages.length - 1].stageKey);
    }
  }, [stages, rawEntry?.effectiveRevision, selectedStageKey]);

  const activeStage = useMemo(() => {
    return stages.find((s) => s.stageKey === selectedStageKey) || stages[0];
  }, [stages, selectedStageKey]);

  const activeRevision = useMemo(() => {
    if (selectedVersionId && activeStage?.revisions) {
      const found = activeStage.revisions.find((r) => r.id === selectedVersionId);
      if (found) return found;
    }
    return activeStage?.latestRevision || rawEntry?.effectiveRevision || null;
  }, [selectedVersionId, activeStage, rawEntry?.effectiveRevision]);

  // Turnaround / Character Sheet Gallery Active View State
  const initialUrl = entity.imageUrl || (entity.gallery?.[0]?.url ?? '');
  const initialTitle = entity.imageUrl
    ? entity.name
    : entity.gallery?.[0]?.label
      ? `${entity.name} - ${entity.gallery[0].label}`
      : entity.name;
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>(initialUrl);
  const [selectedImageTitle, setSelectedImageTitle] = useState<string>(initialTitle);

  useEffect(() => {
    let img = activeRevision?.conceptImageUrl || activeRevision?.referenceImageUrl;
    if (!img && activeRevision?.snapshotJson) {
      try {
        const snap = JSON.parse(activeRevision.snapshotJson);
        img =
          snap.ConceptImageUrl ||
          snap.conceptImageUrl ||
          snap.ReferenceImageUrl ||
          snap.referenceImageUrl;
      } catch {
        // ignore
      }
    }
    if (img) {
      setSelectedImageUrl(img);
      setSelectedImageTitle(`${entity.name} - ${activeStage?.stageName || 'Model Sheet'}`);
    } else {
      setSelectedImageUrl(entity.imageUrl || (entity.gallery?.[0]?.url ?? ''));
      setSelectedImageTitle(
        entity.imageUrl
          ? entity.name
          : entity.gallery?.[0]?.label
            ? `${entity.name} - ${entity.gallery[0].label}`
            : entity.name,
      );
    }
  }, [activeRevision, activeStage?.stageName, entity.imageUrl, entity.gallery, entity.name]);

  // Visual Diff: Previous Revision & Before/After Image Resolution
  const previousRevision = useMemo(() => {
    if (!activeStage?.revisions || activeStage.revisions.length <= 1) return null;
    const sorted = [...activeStage.revisions].sort(
      (a, b) => (b.versionNumber || 0) - (a.versionNumber || 0),
    );
    const currentIndex = sorted.findIndex((r) => r.id === activeRevision?.id);
    if (currentIndex >= 0 && currentIndex < sorted.length - 1) {
      return sorted[currentIndex + 1];
    }
    return sorted[sorted.length - 1].id !== activeRevision?.id ? sorted[sorted.length - 1] : null;
  }, [activeStage?.revisions, activeRevision?.id]);

  const beforeImageUrl = useMemo(() => {
    let prevImg = previousRevision?.conceptImageUrl || previousRevision?.referenceImageUrl;
    if (!prevImg && previousRevision?.snapshotJson) {
      try {
        const snap = JSON.parse(previousRevision.snapshotJson);
        prevImg =
          snap.ConceptImageUrl ||
          snap.conceptImageUrl ||
          snap.ReferenceImageUrl ||
          snap.referenceImageUrl;
      } catch {
        // ignore
      }
    }
    if (prevImg) return prevImg;
    if (entity.gallery?.[0]?.url && entity.gallery[0].url !== selectedImageUrl) {
      return entity.gallery[0].url;
    }
    return selectedImageUrl;
  }, [previousRevision, entity.gallery, selectedImageUrl]);

  const beforeVersionLabel = useMemo(() => {
    if (previousRevision) {
      return `v${previousRevision.versionNumber} (${previousRevision.reviewStatus || 'Trước'})`;
    }
    if (entity.gallery?.[0]?.url && entity.gallery[0].url !== selectedImageUrl) {
      return 'Bản phác thảo (Before)';
    }
    return 'Bản phác thảo (Before)';
  }, [previousRevision, entity.gallery, selectedImageUrl]);

  const afterVersionLabel = useMemo(() => {
    if (activeRevision) {
      return `v${activeRevision.versionNumber} (Hiện tại)`;
    }
    return 'Bản hoàn thiện (After)';
  }, [activeRevision]);

  // Entity Category detection
  const normalizedCategory = useMemo<
    'character' | 'location' | 'prop' | 'terminology' | 'style'
  >(() => {
    const cat = String(entity.category || '').toLowerCase();
    if (cat.includes('loc') || cat === '2') return 'location';
    if (cat.includes('prop') || cat === '3') return 'prop';
    if (
      cat.includes('term') ||
      cat.includes('lore') ||
      cat.includes('plot') ||
      cat === '4' ||
      cat === '6'
    )
      return 'terminology';
    if (cat.includes('style') || cat.includes('rule') || cat === '5') return 'style';
    return 'character';
  }, [entity.category]);

  const isCharacter = normalizedCategory === 'character';
  const isLocation = normalizedCategory === 'location';
  const isProp = normalizedCategory === 'prop';
  const isTerminology = normalizedCategory === 'terminology';
  const isStyleRule = normalizedCategory === 'style';

  // Stage attributes parsing (No hardcoded mock defaults)
  const stageAttributes = useMemo(() => {
    let parsed: Record<string, any> = {};
    if (activeRevision?.snapshotJson) {
      try {
        const snap = JSON.parse(activeRevision.snapshotJson);
        parsed = snap.Attributes || snap.attributes || {};
        if (!parsed || Object.keys(parsed).length === 0) {
          if (snap.DetailsJson || snap.detailsJson) {
            const inner = JSON.parse(snap.DetailsJson || snap.detailsJson);
            parsed = inner.attributes || inner.Attributes || {};
          }
        }
      } catch {
        // ignore
      }
    }
    let rawDetailsObj: Record<string, any> = {};
    if (rawEntry?.detailsJson) {
      try {
        const details = JSON.parse(rawEntry.detailsJson);
        rawDetailsObj = details.attributes || details.Attributes || {};
      } catch {
        // ignore
      }
    }
    const combined = { ...(entity.attributes || {}), ...rawDetailsObj, ...parsed };

    return {
      // Character fields (No 17 tuổi or 178 cm fallbacks!)
      age: combined.age || combined['tuổi'] || combined['độ tuổi'] || '',
      height: combined.height || combined['chiều cao'] || combined['vóc dáng'] || '',
      appearance:
        combined.appearance ||
        combined.traits ||
        combined['đặc điểm'] ||
        combined['ngoại hình'] ||
        (isCharacter ? entity.description : '') ||
        '',
      mood: combined.mood || combined['bảng màu'] || '',
      costume: combined.costume || combined['trang phục'] || '',

      // Location fields
      environmentType:
        combined.environmentType ||
        combined.type ||
        combined['loại bối cảnh'] ||
        combined['địa hình'] ||
        entity.subtitle ||
        '',
      scale: combined.scale || combined['quy mô'] || combined['kích thước'] || '',
      atmosphere:
        combined.atmosphere ||
        combined.lighting ||
        combined['khí hậu'] ||
        combined['ánh sáng'] ||
        combined.mood ||
        '',
      architecture:
        combined.architecture ||
        combined['kiến trúc'] ||
        (isLocation ? entity.description : '') ||
        '',

      // Prop fields
      propType:
        combined.propType ||
        combined.type ||
        combined['loại đạo cụ'] ||
        combined['phân loại'] ||
        entity.subtitle ||
        '',
      sizeWeight:
        combined.sizeWeight ||
        combined.size ||
        combined['kích thước'] ||
        combined['trọng lượng'] ||
        '',
      material: combined.material || combined['chất liệu'] || combined['nguồn gốc'] || '',
      functionality:
        combined.functionality ||
        combined['công năng'] ||
        combined['cơ chế'] ||
        (isProp ? entity.description : '') ||
        '',

      // Terminology fields
      termType:
        combined.termType ||
        combined.type ||
        combined['lĩnh vực'] ||
        combined['phân loại'] ||
        entity.subtitle ||
        '',
      origin: combined.origin || combined['nguồn gốc'] || combined['xuất xứ'] || '',
      rules:
        combined.rules ||
        combined['quy luật'] ||
        combined['nguyên lý'] ||
        (isTerminology ? entity.description : '') ||
        '',
      plotImpact: combined.plotImpact || combined['tác động'] || combined['vai trò'] || '',

      // Style fields
      strictness: rawEntry?.strictCheck ? 'Khắt khe (Strict Check)' : 'Tiêu chuẩn',
      colorPalette: combined.colorPalette || combined.palette || combined['bảng màu'] || '',
      lineArtRules:
        combined.lineArtRules ||
        combined['nét vẽ'] ||
        combined['quy chuẩn'] ||
        (isStyleRule ? entity.description : '') ||
        '',
      negativeConstraints:
        entity.negativeConstraints?.join(', ') ||
        combined.negativeConstraints ||
        combined['cấm kỵ'] ||
        '',
    };
  }, [
    activeRevision,
    entity,
    rawEntry,
    isCharacter,
    isLocation,
    isProp,
    isTerminology,
    isStyleRule,
  ]);

  const card1Title = useMemo(() => {
    const stage = activeStage?.stageName || 'Giai đoạn chuẩn';
    if (isLocation) return `Thông số không gian & Bối cảnh (${stage})`;
    if (isProp) return `Thông số đạo cụ & Vật phẩm (${stage})`;
    if (isTerminology) return `Đặc tả thuật ngữ & Khái niệm (${stage})`;
    if (isStyleRule) return `Quy chuẩn mỹ thuật (${stage})`;
    return `Thông số thời kỳ (${stage})`;
  }, [isLocation, isProp, isTerminology, isStyleRule, activeStage]);

  const visualCardInfo = useMemo(() => {
    if (isLocation) {
      return {
        title: 'Bản vẽ Concept Bối cảnh',
        badge: 'Concept Bối cảnh',
        subtitle: 'Bản vẽ tham chiếu không gian và ánh sáng cho đội ngũ sáng tác',
        tab1: 'Toàn cảnh (Wide Shot)',
        tab2: 'Góc cận cảnh (Close-up)',
        emptyWriterPrompt:
          'Biên kịch (Writer) và Biên tập viên có thể cập nhật thông số bối cảnh để Họa sĩ nắm bắt chính xác không gian trước khi vẽ.',
        emptyArtistPrompt:
          'Bạn hãy tải lên bản phác thảo Concept Bối cảnh theo thông số không gian phía trên để bắt đầu chu trình kiểm duyệt.',
      };
    }
    if (isProp) {
      return {
        title: 'Bản vẽ Thiết kế Đạo cụ',
        badge: 'Thiết kế Đạo cụ',
        subtitle: 'Bản vẽ tham chiếu cấu tạo và chi tiết vật phẩm cho đội ngũ sáng tác',
        tab1: 'Tổng thể (Overview)',
        tab2: 'Cơ chế & Chi tiết',
        emptyWriterPrompt:
          'Biên kịch (Writer) và Biên tập viên có thể cập nhật thông số vật phẩm để Họa sĩ nắm bắt cấu tạo trước khi vẽ.',
        emptyArtistPrompt:
          'Bạn hãy tải lên bản phác thảo Thiết kế Đạo cụ theo thông số vật phẩm phía trên để bắt đầu chu trình kiểm duyệt.',
      };
    }
    if (isTerminology) {
      return {
        title: 'Sơ đồ & Minh họa Khái niệm',
        badge: 'Tài liệu trực quan',
        subtitle: 'Sơ đồ, biểu tượng hoặc hình ảnh minh họa cho thuật ngữ cốt truyện',
        tab1: 'Minh họa chính',
        tab2: 'Sơ đồ & Chi tiết',
        emptyWriterPrompt:
          'Biên kịch (Writer) và Biên tập viên có thể cập nhật mô tả thuật ngữ để Họa sĩ thiết kế hình ảnh minh họa phù hợp.',
        emptyArtistPrompt:
          'Bạn hãy tải lên sơ đồ hoặc hình ảnh minh họa cho khái niệm này để làm tài liệu tham chiếu.',
      };
    }
    if (isStyleRule) {
      return {
        title: 'Quy chuẩn Phong cách Mỹ thuật',
        badge: 'Style Guide Sheet',
        subtitle: 'Mẫu tham chiếu bảng màu, nét vẽ và hiệu ứng phân khung cho toàn bộ truyện',
        tab1: 'Bảng màu & Nét vẽ',
        tab2: 'Minh họa quy chuẩn',
        emptyWriterPrompt:
          'Biên tập viên mỹ thuật có thể cập nhật thông số quy chuẩn để họa sĩ tuân thủ nhất quán phong cách.',
        emptyArtistPrompt:
          'Bạn hãy tải lên bảng mẫu Style Guide tham chiếu cho quy tắc mỹ thuật này.',
      };
    }
    return {
      title: 'Bản vẽ Model Sheet',
      badge: 'Chuẩn tham chiếu',
      subtitle: 'Bản vẽ tham chiếu chuẩn cho đội ngũ sáng tác',
      tab1: 'Turnaround',
      tab2: 'Góc nhìn & Biểu cảm',
      emptyWriterPrompt:
        'Biên kịch (Writer) và Biên tập viên có thể cập nhật thông số đặc tả kịch bản để Họa sĩ nắm bắt chính xác tạo hình trước khi vẽ.',
      emptyArtistPrompt:
        'Bạn hãy tải lên bản phác thảo Model Sheet theo thông số thời kỳ phía trên để bắt đầu chu trình kiểm duyệt.',
    };
  }, [isLocation, isProp, isTerminology, isStyleRule]);

  // Dynamic Audit logs for SHA-256 Provenance & Revision Events
  const auditLogs = useMemo(() => {
    const list: Array<{ time: string; actor: string; action: string; hash: string }> = [];

    // Prioritize real chronological events from activeRevision.events if available
    if (activeRevision?.events && activeRevision.events.length > 0) {
      activeRevision.events.forEach((evt) => {
        let actionDesc = '';
        let actorDesc = 'Hệ thống';
        switch (evt.type) {
          case 'Created':
            actorDesc = 'Khởi tạo';
            actionDesc = `Khởi tạo phiên bản v${activeRevision.versionNumber}`;
            break;
          case 'ConceptSubmitted':
            actorDesc = 'Họa sĩ';
            actionDesc = `Đã nộp Concept Art${evt.comment ? `: "${evt.comment}"` : ''}`;
            break;
          case 'ReworkRequested':
            actorDesc = 'Biên kịch / Biên tập';
            actionDesc = `Yêu cầu sửa${evt.comment ? `: "${evt.comment}"` : ''}`;
            break;
          case 'Endorsed':
            actorDesc = 'Biên kịch / Biên tập';
            actionDesc = 'Đã duyệt thiết kế sáng tác';
            break;
          case 'Locked':
            actorDesc = 'Nhà sản xuất';
            actionDesc = `Ban hành quy chuẩn chính thức cho Ch.${activeRevision.effectiveFromChapterNumber}+`;
            break;
          case 'Superseded':
            actorDesc = 'Nhà sản xuất';
            actionDesc = `Thay thế bởi phiên bản mới${evt.comment ? `: "${evt.comment}"` : ''}`;
            break;
          default:
            actionDesc = `Sự kiện ${evt.type}`;
        }

        list.push({
          time: evt.createdAt ? new Date(evt.createdAt).toLocaleDateString('vi-VN') : 'Mới',
          actor: actorDesc,
          action: actionDesc,
          hash: '',
        });
      });
      return [...list].reverse();
    }

    if (activeStage?.revisions) {
      activeStage.revisions.forEach((rev) => {
        if (rev.isLocked || rev.reviewStatus === 'CanonLocked') {
          list.push({
            time: rev.lockedAt ? new Date(rev.lockedAt).toLocaleDateString('vi-VN') : 'Đã duyệt',
            actor: 'Nhà sản xuất',
            action: `Ban hành quy chuẩn chính thức cho Ch.${rev.effectiveFromChapterNumber}+ (v${rev.versionNumber})`,
            hash: '',
          });
        }
        if (rev.reviewStatus === 'WriterEndorsed') {
          list.push({
            time: rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('vi-VN') : 'Gần đây',
            actor: 'Biên kịch',
            action: `Đã duyệt thiết kế sáng tác cho phiên bản v${rev.versionNumber}`,
            hash: '',
          });
        }
        if (rev.reviewStatus === 'ConceptSubmitted') {
          list.push({
            time: rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('vi-VN') : 'Gần đây',
            actor: 'Họa sĩ',
            action: `Đã nộp bản vẽ thiết kế cho phiên bản v${rev.versionNumber}`,
            hash: '',
          });
        }
      });
    }
    if (list.length === 0) {
      list.push({
        time: rawEntry?.createdAt
          ? new Date(rawEntry.createdAt).toLocaleDateString('vi-VN')
          : 'Khởi tạo',
        actor: 'Hệ thống',
        action: 'Khởi tạo hồ sơ lưu trữ thiết kế sáng tác',
        hash: '',
      });
    }
    return list;
  }, [activeRevision, activeStage, rawEntry]);

  const modalContainerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  // Focus trap, Escape key listener & Body scroll locking
  useEffect(() => {
    lastActiveElementRef.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not close workbench if any child modal (e.g. Add Revision, Confirm, Zoom) is currently open on top
      const hasOpenChildModal =
        document.querySelector('[data-child-modal="true"]') ||
        document.querySelectorAll('[role="dialog"]').length > 1;

      if (e.key === 'Escape') {
        if (hasOpenChildModal) {
          // Let the top child modal handle Escape instead of closing the entire workbench
          return;
        }
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalContainerRef.current) {
        const focusableElements = modalContainerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusableElements.length === 0) return;
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      lastActiveElementRef.current?.focus?.();
    };
  }, [onClose]);

  // Clipboard paste listener for quick Model Sheet upload via Ctrl+V
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!canCreateDraft) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          onOpenAddRevision(entity, activeRevision);
          onShowToast('Đã nhận diện ảnh dán', 'Đang mở giao diện nộp bản vẽ Model Sheet mới...');
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [canCreateDraft, entity, activeRevision, onOpenAddRevision, onShowToast]);

  const handleEndorse = async (rev: BibleEntryRevisionDto) => {
    if (!onEndorseRevision) return;
    setIsEndorsing(true);
    try {
      await onEndorseRevision(entity, rev);
      setAllRevisions((prev) =>
        prev.map((r) => (r.id === rev.id ? { ...r, reviewStatus: 'WriterEndorsed' } : r)),
      );
    } finally {
      setIsEndorsing(false);
    }
  };

  const handleRequestRework = (rev: BibleEntryRevisionDto) => {
    if (!onRequestRework) return;
    onRequestRework(entity, rev);
    setAllRevisions((prev) =>
      prev.map((r) => (r.id === rev.id ? { ...r, reviewStatus: 'ReworkRequired' } : r)),
    );
  };

  const handleLock = async (rev: BibleEntryRevisionDto) => {
    if (!onLockRevision) return;
    setIsLocking(true);
    try {
      await onLockRevision(rev);
      setAllRevisions((prev) =>
        prev.map((r) =>
          r.id === rev.id ? { ...r, isLocked: true, reviewStatus: 'CanonLocked' } : r,
        ),
      );
    } finally {
      setIsLocking(false);
    }
  };

  const getCategoryLabel = (category: string | number): string => {
    const catStr = String(category).toLowerCase();
    switch (catStr) {
      case 'characters':
      case 'character':
      case '0':
      case '1':
        return 'Nhân vật';
      case 'locations':
      case 'location':
      case '2':
        return 'Bối cảnh & Địa điểm';
      case 'terminology':
      case 'prop':
      case '3':
      case '4':
      case '6':
        return 'Thuật ngữ & Đạo cụ';
      case 'style':
      case 'rule':
      case '5':
        return 'Quy tắc mỹ thuật';
      default:
        return 'Mục tri thức';
    }
  };

  const getCategoryBadgeStyle = (category: string | number): string => {
    const catStr = String(category).toLowerCase();
    if (catStr.includes('char') || catStr === '1' || catStr === '0') {
      return 'bg-amber-50 text-amber-800 border-amber-300';
    }
    if (catStr.includes('loc') || catStr === '2') {
      return 'bg-emerald-50 text-emerald-800 border-emerald-300';
    }
    if (catStr.includes('term') || catStr.includes('prop') || ['3', '4', '6'].includes(catStr)) {
      return 'bg-blue-50 text-blue-800 border-blue-300';
    }
    if (catStr.includes('style') || catStr.includes('rule') || catStr === '5') {
      return 'bg-violet-50 text-violet-800 border-violet-300';
    }
    return 'bg-stone-50 text-stone-700 border-stone-200';
  };

  const modalContent = (
    <div
      ref={modalContainerRef}
      className='fixed inset-0 z-[1000] bg-[#FAF8F5] flex flex-col overflow-hidden animate-in fade-in duration-150'
      onClick={(e) => e.stopPropagation()}
      role='dialog'
      aria-modal='true'
      aria-labelledby='bible-entity-title'
    >
      {/* ================= WORKBENCH TOP BAR ================= */}
      <header className='h-14 sm:h-16 bg-[#FCFBF8] border-b border-[#D8D2C5] px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-2xs z-30'>
        {/* Left: Back button + Breadcrumb + Entity Name */}
        <div className='flex items-center gap-2.5 sm:gap-3 min-w-0'>
          <button
            type='button'
            onClick={onClose}
            className='inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#D8D2C5] bg-[#FAF8F5] hover:bg-[#F3F0E9] text-xs font-semibold text-[#1C1917] transition-all cursor-pointer shadow-2xs'
            title='Quay lại danh sách Series Bible'
          >
            <ArrowLeft className='w-3.5 h-3.5 text-[#F97316]' />
            <span className='hidden sm:inline'>Quay lại Series Bible</span>
          </button>

          <span className='text-zinc-300 font-mono hidden sm:inline'>/</span>

          <nav className='flex items-center gap-1.5 text-xs text-[#57534E] min-w-0'>
            <span className='hover:text-[#1C1917] transition hidden md:inline'>Series Bible</span>
            <span className='hidden md:inline'>›</span>
            <span className='hover:text-[#1C1917] transition hidden md:inline'>Kho tri thức</span>
            <span className='hidden md:inline'>›</span>
            <div className='flex items-center gap-1.5 bg-[#FAF8F5] px-2.5 py-1 rounded-lg border border-[#D8D2C5]'>
              <span className='w-2 h-2 rounded-full bg-[#F97316]'></span>
              <h2
                id='bible-entity-title'
                className='text-xs sm:text-sm font-bold font-serif text-[#1C1917] truncate'
              >
                {entity.name}
              </h2>
            </div>
          </nav>

          <span className='font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-800 border border-zinc-300 shrink-0 hidden sm:inline'>
            {entity.code}
          </span>
          <span
            className={`px-2.5 py-0.5 rounded text-xs font-bold border shrink-0 ${getCategoryBadgeStyle(entity.category)}`}
          >
            {getCategoryLabel(entity.category)}
          </span>
        </div>

        {/* Right: Concept Guide & Role Badge */}
        <div className='flex items-center gap-2 shrink-0'>
          <button
            type='button'
            onClick={() => setShowConceptGuide((v) => !v)}
            className='text-xs font-semibold px-2.5 py-1 rounded-lg border border-[#D8D2C5] hover:bg-[#FAF8F5] text-[#57534E] hover:text-[#1C1917] transition flex items-center gap-1.5 cursor-pointer shadow-2xs'
            title='Xem hướng dẫn phân biệt Giai đoạn cốt truyện và Phiên bản mỹ thuật'
          >
            <HelpCircle className='w-3.5 h-3.5 text-[#F97316]' />
            <span className='hidden sm:inline'>Quy ước Giai đoạn</span>
          </button>

          {/* Role indicator badge */}
          <div className='px-2.5 py-1 rounded-lg text-xs font-bold border shrink-0 flex items-center gap-1.5 shadow-2xs bg-stone-100 text-stone-800 border-stone-300'>
            <User className='w-3 h-3 text-[#F97316]' />
            <span>
              {isProducerUser
                ? 'Nhà sản xuất'
                : isWriterUser
                  ? 'Biên kịch'
                  : isArtistUser
                    ? 'Họa sĩ'
                    : isEditorUser
                      ? 'Biên tập viên'
                      : 'Người xem'}
            </span>
          </div>

          <button
            ref={closeButtonRef}
            type='button'
            onClick={onClose}
            className='p-1.5 rounded-lg hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer shrink-0'
            title='Đóng bàn làm việc (Phím Esc)'
            aria-label='Đóng cửa sổ chi tiết'
          >
            <X className='w-4 h-4' />
          </button>
        </div>
      </header>

      {/* ================= WORKSPACE BODY CONTAINER ================= */}
      <main className='flex-1 overflow-y-auto max-w-7xl w-full mx-auto p-3 sm:p-5 md:p-6 space-y-4 custom-scrollbar'>
        {/* ================= COLLAPSIBLE CONCEPT NOTICE BANNER ================= */}
        {showConceptGuide && (
          <div className='bg-gradient-to-r from-amber-50 via-white to-violet-50 border border-amber-200 rounded-xl p-3.5 sm:p-4 shadow-xs relative transition-all animate-in fade-in duration-200'>
            <button
              type='button'
              onClick={() => setShowConceptGuide(false)}
              className='absolute top-2.5 right-2.5 text-stone-400 hover:text-stone-700 text-xs'
              aria-label='Đóng hướng dẫn'
            >
              ✕
            </button>
            <div className='flex items-start gap-3'>
              <div className='w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 mt-0.5'>
                <Info className='w-4 h-4' />
              </div>
              <div className='text-xs space-y-1.5 pr-4'>
                <div className='font-bold text-stone-900 text-xs sm:text-sm'>
                  Hiểu đúng cấu trúc: Narrative Era (Thời kỳ) vs. Asset Version (Phiên bản mỹ thuật)
                </div>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 text-stone-600 text-xs'>
                  <div className='bg-white/90 p-2.5 rounded-lg border border-amber-200/60'>
                    <span className='font-bold text-[#C2410C] uppercase tracking-wider text-xs block mb-0.5'>
                      Trục Cốt Truyện — ERA (Narrative Timeline)
                    </span>
                    Nhân vật thay đổi theo cốt truyện (Tuổi, Timeskip, Sẹo, Dạng quỷ). Gắn với{' '}
                    <strong>Mốc chương hiệu lực (Effective from Chapter)</strong> để Họa sĩ và ban
                    biên kịch đảm bảo tính nhất quán hình thái.
                  </div>
                  <div className='bg-white/90 p-2.5 rounded-lg border border-violet-100'>
                    <span className='font-bold text-violet-700 uppercase tracking-wider text-xs block mb-0.5'>
                      Tiến trình phiên bản thiết kế
                    </span>
                    Vòng đời phê duyệt: Bản thảo ➔ Kiểm duyệt ➔ Đã khóa chuẩn (Canon Locked).
                    Theo quy tắc bảo toàn nguồn gốc: Bản đã khóa chuẩn không thể sửa đè, chỉ có thể tạo bản kế thừa tiếp theo (Supersede).
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= SINGLE CONTEXTUAL STATUS ALERT (LUCIAN INLINE ALERT) ================= */}
        {activeRevision?.reviewStatus === 'ReworkRequired' ? (
          <LucianInlineAlert
            type='warning'
            title='Yêu cầu chỉnh sửa bản vẽ từ Writer / Editor'
            description={
              activeRevision.reworkFeedback ||
              'Writer yêu cầu chỉnh sửa lại thiết kế cho giai đoạn này.'
            }
            details={`Giai đoạn: "${activeStage?.stageName || 'Chuẩn'}" · Hiệu lực từ Chương ${activeStage?.effectiveFromChapterNumber ?? 1} đến ${activeStage?.effectiveToChapterNumber || 'hết truyện'}. Vui lòng chỉnh sửa nét vẽ theo yêu cầu trên và nộp lại.`}
            dismissible={false}
          />
        ) : activeRevision?.reviewStatus === 'ConceptSubmitted' && !activeRevision.isLocked ? (
          <LucianInlineAlert
            type='info'
            title='Bản vẽ Model Sheet đã nộp – Đang chờ kiểm duyệt'
            description='Bản thiết kế đang chờ Writer/Editor xác nhận. Nếu bạn phát hiện đã tải nhầm ảnh hoặc muốn cập nhật nét vẽ tốt hơn trước khi được duyệt, bạn có thể nộp lại ngay.'
            details={`Giai đoạn: "${activeStage?.stageName || 'Chuẩn'}" · Lần sửa #${activeRevision.versionNumber}.`}
            dismissible={false}
          />
        ) : activeRevision?.isLocked || activeRevision?.reviewStatus === 'CanonLocked' ? (
          <div className='p-3 sm:p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-950 shadow-2xs'>
            <div className='w-7 h-7 rounded-lg bg-amber-100 border border-amber-300/70 flex items-center justify-center text-amber-700 shrink-0 mt-0.5'>
              <Lock className='w-4 h-4' />
            </div>
            <div className='space-y-1 flex-1 min-w-0'>
              <div className='flex items-center gap-2 flex-wrap'>
                <span className='font-bold uppercase tracking-wider text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded'>
                  🔒 Đã khóa chuẩn (Canon Locked)
                </span>
                <span className='text-xs font-semibold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-300/60'>
                  {activeStage?.stageName ? `${activeStage.stageName} · ` : ''}
                  Ch.{activeRevision?.effectiveFromChapterNumber ?? 1}
                  {activeRevision?.effectiveToChapterNumber
                    ? `–${activeRevision.effectiveToChapterNumber}`
                    : ' → hết'}
                </span>
                <span className='font-mono font-bold text-xs bg-amber-200/70 text-amber-900 px-1.5 py-0.2 rounded'>
                  Lần sửa #{activeRevision.versionNumber}
                </span>
                {activeRevision.lockedAt && (
                  <span className='text-xs font-medium text-amber-800'>
                    • Đã duyệt {new Date(activeRevision.lockedAt).toLocaleDateString('vi-VN')}
                  </span>
                )}
              </div>
              <p className='text-xs text-amber-900/90 leading-relaxed'>
                Bản thiết kế cho giai đoạn này đã được Producer phê duyệt chính thức (Canon Locked).
                Toàn bộ đội ngũ sản xuất sử dụng bản vẽ này làm quy chuẩn tham chiếu thống nhất.
              </p>
            </div>
          </div>
        ) : null}

        {/* ================= 3-COLUMN WORKBENCH: THỜI KỲ (3) - ARTWORK (6) - THÔNG TIN (3) ================= */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-4 items-start'>
          {/* ================= COLUMN 1: THỜI KỲ & GIAI ĐOẠN (COL-SPAN 3) ================= */}
          <section className='lg:col-span-3 space-y-3' data-testid='era-stages-selector'>
            <div className='bg-[#FCFBF8] border border-stone-200 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3'>
              <div className='flex items-center justify-between pb-2 border-b border-stone-200/80'>
                <div className='font-bold text-xs sm:text-sm text-[#1C1917] flex items-center gap-2'>
                  <Layers className='w-4 h-4 text-[#F97316]' />
                  <span>Thời kỳ &amp; Giai đoạn</span>
                </div>
                <span className='text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600'>
                  {stages.length} giai đoạn
                </span>
              </div>

              {/* Prominent Primary Create Stage Button */}
              {canCreateDraft && (
                <button
                  type='button'
                  onClick={() => {
                    onOpenAddRevision(entity, null, false, undefined, undefined, false, true);
                  }}
                  data-testid='add-new-era-btn'
                  className='w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer shadow-sm hover:shadow active:scale-[0.98]'
                  title='Tạo giai đoạn cốt truyện mới cho nhân vật'
                >
                  <Plus className='w-4 h-4' />
                  <span>+ Tạo giai đoạn</span>
                </button>
              )}

              {/* Vertical list of era stages */}
              <div className='space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar pr-0.5'>
                {stages.map((stage) => {
                  const isActive = selectedStageKey === stage.stageKey;
                  const isStandardStage =
                    stage.stageName === 'Giai đoạn chuẩn' ||
                    stage.stageName.toLowerCase().includes('chuẩn');
                  const stageIcon = isStandardStage
                    ? null
                    : getStageIcon(stage.stageName, entity.category);
                  return (
                    <div
                      key={stage.stageKey}
                      onClick={() => {
                        setSelectedStageKey(stage.stageKey);
                        setSelectedVersionId(null);
                      }}
                      data-testid={`era-tab-${stage.stageKey}`}
                      className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                        isActive
                          ? 'bg-[#FFF7ED] text-[#EA580C] border-2 border-[#F97316] shadow-xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400 hover:bg-stone-50/60'
                      }`}
                    >
                      <div className='flex items-center justify-between gap-1.5'>
                        <div className='flex items-center gap-1.5 min-w-0 font-semibold text-xs sm:text-sm'>
                          {stageIcon && <span>{stageIcon}</span>}
                          <span className='truncate'>{stage.stageName}</span>
                        </div>
                        {stage.isLocked ? (
                          <span className='text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0'>
                            🔒 Chính thức
                          </span>
                        ) : (
                          <span className='text-[10px] font-medium px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 shrink-0'>
                            Bản nháp
                          </span>
                        )}
                      </div>

                      <div className='flex items-center justify-between text-xs text-stone-500'>
                        <span className='font-mono font-medium text-[11px] bg-stone-100 px-2 py-0.5 rounded-full'>
                          Ch.{stage.effectiveFromChapterNumber}
                          {stage.effectiveToChapterNumber ? `–${stage.effectiveToChapterNumber}` : '+'}
                        </span>
                        <span className='text-[11px] text-stone-400'>
                          {stage.revisions.length} phiên bản
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Quick Create Stage Action */}
              {canCreateDraft && (
                <button
                  type='button'
                  onClick={() => {
                    onOpenAddRevision(entity, null, false, undefined, undefined, false, true);
                  }}
                  className='w-full py-2 border-2 border-dashed border-stone-300 hover:border-[#F97316] text-stone-600 hover:text-[#EA580C] hover:bg-orange-50/50 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1'
                  title='Thêm giai đoạn cốt truyện mới'
                >
                  <Plus className='w-3.5 h-3.5' />
                  <span>+ Tạo giai đoạn mới</span>
                </button>
              )}
            </div>
          </section>

          {/* ================= COLUMN 2: HERO ARTWORK & MODEL SHEET (COL-SPAN 6) ================= */}
          <section className='lg:col-span-6 space-y-3.5'>
            <div className='bg-[#FCFBF8] border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3'>
              {/* Artwork Header: Tab Turnaround vs Action / Expressions + Zoom button */}
              <div className='flex items-center justify-between pb-2 border-b border-stone-200/80'>
                <div className='flex items-center gap-2 min-w-0'>
                  <Palette className='w-4 h-4 text-[#F97316] shrink-0' />
                  <span className='font-bold text-xs sm:text-sm text-[#1C1917] truncate'>
                    {visualCardInfo.title}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200`}>
                    {visualCardInfo.badge}
                  </span>
                </div>

                <div className='flex items-center gap-2 shrink-0'>
                  <div className='flex bg-stone-100 p-0.5 rounded-xl border border-stone-200'>
                    <button
                      type='button'
                      onClick={() => setActiveArtTab('turnaround')}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                        activeArtTab === 'turnaround'
                          ? 'bg-white text-[#1C1917] shadow-xs font-bold'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      {visualCardInfo.tab1}
                    </button>
                    <button
                      type='button'
                      onClick={() => setActiveArtTab('action')}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                        activeArtTab === 'action'
                          ? 'bg-white text-[#1C1917] shadow-xs font-bold'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      {visualCardInfo.tab2}
                    </button>
                  </div>

                  {selectedImageUrl && (
                    <button
                      type='button'
                      onClick={() =>
                        onZoomImage({
                          url: selectedImageUrl,
                          title: selectedImageTitle || entity.name,
                        })
                      }
                      className='p-1.5 rounded-lg border border-stone-200 hover:bg-white text-stone-600 hover:text-orange-600 transition shadow-2xs cursor-pointer'
                      title='Phóng to ảnh'
                    >
                      <Eye className='w-4 h-4' />
                    </button>
                  )}
                </div>
              </div>

              {/* Hero Canvas Viewport (To, Rõ Ràng, Nổi Bật) */}
              {selectedImageUrl ? (
                <div className='space-y-3'>
                  <div className='flex items-center justify-between text-xs font-semibold text-stone-700'>
                    <span className='truncate max-w-[280px] text-xs font-bold text-[#1C1917]'>
                      {selectedImageTitle || `${entity.name} - Model Sheet`}
                    </span>
                    <span className='text-[11px] text-stone-400 font-mono'>Turnaround / Model Sheet Canvas</span>
                  </div>
                  <div
                    className='relative w-full h-[480px] sm:h-[520px] md:h-[560px] bg-[#121214] rounded-2xl overflow-hidden border border-stone-800 cursor-pointer group flex items-center justify-center p-3 shadow-inner'
                    onClick={() =>
                      onZoomImage({
                        url: selectedImageUrl,
                        title: selectedImageTitle || entity.name,
                      })
                    }
                  >
                    <AuthenticatedImage
                      src={selectedImageUrl}
                      alt={selectedImageTitle || entity.name}
                      className='w-full h-full object-contain drop-shadow-md'
                    />
                    <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-[1px]'>
                      <Eye className='w-4 h-4' />
                      <span>Bấm để phóng to xem đầy đủ</span>
                    </div>
                  </div>

                  {/* Character Sheet Gallery Strip */}
                  {entity.gallery && entity.gallery.length > 0 && (
                    <div className='space-y-1.5 pt-2 border-t border-stone-200/80'>
                      <div className='flex items-center justify-between text-xs font-semibold text-stone-700'>
                        <span>Góc nhìn &amp; Biểu cảm ({entity.gallery.length}):</span>
                        <span className='text-xs text-stone-500'>Bấm để đổi góc xem</span>
                      </div>
                      <div className='flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar'>
                        {entity.imageUrl && (
                          <button
                            type='button'
                            onClick={() => {
                              setSelectedImageUrl(entity.imageUrl!);
                              setSelectedImageTitle(`${entity.name} - Mặt chính diện`);
                            }}
                            className={`relative flex items-center gap-1.5 px-2 py-1 rounded-lg border shrink-0 transition-all cursor-pointer ${
                              selectedImageUrl === entity.imageUrl
                                ? 'border-[#F97316] bg-orange-50/50 ring-1 ring-[#F97316]/20'
                                : 'border-stone-200 hover:border-stone-300 bg-white'
                            }`}
                          >
                            <div className='w-8 h-8 rounded overflow-hidden shrink-0'>
                              <AuthenticatedImage
                                src={entity.imageUrl}
                                alt={entity.name}
                                className='w-full h-full object-cover'
                              />
                            </div>
                            <span className='text-xs font-medium text-stone-800'>
                              Mặt chính diện
                            </span>
                          </button>
                        )}
                        {entity.gallery.map((img, i) => (
                          <button
                            key={i}
                            type='button'
                            onClick={() => {
                              setSelectedImageUrl(img.url);
                              setSelectedImageTitle(
                                `${entity.name} - ${img.label || `Góc ${i + 1}`}`,
                              );
                            }}
                            className={`relative flex items-center gap-1.5 px-2 py-1 rounded-lg border shrink-0 transition-all cursor-pointer ${
                              selectedImageUrl === img.url
                                ? 'border-[#F97316] bg-orange-50/50 ring-1 ring-[#F97316]/20'
                                : 'border-stone-200 hover:border-stone-300 bg-white'
                            }`}
                          >
                            <div className='w-8 h-8 rounded overflow-hidden shrink-0'>
                              <AuthenticatedImage
                                src={img.url}
                                alt={img.label || `${entity.name} góc ${i + 1}`}
                                className='w-full h-full object-cover'
                              />
                            </div>
                            <span className='text-xs font-medium text-stone-800'>
                              {img.label || `Góc ${i + 1}`}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (canCreateDraft) setIsDraggingOver(true);
                  }}
                  onDragLeave={() => setIsDraggingOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingOver(false);
                    if (canCreateDraft) {
                      onOpenAddRevision(entity, activeRevision);
                    }
                  }}
                  className={`p-8 sm:p-12 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3.5 text-center min-h-[460px] group ${
                    isDraggingOver
                      ? 'border-[#F97316] bg-orange-50/70 shadow-inner ring-4 ring-[#F97316]/10'
                      : 'border-stone-300 hover:border-[#F97316] bg-stone-50/60 hover:bg-orange-50/30'
                  }`}
                >
                  <div className='w-14 h-14 rounded-2xl bg-orange-100/80 border border-orange-200 flex items-center justify-center text-[#EA580C] group-hover:scale-105 group-hover:bg-[#F97316] group-hover:text-white transition-all shadow-2xs'>
                    <Upload className='w-7 h-7' />
                  </div>
                  <div className='max-w-md space-y-1.5'>
                    <div className='text-sm sm:text-base font-bold text-stone-900'>
                      Chưa có ảnh Reference Sheet cho mục này
                    </div>
                    <p className='text-xs text-stone-500 leading-relaxed'>
                      {isArtistUser
                        ? visualCardInfo.emptyArtistPrompt
                        : visualCardInfo.emptyWriterPrompt}
                    </p>
                  </div>
                  {canCreateDraft && (
                    <div className='flex flex-col items-center gap-2 pt-2'>
                      <button
                        type='button'
                        onClick={() => {
                          onOpenAddRevision(entity, activeRevision);
                        }}
                        className='inline-flex items-center gap-2 px-6 py-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-[0.98]'
                        title='Tải lên bản vẽ tham chiếu Model Sheet mới'
                      >
                        <Upload className='w-4 h-4' />
                        <span>+ Tải lên Model Sheet</span>
                      </button>
                      <div className='flex items-center gap-1.5 text-[11px] text-stone-400'>
                        <span>Kéo thả file ảnh vào đây hoặc nhấn</span>
                        <kbd className='px-1.5 py-0.5 bg-stone-200/80 border border-stone-300 rounded font-mono text-[10px] text-stone-700 font-semibold'>
                          Ctrl + V
                        </kbd>
                        <span>để dán</span>
                      </div>
                      <button
                        type='button'
                        onClick={() => {
                          onOpenAddRevision(entity);
                        }}
                        className='inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg text-[11px] font-medium text-stone-600 transition-colors cursor-pointer mt-0.5'
                      >
                        <Edit3 className='w-3 h-3 text-stone-500' />
                        <span>
                          {isWriterUser
                            ? 'Chỉnh sửa đặc tả / Cập nhật kịch bản'
                            : 'Tạo phiên bản mới để thêm ảnh'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ROLE ACTIONS BAR (FOCUSED & MINIMAL) */}
              <div className='pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2'>
                {/* Status indicator on the left of action bar */}
                <div className='text-xs text-stone-500 flex items-center gap-1.5'>
                  {!selectedImageUrl ? (
                    <span className='inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200'>
                      <Clock className='w-3 h-3 text-amber-600' />
                      Chờ Họa sĩ tải lên bản vẽ
                    </span>
                  ) : activeRevision?.reviewStatus === 'Draft' ? (
                    <span className='inline-flex items-center gap-1 text-xs font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200'>
                      Bản thảo (Chưa nộp duyệt)
                    </span>
                  ) : activeRevision?.reviewStatus === 'ConceptSubmitted' ? (
                    <span className='inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 animate-pulse'>
                      ● Chờ Writer / Editor duyệt thiết kế
                    </span>
                  ) : activeRevision?.reviewStatus === 'WriterEndorsed' ? (
                    <span className='inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200'>
                      ✓ Writer đã duyệt (Chờ Producer khóa Canon)
                    </span>
                  ) : activeRevision?.reviewStatus === 'ReworkRequired' ? (
                    <span className='inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200'>
                      ↺ Yêu cầu vẽ lại
                    </span>
                  ) : null}
                </div>

                <div className='flex items-center gap-2 flex-wrap ml-auto'>
                  {/* Artist Actions */}
                  {isArtistUser && (
                    <>
                      {activeRevision?.reviewStatus === 'ConceptSubmitted' && (
                        <button
                          type='button'
                          onClick={() => {
                            onOpenAddRevision(
                              entity,
                              null,
                              true,
                              activeRevision.effectiveFromChapterNumber,
                              undefined,
                              true,
                            );
                          }}
                          className='px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer active:scale-[0.98]'
                          data-testid='detail-artist-resubmit-btn'
                        >
                          <RotateCcw className='w-3.5 h-3.5' />
                          <span>🔄 Nộp lại bản vẽ</span>
                        </button>
                      )}
                      {activeRevision?.reviewStatus === 'ReworkRequired' && (
                        <button
                          type='button'
                          onClick={() => {
                            onOpenAddRevision(
                              entity,
                              null,
                              true,
                              activeRevision.effectiveFromChapterNumber,
                              activeRevision.reworkFeedback || undefined,
                              false,
                            );
                          }}
                          className='px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer active:scale-[0.98]'
                          data-testid='detail-artist-rework-btn'
                        >
                          <RotateCcw className='w-3.5 h-3.5' />
                          <span>Nộp bản vẽ sửa đổi</span>
                        </button>
                      )}
                    </>
                  )}

                  {/* Review Actions (Writer/Editor Endorse & Request Rework) */}
                  {canReview && activeRevision && (
                    <div className='flex items-center gap-2'>
                      <button
                        type='button'
                        disabled={isEndorsing || activeRevision.reviewStatus === 'WriterEndorsed'}
                        onClick={async () => {
                          setIsEndorsing(true);
                          try {
                            await onEndorseRevision?.(entity, activeRevision);
                          } finally {
                            setIsEndorsing(false);
                          }
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-xs transition-all ${
                          activeRevision.reviewStatus === 'WriterEndorsed'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-[0.98]'
                        } disabled:opacity-60`}
                        data-testid='detail-endorse-btn'
                      >
                        <CheckCircle2 className='w-3.5 h-3.5' />
                        <span>
                          {isEndorsing
                            ? 'Đang duyệt...'
                            : activeRevision.reviewStatus === 'WriterEndorsed'
                              ? '✓ Đã duyệt thiết kế'
                              : '✓ Duyệt thiết kế'}
                        </span>
                      </button>
                      <button
                        type='button'
                        disabled={
                          activeRevision.reviewStatus === 'WriterEndorsed' ||
                          activeRevision.isLocked ||
                          isEndorsing
                        }
                        onClick={() => onRequestRework?.(entity, activeRevision)}
                        className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-2xs transition-all ${
                          activeRevision.reviewStatus === 'WriterEndorsed' || activeRevision.isLocked
                            ? 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed opacity-50'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer active:scale-[0.98]'
                        }`}
                        title={
                          activeRevision.reviewStatus === 'WriterEndorsed' || activeRevision.isLocked
                            ? 'Phiên bản này đã được duyệt/khoá, không thể yêu cầu vẽ lại.'
                            : 'Yêu cầu Artist chỉnh sửa lại bản vẽ'
                        }
                        data-testid='detail-rework-btn'
                      >
                        <MessageSquare className='w-3.5 h-3.5' />
                        <span>Yêu cầu sửa</span>
                      </button>
                    </div>
                  )}

                  {/* Producer Canon Lock Action */}
                  {isProducerUser &&
                    activeRevision &&
                    !activeRevision.isLocked &&
                    activeRevision.reviewStatus !== 'CanonLocked' && (
                      <button
                        type='button'
                        disabled={isLocking}
                        onClick={async () => {
                          setIsLocking(true);
                          try {
                            await onLockRevision?.(activeRevision);
                          } finally {
                            setIsLocking(false);
                          }
                        }}
                        className='px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50'
                        data-testid='detail-lock-btn'
                        title='Khóa phiên bản này làm quy chuẩn chính thức cho toàn bộ dự án'
                      >
                        <Lock className='w-3.5 h-3.5' />
                        <span>{isLocking ? 'Đang khóa...' : 'Khóa Canon chính thức'}</span>
                      </button>
                    )}

                  {/* Canon locked status badge */}
                  {(activeRevision?.isLocked || activeRevision?.reviewStatus === 'CanonLocked' || !isCharacter) && (
                    <div className='px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-1.5'>
                      <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' />
                      <span>Tham chiếu {getCategoryLabel(entity.category)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ================= COLUMN 3: THÔNG TIN & PHIÊN BẢN (COL-SPAN 3) ================= */}
          <section className='lg:col-span-3 space-y-3.5'>
            {/* CARD 1: THÔNG TIN ĐẶC TẢ THU GỌN (METADATA SPECS) */}
            <div className='bg-[#FCFBF8] border border-stone-200 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3'>
              <div className='flex items-center justify-between pb-2 border-b border-stone-200/80'>
                <div className='font-bold text-xs sm:text-sm text-[#1C1917] flex items-center gap-1.5'>
                  <FileText className='w-4 h-4 text-[#F97316]' />
                  <span>{card1Title}</span>
                </div>
                <div className='flex items-center gap-1.5'>
                  {canCreateDraft && (
                    <button
                      type='button'
                      onClick={() => onOpenAddRevision(entity, activeRevision)}
                      className='inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-orange-50 border border-stone-200 hover:border-orange-300 text-stone-700 hover:text-orange-700 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-2xs'
                      title='Cập nhật đặc tả thông số cho mục này'
                    >
                      <Edit3 className='w-3 h-3 text-orange-600' />
                      <span>Sửa</span>
                    </button>
                  )}
                  {canCreateDraft &&
                    activeStage &&
                    !activeStage.isLocked &&
                    !activeStage.revisions.some((r) => r.isInitialVersion) &&
                    onDeleteEra && (
                      <button
                        type='button'
                        onClick={() => setEraToDelete(activeStage)}
                        className='p-1 bg-white hover:bg-rose-50 border border-stone-200 hover:border-rose-300 text-stone-600 hover:text-rose-600 rounded-lg transition-all cursor-pointer shadow-2xs'
                        title='Xóa toàn bộ thời kỳ này'
                        data-testid='delete-era-btn'
                      >
                        <Trash2 className='w-3 h-3' />
                      </button>
                    )}
                </div>
              </div>

              {/* Dynamic Compact Specifications Grid */}
              {isCharacter ? (
                <div className='space-y-2 text-xs'>
                  <div
                    onClick={() => canCreateDraft && onOpenAddRevision(entity, activeRevision)}
                    className={`bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/60 relative ${
                      canCreateDraft
                        ? 'cursor-pointer hover:border-orange-300 hover:bg-orange-50/40 transition group'
                        : ''
                    }`}
                    title={canCreateDraft ? 'Bấm để chỉnh sửa nhanh độ tuổi' : undefined}
                  >
                    <div className='flex items-center justify-between mb-0.5'>
                      <span className='text-stone-500 text-xs font-semibold'>Độ tuổi:</span>
                      {canCreateDraft && (
                        <Edit3 className='w-3 h-3 text-stone-400 group-hover:text-orange-600 transition' />
                      )}
                    </div>
                    {stageAttributes.age ? (
                      <span className='font-bold text-stone-800 text-sm block'>
                        {stageAttributes.age}
                      </span>
                    ) : (
                      <span className='text-stone-400 group-hover:text-orange-600 text-xs italic block'>
                        Chưa thiết lập
                      </span>
                    )}
                  </div>
                  <div
                    onClick={() => canCreateDraft && onOpenAddRevision(entity, activeRevision)}
                    className={`bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/60 relative ${
                      canCreateDraft
                        ? 'cursor-pointer hover:border-orange-300 hover:bg-orange-50/40 transition group'
                        : ''
                    }`}
                    title={canCreateDraft ? 'Bấm để chỉnh sửa nhanh chiều cao' : undefined}
                  >
                    <div className='flex items-center justify-between mb-0.5'>
                      <span className='text-stone-500 text-xs font-semibold'>Chiều cao:</span>
                      {canCreateDraft && (
                        <Edit3 className='w-3 h-3 text-stone-400 group-hover:text-orange-600 transition' />
                      )}
                    </div>
                    {stageAttributes.height ? (
                      <span className='font-bold text-stone-800 text-sm block'>
                        {stageAttributes.height}
                      </span>
                    ) : (
                      <span className='text-stone-400 group-hover:text-orange-600 text-xs italic block'>
                        Chưa thiết lập
                      </span>
                    )}
                  </div>
                  <div
                    onClick={() => canCreateDraft && onOpenAddRevision(entity, activeRevision)}
                    className={`bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/60 relative ${
                      canCreateDraft
                        ? 'cursor-pointer hover:border-orange-300 hover:bg-orange-50/40 transition group'
                        : ''
                    }`}
                    title={canCreateDraft ? 'Bấm để chỉnh sửa nhanh diện mạo' : undefined}
                  >
                    <div className='flex items-center justify-between mb-0.5'>
                      <span className='text-stone-500 text-xs font-semibold'>Đặc điểm diện mạo:</span>
                      {canCreateDraft && (
                        <Edit3 className='w-3 h-3 text-stone-400 group-hover:text-orange-600 transition' />
                      )}
                    </div>
                    <span className='text-stone-700 text-xs line-clamp-2 block leading-relaxed'>
                      {stageAttributes.appearance || (
                        <span className='text-stone-400 group-hover:text-orange-600 italic'>
                          Chưa thiết lập
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              ) : isLocation ? (
                <div className='space-y-2 text-xs'>
                  <div
                    onClick={() => canCreateDraft && onOpenAddRevision(entity, activeRevision)}
                    className={`bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/60 relative ${
                      canCreateDraft
                        ? 'cursor-pointer hover:border-orange-300 hover:bg-orange-50/40 transition group'
                        : ''
                    }`}
                  >
                    <span className='text-stone-500 text-xs block font-semibold mb-0.5'>
                      Phân loại địa hình:
                    </span>
                    <span className='font-bold text-stone-800 text-sm block truncate'>
                      {stageAttributes.environmentType || 'Địa điểm / Bối cảnh'}
                    </span>
                  </div>
                  <div
                    onClick={() => canCreateDraft && onOpenAddRevision(entity, activeRevision)}
                    className={`bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/60 relative ${
                      canCreateDraft
                        ? 'cursor-pointer hover:border-orange-300 hover:bg-orange-50/40 transition group'
                        : ''
                    }`}
                  >
                    <span className='text-stone-500 text-xs block font-semibold mb-0.5'>
                      Quy mô / Khí hậu:
                    </span>
                    <span className='font-bold text-stone-800 text-sm block truncate'>
                      {[stageAttributes.scale, stageAttributes.atmosphere].filter(Boolean).join(' · ') || 'Chưa thiết lập'}
                    </span>
                  </div>
                  <div
                    onClick={() => canCreateDraft && onOpenAddRevision(entity, activeRevision)}
                    className={`bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/60 relative ${
                      canCreateDraft
                        ? 'cursor-pointer hover:border-orange-300 hover:bg-orange-50/40 transition group'
                        : ''
                    }`}
                  >
                    <span className='text-stone-500 text-xs block font-semibold mb-0.5'>
                      Chi tiết kiến trúc & Cảnh quan:
                    </span>
                    <span className='text-stone-700 text-xs line-clamp-2 block leading-relaxed'>
                      {stageAttributes.architecture || 'Chưa thiết lập'}
                    </span>
                  </div>
                </div>
              ) : isProp ? (
                <div className='space-y-2 text-xs'>
                  <div
                    onClick={() => canCreateDraft && onOpenAddRevision(entity, activeRevision)}
                    className={`bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/60 relative ${
                      canCreateDraft
                        ? 'cursor-pointer hover:border-orange-300 hover:bg-orange-50/40 transition group'
                        : ''
                    }`}
                  >
                    <span className='text-stone-500 text-xs block font-semibold mb-0.5'>
                      Loại đạo cụ:
                    </span>
                    <span className='font-bold text-stone-800 text-sm block truncate'>
                      {stageAttributes.propType || 'Đạo cụ / Vũ khí'}
                    </span>
                  </div>
                  <div
                    onClick={() => canCreateDraft && onOpenAddRevision(entity, activeRevision)}
                    className={`bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/60 relative ${
                      canCreateDraft
                        ? 'cursor-pointer hover:border-orange-300 hover:bg-orange-50/40 transition group'
                        : ''
                    }`}
                  >
                    <span className='text-stone-500 text-xs block font-semibold mb-0.5'>
                      Kích thước &amp; Chất liệu:
                    </span>
                    <span className='font-bold text-stone-800 text-sm block truncate'>
                      {[stageAttributes.sizeWeight, stageAttributes.material].filter(Boolean).join(' · ') || 'Chưa thiết lập'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className='space-y-2 text-xs'>
                  <div
                    onClick={() => canCreateDraft && onOpenAddRevision(entity, activeRevision)}
                    className={`bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/60 relative ${
                      canCreateDraft
                        ? 'cursor-pointer hover:border-orange-300 hover:bg-orange-50/40 transition group'
                        : ''
                    }`}
                  >
                    <span className='text-stone-500 text-xs block font-semibold mb-0.5'>
                      Quy chuẩn &amp; Phân loại:
                    </span>
                    <span className='font-bold text-stone-800 text-sm block truncate'>
                      {stageAttributes.termType || stageAttributes.strictness || 'Tiêu chuẩn'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* CARD 2: PHIÊN BẢN & NHẬT KÝ SỬA ĐỔI (VERSION & AUDIT TRAIL GỘP CHUNG) */}
            <div className='bg-[#FCFBF8] border border-stone-200 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3'>
              <div className='flex items-center justify-between pb-2 border-b border-stone-200/80'>
                <div className='font-bold text-xs sm:text-sm text-[#1C1917] flex items-center gap-1.5'>
                  <History className='w-4 h-4 text-[#F97316]' />
                  <span>Phiên bản &amp; Nhật ký</span>
                </div>
                <button
                  type='button'
                  onClick={() => onOpenHistory(entity)}
                  className='text-xs font-semibold text-stone-600 hover:text-stone-900 px-2 py-0.5 rounded-md border border-stone-200 hover:bg-stone-50 transition cursor-pointer'
                >
                  Lịch sử
                </button>
              </div>

              {/* Version list */}
              <div className='space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-0.5'>
                {activeStage?.revisions && activeStage.revisions.length > 0 ? (
                  activeStage.revisions.map((rev) => {
                    const isSelected = rev.id === activeRevision?.id;
                    const isCanon = rev.isLocked || rev.reviewStatus === 'CanonLocked';
                    return (
                      <div
                        key={rev.id}
                        onClick={() => setSelectedVersionId(rev.id)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                          isSelected
                            ? 'bg-[#FFF7ED] border-[#F97316]/70 shadow-2xs font-semibold'
                            : 'bg-white border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className='flex items-center gap-2 min-w-0'>
                          <span className='font-mono font-bold text-stone-800'>v{rev.versionNumber}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                              isCanon
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold'
                                : rev.reviewStatus === 'ConceptSubmitted'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : rev.reviewStatus === 'WriterEndorsed'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : rev.reviewStatus === 'ReworkRequired'
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : 'bg-stone-100 text-stone-600 border-stone-200'
                            }`}
                          >
                            {isCanon
                              ? 'Chính thức 🔒'
                              : rev.reviewStatus === 'ConceptSubmitted'
                                ? 'Chờ thẩm định'
                                : rev.reviewStatus === 'WriterEndorsed'
                                  ? 'Biên kịch đã duyệt'
                                  : rev.reviewStatus === 'ReworkRequired'
                                    ? 'Yêu cầu sửa'
                                    : 'Bản nháp'}
                          </span>
                        </div>
                        <span className='text-[10px] text-stone-400 font-mono'>
                          {new Date(rev.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className='p-2 text-center text-xs text-stone-400 italic'>Chưa có phiên bản</div>
                )}
              </div>

              {/* Active Version Immutability & Action */}
              <div className='p-2.5 bg-stone-50/80 rounded-xl border border-stone-200/80 space-y-1.5 text-xs'>
                <div className='flex items-center justify-between'>
                  <span className='font-bold text-stone-800 flex items-center gap-1.5'>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        activeRevision?.isLocked ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    v{activeRevision?.versionNumber ?? 1} (
                    {activeRevision?.isLocked
                      ? 'Chính thức'
                      : activeRevision?.reviewStatus === 'ConceptSubmitted'
                        ? 'Chờ thẩm định'
                        : activeRevision?.reviewStatus === 'WriterEndorsed'
                          ? 'Biên kịch đã duyệt'
                          : activeRevision?.reviewStatus === 'ReworkRequired'
                            ? 'Yêu cầu sửa'
                            : 'Bản nháp'}
                    )
                  </span>
                  <span className='text-[10px] text-stone-500 font-medium'>
                    {activeRevision?.isLocked ? 'Bất biến' : 'Có thể chỉnh sửa'}
                  </span>
                </div>

                {activeRevision?.isLocked && canCreateDraft && (
                  <button
                    type='button'
                    onClick={() => onOpenAddRevision(entity, activeRevision)}
                    className='w-full py-1.5 px-2 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 font-semibold text-xs rounded-lg transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer mt-1'
                    title='Tạo phiên bản kế thừa tiếp theo mà không ghi đè bản gốc đã khóa chuẩn'
                  >
                    <Plus className='w-3 h-3' />
                    <span>Thay thế bản khóa (Supersede)</span>
                  </button>
                )}
              </div>

              {/* AUDIT TRAIL GỘP TRỰC TIẾP VÀO VERSION CARD */}
              <div className='space-y-2 pt-2 border-t border-stone-200/80'>
                <div className='font-bold text-xs uppercase tracking-wider text-stone-700 flex items-center justify-between'>
                  <span>Lịch sử thay đổi</span>
                  <span className='text-[10px] font-normal text-stone-400'>{auditLogs.length} sự kiện</span>
                </div>

                <div className='space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-0.5 text-xs'>
                  {auditLogs.map((log, i) => (
                    <div
                      key={i}
                      className='p-1.5 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-between gap-1 text-[11px]'
                    >
                      <div className='truncate min-w-0'>
                        <strong className='text-stone-900'>{log.actor}</strong>{' '}
                        <span className='text-stone-600'>{log.action}</span>
                      </div>
                      <span className='text-[10px] text-stone-400 shrink-0 font-medium'>
                        {log.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
</main>

      {/* ================= WORKBENCH BOTTOM FOOTER ================= */}
      <footer className='h-14 bg-[#FCFBF8] border-t border-[#D8D2C5] px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-2xs'>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={() => {
              onOpenHistory(entity);
            }}
            className='px-4 py-2 bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.98]'
          >
            <History className='w-3.5 h-3.5 text-[#EA580C]' />
            <span>Xem lịch sử phiên bản</span>
          </button>

          {canCreateDraft ? (
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={() => {
                  onOpenAddRevision(entity, null, false, undefined, undefined, false, true);
                }}
                className='px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-[0.98]'
                title='Tạo giai đoạn cốt truyện mới'
              >
                <Plus className='w-3.5 h-3.5' />
                <span>+ Tạo giai đoạn</span>
              </button>

              <button
                type='button'
                onClick={() => {
                  onOpenAddRevision(entity);
                }}
                className='px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow active:scale-[0.98]'
              >
                <GitCommit className='w-3.5 h-3.5' />
                <span>{isProducer ? '+ Tạo phiên bản mới' : '+ Tạo bản nháp mới'}</span>
              </button>
            </div>
          ) : isArtist ? (
            <span className='text-xs text-zinc-500 italic'>
              Họa sĩ (Artist) tải và nộp Concept Art theo từng giai đoạn.
            </span>
          ) : (
            <span className='text-xs text-zinc-500 italic'>Chế độ chỉ xem.</span>
          )}
        </div>

        <button
          type='button'
          onClick={onClose}
          className='px-5 py-2 bg-stone-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-all cursor-pointer active:scale-95 shadow-sm'
        >
          Đóng
        </button>
      </footer>
    </div>
  );

  const finalContent = (
    <>
      {modalContent}

      {/* Confirm Delete Revision Modal */}
      <LucianConfirmModal
        isOpen={!!revisionToDelete}
        title='Xóa phiên bản'
        description={`Bạn có chắc chắn muốn xóa phiên bản v${revisionToDelete?.versionNumber || ''} này không? Thao tác này không thể hoàn tác.`}
        confirmText={isDeleting ? 'Đang xóa...' : 'Xóa phiên bản'}
        cancelText='Hủy'
        variant='danger'
        onCancel={() => setRevisionToDelete(null)}
        onConfirm={async () => {
          if (!revisionToDelete || !onDeleteRevision) return;
          try {
            setIsDeleting(true);
            await onDeleteRevision(entity, revisionToDelete);
            setRevisionToDelete(null);
            setAllRevisions((prev) => prev.filter((r) => r.id !== revisionToDelete.id));
            if (selectedVersionId === revisionToDelete.id) {
              setSelectedVersionId(null);
            }
          } catch (err: any) {
            onShowToast('Lỗi', err.message || 'Không thể xóa phiên bản.');
          } finally {
            setIsDeleting(false);
          }
        }}
      />

      {/* Confirm Delete Era Modal */}
      <LucianConfirmModal
        isOpen={!!eraToDelete}
        title='Xóa giai đoạn nhân vật'
        description={`Bạn có chắc chắn muốn xóa thời kỳ "${eraToDelete?.stageName || ''}" (Chương ${eraToDelete?.effectiveFromChapterNumber || 1}) và tất cả các phiên bản liên quan chưa khóa? Thao tác này không thể hoàn tác.`}
        confirmText={isDeleting ? 'Đang xóa...' : 'Xóa thời kỳ'}
        cancelText='Hủy'
        variant='danger'
        onCancel={() => setEraToDelete(null)}
        onConfirm={async () => {
          if (!eraToDelete || !onDeleteEra) return;
          try {
            setIsDeleting(true);
            await onDeleteEra(entity, eraToDelete);
            const eraRevIds = new Set(eraToDelete.revisions.map((r) => r.id));
            setEraToDelete(null);
            setAllRevisions((prev) => prev.filter((r) => !eraRevIds.has(r.id)));
            setSelectedStageKey('');
            setSelectedVersionId(null);
          } catch (err: any) {
            onShowToast('Lỗi', err.message || 'Không thể xóa thời kỳ.');
          } finally {
            setIsDeleting(false);
          }
        }}
      />
    </>
  );

  return typeof document !== 'undefined' ? createPortal(finalContent, document.body) : finalContent;
};
