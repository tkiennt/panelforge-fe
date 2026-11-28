// Khu Studio tối thiểu cho chế độ dữ liệu mẫu: đủ để thành viên vừa nhận lời mời vào Studio,
// thấy danh sách Studio, tổng quan và "Việc của tôi" theo vai trò. Màn soạn kịch bản / canvas vẫn cần BE.
import type { WorkspaceDto } from '@/services/workspace.service';
import type {
  MyTaskCellDto,
  MyTaskLotDto,
  MyWorkStudioDto,
  StageTaskStatus,
  TaskGridReviewItemDto,
  WorkspaceAssignmentDto,
} from '@/types';
import { findSeed, getMockState } from './mockReaderData';

const DAY = 86_400_000;

interface StudioSeed {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  description: string;
  memberCount: number;
  series: { id: string; title: string; chapter: number; chapterTitle: string }[];
}

const STUDIOS: StudioSeed[] = [
  {
    id: 'mock-ws-muc-cam',
    name: 'Studio Mực Cam',
    ownerName: 'Trần Minh Khang',
    ownerEmail: 'producer@mucam.test',
    description: 'Manga hành động và trinh thám, phát hành hằng tuần.',
    memberCount: 6,
    series: [
      {
        id: 'mock-series-kiem-si-bong-dem',
        title: 'Kiếm Sĩ Bóng Đêm',
        chapter: 25,
        chapterTitle: 'Bình minh',
      },
      {
        id: 'mock-series-tham-tu-pho-co',
        title: 'Thám Tử Phố Cổ',
        chapter: 17,
        chapterTitle: 'Kẻ phản bội',
      },
    ],
  },
  {
    id: 'mock-ws-giay-am',
    name: 'Nhà Giấy Ấm',
    ownerName: 'Lê Thu Hà',
    ownerEmail: 'producer@giayam.test',
    description: 'Webtoon đời thường và lãng mạn.',
    memberCount: 4,
    series: [
      {
        id: 'mock-series-hoa-phuong-mua-ha',
        title: 'Hoa Phượng Mùa Hạ',
        chapter: 31,
        chapterTitle: 'Lời hứa',
      },
      {
        id: 'mock-series-quan-ca-phe-cuoi-pho',
        title: 'Quán Cà Phê Cuối Phố',
        chapter: 19,
        chapterTitle: 'Người lạ',
      },
    ],
  },
  {
    id: 'mock-ws-bong-toi',
    name: 'Bóng Tối Comics',
    ownerName: 'Phạm Quốc Bảo',
    ownerEmail: 'producer@bongtoi.test',
    description: 'Kinh dị, kỳ ảo và khoa học viễn tưởng.',
    memberCount: 5,
    series: [
      {
        id: 'mock-series-nha-hang-ma',
        title: 'Nhà Hàng Ma',
        chapter: 23,
        chapterTitle: 'Đêm trắng',
      },
      {
        id: 'mock-series-thanh-pho-khong-ngu',
        title: 'Thành Phố Không Ngủ',
        chapter: 27,
        chapterTitle: 'Cơn bão',
      },
    ],
  },
];

/** Chặng việc theo vai trò được mời (tên chặng giống pipeline mặc định của BE). */
const ROLE_STAGES: Record<
  string,
  { name: string; order: number; color: string; perPage: boolean }[]
> = {
  WRITER: [{ name: 'Kịch bản', order: 1, color: '#7C3AED', perPage: false }],
  ARTIST: [
    { name: 'Phác thảo', order: 3, color: '#2563EB', perPage: true },
    { name: 'Đi nét', order: 4, color: '#0EA5E9', perPage: true },
  ],
  LETTERER: [{ name: 'Chèn chữ', order: 6, color: '#D97706', perPage: true }],
  EDITOR: [{ name: 'Duyệt kịch bản', order: 2, color: '#059669', perPage: false }],
  PRODUCER: [],
};

export const findStudio = (id: string) => STUDIOS.find((s) => s.id === id);

function joinedRole(id: string): string | undefined {
  return getMockState().joinedWorkspaces.find((w) => w.workspaceId === id)?.role;
}

export function toWorkspaceDto(studio: StudioSeed): WorkspaceDto {
  const role = joinedRole(studio.id) ?? null;
  return {
    id: studio.id,
    name: studio.name,
    ownerId: `${studio.id}-owner`,
    ownerName: studio.ownerName,
    ownerEmail: studio.ownerEmail,
    storageQuotaBytes: 5 * 1024 ** 3,
    usedStorageBytes: 1.2 * 1024 ** 3,
    createdAt: new Date(Date.now() - 200 * DAY).toISOString(),
    isOwner: false,
    currentUserRole: role,
    memberCount: studio.memberCount + 1,
    pendingTasks: role ? myLots(studio, role).reduce((n, l) => n + l.tasks.length, 0) : 0,
    description: studio.description,
    seriesCount: studio.series.length,
    seriesPreviews: studio.series.map((s) => ({ id: s.id, title: s.title })),
    lastActivityAt: new Date(Date.now() - 3_600_000).toISOString(),
  };
}

export function joinedWorkspaceDtos(): WorkspaceDto[] {
  return getMockState()
    .joinedWorkspaces.map((w) => findStudio(w.workspaceId))
    .filter((s): s is StudioSeed => !!s)
    .map(toWorkspaceDto);
}

const CELL_STATUSES: StageTaskStatus[] = ['InProgress', 'Assigned', 'Assigned', 'ReworkRequired'];

function myLots(studio: StudioSeed, role: string): MyTaskLotDto[] {
  const stages = ROLE_STAGES[role.toUpperCase()] ?? [];
  return studio.series.flatMap((series, si) =>
    stages.map<MyTaskLotDto>((stage, st) => {
      const chapterId = `${series.id.replace('mock-series-', 'mock-chapter-')}-${series.chapter}`;
      const tasks: MyTaskCellDto[] = stage.perPage
        ? Array.from({ length: 4 }, (_, i) => ({
            id: `${studio.id}-${si}-${st}-p${i + 1}`,
            pageId: `${chapterId}-p${i + 1}`,
            pageNumber: i + 1,
            status: st > 0 ? 'Assigned' : CELL_STATUSES[i % CELL_STATUSES.length],
            isStartable: st === 0,
            isInputOutdated: false,
            lastDecisionComment:
              st === 0 && i === 3
                ? 'Mắt nhân vật chính lệch so với ảnh tham chiếu, sửa lại khung 2.'
                : null,
            attemptCount: st === 0 && i === 3 ? 2 : 1,
          }))
        : [
            {
              id: `${studio.id}-${si}-${st}-chapter`,
              pageId: null,
              pageNumber: null,
              status: si === 0 ? 'InProgress' : 'Assigned',
              isStartable: true,
              isInputOutdated: false,
              attemptCount: 1,
            },
          ];
      return {
        id: `${studio.id}-lot-${si}-${st}`,
        seriesId: series.id,
        seriesTitle: series.title,
        chapterId,
        chapterNumber: series.chapter,
        chapterTitle: series.chapterTitle,
        pipelineStageId: `mock-stage-${stage.order}`,
        stageName: stage.name,
        stageOrder: stage.order,
        stageColorCode: stage.color,
        assignedRole: role.toUpperCase(),
        brief: `${stage.name} chương ${series.chapter} theo kịch bản đã khóa.`,
        dueDate: new Date(Date.now() + (si + st + 1) * 2 * DAY).toISOString(),
        status: 'Active',
        isOverdue: false,
        tasks,
      };
    }),
  );
}

function reviewQueue(studio: StudioSeed, role: string): TaskGridReviewItemDto[] {
  if (role.toUpperCase() !== 'EDITOR') return [];
  return studio.series.map((series, i) => ({
    taskId: `${studio.id}-review-${i}`,
    seriesId: series.id,
    seriesTitle: series.title,
    chapterId: `${series.id.replace('mock-series-', 'mock-chapter-')}-${series.chapter}`,
    chapterNumber: series.chapter,
    chapterTitle: series.chapterTitle,
    pipelineStageId: 'mock-stage-3',
    stageName: 'Phác thảo',
    pageId: null,
    pageNumber: i + 2,
    status: 'Submitted',
    reviewerName: null,
    attemptNumber: 1,
    submittedAt: new Date(Date.now() - (i + 1) * 3_600_000).toISOString(),
  }));
}

export function myWork(): MyWorkStudioDto[] {
  return getMockState()
    .joinedWorkspaces.map((w) => {
      const studio = findStudio(w.workspaceId);
      if (!studio) return null;
      return {
        workspaceId: studio.id,
        workspaceName: studio.name,
        lots: myLots(studio, w.role),
        reviewQueue: reviewQueue(studio, w.role),
      };
    })
    .filter((x): x is MyWorkStudioDto => !!x);
}

export function myAssignments(workspaceId: string): WorkspaceAssignmentDto[] {
  const studio = findStudio(workspaceId);
  const role = joinedRole(workspaceId);
  if (!studio || !role) return [];
  return myLots(studio, role).map((lot) => ({
    id: lot.id,
    seriesId: lot.seriesId,
    chapterId: lot.chapterId,
    entityType: lot.tasks[0]?.pageId ? 'Page' : 'Chapter',
    targetEntityId: lot.tasks[0]?.pageId ?? lot.chapterId,
    pageId: lot.tasks[0]?.pageId ?? null,
    pipelineStageId: lot.pipelineStageId,
    stageName: lot.stageName,
    stageOrder: lot.stageOrder,
    assigneeUserId: 'mock-reader-1',
    assignedRole: role.toUpperCase() as WorkspaceAssignmentDto['assignedRole'],
    brief: lot.brief ?? '',
    dueDate: lot.dueDate,
    priority: 'Medium',
    status: lot.tasks.some((t) => t.status === 'InProgress') ? 'InProgress' : 'Assigned',
    createdAt: new Date(Date.now() - DAY).toISOString(),
    seriesTitle: lot.seriesTitle,
    chapterNumber: lot.chapterNumber,
    chapterTitle: lot.chapterTitle,
    scopeLabel: lot.tasks[0]?.pageNumber ? `Trang 1–${lot.tasks.length}` : 'Cả chương',
    stageColorCode: lot.stageColorCode,
  }));
}

const TEAM: Record<string, { name: string; role: string }[]> = {
  'mock-ws-muc-cam': [
    { name: 'Nguyễn Hải Yến', role: 'WRITER' },
    { name: 'Đỗ Văn Long', role: 'ARTIST' },
    { name: 'Vũ Thanh Tâm', role: 'LETTERER' },
    { name: 'Hoàng Mai Anh', role: 'EDITOR' },
  ],
  'mock-ws-giay-am': [
    { name: 'Bùi Ngọc Lan', role: 'ARTIST' },
    { name: 'Trịnh Quang Huy', role: 'EDITOR' },
  ],
  'mock-ws-bong-toi': [
    { name: 'Lý Gia Bảo', role: 'WRITER' },
    { name: 'Phan Thu Trang', role: 'ARTIST' },
    { name: 'Đặng Minh Quân', role: 'LETTERER' },
  ],
};

export function workspaceMembers(workspaceId: string) {
  const studio = findStudio(workspaceId);
  if (!studio) return [];
  const state = getMockState();
  const joinedAt = new Date(Date.now() - 90 * DAY).toISOString();
  const me = state.joinedWorkspaces.find((w) => w.workspaceId === workspaceId);
  return [
    {
      userId: `${studio.id}-owner`,
      fullName: studio.ownerName,
      email: studio.ownerEmail,
      role: 'PRODUCER',
      isOwner: true,
      joinedAt,
      status: 'Active',
    },
    ...(TEAM[workspaceId] ?? []).map((m, i) => ({
      userId: `${studio.id}-m${i}`,
      fullName: m.name,
      email: `member${i + 1}@${studio.id.replace('mock-ws-', '')}.test`,
      role: m.role,
      isOwner: false,
      joinedAt,
      status: 'Active',
    })),
    ...(me
      ? [
          {
            userId: 'mock-reader-1',
            fullName: state.userName,
            email: state.email,
            role: me.role,
            isOwner: false,
            joinedAt: new Date().toISOString(),
            status: 'Active',
          },
        ]
      : []),
  ];
}

export function workspaceSeries(workspaceId: string) {
  const studio = findStudio(workspaceId);
  if (!studio) return [];
  return studio.series.map((s) => {
    const seed = findSeed(s.id);
    return {
      id: s.id,
      workspaceId,
      title: s.title,
      synopsis: seed?.synopsis ?? null,
      readingDirection:
        seed?.format === 'Manga'
          ? 'RightToLeft'
          : seed?.format === 'Webtoon'
            ? 'Vertical'
            : 'LeftToRight',
      genre: seed?.genre ?? '',
      format: seed?.format ?? 'Manga',
      createdAt: new Date(Date.now() - 180 * DAY).toISOString(),
      chaptersCount: s.chapter,
      coverUrl: null,
      isCompleted: false,
      originalLanguage: 'vi',
      releaseLanguages: ['vi', 'en'],
    };
  });
}

function studioOfSeries(seriesId: string) {
  return STUDIOS.find((s) => s.series.some((x) => x.id === seriesId));
}

const PIPELINE = [
  { name: 'Kịch bản', slug: 'script', role: 'WRITER', color: '#7C3AED', gate: false },
  { name: 'Duyệt kịch bản', slug: 'script-review', role: 'EDITOR', color: '#059669', gate: true },
  { name: 'Phác thảo', slug: 'pencil', role: 'ARTIST', color: '#2563EB', gate: false },
  { name: 'Đi nét', slug: 'ink', role: 'ARTIST', color: '#0EA5E9', gate: false },
  { name: 'Tô màu', slug: 'color', role: 'ARTIST', color: '#0284C7', gate: false },
  { name: 'Chèn chữ', slug: 'lettering', role: 'LETTERER', color: '#D97706', gate: false },
  { name: 'Duyệt chương', slug: 'final-review', role: 'EDITOR', color: '#059669', gate: true },
];

export function seriesPipeline(seriesId: string) {
  if (!studioOfSeries(seriesId)) return undefined;
  return {
    id: `${seriesId}-pipeline`,
    seriesId,
    name: 'Pipeline mặc định',
    stages: PIPELINE.map((s, i) => ({
      id: `mock-stage-${i + 1}`,
      name: s.name,
      slug: s.slug,
      stageOrder: i + 1,
      colorCode: s.color,
      allowedRole: s.role,
      isApprovalGate: s.gate,
      isInitial: i === 0,
      isTerminal: i === PIPELINE.length - 1,
      isEnabled: true,
    })),
    transitions: [],
  };
}

export function seriesDetailForStudio(seriesId: string) {
  const studio = studioOfSeries(seriesId);
  if (!studio) return undefined;
  const base = workspaceSeries(studio.id).find((s) => s.id === seriesId)!;
  return {
    ...base,
    currentUserRole: joinedRole(studio.id) ?? null,
    bibleId: `${seriesId}-bible`,
    chapters: seriesChapters(seriesId).items.map((c) => ({
      id: c.id,
      chapterNumber: c.chapterNumber,
      title: c.title,
      targetReleaseDate: c.targetReleaseDate,
      versionVector: c.versionVector,
      createdAt: c.createdAt,
    })),
  };
}

export function seriesChapters(seriesId: string) {
  const studio = studioOfSeries(seriesId);
  const series = studio?.series.find((s) => s.id === seriesId);
  const items = series
    ? Array.from({ length: 3 }, (_, i) => {
        const n = series.chapter - i;
        return {
          id: `${seriesId.replace('mock-series-', 'mock-chapter-')}-${n}`,
          seriesId,
          chapterNumber: n,
          title: i === 0 ? series.chapterTitle : `Chương ${n}`,
          targetReleaseDate: new Date(Date.now() + (7 - i * 7) * DAY).toISOString().slice(0, 10),
          versionVector: 3,
          createdAt: new Date(Date.now() - (i + 1) * 7 * DAY).toISOString(),
          scenesCount: 6,
          pagesCount: 8,
          status: i === 0 ? 'InProduction' : 'HandedOffAndPublished',
          isScriptFrozen: i > 0,
        };
      })
    : [];
  return { items, totalCount: items.length, pageIndex: 1, pageSize: 50, totalPages: 1 };
}

export function myTaskLots(workspaceId: string, seriesId?: string): MyTaskLotDto[] {
  const studio = findStudio(workspaceId);
  const role = joinedRole(workspaceId);
  if (!studio || !role) return [];
  return myLots(studio, role).filter((l) => !seriesId || l.seriesId === seriesId);
}
