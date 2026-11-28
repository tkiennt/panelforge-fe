import type React from 'react';
import { Brush, Briefcase, CheckCheck, PenLine, Type } from 'lucide-react';

export type StudioRoleId = 'producer' | 'writer' | 'artist' | 'letterer' | 'editor';

/**
 * 5 vai trò sản xuất trong Studio (Master Spec V2.6). Chữ hiển thị ở
 * `workspace.reader.studioRoles.<id>.{summary,duty1..3,firstStep1..3}`; tên vai trò dùng `workspace.shelf.role.<id>`.
 */
export const STUDIO_ROLES: { id: StudioRoleId; Icon: React.ElementType; tone: string }[] = [
  { id: 'producer', Icon: Briefcase, tone: 'bg-orange-50 text-[#EA580C] ring-orange-200' },
  { id: 'writer', Icon: PenLine, tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  { id: 'artist', Icon: Brush, tone: 'bg-blue-50 text-blue-700 ring-blue-200' },
  { id: 'letterer', Icon: Type, tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  { id: 'editor', Icon: CheckCheck, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
];

/** Vai trò từ BE (`ARTIST`, `Artist`...) → id hiển thị; vai trò lạ trả về null. */
export function toStudioRoleId(raw?: string | null): StudioRoleId | null {
  const id = (raw ?? '').trim().toLowerCase();
  return STUDIO_ROLES.some((r) => r.id === id) ? (id as StudioRoleId) : null;
}

export const studioRoleMeta = (id: StudioRoleId) => STUDIO_ROLES.find((r) => r.id === id)!;
