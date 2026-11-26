import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ArtistScriptReader } from './ArtistScriptReader';
import type { BibleEntityItem, ScriptLineItem } from './ArtistCanvaSidebar';

const lines: ScriptLineItem[] = [
  {
    id: 'line-action',
    pageNumber: 1,
    panelNumber: 1,
    panelId: 'panel-1',
    sceneId: 'scene-1',
    sceneTitle: 'Phân cảnh 1',
    sceneSlugline: 'NGOẠI · CỔNG THÀNH · SÁNG',
    stageDirection: 'Minh Triết bước qua cánh cổng phủ sương.',
  },
  {
    id: 'line-dialogue',
    pageNumber: 1,
    panelNumber: 1,
    panelId: 'panel-1',
    sceneId: 'scene-1',
    characterName: 'Minh Triết',
    characterColor: 'rgb(200, 80, 20)',
    dialogueText: 'Chúng ta đến rồi.',
  },
  {
    id: 'line-sfx',
    pageNumber: 2,
    panelNumber: 2,
    panelId: 'panel-2',
    narrationMode: 'SFX',
    dialogueText: 'ẦM!',
  },
];

const entities: BibleEntityItem[] = [
  {
    id: 'entity-1',
    name: 'Minh Triết',
    category: 'character',
    tag: 'Nhân vật',
    description: 'Nhân vật chính',
    visualNotes: ['Áo choàng xanh, tóc đen.'],
    imageUrl: '/model-sheet.png',
  },
];

describe('ArtistScriptReader', () => {
  beforeEach(() => {
    localStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  const renderReader = (
    overrides: Partial<React.ComponentProps<typeof ArtistScriptReader>> = {},
  ) => {
    const props: React.ComponentProps<typeof ArtistScriptReader> = {
      scriptLines: lines,
      activePageNumber: 1,
      bibleEntities: entities,
      selectedPanelId: null,
      selectedPanelNumber: null,
      artworkPanelKeys: new Set(['panel-1']),
      onSelectPanel: vi.fn(),
      width: 400,
      onWidthChange: vi.fn(),
      ...overrides,
    };
    render(<ArtistScriptReader {...props} />);
    return props;
  };

  it('shows the current page by default with panel status and mentioned entity names', () => {
    renderReader();
    expect(screen.getByTestId('canva-script-mode-current-page')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('script-panel-section-1-1')).toBeInTheDocument();
    expect(screen.getByTestId('script-panel-section-1-1').closest('details')).toHaveAttribute(
      'open',
    );
    expect(screen.queryByTestId('script-panel-section-2-2')).not.toBeInTheDocument();
    expect(screen.getByText('Đã có tranh')).toBeInTheDocument();
    expect(screen.getByText('Minh Triết', { selector: 'span[tabindex="0"]' })).toBeInTheDocument();
  });

  it('selects a panel and exposes the full chapter on demand', () => {
    const props = renderReader();
    fireEvent.click(screen.getByTestId('script-panel-section-1-1'));
    expect(props.onSelectPanel).toHaveBeenCalledWith(1, 1);
    fireEvent.click(screen.getByTestId('canva-script-mode-all'));
    expect(screen.getByTestId('script-panel-section-2-2')).toBeInTheDocument();
    expect(screen.getByText('ẦM!')).toBeInTheDocument();
  });

  it('highlights and scrolls the selected panel and supports keyboard resizing', () => {
    const onWidthChange = vi.fn();
    renderReader({ selectedPanelId: 'panel-1', selectedPanelNumber: 1, onWidthChange });
    expect(screen.getByTestId('script-panel-section-1-1')).toHaveAttribute('aria-current', 'true');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowLeft' });
    expect(onWidthChange).toHaveBeenCalledWith(416);
  });

  it('persists one of three comfortable font sizes', () => {
    renderReader();
    fireEvent.click(screen.getByRole('button', { name: 'Tăng cỡ chữ' }));
    expect(localStorage.getItem('pf.artist.scriptReader.fontStep')).toBe('2');
    expect(screen.getByRole('button', { name: 'Tăng cỡ chữ' })).toBeDisabled();
  });
});
