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
const controlCls = `min-h-11 w-full rounded-lg border border-landing-border bg-white px-3 text-sm text-landing-ink ${focusRing}`;

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const requestRef = useRef(0);
  const loadedChapterRef = useRef<string | null>(null);

  const loadBoard = useCallback(async () => {
    if (!chapterId || !seriesId || !workspaceId) {
      setCards(null);
      loadedChapterRef.current = null;
      return;
    }
    const requestId = ++requestRef.current;
    // Đổi chương: bỏ dữ liệu chương cũ. Làm mới cùng chương: giữ dữ liệu cũ trong lúc tải.
    if (loadedChapterRef.current !== chapterId) setCards(null);
    setLoading(true);
    setError(null);
    try {
      const [assignments, pipeline, pages, members] = await Promise.all([
        assignmentService.getAssignmentsStrict(chapterId),
        pipelineService.getSeriesPipeline(seriesId).catch(() => null),
        pageService.getPagesByChapter(chapterId).catch(() => [] as PageDto[]),
        workspaceService.getMembers(workspaceId).catch(() => [] as WorkspaceMemberDto[]),
      ]);
      if (requestId !== requestRef.current) return;
      setCards(mapAssignmentsToCards(assignments, pipeline?.stages ?? [], pages, members));
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

  // ── Trạng thái lọc & cách xem (URL cho lọc nhanh/cách xem/nhóm; bộ lọc chi tiết trong state) ──
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

  // URL hợp lệ được ưu tiên; nếu không: Producer xem toàn chương, thành viên xem "Cần tôi xử lý".
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

  // Phạm vi trang phụ thuộc chương: đổi chương thì bỏ lọc phạm vi để không lọc theo trang không tồn tại.
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
    // 'all' được ghi rõ để không quay về mặc định "Cần tôi xử lý" của thành viên.
    setParam('filter', 'all');
  };

  // ── Chi tiết công việc (drawer hiện có) + trả focus về đúng chỗ khi đóng ──
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
      <MetricsBar metrics={metrics} />

      {/* Lọc nhanh theo trạng thái thật */}
      <div role='group' aria-label='Lọc nhanh theo trạng thái' className='flex flex-wrap gap-2'>
        {availableQuickFilters.map((f) => {
          const active = quickFilter === f;
          return (
            <button
              key={f}
              type='button'
              aria-pressed={active}
              onClick={() => setParam('filter', f)}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors cursor-pointer ${focusRing} ${
                active
                  ? 'border-landing-ink bg-landing-ink text-white'
                  : 'border-landing-border bg-landing-paper-light text-landing-ink hover:border-landing-ink-muted'
              }`}
            >
              {f === 'needs-me' && <UserCheck className='h-4 w-4' aria-hidden='true' />}
              {QUICK_FILTER_LABELS[f]}
              {quickCounts && !initialLoading && (
                <span
                  className={`rounded-full px-1.5 text-xs tabular-nums ${
                    active
                      ? 'bg-landing-orange text-landing-ink'
                      : 'bg-landing-paper text-landing-ink-muted'
                  }`}
                >
                  {quickCounts[f]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bộ lọc chi tiết */}
      <div className='grid min-w-0 gap-3 rounded-xl border border-landing-border bg-landing-paper-light p-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr))]'>
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
              placeholder='Tên, ghi chú, người phụ trách…'
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
            className='flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg border border-landing-border bg-white px-3 text-sm text-landing-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-landing-ink'
          >
            <input
              id='pb-overdue'
              type='checkbox'
              checked={filters.overdueOnly}
              onChange={(e) => setFilters((f) => ({ ...f, overdueOnly: e.target.checked }))}
              className='h-4 w-4 accent-[#1C1917]'
            />
            Chỉ việc quá hạn
          </label>
        </div>
      </div>

      {/* Thanh kết quả: số lượng, cách xem, nhóm */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex flex-wrap items-center gap-3'>
          <h2
            ref={resultsHeadingRef}
            tabIndex={-1}
            className='text-sm text-landing-ink focus:outline-none'
            aria-live='polite'
          >
            {cards === null ? (
              <span className='text-landing-ink-muted'>Đang tải công việc…</span>
            ) : (
              <>
                Đang hiển thị <strong className='tabular-nums'>{filteredCards.length}</strong> /{' '}
                <span className='tabular-nums'>{cards.length}</span> công việc của chương
                {anyFilterActive && <span className='text-landing-ink-muted'> (đã lọc)</span>}
              </>
            )}
          </h2>
          {anyFilterActive && cards !== null && (
            <button
              type='button'
              onClick={clearFilters}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-landing-ink underline-offset-2 hover:underline cursor-pointer ${focusRing}`}
            >
              <X className='h-4 w-4' aria-hidden='true' />
              Xoá bộ lọc
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
                className={`${controlCls} w-auto`}
              >
                {GROUP_BYS.map((g) => (
                  <option key={g} value={g}>
                    {GROUP_LABELS[g]}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div
            role='group'
            aria-label='Cách xem'
            className='inline-flex rounded-lg border border-landing-border bg-landing-paper-light p-1'
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
                  className={`inline-flex min-h-10 min-w-11 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors cursor-pointer ${focusRing} ${
                    active ? 'bg-landing-ink text-white' : 'text-landing-ink hover:bg-landing-paper'
                  }`}
                >
                  <Icon className='h-4 w-4' aria-hidden='true' />
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
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 font-semibold cursor-pointer ${focusRing}`}
          >
            <RefreshCw className='h-4 w-4' aria-hidden='true' /> Thử lại
          </button>
        </div>
      )}

      {/* Nội dung */}
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
        <div className='min-w-0 overflow-x-auto pb-2'>
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

const primaryCta = `inline-flex min-h-11 items-center gap-2 rounded-lg bg-landing-orange px-4 text-sm font-semibold text-landing-ink hover:bg-landing-orange-hover cursor-pointer ${focusRing}`;
const secondaryCta = `inline-flex min-h-11 items-center gap-2 rounded-lg border border-landing-border bg-white px-4 text-sm font-semibold text-landing-ink hover:bg-landing-paper cursor-pointer ${focusRing}`;

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

const MetricsBar: React.FC<{ metrics: ChapterMetrics | null }> = ({ metrics }) => {
  const items: { label: string; value: (m: ChapterMetrics) => number; alert?: boolean }[] = [
    { label: 'Đang làm', value: (m) => m.inProgress },
    { label: 'Chờ xét duyệt', value: (m) => m.waitingReview },
    { label: 'Cần sửa', value: (m) => m.rework, alert: true },
    { label: 'Quá hạn', value: (m) => m.overdue, alert: true },
    { label: 'Bị chặn', value: (m) => m.blocked },
  ];
  return (
    <section aria-label='Tổng quan toàn chương' className='min-w-0'>
      <div className='grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,9.5rem),1fr))]'>
        <div className='rounded-xl border border-landing-border bg-landing-paper-light px-4 py-3 [grid-column:span_2] max-[480px]:[grid-column:auto]'>
          <p className='text-xs font-semibold text-landing-ink-muted'>Hoàn thành (toàn chương)</p>
          {metrics ? (
            <>
              <p className='mt-1 flex items-baseline gap-2 text-landing-ink'>
                <span className='text-2xl font-semibold tabular-nums'>
                  {metrics.done}/{metrics.total}
                </span>
                {metrics.percent !== null && (
                  <span className='text-sm text-landing-ink-muted tabular-nums'>
                    {metrics.percent}%
                  </span>
                )}
              </p>
              <div
                className='mt-2 h-1.5 overflow-hidden rounded-full bg-landing-paper'
                role='progressbar'
                aria-label='Tiến độ hoàn thành chương'
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={metrics.percent ?? 0}
              >
                <div
                  className='h-full rounded-full bg-landing-orange'
                  style={{ width: `${metrics.percent ?? 0}%` }}
                />
              </div>
              {metrics.disabledStage > 0 && (
                <p className='mt-1.5 text-xs text-landing-ink-muted'>
                  {metrics.disabledStage} việc thuộc công đoạn đang tắt (không tính là hoàn tất)
                </p>
              )}
            </>
          ) : (
            <SkeletonLine className='mt-2 h-7 w-24' />
          )}
        </div>
        {items.map((it) => {
          const value = metrics ? it.value(metrics) : null;
          return (
            <div
              key={it.label}
              className='rounded-xl border border-landing-border bg-landing-paper-light px-4 py-3'
            >
              <p className='text-xs font-semibold text-landing-ink-muted'>{it.label}</p>
              {value === null ? (
                <SkeletonLine className='mt-2 h-7 w-10' />
              ) : (
                <p
                  className={`mt-1 text-2xl font-semibold tabular-nums ${
                    it.alert && value > 0 ? 'text-rose-800' : 'text-landing-ink'
                  }`}
                >
                  {value}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

const SkeletonLine: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`animate-pulse rounded bg-landing-paper motion-reduce:animate-none ${className}`}
    aria-hidden='true'
  />
);

const GridSkeleton: React.FC = () => (
  <div
    className='grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,16.5rem),1fr))]'
    role='status'
    aria-label='Đang tải công việc'
  >
    {Array.from({ length: 8 }).map((_, i) => (
      <div
        key={i}
        className='flex h-64 flex-col gap-3 rounded-xl border border-landing-border bg-landing-paper-light p-4'
      >
        <div className='flex justify-between'>
          <SkeletonLine className='h-5 w-24' />
          <SkeletonLine className='h-5 w-20' />
        </div>
        <SkeletonLine className='h-5 w-4/5' />
        <SkeletonLine className='h-3 w-16' />
        <SkeletonLine className='h-12 w-full' />
        <div className='mt-auto flex justify-between border-t border-landing-border pt-3'>
          <SkeletonLine className='h-7 w-28' />
          <SkeletonLine className='h-7 w-20' />
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
    className='flex flex-col items-center justify-center rounded-xl border border-dashed border-landing-border bg-landing-paper-light px-6 py-14 text-center'
  >
    <span
      className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl ${
        tone === 'error' ? 'bg-rose-50 text-rose-800' : 'bg-landing-paper text-landing-ink'
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
