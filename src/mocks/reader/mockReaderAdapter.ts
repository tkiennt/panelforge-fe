// Axios adapter giả lập các endpoint của khu độc giả. Request khác vẫn đi tới BE thật.
// Giữ đúng đường dẫn + hình dạng DTO của BE để bỏ mock là chạy được với API thật, không sửa view.
import axios, {
  AxiosError,
  type AxiosAdapter,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { NotificationDto } from '@/types';
import {
  chapterHasLanguage,
  chapterLabel,
  chapterPriceOf,
  editionKey,
  getMockState,
  listSeries,
  readChapter,
  saveMockState,
  seriesDetail,
} from './mockReaderData';
import {
  findStudio,
  isOwnedStudio,
  joinedWorkspaceDtos,
  myAssignments,
  myTaskLots,
  myWork,
  seriesChapters,
  seriesDetailForStudio,
  seriesPipeline,
  toWorkspaceDto,
  workspaceMembers,
  workspaceSeries,
} from './mockStudioData';

export const MOCK_STUDIO_PACKAGE_PRICE_VND = 199_000;
/** Đơn nạp VietQR mẫu tự được duyệt sau ngần này mili giây (giả lập Publisher duyệt). */
const TOPUP_APPROVE_AFTER_MS = 6_000;
const LATENCY_MS = 280;

type Handler = (ctx: {
  match: RegExpMatchArray;
  params: Record<string, any>;
  body: any;
  config: InternalAxiosRequestConfig;
}) => { status?: number; data?: unknown } | undefined;

interface Route {
  method: string;
  pattern: RegExp;
  handler: Handler;
}

const routes: Route[] = [];
const on = (method: string, pattern: RegExp, handler: Handler) =>
  routes.push({ method, pattern, handler });

const fail = (status: number, message: string, code?: string) => ({
  status,
  data: { message, code },
});

const now = () => Date.now();
const orderCode = (prefix: string) =>
  `PF-${prefix}-${Math.floor(now() / 1000)
    .toString(36)
    .toUpperCase()}`;

function pushTransaction(title: string, amountVnd: number, code?: string) {
  const s = getMockState();
  s.balanceVnd += amountVnd;
  s.transactions.unshift({
    id: `mock-tx-${now()}`,
    title,
    amountVnd,
    createdAt: new Date().toISOString(),
    balanceAfter: s.balanceVnd,
    orderCode: code,
  });
}

function requireSignedIn() {
  return getMockState().signedIn ? undefined : fail(401, 'Bạn cần đăng nhập.');
}

function mockUser() {
  const s = getMockState();
  return {
    id: 'mock-reader-1',
    email: s.email,
    fullName: s.userName,
    role: 'USER',
    canCreateStudio: s.canCreateStudio,
    twoFactorEnabled: false,
    avatarUrl: null,
  };
}

// ─── Catalog (BR-23, BR-24, BR-32, BR-33, BR-34) ─────────────────────────────────────────────

on('get', /^\/catalog\/series$/, ({ params }) => ({ data: listSeries(params) }));

on('get', /^\/catalog\/series\/([^/]+)$/, ({ match, params }) => {
  const data = seriesDetail(match[1], params.lang);
  return data ? { data } : fail(404, 'Không tìm thấy truyện.');
});

on('get', /^\/catalog\/chapters\/([^/]+)$/, ({ match, params }) => {
  const data = readChapter(match[1], params.lang);
  return data ? { data } : fail(404, 'Không tìm thấy chương.');
});

on('post', /^\/catalog\/chapters\/([^/]+)\/views$/, () => ({ status: 204 }));

on('get', /^\/catalog\/studio-package$/, () => ({
  data: { isOnSale: true, priceVnd: MOCK_STUDIO_PACKAGE_PRICE_VND },
}));

// ─── Ví (BR-33, D11) ────────────────────────────────────────────────────────────────────────

function settleTopups() {
  const s = getMockState();
  const due = s.pendingTopups.filter((t) => now() - t.createdAt >= TOPUP_APPROVE_AFTER_MS);
  if (due.length === 0) return;
  s.pendingTopups = s.pendingTopups.filter((t) => !due.includes(t));
  due.forEach((t) => pushTransaction('Nạp Ví qua VietQR', t.amountVnd, t.orderCode));
  saveMockState();
}

on('get', /^\/wallet\/me$/, () => {
  const denied = requireSignedIn();
  if (denied) return denied;
  settleTopups();
  const s = getMockState();
  return {
    data: {
      balanceVnd: s.balanceVnd,
      unlockedChapterIds: s.unlockedEditions.map((k) => k.split('::')[0]),
      transactions: s.transactions,
    },
  };
});

on('post', /^\/wallet\/topup$/, ({ body }) => {
  const denied = requireSignedIn();
  if (denied) return denied;
  const amountVnd = Number(body?.amountVnd);
  if (!Number.isInteger(amountVnd) || amountVnd < 1_000) {
    return fail(400, 'Số tiền nạp không hợp lệ.');
  }
  const code = orderCode('TOPUP');
  getMockState().pendingTopups.push({ orderCode: code, amountVnd, createdAt: now() });
  saveMockState();
  const addInfo = encodeURIComponent(code);
  return {
    data: {
      orderId: code,
      amountVnd,
      // Ảnh QR mẫu (tài khoản giả, không chuyển tiền được).
      qrCodeUrl: `https://img.vietqr.io/image/970422-0000000000-compact2.png?amount=${amountVnd}&addInfo=${addInfo}&accountName=PANELFORGE%20DEMO`,
      bankName: 'MB Bank (mẫu)',
      accountNumber: '0000000000',
      accountName: 'PANELFORGE DEMO',
      transferContent: code,
      isCompleted: false,
      status: 'Pending',
    },
  };
});

on('get', /^\/wallet\/transactions\/([^/]+)\/status$/, ({ match }) => {
  const code = decodeURIComponent(match[1]);
  settleTopups();
  const s = getMockState();
  const pending = s.pendingTopups.find((t) => t.orderCode === code);
  const done = s.transactions.find((t) => t.orderCode === code);
  if (!pending && !done) return fail(404, 'Không tìm thấy đơn.');
  return {
    data: {
      orderCode: code,
      status: pending ? 'Pending' : 'Approved',
      isCompleted: !pending,
      amountVnd: pending?.amountVnd ?? done?.amountVnd ?? 0,
      confirmedAt: pending ? null : done?.createdAt,
    },
  };
});

on('post', /^\/wallet\/unlock-chapter$/, ({ body }) => {
  const denied = requireSignedIn();
  if (denied) return denied;
  const { chapterId, language, expectedPriceVnd } = body ?? {};
  const price = chapterPriceOf(chapterId);
  if (price === undefined || !chapterHasLanguage(chapterId, language)) {
    return fail(404, 'Ấn bản chưa phát hành.');
  }
  if (price !== expectedPriceVnd) return fail(409, 'Giá đã thay đổi.', 'PRICE_CHANGED');
  const s = getMockState();
  const key = editionKey(chapterId, language);
  if (!s.unlockedEditions.includes(key)) {
    if (s.balanceVnd < price) return fail(400, 'Số dư Ví không đủ.', 'INSUFFICIENT_BALANCE');
    s.unlockedEditions.push(key);
    pushTransaction(`Mở khóa ${chapterLabel(chapterId, language)}`, -price);
    saveMockState();
  }
  return {
    data: { chapterId, success: true, remainingBalanceVnd: s.balanceVnd },
  };
});

on('post', /^\/wallet\/studio-package$/, ({ body }) => {
  const denied = requireSignedIn();
  if (denied) return denied;
  const s = getMockState();
  if (s.canCreateStudio) return fail(409, 'Bạn đã có quyền tạo Studio.', 'ALREADY_OWNED');
  if (body?.expectedPriceVnd !== MOCK_STUDIO_PACKAGE_PRICE_VND) {
    return fail(409, 'Giá gói đã thay đổi.', 'PRICE_CHANGED');
  }
  if (s.balanceVnd < MOCK_STUDIO_PACKAGE_PRICE_VND) {
    return fail(400, 'Số dư Ví không đủ.', 'INSUFFICIENT_BALANCE');
  }
  const code = orderCode('STUDIO');
  pushTransaction('Mua gói mở Studio', -MOCK_STUDIO_PACKAGE_PRICE_VND, code);
  s.canCreateStudio = true;
  // D12: gói kèm kho đủ cho một Studio theo hạn mức mặc định
  s.pool = { storageBytes: MOCK_DEFAULT_STORAGE, tokens: MOCK_DEFAULT_TOKENS };
  saveMockState();
  return {
    data: {
      priceVnd: MOCK_STUDIO_PACKAGE_PRICE_VND,
      remainingBalanceVnd: s.balanceVnd,
      orderCode: code,
      canCreateStudio: true,
    },
  };
});

// ─── Thư viện cá nhân ─────────────────────────────────────────────────────────────────────

on('get', /^\/users\/me\/library$/i, () => requireSignedIn() ?? { data: getMockState().library });

on('put', /^\/users\/me\/library\/history$/i, ({ body }) => {
  const lib = getMockState().library;
  lib.history = [body, ...lib.history.filter((h) => h.seriesId !== body?.seriesId)].slice(0, 30);
  saveMockState();
  return { status: 204 };
});

const LIST_KEYS = {
  'read-later': 'readLater',
  following: 'following',
  favorites: 'favorites',
} as const;

const setLibraryEntry: Handler = ({ match, config }) => {
  const denied = requireSignedIn();
  if (denied) return denied;
  const list = LIST_KEYS[match[1] as keyof typeof LIST_KEYS];
  const id = match[2];
  const add = config.method === 'put';
  const lib = getMockState().library;
  if (list === 'following') {
    lib.following = lib.following.filter((f) => f.seriesId !== id);
    if (add) lib.following.unshift({ seriesId: id, lastSeenAt: new Date().toISOString() });
  } else {
    lib[list] = lib[list].filter((x) => x !== id);
    if (add) lib[list].unshift(id);
  }
  saveMockState();
  return { status: 204 };
};
on('put', /^\/users\/me\/library\/(read-later|following|favorites)\/([^/]+)$/i, setLibraryEntry);
on('delete', /^\/users\/me\/library\/(read-later|following|favorites)\/([^/]+)$/i, setLibraryEntry);

// ─── Tài khoản độc giả mẫu ───────────────────────────────────────────────────────────────

on('post', /^\/Auth\/login$/i, ({ body }) => {
  const s = getMockState();
  s.signedIn = true;
  if (typeof body?.email === 'string' && body.email.includes('@')) s.email = body.email.trim();
  saveMockState();
  return { data: { token: 'readermock-token', user: mockUser() } };
});

on('post', /^\/Auth\/logout$/i, () => {
  getMockState().signedIn = false;
  saveMockState();
  return { status: 204 };
});

on('get', /^\/Auth\/me$/i, () => requireSignedIn() ?? { data: mockUser() });

on('get', /^\/Auth\/me\/landing-context$/i, () => {
  const denied = requireSignedIn();
  if (denied) return denied;
  const s = getMockState();
  const workspaces = [
    ...s.ownedStudios.map((o) => ({ workspaceId: o.id, name: o.name, role: 'PRODUCER' })),
    ...s.joinedWorkspaces,
  ];
  const studio = workspaces.length > 0;
  return {
    data: {
      userId: 'mock-reader-1',
      systemRole: 'USER',
      canCreateStudio: s.canCreateStudio,
      workspaces,
      suggestedLanding: studio
        ? 'YourWorkspaces'
        : s.canCreateStudio
          ? 'StudioCreation'
          : 'PublicCatalog',
    },
  };
});

on('get', /^\/Users\/me$/i, () => {
  const denied = requireSignedIn();
  if (denied) return denied;
  const s = getMockState();
  return {
    data: {
      id: 'mock-reader-1',
      username: s.userName,
      email: s.email,
      avatar: null,
      isActive: true,
      role: 'USER',
      createdAt: new Date(now() - 40 * 86_400_000).toISOString(),
      preferredReadingLanguage: 'vi',
    },
  };
});

on('put', /^\/Users\/me\/reading-language$/i, ({ body }) => ({
  data: { preferredReadingLanguage: body?.languageCode ?? null },
}));

// ─── Lời mời vào Studio ──────────────────────────────────────────────────────────────────

on('get', /^\/Workspaces\/pending-invitations$/i, () =>
  getMockState().signedIn ? { data: getMockState().invitations } : { data: [] },
);

on('post', /^\/Workspaces\/([^/]+)\/(accept|reject)-invitation$/i, ({ match }) => {
  const s = getMockState();
  const inv = s.invitations.find((i) => i.workspaceId === match[1]);
  if (!inv) return fail(404, 'Lời mời không còn hiệu lực.');
  s.invitations = s.invitations.filter((i) => i !== inv);
  if (match[2] === 'accept') {
    s.joinedWorkspaces.push({
      workspaceId: inv.workspaceId,
      name: inv.workspaceName,
      role: inv.role,
    });
  }
  saveMockState();
  return match[2] === 'accept'
    ? { data: { workspaceId: inv.workspaceId, role: inv.role, status: 'Active' } }
    : { status: 204 };
});

// ─── Thông báo ───────────────────────────────────────────────────────────────────────────

function mockNotifications(): NotificationDto[] {
  const read = new Set(getMockState().readNotificationIds);
  const items: Omit<NotificationDto, 'readAt'>[] = [
    {
      id: 'mock-n-1',
      type: 'ChapterPublished',
      title: 'Kiếm Sĩ Bóng Đêm có chương mới',
      message: 'Chương 24 "Đêm trắng" vừa phát hành. Đọc ngay trước khi bị spoil!',
      createdAt: new Date(now() - 40 * 60_000).toISOString(),
    },
    {
      id: 'mock-n-2',
      type: 'ChapterPublished',
      title: 'Hoa Phượng Mùa Hạ cập nhật',
      message: 'Truyện bạn theo dõi vừa ra chương 30.',
      createdAt: new Date(now() - 5 * 3_600_000).toISOString(),
    },
    {
      id: 'mock-n-3',
      type: 'ChapterPublished',
      title: 'Nạp Ví thành công',
      message: 'Ví của bạn đã được cộng 30.000 ₫.',
      createdAt: new Date(now() - 6 * 86_400_000).toISOString(),
    },
  ];
  return items.map((n) => ({ ...n, readAt: read.has(n.id) ? n.createdAt : null }));
}

on('get', /^\/notifications$/i, ({ params }) => {
  if (!getMockState().signedIn) return fail(401, 'Bạn cần đăng nhập.');
  const all = mockNotifications();
  const items = params.unreadOnly ? all.filter((n) => !n.readAt) : all;
  return {
    data: {
      items,
      totalCount: items.length,
      unreadCount: all.filter((n) => !n.readAt).length,
      pageIndex: 1,
      pageSize: 20,
    },
  };
});

on('post', /^\/notifications\/read-all$/i, () => {
  const s = getMockState();
  s.readNotificationIds = mockNotifications().map((n) => n.id);
  saveMockState();
  return { data: { marked: s.readNotificationIds.length } };
});

on('post', /^\/notifications\/([^/]+)\/read$/i, ({ match }) => {
  const s = getMockState();
  if (!s.readNotificationIds.includes(match[1])) s.readNotificationIds.push(match[1]);
  saveMockState();
  return { data: { marked: 1 } };
});

// ─── Khu Studio tối thiểu cho thành viên vừa nhận lời mời ────────────────────────────────

on('get', /^\/Workspaces$/i, () => requireSignedIn() ?? { data: joinedWorkspaceDtos() });

on('get', /^\/Workspaces\/(mock-ws-[^/]+)$/i, ({ match }) => {
  const studio = findStudio(match[1]);
  const joined =
    isOwnedStudio(match[1]) ||
    getMockState().joinedWorkspaces.some((w) => w.workspaceId === match[1]);
  if (!studio) return fail(404, 'Không tìm thấy Studio.');
  return joined ? { data: toWorkspaceDto(studio) } : fail(403, 'Bạn không thuộc Studio này.');
});

on('get', /^\/workspaces\/(mock-ws-[^/]+)\/my-assignments$/i, ({ match }) => ({
  data: myAssignments(match[1]),
}));

on('get', /^\/Workspaces\/(mock-ws-[^/]+)\/members$/i, ({ match }) => ({
  data: workspaceMembers(match[1]),
}));

on('get', /^\/workspaces\/(mock-ws-[^/]+)\/series$/i, ({ match }) => ({
  data: workspaceSeries(match[1]),
}));

on('get', /^\/series\/(mock-series-[^/]+)$/i, ({ match }) => {
  const data = seriesDetailForStudio(match[1]);
  return data ? { data } : fail(404, 'Không tìm thấy bộ truyện.');
});

on('get', /^\/series\/(mock-series-[^/]+)\/pipeline$/i, ({ match }) => {
  const data = seriesPipeline(match[1]);
  return data ? { data } : fail(404, 'Không tìm thấy pipeline.');
});

on('get', /^\/series\/(mock-series-[^/]+)\/chapters$/i, ({ match }) => ({
  data: seriesChapters(match[1]),
}));

on('get', /^\/series\/(mock-series-[^/]+)\/bible\/design-queue$/i, () => ({ data: [] }));

on('get', /^\/workspaces\/(mock-ws-[^/]+)\/my-task-lots$/i, ({ match, params }) => ({
  data: myTaskLots(match[1], params.seriesId),
}));

// Bàn làm việc chưa có bài nộp / yêu cầu sửa / khung tranh: trả danh sách rỗng để màn hình hiện trạng thái trống.
on('get', /^\/chapters\/mock-chapter-[^/]+\/assignments\/[^/]+\/submissions$/i, () => ({
  data: [],
}));
on('get', /^\/chapters\/mock-chapter-[^/]+\/change-requests$/i, () => ({ data: [] }));
on('get', /^\/pages\/mock-chapter-[^/]+\/panels$/i, () => ({ data: [] }));
on('get', /^\/chapters\/mock-chapter-[^/]+\/pages\/[^/]+\/artwork$/i, () =>
  fail(404, 'Chưa có bản vẽ.'),
);

on('get', /^\/me\/work$/i, () => requireSignedIn() ?? { data: myWork() });

on('get', /^\/pipeline-templates$/i, () => ({ data: [] }));

// ─── D12: kho tài nguyên Producer, tạo Studio của mình, mua thêm ────────────────────────

const GB = 1024 ** 3;
const MOCK_DEFAULT_STORAGE = 5 * GB;
const MOCK_DEFAULT_TOKENS = 1_000_000;
const MOCK_PRICE_PER_GB = 20_000;
const MOCK_PRICE_PER_MILLION_TOKENS = 50_000;

function resourcesDto() {
  const s = getMockState();
  const studios = s.ownedStudios.map((o) => ({
    workspaceId: o.id,
    name: o.name,
    storageQuotaBytes: o.storageQuotaBytes,
    usedStorageBytes: o.usedStorageBytes,
    tokenQuota: o.tokenQuota,
    usedTokens: o.usedTokens,
  }));
  const budget = (total: number, allocated: number) => ({
    total,
    allocated,
    remaining: Math.max(0, total - allocated),
  });
  return {
    hasPool: !!s.pool,
    storage: s.pool
      ? budget(
          s.pool.storageBytes,
          studios.reduce((n, x) => n + x.storageQuotaBytes, 0),
        )
      : null,
    tokens: s.pool
      ? budget(
          s.pool.tokens,
          studios.reduce((n, x) => n + x.tokenQuota, 0),
        )
      : null,
    studios,
    suggestedStorageBytes: MOCK_DEFAULT_STORAGE,
    suggestedTokens: MOCK_DEFAULT_TOKENS,
    pricePerGbVnd: MOCK_PRICE_PER_GB,
    pricePerMillionTokensVnd: MOCK_PRICE_PER_MILLION_TOKENS,
  };
}

const formatGb = (bytes: number) =>
  `${(bytes / GB).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} GB`;

on('get', /^\/workspaces\/resources$/i, () => requireSignedIn() ?? { data: resourcesDto() });

on('post', /^\/Workspaces$/i, ({ body }) => {
  const denied = requireSignedIn();
  if (denied) return denied;
  const s = getMockState();
  if (!s.canCreateStudio) return fail(401, 'Bạn chưa có quyền tạo Studio.', 'UNAUTHORIZED');
  const name = String(body?.name ?? '').trim();
  if (!name) return fail(400, 'Tên Workspace là bắt buộc.');
  const storage = Number(body?.storageQuotaBytes ?? MOCK_DEFAULT_STORAGE);
  const tokens = Number(body?.tokenQuota ?? MOCK_DEFAULT_TOKENS);
  const res = resourcesDto();
  if (
    res.storage &&
    res.tokens &&
    (storage > res.storage.remaining || tokens > res.tokens.remaining)
  ) {
    return fail(
      409,
      `Kho tài nguyên không đủ để tạo Studio: còn ${formatGb(res.storage.remaining)} và ${res.tokens.remaining.toLocaleString('vi-VN')} token. Giảm phần chia, thu bớt từ Studio khác hoặc mua thêm.`,
      'INSUFFICIENT_STUDIO_RESOURCES',
    );
  }
  const owned = {
    id: `mock-ws-own-${now().toString(36)}`,
    name,
    storageQuotaBytes: storage,
    usedStorageBytes: 0,
    tokenQuota: tokens,
    usedTokens: 0,
    createdAt: new Date().toISOString(),
  };
  s.ownedStudios.push(owned);
  saveMockState();
  return { status: 201, data: toWorkspaceDto(findStudio(owned.id)!) };
});

on('put', /^\/workspaces\/([^/]+)\/resources$/i, ({ match, body }) => {
  const denied = requireSignedIn();
  if (denied) return denied;
  const s = getMockState();
  const studio = s.ownedStudios.find((o) => o.id === match[1]);
  if (!studio)
    return fail(403, 'Chỉ chủ Studio mới chia được tài nguyên cho Studio này.', 'FORBIDDEN');
  if (!s.pool) return fail(400, 'Bạn chưa có kho tài nguyên.');
  const storage = Number(body?.storageQuotaBytes);
  const tokens = Number(body?.tokenQuota);
  if (!(storage > 0) || !(tokens > 0)) return fail(400, 'Dung lượng và token phải lớn hơn 0.');
  if (storage < studio.usedStorageBytes || tokens < studio.usedTokens) {
    return fail(400, 'Không chia thấp hơn phần Studio đã dùng.');
  }
  const others = s.ownedStudios.filter((o) => o.id !== studio.id);
  const storageLeft = s.pool.storageBytes - others.reduce((n, o) => n + o.storageQuotaBytes, 0);
  const tokensLeft = s.pool.tokens - others.reduce((n, o) => n + o.tokenQuota, 0);
  if (storage > storageLeft || tokens > tokensLeft) {
    return fail(
      409,
      `Kho không đủ: chia tối đa ${formatGb(Math.max(0, storageLeft))} và ${Math.max(0, tokensLeft).toLocaleString('vi-VN')} token cho Studio này.`,
      'INSUFFICIENT_STUDIO_RESOURCES',
    );
  }
  studio.storageQuotaBytes = storage;
  studio.tokenQuota = tokens;
  saveMockState();
  return { data: resourcesDto() };
});

on('post', /^\/wallet\/studio-resources$/i, ({ body }) => {
  const denied = requireSignedIn();
  if (denied) return denied;
  const s = getMockState();
  if (!s.canCreateStudio) return fail(403, 'Cần mua gói Mở Studio trước.', 'FORBIDDEN');
  const gb = Number(body?.storageGb ?? 0);
  const millions = Number(body?.tokenMillions ?? 0);
  if (gb < 0 || millions < 0 || gb + millions === 0)
    return fail(400, 'Chọn số GB hoặc số triệu token cần mua.');
  const total = gb * MOCK_PRICE_PER_GB + millions * MOCK_PRICE_PER_MILLION_TOKENS;
  if (body?.expectedTotalVnd !== total) return fail(409, 'Giá đã thay đổi.', 'PRICE_CHANGED');
  if (s.balanceVnd < total) return fail(400, 'Số dư Ví không đủ.', 'INSUFFICIENT_BALANCE');
  const code = orderCode('RES');
  pushTransaction('Mua thêm tài nguyên Studio', -total, code);
  s.pool ??= { storageBytes: 0, tokens: 0 };
  s.pool.storageBytes += gb * GB;
  s.pool.tokens += millions * 1_000_000;
  saveMockState();
  return {
    data: {
      totalVnd: total,
      remainingBalanceVnd: s.balanceVnd,
      orderCode: code,
      resources: resourcesDto(),
    },
  };
});

// ─── Cài adapter ─────────────────────────────────────────────────────────────────────────

function pathOf(config: InternalAxiosRequestConfig): string {
  const raw = config.url ?? '';
  const path = /^https?:\/\//i.test(raw) ? new URL(raw).pathname : raw.split('?')[0];
  return ('/' + path.replace(/^\/+/, '')).replace(/^\/api\//i, '/');
}

function parseBody(data: unknown) {
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

export function installReaderMockAdapter(client: AxiosInstance): void {
  const realAdapter = axios.getAdapter(client.defaults.adapter);
  const mockAdapter: AxiosAdapter = async (config) => {
    const method = (config.method ?? 'get').toLowerCase();
    const path = pathOf(config);
    for (const route of routes) {
      if (route.method !== method) continue;
      const match = path.match(route.pattern);
      if (!match) continue;
      const result = route.handler({
        match,
        params: config.params ?? {},
        body: parseBody(config.data),
        config: { ...config, method },
      });
      if (!result) break;
      await new Promise((r) => setTimeout(r, LATENCY_MS));
      const status = result.status ?? 200;
      const response: AxiosResponse = {
        data: result.data ?? '',
        status,
        statusText: String(status),
        headers: {},
        config,
        request: {},
      };
      if (status >= 400) {
        throw new AxiosError(
          (result.data as { message?: string })?.message ?? 'Mock error',
          String(status),
          config,
          {},
          response,
        );
      }
      return response;
    }
    return realAdapter(config);
  };
  client.defaults.adapter = mockAdapter;
}
