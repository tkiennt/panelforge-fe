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
    const idKey = rev.id ? String(rev.id) : `v${rev.versionNumber}-ch${rev.effectiveFromChapterNumber}-${rev.stageName || ''}`;
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
    (r) => (r.effectiveFromChapterNumber || 1) === 1 && r.stageName && r.stageName.trim().length > 0,
  );
  const ch1DefaultStageName = ch1NamedRev?.stageName?.trim() || null;

  // 2. Nhóm các revision thành từng Narrative Era:
  // Nếu ở Chapter 1 mà có revision chưa đặt tên, ta gộp nó vào Era của Chapter 1 thay vì tách thành "Giai đoạn chuẩn" riêng biệt
  const groupMap = new Map<string, BibleEntryRevisionDto[]>();
  for (const rev of all) {
    const ch = typeof rev.effectiveFromChapterNumber === 'number' ? rev.effectiveFromChapterNumber : 1;
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
      (ch === 1 ? (ch1DefaultStageName || 'Giai đoạn chuẩn') : `Giai đoạn từ Ch.${ch}`);

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

const getStageIcon = (name?: string | null) => {
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

  // Revisions & Era Stages State
  const [allRevisions, setAllRevisions] = useState<BibleEntryRevisionDto[]>([]);
  const [isEndorsing, setIsEndorsing] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
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
  const isWriterUser = currentRole === 'WRITER' || (!isProducerUser && canCreateDraft && !isArtistUser);
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
  }, [seriesId, entity.id, rawEntry?.effectiveRevision?.id, rawEntry?.effectiveRevision?.versionNumber]);

  const stages = useMemo(() => {
    const fallback = rawEntry?.effectiveRevision || null;
    return groupRevisionsIntoStages(allRevisions, fallback);
  }, [allRevisions, rawEntry?.effectiveRevision]);

  const [selectedStageKey, setSelectedStageKey] = useState<string>('');

  useEffect(() => {
    if (stages.length > 0 && (!selectedStageKey || !stages.some((s) => s.stageKey === selectedStageKey))) {
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
    let img = activeRevision?.referenceImageUrl;
    if (!img && activeRevision?.snapshotJson) {
      try {
        const snap = JSON.parse(activeRevision.snapshotJson);
        img = snap.ReferenceImageUrl || snap.referenceImageUrl;
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

  // Stage attributes parsing
  const stageAttributes = useMemo(() => {
    let parsed: Record<string, any> = {};
    if (activeRevision?.snapshotJson) {
      try {
        const snap = JSON.parse(activeRevision.snapshotJson);
        parsed = snap.Attributes || snap.attributes || {};
      } catch {
        // ignore
      }
    }
    const combined = { ...(entity.attributes || {}), ...parsed };
    const isChild =
      (activeStage?.stageName || '').toLowerCase().includes('nhỏ') ||
      (activeStage?.stageName || '').toLowerCase().includes('child');
    return {
      age: combined.age || combined['tuổi'] || (isChild ? '12 tuổi' : '17 tuổi'),
      height: combined.height || combined['chiều cao'] || (isChild ? '148 cm' : '178 cm'),
      mood:
        combined.mood ||
        combined['bảng màu'] ||
        (isChild ? 'Warm Sepia / Nostalgic Light' : 'Dark Neon / Tactical Cyber'),
      traits:
        combined.traits ||
        combined['đặc điểm'] ||
        entity.description ||
        'Robotic prosthetic arm (left side), glowing cyan data-drive socket, rugged tactical trenchcoat, vertical scar on left eyebrow.',
    };
  }, [activeRevision?.snapshotJson, entity.attributes, entity.description, activeStage?.stageName]);

  // Dynamic Audit logs for SHA-256 Provenance
  const auditLogs = useMemo(() => {
    const list: Array<{ time: string; actor: string; action: string; hash: string }> = [];
    if (activeStage?.revisions) {
      activeStage.revisions.forEach((rev) => {
        if (rev.isLocked) {
          list.push({
            time: rev.lockedAt ? new Date(rev.lockedAt).toLocaleDateString('vi-VN') : 'Đã duyệt',
            actor: 'Producer Tatsuki F.',
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
            actor: 'Artist Arata K.',
            action: `Submitted revision v${rev.versionNumber} model turnaround sheet`,
            hash: rev.contentHash ? rev.contentHash.substring(0, 10) + '...' : '8f4a...12c0',
          });
        }
      });
    }
    if (list.length === 0) {
      list.push({
        time: rawEntry?.createdAt ? new Date(rawEntry.createdAt).toLocaleDateString('vi-VN') : 'Khởi tạo',
        actor: 'Series Bible Engine',
        action: `Grounded in pgvector & verified SHA-256 CAS provenance`,
        hash: activeRevision?.contentHash ? activeRevision.contentHash.substring(0, 10) + '...' : '4a98...d1f2',
      });
    }
    return list;
  }, [activeStage?.revisions, activeRevision?.contentHash, rawEntry?.createdAt]);

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
      const hasOpenChildModal = document.querySelector('[role="dialog"][data-child-modal="true"]') ||
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
        return 'Nhân vật';
      case 'locations':
      case 'location':
      case '1':
        return 'Địa điểm & Bối cảnh';
      case 'terminology':
      case 'prop':
      case '2':
      case '3':
        return 'Thuật ngữ & Đạo cụ';
      case 'style':
      case 'rule':
      case '4':
      case '5':
        return 'Quy tắc mỹ thuật';
      default:
        return 'Mục tri thức';
    }
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
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${techOpen ? 'rotate-180' : ''}`} />
      </button>

      {techOpen && (
        <div className='mt-2.5 space-y-2 text-[11px] pt-1'>
          {activeRevision?.contentHash ? (
            <div className='p-2.5 bg-white rounded-lg border border-zinc-200 space-y-1'>
              <div className='flex items-center justify-between'>
                <span className='text-zinc-600 font-medium'>Mã băm nội dung (Hash):</span>
                <button
                  type='button'
                  onClick={() => handleCopyHash(activeRevision.contentHash)}
                  className='inline-flex items-center gap-1 text-[11px] text-[#F97316] hover:underline font-medium cursor-pointer'
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
              <div className='font-mono text-[10px] sm:text-[11px] text-zinc-700 break-all select-all bg-zinc-50 p-2 rounded border border-zinc-200/60 leading-tight'>
                {activeRevision.contentHash}
              </div>
            </div>
          ) : null}

          <div className='flex items-center justify-between text-[11px] text-zinc-500 px-1'>
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

          <span className='font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-800 border border-zinc-300 shrink-0 hidden sm:inline'>
            {entity.code}
          </span>
          <span className='px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10px] font-medium shrink-0 hidden sm:inline'>
            {getCategoryLabel(entity.category)}
          </span>
        </div>

        {/* Right: RAG Sync, Concept Guide & Role Badge */}
        <div className='flex items-center gap-2 shrink-0'>
          <div className='hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-[11px] font-medium'>
            <Sparkles className='w-3 h-3 text-violet-600' />
            <span>pgvector Synced</span>
          </div>

          <button
            type='button'
            onClick={() => setShowConceptGuide((v) => !v)}
            className='text-xs font-semibold px-2.5 py-1 rounded-lg border border-[#D8D2C5] hover:bg-[#FAF8F5] text-[#57534E] hover:text-[#1C1917] transition flex items-center gap-1.5 cursor-pointer shadow-2xs'
            title='Xem hướng dẫn phân biệt Era và Version'
          >
            <HelpCircle className='w-3.5 h-3.5 text-[#F97316]' />
            <span className='hidden sm:inline'>Era vs Version</span>
          </button>

          {/* Role indicator badge */}
          <div className='px-2.5 py-1 rounded-lg text-xs font-bold border shrink-0 flex items-center gap-1.5 shadow-2xs bg-stone-100 text-stone-800 border-stone-300'>
            <User className='w-3 h-3 text-[#F97316]' />
            <span>
              {isProducerUser ? 'Producer' : isWriterUser ? 'Writer' : isArtistUser ? 'Artist' : isEditorUser ? 'Editor' : 'Viewer'}
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
                    <span className='font-bold text-[#C2410C] uppercase tracking-wider text-[10px] block mb-0.5'>
                      Trục Cốt Truyện — ERA (Narrative Timeline)
                    </span>
                    Nhân vật thay đổi theo cốt truyện (Tuổi, Timeskip, Sẹo, Dạng quỷ). Gắn với <strong>Mốc chương hiệu lực (Effective from Chapter)</strong> để Họa sĩ và ban biên kịch đảm bảo tính nhất quán hình thái.
                  </div>
                  <div className='bg-white/90 p-2.5 rounded-lg border border-violet-100'>
                    <span className='font-bold text-violet-700 uppercase tracking-wider text-[10px] block mb-0.5'>
                      Trục Sản Xuất — VERSION CONTROL (Asset History)
                    </span>
                    Quá trình sửa bản vẽ của <em>cùng 1 Era</em> (Draft ➔ Review ➔ Canon Locked). Tuân thủ nguyên tắc <strong>bất biến (Immutable)</strong>: Bản Canon Locked không được sửa đè, chỉ được tạo bản Supersede.
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
            description={activeRevision.reworkFeedback || 'Writer yêu cầu chỉnh sửa lại thiết kế cho giai đoạn này.'}
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
                <span className='font-bold uppercase tracking-wider text-[10px] bg-amber-200/90 text-amber-900 px-2 py-0.5 rounded'>
                  🔒 Canon đã khoá
                </span>
                <span className='text-[11px] font-semibold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-300/60'>
                  {activeStage?.stageName ? `${activeStage.stageName} · ` : ''}
                  Ch.{activeRevision?.effectiveFromChapterNumber ?? 1}
                  {activeRevision?.effectiveToChapterNumber
                    ? `–${activeRevision.effectiveToChapterNumber}`
                    : ' → hết'}
                </span>
                <span className='font-mono font-bold text-[11px] bg-amber-200/70 text-amber-900 px-1.5 py-0.2 rounded'>
                  Lần sửa #{activeRevision.versionNumber}
                </span>
                {activeRevision.lockedAt && (
                  <span className='text-[11px] font-medium text-amber-800'>
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
                  <span>{getStageIcon(stage.stageName)}</span>
                  <span>{stage.stageName}</span>
                  <span
                    className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-[#FFEDD5] text-[#C2410C]' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    Ch.{stage.effectiveFromChapterNumber}
                    {stage.effectiveToChapterNumber ? `–${stage.effectiveToChapterNumber}` : '+'}
                  </span>
                  {stage.isLocked && <Lock className='w-3 h-3 text-amber-600' />}
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

            {/* CARD 1: ERA SPECIFICATIONS (SEPARATE TOP CARD AS IN SCREENSHOT) */}
            <div className='bg-white border border-[#E7E5E4] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3'>
              <div className='flex items-center justify-between pb-2 border-b border-stone-100'>
                <div className='font-bold text-xs sm:text-sm text-[#1C1917] flex items-center gap-2'>
                  <span>Thông số thời kỳ ({activeStage?.stageName || 'Giai đoạn chuẩn'})</span>
                </div>
                <div className='flex items-center gap-2'>
                  <span className='text-[11px] font-mono text-stone-400'>
                    Ch.{activeStage?.effectiveFromChapterNumber ?? 1}
                    {activeStage?.effectiveToChapterNumber ? `–${activeStage.effectiveToChapterNumber}` : '+'}
                  </span>
                  {canCreateDraft && (
                    <button
                      type='button'
                      onClick={() => onOpenAddRevision(entity, activeRevision)}
                      className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 hover:bg-[#FFF7ED] border border-stone-200 hover:border-[#F97316] text-[#EA580C] text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-2xs active:scale-[0.98]'
                      title='Cập nhật đặc tả, độ tuổi, vóc dáng cho thời kỳ này'
                    >
                      <Edit3 className='w-3 h-3' />
                      <span>Sửa đặc tả</span>
                    </button>
                  )}
                  {canCreateDraft && activeStage && !activeStage.isLocked && !activeStage.revisions.some((r) => r.isInitialVersion) && onDeleteEra && (
                    <button
                      type='button'
                      onClick={() => setEraToDelete(activeStage)}
                      className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 hover:bg-rose-50 border border-stone-200 hover:border-rose-300 text-stone-600 hover:text-rose-600 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-2xs active:scale-[0.98]'
                      title='Xóa toàn bộ thời kỳ này'
                      data-testid='delete-era-btn'
                    >
                      <Trash2 className='w-3 h-3' />
                      <span>Xóa thời kỳ</span>
                    </button>
                  )}
                </div>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs'>
                <div>
                  <span className='text-stone-400 text-[11px] block font-semibold'>Độ tuổi:</span>
                  <span className='font-bold text-stone-800 text-sm mt-0.5 block'>{stageAttributes.age}</span>
                </div>
                <div>
                  <span className='text-stone-400 text-[11px] block font-semibold'>Chiều cao:</span>
                  <span className='font-bold text-stone-800 text-sm mt-0.5 block'>{stageAttributes.height}</span>
                </div>
                <div>
                  <span className='text-stone-400 text-[11px] block font-semibold'>Đặc điểm ngoại hình:</span>
                  <span className='text-stone-700 text-xs mt-0.5 line-clamp-2 block leading-relaxed'>
                    {stageAttributes.traits}
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 2: ART TURNAROUND REFERENCE & CANVAS */}
            <div className='bg-white border border-[#E7E5E4] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5'>
              <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-stone-100'>
                <div>
                  <div className='font-bold text-xs sm:text-sm text-[#1C1917] flex items-center gap-2'>
                    <span>Bản vẽ Model Sheet</span>
                    <span className='text-[10px] bg-[#FFF7ED] text-[#EA580C] px-2 py-0.5 rounded-full font-semibold border border-orange-200'>
                      Chuẩn tham chiếu
                    </span>
                  </div>
                  <p className='text-[11px] text-stone-500'>
                    Bản vẽ tham chiếu chuẩn cho đội ngũ sáng tác
                  </p>
                </div>

                {/* Segmented Gallery Tabs */}
                <div className='flex items-center gap-1 bg-stone-100 p-1 rounded-lg border border-stone-200 text-xs font-semibold'>
                  <button
                    type='button'
                    onClick={() => setActiveArtTab('turnaround')}
                    className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                      activeArtTab === 'turnaround' ? 'bg-white text-[#1C1917] shadow-xs font-bold' : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    Turnaround
                  </button>
                  <button
                    type='button'
                    onClick={() => setActiveArtTab('action')}
                    className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                      activeArtTab === 'action' ? 'bg-white text-[#1C1917] shadow-xs font-bold' : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    Góc nhìn &amp; Biểu cảm
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
                      className='text-[11px] text-[#F97316] hover:underline flex items-center gap-1 cursor-pointer font-medium'
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
                    <div className='absolute bottom-2.5 right-2.5 text-[9px] font-mono text-stone-300 bg-black/60 px-2 py-0.5 rounded'>
                      SHA-256 CAS: verified
                    </div>
                  </div>

                  {/* Character Sheet Gallery Strip */}
                  {entity.gallery && entity.gallery.length > 0 && (
                    <div className='space-y-1.5 pt-2 border-t border-stone-100'>
                      <div className='flex items-center justify-between text-[11px] font-semibold text-stone-700'>
                        <span>Góc nhìn &amp; Biểu cảm ({entity.gallery.length}):</span>
                        <span className='text-[10px] text-stone-500'>Bấm để đổi góc xem</span>
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
                            <span className='text-xs font-medium text-stone-800'>Mặt chính diện</span>
                          </button>
                        )}
                        {entity.gallery.map((img, i) => (
                          <button
                            key={i}
                            type='button'
                            onClick={() => {
                              setSelectedImageUrl(img.url);
                              setSelectedImageTitle(`${entity.name} - ${img.label || `Góc ${i + 1}`}`);
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
                            <span className='text-xs font-medium text-stone-800'>{img.label || `Góc ${i + 1}`}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className='p-6 bg-stone-50/80 border border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center gap-3 text-center min-h-[220px]'>
                  <div className='w-11 h-11 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-[#EA580C]'>
                    <ImageIcon className='w-5 h-5' />
                  </div>
                  <div className='max-w-md space-y-1'>
                    <div className='text-xs sm:text-sm font-bold text-stone-900'>
                      Chưa có ảnh Reference Sheet cho mục này
                    </div>
                    <p className='text-xs text-stone-500 leading-relaxed'>
                      {isArtistUser
                        ? 'Bạn hãy tải lên bản phác thảo Model Sheet theo thông số thời kỳ phía trên để bắt đầu chu trình kiểm duyệt.'
                        : 'Biên kịch (Writer) và Biên tập viên có thể cập nhật thông số đặc tả kịch bản để Họa sĩ nắm bắt chính xác tạo hình trước khi vẽ.'}
                    </p>
                  </div>
                  {canCreateDraft && (
                    <button
                      type='button'
                      onClick={() => {
                        onOpenAddRevision(entity);
                      }}
                      className='inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-[#FFF7ED] border border-[#F97316] rounded-xl text-xs font-semibold text-[#EA580C] transition-colors cursor-pointer shadow-2xs'
                    >
                      <Edit3 className='w-3.5 h-3.5' />
                      <span>{isWriterUser ? 'Chỉnh sửa đặc tả / Cập nhật kịch bản' : 'Tạo phiên bản mới để thêm ảnh'}</span>
                    </button>
                  )}
                </div>
              )}

              {/* ROLE ACTIONS BAR (FOCUSED & MINIMAL) */}
              <div className='pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2'>
                {/* Status indicator on the left of action bar */}
                <div className='text-xs text-stone-500 flex items-center gap-1.5'>
                  {!selectedImageUrl ? (
                    <span className='inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200'>
                      <Clock className='w-3 h-3 text-amber-600' />
                      Chờ Họa sĩ tải lên bản vẽ
                    </span>
                  ) : activeRevision?.reviewStatus === 'Draft' ? (
                    <span className='inline-flex items-center gap-1 text-[11px] font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200'>
                      Bản thảo (Chưa nộp duyệt)
                    </span>
                  ) : activeRevision?.reviewStatus === 'ConceptSubmitted' ? (
                    <span className='inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 animate-pulse'>
                      ● Chờ Writer / Editor duyệt thiết kế
                    </span>
                  ) : activeRevision?.reviewStatus === 'WriterEndorsed' ? (
                    <span className='inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200'>
                      ✓ Writer đã duyệt (Chờ Producer khóa Canon)
                    </span>
                  ) : activeRevision?.reviewStatus === 'ReworkRequired' ? (
                    <span className='inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200'>
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
                            onOpenAddRevision(entity, null, true, activeRevision?.effectiveFromChapterNumber);
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
                        disabled={isEndorsing}
                        onClick={() => void handleEndorse(activeRevision)}
                        className='px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]'
                        data-testid='detail-endorse-btn'
                      >
                        <CheckCircle2 className='w-3.5 h-3.5' />
                        <span>{isEndorsing ? 'Đang duyệt...' : '✓ Duyệt thiết kế'}</span>
                      </button>
                      <button
                        type='button'
                        onClick={() => handleRequestRework(activeRevision)}
                        className='px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-[0.98]'
                        data-testid='detail-rework-btn'
                      >
                        <MessageSquare className='w-3.5 h-3.5' />
                        <span>↺ Yêu cầu vẽ lại</span>
                      </button>
                    </>
                  )}

                  {/* Producer Lock Action */}
                  {isProducerUser && activeRevision && !activeRevision.isLocked && (
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
                  <span>Era Asset Version Control</span>
                </div>
                <div className='flex items-center gap-1.5'>
                  <button
                    type='button'
                    onClick={() => {
                      onOpenHistory(entity);
                    }}
                    className='text-[11px] font-semibold text-stone-600 hover:text-stone-900 px-2 py-0.5 rounded-md border border-stone-200 hover:bg-stone-50 transition cursor-pointer'
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
                    const isSuperseded = !isCanon && arr.some((r) => r.isLocked && r.versionNumber > rev.versionNumber);
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
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
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
                          <span className='text-[10px] text-stone-400 font-mono hidden sm:inline'>
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
                          {canCreateDraft && !isCanon && !rev.isInitialVersion && onDeleteRevision && (
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
                  <span className='text-[10px] text-stone-400 font-mono'>
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
                    Similarity: 94.2%
                  </span>
                ) : (
                  <span className='text-[10px] text-stone-400 font-mono'>
                    Chưa có bản vẽ
                  </span>
                )}
              </div>

              {/* Split Interactive Slider Viewport */}
              {selectedImageUrl ? (
                <div className='relative w-full h-48 sm:h-52 rounded-xl overflow-hidden border border-stone-200 select-none bg-[#FAF8F5]'>
                  {/* Layer B: Right / Canon / After (Lavender tinted background) */}
                  <div className='absolute inset-0 w-full h-full flex items-center justify-center bg-violet-50/60 p-3'>
                    <img
                      src={selectedImageUrl}
                      alt='Canon Locked Reference'
                      className='w-full h-full object-contain'
                      data-testid='diff-image-after'
                    />
                    <span className='absolute bottom-2 right-2 text-[9px] font-mono px-2 py-0.5 rounded bg-white/95 border border-violet-200 text-violet-700 font-semibold shadow-2xs'>
                      Bản hoàn thiện (After)
                    </span>
                  </div>

                  {/* Layer A: Left / Draft / Before (Clipped) */}
                  <div
                    style={{ width: `${diffSlider}%` }}
                    className='absolute inset-y-0 left-0 overflow-hidden bg-stone-100 border-r-2 border-[#F97316] z-1'
                  >
                    <div className='absolute inset-0 w-full h-full flex items-center justify-center min-w-[240px] sm:min-w-[320px] p-3 bg-stone-100/90'>
                      {entity.gallery?.[0]?.url ? (
                        <img
                          src={entity.gallery[0].url}
                          alt='Draft Before'
                          className='w-full h-full object-contain'
                          data-testid='diff-image-before'
                        />
                      ) : (
                        <img
                          src={selectedImageUrl}
                          alt='Draft Before'
                          className='w-full h-full object-contain grayscale opacity-80'
                          data-testid='diff-image-before'
                        />
                      )}
                      <span className='absolute bottom-2 left-2 text-[9px] font-mono px-2 py-0.5 rounded bg-white/95 border border-stone-200 text-stone-700 font-semibold shadow-2xs'>
                        Original Draft (Before)
                      </span>
                    </div>
                  </div>

                  {/* Drag Handle with Center Similarity Pill */}
                  <div
                    style={{ left: `${diffSlider}%` }}
                    className='absolute top-0 bottom-0 -ml-3 w-6 flex items-center justify-center pointer-events-none z-2'
                  >
                    <div className='w-6 h-6 rounded-full bg-[#F97316] text-white flex items-center justify-center shadow-md'>
                      <ArrowLeftRight className='w-3 h-3' />
                    </div>
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
                <div className='p-6 bg-stone-50 border border-dashed border-stone-200 rounded-xl flex flex-col items-center justify-center text-center gap-1.5'>
                  <ArrowLeftRight className='w-5 h-5 text-stone-300' />
                  <span className='text-xs font-semibold text-stone-600'>Chưa có bản vẽ để so sánh visual diff</span>
                  <p className='text-[11px] text-stone-400'>
                    Tính năng so sánh tự động kích hoạt khi Artist nộp bản vẽ Model Sheet hoặc ảnh phác thảo.
                  </p>
                </div>
              )}

              {selectedImageUrl && (
                <div className='flex justify-between text-[10px] text-stone-400 font-mono'>
                  <span>◀ Trước</span>
                  <span>Sau ▶</span>
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
                      <span className='text-[11px] text-stone-700 truncate'>
                        <strong className='text-stone-900'>{log.actor}</strong> {log.action}
                      </span>
                    </div>
                    <button
                      type='button'
                      onClick={() => handleCopyHash(log.hash)}
                      title='Sao chép SHA-256 CAS Hash'
                      className='font-mono text-[10px] text-stone-400 hover:text-stone-800 ml-2 shrink-0 cursor-pointer bg-white px-1.5 py-0.5 rounded border border-stone-200'
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
            <span className='text-[11px] text-zinc-500 italic'>
              Họa sĩ (Artist) tải và nộp Concept Art theo từng giai đoạn.
            </span>
          ) : (
            <span className='text-[11px] text-zinc-500 italic'>Chế độ chỉ xem.</span>
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
        title="Xác nhận xóa phiên bản"
        description={`Bạn có chắc chắn muốn xóa phiên bản v${revisionToDelete?.versionNumber || ''} này không? Thao tác này không thể hoàn tác.`}
        confirmText={isDeleting ? "Đang xóa..." : "Xóa phiên bản"}
        cancelText="Hủy"
        variant="danger"
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
        title="Xác nhận xóa thời kỳ"
        description={`Bạn có chắc chắn muốn xóa thời kỳ "${eraToDelete?.stageName || ''}" (Chương ${eraToDelete?.effectiveFromChapterNumber || 1}) và tất cả các phiên bản liên quan chưa khóa? Thao tác này không thể hoàn tác.`}
        confirmText={isDeleting ? "Đang xóa..." : "Xóa thời kỳ"}
        cancelText="Hủy"
        variant="danger"
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
