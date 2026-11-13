import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ArtistDeskLayout } from './ArtistDeskLayout';
import { ScriptReaderPanel } from './ScriptReaderPanel';
import { ArtworkCanvasDropzone } from './ArtworkCanvasDropzone';
import { AIPromptStudio } from './AIPromptStudio';

describe('Artist Desk 3-Column Workspace Suite', () => {
  it('renders ArtistDeskLayout with all 3 columns and top header navigation', () => {
    const onSubmitReview = vi.fn();
    render(
      <ArtistDeskLayout
        studioName='Lucian Manga Studio'
        seriesTitle='Vương Triều Bóng Đêm'
        chapterTitle='Chương 12'
        currentPageNumber={2}
        totalPages={18}
        onSubmitReview={onSubmitReview}
      />,
    );

    // 1. Top Header Navigation
    expect(screen.getByTestId('artist-desk-top-header')).toBeInTheDocument();
    expect(screen.getByText('Lucian Manga Studio')).toBeInTheDocument();
    expect(screen.getByText('Vương Triều Bóng Đêm')).toBeInTheDocument();
    expect(screen.getByText('Chương 12')).toBeInTheDocument();
    expect(screen.getByText('Trang 2 / 18')).toBeInTheDocument();
    expect(screen.getByText('AI Agent: Sẵn sàng')).toBeInTheDocument();

    const submitBtn = screen.getByTestId('submit-to-review-btn');
    expect(submitBtn).toBeInTheDocument();
    fireEvent.click(submitBtn);
    expect(onSubmitReview).toHaveBeenCalledTimes(1);

    // 2. Left Column: Writer Script Reader
    expect(screen.getByTestId('writer-script-reader-panel')).toBeInTheDocument();
    expect(screen.getByText('Kịch bản Trang 2')).toBeInTheDocument();
    expect(screen.getByTestId('auto-sync-script-dialogue-btn')).toBeInTheDocument();

    // 3. Center Column: Interactive Artwork Canvas & Direct Dropzone
    expect(screen.getByTestId('artwork-canvas-dropzone-viewport')).toBeInTheDocument();
    expect(screen.getByTestId('manga-paper-sheet')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-zoom-control-bar')).toBeInTheDocument();

    // 4. Right Column: AI Visual Agent & Prompt Studio
    expect(screen.getByTestId('ai-visual-agent-studio')).toBeInTheDocument();
    expect(screen.getByText('AI Visual Agent')).toBeInTheDocument();
    expect(screen.getByTestId('generate-ai-artwork-btn')).toBeInTheDocument();
  });

  it('ScriptReaderPanel formats dialogue, stage directions and links to panels', () => {
    const onSelectPanel = vi.fn();
    render(
      <ScriptReaderPanel
        pageNumber={2}
        sceneTitle='CẢNH 1: MỞ ĐẦU'
        sceneSlugline='NGOẠI · CỔNG THÀNH · SÁNG'
        lines={[
          {
            id: 'line-1',
            lineOrder: 1,
            panelId: 'panel-1',
            stageDirection: 'Gió bão cát thổi mạnh qua cổng thành.',
          },
          {
            id: 'line-2',
            lineOrder: 2,
            panelId: 'panel-1',
            characterName: 'Akira',
            characterColor: '#F97316',
            dialogueText: 'Chúng ta đã tới nơi rồi.',
          },
        ]}
        selectedPanelId='panel-1'
        onSelectPanel={onSelectPanel}
      />,
    );

    // Action / Stage Direction
    expect(screen.getByText('Gió bão cát thổi mạnh qua cổng thành.')).toBeInTheDocument();
    // Dialogue Block
    expect(screen.getByText('Akira')).toBeInTheDocument();
    expect(screen.getByText('"Chúng ta đã tới nơi rồi."')).toBeInTheDocument();

    // Clicking script block triggers panel selection
    const block = screen.getByTestId('script-block-line-1');
    fireEvent.click(block);
    expect(onSelectPanel).toHaveBeenCalledWith('panel-1');
  });

  it('ArtworkCanvasDropzone supports panel selection, drop and zoom controls', () => {
    const onSelectPanel = vi.fn();
    const onDropArtwork = vi.fn();

    render(
      <ArtworkCanvasDropzone
        panels={[
          {
            id: 'panel-1',
            panelNumber: 1,
            readingOrder: 1,
            x: 0,
            y: 0,
            width: 100,
            height: 50,
            imageUrl: null,
          },
        ]}
        selectedPanelId='panel-1'
        onSelectPanel={onSelectPanel}
        onDropArtwork={onDropArtwork}
      />,
    );

    // Check panel frame
    const panelEl = screen.getByTestId('manga-panel-panel-1');
    expect(panelEl).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('Đọc #1')).toBeInTheDocument();

    // Zoom Controls
    expect(screen.getByText('100%')).toBeInTheDocument();
    const zoomInBtn = screen.getByTitle('Phóng to canvas');
    fireEvent.click(zoomInBtn);
    expect(screen.getByText('110%')).toBeInTheDocument();
  });

  it('AIPromptStudio provides prompt editing, presets and triggers AI generation', () => {
    const onGenerate = vi.fn();
    render(
      <AIPromptStudio
        selectedPanel={{
          id: 'panel-1',
          panelNumber: 1,
          readingOrder: 1,
          x: 0,
          y: 0,
          width: 100,
          height: 50,
          cameraAngle: 'Toàn cảnh (Wide)',
          lighting: 'Hoàng hôn',
          suggestedPrompt: 'Manga ink art of colossal ruined fortress gates',
        }}
        onGenerateAiImage={onGenerate}
      />,
    );

    expect(screen.getByText('Khung #1 đang chọn')).toBeInTheDocument();
    expect(screen.getByText('Toàn cảnh (Wide)')).toBeInTheDocument();
    expect(screen.getByText('Hoàng hôn')).toBeInTheDocument();

    // Prompt input
    const promptInput = screen.getByTestId('ai-positive-prompt-input');
    expect(promptInput).toHaveValue('Manga ink art of colossal ruined fortress gates');

    // Generate CTA
    const genBtn = screen.getByTestId('generate-ai-artwork-btn');
    fireEvent.click(genBtn);
    expect(onGenerate).toHaveBeenCalledTimes(1);
    expect(onGenerate).toHaveBeenCalledWith(
      'Manga ink art of colossal ruined fortress gates',
      expect.any(String),
      'shonen',
    );
  });

  it('hỗ trợ bấm Phóng to xem chi tiết trên khung có ảnh để mở Lightbox', () => {
    render(
      <ArtistDeskLayout
        initialPanels={[
          {
            id: 'panel-1',
            panelNumber: 1,
            readingOrder: 1,
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            imageUrl: 'https://example.com/panel1_art.png',
          },
        ]}
      />
    );

    const zoomBtn = screen.getByTitle('Phóng to xem chi tiết');
    expect(zoomBtn).toBeInTheDocument();
    fireEvent.click(zoomBtn);

    const lightbox = document.querySelector('.yarl__container');
    expect(lightbox).toBeInTheDocument();
  });
});
