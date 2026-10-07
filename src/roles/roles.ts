/**
 * Manifest các role trong hệ thống PanelForge
 * Nguồn duy nhất định nghĩa nhãn hiển thị, phạm vi (scope), thư mục và route mặc định của từng role.
 */

export interface RoleManifestItem {
  label: string;
  scope: 'system' | 'workspace' | 'external';
  folder: string;
  defaultRoute: string;
}

export const ROLE_MANIFEST = {
  ADMINISTRATOR: {
    label: 'Administrator',
    scope: 'system',
    folder: 'roles/admin',
    defaultRoute: '/admin',
  },
  PRODUCER: {
    label: 'Producer',
    scope: 'workspace',
    folder: 'roles/producer',
    defaultRoute: 'dashboard',
  },
  WRITER: {
    label: 'Writer',
    scope: 'workspace',
    folder: 'roles/writer',
    defaultRoute: 'script',
  },
  ARTIST: {
    label: 'Artist',
    scope: 'workspace',
    folder: 'roles/artist',
    defaultRoute: 'layout',
  },
  LETTERER: {
    label: 'Letterer',
    scope: 'workspace',
    folder: 'roles/letterer',
    defaultRoute: 'canvas',
  },
  EDITOR: {
    label: 'Editor',
    scope: 'workspace',
    folder: 'roles/editor',
    defaultRoute: 'review',
  },
  READER: {
    label: 'Reader',
    scope: 'external',
    folder: 'roles/reader',
    defaultRoute: 'reader',
  },
} as const;

export type AppRoleKey = keyof typeof ROLE_MANIFEST;
