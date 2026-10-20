import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Columns3,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  UserCheck,
  X,
  FileCheck2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { KanbanColumn } from './KanbanColumn';
import { SideDrawer } from './SideDrawer';
import { ProductionTaskCard } from './ProductionTaskCard';
import { ProductionTaskList } from './ProductionTaskList';
import { BOARD_COLUMNS, type BoardCard } from './pipelineBoard.types';
import {
  type ChapterMetrics,
  type DetailFilters,
  type GroupBy,
  type PrimaryAction,
  type UserContext,
  type ViewMode,
  EMPTY_DETAIL_FILTERS,
  GROUP_BYS,
  QUICK_FILTERS,
  QUICK_FILTER_LABELS,
  VIEW_MODES,
  blockedReason,
  buildScopeOptions,
  computeMetrics,
  countQuickFilters,
  groupCards,
  hasActiveDetailFilters,
  mapAssignmentsToCards,
  matchesDetailFilters,
  matchesQuickFilter,
  primaryActionFor,
  resolveGroupBy,
  resolveQuickFilter,
  resolveViewMode,
  sortCards,
  statusKey,
} from './productionBoard.utils';
import { assignmentService } from '@/services/assignment.service';
import { pipelineService } from '@/services/pipeline.service';
import { pageService, type PageDto } from '@/services/page.service';
import { workspaceService, type WorkspaceMemberDto } from '@/services/workspace.service';
import type { WorkspaceRole } from '@/types';

export interface ProductionBoardProps {
  chapterId?: string;
  /** Tăng để tải lại cùng chương mà vẫn giữ dữ liệu cũ + bộ lọc (không remount). */
  refreshKey?: number;
  currentUserRole?: WorkspaceRole | null;
  isProducer?: boolean;
  currentUserId?: string;
  onShowToast: (title: string, desc: string) => void;
  onOpenCreateAssignment?: () => void;
}

const GROUP_LABELS: Record<GroupBy, string> = {
  none: 'Không nhóm',
  status: 'Trạng thái',
  page: 'Trang',
  assignee: 'Người phụ trách',
};
const VIEW_META: Record<ViewMode, { label: string; Icon: React.ElementType }> = {
  grid: { label: 'Lưới', Icon: LayoutGrid },
  list: { label: 'Danh sách', Icon: List },
  kanban: { label: 'Kanban', Icon: Columns3 },
};

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-ink';
const controlCls = `min-h-10 w-full rounded-lg border border-landing-border bg-[#FCFBF8] px-3 text-xs sm:text-sm text-landing-ink ${focusRing}`;

export const ProductionBoard: React.FC<ProductionBoardProps> = ({
  chapterId,
  refreshKey = 0,
  currentUserRole,
  isProducer = false,
  currentUserId,
  onShowToast,
  onOpenCreateAssignment,
}) => {
  const navigate = useNavigate();
  const { workspaceId, seriesId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Dữ liệu ──
  const [cards, setCards] = useState<BoardCard[] | null>(null);
  const [pages, setPages] = useState<PageDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const requestRef = useRef(0);
  const loadedChapterRef = useRef<string | null>(null);

  const loadBoard = useCallback(async () => {
    if (!chapterId || !seriesId || !workspaceId) {
      setCards(null);
      setPages([]);
      loadedChapterRef.current = null;
      return;
    }
    const requestId = ++requestRef.current;
    if (loadedChapterRef.current !== chapterId) {
      setCards(null);
      setPages([]);
    }
    setLoading(true);
    setError(null);
    try {
      const [assignments, pipeline, pagesRes, members] = await Promise.all([
        assignmentService.getAssignmentsStrict(chapterId),
        pipelineService.getSeriesPipeline(seriesId).catch(() => null),
        pageService.getPagesByChapter(chapterId).catch(() => [] as PageDto[]),
        workspaceService.getMembers(workspaceId).catch(() => [] as WorkspaceMemberDto[]),
      ]);
      if (requestId !== requestRef.current) return;
      setCards(mapAssignmentsToCards(assignments, pipeline?.stages ?? [], pagesRes, members));
      setPages(pagesRes);
      loadedChapterRef.current = chapterId;
      setNow(Date.now());
    } catch (err) {
      if (requestId !== requestRef.current) return;
      console.error('Lỗi khi nạp dữ liệu Quy trình sản xuất:', err);
      setError('Không thể tải danh sách công việc của chương.');
      onShowToast('Lỗi tải dữ liệu', 'Không thể đồng bộ danh sách công việc của chương.');
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [chapterId, seriesId, workspaceId, onShowToast]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard, refreshKey]);

  // ── Trạng thái lọc & cách xem ──
  const userCtx: UserContext = useMemo(
    () => ({
      userId: currentUserId ?? null,
      workspaceRole: currentUserRole || (isProducer ? 'PRODUCER' : null),
    }),
    [currentUserId, currentUserRole, isProducer],
  );
  const canUseNeedsMe = !!currentUserId;
  const availableQuickFilters = useMemo(
    () => QUICK_FILTERS.filter((f) => f !== 'needs-me' || canUseNeedsMe),
    [canUseNeedsMe],
  );

  const quickFilter = resolveQuickFilter(searchParams.get('filter'), canUseNeedsMe, isProducer);
  const viewMode = resolveViewMode(searchParams.get('view'));
  const groupBy = resolveGroupBy(searchParams.get('group'));

  const setParam = useCallback(
    (key: string, value: string, defaultValue?: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (defaultValue !== undefined && value === defaultValue) next.delete(key);
          else next.set(key, value);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const [filters, setFilters] = useState<DetailFilters>(EMPTY_DETAIL_FILTERS);
  const deferredSearch = useDeferredValue(filters.search);

  // Đổi chương: reset filter phạm vi trang
  const [scopeChapter, setScopeChapter] = useState(chapterId);
  if (scopeChapter !== chapterId) {
    setScopeChapter(chapterId);
    if (filters.scope) setFilters((f) => ({ ...f, scope: '' }));
  }

  const allCards = useMemo(() => cards ?? [], [cards]);
  const metrics: ChapterMetrics | null = useMemo(
    () => (cards ? computeMetrics(cards, now) : null),
    [cards, now],
  );
  const quickCounts = useMemo(
    () => (cards ? countQuickFilters(cards, userCtx) : null),
    [cards, userCtx],
  );

  const assigneeOptions = useMemo(() => {
    const map = new Map<string, string>();
    allCards.forEach((c) => map.set(c.assigneeUserId, c.assigneeName));
    return [...map.entries()]
      .map(([id, name]) => ({ id, name: id === currentUserId ? `${name} (Tôi)` : name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [allCards, currentUserId]);

  const stageOptions = useMemo(() => {
    const map = new Map<string, { name: string; order: number }>();
    allCards.forEach((c) => map.set(c.pipelineStageId, { name: c.stageName, order: c.stageOrder }));
    return [...map.entries()]
      .sort((a, b) => a[1].order - b[1].order)
      .map(([id, v]) => ({ id, name: v.name }));
  }, [allCards]);

  const scopeOptions = useMemo(() => buildScopeOptions(allCards), [allCards]);

  const effectiveFilters = useMemo(
    () => ({ ...filters, search: deferredSearch }),
    [filters, deferredSearch],
  );

  const filteredCards = useMemo(
    () =>
      sortCards(
        allCards.filter(
          (c) =>
            matchesQuickFilter(c, quickFilter, userCtx) &&
            matchesDetailFilters(c, effectiveFilters, now),
        ),
      ),
    [allCards, quickFilter, userCtx, effectiveFilters, now],
  );

  const groups = useMemo(() => groupCards(filteredCards, groupBy), [filteredCards, groupBy]);

  const detailActive = hasActiveDetailFilters(filters);
  const anyFilterActive = detailActive || quickFilter !== 'all';

  const clearFilters = () => {
    setFilters(EMPTY_DETAIL_FILTERS);
    setParam('filter', 'all');
  };

  // ── Chi tiết công việc (drawer) ──
  const [selectedCard, setSelectedCard] = useState<BoardCard | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);

  const openDetails = (card: BoardCard, trigger?: HTMLElement) => {
    triggerRef.current =
      trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setSelectedCard(card);
    setIsDrawerOpen(true);
  };

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    requestAnimationFrame(() => {
      const target = triggerRef.current;
      if (target && target.isConnected) target.focus({ preventScroll: true });
      else resultsHeadingRef.current?.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    if (!isDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDrawerOpen, closeDrawer]);

  const openMyWork = (card: BoardCard) => {
    if (workspaceId && seriesId) {
      navigate(
        `/workspaces/${workspaceId}/series/${seriesId}/my-work?chapterId=${card.chapterId}&assignmentId=${card.id}`,
      );
    }
  };

  const handleAction = (card: BoardCard, action: PrimaryAction, trigger: HTMLElement) => {
    if (action.kind === 'details') openDetails(card, trigger);
    else openMyWork(card);
  };

  const actionFor = useCallback((card: BoardCard) => primaryActionFor(card, userCtx), [userCtx]);
  const reasonFor = useCallback((card: BoardCard) => blockedReason(card, allCards), [allCards]);

  // ── Render ──
  if (!chapterId) {
    return (
      <EmptyState
        icon={AlertCircle}
        title='Chưa chọn chương'
        description='Chọn một chương ở phía trên để xem bảng công việc sản xuất.'
      />
    );
  }

  const initialLoading = cards === null && loading;
  const fatalError = cards === null && !!error;

  return (
    <div className='flex min-w-0 flex-col gap-5'>
      {/* B. Dải tóm tắt tiến độ gọn, phân biệt số trang và số công việc */}
      <ProgressSummaryStrip metrics={metrics} pageCount={pages.length} />

      {/* C. Lọc nhanh theo trạng thái: warm active style #FFF2E6 / #1C1917 / #C2410C */}
      <div
        role='group'
        aria-label='Lọc nhanh theo trạng thái'
        className='flex flex-wrap items-center gap-2'
      >
        {availableQuickFilters.map((f) => {
          const active = quickFilter === f;
          return (
            <button
              key={f}
              type='button'
              aria-pressed={active}
              onClick={() => setParam('filter', f)}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3.5 text-xs font-semibold transition-all cursor-pointer ${focusRing} ${
                active
                  ? 'border-[#C2410C] bg-[#FFF2E6] text-[#1C1917] shadow-2xs ring-1 ring-[#C2410C]/25'
                  : 'border-landing-border bg-[#FCFBF8] text-landing-ink hover:bg-[#F3F0E9] hover:border-stone-400'
              }`}
            >
              {f === 'needs-me' && (
                <UserCheck className='h-3.5 w-3.5 text-[#C2410C]' aria-hidden='true' />
              )}
              <span>{QUICK_FILTER_LABELS[f]}</span>
              {quickCounts && !initialLoading && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[11px] tabular-nums font-bold ${
                    active ? 'bg-[#C2410C]/15 text-[#C2410C]' : 'bg-stone-200/70 text-stone-600'
                  }`}
                >
                  {quickCounts[f]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* C. Bộ lọc chi tiết: Toolbar gọn */}
      <div className='grid min-w-0 gap-3 rounded-xl border border-landing-border bg-[#FCFBF8] p-3.5 shadow-2xs [grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr))]'>
        <div className='min-w-0 [grid-column:span_2] max-[640px]:[grid-column:auto]'>
          <label
            htmlFor='pb-search'
            className='mb-1 block text-xs font-semibold text-landing-ink-muted'
          >
            Tìm công việc
          </label>
          <div className='relative'>
            <Search
              className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-landing-ink-muted'
              aria-hidden='true'
            />
            <input
              id='pb-search'
              type='search'
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder='Tên việc, ghi chú, người phụ trách…'
              className={`${controlCls} pl-9`}
            />
          </div>
        </div>

        <FilterSelect
          id='pb-assignee'
          label='Người phụ trách'
          value={filters.assignee}
          onChange={(v) => setFilters((f) => ({ ...f, assignee: v }))}
          options={assigneeOptions.map((o) => ({ value: o.id, label: o.name }))}
          allLabel='Mọi người'
        />

        <FilterSelect
          id='pb-stage'
          label='Công đoạn'
          value={filters.stage}
          onChange={(v) => setFilters((f) => ({ ...f, stage: v }))}
          options={stageOptions.map((o) => ({ value: o.id, label: o.name }))}
          allLabel='Mọi công đoạn'
        />

        <FilterSelect
          id='pb-scope'
          label='Phạm vi'
          value={filters.scope}
          onChange={(v) => setFilters((f) => ({ ...f, scope: v }))}
          options={scopeOptions.map((o) => ({ value: o.key, label: o.label }))}
          allLabel='Mọi phạm vi'
        />

        <div className='flex min-w-0 items-end'>
          <label
            htmlFor='pb-overdue'
            className='flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-lg border border-landing-border bg-[#FCFBF8] px-3 text-xs sm:text-sm text-landing-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-landing-ink hover:bg-stone-50 transition-colors'
          >
            <input
              id='pb-overdue'
              type='checkbox'
              checked={filters.overdueOnly}
              onChange={(e) => setFilters((f) => ({ ...f, overdueOnly: e.target.checked }))}
              className='h-4 w-4 accent-[#C2410C]'
            />
            <span className='font-medium'>Chỉ việc quá hạn</span>
          </label>
        </div>
      </div>

      {/* Thanh trạng thái kết quả, cách xem, nhóm */}
      <div className='flex flex-wrap items-center justify-between gap-3 border-b border-landing-border pb-3'>
        <div className='flex flex-wrap items-center gap-3'>
          <h2
            ref={resultsHeadingRef}
            tabIndex={-1}
            className='text-xs sm:text-sm text-landing-ink focus:outline-none'
            aria-live='polite'
          >
            {cards === null ? (
              <span className='text-landing-ink-muted'>Đang tải công việc…</span>
            ) : (
              <>
                Đang hiển thị{' '}
                <strong className='tabular-nums font-bold'>{filteredCards.length}</strong> /{' '}
                <span className='tabular-nums font-semibold'>{cards.length}</span> công việc của
                chương
                {anyFilterActive && <span className='text-landing-ink-muted'> (đã lọc)</span>}
              </>
            )}
          </h2>
          {anyFilterActive && cards !== null && (
            <button
              type='button'
              onClick={clearFilters}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-[#C2410C] bg-[#FFF2E6] border border-[#C2410C]/30 hover:bg-[#FFE5CC] transition-colors cursor-pointer ${focusRing}`}
            >
              <X className='h-3.5 w-3.5' aria-hidden='true' />
              <span>Xoá bộ lọc</span>
            </button>
          )}
          {loading && cards !== null && (
            <span
              className='inline-flex items-center gap-1.5 text-xs text-landing-ink-muted'
              role='status'
            >
              <RefreshCw
                className='h-3.5 w-3.5 animate-spin motion-reduce:animate-none'
                aria-hidden='true'
              />
              Đang làm mới…
            </span>
          )}
        </div>

        <div className='flex flex-wrap items-center gap-3'>
          {viewMode !== 'kanban' && (
            <div className='flex items-center gap-2'>
              <label htmlFor='pb-group' className='text-xs font-semibold text-landing-ink-muted'>
                Nhóm theo
              </label>
              <select
                id='pb-group'
                value={groupBy}
                onChange={(e) => setParam('group', e.target.value, 'none')}
                className={`${controlCls} w-auto text-xs py-1`}
              >
                {GROUP_BYS.map((g) => (
                  <option key={g} value={g}>
                    {GROUP_LABELS[g]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Cách xem Lưới / Danh sách / Kanban */}
          <div
            role='group'
            aria-label='Cách xem'
            className='inline-flex rounded-lg border border-landing-border bg-[#FCFBF8] p-0.5 shadow-2xs'
          >
            {VIEW_MODES.map((v) => {
              const { label, Icon } = VIEW_META[v];
              const active = viewMode === v;
              return (
                <button
                  key={v}
                  type='button'
                  aria-pressed={active}
                  onClick={() => setParam('view', v, 'grid')}
                  className={`inline-flex min-h-8 min-w-9 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors cursor-pointer ${focusRing} ${
                    active
                      ? 'bg-[#FFF2E6] text-[#1C1917] border border-[#C2410C]/40 font-bold shadow-2xs'
                      : 'text-landing-ink-muted hover:text-landing-ink hover:bg-[#F3F0E9]'
                  }`}
                >
                  <Icon className='h-3.5 w-3.5' aria-hidden='true' />
                  <span className={v === 'kanban' ? 'max-[480px]:sr-only' : ''}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lỗi làm mới khi vẫn còn dữ liệu cũ */}
      {error && cards !== null && (
        <div
          role='alert'
          className='flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-900'
        >
          <span>{error} Đang hiển thị dữ liệu lần tải trước.</span>
          <button
            type='button'
            onClick={loadBoard}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 font-semibold cursor-pointer ${focusRing}`}
          >
            <RefreshCw className='h-4 w-4' aria-hidden='true' /> Thử lại
          </button>
        </div>
      )}

      {/* D. Vùng công việc chính */}
      {initialLoading ? (
        <GridSkeleton />
      ) : fatalError ? (
        <EmptyState
          icon={AlertCircle}
          tone='error'
          title={error ?? 'Lỗi tải dữ liệu'}
          description='Dữ liệu chưa được tải nên không thể biết chương có công việc hay không.'
          action={
            <button type='button' onClick={loadBoard} className={primaryCta}>
              <RefreshCw className='h-4 w-4' aria-hidden='true' /> Thử lại
            </button>
          }
        />
      ) : cards === null ? null : cards.length === 0 ? (
        <EmptyState
          icon={Plus}
          title='Chương này chưa có công việc nào'
          description='Phân công các công đoạn Kịch bản, Bố cục, Vẽ nét, Đi nét, Tô màu hoặc Chèn chữ để bắt đầu theo dõi tiến độ.'
          action={
            onOpenCreateAssignment && (
              <button type='button' onClick={onOpenCreateAssignment} className={primaryCta}>
                <Plus className='h-4 w-4' aria-hidden='true' /> Giao việc cho chương này
              </button>
            )
          }
        />
      ) : filteredCards.length === 0 ? (
        quickFilter === 'needs-me' && !detailActive ? (
          <EmptyState
            icon={UserCheck}
            title='Không có việc nào cần bạn xử lý'
            description='Chương này hiện không có việc được giao cho bạn hoặc đang chờ bạn xét duyệt.'
            action={
              <button
                type='button'
                onClick={() => setParam('filter', 'all')}
                className={secondaryCta}
              >
                Xem tất cả công việc của chương
              </button>
            }
          />
        ) : (
          <EmptyState
            icon={SearchX}
            title='Không có công việc khớp bộ lọc'
            description='Thử bỏ bớt điều kiện lọc hoặc đổi trạng thái.'
            action={
              <button type='button' onClick={clearFilters} className={secondaryCta}>
                Xoá bộ lọc
              </button>
            }
          />
        )
      ) : viewMode === 'kanban' ? (
        <div className='min-w-0 overflow-x-auto pb-4'>
          <div className='flex w-max items-start gap-4'>
            {BOARD_COLUMNS.map((column) => (
              <KanbanColumn
                key={String(column.status)}
                column={column}
                cards={filteredCards.filter((c) => statusKey(c.status) === column.status)}
                onCardClick={(card) => openDetails(card)}
                onOpenMyWork={openMyWork}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className='flex min-w-0 flex-col gap-6'>
          {groups.map((group) => (
            <section key={group.key} aria-label={group.label || 'Công việc'} className='min-w-0'>
              {groupBy !== 'none' && (
                <h3 className='mb-3 flex items-baseline gap-2 text-sm font-semibold text-landing-ink'>
                  {group.label}
                  <span className='text-xs font-normal text-landing-ink-muted tabular-nums'>
                    {group.cards.length} việc
                  </span>
                </h3>
              )}
              {viewMode === 'list' ? (
                <ProductionTaskList
                  cards={group.cards}
                  now={now}
                  actionFor={actionFor}
                  blockedReasonFor={reasonFor}
                  onOpenDetails={openDetails}
                  onAction={handleAction}
                />
              ) : (
                <ul
                  className='grid min-w-0 gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,16.5rem),1fr))]'
                  aria-label={group.label || 'Lưới công việc'}
                >
                  {group.cards.map((card) => (
                    <li key={card.id} className='min-w-0'>
                      <ProductionTaskCard
                        card={card}
                        now={now}
                        action={actionFor(card)}
                        blockedReason={reasonFor(card)}
                        onOpenDetails={openDetails}
                        onAction={handleAction}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {/* Drawer chi tiết công việc */}
      <SideDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        card={selectedCard}
        onShowToast={onShowToast}
        onDeleted={(deletedId) => {
          setCards((prev) => (prev ? prev.filter((c) => c.id !== deletedId) : prev));
          closeDrawer();
        }}
      />
    </div>
  );
};

// ── Thành phần phụ ──

const primaryCta = `inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#C2410C] px-4 text-xs sm:text-sm font-semibold text-white hover:bg-[#EA580C] shadow-xs cursor-pointer ${focusRing}`;
const secondaryCta = `inline-flex min-h-10 items-center gap-2 rounded-lg border border-landing-border bg-[#FCFBF8] px-4 text-xs sm:text-sm font-semibold text-landing-ink hover:bg-[#F3F0E9] cursor-pointer ${focusRing}`;

const FilterSelect: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
}> = ({ id, label, value, onChange, options, allLabel }) => (
  <div className='min-w-0'>
    <label htmlFor={id} className='mb-1 block text-xs font-semibold text-landing-ink-muted'>
      {label}
    </label>
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={controlCls}>
      <option value=''>{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

/** B. Dải tiến độ gọn, phân biệt số trang và số công việc */
const ProgressSummaryStrip: React.FC<{ metrics: ChapterMetrics | null; pageCount: number }> = ({
  metrics,
  pageCount,
}) => {
  return (
    <section aria-label='Tổng quan toàn chương' className='min-w-0'>
      <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-landing-border bg-[#FCFBF8] p-3.5 shadow-2xs'>
        {/* Nhóm tiến độ hoàn thành công việc */}
        <div className='flex flex-wrap items-center gap-4 sm:gap-6 min-w-0'>
          <div className='min-w-0'>
            <div className='flex items-center gap-2 flex-wrap'>
              <span className='text-xs font-bold uppercase tracking-wider text-landing-ink-muted'>
                Tiến độ công việc
              </span>
              {pageCount > 0 && (
                <span className='inline-flex items-center gap-1 rounded bg-[#F3F0E9] border border-stone-200 px-2 py-0.5 text-xs font-medium text-stone-700'>
                  <FileCheck2 className='h-3.5 w-3.5 text-stone-500' aria-hidden='true' />
                  <span>{pageCount} trang bản thảo</span>
                </span>
              )}
            </div>

            <div className='mt-1 flex items-baseline gap-2 text-landing-ink'>
              <span className='text-xl sm:text-2xl font-bold tabular-nums tracking-tight'>
                {metrics ? `${metrics.done}/${metrics.total}` : '0/0'}
              </span>
              {metrics?.percent !== null && (
                <span className='text-xs sm:text-sm font-semibold text-landing-ink-muted tabular-nums'>
                  {metrics?.percent}%
                </span>
              )}
              {metrics && (
                <div
                  className='ml-2 h-2 w-20 sm:w-28 overflow-hidden rounded-full bg-[#E7E2D7]'
                  role='progressbar'
                  aria-label='Tiến độ hoàn thành chương'
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={metrics.percent ?? 0}
                >
                  <div
                    className='h-full rounded-full bg-[#C2410C]'
                    style={{ width: `${metrics.percent ?? 0}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Các chỉ số công việc theo trạng thái */}
          <div className='flex flex-wrap items-center gap-2 border-t sm:border-t-0 sm:border-l border-landing-border pt-2 sm:pt-0 sm:pl-4'>
            <div className='flex items-center gap-1.5 rounded-lg bg-[#F3F0E9] border border-landing-border px-2.5 py-1 text-xs'>
              <span className='text-landing-ink-muted'>Đang làm:</span>
              <span className='font-bold tabular-nums text-landing-ink'>
                {metrics?.inProgress ?? 0}
              </span>
            </div>

            <div className='flex items-center gap-1.5 rounded-lg bg-[#F3F0E9] border border-landing-border px-2.5 py-1 text-xs'>
              <span className='text-landing-ink-muted'>Chờ duyệt:</span>
              <span className='font-bold tabular-nums text-sky-900'>
                {metrics?.waitingReview ?? 0}
              </span>
            </div>

            {/* Cần sửa - nổi bật cảnh báo nếu > 0 */}
            <div
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs border ${
                metrics && metrics.rework > 0
                  ? 'bg-rose-50 border-rose-300 text-rose-900 font-semibold'
                  : 'bg-[#F3F0E9] border-landing-border text-landing-ink-muted'
              }`}
            >
              {metrics && metrics.rework > 0 && (
                <RotateCcw className='h-3 w-3 text-rose-600' aria-hidden='true' />
              )}
              <span>Cần sửa:</span>
              <span className='font-bold tabular-nums'>{metrics?.rework ?? 0}</span>
            </div>

            {/* Quá hạn - nổi bật cảnh báo nếu > 0 */}
            <div
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs border ${
                metrics && metrics.overdue > 0
                  ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                  : 'bg-[#F3F0E9] border-landing-border text-landing-ink-muted'
              }`}
            >
              {metrics && metrics.overdue > 0 && (
                <AlertTriangle className='h-3 w-3 text-amber-600' aria-hidden='true' />
              )}
              <span>Quá hạn:</span>
              <span className='font-bold tabular-nums'>{metrics?.overdue ?? 0}</span>
            </div>

            {metrics && metrics.blocked > 0 && (
              <div className='flex items-center gap-1.5 rounded-lg bg-stone-100 border border-stone-300 px-2.5 py-1 text-xs text-stone-700'>
                <span>Bị chặn:</span>
                <span className='font-bold tabular-nums'>{metrics.blocked}</span>
              </div>
            )}
          </div>
        </div>

        {metrics && metrics.disabledStage > 0 && (
          <p className='text-[11px] text-landing-ink-muted'>
            {metrics.disabledStage} việc thuộc công đoạn đang tắt (không tính là hoàn tất)
          </p>
        )}
      </div>
    </section>
  );
};

const GridSkeleton: React.FC = () => (
  <div
    className='grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,16.5rem),1fr))]'
    role='status'
    aria-label='Đang tải công việc'
  >
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        className='flex h-64 flex-col gap-3 rounded-xl border border-landing-border bg-[#FCFBF8] p-4 animate-pulse'
      >
        <div className='flex justify-between'>
          <div className='h-5 w-24 rounded bg-[#E7E2D7]' />
          <div className='h-5 w-20 rounded bg-[#E7E2D7]' />
        </div>
        <div className='h-5 w-4/5 rounded bg-[#E7E2D7]' />
        <div className='h-3 w-16 rounded bg-[#E7E2D7]' />
        <div className='h-12 w-full rounded bg-[#E7E2D7]' />
        <div className='mt-auto flex justify-between border-t border-landing-border pt-3'>
          <div className='h-7 w-28 rounded bg-[#E7E2D7]' />
          <div className='h-7 w-20 rounded bg-[#E7E2D7]' />
        </div>
      </div>
    ))}
  </div>
);

const EmptyState: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
  tone?: 'neutral' | 'error';
}> = ({ icon: Icon, title, description, action, tone = 'neutral' }) => (
  <div
    role={tone === 'error' ? 'alert' : undefined}
    className='flex flex-col items-center justify-center rounded-xl border border-dashed border-landing-border bg-[#FCFBF8] px-6 py-14 text-center shadow-2xs'
  >
    <span
      className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl ${
        tone === 'error' ? 'bg-rose-50 text-rose-800' : 'bg-[#F3F0E9] text-landing-ink'
      }`}
      aria-hidden='true'
    >
      <Icon className='h-6 w-6' />
    </span>
    <h3 className='text-base font-semibold text-landing-ink'>{title}</h3>
    <p className='mt-1 max-w-md text-sm text-landing-ink-muted'>{description}</p>
    {action && <div className='mt-4'>{action}</div>}
  </div>
);
