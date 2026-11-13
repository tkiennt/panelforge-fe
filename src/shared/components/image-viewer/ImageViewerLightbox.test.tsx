import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ImageViewerLightbox } from './ImageViewerLightbox';

describe('ImageViewerLightbox Component', () => {
  const mockSlides = [
    { src: 'https://example.com/panel1.jpg', title: 'Panel #1', alt: 'Panel 1 Artwork' },
    { src: 'https://example.com/panel2.jpg', title: 'Panel #2', alt: 'Panel 2 Artwork' },
  ];

  it('không hiển thị khi isOpen là false', () => {
    const { container } = render(
      <ImageViewerLightbox isOpen={false} onClose={vi.fn()} slides={mockSlides} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('không hiển thị khi danh sách slides rỗng', () => {
    const { container } = render(
      <ImageViewerLightbox isOpen={true} onClose={vi.fn()} slides={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('hiển thị lightbox khi isOpen là true', () => {
    render(
      <ImageViewerLightbox isOpen={true} onClose={vi.fn()} slides={mockSlides} />,
    );
    // yet-another-react-lightbox renders a dialog / container in document.body
    const dialog = document.querySelector('.yarl__container');
    expect(dialog).toBeInTheDocument();
  });
});
