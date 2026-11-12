import React from 'react';
// BR-31: Letterer làm việc trên chính bàn vẽ Artist (sidetab lettering), không có màn riêng.
// eslint-disable-next-line no-restricted-imports
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
