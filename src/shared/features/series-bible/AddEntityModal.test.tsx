import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddEntityModal } from './AddEntityModal';
import { bibleService } from '@/services/bible.service';

vi.mock('@/services/bible.service', () => ({
  bibleService: {
    createBibleEntry: vi.fn(),
    uploadReferenceImage: vi.fn(),
  },
}));

describe('AddEntityModal UX/UI improvements', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    seriesId: 'series-123',
    onAdd: vi.fn(),
    onShowToast: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with Vietnamese labels, accessible form controls, and no fake LoRA slider', () => {
    render(<AddEntityModal {...defaultProps} />);

    // Header and titles
    expect(screen.getByText('Thêm mục mới vào Series Bible')).toBeDefined();
    expect(
      screen.getByText(/Tạo thiết kế nhân vật, địa điểm/i)
    ).toBeDefined();

    // Field labels with accessible htmlFor
    expect(screen.getByLabelText(/Danh mục tri thức/i)).toBeDefined();
    expect(screen.getByLabelText(/Mã định danh/i)).toBeDefined();
    expect(screen.getByLabelText(/Tên mục/i)).toBeDefined();
    expect(screen.getByLabelText(/Mô tả quy chuẩn thiết kế/i)).toBeDefined();

    // Verify fake LoRA slider is NOT present
    expect(screen.queryByText(/LoRA Enforcement Weight/i)).toBeNull();
    expect(screen.queryByText(/LoRA/i)).toBeNull();
    expect(screen.queryByText(/Vector Sync/i)).toBeNull();

    // Reference sheet dropzone
    expect(screen.getByText(/Kéo thả ảnh reference sheet vào đây/i)).toBeDefined();
  });

  it('disables submit button when required fields are empty', async () => {
    render(<AddEntityModal {...defaultProps} />);

    const submitBtn = screen.getByRole('button', { name: /Lưu vào Series Bible/i }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it('submits correctly when valid data is provided', async () => {
    render(<AddEntityModal {...defaultProps} />);

    // Fill form
    fireEvent.change(screen.getByLabelText(/Tên mục/i), {
      target: { value: 'Bạch Du' },
    });
    fireEvent.change(screen.getByLabelText(/Mô tả quy chuẩn thiết kế/i), {
      target: { value: 'Cố nhân của Tần Mục tại Diên Khang.' },
    });

    const submitBtn = screen.getByRole('button', { name: /Lưu vào Series Bible/i }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);
    fireEvent.click(submitBtn);

    expect(defaultProps.onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Bạch Du',
        description: 'Cố nhân của Tần Mục tại Diên Khang.',
        category: 'characters',
      })
    );
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
