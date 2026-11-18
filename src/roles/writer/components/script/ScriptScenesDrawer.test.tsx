import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ScriptScenesDrawer } from './ScriptScenesDrawer';
import { SceneDto } from '@/services/scriptLine.service';

describe('ScriptScenesDrawer', () => {
  const mockScenes: SceneDto[] = [
    {
      id: 'scene-1',
      chapterId: 'chap-1',
      sceneNumber: 1,
      heading: 'Cảnh mở đầu tại quán cà phê',
      summary: '[Panels: 1 - 4] Mưa rơi ngoài cửa kính',
      scriptLinesCount: 5,
      pagesCount: 1,
      createdAt: '2026-11-01T00:00:00Z',
    },
    {
      id: 'scene-2',
      chapterId: 'chap-1',
      sceneNumber: 2,
      heading: 'Rượt đuổi trong ngõ hẻm',
      summary: 'Từ Panel 5 đến Panel 8: Tiếng bước chân dồn dập',
      scriptLinesCount: 8,
      pagesCount: 2,
      createdAt: '2026-11-01T00:00:00Z',
    },
  ];

  it('renders scenes with heading, panel ranges, and summary notes', () => {
    render(
      <ScriptScenesDrawer
        scenes={mockScenes}
        selectedSceneId='scene-1'
        canEdit={true}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onRenameSelected={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByTestId('script-scenes-drawer')).toBeInTheDocument();
    expect(screen.getByText('Cảnh mở đầu tại quán cà phê')).toBeInTheDocument();
    expect(screen.getByText('Từ Panel 1 đến Panel 4')).toBeInTheDocument();
    expect(screen.getByText('Mưa rơi ngoài cửa kính')).toBeInTheDocument();

    expect(screen.getByText('Rượt đuổi trong ngõ hẻm')).toBeInTheDocument();
    expect(screen.getByText('Từ Panel 5 đến Panel 8')).toBeInTheDocument();
  });

  it('allows deleting scene even when there is only 1 scene (scenes are notes)', () => {
    const singleScene = [mockScenes[0]];
    const onDelete = vi.fn();

    render(
      <ScriptScenesDrawer
        scenes={singleScene}
        selectedSceneId='scene-1'
        canEdit={true}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onRenameSelected={vi.fn()}
        onDelete={onDelete}
        onClose={vi.fn()}
      />,
    );

    const deleteBtn = screen.getByTestId('delete-scene-1-btn');
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith(singleScene[0]);
  });

  it('triggers onRenameSelected and onAdd callbacks correctly', () => {
    const onRenameSelected = vi.fn();
    const onAdd = vi.fn();

    render(
      <ScriptScenesDrawer
        scenes={mockScenes}
        selectedSceneId='scene-1'
        canEdit={true}
        onSelect={vi.fn()}
        onAdd={onAdd}
        onRenameSelected={onRenameSelected}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getAllByTestId('edit-scene-heading-btn')[0]);
    expect(onRenameSelected).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('add-scene-btn'));
    expect(onAdd).toHaveBeenCalled();
  });
});
