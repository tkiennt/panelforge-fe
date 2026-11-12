const ROLES = [
  'admin',
  'producer',
  'writer',
  'artist',
  'letterer',
  'editor',
  'publisher',
  'reader',
  'guest',
];

const roleOverrides = ROLES.map((role) => {
  const otherRoles = ROLES.filter((r) => r !== role);
  return {
    files: [`src/roles/${role}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                ...otherRoles.map((r) => `@/roles/${r}/**`),
                ...otherRoles.map((r) => `../${r}/**`),
                ...otherRoles.map((r) => `../../${r}/**`),
                ...otherRoles.map((r) => `../../../${r}/**`),
              ],
              message: `Role "${role}" không được import chéo từ role khác. Hãy chuyển sang shared/ nếu dùng chung.`,
            },
          ],
        },
      ],
    },
  };
});

module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:prettier/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'react-hooks/set-state-in-effect': 'off',
  },
  overrides: [
    // 1 & 2. Chặn import chéo giữa các role
    ...roleOverrides,

    // 3. Chặn shared/ import từ roles/ (trừ các orchestrator dùng chung TaskEditorView, WorkspaceListView, SpreadWorkbenchModal)
    {
      files: [
        'src/shared/components/**/*.{ts,tsx}',
        'src/shared/features/series-bible/**/*.{ts,tsx}',
        'src/shared/features/ai-agents/**/*.{ts,tsx}',
        'src/shared/features/pipeline-board/**/*.{ts,tsx}',
        'src/shared/features/account/**/*.{ts,tsx}',
        'src/shared/views/NotificationCenterView.tsx',
        'src/shared/views/UserProfileView.tsx',
        'src/shared/modals/AuditLogModal.tsx',
        'src/shared/modals/CommandPaletteModal.tsx',
        'src/shared/modals/ProvenanceModals.tsx',
        'src/shared/modals/VectorStatusModal.tsx',
        'src/shared/modals/ChapterReviewsModal.tsx',
        'src/shared/modals/ChapterReaderModal.tsx',
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@/roles/**', '../roles/**', '../../roles/**', '../../../roles/**'],
                message: 'shared/ không được import từ roles/.',
              },
            ],
          },
        ],
      },
    },

    // 4. Chặn services/ không import component từ roles, shared, app
    {
      files: ['src/services/**/*.service.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  '@/roles/**',
                  '@/shared/components/**',
                  '@/shared/features/**',
                  '@/shared/views/**',
                  '@/shared/modals/**',
                  '@/app/**',
                  '../roles/**',
                  '../shared/components/**',
                  '../shared/features/**',
                  '../shared/views/**',
                  '../shared/modals/**',
                  '../app/**',
                ],
                message: 'services/ không được import component.',
              },
            ],
          },
        ],
      },
    },
  ],
};
