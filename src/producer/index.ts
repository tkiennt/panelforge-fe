/**
 * PanelForge Producer Module
 * Quản lý tính năng của Role Producer: Studio Workspaces, Manga Series, Pipeline & Quotas
 * Kết nối trực tiếp với Backend WorkspacesController
 */
export {
  workspaceService,
  type WorkspaceDto,
  type WorkspaceMemberDto,
  type CreateWorkspaceRequest,
  type AddWorkspaceMemberRequest,
  MOCK_WORKSPACES,
  MOCK_WORKSPACE_MEMBERS,
} from '../services/workspace.service';

export { ProducerWorkspaceView } from '../views/producer';
