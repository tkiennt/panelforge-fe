// Kho dữ liệu mẫu cho khu độc giả (chỉ dùng khi bật chế độ dữ liệu mẫu, xem ./config.ts).
// Dữ liệu là nội dung truyện (giống dữ liệu từ BE), nên không đi qua i18n.
import type {
  PublicChapterDto,
  PublicChapterLanguageDto,
  PublicChapterReadDto,
  PublicSeriesDetailDto,
  PublicSeriesDto,
} from '@/services/catalog.service';
import type { ReaderLibraryDto } from '@/services/readerLibrary.service';
import type { WalletTransactionDto } from '@/services/wallet.service';
import { makeChapterCover, makePage, makeSeriesCover, type ArtPalette } from './mockArt';

type Direction = PublicSeriesDto['readingDirection'];

interface SeriesSeed {
  key: string;
  title: string;
  synopsis: string;
  genre: string;
  format: 'Manga' | 'Webtoon' | 'Comic';
  studio: string;
  chapters: number;
  /** Chương từ số này trở đi trả phí (0 = miễn phí toàn bộ). */
  paidFrom: number;
  priceVnd: number;
  /** Có ấn bản tiếng Anh cho N chương đầu. */
  englishChapters: number;
  completed: boolean;
  /** Số ngày trước khi chương mới nhất ra. */
  updatedDaysAgo: number;
  views: number;
  rating: number;
  palette: ArtPalette;
}

const SEEDS: SeriesSeed[] = [
  {
    key: 'kiem-si-bong-dem',
    title: 'Kiếm Sĩ Bóng Đêm',
    synopsis:
      'Một thiếu niên làng chài nhặt được thanh kiếm biết nói và bị cuốn vào cuộc chiến giữa các gia tộc kiếm sĩ cổ.',
    genre: 'Hành động',
    format: 'Manga',
    studio: 'Studio Mực Cam',
    chapters: 24,
    paidFrom: 6,
    priceVnd: 3000,
    englishChapters: 12,
    completed: false,
    updatedDaysAgo: 0,
    views: 182400,
    rating: 4.8,
    palette: { base: '#1e293b', accent: '#f97316', ink: '#0b0f19' },
  },
  {
    key: 'quan-ca-phe-cuoi-pho',
    title: 'Quán Cà Phê Cuối Phố',
    synopsis:
      'Mỗi vị khách ghé quán mang theo một câu chuyện. Cô chủ quán trẻ lắng nghe và pha cho họ đúng ly cà phê họ cần.',
    genre: 'Đời thường',
    format: 'Webtoon',
    studio: 'Nhà Giấy Ấm',
    chapters: 18,
    paidFrom: 0,
    priceVnd: 0,
    englishChapters: 18,
    completed: false,
    updatedDaysAgo: 1,
    views: 96500,
    rating: 4.6,
    palette: { base: '#a16207', accent: '#fde68a', ink: '#422006' },
  },
  {
    key: 'tinh-van-so-7',
    title: 'Tinh Vân Số 7',
    synopsis:
      'Phi hành đoàn tàu Lạc Hồng tỉnh dậy sau 300 năm ngủ đông và phát hiện Trái Đất đã im lặng.',
    genre: 'Khoa học viễn tưởng',
    format: 'Comic',
    studio: 'Xưởng Vẽ Sao Băng',
    chapters: 12,
    paidFrom: 4,
    priceVnd: 5000,
    englishChapters: 12,
    completed: true,
    updatedDaysAgo: 9,
    views: 74300,
    rating: 4.7,
    palette: { base: '#312e81', accent: '#22d3ee', ink: '#020617' },
  },
  {
    key: 'hoa-phuong-mua-ha',
    title: 'Hoa Phượng Mùa Hạ',
    synopsis: 'Năm cuối cấp, lời hẹn dưới gốc phượng và một bức thư chưa bao giờ được gửi đi.',
    genre: 'Lãng mạn',
    format: 'Webtoon',
    studio: 'Nhà Giấy Ấm',
    chapters: 30,
    paidFrom: 10,
    priceVnd: 2000,
    englishChapters: 0,
    completed: false,
    updatedDaysAgo: 0,
    views: 210900,
    rating: 4.9,
    palette: { base: '#be123c', accent: '#fecdd3', ink: '#4c0519' },
  },
  {
    key: 'tham-tu-pho-co',
    title: 'Thám Tử Phố Cổ',
    synopsis: 'Những vụ án kỳ lạ quanh 36 phố phường, và một thám tử chỉ phá án bằng tai nghe.',
    genre: 'Trinh thám',
    format: 'Manga',
    studio: 'Studio Mực Cam',
    chapters: 16,
    paidFrom: 5,
    priceVnd: 3000,
    englishChapters: 8,
    completed: false,
    updatedDaysAgo: 2,
    views: 88100,
    rating: 4.5,
    palette: { base: '#3f3f46', accent: '#facc15', ink: '#09090b' },
  },
  {
    key: 'rong-than-ho-tay',
    title: 'Rồng Thần Hồ Tây',
    synopsis: 'Truyền thuyết sống lại khi một cô bé bán hoa phát hiện quả trứng rồng dưới đáy hồ.',
    genre: 'Kỳ ảo',
    format: 'Manga',
    studio: 'Xưởng Vẽ Sao Băng',
    chapters: 20,
    paidFrom: 8,
    priceVnd: 4000,
    englishChapters: 20,
    completed: false,
    updatedDaysAgo: 3,
    views: 133700,
    rating: 4.7,
    palette: { base: '#065f46', accent: '#a7f3d0', ink: '#022c22' },
  },
  {
    key: 'vo-duong-thanh-xuan',
    title: 'Võ Đường Thanh Xuân',
    synopsis: 'Câu lạc bộ võ sắp giải tán, năm thành viên lập lời thề giành cúp toàn quốc.',
    genre: 'Thể thao',
    format: 'Manga',
    studio: 'Studio Mực Cam',
    chapters: 14,
    paidFrom: 0,
    priceVnd: 0,
    englishChapters: 6,
    completed: false,
    updatedDaysAgo: 5,
    views: 41200,
    rating: 4.3,
    palette: { base: '#c2410c', accent: '#fef3c7', ink: '#431407' },
  },
  {
    key: 'nha-hang-ma',
    title: 'Nhà Hàng Ma',
    synopsis:
      'Đầu bếp trẻ nhận việc ở nhà hàng chỉ mở cửa lúc nửa đêm. Thực khách... không phải người.',
    genre: 'Kinh dị',
    format: 'Webtoon',
    studio: 'Bóng Tối Comics',
    chapters: 22,
    paidFrom: 7,
    priceVnd: 3000,
    englishChapters: 10,
    completed: false,
    updatedDaysAgo: 1,
    views: 120500,
    rating: 4.6,
    palette: { base: '#18181b', accent: '#dc2626', ink: '#000000' },
  },
  {
    key: 'meo-hoang-tu',
    title: 'Mèo Hoàng Tử',
    synopsis: 'Hoàng tử bị nguyền hoá thành mèo và phải sống nhờ nhà một cô sinh viên đãng trí.',
    genre: 'Hài hước',
    format: 'Comic',
    studio: 'Nhà Giấy Ấm',
    chapters: 10,
    paidFrom: 0,
    priceVnd: 0,
    englishChapters: 10,
    completed: true,
    updatedDaysAgo: 20,
    views: 56000,
    rating: 4.4,
    palette: { base: '#7c3aed', accent: '#fde047', ink: '#2e1065' },
  },
  {
    key: 'thanh-pho-khong-ngu',
    title: 'Thành Phố Không Ngủ',
    synopsis:
      'Năm 2099, Sài Gòn là siêu đô thị neon. Một shipper vô tình giao nhầm món hàng bị cấm.',
    genre: 'Khoa học viễn tưởng',
    format: 'Webtoon',
    studio: 'Bóng Tối Comics',
    chapters: 26,
    paidFrom: 6,
    priceVnd: 4000,
    englishChapters: 14,
    completed: false,
    updatedDaysAgo: 0,
    views: 158300,
    rating: 4.8,
    palette: { base: '#0e7490', accent: '#f0abfc', ink: '#083344' },
  },
  {
    key: 'ban-tay-vang',
    title: 'Bàn Tay Vàng Làng Gốm',
    synopsis: 'Cậu bé làng Bát Tràng muốn nặn chiếc bình hoàn hảo để cứu lò gốm của gia đình.',
    genre: 'Đời thường',
    format: 'Comic',
    studio: 'Xưởng Vẽ Sao Băng',
    chapters: 8,
    paidFrom: 3,
    priceVnd: 2000,
    englishChapters: 0,
    completed: false,
    updatedDaysAgo: 6,
    views: 18400,
    rating: 4.2,
    palette: { base: '#92400e', accent: '#bae6fd', ink: '#451a03' },
  },
  {
    key: 'nu-hoang-bang-gia',
    title: 'Nữ Hoàng Băng Giá',
    synopsis: 'Công chúa phương Bắc kế vị ngai vàng giữa mùa đông vĩnh cửu và âm mưu trong triều.',
    genre: 'Kỳ ảo',
    format: 'Manga',
    studio: 'Bóng Tối Comics',
    chapters: 28,
    paidFrom: 9,
    priceVnd: 3000,
    englishChapters: 28,
    completed: false,
    updatedDaysAgo: 4,
    views: 99800,
    rating: 4.6,
    palette: { base: '#1d4ed8', accent: '#e0f2fe', ink: '#172554' },
  },
];

const DAY = 86_400_000;
const pagesPerChapter = (seed: SeriesSeed) => (seed.format === 'Webtoon' ? 6 : 8);
const directionOf = (seed: SeriesSeed): Direction =>
  seed.format === 'Manga' ? 'RightToLeft' : seed.format === 'Webtoon' ? 'Vertical' : 'LeftToRight';
const FREE_PREVIEW_PAGES = 2;

export const seriesId = (seed: SeriesSeed) => `mock-series-${seed.key}`;
export const chapterId = (seed: SeriesSeed, n: number) => `mock-chapter-${seed.key}-${n}`;

const coverCache = new Map<string, string>();
const seriesCover = (seed: SeriesSeed) => {
  let c = coverCache.get(seed.key);
  if (!c) {
    c = makeSeriesCover(seed.key, seed.title, seed.palette);
    coverCache.set(seed.key, c);
  }
  return c;
};

function chapterPublishedAt(seed: SeriesSeed, n: number, now: number): string {
  // Chương mới nhất ra cách đây `updatedDaysAgo` ngày, mỗi chương trước đó cách nhau 7 ngày.
  const offsetDays = seed.updatedDaysAgo + (seed.chapters - n) * 7;
  return new Date(now - offsetDays * DAY - n * 3_600_000).toISOString();
}

function chapterPrice(seed: SeriesSeed, n: number): number {
  return seed.paidFrom > 0 && n >= seed.paidFrom ? seed.priceVnd : 0;
}

function chapterLanguages(seed: SeriesSeed, n: number, unlocked: Set<string>) {
  const langs = ['vi', ...(n <= seed.englishChapters ? ['en'] : [])];
  return langs.map<PublicChapterLanguageDto>((language) => {
    const priceVnd = chapterPrice(seed, n);
    return {
      language,
      priceVnd,
      isUnlocked: priceVnd === 0 || unlocked.has(editionKey(chapterId(seed, n), language)),
    };
  });
}

export const editionKey = (chapter: string, language: string) => `${chapter}::${language}`;

// ─── Trạng thái độc giả mẫu (lưu localStorage để tải lại trang không mất) ───────────────────────

export interface MockInvitation {
  workspaceId: string;
  workspaceName: string;
  ownerName: string;
  ownerEmail: string;
  role: string;
  invitedAt: string;
}

export interface MockState {
  signedIn: boolean;
  userName: string;
  email: string;
  balanceVnd: number;
  unlockedEditions: string[];
  transactions: WalletTransactionDto[];
  pendingTopups: { orderCode: string; amountVnd: number; createdAt: number }[];
  library: ReaderLibraryDto;
  canCreateStudio: boolean;
  invitations: MockInvitation[];
  joinedWorkspaces: { workspaceId: string; name: string; role: string }[];
  readNotificationIds: string[];
}

const STATE_KEY = 'pf_reader_mock_state';

function initialState(): MockState {
  const now = Date.now();
  const first = SEEDS[0];
  return {
    signedIn: false,
    userName: 'Độc giả mẫu',
    email: 'reader@panelforge.test',
    balanceVnd: 25_000,
    unlockedEditions: [editionKey(chapterId(first, first.paidFrom), 'vi')],
    transactions: [
      {
        id: 'mock-tx-1',
        title: 'Nạp Ví qua VietQR',
        amountVnd: 30_000,
        createdAt: new Date(now - 6 * DAY).toISOString(),
        balanceAfter: 30_000,
        orderCode: 'PF-TOPUP-1001',
      },
      {
        id: 'mock-tx-2',
        title: `Mở khóa ${first.title} – Chương ${first.paidFrom} (VI)`,
        amountVnd: -first.priceVnd,
        createdAt: new Date(now - 5 * DAY).toISOString(),
        balanceAfter: 27_000,
      },
      {
        id: 'mock-tx-3',
        title: 'Mở khóa Hoa Phượng Mùa Hạ – Chương 10 (VI)',
        amountVnd: -2_000,
        createdAt: new Date(now - 2 * DAY).toISOString(),
        balanceAfter: 25_000,
      },
    ],
    pendingTopups: [],
    library: {
      readLater: [seriesId(SEEDS[2]), seriesId(SEEDS[5])],
      following: [
        { seriesId: seriesId(SEEDS[0]), lastSeenAt: new Date(now - 3 * DAY).toISOString() },
        { seriesId: seriesId(SEEDS[3]), lastSeenAt: new Date(now - DAY).toISOString() },
      ],
      favorites: [seriesId(SEEDS[3]), seriesId(SEEDS[9])],
      history: [
        {
          seriesId: seriesId(SEEDS[0]),
          chapterId: chapterId(SEEDS[0], 5),
          chapterNumber: 5,
          lastPageNumber: 4,
          totalPages: pagesPerChapter(SEEDS[0]),
          language: 'vi',
          readAt: new Date(now - 3 * 3_600_000).toISOString(),
        },
        {
          seriesId: seriesId(SEEDS[1]),
          chapterId: chapterId(SEEDS[1], 2),
          chapterNumber: 2,
          lastPageNumber: 6,
          totalPages: pagesPerChapter(SEEDS[1]),
          language: 'vi',
          readAt: new Date(now - DAY).toISOString(),
        },
      ],
    },
    canCreateStudio: false,
    invitations: [
      {
        workspaceId: 'mock-ws-muc-cam',
        workspaceName: 'Studio Mực Cam',
        ownerName: 'Trần Minh Khang',
        ownerEmail: 'producer@mucam.test',
        role: 'ARTIST',
        invitedAt: new Date(now - 2 * 3_600_000).toISOString(),
      },
      {
        workspaceId: 'mock-ws-giay-am',
        workspaceName: 'Nhà Giấy Ấm',
        ownerName: 'Lê Thu Hà',
        ownerEmail: 'producer@giayam.test',
        role: 'WRITER',
        invitedAt: new Date(now - DAY).toISOString(),
      },
      {
        workspaceId: 'mock-ws-bong-toi',
        workspaceName: 'Bóng Tối Comics',
        ownerName: 'Phạm Quốc Bảo',
        ownerEmail: 'producer@bongtoi.test',
        role: 'EDITOR',
        invitedAt: new Date(now - 3 * DAY).toISOString(),
      },
    ],
    joinedWorkspaces: [],
    readNotificationIds: [],
  };
}

let state: MockState | null = null;

export function getMockState(): MockState {
  if (state) return state;
  try {
    const raw = localStorage.getItem(STATE_KEY);
    state = raw
      ? { ...initialState(), ...(JSON.parse(raw) as Partial<MockState>) }
      : initialState();
  } catch {
    state = initialState();
  }
  return state;
}

export function saveMockState(): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(getMockState()));
  } catch {
    // Bộ nhớ trình duyệt bị chặn: dữ liệu mẫu vẫn chạy trong phiên này.
  }
}

/** Đưa dữ liệu mẫu về như ban đầu (giữ trạng thái đăng nhập). */
export function resetMockState(): void {
  const signedIn = getMockState().signedIn;
  state = { ...initialState(), signedIn };
  saveMockState();
}

// ─── Dựng DTO đúng hợp đồng BE ────────────────────────────────────────────────────────────────

const unlockedSet = () => new Set(getMockState().unlockedEditions);

export function findSeed(id: string): SeriesSeed | undefined {
  return SEEDS.find((s) => seriesId(s) === id);
}

export function findChapter(id: string): { seed: SeriesSeed; number: number } | undefined {
  for (const seed of SEEDS) {
    const prefix = `mock-chapter-${seed.key}-`;
    if (id.startsWith(prefix)) {
      const number = Number(id.slice(prefix.length));
      if (number >= 1 && number <= seed.chapters) return { seed, number };
    }
  }
  return undefined;
}

export function chapterPriceOf(id: string): number | undefined {
  const hit = findChapter(id);
  return hit ? chapterPrice(hit.seed, hit.number) : undefined;
}

export function chapterHasLanguage(id: string, language: string): boolean {
  const hit = findChapter(id);
  if (!hit) return false;
  return language === 'vi' || (language === 'en' && hit.number <= hit.seed.englishChapters);
}

export function chapterLabel(id: string, language: string): string {
  const hit = findChapter(id);
  return hit
    ? `${hit.seed.title} – Chương ${hit.number} (${language.toUpperCase()})`
    : `Chương (${language.toUpperCase()})`;
}

function toSeriesDto(seed: SeriesSeed, now: number): PublicSeriesDto {
  const created = new Date(now - (seed.chapters * 7 + seed.updatedDaysAgo + 3) * DAY);
  return {
    id: seriesId(seed),
    title: seed.title,
    synopsis: seed.synopsis,
    genre: seed.genre,
    format: seed.format,
    readingDirection: directionOf(seed),
    studioName: seed.studio,
    publishedChapterCount: seed.chapters,
    latestPublishedAt: chapterPublishedAt(seed, seed.chapters, now),
    coverUrl: seriesCover(seed),
    isCompleted: seed.completed,
    createdAt: created.toISOString(),
    viewCount: seed.views,
    viewsLast1Day: Math.round(seed.views * (seed.updatedDaysAgo <= 1 ? 0.04 : 0.01)),
    viewsLast7Days: Math.round(seed.views * (seed.updatedDaysAgo <= 3 ? 0.18 : 0.07)),
    viewsLast30Days: Math.round(seed.views * 0.42),
  };
}

export function listSeries(params: {
  search?: string;
  genre?: string;
  pageIndex?: number;
  pageSize?: number;
}) {
  const now = Date.now();
  const q = (params.search ?? '').trim().toLocaleLowerCase('vi');
  const filtered = SEEDS.filter(
    (s) =>
      (!q ||
        s.title.toLocaleLowerCase('vi').includes(q) ||
        s.studio.toLocaleLowerCase('vi').includes(q)) &&
      (!params.genre || s.genre === params.genre),
  );
  const pageSize = Math.max(1, params.pageSize ?? 20);
  const pageIndex = Math.max(1, params.pageIndex ?? 1);
  const items = filtered
    .slice((pageIndex - 1) * pageSize, pageIndex * pageSize)
    .map((s) => toSeriesDto(s, now));
  return {
    items,
    totalCount: filtered.length,
    pageIndex,
    pageSize,
    totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
  };
}

export function seriesDetail(id: string, lang?: string): PublicSeriesDetailDto | undefined {
  const seed = findSeed(id);
  if (!seed) return undefined;
  const now = Date.now();
  const unlocked = unlockedSet();
  const chapters: PublicChapterDto[] = [];
  for (let n = seed.chapters; n >= 1; n--) {
    if (lang === 'en' && n > seed.englishChapters) continue;
    const priceVnd = chapterPrice(seed, n);
    const languages = chapterLanguages(seed, n, unlocked);
    const current = languages.find((l) => l.language === (lang ?? 'vi')) ?? languages[0];
    chapters.push({
      id: chapterId(seed, n),
      chapterNumber: n,
      title: CHAPTER_TITLES[(n + seed.key.length) % CHAPTER_TITLES.length],
      publishedAt: chapterPublishedAt(seed, n, now),
      coverUrl: makeChapterCover(seed.key, n, seed.palette),
      priceVnd,
      isFree: priceVnd === 0,
      isLocked: !current.isUnlocked,
      isUnlocked: !!current.isUnlocked,
      languages,
    });
  }
  const base = toSeriesDto(seed, now);
  return {
    ...base,
    language: lang ?? 'vi',
    chapters,
    ratingAverage: seed.rating,
    ratingCount: Math.round(seed.views / 120),
  };
}

const CHAPTER_TITLES = [
  'Khởi đầu',
  'Lời hứa',
  'Người lạ',
  'Bí mật dưới mưa',
  'Đối đầu',
  'Ngã rẽ',
  'Ánh sáng cuối đường hầm',
  'Kẻ phản bội',
  'Trở về',
  'Đêm trắng',
  'Cơn bão',
  'Bình minh',
];

export function readChapter(id: string, lang?: string): PublicChapterReadDto | undefined {
  const hit = findChapter(id);
  if (!hit) return undefined;
  const { seed, number } = hit;
  const unlocked = unlockedSet();
  const languages = chapterLanguages(seed, number, unlocked);
  const language = languages.some((l) => l.language === lang) ? lang! : 'vi';
  const edition = languages.find((l) => l.language === language)!;
  const priceVnd = chapterPrice(seed, number);
  const isUnlocked = !!edition.isUnlocked;
  const total = pagesPerChapter(seed);
  const vertical = seed.format === 'Webtoon';
  return {
    id,
    seriesId: seriesId(seed),
    seriesTitle: seed.title,
    readingDirection: directionOf(seed),
    chapterNumber: number,
    title: CHAPTER_TITLES[(number + seed.key.length) % CHAPTER_TITLES.length],
    publishedAt: chapterPublishedAt(seed, number, Date.now()),
    coverUrl: makeChapterCover(seed.key, number, seed.palette),
    language,
    currentLanguage: language,
    languages,
    availableLanguages: languages,
    priceVnd,
    isFree: priceVnd === 0,
    isLocked: !isUnlocked,
    isUnlocked,
    pages: Array.from({ length: total }, (_, i) => {
      const pageNumber = i + 1;
      // BR-33: ấn bản trả phí chưa mở khóa chỉ lộ N trang đầu.
      const visible = isUnlocked || pageNumber <= FREE_PREVIEW_PAGES;
      return {
        id: `${id}-p${pageNumber}`,
        pageNumber,
        imageUrl: visible
          ? makePage(seed.key, number, pageNumber, seed.palette, { vertical, lang: language })
          : null,
        isLocked: !visible,
        isUnlocked,
        isPreview: !isUnlocked && visible,
      };
    }),
  };
}

export const MOCK_GENRES = Array.from(new Set(SEEDS.map((s) => s.genre)));
