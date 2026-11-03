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
    expect(screen.getByText(/Tạo thiết kế nhân vật, địa điểm/i)).toBeDefined();

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

    const submitBtn = screen.getByRole('button', {
      name: /Lưu vào Series Bible/i,
    }) as HTMLButtonElement;
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

    const submitBtn = screen.getByRole('button', {
      name: /Lưu vào Series Bible/i,
    }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);
    fireEvent.click(submitBtn);

    expect(defaultProps.onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Bạch Du',
        description: 'Cố nhân của Tần Mục tại Diên Khang.',
        category: 'characters',
      }),
    );
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('handles stageName and chapter range inputs and submits them', async () => {
    render(<AddEntityModal {...defaultProps} isProducer={true} />);

    fireEvent.change(screen.getByLabelText(/Tên mục/i), {
      target: { value: 'Goku' },
    });
    fireEvent.change(screen.getByLabelText(/Mô tả quy chuẩn thiết kế/i), {
      target: { value: 'Chiến binh Saiyan' },
    });
    fireEvent.change(screen.getByLabelText(/Tên giai đoạn \(Tùy chọn\)/i), {
      target: { value: 'Lúc nhỏ' },
    });
    fireEvent.change(screen.getByLabelText(/Hiệu lực từ Chương số \*/i), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText(/Đến Chương \(Để trống = tới hết truyện\)/i), {
      target: { value: '19' },
    });

    const submitBtn = screen.getByRole('button', {
      name: /Lưu vào Series Bible/i,
    }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);
    fireEvent.click(submitBtn);

    expect(defaultProps.onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Goku',
        stageName: 'Lúc nhỏ',
        effectiveFromChapterNumber: 1,
        effectiveToChapterNumber: 19,
      }),
    );
  });

  it('displays draft banner and submit button as "Tạo bản nháp mới" when isProducer is false', async () => {
    render(<AddEntityModal {...defaultProps} isProducer={false} />);

    expect(screen.getByText(/Bản nháp \(Hướng B\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tạo bản nháp mới/i })).toBeInTheDocument();
  });

  it('validates chapter range: disables submit when to < from', async () => {
    render(<AddEntityModal {...defaultProps} isProducer={true} />);

    fireEvent.change(screen.getByLabelText(/Tên mục/i), {
      target: { value: 'Goku' },
    });
    fireEvent.change(screen.getByLabelText(/Mô tả quy chuẩn thiết kế/i), {
      target: { value: 'Chiến binh Saiyan' },
    });
    fireEvent.change(screen.getByLabelText(/Hiệu lực từ Chương số \*/i), {
      target: { value: '20' },
    });
    fireEvent.change(screen.getByLabelText(/Đến Chương \(Để trống = tới hết truyện\)/i), {
      target: { value: '10' },
    });

    expect(
      screen.getByText(/Chương kết thúc \(10\) phải lớn hơn hoặc bằng chương bắt đầu \(20\)/i),
    ).toBeInTheDocument();
    const submitBtn = screen.getByRole('button', {
      name: /Lưu vào Series Bible/i,
    }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it('renders character sheet gallery section and adds turnaround sketches (Step 3)', async () => {
    render(<AddEntityModal {...defaultProps} isProducer={true} />);

    expect(screen.getByText(/Bộ Sưu Tập Phác Thảo Góc Nhìn & Biểu Cảm/i)).toBeInTheDocument();
    expect(screen.getByText(/0 góc phác thảo/i)).toBeInTheDocument();

    const labelSelect = screen.getByDisplayValue('Chính diện (Front)');
    fireEvent.change(labelSelect, { target: { value: 'Góc nghiêng 3/4' } });

    fireEvent.change(screen.getByLabelText(/Tên mục/i), { target: { value: 'Luffy' } });
    fireEvent.change(screen.getByLabelText(/Mô tả quy chuẩn thiết kế/i), {
      target: { value: 'Mũ rơm' },
    });

    const submitBtn = screen.getByRole('button', { name: /Lưu vào Series Bible/i });
    fireEvent.click(submitBtn);

    expect(defaultProps.onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Luffy',
        description: 'Mũ rơm',
      }),
    );
  });

  it('hiển thị gợi ý các mã tạm từ kịch bản và tự điền mã + tên khi chọn', () => {
    localStorage.setItem(
      'panelforge_temp_bible_codes',
      JSON.stringify([
        {
          code: 'CHR-LAM-DU',
          name: 'Lâm Du',
          category: 'Character',
          count: 3,
          chapterNumber: 1,
          lastUsedAt: Date.now(),
        },
      ])
    );

    render(<AddEntityModal {...defaultProps} />);

    expect(screen.getByTestId('temp-bible-code-suggestions')).toBeInTheDocument();
    expect(screen.getByText(/@CHR-LAM-DU/i)).toBeInTheDocument();
    expect(screen.getByText(/\(3x Ch\.1\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/@CHR-LAM-DU/i));

    const codeInput = screen.getByLabelText(/Mã định danh/i) as HTMLInputElement;
    expect(codeInput.value).toBe('CHR-LAM-DU');
    const nameInput = screen.getByLabelText(/Tên mục/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Lâm Du');

    localStorage.removeItem('panelforge_temp_bible_codes');
  });

  it('renders artist role separation banner and hides image upload when isArtist is false', async () => {
    render(<AddEntityModal {...defaultProps} isArtist={false} />);

    expect(screen.getByTestId('artist-role-separation-banner')).toBeInTheDocument();
    expect(screen.getByText(/Chỉ Họa sĩ \(Artist\) mới tải ảnh lên/i)).toBeInTheDocument();
    expect(screen.queryByText(/Kéo thả ảnh reference sheet vào đây/i)).toBeNull();
  });
});
