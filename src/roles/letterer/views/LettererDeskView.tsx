import React from 'react';
import { ArtistDeskView } from '@/roles/artist/views/ArtistDeskView';

export interface LettererDeskViewProps {
  workspaceRole?: string | null;
}

/**
 * LettererDeskView: Đã được hợp nhất trực tiếp vào ArtistDeskView (sidetab 'lettering').
 * Mọi thao tác thoại, bóng, script binding và cảnh báo diễn ra trực tiếp trên Artist Desk.
 */
export default function LettererDeskView({ workspaceRole }: LettererDeskViewProps) {
  return <ArtistDeskView workspaceRole={workspaceRole} initialSidebarTab='lettering' />;
}

export { LettererDeskView as LettererWorkspace };
