import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArtistScriptReferenceSidebar } from './ArtistScriptReferenceSidebar';
import type { ScriptLineItem } from './ArtistCanvaSidebar';

const lines: ScriptLineItem[] = [
  {
    id: 'l-action',
    pageNumber: 1,
    panelNumber: 1,
    sceneTitle: 'Cảnh 1',
    stageDirection: 'Mưa rơi trên mái ngói.',
    kind: 'Action',
  },
  {
    id: 'l-sfx',
    pageNumber: 1,
    panelNumber: 2,
    sceneTitle: 'Cảnh 1',
    stageDirection: 'RẦM!',
    kind: 'Sfx',
  },
  {
    id: 'l-dialogue',
    pageNumber: 1,
    panelNumber: 3,
    sceneTitle: 'Cảnh 1',
    characterName: 'AKIRA',
    dialogueText: 'Đứng lại!',
    stageDirection: 'quay người',
    kind: 'Dialogue',
  },
];

const renderSidebar = () =>
  render(
    <ArtistScriptReferenceSidebar
      isOpen
      onToggle={vi.fn()}
      pageNumber={1}
      panels={[]}
      scriptLines={lines}
      selectedPanelId={null}
      selectedPanelNumber={null}
      onSelectPanel={vi.fn()}
    />,
  );

describe('ArtistScriptReferenceSidebar – nhãn loại dòng', () => {
  it('dòng SFX hiện nhãn [SFX], không bị gắn [Mô tả cảnh]', () => {
    renderSidebar();
    const sfx = screen.getByTestId('artist-script-ref-line-l-sfx');
    expect(sfx).toHaveTextContent('[SFX]');
    expect(sfx).toHaveTextContent('RẦM!');
    expect(sfx).not.toHaveTextContent('Mô tả cảnh');
  });

  it('dòng hành động gắn [Mô tả cảnh]; thoại kèm chỉ dẫn phụ hiện cả hai', () => {
    renderSidebar();
    expect(screen.getByTestId('artist-script-ref-line-l-action')).toHaveTextContent(
      '[Mô tả cảnh]Mưa rơi trên mái ngói.',
    );
    const dialogue = screen.getByTestId('artist-script-ref-line-l-dialogue');
    expect(dialogue).toHaveTextContent('quay người');
    expect(dialogue).toHaveTextContent('Đứng lại!');
  });
});
