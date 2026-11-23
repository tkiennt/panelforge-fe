import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';
import { BibleEntryAccordionItem, BibleAccordionEntity } from './BibleEntryAccordionItem';

describe('BibleEntryAccordionItem Component', () => {
  const mockCharacter: BibleAccordionEntity = {
    id: 'entry-1',
    name: 'Kaito',
    code: 'KAITO',
    category: 'Character',
    subtitle: 'Kiếm sĩ lang thang',
    description: 'Chàng trai kiếm sĩ trẻ tuổi với thanh katana cổ.',
    detailsJson: JSON.stringify({
      attributes: {
        age: '19',
        height: '175 cm',
        build: 'thon gọn',
      },
    }),
    isStub: false,
    isCanonLocked: false,
    bibleStatus: 'Draft',
    mentions: [
      {
        lineId: 'line-1',
        lineOrder: 1,
        pageNumber: 1,
        panelNumber: 2,
        surfaceText: 'Kaito',
        kind: 1,
      },
    ],
  };

  it('renders collapsed state with only entity name, category icon, and status badge', () => {
    const onToggle = vi.fn();
    render(<BibleEntryAccordionItem entity={mockCharacter} isOpen={false} onToggle={onToggle} />);

    expect(screen.getByText('Kaito')).toBeInTheDocument();
    expect(screen.getByText('KAITO')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-draft')).toBeInTheDocument();

    const toggleBtn = screen.getByTestId('accordion-toggle-entry-1');
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('accordion-content')).not.toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders expanded details including subtitle, description, mentions and spec fields', () => {
    const onToggle = vi.fn();
    render(<BibleEntryAccordionItem entity={mockCharacter} isOpen={true} onToggle={onToggle} />);

    const toggleBtn = screen.getByTestId('accordion-toggle-entry-1');
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    const content = screen.getByTestId('accordion-content');
    expect(content).toBeInTheDocument();

    expect(within(content).getByText('Kiếm sĩ lang thang')).toBeInTheDocument();
    expect(
      within(content).getByText('Chàng trai kiếm sĩ trẻ tuổi với thanh katana cổ.'),
    ).toBeInTheDocument();
    expect(within(content).getByText('P1.2')).toBeInTheDocument();
  });

  it('allows writer to edit fields, keeps entity name read-only, and saves draft revision', async () => {
    const onSaveDraft = vi.fn().mockResolvedValue(undefined);
    render(
      <BibleEntryAccordionItem
        entity={mockCharacter}
        isOpen={true}
        onToggle={vi.fn()}
        canEditScript={true}
        onSaveDraft={onSaveDraft}
      />,
    );

    const editBtn = screen.getByTestId('edit-entry-btn');
    fireEvent.click(editBtn);

    // Verify name is immutable / read-only
    const readonlyName = screen.getByTestId('define-entity-name-readonly');
    expect(readonlyName).toHaveTextContent('Kaito');
    expect(readonlyName.tagName.toLowerCase()).not.toBe('input');

    // Change description and subtitle
    const descTextarea = screen.getByPlaceholderText(/Ngoại hình, trang phục, vũ khí/i);
    fireEvent.change(descTextarea, {
      target: { value: 'Mô tả nhân vật Kaito cập nhật mới' },
    });

    // Save
    const saveBtn = screen.getByTestId('save-entry-draft-btn');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSaveDraft).toHaveBeenCalledWith(
        'entry-1',
        expect.objectContaining({
          name: 'Kaito',
          description: 'Mô tả nhân vật Kaito cập nhật mới',
          subtitle: 'Kiếm sĩ lang thang',
          isStub: false,
        }),
      );
    });
  });
});
