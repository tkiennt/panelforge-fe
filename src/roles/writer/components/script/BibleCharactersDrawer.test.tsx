import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BibleCharactersDrawer } from './BibleCharactersDrawer';
import { BibleEntryDto } from '@/services/bible.service';

describe('BibleCharactersDrawer Component', () => {
  const mockCharacters: BibleEntryDto[] = [
    {
      id: 'char-1',
      seriesBibleId: 'bible-1',
      category: 'Character',
      code: 'KAITO',
      name: 'Kaito',
      subtitle: 'Kiếm sĩ lang thang',
      description: 'Chàng trai kiếm sĩ trẻ tuổi.',
      detailsJson: '{}',
      priority: 0,
      strictCheck: false,
      isActive: true,
      createdAt: '2026-11-01T00:00:00Z',
    },
    {
      id: 'char-2',
      seriesBibleId: 'bible-1',
      category: 'Character',
      code: 'AIKO',
      name: 'Aiko',
      subtitle: 'Pháp sư ánh sáng',
      description: 'Cô gái mang sức mạnh cổ xưa.',
      detailsJson: '{}',
      priority: 0,
      strictCheck: false,
      isActive: true,
      createdAt: '2026-11-01T00:00:00Z',
    },
  ];

  it('renders closed drawer as null', () => {
    const { container } = render(
      <BibleCharactersDrawer isOpen={false} onClose={vi.fn()} characters={mockCharacters} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders characters list with accordions and expands one row at a time', () => {
    render(<BibleCharactersDrawer isOpen={true} onClose={vi.fn()} characters={mockCharacters} />);

    expect(screen.getByTestId('bible-characters-drawer')).toBeInTheDocument();
    expect(screen.getByText('Kaito')).toBeInTheDocument();
    expect(screen.getByText('Aiko')).toBeInTheDocument();

    const toggleKaito = screen.getByTestId('accordion-toggle-char-1');
    const toggleAiko = screen.getByTestId('accordion-toggle-char-2');

    expect(toggleKaito).toHaveAttribute('aria-expanded', 'false');
    expect(toggleAiko).toHaveAttribute('aria-expanded', 'false');

    // Click Kaito to expand
    fireEvent.click(toggleKaito);
    expect(toggleKaito).toHaveAttribute('aria-expanded', 'true');
    expect(toggleAiko).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Chàng trai kiếm sĩ trẻ tuổi.')).toBeInTheDocument();

    // Click Aiko to expand -> Kaito must collapse (one open at a time)
    fireEvent.click(toggleAiko);
    expect(toggleKaito).toHaveAttribute('aria-expanded', 'false');
    expect(toggleAiko).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Cô gái mang sức mạnh cổ xưa.')).toBeInTheDocument();
  });
});
