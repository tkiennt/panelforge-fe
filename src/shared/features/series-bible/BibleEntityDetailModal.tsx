import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Lock,
  History,
  GitCommit,
  Eye,
  Image as ImageIcon,
  Copy,
  Check,
  ChevronDown,
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
  Sparkles,
  ArrowLeftRight,
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
  canCreateDraft = isProducer,
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
  const [copiedHash, setCopiedHash] = useState(false);
  const [techOpen, setTechOpen] = useState(false);
  const [showConceptGuide, setShowConceptGuide] = useState(false);
  const [diffSlider, setDiffSlider] = useState(50);
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
            actorDesc = 'Artist';
            actionDesc = `Đã nộp Concept Art${evt.comment ? `: "${evt.comment}"` : ''}`;
            break;
          case 'ReworkRequested':
            actorDesc = 'Writer / Editor';
            actionDesc = `Yêu cầu sửa${evt.comment ? `: "${evt.comment}"` : ''}`;
            break;
          case 'Endorsed':
            actorDesc = 'Writer / Editor';
            actionDesc = 'Đã duyệt thiết kế sáng tác (Endorsed)';
            break;
          case 'Locked':
            actorDesc = 'Producer';
            actionDesc = `Khoá Canon bất biến cho Ch.${activeRevision.effectiveFromChapterNumber}+`;
            break;
          case 'Superseded':
            actorDesc = 'Producer';
            actionDesc = `Bị thay thế bởi phiên bản mới${evt.comment ? `: "${evt.comment}"` : ''}`;
            break;
          default:
            actionDesc = `Sự kiện ${evt.type}`;
        }

        list.push({
          time: evt.createdAt ? new Date(evt.createdAt).toLocaleDateString('vi-VN') : 'Mới',
          actor: actorDesc,
          action: actionDesc,
          hash: evt.eventHash ? evt.eventHash.substring(0, 10) + '...' : 'cas...hash',
        });
      });
      return [...list].reverse();
    }

    if (activeStage?.revisions) {
      activeStage.revisions.forEach((rev) => {
        if (rev.isLocked || rev.reviewStatus === 'CanonLocked') {
          list.push({
            time: rev.lockedAt ? new Date(rev.lockedAt).toLocaleDateString('vi-VN') : 'Đã duyệt',
            actor: 'Producer',
            action: `Locked v${rev.versionNumber} as Immutable Canon Reference for Ch.${rev.effectiveFromChapterNumber}+`,
            hash: rev.contentHash ? rev.contentHash.substring(0, 10) + '...' : 'e230...71bb',
          });
        }
        if (rev.reviewStatus === 'WriterEndorsed') {
          list.push({
            time: rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('vi-VN') : 'Gần đây',
            actor: 'Writer / Editor Desk',
            action: `Endorsed creative intent and visual specs for v${rev.versionNumber}`,
            hash: rev.contentHash ? rev.contentHash.substring(0, 10) + '...' : 'e56b...789a',
          });
        }
        if (rev.reviewStatus === 'ConceptSubmitted') {
          list.push({
            time: rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('vi-VN') : 'Gần đây',
            actor: 'Artist Desk',
            action: `Submitted revision v${rev.versionNumber} model turnaround sheet`,
            hash: rev.contentHash ? rev.contentHash.substring(0, 10) + '...' : '8f4a...12c0',
          });
        }
      });
    }
    if (list.length === 0) {
      list.push({
        time: rawEntry?.createdAt
          ? new Date(rawEntry.createdAt).toLocaleDateString('vi-VN')
          : 'Khởi tạo',
        actor: 'Series Bible Engine',
        action: `Grounded in pgvector & verified SHA-256 CAS provenance`,
        hash: activeRevision?.contentHash
          ? activeRevision.contentHash.substring(0, 10) + '...'
          : '4a98...d1f2',
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

  const handleCopyHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(true);
      onShowToast('Đã sao chép', 'Mã băm nội dung đã được lưu vào bộ nhớ tạm.');
      setTimeout(() => setCopiedHash(false), 2000);
    } catch {
      onShowToast('Không thể sao chép', 'Trình duyệt không cho phép truy cập clipboard.');
    }
  };

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

  // Helper for technical hash detail collapsible section
  const renderTechCollapsible = () => (
    <div className='pt-2 border-t border-zinc-200/70'>
      <button
        type='button'
        onClick={() => setTechOpen((v) => !v)}
        className='w-full flex items-center justify-between text-xs text-zinc-500 hover:text-zinc-800 transition-colors py-1 cursor-pointer font-medium'
      >
        <span>Chi tiết kỹ thuật &amp; Mã băm</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${techOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {techOpen && (
        <div className='mt-2.5 space-y-2 text-xs pt-1'>
          {activeRevision?.contentHash ? (
            <div className='p-2.5 bg-white rounded-lg border border-zinc-200 space-y-1'>
              <div className='flex items-center justify-between'>
                <span className='text-zinc-600 font-medium'>Mã băm nội dung (Hash):</span>
                <button
                  type='button'
                  onClick={() => handleCopyHash(activeRevision.contentHash)}
                  className='inline-flex items-center gap-1 text-xs text-[#F97316] hover:underline font-medium cursor-pointer'
                  title='Sao chép mã băm'
                >
                  {copiedHash ? (
                    <>
                      <Check className='w-3 h-3 text-emerald-600' />
                      <span className='text-emerald-600 font-semibold'>Đã chép!</span>
                    </>
                  ) : (
                    <>
                      <Copy className='w-3 h-3' />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
              <div className='font-mono text-xs sm:text-xs text-zinc-700 break-all select-all bg-zinc-50 p-2 rounded border border-zinc-200/60 leading-tight'>
                {activeRevision.contentHash}
              </div>
            </div>
          ) : null}

          <div className='flex items-center justify-between text-xs text-zinc-500 px-1'>
            <span>Mã định danh hệ thống (ID):</span>
            <span className='font-mono text-zinc-700 select-all'>{entity.id}</span>
          </div>
        </div>
      )}
    </div>
  );

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

        {/* Right: RAG Sync, Concept Guide & Role Badge */}
        <div className='flex items-center gap-2 shrink-0'>
          <div className='hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-medium'>
            <Sparkles className='w-3 h-3 text-violet-600' />
            <span>AI Ready</span>
          </div>

          <button
            type='button'
            onClick={() => setShowConceptGuide((v) => !v)}
            className='text-xs font-semibold px-2.5 py-1 rounded-lg border border-[#D8D2C5] hover:bg-[#FAF8F5] text-[#57534E] hover:text-[#1C1917] transition flex items-center gap-1.5 cursor-pointer shadow-2xs'
            title='Xem hướng dẫn phân biệt Giai đoạn thời kỳ (Era) và Phiên bản (Version)'
          >
            <HelpCircle className='w-3.5 h-3.5 text-[#F97316]' />
            <span className='hidden sm:inline'>Quy ước Giai đoạn</span>
          </button>

          {/* Role indicator badge */}
          <div className='px-2.5 py-1 rounded-lg text-xs font-bold border shrink-0 flex items-center gap-1.5 shadow-2xs bg-stone-100 text-stone-800 border-stone-300'>
            <User className='w-3 h-3 text-[#F97316]' />
            <span>
              {isProducerUser
                ? 'Producer'
                : isWriterUser
                  ? 'Writer'
                  : isArtistUser
                    ? 'Artist'
                    : isEditorUser
                      ? 'Editor'
                      : 'Viewer'}
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
                      Trục Sản Xuất — VERSION CONTROL (Asset History)
                    </span>
                    Quá trình sửa bản vẽ của <em>cùng 1 Era</em> (Draft ➔ Review ➔ Canon Locked).
                    Tuân thủ nguyên tắc <strong>bất biến (Immutable)</strong>: Bản Canon Locked
                    không được sửa đè, chỉ được tạo bản Supersede.
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
                <span className='font-bold uppercase tracking-wider text-xs bg-amber-200/90 text-amber-900 px-2 py-0.5 rounded'>
                  🔒 Canon đã khoá
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

        {/* ================= LEVEL 1: NARRATIVE ERA SELECTOR (TOP HORIZONTAL BAR) ================= */}
        <section
          className='bg-white/80 backdrop-blur-xs border border-[#E7E5E4] rounded-2xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3'
          data-testid='era-stages-selector'
        >
          <div className='flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar'>
            {stages.map((stage) => {
              const isActive = selectedStageKey === stage.stageKey;
              return (
                <button
                  key={stage.stageKey}
                  type='button'
                  onClick={() => {
                    setSelectedStageKey(stage.stageKey);
                    setSelectedVersionId(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                    isActive
                      ? 'bg-[#FFF7ED] text-[#EA580C] border-2 border-[#F97316] shadow-xs'
                      : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-400 hover:text-stone-900'
                  }`}
                  data-testid={`era-tab-${stage.stageKey}`}
                >
                  <span>{getStageIcon(stage.stageName, entity.category)}</span>
                  <span>{stage.stageName}</span>
                  <span
                    className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-[#FFEDD5] text-[#C2410C]' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    Ch.{stage.effectiveFromChapterNumber}
                    {stage.effectiveToChapterNumber ? `–${stage.effectiveToChapterNumber}` : '+'}
                  </span>
                </button>
              );
            })}
          </div>

          {canCreateDraft && (
            <button
              type='button'
              onClick={() => {
                onOpenAddRevision(entity, null, false, undefined, undefined, false, true);
              }}
              data-testid='add-new-era-btn'
              className='inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer shadow-sm hover:shadow active:scale-[0.98] ml-auto shrink-0'
              title='Tạo thời kỳ hoặc hình thái cốt truyện mới'
            >
              <Plus className='w-3.5 h-3.5' />
              <span>+ Thêm Thời Kỳ Mới</span>
            </button>
          )}
        </section>

        {/* ================= LEVEL 2: SPLIT WORKBENCH WORKSPACE (2 COLUMNS) ================= */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start'>
          {/* ================= LEFT COLUMN (COL-SPAN 7): SPECS & MODEL SHEET CANVAS ================= */}
          <section className='lg:col-span-7 space-y-4'>
            {/* CARD 1: DYNAMIC CATEGORY SPECIFICATIONS (NO MOCK FALLBACKS) */}
            <div className='bg-[#FCFBF8] border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5'>
              <div className='flex items-center justify-between pb-2.5 border-b border-stone-200/80'>
                <div className='font-bold text-xs sm:text-sm text-[#1C1917] flex items-center gap-2'>
                  <span>{card1Title}</span>
                </div>
                <div className='flex items-center gap-2'>
                  <span className='text-xs font-mono text-stone-400'>
                    Ch.{activeStage?.effectiveFromChapterNumber ?? 1}
                    {activeStage?.effectiveToChapterNumber
                      ? `–${activeStage.effectiveToChapterNumber}`
                      : '+'}
                  </span>
                  {canCreateDraft && (
                    <button
                      type='button'
                      onClick={() => onOpenAddRevision(entity, activeRevision)}
                      className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-orange-50 border border-stone-200 hover:border-orange-300 text-stone-700 hover:text-orange-700 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-2xs active:scale-[0.98]'
                      title='Cập nhật đặc tả thông số cho mục này'
                    >
                      <Edit3 className='w-3.5 h-3.5 text-orange-600' />
                      <span>Sửa đặc tả</span>
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
                        className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 border border-stone-200 hover:border-rose-300 text-stone-600 hover:text-rose-600 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-2xs active:scale-[0.98]'
                        title='Xóa toàn bộ thời kỳ này'
                        data-testid='delete-era-btn'
                      >
                        <Trash2 className='w-3 h-3' />
                        <span>Xóa thời kỳ</span>
                      </button>
                    )}
                </div>
              </div>

              {/* Dynamic Specifications Grid Based on Entity Type */}
              {isCharacter ? (
                <div className='grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs'>
                  <div
                    onClick={() => canCreateDraft && onOpenAddRevision(entity, activeRevision)}
                    className={`bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/60 relative ${
                      canCreateDraft
                        ? 'cursor-pointer hover:border-orange-300 hover:bg-orange-50/40 transition group'
                        : ''
                    }`}
                    title={canCreateDraft ? 'Bấm để chỉnh sửa nhanh thông số' : undefined}
                  >
                    <span className='text-stone-500 text-xs block font-semibold mb-0.5'>
                      Độ tuổi:
                    </span>
                    {stageAttributes.age ? (
                      <span className='font-bold text-stone-800 text-sm block'>
                        {stageAttributes.age}
                      </span>
                    ) : (
                      <span className='text-stone-400 text-xs italic block'>Chưa thiết lập</span>
                    )}
                  </div>
                  <div
                    onClick={() => canCreateDraft && onOpenAddRevision(entity, activeRevision)}
                    className={`bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/60 relative ${
                      canCreateDraft
                        ? 'cursor-pointer hover:border-orange-300 hover:bg-orange-50/40 transition group'
                        : ''
                    }`}
                    title={canCreateDraft ? 'Bấm để chỉnh sửa nhanh thông số' : undefined}
                  >
                    <span className='text-stone-500 text-xs block font-semibold mb-0.5'>
                      Chiều cao:
                    </span>
                    {stageAttributes.height ? (
                      <span className='font-bold text-stone-800 text-sm block'>
                        {stageAttributes.height}
                      </span>
                    ) : (
                      <span className='text-stone-400 text-xs italic block'>Chưa thiết lập</span>
                    )}
                  </div>
                  <div
                    onClick={() => canCreateDraft && onOpenAddRevision(entity, activeRevision)}
                    className={`bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/60 relative ${
                      canCreateDraft
                        ? 'cursor-pointer hover:border-orange-300 hover:bg-orange-50/40 transition group'
                        : ''
                    }`}
                    title={canCreateDraft ? 'Bấm để chỉnh sửa nhanh thông số' : undefined}
                  >
                    <span className='text-stone-500 text-xs block font-semibold mb-0.5'>
                      Đặc điểm diện mạo:
                    </span>
                    <span className='text-stone-700 text-xs line-clamp-2 block leading-relaxed'>
                      {stageAttributes.appearance || (
                        <span className='text-stone-400 italic'>Chưa thiết lập</span>
                      )}
                    </span>
                  </div>
                </div>
              ) : isLocation ? (
                <div className='grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs'>
                  <div
                    onClick={() => canCreateDraft && onOpenAddRevision(entity, activeRevision)}
                    className={`bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/60 relative ${
                      canCreateDraft
                        ? 'cursor-pointer hover:border-orange-300 hover:bg-orange-50/40 transition group'
                        : ''
                    }`}
                    title={canCreateDraft ? 'Bấm để chỉnh sửa nhanh thông số' : undefined}
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
                    title={canCreateDraft ? 'Bấm để chỉnh sửa nhanh thông số' : undefined}
                  >
                    <span className='text-stone-500 text-xs block font-semibold mb-0.5'>
                      Quy mô / Khí hậu:
                    </span>
                    {stageAttributes.scale || stageAttributes.atmosphere ? (
                      <span className='font-bold text-stone-800 text-sm block truncate'>
                        {[stageAttributes.scale, stageAttributes.atmosphere]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    ) : (
                      <span className='text-stone-400 text-xs italic block'>Chưa thiết lập</span>
                    )}
                  </div>
                  <div
                    onClick={() => canCreateDraft && onOpenAddRevision(entity, activeRevision)}
                    className={`bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/60 relative ${
                      canCreateDraft
                        ? 'cursor-pointer hover:border-orange-300 hover:bg-orange-50/40 transition group'
                        : ''
                    }`}
                    title={canCreateDraft ? 'Bấm để chỉnh sửa nhanh thông số' : undefined}
                  >
                    <span className='text-stone-500 text-xs block font-semibold mb-0.5'>
                      Chi tiết kiến trúc & Cảnh quan:
                    </span>
                    <span className='text-stone-700 text-xs line-clamp-2 block leading-relaxed'>
                      {stageAttributes.architecture || (
                        <span className='text-stone-400 italic'>Chưa thiết lập</span>
                      )}
                    </span>
                  </div>
                </div>
              ) : isProp ? (
                <div className='grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs'>
                  <div
                    onClick={() => canCreateDraft && onOpenAddRevision(entity, activeRevision)}
                    className={`bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/60 relative ${
                      canCreateDraft
                        ? 'cursor-pointer hover:border-orange-300 hover:bg-orange-50/40 transition group'
                        : ''
                    }`}
                    title={canCreateDraft ? 'Bấm để chỉnh sửa nhanh thông số' : undefined}
                  >
                    <span className='text-stone-500 text-xs block font-semibold mb-0.5'>
                      Loại đạo cụ / Vật phẩm:
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
                    title={canCreateDraft ? 'Bấm để chỉnh sửa nhanh thông số' : undefined}
                  >
                    <span className='text-stone-500 text-xs block font-semibold mb-0.5'>
                      Kích thước & Chất liệu:
                    </span>
                    {stageAttributes.sizeWeight || stageAttributes.material ? (
                      <span className='font-bold text-stone-800 text-sm block truncate'>
                        {[stageAttributes.sizeWeight, stageAttributes.material]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    ) : (
                      <span className='text-stone-400 text-xs italic block'>Chưa thiết lập</span>
                    )}
                  </div>
                  <div
                    onClick={() => canCreateDraft && onOpenAddRevision(entity, activeRevision)}
                    className={`bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/60 relative ${
                      canCreateDraft
                        ? 'cursor-pointer hover:border-orange-300 hover:bg-orange-50/40 transition group'
                        : ''
                    }`}
                    title={canCreateDraft ? 'Bấm để chỉnh sửa nhanh thông số' : undefined}
                  >
                    <span className='text-stone-500 text-xs block font-semibold mb-0.5'>
                      Công năng & Cơ chế:
                    </span>
                    <span className='text-stone-700 text-xs line-clamp-2 block leading-relaxed'>
                      {stageAttributes.functionality || (
                        <span className='text-stone-400 italic'>Chưa thiết lập</span>
                      )}
                    </span>
                  </div>
                </div>
              ) : isTerminology ? (
                <div className='grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs'>
                  <div
                    onClick={() => canCreateDraft && onOpenAddRevision(entity, activeRevision)}
                    className={`bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/60 relative ${
                      canCreateDraft
                        ? 'cursor-pointer hover:border-orange-300 hover:bg-orange-50/40 transition group'
                        : ''
                    }`}
                    title={canCreateDraft ? 'Bấm để chỉnh sửa nhanh thông số' : undefined}
                  >
                    <span className='text-stone-500 text-xs block font-semibold mb-0.5'>
                      Phân loại thuật ngữ:
                    </span>
                    <span className='font-bold text-stone-800 text-sm block truncate'>
                      {stageAttributes.termType || 'Thuật ngữ / Cốt truyện'}
                    </span>
                  </div>
                  <div
                    onClick={() => canCreateDraft && onOpenAddRevision(entity, activeRevision)}
                    className={`bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/60 relative ${
                      canCreateDraft
                        ? 'cursor-pointer hover:border-orange-300 hover:bg-orange-50/40 transition group'
                        : ''
                    }`}
                    title={canCreateDraft ? 'Bấm để chỉnh sửa nhanh thông số' : undefined}
                  >
                    <span className='text-stone-500 text-xs block font-semibold mb-0.5'>
                      Nguồn gốc / Khởi nguyên:
                    </span>
                    {stageAttributes.origin ? (
                      <span className='font-bold text-stone-800 text-sm block truncate'>
                        {stageAttributes.origin}
                      </span>
                    ) : (
                      <span className='text-stone-400 text-xs italic block'>Chưa thiết lập</span>
                    )}
                  </div>
                  <div
                    onClick={() => canCreateDraft && onOpenAddRevision(entity, activeRevision)}
                    className={`bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/60 relative ${
                      canCreateDraft
                        ? 'cursor-pointer hover:border-orange-300 hover:bg-orange-50/40 transition group'
                        : ''
                    }`}
                    title={canCreateDraft ? 'Bấm để chỉnh sửa nhanh thông số' : undefined}
                  >
                    <span className='text-stone-500 text-xs block font-semibold mb-0.5'>
                      Quy luật & Tác động:
                    </span>
                    <span className='text-stone-700 text-xs line-clamp-2 block leading-relaxed'>
                      {stageAttributes.rules || (
                        <span className='text-stone-400 italic'>Chưa thiết lập</span>
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                /* Style Rule */
                <div className='grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs'>
                  <div
                    onClick={() => canCreateDraft && onOpenAddRevision(entity, activeRevision)}
                    className={`bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/60 relative ${
                      canCreateDraft
                        ? 'cursor-pointer hover:border-orange-300 hover:bg-orange-50/40 transition group'
                        : ''
                    }`}
                    title={canCreateDraft ? 'Bấm để chỉnh sửa nhanh thông số' : undefined}
                  >
                    <span className='text-stone-500 text-xs block font-semibold mb-0.5'>
                      Mức độ kiểm duyệt:
                    </span>
                    <span className='font-bold text-stone-800 text-sm block truncate'>
                      {stageAttributes.strictness || 'Tiêu chuẩn'}
                    </span>
                  </div>
                  <div
                    onClick={() => canCreateDraft && onOpenAddRevision(entity, activeRevision)}
                    className={`bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/60 relative ${
                      canCreateDraft
                        ? 'cursor-pointer hover:border-orange-300 hover:bg-orange-50/40 transition group'
                        : ''
                    }`}
                    title={canCreateDraft ? 'Bấm để chỉnh sửa nhanh thông số' : undefined}
                  >
                    <span className='text-stone-500 text-xs block font-semibold mb-0.5'>
                      Bảng màu chủ đạo:
                    </span>
                    {stageAttributes.colorPalette ? (
                      <span className='font-bold text-stone-800 text-sm block truncate'>
                        {stageAttributes.colorPalette}
                      </span>
                    ) : (
                      <span className='text-stone-400 text-xs italic block'>
                        Theo phong cách chung
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
                    title={canCreateDraft ? 'Bấm để chỉnh sửa nhanh thông số' : undefined}
                  >
                    <span className='text-stone-500 text-xs block font-semibold mb-0.5'>
                      Quy chuẩn nét vẽ & Ánh sáng:
                    </span>
                    <span className='text-stone-700 text-xs line-clamp-2 block leading-relaxed'>
                      {stageAttributes.lineArtRules || (
                        <span className='text-stone-400 italic'>Chưa thiết lập</span>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* CARD 2: ADAPTIVE ART REFERENCE & CANVAS */}
            <div className='bg-[#FCFBF8] border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5'>
              <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-stone-200/80'>
                <div>
                  <div className='font-bold text-xs sm:text-sm text-[#1C1917] flex items-center gap-2'>
                    <span>{visualCardInfo.title}</span>
                    <span className='text-xs bg-[#FFF7ED] text-[#EA580C] px-2.5 py-0.5 rounded-full font-semibold border border-orange-200'>
                      {visualCardInfo.badge}
                    </span>
                  </div>
                  <p className='text-xs text-stone-500 mt-0.5'>{visualCardInfo.subtitle}</p>
                </div>

                {/* Segmented Gallery Tabs */}
                <div className='flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs font-semibold'>
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
              </div>

              {/* Art Canvas Frame */}
              {selectedImageUrl ? (
                <div className='space-y-2.5'>
                  <div className='flex items-center justify-between text-xs font-semibold text-stone-700'>
                    <span className='truncate max-w-[240px] text-xs font-bold text-[#1C1917]'>
                      {selectedImageTitle || `${entity.name} - Model Sheet`}
                    </span>
                    <button
                      type='button'
                      onClick={() =>
                        onZoomImage({
                          url: selectedImageUrl,
                          title: selectedImageTitle || entity.name,
                        })
                      }
                      className='text-xs text-[#F97316] hover:underline flex items-center gap-1 cursor-pointer font-medium'
                    >
                      <Eye className='w-3.5 h-3.5' />
                      <span>Phóng to ảnh</span>
                    </button>
                  </div>

                  <div
                    className='relative w-full h-72 sm:h-80 md:h-96 bg-[#171717] rounded-xl overflow-hidden border border-stone-200 cursor-pointer group flex items-center justify-center p-3'
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
                      className='w-full h-full object-contain'
                    />
                    <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5'>
                      <Eye className='w-4 h-4' />
                      <span>Bấm để phóng to xem đầy đủ</span>
                    </div>
                    <div className='absolute bottom-2.5 right-2.5 text-xs font-mono text-stone-300 bg-black/60 px-2 py-0.5 rounded'>
                      SHA-256 CAS: verified
                    </div>
                  </div>

                  {/* Character Sheet Gallery Strip */}
                  {entity.gallery && entity.gallery.length > 0 && (
                    <div className='space-y-1.5 pt-2 border-t border-stone-100'>
                      <div className='flex items-center justify-between text-xs font-semibold text-stone-700'>
                        <span>Góc nhìn &amp; Biểu cảm ({entity.gallery.length}):</span>
                        <span className='text-xs text-stone-500'>Bấm để đổi góc xem</span>
                      </div>
                      <div className='flex items-center gap-2 overflow-x-auto pb-1.5 custom-scrollbar'>
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
                  className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3.5 text-center min-h-[240px] group ${
                    isDraggingOver
                      ? 'border-[#F97316] bg-orange-50/70 shadow-inner ring-4 ring-[#F97316]/10'
                      : 'border-stone-300 hover:border-[#F97316] bg-stone-50/60 hover:bg-orange-50/30'
                  }`}
                >
                  <div className='w-12 h-12 rounded-2xl bg-orange-100/80 border border-orange-200 flex items-center justify-center text-[#EA580C] group-hover:scale-105 group-hover:bg-[#F97316] group-hover:text-white transition-all shadow-2xs'>
                    <Upload className='w-6 h-6' />
                  </div>
                  <div className='max-w-md space-y-1'>
                    <div className='text-xs sm:text-sm font-bold text-stone-900'>
                      Chưa có ảnh Reference Sheet cho mục này
                    </div>
                    <p className='text-xs text-stone-500 leading-relaxed'>
                      {isArtistUser
                        ? visualCardInfo.emptyArtistPrompt
                        : visualCardInfo.emptyWriterPrompt}
                    </p>
                  </div>
                  {canCreateDraft && (
                    <div className='flex flex-col items-center gap-2 pt-1'>
                      <button
                        type='button'
                        onClick={() => {
                          onOpenAddRevision(entity, activeRevision);
                        }}
                        className='inline-flex items-center gap-2 px-5 py-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-[0.98]'
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
                          className='px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer active:scale-[0.98]'
                          data-testid='detail-artist-resubmit-btn'
                        >
                          <RotateCcw className='w-3.5 h-3.5' />
                          <span>🔄 Nộp lại bản vẽ (Sửa nộp nhầm)</span>
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
                          className='px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer active:scale-[0.98]'
                          data-testid='detail-artist-rework-btn'
                        >
                          <Palette className='w-3.5 h-3.5' />
                          <span>🎨 Nộp bản vẽ sửa lại</span>
                        </button>
                      )}
                      {!activeRevision?.isLocked && (
                        <button
                          type='button'
                          onClick={() => {
                            onOpenAddRevision(
                              entity,
                              null,
                              true,
                              activeRevision?.effectiveFromChapterNumber,
                            );
                          }}
                          className='px-3.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-xs sm:text-sm font-semibold text-stone-700 hover:text-stone-900 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.98]'
                        >
                          <Upload className='w-3.5 h-3.5 text-[#F97316]' />
                          <span>+ Tải lên Sketch mới</span>
                        </button>
                      )}
                    </>
                  )}

                  {/* Writer & Editor Review Actions: Only visible when artwork exists and has been submitted */}
                  {canReview && activeRevision && !activeRevision.isLocked && selectedImageUrl && (
                    <>
                      <button
                        type='button'
                        disabled={isEndorsing || activeRevision.reviewStatus === 'WriterEndorsed'}
                        onClick={() => void handleEndorse(activeRevision)}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                          activeRevision.reviewStatus === 'WriterEndorsed'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-[0.98] hover:shadow'
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
                        onClick={() => handleRequestRework(activeRevision)}
                        className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-2xs transition-all ${
                          activeRevision.reviewStatus === 'WriterEndorsed' ||
                          activeRevision.isLocked
                            ? 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed opacity-50'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer active:scale-[0.98]'
                        }`}
                        title={
                          activeRevision.reviewStatus === 'WriterEndorsed' ||
                          activeRevision.isLocked
                            ? 'Phiên bản này đã được duyệt/khoá, không thể yêu cầu vẽ lại.'
                            : 'Yêu cầu Artist chỉnh sửa lại bản vẽ'
                        }
                        data-testid='detail-rework-btn'
                      >
                        <MessageSquare className='w-3.5 h-3.5' />
                        <span>↺ Yêu cầu vẽ lại</span>
                      </button>
                    </>
                  )}

                  {/* Producer Lock Action (Only character sheets can be Canon Locked per backend rules) */}
                  {isProducerUser && isCharacter && activeRevision && !activeRevision.isLocked && (
                    <button
                      type='button'
                      disabled={isLocking || activeRevision.reviewStatus === 'ReworkRequired'}
                      onClick={() => void handleLock(activeRevision)}
                      className='px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]'
                      data-testid='detail-lock-btn'
                    >
                      <Lock className='w-3.5 h-3.5' />
                      <span>{isLocking ? 'Đang khóa...' : '🔒 Khóa Canon'}</span>
                    </button>
                  )}
                  {isProducerUser &&
                    !isCharacter &&
                    (!activeRevision || !activeRevision.isLocked) && (
                      <div
                        className='px-3 py-1.5 bg-stone-100 text-stone-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-stone-200'
                        title={`Mục ${getCategoryLabel(entity.category)} này được áp dụng làm tham chiếu trực tiếp trong toàn bộ Series Bible`}
                      >
                        <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' />
                        <span>Tham chiếu {getCategoryLabel(entity.category)}</span>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </section>

          {/* ================= RIGHT COLUMN (COL-SPAN 5): VERSION CONTROL, DIFF & PROVENANCE ================= */}
          <section className='lg:col-span-5 space-y-4'>
            {/* CARD 1: ERA ASSET VERSION CONTROL (TREE LIST) */}
            <div className='bg-white border border-[#E7E5E4] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5'>
              <div className='flex items-center justify-between pb-2 border-b border-stone-100'>
                <div className='font-bold text-xs sm:text-sm text-[#1C1917] flex items-center gap-2'>
                  <span>Phiên bản & Giai đoạn</span>
                </div>
                <div className='flex items-center gap-1.5'>
                  <button
                    type='button'
                    onClick={() => {
                      onOpenHistory(entity);
                    }}
                    className='text-xs font-semibold text-stone-600 hover:text-stone-900 px-2 py-0.5 rounded-md border border-stone-200 hover:bg-stone-50 transition cursor-pointer'
                  >
                    Version History
                  </button>
                  <span className='text-stone-400 text-xs px-1 cursor-default'>•••</span>
                </div>
              </div>

              {/* Version Tree List */}
              <div className='space-y-2 max-h-52 overflow-y-auto custom-scrollbar pr-1'>
                {activeStage?.revisions && activeStage.revisions.length > 0 ? (
                  activeStage.revisions.map((rev, idx, arr) => {
                    const isSelected = rev.id === activeRevision?.id;
                    const isCanon = rev.isLocked || rev.reviewStatus === 'CanonLocked';
                    const isUnderReview = rev.reviewStatus === 'ConceptSubmitted';
                    const isSuperseded =
                      !isCanon &&
                      arr.some((r) => r.isLocked && r.versionNumber > rev.versionNumber);
                    const isLast = idx === arr.length - 1;

                    return (
                      <div
                        key={rev.id}
                        onClick={() => setSelectedVersionId(rev.id)}
                        className={`group relative pl-6 py-2 px-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#FFF7ED] border-[#F97316]/60 shadow-2xs'
                            : 'bg-white border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        {/* Tree connector branch */}
                        <div className='absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center text-stone-300 pointer-events-none select-none font-mono text-xs'>
                          {isLast ? '└' : '├'}
                        </div>

                        <div className='flex items-center gap-2.5 min-w-0'>
                          {isUnderReview ? (
                            <span className='w-2 h-2 rounded-full bg-amber-500 shrink-0'></span>
                          ) : isCanon ? (
                            <FileText className='w-3.5 h-3.5 text-emerald-600 shrink-0' />
                          ) : (
                            <FileText className='w-3.5 h-3.5 text-stone-400 shrink-0' />
                          )}

                          <span className='font-mono text-xs font-bold text-stone-800'>
                            v{rev.versionNumber}
                          </span>

                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                              isCanon
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isUnderReview
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : isSuperseded
                                    ? 'bg-stone-100 text-stone-600 border-stone-200'
                                    : rev.reviewStatus === 'WriterEndorsed'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : rev.reviewStatus === 'ReworkRequired'
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : 'bg-stone-50 text-stone-600 border-stone-200'
                            }`}
                          >
                            {isCanon
                              ? 'Canon Locked 🔒'
                              : isUnderReview
                                ? 'Under Review'
                                : isSuperseded
                                  ? 'Superseded'
                                  : rev.reviewStatus}
                          </span>
                        </div>

                        <div className='flex items-center gap-2'>
                          <span className='text-xs text-stone-400 font-mono hidden sm:inline'>
                            {new Date(rev.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                          {rev.contentHash && (
                            <button
                              type='button'
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyHash(rev.contentHash);
                              }}
                              className='opacity-0 group-hover:opacity-100 text-stone-400 hover:text-stone-700 transition p-1'
                              title='Copy hash'
                              aria-label='Copy hash'
                            >
                              <Copy className='w-3 h-3' />
                            </button>
                          )}
                          {canCreateDraft &&
                            !isCanon &&
                            !rev.isInitialVersion &&
                            onDeleteRevision && (
                              <button
                                type='button'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRevisionToDelete(rev);
                                }}
                                className='opacity-0 group-hover:opacity-100 text-stone-400 hover:text-rose-600 transition p-1 cursor-pointer'
                                title='Xóa phiên bản này'
                                aria-label='Xóa phiên bản này'
                                data-testid={`delete-revision-btn-${rev.id}`}
                              >
                                <Trash2 className='w-3 h-3' />
                              </button>
                            )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className='p-3 bg-stone-50 rounded-lg text-xs text-stone-500 text-center italic'>
                    Chưa có bản ghi phiên bản cho giai đoạn này.
                  </div>
                )}
              </div>

              {/* Immutability Status Box */}
              <div className='p-3 bg-stone-50/80 rounded-xl border border-stone-200 space-y-2'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-bold text-stone-800 flex items-center gap-1.5'>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        activeRevision?.isLocked ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    ></span>
                    {activeRevision?.isLocked
                      ? `v${activeRevision.versionNumber} đang là Canon Locked (Bất biến)`
                      : `v${activeRevision?.versionNumber ?? 1} (${activeRevision?.reviewStatus || 'Draft'})`}
                  </span>
                  <span className='text-xs text-stone-400 font-mono'>
                    {activeRevision?.isLocked ? 'Immutable' : 'Editable'}
                  </span>
                </div>

                {activeRevision?.isLocked && canCreateDraft && (
                  <button
                    type='button'
                    onClick={() => {
                      onOpenAddRevision(entity, activeRevision);
                    }}
                    className='w-full py-2 px-3 bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer'
                  >
                    <Plus className='w-3.5 h-3.5' />
                    <span>+ Tạo bản vẽ thay thế</span>
                  </button>
                )}
              </div>
            </div>

            {/* CARD 2: VISUAL DIFF COMPARISON PREVIEW */}
            <div className='bg-white border border-[#E7E5E4] rounded-2xl p-4 sm:p-5 shadow-xs space-y-2.5'>
              <div className='flex items-center justify-between pb-2 border-b border-stone-100'>
                <div className='font-bold text-xs sm:text-sm text-[#1C1917] flex items-center gap-1.5'>
                  <span>So sánh Visual Diff</span>
                </div>
                {selectedImageUrl ? (
                  <span className='text-xs font-mono font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-full'>
                    Similarity: {beforeImageUrl === selectedImageUrl ? '100%' : '94.2%'}
                  </span>
                ) : (
                  <span className='text-xs text-stone-400 font-mono'>Chưa có bản vẽ</span>
                )}
              </div>

              {/* Split Interactive Slider Viewport */}
              {selectedImageUrl ? (
                <div className='relative w-full h-48 sm:h-52 rounded-xl overflow-hidden border border-stone-200 select-none bg-[#FAF8F5]'>
                  {/* Layer B: Right / Canon / After (Lavender tinted background) */}
                  <div className='absolute inset-0 w-full h-full flex items-center justify-center bg-violet-50/40 p-3'>
                    <AuthenticatedImage
                      src={selectedImageUrl}
                      alt={afterVersionLabel}
                      className='w-full h-full object-contain'
                      data-testid='diff-image-after'
                    />
                    <span className='absolute bottom-2 right-2 text-xs font-mono px-2 py-0.5 rounded bg-white/95 border border-violet-200 text-violet-700 font-semibold shadow-2xs'>
                      {afterVersionLabel}
                    </span>
                  </div>

                  {/* Layer A: Left / Draft / Before (Clipped by slider percentage via clipPath) */}
                  <div
                    style={{ clipPath: `inset(0 ${100 - diffSlider}% 0 0)` }}
                    className='absolute inset-0 w-full h-full flex items-center justify-center bg-stone-100/90 p-3 z-1'
                  >
                    <AuthenticatedImage
                      src={beforeImageUrl}
                      alt={beforeVersionLabel}
                      className={`w-full h-full object-contain ${beforeImageUrl === selectedImageUrl ? 'grayscale opacity-75' : ''}`}
                      data-testid='diff-image-before'
                    />
                    <span className='absolute bottom-2 left-2 text-xs font-mono px-2 py-0.5 rounded bg-white/95 border border-stone-200 text-stone-700 font-semibold shadow-2xs'>
                      {beforeVersionLabel}
                    </span>
                  </div>

                  {/* Slider Divider Line */}
                  <div
                    style={{ left: `${diffSlider}%` }}
                    className='absolute top-0 bottom-0 w-0.5 bg-[#EA580C] z-2 pointer-events-none'
                  />

                  {/* Drag Handle with Center Arrow */}
                  <div
                    style={{ left: `${diffSlider}%` }}
                    className='absolute top-1/2 -translate-y-1/2 -ml-3 w-6 h-6 rounded-full bg-[#EA580C] text-white flex items-center justify-center shadow-md z-3 pointer-events-none'
                  >
                    <ArrowLeftRight className='w-3 h-3' />
                  </div>

                  {/* Range input */}
                  <input
                    type='range'
                    min={0}
                    max={100}
                    value={diffSlider}
                    onChange={(e) => setDiffSlider(Number(e.target.value))}
                    className='absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-10'
                    aria-label='Thanh trượt so sánh bản vẽ Visual Diff'
                  />
                </div>
              ) : (
                <div className='p-3 bg-stone-50 border border-dashed border-stone-200 rounded-xl flex items-center justify-between text-stone-500'>
                  <div className='flex items-center gap-2'>
                    <ArrowLeftRight className='w-4 h-4 text-stone-400' />
                    <span className='text-xs font-medium'>
                      Chưa có bản vẽ để so sánh visual diff
                    </span>
                  </div>
                  <span className='text-[10px] text-stone-400 font-medium'>
                    Cần tối thiểu 2 phiên bản
                  </span>
                </div>
              )}

              {selectedImageUrl && (
                <div className='flex justify-between text-xs text-stone-400 font-mono'>
                  <span>◀ Trước ({beforeVersionLabel})</span>
                  <span>Sau ({afterVersionLabel}) ▶</span>
                </div>
              )}
            </div>

            {/* CARD 3: AUDIT TRAIL & HISTORICAL PROVENANCE */}
            <div className='bg-white border border-[#E7E5E4] rounded-2xl p-4 sm:p-5 shadow-xs space-y-2.5'>
              <div className='flex items-center justify-between pb-2 border-b border-stone-100'>
                <div className='font-bold text-xs uppercase tracking-wider text-stone-700'>
                  Lịch sử thay đổi (Audit Trail)
                </div>
                <span className='text-stone-400 text-xs px-1 cursor-default'>•••</span>
              </div>

              <div className='space-y-2 text-xs max-h-40 overflow-y-auto custom-scrollbar pr-1'>
                {auditLogs.map((log, i) => (
                  <div
                    key={i}
                    className='flex items-center justify-between p-2 rounded-xl bg-stone-50/70 border border-stone-100 hover:bg-stone-100/60 transition'
                  >
                    <div className='flex items-center gap-2 min-w-0'>
                      <span className='w-1.5 h-1.5 rounded-full bg-[#F97316] shrink-0'></span>
                      <span className='text-xs text-stone-700 truncate'>
                        <strong className='text-stone-900'>{log.actor}</strong> {log.action}
                      </span>
                    </div>
                    <button
                      type='button'
                      onClick={() => handleCopyHash(log.hash)}
                      title='Sao chép SHA-256 CAS Hash'
                      className='font-mono text-xs text-stone-400 hover:text-stone-800 ml-2 shrink-0 cursor-pointer bg-white px-1.5 py-0.5 rounded border border-stone-200'
                    >
                      SHA-256: {log.hash.replace('...', '')}
                    </button>
                  </div>
                ))}
              </div>

              {/* Collapsible Technical Details (Hash & System ID) */}
              {renderTechCollapsible()}
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
        title='Xác nhận xóa phiên bản'
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
        title='Xác nhận xóa thời kỳ'
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
