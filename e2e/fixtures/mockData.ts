/**
 * Mock data fixtures for Playwright E2E tests
 */
export const MOCK_PUBLIC_SERIES = {
  items: [
    {
      id: 'd2b3993d-8b27-4b0a-ab8c-d3683d54a5b9',
      title: 'Lantern of the Tide',
      synopsis:
        'A lone lighthouse keeper in a drowned archipelago discovers an ancient mechanical whale.',
      genre: 'Fantasy / Isekai',
      format: 'B5 Tankobon',
      readingDirection: 'RightToLeft',
      studioName: 'Studio Moonlight',
      publishedChapterCount: 2,
      latestPublishedAt: '2026-10-15T10:00:00Z',
    },
    {
      id: 'a1000000-0000-0000-0000-000000000002',
      title: 'Neon Ronin',
      synopsis: 'Cybernetic samurai navigating the underworld of neo-Tokyo in 2088.',
      genre: 'Action / Sci-Fi',
      format: 'A5 Standard',
      readingDirection: 'RightToLeft',
      studioName: 'Studio Moonlight',
      publishedChapterCount: 1,
      latestPublishedAt: '2026-10-16T15:30:00Z',
    },
  ],
  totalCount: 2,
  pageIndex: 1,
  pageSize: 20,
  totalPages: 1,
};

export const MOCK_SERIES_DETAIL = {
  id: 'd2b3993d-8b27-4b0a-ab8c-d3683d54a5b9',
  title: 'Lantern of the Tide',
  synopsis:
    'A lone lighthouse keeper in a drowned archipelago discovers an ancient mechanical whale.',
  genre: 'Fantasy / Isekai',
  format: 'B5 Tankobon',
  readingDirection: 'RightToLeft',
  studioName: 'Studio Moonlight',
  chapters: [
    {
      id: 'c1000000-0000-0000-0000-000000000001',
      chapterNumber: 1,
      title: 'The Letter in the Foam',
      publishedAt: '2026-10-15T10:00:00Z',
    },
    {
      id: 'c1000000-0000-0000-0000-000000000002',
      chapterNumber: 2,
      title: 'Whispers from the Abyssal Core',
      publishedAt: '2026-10-16T12:00:00Z',
    },
  ],
};

export const MOCK_CHAPTER_READ = {
  id: 'c1000000-0000-0000-0000-000000000001',
  seriesId: 'd2b3993d-8b27-4b0a-ab8c-d3683d54a5b9',
  seriesTitle: 'Lantern of the Tide',
  readingDirection: 'RightToLeft',
  chapterNumber: 1,
  title: 'The Letter in the Foam',
  publishedAt: '2026-10-15T10:00:00Z',
  pages: [
    {
      id: 'p1000000-0000-0000-0000-000000000001',
      pageNumber: 1,
      imageUrl: '/mocks/manga-page-1.png',
    },
    {
      id: 'p1000000-0000-0000-0000-000000000002',
      pageNumber: 2,
      imageUrl: '/mocks/manga-page-2.png',
    },
  ],
};

export const MOCK_WORKSPACES = [
  {
    id: 'a1000000-0000-0000-0000-000000000001',
    name: 'Studio Moonlight',
    slug: 'studio-moonlight',
    description: 'Chuyên sản xuất manga giả tưởng và khoa học viễn tưởng.',
    isOwner: true,
    currentUserRole: 'Producer',
    memberCount: 5,
    seriesCount: 2,
    createdAt: '2026-09-01T08:00:00Z',
    storageQuotaBytes: 10737418240,
    usedStorageBytes: 104857600,
  },
];
