import { WorkspaceRole } from './auth';

export interface WorkspaceDto {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  storageQuotaBytes: number;
  usedStorageBytes: number;
  createdAt: string;
  isOwner: boolean;
  currentUserRole?: WorkspaceRole | null;
  memberCount: number;
  pendingTasks?: number;
}
